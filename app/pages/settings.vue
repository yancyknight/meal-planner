<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Configuration</p>
      <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
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

      <!-- Allergen visibility -->
      <div class="rounded-lg border border-border bg-surface p-6">
        <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Display</p>
        <h2 class="mb-4 font-serif text-xl font-semibold text-text">
          Allergen <em class="font-normal italic text-accent-deep">labels</em>
        </h2>
        <p class="mb-4 text-sm text-text-muted">
          Show allergen badges on dish cards and detail pages.
        </p>
        <label class="flex cursor-pointer items-center gap-3 select-none">
          <button
            type="button"
            role="switch"
            :aria-checked="form.showAllergens"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
            :class="form.showAllergens ? 'bg-accent' : 'bg-border'"
            @click="form.showAllergens = !form.showAllergens"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="form.showAllergens ? 'translate-x-4' : 'translate-x-0'"
            />
          </button>
          <span class="text-sm text-text">Show allergens</span>
        </label>
      </div>

      <!-- Database backups -->
      <div class="rounded-lg border border-border bg-surface p-6">
        <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Database</p>
        <h2 class="mb-4 font-serif text-xl font-semibold text-text">
          Automatic <em class="font-normal italic text-accent-deep">backups</em>
        </h2>
        <p class="mb-5 text-sm text-text-muted">
          Hot backups of the database are written to <code class="rounded bg-surface-alt px-1 py-0.5 text-xs font-mono">{{ backupDir }}</code> on the configured interval.
        </p>

        <div class="mb-5 space-y-4">
          <div class="flex items-center gap-3">
            <label class="w-32 shrink-0 text-sm text-text-muted">Interval</label>
            <input
              v-model.number="form.backupIntervalHours"
              type="number"
              min="1"
              class="w-20 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <span class="text-sm text-text-muted">hours</span>
          </div>
          <div class="flex items-center gap-3">
            <label class="w-32 shrink-0 text-sm text-text-muted">Keep</label>
            <input
              v-model.number="form.backupRetainCount"
              type="number"
              min="1"
              class="w-20 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <span class="text-sm text-text-muted">backups</span>
          </div>
        </div>

        <!-- Status -->
        <div class="rounded-lg border border-border/60 bg-surface-alt px-4 py-3 text-sm space-y-1.5">
          <template v-if="backupStatusPending">
            <div class="h-4 w-48 animate-pulse rounded bg-border" />
          </template>
          <template v-else-if="backupStatus">
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Last backup</span>
              <span class="text-text font-medium tabular-nums">{{ formatBackupTime(backupStatus.lastBackup) }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Next backup</span>
              <span class="text-text font-medium tabular-nums">{{ formatBackupTime(backupStatus.nextBackup) }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-text-muted">Files retained</span>
              <span class="text-text font-medium tabular-nums">{{ backupStatus.backupCount }}</span>
            </div>
          </template>
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

const backupDir = process.env.BACKUP_DIR ?? '/data/backups'

const { data: settings, isPending } = useQuery({
  queryKey: computed(() => queryKeys.settings.all()),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
})

const { data: backupStatus, isPending: backupStatusPending } = useQuery({
  queryKey: computed(() => queryKeys.backups.status()),
  queryFn: () => $fetch<{ lastBackup: string | null, nextBackup: string | null, backupCount: number }>('/api/backups/status'),
})

const form = reactive({
  householdSize: 3,
  showAllergens: false,
  backupIntervalHours: 24,
  backupRetainCount: 7,
})
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

watch(settings, (s) => {
  if (s) {
    form.householdSize = s.householdSize
    form.showAllergens = s.showAllergens
    form.backupIntervalHours = s.backupIntervalHours
    form.backupRetainCount = s.backupRetainCount
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!settings.value) return false
  return form.householdSize !== settings.value.householdSize
    || form.showAllergens !== settings.value.showAllergens
    || form.backupIntervalHours !== settings.value.backupIntervalHours
    || form.backupRetainCount !== settings.value.backupRetainCount
})

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
    await mutateAsync({
      householdSize: form.householdSize,
      showAllergens: form.showAllergens,
      backupIntervalHours: form.backupIntervalHours,
      backupRetainCount: form.backupRetainCount,
    })
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

function formatBackupTime(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>
