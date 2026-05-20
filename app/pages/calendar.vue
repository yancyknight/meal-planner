<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-end justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Calendar</p>
        <h1 class="font-serif text-4xl font-semibold text-text">
          <template v-if="view === 'month'">
            <em class="font-normal italic text-accent-deep">{{ format(anchor, 'MMMM') }}</em>
            {{ format(anchor, 'yyyy') }}
          </template>
          <template v-else-if="view === 'week'">
            Week of <em class="font-normal italic text-accent-deep">{{ format(weekStart, 'MMM d') }}</em>
          </template>
          <template v-else>
            <em class="font-normal italic text-accent-deep">{{ format(anchor, 'EEEE') }}</em>,
            {{ format(anchor, 'MMM d') }}
          </template>
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <!-- View toggle -->
        <div class="flex gap-1 rounded-full border border-border p-1">
          <button
            v-for="v in VIEWS"
            :key="v"
            type="button"
            class="rounded-full px-4 py-1 text-xs font-medium capitalize transition"
            :class="view === v
              ? 'bg-accent-soft text-accent-deep'
              : 'text-text-muted hover:text-text'"
            @click="view = v"
          >{{ v }}</button>
        </div>
        <!-- Navigation -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-full border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
            @click="navigate(-1)"
          >‹</button>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-alt transition"
            @click="goToday"
          >Today</button>
          <button
            type="button"
            class="rounded-full border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
            @click="navigate(1)"
          >›</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex items-center justify-center py-20 text-text-subtle">
      <span class="text-sm">Loading…</span>
    </div>

    <!-- Week view -->
    <template v-else-if="view === 'week'">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="w-24 py-2 pr-3 text-right text-xs font-medium uppercase tracking-wider text-text-subtle" />
              <th
                v-for="day in weekDays"
                :key="day.iso"
                class="px-2 py-2 text-center"
              >
                <div class="text-xs font-medium uppercase tracking-wider text-text-muted">{{ day.label }}</div>
                <div
                  class="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full font-serif text-lg font-semibold"
                  :class="day.isToday ? 'bg-accent text-white' : 'text-text'"
                >{{ day.dayNum }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mt in MEAL_TYPES" :key="mt">
              <td class="py-2 pr-3 text-right align-top">
                <div class="flex items-center justify-end gap-1.5">
                  <span class="h-2 w-2 rounded-full flex-shrink-0" :style="{ backgroundColor: MEAL_COLORS[mt] }" />
                  <span class="text-xs font-medium capitalize text-text-muted">{{ mt }}</span>
                </div>
              </td>
              <td
                v-for="day in weekDays"
                :key="day.iso"
                class="align-top px-1.5 py-2"
                style="min-width: 120px; max-width: 160px;"
              >
                <VueDraggable
                  v-model="weekSlots[slotKey(day.iso, mt)]"
                  group="plan-entries"
                  class="flex flex-col gap-1.5"
                  :data-date="day.iso"
                  :data-meal-type="mt"
                  @start="onDragStart($event, day.iso, mt)"
                  @end="onDragEnd"
                >
                  <PlanEntryChip
                    v-for="element in weekSlots[slotKey(day.iso, mt)]"
                    :key="element.id"
                    :entry="element"
                    @delete="deleteEntry(element.id)"
                    @move="openMove(element)"
                  />
                </VueDraggable>
                <button
                  type="button"
                  class="mt-1.5 flex h-7 w-full items-center justify-center rounded-lg border border-dashed border-border text-text-subtle opacity-40 hover:opacity-100 hover:border-accent hover:text-accent transition text-sm"
                  @click="openAdd(day.iso, mt)"
                >+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Month view -->
    <template v-else-if="view === 'month'">
      <div class="mb-1 grid grid-cols-7 gap-1 text-center">
        <div
          v-for="d in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']"
          :key="d"
          class="text-xs font-medium uppercase tracking-wider text-text-muted py-1"
        >{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="cell in monthCells"
          :key="cell.iso"
          class="min-h-24 rounded-lg border p-2 transition"
          :class="cell.inMonth
            ? 'border-border bg-surface hover:bg-surface-alt cursor-pointer'
            : 'border-transparent bg-transparent'"
          @click="cell.inMonth && drillToDay(cell.iso)"
        >
          <div
            class="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium"
            :class="cell.isToday
              ? 'bg-accent text-white'
              : cell.inMonth ? 'text-text' : 'text-text-subtle'"
          >{{ cell.dayNum }}</div>
          <div v-if="cell.inMonth" class="space-y-0.5">
            <div
              v-for="entry in allEntriesForDay(cell.iso).slice(0, 3)"
              :key="entry.id"
              class="truncate rounded px-1.5 py-0.5 text-xs"
              :class="entry.entryKind === 'leftover'
                ? 'bg-leftover/10 text-leftover'
                : 'bg-surface-alt text-text-muted'"
            >{{ entry.dishName ?? entry.oneOffText }}</div>
            <div
              v-if="allEntriesForDay(cell.iso).length > 3"
              class="text-xs text-text-subtle"
            >+{{ allEntriesForDay(cell.iso).length - 3 }} more</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Day view -->
    <template v-else>
      <div class="space-y-4">
        <div v-for="mt in MEAL_TYPES" :key="mt" class="rounded-lg border border-border bg-surface p-5">
          <div class="mb-3 flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: MEAL_COLORS[mt] }" />
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted capitalize">{{ mt }}</p>
          </div>
          <div class="space-y-2">
            <PlanEntryChip
              v-for="entry in entriesFor(format(anchor, 'yyyy-MM-dd'), mt)"
              :key="entry.id"
              :entry="entry"
              full
              @delete="deleteEntry(entry.id)"
              @move="openMove(entry)"
            />
            <button
              type="button"
              class="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-text-subtle hover:border-accent hover:text-accent transition"
              @click="openAdd(format(anchor, 'yyyy-MM-dd'), mt)"
            >+ Add</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Add dialog -->
    <AddPlanEntryDialog
      :show="addDialogOpen"
      :date="dialogDate"
      :meal-type="dialogMealType"
      @close="addDialogOpen = false"
      @created="addDialogOpen = false"
    />

    <!-- Move dialog -->
    <MovePlanEntryDialog
      :show="moveDialogOpen"
      :entry="moveEntry"
      @close="moveDialogOpen = false"
      @moved="moveDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { VueDraggable } from 'vue-draggable-plus'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  addMonths,
  addDays,
  isToday,
  isSameMonth,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { PlanEntry, MealType } from '#shared/types/planEntry'

const VIEWS = ['week', 'month', 'day'] as const
type View = typeof VIEWS[number]

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'uncategorized']

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#C9A24A',
  lunch: '#6B8E5A',
  dinner: '#C76A52',
  uncategorized: '#7B6BA8',
}

