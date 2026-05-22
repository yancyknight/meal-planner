import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectionWeight, isEligibleForSlot, seasonOf, weightedRandom, generateDraft, reroll } from '../../server/services/planningEngineService'
import type { Dish } from '../../shared/types/dish'

// ── Pure function unit tests ──────────────────────────────────────────────────

describe('selectionWeight', () => {
  it('never-served dish has overdueness 1.5 and weight 1.5', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, null)).toBeCloseTo(1.5)
  })

  it('exactly at target → weight 1.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 14)).toBeCloseTo(1.0)
  })

  it('just past cooldown (7d) with target 14 → weight < 1.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 7)).toBeCloseTo(0.5)
    expect(selectionWeight(dish, 7)).toBeLessThan(1.0)
  })

  it('5× overdue → weight capped at 3.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 14 * 5)).toBe(3.0)
  })

  it('very overdue → still capped at 3.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 365)).toBe(3.0)
  })

  it('respects targetIntervalDays — dish with target 7 accrues weight twice as fast as target 14', () => {
    const fast = { targetIntervalDays: 7 }
    const slow = { targetIntervalDays: 14 }
    expect(selectionWeight(fast, 7)).toBeCloseTo(selectionWeight(slow, 14))
  })
})

describe('isEligibleForSlot', () => {
  const base = { cooldownDays: 7, targetIntervalDays: 14, excludedFromSuggestions: false, archived: false }

  it('eligible when daysSince equals cooldown', () => {
    expect(isEligibleForSlot(base, 7)).toBe(true)
  })

  it('eligible when daysSince exceeds cooldown', () => {
    expect(isEligibleForSlot(base, 14)).toBe(true)
  })

  it('ineligible when still in cooldown', () => {
    expect(isEligibleForSlot(base, 6)).toBe(false)
  })

  it('ineligible when daysSince is 0 (cooked today)', () => {
    expect(isEligibleForSlot(base, 0)).toBe(false)
  })

  it('ineligible when excluded from suggestions', () => {
    expect(isEligibleForSlot({ ...base, excludedFromSuggestions: true }, 100)).toBe(false)
  })

  it('ineligible when archived', () => {
    expect(isEligibleForSlot({ ...base, archived: true }, 100)).toBe(false)
  })

  it('never-served dish is eligible (effective daysSince = 1.5 × target ≥ cooldown)', () => {
    expect(isEligibleForSlot(base, null)).toBe(true)
  })
})

// ── seasonOf ─────────────────────────────────────────────────────────────────

describe('seasonOf', () => {
  it('March is spring', () => expect(seasonOf('2026-03-15')).toBe('spring'))
  it('May is spring', () => expect(seasonOf('2026-05-31')).toBe('spring'))
  it('June is summer', () => expect(seasonOf('2026-06-01')).toBe('summer'))
  it('August is summer', () => expect(seasonOf('2026-08-31')).toBe('summer'))
  it('September is fall', () => expect(seasonOf('2026-09-01')).toBe('fall'))
  it('November is fall', () => expect(seasonOf('2026-11-30')).toBe('fall'))
  it('December is winter', () => expect(seasonOf('2026-12-01')).toBe('winter'))
  it('February is winter', () => expect(seasonOf('2026-02-28')).toBe('winter'))
})

// ── weightedRandom ────────────────────────────────────────────────────────────

describe('weightedRandom', () => {
  it('returns null on empty array', () => expect(weightedRandom([])).toBeNull())
  it('returns the single item when only one', () => {
    const item = { id: 1 }
    expect(weightedRandom([{ item, weight: 1 }])).toBe(item)
  })
  it('always returns the item with all the weight', () => {
    const a = { id: 1 }
    const b = { id: 2 }
    const result = weightedRandom([{ item: a, weight: 0 }, { item: b, weight: 100 }])
    expect(result).toBe(b)
  })
})

// ── generateDraft ─────────────────────────────────────────────────────────────

