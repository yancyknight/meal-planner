<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Configuration</p>
      <h1 class="font-serif text-4xl font-semibold text-text">
        App <em class="font-normal italic text-accent-deep">settings</em>
      </h1>
    </div>

    <div v-if="isPending" class="space-y-4">
      <div class="h-20 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <div v-else class="max-w-lg space-y-6">
      <!-- Household size -->
      <div class="rounded-lg border border-border bg-surface p-6">
        <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Household</p>
        <h2 class="mb-4 font-serif text-xl font-semibold text-text">
          Household <em class="font-normal italic text-accent-deep">size</em>
        </h2>
        <p class="mb-4 text-sm text-text-muted">
          Used to calculate whether a dish will produce leftovers after a meal.
        </p>
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt transition"
            @click="form.householdSize = Math.max(1, form.householdSize - 1)"
          >−</button>
          <span class="font-serif text-4xl font-semibold text-text w-12 text-center">{{ form.householdSize }}</span>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt transition"
            @click="form.householdSize++"
          >+</button>
          <span class="text-sm text-text-muted">people</span>
        </div>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
          :disabled="saving || !isDirty"
          @click="save"
        >{{ saving ? 'Saving…' : 'Save settings' }}</button>
        <span v-if="saved" class="text-sm text-text-muted">✓ Saved</span>
        <span v-if="saveError" class="text-sm text-warning">{{ saveError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { AppSettings } from '#shared/types/settings'

const queryClient = useQueryClient()

const { data: settings, isPending } = useQuery({
  queryKey: computed(() => queryKeys.settings.all()),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
})

const form = reactive({ householdSize: 3 })
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

watch(settings, (s) => {
  if (s) {
    form.householdSize = s.householdSize
  }
}, { immediate: true })

const isDirty = computed(() =>
  settings.value ? form.householdSize !== settings.value.householdSize : false,
)

const { mutateAsync } = useMutation({
  mutationFn: (body: Partial<AppSettings>) =>
    $fetch<AppSettings>('/api/settings', { method: 'PATCH', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() }),
})

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    await mutateAsync({ householdSize: form.householdSize })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  }
  catch {
    saveError.value = 'Failed to save. Please try again.'
  }
  finally {
    saving.value = false
  }
}
</script>
