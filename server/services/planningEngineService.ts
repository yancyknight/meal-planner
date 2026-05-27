import type { Dish } from '../../shared/types/dish'
import type { PlanEntry } from '../../shared/types/planEntry'
import type { PinnedTag, DraftSlot } from '../../shared/types/planningSession'
import { matchesVirtualTag, matchesTag } from '../../shared/virtualTags'

export interface FreezerStandaloneHint {
  freezerItemId: number
  name: string
  targetUseDate: string
}

const STANDALONE_TARGET_INTERVAL_DAYS = 14

type DishFrequency = {
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
  archived: boolean
}

/**
 * Returns the selection weight for a dish given how many days since it was last served fresh.
 * A null daysSince means never served — uses 1.5 × targetIntervalDays as a mild "try soon" bias.
 * Caps at 3.0 to prevent a long-forgotten dish from dominating once eligible.
 */
export function selectionWeight(
  dish: Pick<DishFrequency, 'targetIntervalDays'>,
  daysSince: number | null,
): number {
  const effective = daysSince ?? dish.targetIntervalDays * 1.5
  return Math.min(effective / dish.targetIntervalDays, 3.0)
}

/**
 * Returns true if a dish is eligible to be suggested for a slot.
 * Requires: not excluded, not archived, daysSince >= cooldownDays, and no active one-off cooldown.
 */
export function isEligibleForSlot(
  dish: DishFrequency,
  daysSince: number | null,
  oneOffCooldownActive = false,
): boolean {
  if (dish.excludedFromSuggestions || dish.archived) return false
  if (oneOffCooldownActive) return false
  const effective = daysSince ?? dish.targetIntervalDays * 1.5
  return effective >= dish.cooldownDays
}

/**
 * Returns a multiplier (1.0–3.0) based on how close slotDate is to the freezer item's target use date.
 * - More than targetIntervalDays away → 1.0 (no urgency)
 * - Linear ramp: 2.0 at the midpoint (targetIntervalDays/2 away)
 * - At or past target → 3.0 (maximum urgency)
 */
export function freezerUrgencyMultiplier(
  slotDate: string,
  earliestTargetUseDate: string,
  targetIntervalDays: number,
): number {
  const slotMs = new Date(slotDate + 'T00:00:00Z').getTime()
  const targetMs = new Date(earliestTargetUseDate + 'T00:00:00Z').getTime()
  const daysUntilTarget = (targetMs - slotMs) / (1000 * 60 * 60 * 24)

  if (daysUntilTarget <= 0) return 3.0
  if (daysUntilTarget >= targetIntervalDays) return 1.0
  const t = daysUntilTarget / targetIntervalDays // 1.0 = far, 0.0 = at target
  return 1.0 + (1 - t) * 2.0
}

/** Maps a calendar date to meteorological season. */
export function seasonOf(date: string): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date(date).getUTCMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

function seasonMultiplier(dish: Dish, slotDate: string): number {
  if (dish.season.length === 0) return 1.0
  return dish.season.includes(seasonOf(slotDate)) ? 1.0 : 0.5
}

function diversityFactor(dish: Dish, alreadyPlaced: Dish[]): number {
  const overlap = alreadyPlaced.filter((p) =>
    p.tags.some((pt) => dish.tags.some((dt) => dt.id === pt.id)),
  ).length
  return 1 / (1 + overlap)
}

function computeScore(
  dish: Dish,
  daysSince: number | null,
  slotDate: string,
  alreadyPlaced: Dish[],
  freezerHint?: { earliestTargetUseDate: string },
): number {
  const urgency = freezerHint
    ? freezerUrgencyMultiplier(slotDate, freezerHint.earliestTargetUseDate, dish.targetIntervalDays)
    : 1.0
  return (
    selectionWeight(dish, daysSince) *
    seasonMultiplier(dish, slotDate) *
    diversityFactor(dish, alreadyPlaced) *
    urgency
  )
}

/** Weighted-random pick from an array of items with positive weights. */
export function weightedRandom<T>(items: { item: T; weight: number }[]): T | null {
  const total = items.reduce((s, x) => s + x.weight, 0)
  if (total <= 0 || items.length === 0) return null
  let r = Math.random() * total
  for (const { item, weight } of items) {
    r -= weight
    if (r <= 0) return item
  }
  return items[items.length - 1]!.item
}

// ── Main engine ──────────────────────────────────────────────────────────────

export interface GenerateDraftInput {
  slots: { date: string; mealType: string; state: 'plan' | 'skip' | 'one-off' | 'keep' }[]
  dishes: Dish[]
  committedEntries: PlanEntry[]
  sessionVirtualTags: string[]
  pinnedTags: PinnedTag[]
  wishlistTags: number[]
  householdSize: number
  /** Dish IDs that have an active one-off cooldown and must be excluded from suggestions. */
  activeCooldownDishIds?: Set<number>
  /** Map of dishId → freezer hint for urgency scoring. */
  freezerHints?: Map<number, { earliestTargetUseDate: string }>
  /** Standalone freezer items (no dish) that compete as one-off candidates. */
  standaloneHints?: FreezerStandaloneHint[]
}