const queryClient = useQueryClient()
const view = ref<View>('week')
const anchor = ref(startOfDay(new Date()))

// ── Date range helpers ──────────────────────────────────────────
const weekStart = computed(() => startOfWeek(anchor.value, { weekStartsOn: 1 }))
const weekEnd = computed(() => endOfWeek(anchor.value, { weekStartsOn: 1 }))

const rangeStart = computed(() => {
  if (view.value === 'week') return format(weekStart.value, 'yyyy-MM-dd')
  if (view.value === 'month') return format(startOfMonth(anchor.value), 'yyyy-MM-dd')
  return format(anchor.value, 'yyyy-MM-dd')
})

const rangeEnd = computed(() => {
  if (view.value === 'week') return format(weekEnd.value, 'yyyy-MM-dd')
  if (view.value === 'month') return format(endOfMonth(anchor.value), 'yyyy-MM-dd')
  return format(anchor.value, 'yyyy-MM-dd')
})

// ── Week days (declared early — used by weekSlots sync) ─────────
const weekDays = computed(() => {
  const days = eachDayOfInterval({ start: weekStart.value, end: weekEnd.value })
  return days.map(d => ({
    iso: format(d, 'yyyy-MM-dd'),
    label: format(d, 'EEE'),
    dayNum: format(d, 'd'),
    isToday: isToday(d),
  }))
})

// ── Data ────────────────────────────────────────────────────────
const { data: entries, isPending } = useQuery({
  queryKey: computed(() => queryKeys.planEntries.range(rangeStart.value, rangeEnd.value)),
  queryFn: () => $fetch<PlanEntry[]>(`/api/plan-entries?start=${rangeStart.value}&end=${rangeEnd.value}`),
})

function entriesFor(date: string, mt: MealType): PlanEntry[] {
  return entries.value?.filter(e => e.date === date && e.mealType === mt) ?? []
}

