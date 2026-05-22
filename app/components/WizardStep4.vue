<template>
  <div>
    <!-- Generating spinner -->
    <div v-if="isGenerating" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p class="text-sm text-text-muted">Generating your draft plan…</p>
    </div>

    <template v-else-if="hasDraft">
      <!-- Generation warnings -->
      <div v-if="generationWarnings.length" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
        <p v-for="w in generationWarnings" :key="w" class="text-xs text-amber-800">⚠ {{ w }}</p>
      </div>

      <!-- Top stat row -->
      <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium uppercase tracking-wider text-text-muted">
        <span v-if="stats.filled">{{ stats.filled }} {{ stats.filled === 1 ? 'dish' : 'dishes' }} filled</span>
        <span v-if="stats.leftover">{{ stats.leftover }} leftover slot{{ stats.leftover !== 1 ? 's' : '' }}</span>
        <span v-if="stats.oneOff">{{ stats.oneOff }} one-off</span>
        <span v-if="stats.kept">{{ stats.kept }} kept</span>
        <span v-if="stats.skipped">{{ stats.skipped }} skipped</span>
        <span v-if="stats.noMatch" class="text-amber-600">{{ stats.noMatch }} no eligible dish</span>
      </div>

      <!-- Applied anchors line -->
      <div v-if="appliedAnchors" class="mb-6 text-xs text-text-muted">
        <span class="font-medium uppercase tracking-wider">Applied ·</span> {{ appliedAnchors }}
      </div>

      <!-- Day cards -->
      <div class="space-y-4">
        <div
          v-for="day in dayCards"
          :key="day.date"
          class="rounded-xl border border-border bg-surface overflow-hidden"
        >
          <!-- Day header -->
          <div class="flex items-center justify-between px-4 py-2.5 bg-surface-alt border-b border-border">
            <span class="text-sm font-semibold text-text">{{ day.label }}</span>
            <span class="text-xs text-text-muted">{{ day.cookSummary }}</span>
          </div>

          <!-- Meal rows -->
          <div class="divide-y divide-border">
            <div
              v-for="row in day.rows"
              :key="row.slotKey"
              class="px-4 py-3 flex flex-wrap items-start gap-x-3 gap-y-2"
              :class="rowBgClass(row)"
            >
              <!-- Meal label -->
              <span class="w-16 shrink-0 pt-0.5 text-xs text-text-muted capitalize">{{ row.mealType }}</span>

              <!-- Abbreviation tile -->
              <div
                class="shrink-0 flex h-8 w-8 items-center justify-center rounded text-xs font-bold"
                :class="tileBgClass(row)"
              >
                {{ row.abbr }}
              </div>

              <!-- Dish info + meta -->
              <div class="flex-1 min-w-0">
                <!-- No-match state -->
                <template v-if="row.state === 'no-match'">
                  <p class="text-sm font-medium text-amber-700">NO MATCH</p>
                  <p v-if="row.warningLabels?.length" class="text-xs italic text-amber-600 mt-0.5">
                    {{ row.warningLabels.join(' · ') }}
                  </p>
                </template>

                <!-- Skip state -->
                <template v-else-if="row.state === 'skip'">
                  <p class="text-xs italic text-text-subtle">skipped — blank on the calendar</p>
                </template>

                <!-- One-off state -->
                <template v-else-if="row.state === 'one-off'">
                  <p class="text-sm text-text">★ {{ row.oneOffText }}</p>
                  <span v-if="row.isKept" class="inline-block mt-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">KEPT — LOCKED</span>
                </template>

                <!-- Keep state -->
                <template v-else-if="row.state === 'keep'">
                  <p class="text-sm font-medium text-text truncate">{{ row.dishName }}</p>
                  <span class="inline-block mt-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">KEPT — LOCKED</span>
                </template>

                <!-- Leftover state -->
                <template v-else-if="row.state === 'leftover'">
                  <p class="text-sm font-medium text-text truncate">{{ row.dishName }}</p>
                  <p class="text-xs text-text-muted mt-0.5">↻ from {{ row.leftoverFrom }}</p>
                </template>

                <!-- Plan (filled) state -->
                <template v-else>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p class="text-sm font-medium text-text truncate">{{ row.dishName }}</p>
                    <span v-if="row.warningLabels?.length" class="text-xs text-amber-600">⚠ {{ row.warningLabels.join(' · ') }}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-text-muted">
                    <span v-if="row.difficulty">{{ difficultyDots(row.difficulty) }}</span>
                    <span v-if="row.timeEstimate">{{ row.timeEstimate }}m</span>
                    <span v-if="row.yields">yields {{ row.yields }}</span>
                    <span v-for="tag in row.tags" :key="tag" class="text-text-subtle">{{ tag }}</span>
                    <span v-if="row.pinChip" class="text-accent font-medium">+ {{ row.pinChip }}</span>
                    <span v-if="row.wishlistChip" class="text-accent font-medium">· {{ row.wishlistChip }}</span>
                  </div>
                </template>

                <!-- Leftover toggle (eligible dinner rows) -->
                <div v-if="row.showLeftoverToggle" class="mt-1.5">
                  <button
                    type="button"
                    class="text-xs text-text-muted hover:text-text transition"
                    :class="{ 'text-accent': row.leftoverToggled }"
                    :disabled="row.leftoverToggleDisabled"
                    :title="row.leftoverToggleDisabledReason"
                    @click="toggleLeftover(row.slotKey)"
                  >
                    {{ row.leftoverToggled ? '· leftover lunch tomorrow ✓' : '○ leftover lunch tomorrow' }}
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="w-full sm:w-auto shrink-0 flex items-center gap-1.5 sm:pt-0.5 justify-end">
                <template v-if="row.state === 'no-match'">
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition"
                    @click="openSwap(row.slotKey)"
                  >
                    Swap manually
                  </button>
                </template>
                <template v-else-if="row.state === 'skip'">
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition"
                    @click="clearSlot(row.slotKey)"
                  >
                    Clear
                  </button>
                </template>
                <template v-else-if="row.state === 'keep' || row.state === 'one-off' || row.state === 'leftover'">
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition"
                    @click="clearSlot(row.slotKey)"
                  >
                    Clear
                  </button>
                </template>
                <template v-else-if="row.state === 'plan'">
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition disabled:opacity-40"
                    :disabled="isRerolling === row.slotKey"
                    @click="doReroll(row.slotKey)"
                  >
                    {{ isRerolling === row.slotKey ? '…' : 'Reroll' }}
                  </button>
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition"
                    @click="openSwap(row.slotKey)"
                  >
                    Swap
                  </button>
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:bg-surface-alt transition"
                    @click="clearSlot(row.slotKey)"
                  >
                    Clear
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm footer -->
      <div class="mt-6 rounded-xl border border-border bg-surface-alt px-5 py-4">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">On confirm</p>
        <p class="text-sm text-text">
          {{ confirmSummary.written }} entr{{ confirmSummary.written === 1 ? 'y' : 'ies' }} will be written
          <template v-if="confirmSummary.kept"> · {{ confirmSummary.kept }} kept</template>
          <template v-if="confirmSummary.blank"> · {{ confirmSummary.blank }} left blank</template>
        </p>
      </div>
    </template>

    <!-- Swap dialog -->
    <Teleport to="body">
      <div v-if="swapSlotKey" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" @click.self="closeSwap">
        <div class="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
          <h2 class="font-serif text-lg font-semibold text-text mb-4">Swap dish</h2>
          <input
            v-model="swapSearch"
            type="text"
            placeholder="Search dishes…"
            class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 mb-2"
          />
          <div class="max-h-60 overflow-y-auto rounded-lg border border-border bg-bg divide-y divide-border">
            <button
              v-for="dish in (swapResults ?? [])"
              :key="dish.id"
              type="button"
              class="w-full text-left px-3 py-2.5 hover:bg-surface-alt transition text-sm text-text"
              @click="confirmSwap(dish.id)"
            >
              {{ dish.name }}
            </button>
            <div v-if="(swapResults ?? []).length === 0 && swapSearch.length > 0" class="px-3 py-2.5 text-sm text-text-subtle">No dishes found.</div>
          </div>
          <button
            type="button"
            class="mt-4 text-sm text-text-muted hover:text-text transition"
            @click="closeSwap"
          >
            Cancel
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { format, addDays, parseISO } from 'date-fns'
import type { PlanningSession } from '#shared/types/planningSession'
import type { Dish } from '#shared/types/dish'

