<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4 items-end"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-text/20 backdrop-blur-sm" @click="$emit('close')" />

      <div class="relative w-full sm:max-w-md sm:rounded-xl rounded-t-xl border border-border bg-surface shadow-lg">
        <!-- Header -->
        <div class="border-b border-border px-6 py-4">
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Calendar</p>
          <h2 class="font-serif text-2xl font-semibold text-text">
            Add to <em class="font-normal italic text-accent-deep">{{ formattedDate }}</em>
          </h2>
        </div>

        <div class="px-6 py-5 space-y-4">
          <!-- Meal type -->
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Meal</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="mt in MEAL_TYPES"
                :key="mt"
                type="button"
                class="rounded-full border px-4 py-1.5 text-sm capitalize transition"
                :class="localMealType === mt
                  ? 'border-accent bg-accent-soft text-accent-deep font-medium'
                  : 'border-border text-text-muted hover:bg-surface-alt'"
                @click="localMealType = mt"
              >{{ mt }}</button>
            </div>
          </div>

          <!-- Kind toggle -->
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Type</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full border px-4 py-1.5 text-sm transition"
                :class="mode === 'dish'
                  ? 'border-accent bg-accent-soft text-accent-deep font-medium'
                  : 'border-border text-text-muted hover:bg-surface-alt'"
                @click="mode = 'dish'"
              >Dish</button>
              <button
                type="button"
                class="rounded-full border px-4 py-1.5 text-sm transition"
                :class="mode === 'one-off'
                  ? 'border-accent bg-accent-soft text-accent-deep font-medium'
                  : 'border-border text-text-muted hover:bg-surface-alt'"
                @click="mode = 'one-off'"
              >One-off</button>
            </div>
          </div>

          <!-- Dish mode -->
          <template v-if="mode === 'dish'">
            <!-- Dish search -->
            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Dish</p>
              <input
                v-model="dishSearch"
                type="text"
                placeholder="Search dishes…"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
              <div v-if="dishSearch && !selectedDish" class="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-sm">
                <div v-if="dishesLoading" class="px-3 py-2 text-sm text-text-subtle">Searching…</div>
                <div v-else-if="!dishResults?.length" class="px-3 py-2 text-sm text-text-subtle">No dishes found.</div>
                <button
                  v-for="d in dishResults"
                  :key="d.id"
                  type="button"
                  class="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-alt transition"
                  @click="selectDish(d)"
                >{{ d.name }}</button>
              </div>
              <div
                v-if="selectedDish"
                class="mt-2 flex items-center justify-between rounded-lg border border-accent bg-accent-soft px-3 py-2"
              >
                <span class="text-sm font-medium text-accent-deep">{{ selectedDish.name }}</span>
                <button type="button" class="text-xs text-text-muted hover:text-text" @click="clearDish">× change</button>
              </div>
            </div>

            <!-- Leftover toggle -->
            <label class="flex cursor-pointer items-center gap-3">
              <div
                class="relative h-5 w-9 rounded-full transition"
                :class="isLeftover ? 'bg-leftover' : 'bg-border'"
              >
                <div
                  class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                  :class="isLeftover ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </div>
              <span class="text-sm text-text-muted">This is a leftover serving</span>
            </label>

            <!-- Guest count (only for fresh) -->
            <div v-if="!isLeftover">
              <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Extra guests</p>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt transition"
                  @click="guestCount = Math.max(0, guestCount - 1)"
                >−</button>
                <span class="w-6 text-center text-sm font-medium text-text">{{ guestCount }}</span>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt transition"
                  @click="guestCount++"
                >+</button>
                <span class="text-xs text-text-subtle">beyond household</span>
              </div>
            </div>
          </template>

          <!-- One-off mode -->
          <template v-else>
            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Description</p>
              <input
                v-model="oneOffText"
                type="text"
                placeholder="e.g. Dinner at Mom's, Pizza night…"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            class="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text hover:bg-surface-alt transition"
            @click="$emit('close')"
          >Cancel</button>
          <button
            type="button"
            class="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
            :disabled="!canSubmit || submitting"
            @click="submit"
          >{{ submitting ? 'Adding…' : 'Add to plan' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { format, parseISO } from 'date-fns'
import type { Dish } from '#shared/types/dish'
import type { MealType, PlanEntry } from '#shared/types/planEntry'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'uncategorized']

const props = defineProps<{
  show: boolean
  date: string
  mealType: MealType
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const queryClient = useQueryClient()

const mode = ref<'dish' | 'one-off'>('dish')
const localMealType = ref<MealType>(props.mealType)
const dishSearch = ref('')
const debouncedSearch = refDebounced(dishSearch, 250)
const selectedDish = ref<Pick<Dish, 'id' | 'name'> | null>(null)
const isLeftover = ref(false)
const guestCount = ref(0)
const oneOffText = ref('')
const submitting = ref(false)

const formattedDate = computed(() => {
  try {
    return format(parseISO(props.date), 'MMM d')
  }
  catch {
    return props.date
  }
})

watch(() => props.mealType, (v) => { localMealType.value = v })
watch(() => props.show, (v) => {
  if (v) {
    mode.value = 'dish'
    localMealType.value = props.mealType
    dishSearch.value = ''
    selectedDish.value = null
    isLeftover.value = false
    guestCount.value = 0
    oneOffText.value = ''
  }
})

const { data: dishResults, isPending: dishesLoading } = useQuery({
  queryKey: computed(() => queryKeys.dishes.list({ search: debouncedSearch.value })),
  queryFn: () =>
    $fetch<Dish[]>(`/api/dishes?search=${encodeURIComponent(debouncedSearch.value)}`),
  enabled: computed(() => debouncedSearch.value.length > 0 && !selectedDish.value),
})

function selectDish(d: Pick<Dish, 'id' | 'name'>) {
  selectedDish.value = d
  dishSearch.value = ''
}

function clearDish() {
  selectedDish.value = null
  dishSearch.value = ''
}

const canSubmit = computed(() => {
  if (mode.value === 'dish') return selectedDish.value != null
  return oneOffText.value.trim().length > 0
})

const { mutateAsync } = useMutation({
  mutationFn: (body: Record<string, unknown>) =>
    $fetch<PlanEntry>('/api/plan-entries', { method: 'POST', body }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.planEntries.all() })
  },
})

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const base = { date: props.date, mealType: localMealType.value }
    if (mode.value === 'one-off') {
      await mutateAsync({ ...base, entryKind: 'one-off', oneOffText: oneOffText.value.trim(), dishId: null })
    }
    else {
      await mutateAsync({
        ...base,
        entryKind: isLeftover.value ? 'leftover' : 'fresh',
        dishId: selectedDish.value!.id,
        oneOffText: null,
        guestCount: isLeftover.value ? 0 : guestCount.value,
      })
    }
    emit('created')
    emit('close')
  }
  finally {
    submitting.value = false
  }
}
</script>
