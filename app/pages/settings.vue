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

    <div v-else class="space-y-6">
      <!-- Household size -->
      <div class="rounded-xl border border-border bg-surface overflow-hidden">
        <div class="border-b border-border px-7 py-5">
          <h2 class="font-serif text-2xl font-medium leading-none text-text">
            Household <em class="font-normal italic text-accent-deep">size</em>
          </h2>
          <p class="mt-1.5 font-serif italic text-sm text-text-muted">
            Used to calculate whether a dish will produce leftovers after a meal.
          </p>
        </div>
        <div class="px-7 py-5">
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
      </div>

      <!-- Allergen visibility -->
      <div class="rounded-xl border border-border bg-surface overflow-hidden">
        <div class="border-b border-border px-7 py-5">
          <h2 class="font-serif text-2xl font-medium leading-none text-text">
            Allergen <em class="font-normal italic text-accent-deep">labels</em>
          </h2>
          <p class="mt-1.5 font-serif italic text-sm text-text-muted">
            Show allergen badges on dish cards and detail pages.
          </p>
        </div>
        <div class="px-7 py-5">
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
      </div>

      <!-- Database backups -->
      <div class="rounded-xl border border-border bg-surface overflow-hidden">
        <div class="border-b border-border px-7 py-5">
          <h2 class="font-serif text-2xl font-medium leading-none text-text">
            Automatic <em class="font-normal italic text-accent-deep">backups</em>
          </h2>
          <p class="mt-1.5 font-serif italic text-sm text-text-muted">
            Hot backups written to <code class="not-italic rounded bg-surface-alt px-1 py-0.5 text-xs font-mono">{{ backupDir }}</code> on the configured interval.
          </p>
        </div>
        <div class="px-7 py-5">
          <div class="mb-5 space-y-4">
            <div class="flex items-center gap-3">
              <label class="w-32 shrink-0 text-sm text-text-muted">Interval</label>
              <input
                v-model.number="form.backupIntervalHours"
                type="number"
                min="1"
                class="w-20 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
              <span class="text-sm text-text-muted">hours</span>
            </div>
            <div class="flex items-center gap-3">
              <label class="w-32 shrink-0 text-sm text-text-muted">Keep</label>
              <input
                v-model.number="form.backupRetainCount"
                type="number"
                min="1"
                class="w-20 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
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
      </div>

      <!-- Freezer -->
      <div class="rounded-xl border border-border bg-surface overflow-hidden">
        <!-- Card header -->
        <div class="flex items-end justify-between border-b border-border px-7 py-5">
          <div>
            <h2 class="font-serif text-2xl font-medium leading-none text-text">
              <span class="text-frost-ink">❄</span>&nbsp;<em class="font-normal italic text-accent-deep">Freezer</em>
            </h2>
            <p class="mt-1.5 font-serif italic text-sm text-text-muted">Toss-by windows, categories, push notifications.</p>
          </div>
          <div v-if="!freezersPending" class="text-xs font-medium uppercase tracking-widest text-text-muted">
            {{ (freezers as Freezer[])?.length ?? 0 }} freezers · {{ totalActiveItems }} items
          </div>
        </div>

        <!-- Freezers section -->
        <div class="border-t border-dashed border-border px-7 py-5">
          <p class="mb-3.5 text-xs font-medium uppercase tracking-widest text-text-muted">Freezers</p>
          <div v-if="freezersPending" class="h-20 animate-pulse rounded-lg bg-surface-alt" />
          <div v-else class="rounded-lg border border-border bg-surface-alt overflow-hidden">
            <div
              v-for="f in (freezers as Freezer[])"
              :key="f.id"
              class="border-t border-border first:border-0 flex flex-col gap-1.5 px-5 py-4"
            >
              <div class="flex items-center justify-between gap-4">
                <template v-if="renamingFreezerId === f.id">
                  <div class="flex flex-1 items-center gap-2">
                    <input
                      v-model="renameValue"
                      type="text"
                      class="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      @keydown.enter="saveRename(f.id)"
                      @keydown.escape="renamingFreezerId = null"
                    >
                    <button type="button" class="text-xs text-accent underline" @click="saveRename(f.id)">Save</button>
                    <button type="button" class="text-xs text-text-muted underline" @click="renamingFreezerId = null">Cancel</button>
                  </div>
                </template>
                <template v-else>
                  <div class="font-serif text-lg font-medium leading-none text-text">
                    <span class="text-frost-ink">❄</span> {{ f.name }}
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      class="rounded border border-border bg-surface px-2.5 py-1 text-xs text-text-muted transition hover:bg-surface-alt"
                      @click="startRename(f)"
                    >Rename</button>
                    <button
                      type="button"
                      class="flex h-7 w-7 items-center justify-center rounded-full text-base text-text-muted transition hover:bg-expired-soft hover:text-expired-ink"
                      @click="deleteFreezerConfirm(f.id)"
                    >×</button>
                  </div>
                </template>
              </div>
              <div class="flex items-center gap-2 text-sm text-text-muted">
                <span><b class="font-medium text-text-muted">{{ f.activeItemCount ?? 0 }}</b> active items</span>
                <span class="inline-block h-1 w-1 rounded-full bg-border" />
                <span>{{ formatAudited(f.lastAuditedAt) }}</span>
              </div>
            </div>
            <!-- Add freezer -->
            <form
              class="flex items-center gap-3 border-t border-dashed border-border px-5 py-3.5"
              @submit.prevent="addFreezer"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs text-text-muted">+</span>
              <input
                v-model="newFreezerName"
                type="text"
                class="flex-1 bg-transparent text-sm text-text placeholder:italic placeholder:text-text-muted focus:outline-none"
                placeholder="Add a freezer…"
              >
              <button
                type="submit"
                :disabled="!newFreezerName.trim()"
                class="rounded border border-border bg-surface px-3 py-1 text-xs text-text-muted transition hover:bg-surface-alt disabled:opacity-40"
              >Add</button>
            </form>
            <p v-if="freezerError" class="px-5 pb-2 text-xs text-warning">{{ freezerError }}</p>
          </div>
        </div>

        <!-- General section -->
        <div class="border-t border-dashed border-border px-7 py-5">
          <p class="mb-3.5 text-xs font-medium uppercase tracking-widest text-text-muted">General</p>
          <div class="flex items-center justify-between gap-6 py-2">
            <div>
              <p class="text-sm text-text">Approaching toss-by window</p>
              <p class="mt-0.5 text-xs text-text-muted">Items within this many days show up under Approaching on the dashboard.</p>
            </div>
            <div class="flex shrink-0 items-center overflow-hidden rounded border border-border bg-surface-alt font-mono">
              <input
                v-model.number="form.freezerApproachingWindowDays"
                type="number"
                min="1"
                class="w-14 bg-transparent px-2.5 py-1.5 text-right text-sm text-text focus:outline-none"
              >
              <span class="pr-3 text-xs text-text-muted">days</span>
            </div>
          </div>
        </div>

        <!-- Notifications section -->
        <div class="border-t border-dashed border-border px-7 py-5">
          <p class="mb-3.5 text-xs font-medium uppercase tracking-widest text-text-muted">Notifications</p>
          <div class="space-y-4">
            <!-- Master toggle -->
            <div class="flex items-center justify-between gap-6 py-1">
              <div>
                <p class="text-sm text-text">Enable push notifications</p>
                <p class="mt-0.5 text-xs text-text-muted">Sends expiry alerts and digest to your ntfy server.</p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="form.freezerNotificationsEnabled"
                class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                :class="form.freezerNotificationsEnabled ? 'bg-accent' : 'bg-border'"
                @click="form.freezerNotificationsEnabled = !form.freezerNotificationsEnabled"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  :class="form.freezerNotificationsEnabled ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
            <!-- ntfy config (always shown; required to configure before enabling) -->
            <div class="rounded-lg border border-border bg-surface-alt px-4 py-3 space-y-3">
              <div class="flex items-center gap-3">
                <label class="w-28 shrink-0 text-xs text-text-muted">App base URL</label>
                <input
                  v-model="form.siteBaseUrl"
                  type="url"
                  class="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="https://meals.home (used in notification links)"
                >
              </div>
              <div class="flex items-center gap-3">
                <label class="w-28 shrink-0 text-xs text-text-muted">Server URL</label>
                <input
                  v-model="form.ntfyServerUrl"
                  type="url"
                  class="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="https://ntfy.sh"
                >
              </div>
              <div class="flex items-center gap-3">
                <label class="w-28 shrink-0 text-xs text-text-muted">Topic</label>
                <input
                  v-model="form.ntfyTopic"
                  type="text"
                  class="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="my-freezer-alerts"
                >
              </div>
              <div class="flex items-center gap-3">
                <label class="w-28 shrink-0 text-xs text-text-muted">Auth token</label>
                <input
                  v-model="form.ntfyAuthToken"
                  type="password"
                  autocomplete="off"
                  class="flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Optional bearer token"
                >
              </div>
            </div>
            <!-- Audit overdue threshold -->
            <div class="flex items-center justify-between gap-6 py-1">
              <div>
                <p class="text-sm text-text">Audit-overdue threshold</p>
                <p class="mt-0.5 text-xs text-text-muted">Alert when a freezer hasn't been audited in this many days.</p>
              </div>
              <div class="flex shrink-0 items-center overflow-hidden rounded border border-border bg-surface-alt font-mono">
                <input
                  v-model.number="form.freezerAuditOverdueDays"
                  type="number"
                  min="1"
                  class="w-14 bg-transparent px-2.5 py-1.5 text-right text-sm text-text focus:outline-none"
                >
                <span class="pr-3 text-xs text-text-muted">days</span>
              </div>
            </div>
            <!-- Weekly digest schedule -->
            <div class="flex items-center justify-between gap-6 py-1">
              <div>
                <p class="text-sm text-text">Weekly digest</p>
                <p class="mt-0.5 text-xs text-text-muted">Day and hour (UTC) to send the summary push.</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <select
                  v-model.number="form.freezerWeeklyDigestDay"
                  class="rounded border border-border bg-surface-alt px-2 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option :value="0">Sunday</option>
                  <option :value="1">Monday</option>
                  <option :value="2">Tuesday</option>
                  <option :value="3">Wednesday</option>
                  <option :value="4">Thursday</option>
                  <option :value="5">Friday</option>
                  <option :value="6">Saturday</option>
                </select>
                <div class="flex items-center overflow-hidden rounded border border-border bg-surface-alt font-mono">
                  <input
                    v-model.number="form.freezerWeeklyDigestHour"
                    type="number"
                    min="0"
                    max="23"
                    class="w-12 bg-transparent px-2 py-1.5 text-right text-sm text-text focus:outline-none"
                  >
                  <span class="pr-2 text-xs text-text-muted">h UTC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Categories section -->
        <div class="border-t border-dashed border-border px-7 py-5">
          <p class="mb-3.5 text-xs font-medium uppercase tracking-widest text-text-muted">Categories</p>
          <div v-if="categoriesPending" class="h-20 animate-pulse rounded-lg bg-surface-alt" />
          <div v-else class="rounded-lg border border-border bg-surface-alt overflow-hidden">
            <div
              v-for="cat in (categories as FreezerCategory[])"
              :key="cat.id"
              class="grid grid-cols-[1fr_7rem_4rem_2rem] items-center gap-3 border-t border-border first:border-0 px-4 py-2.5"
            >
              <span class="truncate rounded border border-border bg-surface px-2.5 py-1.5 text-sm text-text">{{ cat.name }}</span>
              <div class="flex items-center overflow-hidden rounded border border-border bg-surface font-mono">
                <input
                  v-model.number="editingLifetimes[cat.id]"
                  type="number"
                  min="1"
                  class="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-right text-xs text-text focus:outline-none"
                  @change="saveCategoryLifetime(cat.id)"
                >
                <span class="pr-2 text-xs text-text-muted">d</span>
              </div>
              <span
                class="text-center text-xs italic text-text-muted"
                :class="{ invisible: !cat.isSystem }"
              >default</span>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-full text-sm text-text-muted transition hover:bg-expired-soft hover:text-expired-ink"
                @click="deleteCategoryConfirm(cat.id)"
              >×</button>
            </div>
            <!-- Footer: add category -->
            <div class="flex items-center justify-between border-t border-dashed border-border px-4 py-2.5">
              <form class="flex items-center gap-2" @submit.prevent="addCategory">
                <span class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs text-text-muted">+</span>
                <input
                  v-model="newCategoryName"
                  type="text"
                  class="w-36 bg-transparent text-xs text-text placeholder:italic placeholder:text-text-muted focus:outline-none"
                  placeholder="Category name…"
                >
                <input
                  v-model.number="newCategoryLifetime"
                  type="number"
                  min="1"
                  class="w-14 rounded border border-border bg-surface px-2 py-1 text-xs font-mono text-text focus:outline-none"
                  placeholder="days"
                >
                <button
                  type="submit"
                  :disabled="!newCategoryName.trim() || !newCategoryLifetime"
                  class="rounded border border-border bg-surface px-2.5 py-1 text-xs text-text-muted transition hover:bg-surface-alt disabled:opacity-40"
                >Add</button>
              </form>
              <div class="flex items-center gap-3">
                <p v-if="categoryError" class="text-xs text-warning">{{ categoryError }}</p>
                <button
                  type="button"
                  class="text-xs text-text-muted underline-offset-2 hover:underline transition"
                  @click="restoreDefaultCategories"
                >Restore defaults</button>
              </div>
            </div>
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
import { differenceInDays } from 'date-fns'
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
  freezerAuditOverdueDays: 60,
  freezerNotificationsEnabled: false,
  ntfyServerUrl: 'https://ntfy.sh',
  ntfyTopic: '',
  ntfyAuthToken: '',
  freezerWeeklyDigestDay: 0,
  freezerWeeklyDigestHour: 9,
  siteBaseUrl: '',
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
    form.freezerAuditOverdueDays = s.freezerAuditOverdueDays
    form.freezerNotificationsEnabled = s.freezerNotificationsEnabled
    form.ntfyServerUrl = s.ntfyServerUrl
    form.ntfyTopic = s.ntfyTopic
    form.ntfyAuthToken = s.ntfyAuthToken
    form.freezerWeeklyDigestDay = s.freezerWeeklyDigestDay
    form.freezerWeeklyDigestHour = s.freezerWeeklyDigestHour
    form.siteBaseUrl = s.siteBaseUrl
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!settings.value) return false
  return form.householdSize !== settings.value.householdSize
    || form.showAllergens !== settings.value.showAllergens
    || form.backupIntervalHours !== settings.value.backupIntervalHours
    || form.backupRetainCount !== settings.value.backupRetainCount
    || form.freezerApproachingWindowDays !== settings.value.freezerApproachingWindowDays
    || form.freezerAuditOverdueDays !== settings.value.freezerAuditOverdueDays
    || form.freezerNotificationsEnabled !== settings.value.freezerNotificationsEnabled
    || form.ntfyServerUrl !== settings.value.ntfyServerUrl
    || form.ntfyTopic !== settings.value.ntfyTopic
    || form.ntfyAuthToken !== settings.value.ntfyAuthToken
    || form.freezerWeeklyDigestDay !== settings.value.freezerWeeklyDigestDay
    || form.freezerWeeklyDigestHour !== settings.value.freezerWeeklyDigestHour
    || form.siteBaseUrl !== settings.value.siteBaseUrl
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
      freezerAuditOverdueDays: form.freezerAuditOverdueDays,
      freezerNotificationsEnabled: form.freezerNotificationsEnabled,
      ntfyServerUrl: form.ntfyServerUrl,
      ntfyTopic: form.ntfyTopic,
      ntfyAuthToken: form.ntfyAuthToken,
      freezerWeeklyDigestDay: form.freezerWeeklyDigestDay,
      freezerWeeklyDigestHour: form.freezerWeeklyDigestHour,
      siteBaseUrl: form.siteBaseUrl,
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
    await $fetch<unknown>('/api/freezers', { method: 'POST', body: { name: newFreezerName.value.trim() } })
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
  await $fetch<unknown>(`/api/freezers/${id}`, { method: 'PATCH', body: { name: renameValue.value.trim() } })
  renamingFreezerId.value = null
  refreshFreezers()
}

