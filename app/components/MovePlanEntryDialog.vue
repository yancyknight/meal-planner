<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4 items-end bg-black/40"
        @click.self="$emit('close')"
      >
        <div class="w-full sm:max-w-sm sm:rounded-xl rounded-t-xl border border-border bg-surface shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 class="font-serif text-lg font-semibold text-text">Move entry</h2>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded text-text-muted hover:text-text transition"
              @click="$emit('close')"
            >×</button>
          </div>

          <div class="space-y-5 px-5 py-5">
            <!-- Date -->
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Date</label>
              <input
                v-model="form.date"
                type="date"
                class="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
            </div>

            <!-- Meal type -->
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Meal</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="mt in MEAL_TYPES"
                  :key="mt"
                  type="button"
                  class="rounded-lg border px-3 py-2 text-sm capitalize transition"
                  :class="form.mealType === mt
                    ? 'border-accent bg-accent-soft text-accent-deep font-medium'
                    : 'border-border text-text-muted hover:border-accent hover:text-text'"
                  @click="form.mealType = mt"
                >{{ mt }}</button>
              </div>
            </div>

            <!-- Error -->
            <p v-if="error" class="text-sm text-warning">{{ error }}</p>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 border-t border-border px-5 py-4">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-alt transition"
              @click="$emit('close')"
            >Cancel</button>
            <button
              type="button"
              class="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
              :disabled="saving || !form.date"
              @click="submit"
            >{{ saving ? 'Moving…' : 'Move' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { PlanEntry, MealType } from '#shared/types/planEntry'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'uncategorized']

const props = defineProps<{
  show: boolean
  entry: PlanEntry | null
}>()

const emit = defineEmits<{ close: [], moved: [] }>()

const queryClient = useQueryClient()

const form = reactive<{ date: string; mealType: MealType }>({
  date: '',
  mealType: 'dinner',
})

const saving = ref(false)
const error = ref('')

watch(() => props.entry, (e) => {
  if (e) {
    form.date = e.date
    form.mealType = e.mealType
  }
}, { immediate: true })

watch(() => props.show, (v) => {
  if (v && props.entry) {
    form.date = props.entry.date
    form.mealType = props.entry.mealType
    error.value = ''
  }
})

const { mutateAsync } = useMutation({
  mutationFn: (body: { date: string; mealType: MealType }) =>
    $fetch<PlanEntry>(`/api/plan-entries/${props.entry!.id}`, { method: 'PATCH', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.planEntries.all() }),
})

async function submit() {
  if (!props.entry || !form.date) return
  saving.value = true
  error.value = ''
  try {
    await mutateAsync({ date: form.date, mealType: form.mealType })
    emit('moved')
    emit('close')
  }
  catch {
    error.value = 'Failed to move entry. Please try again.'
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
