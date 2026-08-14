<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Calendar</p>
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
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
        <p class="mt-0.5 text-sm text-text-muted capitalize">
          <template v-if="view === 'month'">{{ monthLabel }}</template>
          <template v-else-if="view === 'week'">{{ weekLabel }}</template>
          <template v-else>{{ dayLabel }}</template>
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- View toggle -->
        <div class="flex gap-1 rounded-full border border-border p-1">
          <button
            v-for="v in VIEWS"
            :key="v"
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium capitalize transition min-h-[32px]"
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
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-text-muted hover:bg-surface-alt transition"
            aria-label="Previous"
            @click="navigate(-1)"
          >‹</button>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-alt transition min-h-[36px]"
            @click="goToday"
          >Today</button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-text-muted hover:bg-surface-alt transition"
            aria-label="Next"
            @click="navigate(1)"
          >›</button>
          <!-- Jump to date -->
          <input
            type="date"
            :value="jumpDateValue"
            class="ml-1 h-9 rounded-lg border border-border bg-surface px-2 text-xs text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            aria-label="Jump to date"
            @change="onJumpDate"
          >
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex items-center justify-center py-20 text-text-subtle">
      <span class="text-sm">Loading…</span>
    </div>

    <!-- Week view -->
    <template v-else-if="view === 'week'">
      <!-- Desktop: 8-column table -->
      <div class="hidden sm:block overflow-x-auto">
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
            <tr
              v-for="(mt, mtIdx) in MEAL_TYPES"
              :key="mt"
              :class="mtIdx % 2 === 1 ? 'bg-surface-alt/40' : ''"
            >
              <td class="py-2 pr-3 text-right align-top border-r border-border">
                <div class="flex items-center justify-end gap-1.5">
                  <span class="h-2 w-2 rounded-full flex-shrink-0" :style="{ backgroundColor: MEAL_COLORS[mt] }" />
                  <span class="text-xs font-medium capitalize text-text-muted">{{ mt }}</span>
                </div>
              </td>
              <td
                v-for="day in weekDays"
                :key="day.iso"
                class="align-top px-1.5 py-2 border border-border transition"
                style="min-width: 120px; max-width: 160px;"
                :class="isDragging ? 'bg-accent/5' : ''"
              >
                <VueDraggable
                  v-model="weekSlots[slotKey(day.iso, mt)]!"
                  group="plan-entries"
                  class="flex flex-col gap-1.5 min-h-[28px]"
                  :class="isDragging ? '[&_a]:pointer-events-none' : ''"
                  :data-date="day.iso"
                  :data-meal-type="mt"
                  @start="onDragStart($event, day.iso, mt)"
                  @end="onDragEnd"
                >
                  <PlanEntryChip
                    v-for="element in weekSlots[slotKey(day.iso, mt)]"
                    :key="element.id"
                    :entry="element"
                    :highlighted="recentlyMovedId === element.id"
                    :freezer-link="getFreezerLink(element)"
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

      <!-- Mobile: stacked day layout -->
      <div class="sm:hidden space-y-3">
        <div
          v-for="day in weekDays"
          :key="day.iso"
          class="rounded-lg border border-border bg-surface overflow-hidden"
        >
          <!-- Day header -->
          <div
            class="flex items-center gap-3 px-4 py-3 border-b border-border"
            :class="day.isToday ? 'bg-accent-soft' : 'bg-surface-alt'"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full font-serif text-lg font-semibold shrink-0"
              :class="day.isToday ? 'bg-accent text-white' : 'text-text'"
            >{{ day.dayNum }}</div>
            <span
              class="text-xs font-medium uppercase tracking-wider"
              :class="day.isToday ? 'text-accent-deep' : 'text-text-muted'"
            >{{ day.label }}</span>
          </div>

          <!-- Meal rows -->
          <div class="divide-y divide-border">
            <div v-for="mt in MEAL_TYPES" :key="mt" class="px-4 py-3">
              <div class="mb-2 flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full shrink-0" :style="{ backgroundColor: MEAL_COLORS[mt] }" />
                <span class="text-xs font-medium capitalize text-text-muted">{{ mt }}</span>
              </div>
              <div class="space-y-1.5">
                <PlanEntryChip
                  v-for="entry in entriesFor(day.iso, mt)"
                  :key="entry.id"
                  :entry="entry"
                  :freezer-link="getFreezerLink(entry)"
                  @delete="deleteEntry(entry.id)"
                  @move="openMove(entry)"
                />
                <button
                  type="button"
                  class="flex h-9 w-full items-center justify-center rounded-lg border border-dashed border-border text-text-subtle hover:border-accent hover:text-accent transition text-sm"
                  @click="openAdd(day.iso, mt)"
                >+ Add</button>
              </div>
            </div>
          </div>
        </div>
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
            <component
              :is="entry.dishId != null ? 'NuxtLink' : 'div'"
              v-for="entry in allEntriesForDay(cell.iso).slice(0, monthPreviewCount)"
              :key="entry.id"
              :to="entry.dishId != null ? `/dishes/${entry.dishId}` : undefined"
              class="block truncate rounded px-1.5 py-0.5 text-xs"
              :class="entry.entryKind === 'leftover'
                ? 'bg-leftover/10 text-leftover'
                : 'bg-surface-alt text-text-muted'"
              :title="entry.dishName ?? entry.oneOffText ?? undefined"
              @click.stop
            >
              <span class="hidden sm:inline">{{ entry.dishName ?? entry.oneOffText }}</span>
              <span class="sm:hidden">{{ (entry.dishName ?? entry.oneOffText ?? '').slice(0, 3) }}</span>
            </component>
            <div
              v-if="allEntriesForDay(cell.iso).length > monthPreviewCount"
              class="text-xs text-text-subtle"
            >+{{ allEntriesForDay(cell.iso).length - monthPreviewCount }} more</div>
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
              :freezer-link="getFreezerLink(entry)"
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
import { weekRelativeLabel, dayRelativeLabel, monthRelativeLabel } from '~/utils/relativeDateLabel'
import type { PlanEntry, MealType } from '#shared/types/planEntry'