const props = defineProps<{
  session: PlanningSession
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<PlanningSession>): void
  (e: 'generated', warnings: string[]): void
}>()

const queryClient = useQueryClient()

const isGenerating = ref(false)
const isRerolling = ref<string | null>(null)
const generationWarnings = ref<string[]>([])

// Generate on mount if draft is empty
onMounted(async () => {
  if (Object.keys(props.session.draftPlan).length === 0) {
    await generate()
  }
})

async function generate() {
  isGenerating.value = true
  try {
    const result = await $fetch<{ session: PlanningSession; warnings: string[] }>(
      `/api/planning-sessions/${props.session.id}/generate`,
      { method: 'POST' },
    )
    generationWarnings.value = result.warnings ?? []
    queryClient.setQueryData(queryKeys.planningSessions.detail(props.session.id), result.session)
    emit('generated', result.warnings ?? [])
  }
  finally {
    isGenerating.value = false
  }
}

const hasDraft = computed(() => Object.keys(props.session.draftPlan).length > 0)

// ── Derived data for rendering ────────────────────────────────────────────────

const { data: allDishes } = useQuery({
  queryKey: queryKeys.dishes.list({}),
  queryFn: () => $fetch<Dish[]>('/api/dishes'),
})

const { data: allTags } = useQuery({
  queryKey: queryKeys.tags.all(),
  queryFn: () => $fetch<{ id: number; name: string; color: string | null }[]>('/api/tags'),
})

