<template>
  <div class="max-w-xl">
    <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Step 1</p>
    <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-text mb-8">
      When &amp; <em class="font-normal italic text-accent-deep">what</em>
    </h2>

    <!-- Week picker -->
    <section class="mb-8">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-alt transition text-text-muted text-lg"
          @click="stepWeek(-1)"
        >
          ‹
        </button>

        <div class="flex-1 rounded-lg border border-border bg-surface px-4 pt-3 pb-4">
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted text-center mb-1">Week of</p>
          <p class="font-serif text-2xl font-semibold text-text text-center leading-tight">
            {{ weekRangeLabel }}<em class="font-normal italic text-accent-deep text-lg"> — {{ weekHint }}</em>
          </p>
          <hr class="my-3 border-dashed border-border" />
          <div class="grid grid-cols-7">
            <div
              v-for="day in weekDays"
              :key="day.iso"
              class="text-center"
            >
              <p class="text-xs font-medium uppercase text-text-muted">{{ day.label }}</p>
              <p class="text-sm text-text">{{ day.date }}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-alt transition text-text-muted text-lg"
          @click="stepWeek(1)"
        >
          ›
        </button>
      </div>
    </section>

    <!-- Meal types -->
    <section class="mb-8">
      <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Meal types to plan</p>
      <p class="text-sm text-text-muted mb-3">At least one required. Dinner is on by default.</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="type in mealTypeOptions"
          :key="type.value"
          type="button"
          class="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition"
          :class="mealTypes.includes(type.value)
            ? 'border-transparent bg-accent text-white'
            : 'border-border bg-surface text-text-muted hover:bg-surface-alt'"
          @click="toggleMealType(type.value)"
        >
          <span
            class="inline-block h-2 w-2 rounded-full"
            :style="{ backgroundColor: type.color }"
          />
          {{ type.label }}
        </button>
      </div>
      <p v-if="mealTypes.length === 0" class="mt-2 text-xs text-warning">Select at least one meal type.</p>
    </section>

    <!-- Info banner -->
    <div class="rounded-lg border border-border bg-surface-alt px-4 py-3 text-sm text-text-muted" v-html="slotBanner" />
  </div>
</template>

<script setup lang="ts">
import { format, parseISO, addDays, startOfWeek, differenceInCalendarWeeks } from 'date-fns'
import type { PlanningSession, MealType } from '#shared/types/planningSession'

const props = defineProps<{ session: PlanningSession }>()
const emit = defineEmits<{
  update: [patch: Partial<PlanningSession>]
}>()

const mealTypeOptions = [
  { value: 'breakfast' as MealType, label: 'Breakfast', color: '#C9A24A' },
  { value: 'lunch' as MealType, label: 'Lunch', color: '#6B8E5A' },
  { value: 'dinner' as MealType, label: 'Dinner', color: '#C76A52' },
]

const currentWeekStart = ref(props.session.weekStart)
const mealTypes = ref<MealType[]>([...props.session.mealTypes])

watch([currentWeekStart, mealTypes], ([ws, mt]) => {
  emit('update', { weekStart: ws, mealTypes: [...mt] })
}, { deep: true })

function stepWeek(dir: -1 | 1) {
  const d = parseISO(currentWeekStart.value)
  d.setDate(d.getDate() + dir * 7)
  currentWeekStart.value = format(d, 'yyyy-MM-dd')
}

function toggleMealType(type: MealType) {
  const idx = mealTypes.value.indexOf(type)
  if (idx === -1) {
    mealTypes.value.push(type)
  }
  else if (mealTypes.value.length > 1) {
    mealTypes.value.splice(idx, 1)
  }
}

const weekStart = computed(() => parseISO(currentWeekStart.value))
const weekEnd = computed(() => addDays(weekStart.value, 6))

const weekRangeLabel = computed(() => {
  const s = weekStart.value
  const e = weekEnd.value
  if (s.getMonth() === e.getMonth()) {
    return `${format(s, 'MMM d')} – ${format(e, 'd')}`
  }
  return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
})

const weekHint = computed(() => {
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const diff = differenceInCalendarWeeks(weekStart.value, thisMonday, { weekStartsOn: 1 })
  if (diff === 0) return 'this week'
  if (diff === 1) return 'next week'
  if (diff === -1) return 'last week'
  if (diff > 1) return `in ${diff} weeks`
  return `${Math.abs(diff)} weeks ago`
})

const weekDays = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart.value, i)
    return {
      iso: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE'),
      date: format(d, 'd'),
    }
  })
})

const slotBanner = computed(() => {
  const count = mealTypes.value.length * 7
  if (count === 7) return `That's 7 slots over seven days — <em>one meal per day.</em>`
  if (count === 14) return `That's 14 slots over seven days — <em>two meals a day.</em>`
  if (count === 21) return `That's 21 slots over seven days — <em>a typical week.</em>`
  return `That's ${count} slot${count !== 1 ? 's' : ''} over seven days.`
})
</script>
