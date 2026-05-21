<template>
  <div>
    <!-- Loading -->
    <div v-if="isPending" class="space-y-4">
      <div class="h-16 animate-pulse rounded-lg bg-surface-alt" />
      <div class="h-64 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <!-- Not found -->
    <div v-else-if="!list" class="rounded-lg border border-border bg-surface px-8 py-16 text-center">
      <p class="font-serif text-xl text-text">List not found</p>
      <NuxtLink to="/shopping-lists" class="mt-3 inline-block text-sm text-accent hover:text-accent-hover">
        ← Back to lists
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink
          to="/shopping-lists"
          class="mb-3 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-accent transition"
        >
          ← Shopping lists
        </NuxtLink>
        <div class="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
              {{ list.name }}
            </h1>
            <p class="mt-1 font-mono text-sm text-text-muted">
              {{ list.dateRangeStart }} – {{ list.dateRangeEnd }}
            </p>
          </div>
          <!-- Status + actions -->
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <span
              v-if="list.isDone"
              class="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-text-muted"
            >
              Done
              <span v-if="list.deletesAt" class="text-warning"> · Deletes in {{ formatCountdown(list.deletesAt) }}</span>
            </span>
            <span v-else class="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-deep">
              Active
            </span>
            <button
              v-if="list.isDone"
              type="button"
              class="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
              :disabled="togglingDone"
              @click="toggleDone(false)"
            >
              Undo done
            </button>
            <button
              v-else
              type="button"
              class="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
              :disabled="togglingDone"
              @click="toggleDone(true)"
            >
              Mark as done
            </button>
          </div>
        </div>
      </div>

      <!-- View toggle -->
      <div class="mb-6 flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="view === 'combined' ? 'bg-accent-soft text-accent-deep' : 'text-text-muted hover:bg-surface-alt'"
          @click="view = 'combined'"
        >
          Combined
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="view === 'by-dish' ? 'bg-accent-soft text-accent-deep' : 'text-text-muted hover:bg-surface-alt'"
          @click="view = 'by-dish'"
        >
          By dish
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="!list.items.length"
        class="rounded-lg border border-border bg-surface px-8 py-16 text-center"
      >
        <p class="font-serif text-xl text-text">No ingredients found</p>
        <p class="mt-1 text-sm text-text-muted">
          No fresh dish entries with ingredients exist in this date range.
        </p>
      </div>

      <!-- Combined view -->
      <div v-else-if="view === 'combined'" class="rounded-lg border border-border bg-surface divide-y divide-border">
        <ShoppingListItemRow
          v-for="item in list.items"
          :key="item.id"
          :item="item"
          @toggle="toggleItem(item.id, $event)"
          @set-walmart-url="setWalmartUrl(item.canonicalIngredientId, $event)"
        />
      </div>

      <!-- By-dish view -->
      <div v-else class="space-y-6">
        <div
          v-for="dish in dishesSections"
          :key="dish.id"
          class="rounded-lg border border-border bg-surface overflow-hidden"
        >
          <div class="border-b border-border bg-surface-alt px-5 py-3">
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Dish</p>
            <p class="font-serif text-lg font-semibold text-text">{{ dish.name }}</p>
          </div>
          <div class="divide-y divide-border">
            <ShoppingListItemRow
              v-for="item in dish.items"
              :key="item.id"
              :item="item"
              @toggle="toggleItem(item.id, $event)"
              @set-walmart-url="setWalmartUrl(item.canonicalIngredientId, $event)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ShoppingListDetail, ShoppingListItem } from '#server/services/shoppingListService'

const route = useRoute()
const queryClient = useQueryClient()
const id = computed(() => parseInt(route.params.id as string))

const { data: list, isPending } = useQuery({
  queryKey: computed(() => queryKeys.shoppingLists.detail(id.value)),
  queryFn: () => $fetch<ShoppingListDetail>(`/api/shopping-lists/${id.value}`),
  refetchInterval: 60_000,
})

const view = ref<'combined' | 'by-dish'>('combined')

function formatCountdown(deletesAt: string): string {
  const diff = new Date(deletesAt).getTime() - Date.now()
  if (diff <= 0) return 'soon'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// By-dish sections: each unique dish with its items
const dishesSections = computed(() => {
  if (!list.value) return []
  const map = new Map<number, { id: number; name: string; items: ShoppingListItem[] }>()
  for (const item of list.value.items) {
    for (let i = 0; i < item.sourceDishIds.length; i++) {
      const dishId = item.sourceDishIds[i]!
      const dishName = item.sourceDishNames[i] ?? ''
      if (!map.has(dishId)) map.set(dishId, { id: dishId, name: dishName, items: [] })
      map.get(dishId)!.items.push(item)
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

// Toggle item checked
const { mutate: patchItem } = useMutation({
  mutationFn: ({ itemId, checked }: { itemId: number; checked: boolean }) =>
    $fetch(`/api/shopping-list-items/${itemId}`, { method: 'PATCH', body: { checked } }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(id.value) }),
})

function toggleItem(itemId: number, checked: boolean) {
  patchItem({ itemId, checked })
}

// Set Walmart URL on a canonical ingredient
const { mutate: patchWalmartUrl } = useMutation({
  mutationFn: ({ canonicalId, url }: { canonicalId: number; url: string }) =>
    $fetch(`/api/canonical-ingredients/${canonicalId}`, { method: 'PATCH', body: { walmartUrl: url } }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(id.value) }),
})

function setWalmartUrl(canonicalId: number, url: string) {
  patchWalmartUrl({ canonicalId, url })
}

// Mark done / undo done
const { mutate: patchDone, isPending: togglingDone } = useMutation({
  mutationFn: (isDone: boolean) =>
    $fetch(`/api/shopping-lists/${id.value}`, { method: 'PATCH', body: { isDone } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(id.value) })
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all() })
  },
})

function toggleDone(isDone: boolean) {
  patchDone(isDone)
}
</script>
