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

      <!-- Freezer -->
      <div class="rounded-lg border border-border bg-surface p-6">
        <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Freezer</p>
        <h2 class="mb-4 font-serif text-xl font-semibold text-text">
          Freezer <em class="font-normal italic text-accent-deep">settings</em>
        </h2>

        <!-- Approaching window -->
        <div class="mb-6 flex items-center gap-3">
          <label class="w-44 shrink-0 text-sm text-text-muted">Approaching window</label>
          <input
            v-model.number="form.freezerApproachingWindowDays"
            type="number"
            min="1"
            class="w-20 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span class="text-sm text-text-muted">days before toss-by</span>
        </div>

        <!-- Freezers list -->
        <div class="mb-6">
          <p class="mb-3 text-sm font-medium text-text">Freezers</p>
          <div
            v-if="freezersPending"
            class="h-10 animate-pulse rounded-lg bg-surface-alt"
          />
          <div v-else class="space-y-2">
            <div
              v-for="f in (freezers as Freezer[])"
              :key="f.id"
              class="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2"
            >
              <input
                v-if="renamingFreezerId === f.id"
                v-model="renameValue"
                type="text"
                class="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                @keydown.enter="saveRename(f.id)"
                @keydown.escape="renamingFreezerId = null"
              />
              <span v-else class="flex-1 text-sm text-text">{{ f.name }}</span>
              <button
                v-if="renamingFreezerId === f.id"
                type="button"
                class="text-xs text-accent underline"
                @click="saveRename(f.id)"
              >Save</button>
              <button
                v-else
                type="button"
                class="text-xs text-text-muted underline hover:text-text"
                @click="startRename(f)"
              >Rename</button>
              <button
                type="button"
                class="text-xs text-text-muted underline hover:text-warning"
                @click="deleteFreezerConfirm(f.id)"
              >Delete</button>
            </div>

            <!-- Add freezer -->
            <form class="flex gap-2" @submit.prevent="addFreezer">
              <input
                v-model="newFreezerName"
                type="text"
                class="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="New freezer name…"
              />
              <button
                type="submit"
                :disabled="!newFreezerName.trim()"
                class="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:bg-surface-alt disabled:opacity-50"
              >Add</button>
            </form>
            <p v-if="freezerError" class="text-xs text-warning">{{ freezerError }}</p>
          </div>
        </div>

        <!-- Categories -->
        <div>
          <p class="mb-3 text-sm font-medium text-text">Categories</p>
          <div
            v-if="categoriesPending"
            class="h-10 animate-pulse rounded-lg bg-surface-alt"
          />
          <div v-else class="space-y-2">
            <div
              v-for="cat in (categories as FreezerCategory[])"
              :key="cat.id"
              class="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2"
            >
              <span class="flex-1 text-sm text-text">{{ cat.name }}</span>
              <input
                v-model.number="editingLifetimes[cat.id]"
                type="number"
                min="1"
                class="w-16 rounded border border-border bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                @change="saveCategoryLifetime(cat.id)"
              />
              <span class="text-xs text-text-muted">d</span>
              <button
                type="button"
                class="text-xs text-text-muted underline hover:text-warning"
                @click="deleteCategoryConfirm(cat.id)"
              >Delete</button>
            </div>

            <!-- Add category -->
            <form class="flex gap-2" @submit.prevent="addCategory">
              <input
                v-model="newCategoryName"
                type="text"
                class="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Category name…"
              />
              <input
                v-model.number="newCategoryLifetime"
                type="number"
                min="1"
                class="w-16 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="days"
              />
              <button
                type="submit"
                :disabled="!newCategoryName.trim() || !newCategoryLifetime"
                class="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:bg-surface-alt disabled:opacity-50"
              >Add</button>
            </form>
            <p v-if="categoryError" class="text-xs text-warning">{{ categoryError }}</p>
          </div>
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
import type { Freezer, FreezerCategory } from '#shared/types/freezer'

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

const { data: freezers, pending: freezersPending, refresh: refreshFreezers } = useFetch<Freezer[]>('/api/freezers', { key: 'freezers' })
const { data: categories, pending: categoriesPending, refresh: refreshCategories } = useFetch<FreezerCategory[]>('/api/freezer-categories', { key: 'freezer-categories' })

const form = reactive({
  householdSize: 3,
  showAllergens: false,
  backupIntervalHours: 24,
  backupRetainCount: 7,
  freezerApproachingWindowDays: 14,
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
    form.freezerApproachingWindowDays = s.freezerApproachingWindowDays
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!settings.value) return false
  return form.householdSize !== settings.value.householdSize
    || form.showAllergens !== settings.value.showAllergens
    || form.backupIntervalHours !== settings.value.backupIntervalHours
    || form.backupRetainCount !== settings.value.backupRetainCount
    || form.freezerApproachingWindowDays !== settings.value.freezerApproachingWindowDays
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
      freezerApproachingWindowDays: form.freezerApproachingWindowDays,
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

// --- Freezer management ---
const newFreezerName = ref('')
const freezerError = ref('')
const renamingFreezerId = ref<number | null>(null)
const renameValue = ref('')

async function addFreezer() {
  if (!newFreezerName.value.trim()) return
  freezerError.value = ''
  try {
    await $fetch('/api/freezers', { method: 'POST', body: { name: newFreezerName.value.trim() } })
    newFreezerName.value = ''
    refreshFreezers()
  }
  catch {
    freezerError.value = 'Failed to add freezer.'
  }
}

function startRename(f: Freezer) {
  renamingFreezerId.value = f.id
  renameValue.value = f.name
}

async function saveRename(id: number) {
  if (!renameValue.value.trim()) return
  await $fetch(`/api/freezers/${id}`, { method: 'PATCH', body: { name: renameValue.value.trim() } })
  renamingFreezerId.value = null
  refreshFreezers()
}

async function deleteFreezerConfirm(id: number) {
  freezerError.value = ''
  try {
    await $fetch(`/api/freezers/${id}`, { method: 'DELETE' })
    refreshFreezers()
  }
  catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    freezerError.value = msg ?? 'Cannot delete freezer. Move all items first.'
  }
}

// --- Category management ---
const newCategoryName = ref('')
const newCategoryLifetime = ref<number | null>(null)
const categoryError = ref('')

const editingLifetimes = computed(() => {
  const map: Record<number, number> = {}
  for (const cat of (categories.value as FreezerCategory[] ?? [])) {
    map[cat.id] = cat.defaultLifetimeDays
  }
  return map
})

async function saveCategoryLifetime(id: number) {
  const val = editingLifetimes.value[id]
  if (!val || val < 1) return
  await $fetch(`/api/freezer-categories/${id}`, { method: 'PATCH', body: { defaultLifetimeDays: val } })
  refreshCategories()
}

async function addCategory() {
  if (!newCategoryName.value.trim() || !newCategoryLifetime.value) return
  categoryError.value = ''
  try {
    await $fetch('/api/freezer-categories', {
      method: 'POST',
      body: { name: newCategoryName.value.trim(), defaultLifetimeDays: newCategoryLifetime.value },
    })
    newCategoryName.value = ''
    newCategoryLifetime.value = null
    refreshCategories()
  }
  catch {
    categoryError.value = 'Failed to add category.'
  }
}

async function deleteCategoryConfirm(id: number) {
  categoryError.value = ''
  try {
    await $fetch(`/api/freezer-categories/${id}`, { method: 'DELETE' })
    refreshCategories()
  }
  catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    categoryError.value = msg ?? 'Cannot delete category. Move all items first.'
  }
}
</script>