function getDish(id: number): Dish | undefined {
  return allDishes.value?.find((d) => d.id === id)
}

function getTagName(tagId: number): string {
  return allTags.value?.find((t) => t.id === tagId)?.name ?? `tag #${tagId}`
}

function abbr(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return (words[0]!.slice(0, 2)).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

type RowState = 'plan' | 'skip' | 'keep' | 'one-off' | 'leftover' | 'no-match'

interface MealRow {
  slotKey: string
  mealType: string
  state: RowState
  abbr: string
  dishName?: string
  oneOffText?: string
  isKept?: boolean
  warningLabels?: string[]
  difficulty?: string | null
  timeEstimate?: number | null
  yields?: number | null
  tags?: string[]
  pinChip?: string
  wishlistChip?: string
  leftoverFrom?: string
  showLeftoverToggle?: boolean
  leftoverToggled?: boolean
  leftoverToggleDisabled?: boolean
  leftoverToggleDisabledReason?: string
}

interface DayCard {
  date: string
  label: string
  rows: MealRow[]
  cookSummary: string
}

// Build day cards from session state + draft plan
const dayCards = computed<DayCard[]>(() => {
  const session = props.session
  const cards: DayCard[] = []

  for (let i = 0; i < 7; i++) {
    const date = format(addDays(parseISO(session.weekStart), i), 'yyyy-MM-dd')
    const dayLabel = format(parseISO(date), 'EEE · MMM d').toUpperCase()
    const rows: MealRow[] = []
    let cookCount = 0
    let otherCount = 0

    for (const mealType of session.mealTypes) {
      const slotKey = `${date}:${mealType}`
      const slotState = session.slotStates[slotKey] ?? 'plan'

      if (slotState === 'skip') {
        rows.push({ slotKey, mealType, state: 'skip', abbr: '—' })
        otherCount++
        continue
      }

      if (slotState === 'keep') {
        // Find existing entry from committed entries (shown in draft as keep)
        const draftSlot = session.draftPlan[slotKey]
        const dish = draftSlot ? getDish(draftSlot.dishId) : undefined
        rows.push({
          slotKey,
          mealType,
          state: 'keep',
          abbr: dish ? abbr(dish.name) : 'KT',
          dishName: dish?.name ?? 'Existing entry',
        })
        otherCount++
        continue
      }

      if (slotState === 'one-off') {
        const pending = session.pendingOneOffEntries.find(
          (e) => e.date === date && e.mealType === mealType,
        )
        rows.push({
          slotKey,
          mealType,
          state: 'one-off',
          abbr: '★',
          oneOffText: pending?.text ?? 'One-off',
          isKept: false,
        })
        otherCount++
        continue
      }

      // Plan state — check draft
      const draftSlot = session.draftPlan[slotKey]

      if (!draftSlot) {
        // Not yet generated
        rows.push({ slotKey, mealType, state: 'plan', abbr: '?', dishName: 'Not yet generated' })
        continue
      }

      // Leftover suggestion
      if (draftSlot.kind === 'leftover-suggestion') {
        const dish = getDish(draftSlot.dishId)
        const fromKey = draftSlot.leftoverFor ?? ''
        const [fromDate, fromMeal] = fromKey.split(':')
        const fromLabel = fromDate && fromMeal
          ? `${format(parseISO(fromDate), 'EEE').toLowerCase()} ${fromMeal}`
          : fromKey
        rows.push({
          slotKey,
          mealType,
          state: 'leftover',
          abbr: dish ? abbr(dish.name) : 'LO',
          dishName: dish?.name ?? 'Leftover',
          leftoverFrom: fromLabel,
        })
        otherCount++
        continue
      }

      // No-match
      if (draftSlot.dishId <= 0) {
        rows.push({
          slotKey,
          mealType,
          state: 'no-match',
          abbr: '!',
          warningLabels: draftSlot.warningLabels,
        })
        otherCount++
        continue
      }

      // Normal filled dish
      const dish = getDish(draftSlot.dishId)
      const pinForSlot = session.pinnedTags.find(
        (p) => p.date === date && p.mealType === mealType,
      )
      const pinChip = pinForSlot
        ? (pinForSlot.tagRef.kind === 'virtual'
            ? (pinForSlot.tagRef as { kind: 'virtual'; id: string }).id.replace('v:', '')
            : getTagName((pinForSlot.tagRef as { kind: 'real'; tagId: number }).tagId))
        : undefined
      const wishlistChip = draftSlot.wishlistTag !== undefined
        ? getTagName(draftSlot.wishlistTag)
        : undefined

      // Leftover toggle logic
      const isEligibleForLeftoverToggle =
        mealType === 'dinner' &&
        dish?.yieldServings != null &&
        dish.yieldServings > 3 // household size (3) + 0 guests
      const nextDayDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
      const nextLunchKey = `${nextDayDate}:lunch`
      const nextLunchState = session.slotStates[nextLunchKey] ?? 'plan'
      const leftoverToggleDisabled = nextLunchState === 'keep' || nextLunchState === 'one-off'
      const leftoverToggleDisabledReason = leftoverToggleDisabled
        ? `Next day lunch is ${nextLunchState} — cannot add leftover`
        : undefined

      cookCount++
      rows.push({
        slotKey,
        mealType,
        state: 'plan',
        abbr: dish ? abbr(dish.name) : '?',
        dishName: dish?.name ?? `Dish #${draftSlot.dishId}`,
        warningLabels: draftSlot.warningLabels,
        difficulty: dish?.difficulty,
        timeEstimate: dish?.timeEstimateMinutes,
        yields: dish?.yieldServings,
        tags: dish?.tags.map((t) => t.name),
        pinChip,
        wishlistChip,
        showLeftoverToggle: isEligibleForLeftoverToggle,
        leftoverToggled: session.leftoverToggles[slotKey] ?? false,
        leftoverToggleDisabled,
        leftoverToggleDisabledReason,
      })
    }

    if (rows.length > 0) {
      const summary = [
        cookCount > 0 ? `${cookCount} cook` : '',
        otherCount > 0 ? `${otherCount} other` : '',
      ].filter(Boolean).join(' · ')

      cards.push({ date, label: dayLabel, rows, cookSummary: summary })
    }
  }

  return cards
})

const stats = computed(() => {
  const s = { filled: 0, leftover: 0, oneOff: 0, kept: 0, skipped: 0, noMatch: 0 }
  for (const day of dayCards.value) {
    for (const row of day.rows) {
      if (row.state === 'plan') s.filled++
      else if (row.state === 'leftover') s.leftover++
      else if (row.state === 'one-off') s.oneOff++
      else if (row.state === 'keep') s.kept++
      else if (row.state === 'skip') s.skipped++
      else if (row.state === 'no-match') s.noMatch++
    }
  }
  return s
})

const appliedAnchors = computed(() => {
  const session = props.session
  const parts: string[] = []
  if (session.sessionVirtualTags.length) {
    parts.push(session.sessionVirtualTags.map((id) => id.replace('v:', '')).join(' · '))
  }
  if (session.pinnedTags.length) {
    parts.push(`${session.pinnedTags.length} pin${session.pinnedTags.length !== 1 ? 's' : ''}`)
  }
  if (session.wishlistTags.length) {
    parts.push(`${session.wishlistTags.length} wishlist tag${session.wishlistTags.length !== 1 ? 's' : ''}`)
  }
  return parts.join(' · ')
})

const confirmSummary = computed(() => {
  const session = props.session
  let written = 0
  let kept = 0
  let blank = 0

  for (const [key, slot] of Object.entries(session.draftPlan)) {
    if (slot.dishId > 0) written++
    else blank++
  }
  for (const entry of session.pendingOneOffEntries) {
    written++
  }
  for (const day of dayCards.value) {
    for (const row of day.rows) {
      if (row.state === 'keep') kept++
      if (row.state === 'skip') blank++
    }
  }
  // Leftover toggles
  const toggledCount = Object.values(session.leftoverToggles).filter(Boolean).length
  written += toggledCount

  return { written, kept, blank }
})

// ── Visual helpers ────────────────────────────────────────────────────────────

function rowBgClass(row: MealRow): string {
  if (row.state === 'keep') return 'bg-emerald-50/60'
  if (row.state === 'one-off') return 'bg-violet-50/60'
  if (row.state === 'leftover') return 'bg-amber-50/60'
  if (row.state === 'no-match') return 'bg-orange-50/60'
  if (row.state === 'skip') return 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.03)_6px,rgba(0,0,0,0.03)_12px)]'
  return ''
}