function allEntriesForDay(date: string): PlanEntry[] {
  return entries.value?.filter(e => e.date === date) ?? []
}

// Template literal type ensures noUncheckedIndexedAccess treats indexing as non-optional.
type SlotKey = `${string}__${MealType}`

function slotKey(date: string, mt: MealType): SlotKey {
  return `${date}__${mt}`
}

// ── Week view drag-and-drop ──────────────────────────────────────
// Reactive map of slot arrays bound via v-model to VueDraggable.
// Synced from query on every entries update; vue-draggable-plus mutates
// these arrays in place during drag for live visual feedback.
// Typed as Record<SlotKey, any> so noUncheckedIndexedAccess doesn't add | undefined
// to the slot index access used in the VueDraggable v-model binding.
// Runtime values are always PlanEntry[] — set exclusively by syncWeekSlots.
const weekSlots = reactive({}) as unknown as Record<SlotKey, any>

function syncWeekSlots() {
  for (const day of weekDays.value) {
    for (const mt of MEAL_TYPES) {
      const key = slotKey(day.iso, mt)
      const fresh = entriesFor(day.iso, mt)
      if (!weekSlots[key]) {
        weekSlots[key] = [...fresh]
      } else {
        weekSlots[key].splice(0, weekSlots[key].length, ...fresh)
      }
    }
  }
}

watch(entries, syncWeekSlots, { immediate: true })
watch(weekDays, syncWeekSlots)

// Track which entry is being dragged so @end can identify it by ID.
let draggedEntryId: number | null = null

function onDragStart(
  evt: { oldIndex?: number },
  fromDate: string,
  fromMt: MealType,
) {
  const sourceList = weekSlots[slotKey(fromDate, fromMt)]
  draggedEntryId = sourceList[evt.oldIndex ?? 0]?.id ?? null
}

async function onDragEnd(evt: { to: HTMLElement; from: HTMLElement }) {
  const id = draggedEntryId
  draggedEntryId = null
  if (!id) return

  const toDate = evt.to.dataset.date
  const toMt = evt.to.dataset.mealType as MealType | undefined
  const fromDate = evt.from.dataset.date
  const fromMt = evt.from.dataset.mealType

  if (!toDate || !toMt) return
  if (toDate === fromDate && toMt === fromMt) return

  await $fetch(`/api/plan-entries/${id}`, {
    method: 'PATCH',
    body: { date: toDate, mealType: toMt },
  })
  queryClient.invalidateQueries({ queryKey: queryKeys.planEntries.all() })
}

// ── Delete ───────────────────────────────────────────────────────
const { mutate: deleteEntry } = useMutation({
  mutationFn: (id: number) => $fetch(`/api/plan-entries/${id}`, { method: 'DELETE' }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.planEntries.all() }),
})

// ── Navigation ──────────────────────────────────────────────────
function navigate(dir: 1 | -1) {
  if (view.value === 'week') anchor.value = addWeeks(anchor.value, dir)
  else if (view.value === 'month') anchor.value = addMonths(anchor.value, dir)
  else anchor.value = addDays(anchor.value, dir)
}

function goToday() {
  anchor.value = startOfDay(new Date())
}

function drillToDay(iso: string) {
  anchor.value = parseISO(iso)
  view.value = 'day'
}

// ── Month cells ─────────────────────────────────────────────────
const monthCells = computed(() => {
  const mStart = startOfMonth(anchor.value)
  const mEnd = endOfMonth(anchor.value)
  const gridStart = startOfWeek(mStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(mEnd, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map(d => ({
    iso: format(d, 'yyyy-MM-dd'),
    dayNum: format(d, 'd'),
    inMonth: isSameMonth(d, anchor.value),
    isToday: isToday(d),
  }))
})

// ── Add dialog ──────────────────────────────────────────────────
const addDialogOpen = ref(false)
const dialogDate = ref('')
const dialogMealType = ref<MealType>('dinner')

function openAdd(date: string, mt: MealType) {
  dialogDate.value = date
  dialogMealType.value = mt
  addDialogOpen.value = true
}

// ── Move dialog ─────────────────────────────────────────────────
const moveDialogOpen = ref(false)
const moveEntry = ref<PlanEntry | null>(null)

function openMove(entry: PlanEntry) {
  moveEntry.value = entry
  moveDialogOpen.value = true
}
</script>