export interface GenerateDraftResult {
  draftPlan: Record<string, DraftSlot>
  warnings: string[]
}

/** Returns daysSinceLastServedFresh considering both committed entries and in-draft placements. */
function daysToSlot(
  dish: Dish,
  slotDate: string,
  committedEntries: PlanEntry[],
  draftHistory: { dishId: number; date: string }[],
): number | null {
  const slotMs = new Date(slotDate).getTime()

  const candidates: number[] = []

  for (const e of committedEntries) {
    if (e.dishId === dish.id && e.entryKind === 'fresh') {
      const ms = new Date(e.date).getTime()
      if (ms < slotMs) candidates.push(ms)
    }
  }
  for (const h of draftHistory) {
    if (h.dishId === dish.id) {
      const ms = new Date(h.date).getTime()
      if (ms < slotMs) candidates.push(ms)
    }
  }

  if (candidates.length === 0) return null
  const latest = Math.max(...candidates)
  return Math.floor((slotMs - latest) / (1000 * 60 * 60 * 24))
}

export function generateDraft(input: GenerateDraftInput): GenerateDraftResult {
  const { slots, dishes, committedEntries, sessionVirtualTags, pinnedTags, wishlistTags, activeCooldownDishIds, freezerHints, standaloneHints } = input

  const draftPlan: Record<string, DraftSlot> = {}
  const warnings: string[] = []
  const draftHistory: { dishId: number; date: string }[] = []
  const filledSlotKeys = new Set<string>()
  const placedStandaloneIds = new Set<number>()

  const committedFreezerItemIds = new Set(
    committedEntries.filter(e => e.freezerItemId != null).map(e => e.freezerItemId!),
  )

  // Eligible base pool: non-archived, non-excluded, passes session virtual tags
  function baseEligible(dish: Dish): boolean {
    if (dish.archived || dish.excludedFromSuggestions) return false
    return sessionVirtualTags.every((id) => matchesVirtualTag(dish, id))
  }

  function candidatesForSlot(
    slotDate: string,
    extraConstraints: { tagRef: { kind: string; tagId?: number; id?: string } }[],
    exclude?: Set<number>,
  ): Dish[] {
    const alreadyPlaced = draftHistory.map((h) => dishes.find((d) => d.id === h.dishId)!).filter(Boolean)
    return dishes.filter((dish) => {
      if (!baseEligible(dish)) return false
      if (exclude?.has(dish.id)) return false
      const daysSince = daysToSlot(dish, slotDate, committedEntries, draftHistory)
      if (!isEligibleForSlot(dish, daysSince, activeCooldownDishIds?.has(dish.id) ?? false)) return false
      for (const c of extraConstraints) {
        if (!matchesTag(dish, c.tagRef as Parameters<typeof matchesTag>[1])) return false
      }
      return true
    })
  }

  function pickWeighted(candidates: Dish[], slotDate: string): Dish | null {
    const alreadyPlaced = draftHistory.map((h) => dishes.find((d) => d.id === h.dishId)!).filter(Boolean)
    const scored = candidates.map((dish) => ({
      item: dish,
      weight: computeScore(
        dish,
        daysToSlot(dish, slotDate, committedEntries, draftHistory),
        slotDate,
        alreadyPlaced,
        freezerHints?.get(dish.id),
      ),
    }))
    return weightedRandom(scored)
  }

  function placeDish(slotKey: string, dish: Dish, extra: Partial<DraftSlot> = {}) {
    const [date] = slotKey.split(':')
    draftPlan[slotKey] = { kind: 'dish', dishId: dish.id, ...extra }
    draftHistory.push({ dishId: dish.id, date: date! })
    filledSlotKeys.add(slotKey)
  }

  function placeStandalone(slotKey: string, hint: FreezerStandaloneHint) {
    draftPlan[slotKey] = { kind: 'standalone-freezer', dishId: -1, freezerItemId: hint.freezerItemId, oneOffText: hint.name }
    placedStandaloneIds.add(hint.freezerItemId)
    filledSlotKeys.add(slotKey)
  }

  type CombinedPick = { type: 'dish'; dish: Dish } | { type: 'standalone'; hint: FreezerStandaloneHint }

  function pickCombined(dishCandidates: Dish[], availableStandalones: FreezerStandaloneHint[], slotDate: string): CombinedPick | null {
    const alreadyPlaced = draftHistory.map((h) => dishes.find((d) => d.id === h.dishId)!).filter(Boolean)
    const items: { item: CombinedPick; weight: number }[] = [
      ...dishCandidates.map(dish => ({
        item: { type: 'dish' as const, dish },
        weight: computeScore(dish, daysToSlot(dish, slotDate, committedEntries, draftHistory), slotDate, alreadyPlaced, freezerHints?.get(dish.id)),
      })),
      ...availableStandalones.map(hint => ({
        item: { type: 'standalone' as const, hint },
        weight: 3.0 * freezerUrgencyMultiplier(slotDate, hint.targetUseDate, STANDALONE_TARGET_INTERVAL_DAYS),
      })),
    ]
    return weightedRandom(items)
  }

  const planSlots = slots.filter((s) => s.state === 'plan')
  const planSlotKeys = new Set(planSlots.map((s) => `${s.date}:${s.mealType}`))

  // ── Pass 1: Pinned slots ────────────────────────────────────────────────────
  // Group pins by slot key
  const pinsBySlot = new Map<string, PinnedTag[]>()
  for (const pin of pinnedTags) {
    const key = `${pin.date}:${pin.mealType}`
    if (!planSlotKeys.has(key)) continue
    const list = pinsBySlot.get(key) ?? []
    list.push(pin)
    pinsBySlot.set(key, list)
  }

  // Sort pinned slots chronologically
  const pinnedSlotKeys = [...pinsBySlot.keys()].sort()

  for (const slotKey of pinnedSlotKeys) {
    if (filledSlotKeys.has(slotKey)) continue
    const pins = pinsBySlot.get(slotKey)!
    const [slotDate] = slotKey.split(':')

    // Try all pins combined
    let candidates = candidatesForSlot(slotDate!, pins.map((p) => ({ tagRef: p.tagRef })))
    const dropped: string[] = []

    // Best-effort relaxation: drop one pin at a time
    if (candidates.length === 0 && pins.length > 1) {
      for (let drop = 0; drop < pins.length && candidates.length === 0; drop++) {
        const relaxed = pins.filter((_, i) => i !== drop)
        const pool = candidatesForSlot(slotDate!, relaxed.map((p) => ({ tagRef: p.tagRef })))
        if (pool.length > 0) {
          candidates = pool
          const pin = pins[drop]!
          const label = pin.tagRef.kind === 'virtual'
            ? (pin.tagRef as { kind: 'virtual'; id: string }).id
            : `tag #${(pin.tagRef as { kind: 'real'; tagId: number }).tagId}`
          dropped.push(label)
        }
      }
    }

    // Last resort: unconstrained pool
    if (candidates.length === 0) {
      candidates = candidatesForSlot(slotDate!, [])
      for (const pin of pins) {
        const label = pin.tagRef.kind === 'virtual'
          ? (pin.tagRef as { kind: 'virtual'; id: string }).id
          : `tag #${(pin.tagRef as { kind: 'real'; tagId: number }).tagId}`
        dropped.push(label)
      }
    }

    const warningLabels = dropped.length > 0
      ? [`Pinned tag [${dropped.join(', ')}] relaxed`]
      : undefined

    const picked = pickWeighted(candidates, slotDate!)
    if (picked) {
      placeDish(slotKey, picked, warningLabels ? { warningLabels } : {})
    } else {
      // Truly nothing available — no match
      draftPlan[slotKey] = {
        kind: 'dish',
        dishId: -1,
        warningLabels: [`No eligible dish for pinned slot`],
      }
      filledSlotKeys.add(slotKey)
      warnings.push(`No eligible dish for ${slotDate} ${slotKey.split(':')[1]} (pinned)`)
    }
  }

  // ── Pass 2: Wishlist tags ───────────────────────────────────────────────────
  const wishlistCoveredTagIds = new Set<number>()

  // If a pin already placed a dish matching the wishlist tag, count it covered
  for (const tagId of wishlistTags) {
    for (const [key, slot] of Object.entries(draftPlan)) {
      if (slot.dishId !== -1) {
        const dish = dishes.find((d) => d.id === slot.dishId)
        if (dish && dish.tags.some((t) => t.id === tagId)) {
          wishlistCoveredTagIds.add(tagId)
        }
      }
    }
  }

  for (const tagId of wishlistTags) {
    if (wishlistCoveredTagIds.has(tagId)) continue

    const unfilledPlanKeys = planSlots
      .map((s) => `${s.date}:${s.mealType}`)
      .filter((k) => !filledSlotKeys.has(k))

    if (unfilledPlanKeys.length === 0) break

    // Pick a random unfilled slot
    const slotKey = unfilledPlanKeys[Math.floor(Math.random() * unfilledPlanKeys.length)]!
    const [slotDate] = slotKey.split(':')

    const candidates = candidatesForSlot(slotDate!, [{ tagRef: { kind: 'real', tagId } }])
    if (candidates.length === 0) {
      warnings.push(`No eligible dish has tag #${tagId} — wishlist entry skipped.`)
      continue
    }

    const picked = pickWeighted(candidates, slotDate!)
    if (picked) {
      placeDish(slotKey, picked, { wishlistTag: tagId })
    }
  }

  // ── Pass 3: Chronological fill of remaining plan slots ─────────────────────
  const sortedRemainingSlots = planSlots
    .map((s) => `${s.date}:${s.mealType}`)
    .filter((k) => !filledSlotKeys.has(k))
    .sort()

  for (const slotKey of sortedRemainingSlots) {
    const [slotDate] = slotKey.split(':')

    const availableStandalones = (standaloneHints ?? []).filter(
      h => !placedStandaloneIds.has(h.freezerItemId) && !committedFreezerItemIds.has(h.freezerItemId),
    )

    // Primary pool: no repeats of already-placed dishes
    const placedIds = new Set(draftHistory.map((h) => h.dishId))
    const primary = candidatesForSlot(slotDate!, [], placedIds)

    if (primary.length > 0 || availableStandalones.length > 0) {
      const picked = pickCombined(primary, availableStandalones, slotDate!)
      if (picked) {
        if (picked.type === 'dish') placeDish(slotKey, picked.dish)
        else placeStandalone(slotKey, picked.hint)
        continue
      }
    }

    // Secondary pool: allow dish repeats (no standalones — they're each unique)
    const secondary = candidatesForSlot(slotDate!, [])
    if (secondary.length > 0) {
      const picked = pickCombined(secondary, [], slotDate!)
      if (picked && picked.type === 'dish') {
        placeDish(slotKey, picked.dish, { warningLabels: ['Repeat dish — all others used or in cooldown'] })
        continue
      }
    }

    // Nothing eligible
    draftPlan[slotKey] = {
      kind: 'dish',
      dishId: -1,
      warningLabels: ['No eligible dish'],
    }
    filledSlotKeys.add(slotKey)
    warnings.push(`No eligible dish for ${slotDate} ${slotKey.split(':')[1]}`)
  }

  return { draftPlan, warnings }
}