function tileBgClass(row: MealRow): string {
  if (row.state === 'keep') return 'bg-emerald-100 text-emerald-700'
  if (row.state === 'one-off') return 'bg-violet-100 text-violet-700'
  if (row.state === 'leftover') return 'bg-amber-100 text-amber-700'
  if (row.state === 'no-match') return 'bg-orange-100 text-orange-700'
  if (row.state === 'skip') return 'bg-surface-alt text-text-subtle'
  return 'bg-accent/10 text-accent'
}

function difficultyDots(difficulty: string | null | undefined): string {
  if (difficulty === 'easy') return '●○○'
  if (difficulty === 'medium') return '●●○'
  if (difficulty === 'hard') return '●●●'
  return ''
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function doReroll(slotKey: string) {
  isRerolling.value = slotKey
  try {
    const result = await $fetch<{ session?: PlanningSession; exhausted: boolean }>(
      `/api/planning-sessions/${props.session.id}/reroll`,
      { method: 'POST', body: { slotKey } },
    )
    if (result.exhausted) {
      if (confirm('All matching dishes have been suggested for this slot. Show from the beginning?')) {
        // Reset shown list and reroll
        const clearedShown = { ...props.session.shownDishIdsBySlot, [slotKey]: [] }
        emit('update', { shownDishIdsBySlot: clearedShown })
      }
      return
    }
    if (result.session) {
      queryClient.setQueryData(queryKeys.planningSessions.detail(props.session.id), result.session)
    }
  }
  finally {
    isRerolling.value = null
  }
}

async function clearSlot(slotKey: string) {
  const updatedDraft = { ...props.session.draftPlan }
  delete updatedDraft[slotKey]
  emit('update', { draftPlan: updatedDraft })
}

async function toggleLeftover(dinnerSlotKey: string) {
  const session = props.session
  const currentToggle = session.leftoverToggles[dinnerSlotKey] ?? false
  const newToggle = !currentToggle

  const updatedToggles = { ...session.leftoverToggles, [dinnerSlotKey]: newToggle }
  const updatedDraft = { ...session.draftPlan }

  const [dinnerDate] = dinnerSlotKey.split(':')
  const nextDayDate = format(addDays(parseISO(dinnerDate!), 1), 'yyyy-MM-dd')
  const lunchSlotKey = `${nextDayDate}:lunch`
  const dinnerSlot = session.draftPlan[dinnerSlotKey]

  if (newToggle && dinnerSlot && dinnerSlot.dishId > 0) {
    updatedDraft[lunchSlotKey] = {
      kind: 'leftover-suggestion',
      dishId: dinnerSlot.dishId,
      leftoverFor: dinnerSlotKey,
    }
  } else {
    delete updatedDraft[lunchSlotKey]
  }

  emit('update', { leftoverToggles: updatedToggles, draftPlan: updatedDraft })
}

// Swap dialog
const swapSlotKey = ref<string | null>(null)
const swapSearch = ref('')

const { data: swapResults } = useQuery({
  queryKey: computed(() => ['dishes', 'swap', swapSearch.value]),
  queryFn: () => swapSearch.value.length >= 1
    ? $fetch<Dish[]>(`/api/dishes?search=${encodeURIComponent(swapSearch.value)}`)
    : Promise.resolve([] as Dish[]),
  enabled: computed(() => swapSearch.value.length >= 1),
})

function openSwap(slotKey: string) {
  swapSlotKey.value = slotKey
  swapSearch.value = ''
}

function closeSwap() {
  swapSlotKey.value = null
  swapSearch.value = ''
}

async function confirmSwap(dishId: number) {
  if (!swapSlotKey.value) return
  const updatedDraft = {
    ...props.session.draftPlan,
    [swapSlotKey.value]: {
      kind: 'dish' as const,
      dishId,
      isManualOverride: true,
    },
  }
  emit('update', { draftPlan: updatedDraft })
  closeSwap()
}
</script>
