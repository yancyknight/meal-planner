<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Freezer</p>
        <h1 class="font-serif text-3xl font-semibold text-text">
          <template v-if="totalActive > 0">
            {{ totalFreezerCount }} freezer{{ totalFreezerCount === 1 ? '' : 's' }} ·
            <em class="italic text-accent-deep">{{ totalActive }} item{{ totalActive === 1 ? '' : 's' }}</em>
          </template>
          <template v-else>Empty freezers</template>
        </h1>
        <p v-if="auditNote" class="mt-1 text-sm text-text-muted">{{ auditNote }}</p>
      </div>
      <NuxtLink
        to="/freezer/add"
        class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
      >+ Add item</NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="py-12 text-center text-text-subtle">Loading…</div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">
      Failed to load dashboard.
    </div>

    <!-- Empty state (no freezers yet) -->
    <div v-else-if="totalFreezerCount === 0" class="py-16 text-center">
      <p class="font-serif text-xl text-text-muted">No freezers yet.</p>
      <p class="mt-2 text-sm text-text-subtle">Add one in <NuxtLink to="/settings" class="underline">Settings → Freezer</NuxtLink>.</p>
    </div>

    <!-- Buckets -->
    <template v-else-if="dashboard">
      <FreezerDashboardBucket
        label="Expired — toss now"
        icon="⚠"
        variant="expired"
        :groups="dashboard.expired"
        :all-freezers="freezers"
        @mark-used="markUsed"
        @mark-wasted="markWasted"
        @edit="editItem"
        @move="moveItem"
      />

      <FreezerDashboardBucket
        :label="`Approaching — next ${settings?.freezerApproachingWindowDays ?? 14} days`"
        icon="⏳"
        variant="approaching"
        :groups="dashboard.approaching"
        :all-freezers="freezers"
        @mark-used="markUsed"
        @mark-wasted="markWasted"
        @edit="editItem"
        @move="moveItem"
      />

      <FreezerDashboardBucket
        label="Recently Added — last 7 days"
        icon="✚"
        variant="recent"
        :groups="dashboard.recentlyAdded"
        :all-freezers="freezers"
        @mark-used="markUsed"
        @mark-wasted="markWasted"
        @edit="editItem"
        @move="moveItem"
      />

      <p
        v-if="dashboard.expired.length === 0 && dashboard.approaching.length === 0 && dashboard.recentlyAdded.length === 0"
        class="py-12 text-center text-sm text-text-subtle"
      >
        Nothing urgent in the freezer.
      </p>
    </template>

    <!-- Move dialog -->
    <div v-if="movingItemId" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-text/40 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl space-y-4">
        <h2 class="font-serif text-lg font-semibold">Move to another freezer</h2>
        <div class="space-y-2">
          <button
            v-for="f in freezers.filter(f => f.id !== movingItemFreezer)"
            :key="f.id"
            type="button"
            class="block w-full rounded-lg border border-border px-4 py-3 text-left text-sm hover:bg-surface-alt"
            @click="confirmMove(f.id)"
          >{{ f.name }}</button>
        </div>
        <button
          type="button"
          class="w-full rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-alt"
          @click="movingItemId = null"
        >Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FreezerDashboardPayload, Freezer } from '#shared/types/freezer'

useHead({ title: 'Freezer' })

const { data: freezers } = useFetch<Freezer[]>('/api/freezers', {
  default: () => [],
  key: 'freezers',
})

const { data: dashboard, pending, error, refresh: refreshDashboard } = useFetch<FreezerDashboardPayload>(
  '/api/freezer-items/dashboard',
  { key: 'freezer-items-dashboard' },
)

const { data: settings } = useFetch('/api/settings', { key: 'settings' })

const totalFreezerCount = computed(() => (freezers.value as Freezer[]).length)

const totalActive = computed(() => {
  if (!dashboard.value) return 0
  const d = dashboard.value as FreezerDashboardPayload
  const count = (groups: typeof d.expired) => groups.reduce((s, g) => s + g.items.length, 0)
  return count(d.expired) + count(d.approaching) + count(d.recentlyAdded)
})

const auditNote = computed(() => {
  const fs = freezers.value as Freezer[]
  if (!fs.length) return null
  const oldest = fs
    .filter(f => f.lastAuditedAt)
    .sort((a, b) => (a.lastAuditedAt! < b.lastAuditedAt! ? -1 : 1))
  if (!oldest.length) return null
  const f = oldest[0]!
  const days = Math.floor(
    (Date.now() - new Date(f.lastAuditedAt!).getTime()) / 86400000,
  )
  return `Last audited: ${f.name} · ${days} day${days === 1 ? '' : 's'} ago`
})

// --- Actions ---

async function markUsed(id: number) {
  await $fetch<unknown>(`/api/freezer-items/${id}/use`, { method: 'POST' })
  refreshDashboard()
}

async function markWasted(id: number) {
  await $fetch<unknown>(`/api/freezer-items/${id}/waste`, { method: 'POST' })
  refreshDashboard()
}

function editItem(id: number) {
  navigateTo(`/freezer/edit/${id}`)
}

const movingItemId = ref<number | null>(null)
const movingItemFreezer = ref<number | null>(null)

function moveItem(id: number) {
  const allItems = [
    ...(dashboard.value?.expired.flatMap(g => g.items) ?? []),
    ...(dashboard.value?.approaching.flatMap(g => g.items) ?? []),
    ...(dashboard.value?.recentlyAdded.flatMap(g => g.items) ?? []),
  ]
  const item = allItems.find(i => i.id === id)
  movingItemFreezer.value = item?.freezerId ?? null
  movingItemId.value = id
}

async function confirmMove(newFreezerId: number) {
  if (!movingItemId.value) return
  await $fetch<unknown>(`/api/freezer-items/${movingItemId.value}`, {
    method: 'PATCH',
    body: { freezerId: newFreezerId },
  })
  movingItemId.value = null
  refreshDashboard()
}
</script>
