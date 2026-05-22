<template>
  <div>
    <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Step 2</p>
    <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-text mb-2">
      Slot <em class="font-normal italic text-accent-deep">setup</em>
    </h2>
    <p class="text-sm text-text-muted mb-6">Decide what happens in each slot this week.</p>

    <!-- Loading existing entries -->
    <div v-if="isPending" class="space-y-3">
      <div v-for="i in 7" :key="i" class="h-24 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <template v-else>
      <!-- Bulk actions + live summary -->
      <div class="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-medium uppercase tracking-wider text-text-subtle">Bulk</span>
          <button
            type="button"
            class="text-xs font-medium text-text-muted hover:text-text transition underline-offset-2 hover:underline"
            @click="skipAllPlan"
          >
            Skip all
          </button>
          <button
            type="button"
            class="text-xs font-medium text-text-muted hover:text-text transition underline-offset-2 hover:underline"
            @click="planAllSkip"
          >
            Restore all
          </button>
          <button
            type="button"
            class="text-xs font-medium text-text-muted hover:text-text transition underline-offset-2 hover:underline"
            @click="keepAllExisting"
          >
            Keep all existing
          </button>
        </div>

        <!-- Colored count badges -->
        <div class="ml-auto flex flex-wrap items-center gap-1.5">
          <span
            v-for="stat in statCounts"
            :key="stat.state"
            v-show="stat.count > 0"
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="stat.cls"
          >
            {{ stat.count }} {{ stat.state }}
          </span>
        </div>
      </div>

      <!-- Day grid: 2 cols desktop, 1 col mobile -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="day in weekDays"
          :key="day.iso"
          class="rounded-lg border border-border bg-surface p-4"
        >
          <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {{ day.dayLabel }} · {{ day.dateLabel }}
          </p>
          <div class="space-y-3">
            <div
              v-for="mealType in session.mealTypes"
              :key="`${day.iso}:${mealType}`"
              class="flex flex-col gap-1.5"
            >
              <!-- Row header: meal label + state pills -->
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="flex items-center gap-1 min-w-[72px]">
                  <span
                    class="inline-block h-2 w-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: mealDotColor(mealType) }"
                  />
                  <span class="text-xs font-medium capitalize text-text-muted">{{ mealType }}</span>
                </span>

                <!-- State pills -->
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="state in availableStates(day.iso, mealType)"
                    :key="state"
                    type="button"
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium transition"
                    :class="slotState(day.iso, mealType) === state
                      ? stateActiveClass(state)
                      : 'border border-border text-text-muted hover:bg-surface-alt'"
                    @click="setState(day.iso, mealType, state)"
                  >
                    {{ stateLabel(state) }}
                  </button>
                </div>
              </div>

              <!-- KEEP: show existing entry info -->
              <div
                v-if="slotState(day.iso, mealType) === 'keep' && existingEntry(day.iso, mealType)"
                class="rounded-md bg-surface-alt px-3 py-1.5 text-xs text-text-muted flex items-center justify-between gap-2"
              >
                <span class="truncate">
                  {{ existingEntry(day.iso, mealType)?.dishName ?? existingEntry(day.iso, mealType)?.oneOffText ?? '—' }}
                </span>
                <span class="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-text-subtle border border-border">
                  Existing
                </span>
              </div>

              <!-- ONE-OFF: text input -->
              <input
                v-if="slotState(day.iso, mealType) === 'one-off'"
                :value="oneOffText(day.iso, mealType)"
                type="text"
                placeholder="e.g. Pizza delivery"
                class="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                @input="setOneOffText(day.iso, mealType, ($event.target as HTMLInputElement).value)"
              />

              <!-- SKIP: hint -->
              <p
                v-if="slotState(day.iso, mealType) === 'skip'"
                class="text-xs text-text-subtle italic"
              >
                — blank on the calendar —
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { format, parseISO, addDays } from 'date-fns'
import type { PlanningSession, SlotState, MealType, PendingOneOffEntry } from '#shared/types/planningSession'
import type { PlanEntry } from '#shared/types/planEntry'

const props = defineProps<{ session: PlanningSession }>()
const emit = defineEmits<{
  update: [patch: Partial<PlanningSession>]
}>()

const weekEnd = computed(() => {
  return format(addDays(parseISO(props.session.weekStart), 6), 'yyyy-MM-dd')
})

const { data: existingEntries, isPending } = useQuery({
  queryKey: computed(() => queryKeys.planEntries.range(props.session.weekStart, weekEnd.value)),
  queryFn: () => $fetch<PlanEntry[]>(`/api/plan-entries?start=${props.session.weekStart}&end=${weekEnd.value}`),
})

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISO(props.session.weekStart), i)
    return {
      iso: format(d, 'yyyy-MM-dd'),
      dayLabel: format(d, 'EEE').toUpperCase(),
      dateLabel: format(d, 'MMM d'),
    }
  }),
)

// Local mutable copies of slot state
const localSlotStates = ref<Record<string, SlotState>>({ ...props.session.slotStates })
const localRemovedIds = ref<number[]>([...props.session.removedPlanEntryIds])
const localOneOffTexts = ref<Record<string, string>>({})

// Pre-populate one-off texts from pendingOneOffEntries
onMounted(() => {
  for (const entry of props.session.pendingOneOffEntries) {
    localOneOffTexts.value[`${entry.date}:${entry.mealType}`] = entry.text
  }
})