interface PlannerFeed {
  hints: { dishId: number; itemCount: number; singleItemId: number | null; singleItemName: string | null }[]
  standaloneHints: { freezerItemId: number; name: string; targetUseDate: string; tossByDate: string; freezerName: string }[]
}

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
const route = useRoute()
const view = ref<View>('week')

// Honor ?week=YYYY-MM-DD from planning finalize redirect
const initialDate = computed(() => {
  const w = route.query.week
  if (typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w)) {
    return startOfDay(parseISO(w))
  }
  return startOfDay(new Date())
})
const anchor = ref(initialDate.value)

// ── Relative date labels ────────────────────────────────────────
// today is a ref updated at midnight so labels stay accurate in long-running sessions
const today = ref(startOfDay(new Date()))
if (import.meta.client) {
  const msUntilMidnight = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
  }
  const scheduleMidnightUpdate = () => {
    setTimeout(() => {
      today.value = startOfDay(new Date())
      scheduleMidnightUpdate()
    }, msUntilMidnight())
  }
  scheduleMidnightUpdate()
}
const weekLabel = computed(() => weekRelativeLabel(weekStart.value, today.value))
const dayLabel = computed(() => dayRelativeLabel(anchor.value, today.value))
const monthLabel = computed(() => monthRelativeLabel(anchor.value, today.value))

// Reduce month-cell previews to 1 on narrow screens
const monthPreviewCount = ref(3)
if (import.meta.client) {
  const mq = window.matchMedia('(max-width: 639px)')
  monthPreviewCount.value = mq.matches ? 1 : 3
  mq.addEventListener('change', e => { monthPreviewCount.value = e.matches ? 1 : 3 })
}

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

const { data: plannerFeed } = useQuery({
  queryKey: computed(() => queryKeys.freezerPlannerFeed.all()),
  queryFn: () => $fetch<PlannerFeed>('/api/freezer/planner-feed'),
  staleTime: 60_000,
})

