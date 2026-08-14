<template>
  <div class="space-y-6">
    <!-- Back + header -->
    <div>
      <NuxtLink to="/freezer" class="mb-3 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
        ← Freezer
      </NuxtLink>
      <div class="flex items-start justify-between">
        <div>
          <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Freezer</p>
          <h1 v-if="freezer" class="font-serif text-3xl font-semibold text-text">
            {{ freezer.name }}
          </h1>
          <p v-if="freezer?.lastAuditedAt" class="mt-1 text-sm text-text-muted">
            Last audited {{ auditDaysAgo }} day{{ auditDaysAgo === 1 ? '' : 's' }} ago
          </p>
          <p v-else class="mt-1 text-sm text-text-subtle">Never audited</p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            :to="`/freezer/${id}/audit`"
            class="whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-surface-alt"
          >Audit</NuxtLink>
          <NuxtLink
            :to="`/freezer/add?freezerId=${id}`"
            class="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >+ Add item</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <select
        v-model="categoryFilter"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted focus:outline-none"
      >
        <option value="">All categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <select
        v-model="statusFilter"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted focus:outline-none"
      >
        <option value="active">Active</option>
        <option value="used">Used</option>
        <option value="wasted">Wasted</option>
        <option value="">All</option>
      </select>
    </div>

    <!-- Bulk actions (shown when items selected) -->
    <div v-if="selected.size > 0" class="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
      <span class="text-sm text-text-muted">{{ selected.size }} selected</span>
      <button
        type="button"
        class="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
        @click="bulkMarkUsed"
      >Mark used</button>
      <button
        type="button"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:bg-surface-alt"
        @click="bulkMarkWasted"
      >Mark wasted</button>
      <button
        type="button"
        class="ml-auto text-xs text-text-subtle underline"
        @click="selected.clear()"
      >Clear</button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="py-12 text-center text-text-subtle">Loading…</div>

    <!-- Empty -->
    <div v-else-if="items && (items as FreezerItem[]).length === 0" class="py-12 text-center">
      <p class="text-sm text-text-subtle">No items match the current filters.</p>
    </div>

    <!-- Item list -->
    <div v-else class="overflow-hidden rounded-lg border border-border bg-surface">
      <!-- Select all -->
      <div class="flex items-center gap-2 border-b border-border bg-surface-alt px-4 py-2">
        <input
          id="select-all"
          type="checkbox"
          :checked="selected.size === (items as FreezerItem[]).filter(i => i.status === 'active').length"
          class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          @change="toggleSelectAll"
        >
        <label for="select-all" class="text-xs text-text-muted">Select all active</label>
        <span class="ml-auto font-mono text-xs text-text-subtle">{{ (items as FreezerItem[]).length }} item{{ (items as FreezerItem[]).length === 1 ? '' : 's' }}</span>
      </div>

      <div
        v-for="item in (items as FreezerItem[])"
        :key="item.id"
        class="flex items-start gap-2"
      >
        <div class="pl-4 pt-3.5">
          <input
            v-if="item.status === 'active'"
            type="checkbox"
            :checked="selected.has(item.id)"
            class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            @change="toggleSelect(item.id)"
          >
        </div>
        <div class="min-w-0 flex-1">
          <FreezerItemRow
            :item="item"
            :freezers="allFreezers as Freezer[]"
            @mark-used="doMarkUsed"
            @mark-wasted="doMarkWasted"
            @edit="editItem"
            @move="moveItem"
          />
        </div>
      </div>
    </div>

    <!-- Move dialog -->
    <div v-if="movingItemId" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-text/40 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl space-y-4">
        <h2 class="font-serif text-lg font-semibold">Move to another freezer</h2>
        <div class="space-y-2">
          <button
            v-for="f in (allFreezers as Freezer[]).filter(f => f.id !== id)"
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
import type { Freezer, FreezerItem, FreezerCategory } from '#shared/types/freezer'

useHead({ title: 'Freezer' })

const route = useRoute()
const id = computed(() => Number(route.params.id))

const { data: freezer } = useFetch<Freezer>(() => `/api/freezers/${id.value}`, { key: `freezer-${id.value}` })
const { data: allFreezers } = useFetch<Freezer[]>('/api/freezers', { key: 'freezers' })
const { data: categories } = useFetch<FreezerCategory[]>('/api/freezer-categories', { key: 'freezer-categories' })

const categoryFilter = ref<number | ''>('')
const statusFilter = ref<'active' | 'used' | 'wasted' | ''>('active')

const itemsUrl = computed(() => {
  const params = new URLSearchParams({ freezerId: String(id.value) })
  if (categoryFilter.value) params.set('categoryId', String(categoryFilter.value))
  if (statusFilter.value) params.set('status', statusFilter.value)
  return `/api/freezer-items?${params}`
})

const { data: items, pending, refresh } = useFetch<FreezerItem[]>(itemsUrl, {
  watch: [categoryFilter, statusFilter],
})

const auditDaysAgo = computed(() => {
  if (!freezer.value?.lastAuditedAt) return 0
  return Math.floor((Date.now() - new Date(freezer.value.lastAuditedAt).getTime()) / 86400000)
})

// --- Selection ---
const selected = reactive(new Set<number>())

function toggleSelect(itemId: number) {
  if (selected.has(itemId)) selected.delete(itemId)
  else selected.add(itemId)
}

function toggleSelectAll() {
  const activeIds = (items.value as FreezerItem[]).filter(i => i.status === 'active').map(i => i.id)
  if (selected.size === activeIds.length) {
    selected.clear()
  }
  else {
    activeIds.forEach(id => selected.add(id))
  }
}

// --- Actions ---
async function doMarkUsed(itemId: number) {
  await $fetch<unknown>(`/api/freezer-items/${itemId}/use`, { method: 'POST' })
  refresh()
}

async function doMarkWasted(itemId: number) {
  await $fetch<unknown>(`/api/freezer-items/${itemId}/waste`, { method: 'POST' })
  refresh()
}

async function bulkMarkUsed() {
  await Promise.all([...selected].map(id => $fetch<unknown>(`/api/freezer-items/${id}/use`, { method: 'POST' })))
  selected.clear()
  refresh()
}

async function bulkMarkWasted() {
  await Promise.all([...selected].map(id => $fetch<unknown>(`/api/freezer-items/${id}/waste`, { method: 'POST' })))
  selected.clear()
  refresh()
}

function editItem(itemId: number) {
  navigateTo(`/freezer/edit/${itemId}`)
}

const movingItemId = ref<number | null>(null)

function moveItem(itemId: number) {
  movingItemId.value = itemId
}

async function confirmMove(newFreezerId: number) {
  if (!movingItemId.value) return
  await $fetch<unknown>(`/api/freezer-items/${movingItemId.value}`, {
    method: 'PATCH',
    body: { freezerId: newFreezerId },
  })
  movingItemId.value = null
  refresh()
}
</script>