// When entries load, default empty slots to 'plan' and slots with entries to 'keep'
watch(existingEntries, (entries) => {
  if (!entries) return
  const entryMap = new Map(entries.map(e => [`${e.date}:${e.mealType}`, e]))

  for (const day of weekDays.value) {
    for (const mealType of props.session.mealTypes as MealType[]) {
      const key = `${day.iso}:${mealType}`
      if (!(key in localSlotStates.value)) {
        localSlotStates.value[key] = entryMap.has(key) ? 'keep' : 'plan'
      }
    }
  }
  emitUpdate()
}, { immediate: true })

function existingEntry(date: string, mealType: string): PlanEntry | undefined {
  return existingEntries.value?.find(e => e.date === date && e.mealType === mealType)
}

function slotState(date: string, mealType: string): SlotState {
  return localSlotStates.value[`${date}:${mealType}`] ?? 'plan'
}

function availableStates(date: string, mealType: string): SlotState[] {
  const states: SlotState[] = ['plan', 'skip', 'one-off']
  if (existingEntry(date, mealType)) states.push('keep')
  return states
}

function stateLabel(state: SlotState): string {
  if (state === 'one-off') return 'One-off'
  return state.charAt(0).toUpperCase() + state.slice(1)
}

function stateActiveClass(state: SlotState): string {
  const map: Record<SlotState, string> = {
    plan: 'bg-accent text-white',
    skip: 'bg-surface-alt text-text-muted border border-border',
    'one-off': 'bg-leftover/20 text-leftover border border-leftover/30',
    keep: 'bg-surface-alt text-text border border-border',
  }
  return map[state]
}

function mealDotColor(mealType: string): string {
  const map: Record<string, string> = {
    breakfast: '#C9A24A',
    lunch: '#6B8E5A',
    dinner: '#C76A52',
    uncategorized: '#7B6BA8',
  }
  return map[mealType] ?? '#7B6BA8'
}

function setState(date: string, mealType: string, state: SlotState) {
  const key = `${date}:${mealType}`
  const prev = localSlotStates.value[key]
  localSlotStates.value[key] = state

  // Track removedPlanEntryIds: when toggling KEEP → non-KEEP, queue existing entry for deletion
  const entry = existingEntry(date, mealType)
  if (entry) {
    if (prev === 'keep' && state !== 'keep') {
      if (!localRemovedIds.value.includes(entry.id)) {
        localRemovedIds.value.push(entry.id)
      }
    }
    else if (state === 'keep') {
      localRemovedIds.value = localRemovedIds.value.filter(eid => eid !== entry.id)
    }
  }

  if (state !== 'one-off') {
    delete localOneOffTexts.value[key]
  }

  emitUpdate()
}

function setOneOffText(date: string, mealType: string, text: string) {
  localOneOffTexts.value[`${date}:${mealType}`] = text
  emitUpdate()
}

function oneOffText(date: string, mealType: string): string {
  return localOneOffTexts.value[`${date}:${mealType}`] ?? ''
}

function buildPendingOneOffEntries(): PendingOneOffEntry[] {
  const entries: PendingOneOffEntry[] = []
  for (const [key, state] of Object.entries(localSlotStates.value)) {
    if (state === 'one-off') {
      const text = localOneOffTexts.value[key]
      if (text?.trim()) {
        const [date, mealType] = key.split(':') as [string, string]
        entries.push({ date, mealType: mealType as MealType, text: text.trim() })
      }
    }
  }
  return entries
}

function emitUpdate() {
  emit('update', {
    slotStates: { ...localSlotStates.value },
    removedPlanEntryIds: [...localRemovedIds.value],
    pendingOneOffEntries: buildPendingOneOffEntries(),
  })
}

// Bulk actions
function skipAllPlan() {
  for (const [key, state] of Object.entries(localSlotStates.value)) {
    if (state === 'plan') localSlotStates.value[key] = 'skip'
  }
  emitUpdate()
}

function planAllSkip() {
  for (const [key, state] of Object.entries(localSlotStates.value)) {
    if (state === 'skip') localSlotStates.value[key] = 'plan'
  }
  emitUpdate()
}

function keepAllExisting() {
  if (!existingEntries.value) return
  for (const entry of existingEntries.value) {
    const key = `${entry.date}:${entry.mealType}`
    if (localSlotStates.value[key] !== undefined) {
      localSlotStates.value[key] = 'keep'
      localRemovedIds.value = localRemovedIds.value.filter(id => id !== entry.id)
    }
  }
  emitUpdate()
}

// Live state count summary
const statCounts = computed(() => {
  const counts: Record<SlotState, number> = { plan: 0, skip: 0, 'one-off': 0, keep: 0 }
  for (const state of Object.values(localSlotStates.value)) {
    counts[state] = (counts[state] ?? 0) + 1
  }
  const clsMap: Record<SlotState, string> = {
    plan: 'bg-accent/15 text-accent-deep',
    keep: 'bg-[#6B8E5A]/15 text-[#4a6640]',
    'one-off': 'bg-leftover/20 text-leftover',
    skip: 'bg-surface-alt text-text-subtle border border-border',
  }
  return (Object.entries(counts) as [SlotState, number][])
    .map(([state, count]) => ({ state, count, cls: clsMap[state] }))
})
</script>