function makeDish(overrides: Partial<Dish> & { id: number; name: string }): Dish {
  return {
    imageUrl: null,
    imageLocalPath: null,
    timeEstimateMinutes: null,
    yieldServings: null,
    sourceUrl: null,
    sourceName: null,
    difficulty: null,
    freeFrom: [],
    season: [],
    notes: null,
    cooldownDays: 7,
    targetIntervalDays: 14,
    excludedFromSuggestions: false,
    archived: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const baseDishes = [
  makeDish({ id: 1, name: 'Pasta' }),
  makeDish({ id: 2, name: 'Soup' }),
  makeDish({ id: 3, name: 'Salad' }),
]

const weekSlots = ['2026-06-01', '2026-06-02', '2026-06-03'].map((date) => ({
  date,
  mealType: 'dinner',
  state: 'plan' as const,
}))

const baseInput = {
  slots: weekSlots,
  dishes: baseDishes,
  committedEntries: [],
  sessionVirtualTags: [],
  pinnedTags: [],
  wishlistTags: [],
  householdSize: 3,
}

describe('generateDraft — basic fill', () => {
  it('fills all plan slots', () => {
    const { draftPlan, warnings } = generateDraft(baseInput)
    expect(Object.keys(draftPlan)).toHaveLength(3)
    expect(warnings).toHaveLength(0)
  })

  it('only uses valid dishIds', () => {
    const { draftPlan } = generateDraft(baseInput)
    for (const slot of Object.values(draftPlan)) {
      expect(slot.dishId).toBeGreaterThan(0)
    }
  })

  it('skips archived dishes', () => {
    const input = { ...baseInput, dishes: [makeDish({ id: 1, name: 'Pasta', archived: true }), makeDish({ id: 2, name: 'Soup' }), makeDish({ id: 3, name: 'Salad' })] }
    const { draftPlan } = generateDraft(input)
    for (const slot of Object.values(draftPlan)) {
      expect(slot.dishId).not.toBe(1)
    }
  })

  it('skips excluded dishes', () => {
    const input = { ...baseInput, dishes: [makeDish({ id: 1, name: 'Pasta', excludedFromSuggestions: true }), makeDish({ id: 2, name: 'Soup' }), makeDish({ id: 3, name: 'Salad' })] }
    const { draftPlan } = generateDraft(input)
    for (const slot of Object.values(draftPlan)) {
      expect(slot.dishId).not.toBe(1)
    }
  })

  it('skip-state slots are not filled', () => {
    const input = {
      ...baseInput,
      slots: [
        { date: '2026-06-01', mealType: 'dinner', state: 'skip' as const },
        { date: '2026-06-02', mealType: 'dinner', state: 'plan' as const },
      ],
    }
    const { draftPlan } = generateDraft(input)
    expect(draftPlan['2026-06-01:dinner']).toBeUndefined()
    expect(draftPlan['2026-06-02:dinner']).toBeDefined()
  })
})

describe('generateDraft — pinned slots', () => {
  it('resolves pinned slot first with matching dish', () => {
    const taggedDish = makeDish({ id: 4, name: 'Pizza', tags: [{ id: 10, name: 'pizza', color: null }] })
    const input = {
      ...baseInput,
      dishes: [...baseDishes, taggedDish],
      pinnedTags: [{ date: '2026-06-01', mealType: 'dinner', tagRef: { kind: 'real' as const, tagId: 10 } }],
    }
    const { draftPlan, warnings } = generateDraft(input)
    // The pinned slot must use taggedDish (id 4)
    expect(draftPlan['2026-06-01:dinner']?.dishId).toBe(4)
    expect(warnings).toHaveLength(0)
  })

  it('relaxes pin when no matching dish and attaches warning label', () => {
    const input = {
      ...baseInput,
      slots: [{ date: '2026-06-01', mealType: 'dinner', state: 'plan' as const }],
      pinnedTags: [{ date: '2026-06-01', mealType: 'dinner', tagRef: { kind: 'real' as const, tagId: 999 } }],
    }
    const { draftPlan } = generateDraft(input)
    const slot = draftPlan['2026-06-01:dinner']!
    expect(slot.dishId).toBeGreaterThan(0) // best-effort fill
    expect(slot.warningLabels?.some((w) => w.includes('relaxed'))).toBe(true)
  })

  it('marks no-match with dishId -1 when no dishes at all are eligible', () => {
    const input = {
      ...baseInput,
      dishes: [],
      slots: [{ date: '2026-06-01', mealType: 'dinner', state: 'plan' as const }],
      pinnedTags: [{ date: '2026-06-01', mealType: 'dinner', tagRef: { kind: 'real' as const, tagId: 10 } }],
    }
    const { draftPlan, warnings } = generateDraft(input)
    expect(draftPlan['2026-06-01:dinner']?.dishId).toBe(-1)
    expect(warnings.length).toBeGreaterThan(0)
  })
})

describe('generateDraft — wishlist tags', () => {
  it('places a wishlist-tagged dish in an unfilled slot', () => {
    const taggedDish = makeDish({ id: 5, name: 'Rice Bowl', tags: [{ id: 20, name: 'rice', color: null }] })
    const input = {
      ...baseInput,
      dishes: [...baseDishes, taggedDish],
      slots: [{ date: '2026-06-01', mealType: 'dinner', state: 'plan' as const }],
      wishlistTags: [20],
    }
    const { draftPlan } = generateDraft(input)
    const slot = draftPlan['2026-06-01:dinner']!
    expect(slot.dishId).toBe(5)
    expect(slot.wishlistTag).toBe(20)
  })

  it('skips wishlist tag and warns when no eligible dish carries it', () => {
    const input = { ...baseInput, wishlistTags: [999] }
    const { warnings } = generateDraft(input)
    expect(warnings.some((w) => w.includes('999'))).toBe(true)
  })
})

describe('generateDraft — cooldown enforcement', () => {
  it('does not place a dish within its cooldown window from committed entries', () => {
    const dish = makeDish({ id: 1, name: 'Pasta', cooldownDays: 14, targetIntervalDays: 14 })
    const input = {
      ...baseInput,
      dishes: [dish, makeDish({ id: 2, name: 'Soup' })],
      slots: [{ date: '2026-06-01', mealType: 'dinner', state: 'plan' as const }],
      committedEntries: [{
        id: 100, date: '2026-05-30', mealType: 'dinner', entryKind: 'fresh', dishId: 1,
        oneOffText: null, guestCount: 0, createdAt: '2026-01-01T00:00:00.000Z',
      }],
    }
    // dish 1 was served 2 days ago, cooldown 14 — must not be placed
    const { draftPlan } = generateDraft(input)
    expect(draftPlan['2026-06-01:dinner']?.dishId).not.toBe(1)
  })
})

describe('generateDraft — no eligible dishes', () => {
  it('marks slot as no-match when no dishes available', () => {
    const input = {
      ...baseInput,
      dishes: [],
      slots: [{ date: '2026-06-01', mealType: 'dinner', state: 'plan' as const }],
    }
    const { draftPlan, warnings } = generateDraft(input)
    expect(draftPlan['2026-06-01:dinner']?.dishId).toBe(-1)
    expect(warnings.length).toBeGreaterThan(0)
  })
})

// ── reroll ────────────────────────────────────────────────────────────────────

describe('reroll', () => {
  it('returns a dish not in the shown list', () => {
    const result = reroll({
      slotKey: '2026-06-01:dinner',
      dishes: baseDishes,
      committedEntries: [],
      currentDraftHistory: [],
      shownDishIds: [1],
      sessionVirtualTags: [],
      pinTagRefs: [],
    })
    expect(result).not.toBe('exhausted')
    if (result !== 'exhausted') {
      expect(result.dishId).not.toBe(1)
      expect(result.shownDishIds).toContain(result.dishId)
    }
  })

  it('returns exhausted when all dishes already shown', () => {
    const result = reroll({
      slotKey: '2026-06-01:dinner',
      dishes: baseDishes,
      committedEntries: [],
      currentDraftHistory: [],
      shownDishIds: [1, 2, 3],
      sessionVirtualTags: [],
      pinTagRefs: [],
    })
    expect(result).toBe('exhausted')
  })

  it('respects wishlistTagId constraint', () => {
    const taggedDish = makeDish({ id: 6, name: 'Noodles', tags: [{ id: 30, name: 'noodles', color: null }] })
    const result = reroll({
      slotKey: '2026-06-01:dinner',
      dishes: [...baseDishes, taggedDish],
      committedEntries: [],
      currentDraftHistory: [],
      shownDishIds: [],
      sessionVirtualTags: [],
      pinTagRefs: [],
      wishlistTagId: 30,
    })
    expect(result).not.toBe('exhausted')
    if (result !== 'exhausted') {
      expect(result.dishId).toBe(6)
    }
  })
})

// ── Integration test: leftovers don't advance daysSinceLastServedFresh ────────

vi.mock('../../server/database/index', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('../../server/database/schema')

  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: 'server/database/migrations' })
  return { db }
})