async function deleteFreezerConfirm(id: number) {
  freezerError.value = ''
  try {
    await $fetch<unknown>(`/api/freezers/${id}`, { method: 'DELETE' })
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

const editingLifetimes = ref<Record<number, number>>({})
watch(
  categories,
  (cats) => {
    if (!cats) return
    const updated: Record<number, number> = {}
    for (const cat of cats as FreezerCategory[]) {
      updated[cat.id] = cat.defaultLifetimeDays
    }
    editingLifetimes.value = updated
  },
  { immediate: true },
)

const totalActiveItems = computed(() =>
  ((freezers.value as Freezer[]) ?? []).reduce((sum, f) => sum + (f.activeItemCount ?? 0), 0),
)

function formatAudited(lastAuditedAt: string | null): string {
  if (!lastAuditedAt) return 'never audited'
  const days = differenceInDays(new Date(), new Date(lastAuditedAt))
  if (days === 0) return 'audited today'
  if (days === 1) return 'audited yesterday'
  return `audited ${days} days ago`
}

async function saveCategoryLifetime(id: number) {
  const val = editingLifetimes.value[id]
  if (!val || val < 1) return
  await $fetch<unknown>(`/api/freezer-categories/${id}`, { method: 'PATCH', body: { defaultLifetimeDays: val } })
  refreshCategories()
}

async function addCategory() {
  if (!newCategoryName.value.trim() || !newCategoryLifetime.value) return
  categoryError.value = ''
  try {
    await $fetch<unknown>('/api/freezer-categories', {
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
    await $fetch<unknown>(`/api/freezer-categories/${id}`, { method: 'DELETE' })
    refreshCategories()
  }
  catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    categoryError.value = msg ?? 'Cannot delete category. Move all items first.'
  }
}

async function restoreDefaultCategories() {
  categoryError.value = ''
  try {
    await $fetch<unknown>('/api/freezer-categories/restore-defaults', { method: 'POST' })
    refreshCategories()
  }
  catch {
    categoryError.value = 'Failed to restore defaults.'
  }
}
</script>