const freezerHintsByDishId = computed(() => {
  const map = new Map<number, PlannerFeed['hints'][number]>()
  for (const h of plannerFeed.value?.hints ?? []) map.set(h.dishId, h)
  return map
})

function getFreezerLink(entry: PlanEntry) {
  if (entry.dishId != null) {
    const hint = freezerHintsByDishId.value.get(entry.dishId)
    if (hint) return hint
  }
  if (entry.freezerItemId != null) {
    return { itemCount: 1, singleItemId: entry.freezerItemId, singleItemName: entry.oneOffText }
  }
  return undefined
}

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
// Cast via unknown since reactive({}) doesn't structurally overlap Record<SlotKey, PlanEntry[]>.
// SlotKey is a template literal type, so noUncheckedIndexedAccess still treats indexed
// access as PlanEntry[] | undefined; call sites assert non-null (`!`) because
// syncWeekSlots runs immediately on mount and populates every slot before it's read.
const weekSlots = reactive({}) as unknown as Record<SlotKey, PlanEntry[]>

function syncWeekSlots() {
  for (const day of weekDays.value) {
    for (const mt of MEAL_TYPES) {
      const key = slotKey(day.iso, mt)
      const fresh = entriesFor(day.iso, mt)
      const slot = weekSlots[key]
      if (!slot) {
        weekSlots[key] = [...fresh]
      } else {
        slot.splice(0, slot.length, ...fresh)
      }
    }
  }
}

watch(entries, syncWeekSlots, { immediate: true })
watch(weekDays, syncWeekSlots)

// Track which entry is being dragged so @end can identify it by ID.
let draggedEntryId: number | null = null
const isDragging = ref(false)
const recentlyMovedId = ref<number | null>(null)

function onDragStart(
  evt: { oldIndex?: number },
  fromDate: string,
  fromMt: MealType,
) {
  isDragging.value = true
  const sourceList = weekSlots[slotKey(fromDate, fromMt)]!
  draggedEntryId = sourceList[evt.oldIndex ?? 0]?.id ?? null
}

async function onDragEnd(evt: { to: HTMLElement; from: HTMLElement }) {
  isDragging.value = false
  const id = draggedEntryId
  draggedEntryId = null
  if (!id) return

  const toDate = evt.to.dataset.date
  const toMt = evt.to.dataset.mealType as MealType | undefined
  const fromDate = evt.from.dataset.date
  const fromMt = evt.from.dataset.mealType

  if (!toDate || !toMt) return
  if (toDate === fromDate && toMt === fromMt) return

  await $fetch<unknown>(`/api/plan-entries/${id}`, {
    method: 'PATCH',
    body: { date: toDate, mealType: toMt },
  })
  queryClient.invalidateQueries({ queryKey: queryKeys.planEntries.all() })

  recentlyMovedId.value = id
  setTimeout(() => { recentlyMovedId.value = null }, 800)
}

// ── Delete ───────────────────────────────────────────────────────
const { mutate: deleteEntry } = useMutation({
  mutationFn: (id: number) => $fetch<unknown>(`/api/plan-entries/${id}`, { method: 'DELETE' }),
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

// ── Jump to date ─────────────────────────────────────────────────
const jumpDateValue = computed(() => format(anchor.value, 'yyyy-MM-dd'))

function onJumpDate(event: Event) {
  const val = (event.target as HTMLInputElement).value
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    anchor.value = startOfDay(parseISO(val))
  }
}

// ── Keyboard shortcuts ───────────────────────────────────────────
if (import.meta.client) {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'ArrowLeft') { navigate(-1); e.preventDefault() }
    else if (e.key === 'ArrowRight') { navigate(1); e.preventDefault() }
    else if (e.key === 't') goToday()
    else if (e.key === '1') view.value = 'week'
    else if (e.key === '2') view.value = 'month'
    else if (e.key === '3') view.value = 'day'
  })
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