import { db } from '../../server/database/index'
import { dishes, planEntries } from '../../server/database/schema'
import { daysSinceLastServedFresh } from '../../server/services/planEntryService'

async function seedDish() {
  const now = new Date().toISOString()
  const rows = await db
    .insert(dishes)
    .values({
      name: 'Test Dish',
      freeFrom: '[]',
      season: '[]',
      cooldownDays: 7,
      targetIntervalDays: 14,
      excludedFromSuggestions: 0,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return rows[0]!
}

beforeEach(async () => {
  await db.delete(planEntries)
  await db.delete(dishes)
})

describe('leftover entries do not advance daysSinceLastServedFresh', () => {
  it('ignores leftover entries when computing days since fresh', async () => {
    const dish = await seedDish()
    const now = new Date().toISOString()

    // Fresh entry on day 0
    await db.insert(planEntries).values({
      date: '2025-01-01',
      mealType: 'dinner',
      entryKind: 'fresh',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })
    // Leftover entry on day 1 (should NOT reset the clock)
    await db.insert(planEntries).values({
      date: '2025-01-02',
      mealType: 'lunch',
      entryKind: 'leftover',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })

    // Querying from day 3 — should see 2 days since the fresh entry (Jan 1), not 1 day since leftover (Jan 2)
    const days = await daysSinceLastServedFresh(dish.id, '2025-01-03')
    expect(days).toBe(2)
  })

  it('returns null when only leftover entries exist', async () => {
    const dish = await seedDish()
    const now = new Date().toISOString()

    await db.insert(planEntries).values({
      date: '2025-01-02',
      mealType: 'lunch',
      entryKind: 'leftover',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })

    const days = await daysSinceLastServedFresh(dish.id, '2025-01-10')
    expect(days).toBeNull()
  })
})