// ── Reroll ───────────────────────────────────────────────────────────────────

export interface RerollInput {
  slotKey: string
  dishes: Dish[]
  committedEntries: PlanEntry[]
  currentDraftHistory: { dishId: number; date: string }[]
  shownDishIds: number[]
  sessionVirtualTags: string[]
  pinTagRefs: { kind: string; tagId?: number; id?: string }[]
  wishlistTagId?: number
  /** Dish IDs that have an active one-off cooldown and must be excluded from suggestions. */
  activeCooldownDishIds?: Set<number>
  /** Map of dishId → freezer hint for urgency scoring. */
  freezerHints?: Map<number, { earliestTargetUseDate: string }>
}

export function reroll(input: RerollInput): { dishId: number; shownDishIds: number[] } | 'exhausted' {
  const { slotKey, dishes, committedEntries, currentDraftHistory, shownDishIds, sessionVirtualTags, pinTagRefs, wishlistTagId, activeCooldownDishIds, freezerHints } = input
  const [slotDate] = slotKey.split(':')

  function baseEligible(dish: Dish): boolean {
    if (dish.archived || dish.excludedFromSuggestions) return false
    return sessionVirtualTags.every((id) => matchesVirtualTag(dish, id))
  }

  const alreadyPlaced = currentDraftHistory.map((h) => dishes.find((d) => d.id === h.dishId)!).filter(Boolean)
  const shown = new Set(shownDishIds)

  const candidates = dishes.filter((dish) => {
    if (!baseEligible(dish)) return false
    if (shown.has(dish.id)) return false
    const daysSince = daysToSlot(dish, slotDate!, committedEntries, currentDraftHistory)
    if (!isEligibleForSlot(dish, daysSince, activeCooldownDishIds?.has(dish.id) ?? false)) return false
    for (const c of pinTagRefs) {
      if (!matchesTag(dish, c as Parameters<typeof matchesTag>[1])) return false
    }
    if (wishlistTagId !== undefined) {
      if (!dish.tags.some((t) => t.id === wishlistTagId)) return false
    }
    return true
  })

  if (candidates.length === 0) return 'exhausted'

  const scored = candidates.map((dish) => ({
    item: dish,
    weight: computeScore(
      dish,
      daysToSlot(dish, slotDate!, committedEntries, currentDraftHistory),
      slotDate!,
      alreadyPlaced,
      freezerHints?.get(dish.id),
    ),
  }))

  const picked = weightedRandom(scored)
  if (!picked) return 'exhausted'

  return {
    dishId: picked.id,
    shownDishIds: [...shownDishIds, picked.id],
  }
}
