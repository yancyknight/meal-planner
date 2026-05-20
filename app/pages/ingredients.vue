<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CanonicalIngredient } from '#shared/types/ingredient'

const queryClient = useQueryClient()

const { data: ingredients, isPending } = useQuery({
  queryKey: queryKeys.canonicalIngredients.all(),
  queryFn: () => $fetch<CanonicalIngredient[]>('/api/canonical-ingredients'),
})

// Rename
const editingId = ref<number | null>(null)
const editingName = ref('')

function startRename(ing: CanonicalIngredient) {
  editingId.value = ing.id
  editingName.value = ing.name
}

function cancelRename() {
  editingId.value = null
  editingName.value = ''
}

const { mutate: rename } = useMutation({
  mutationFn: ({ id, name }: { id: number; name: string }) =>
    $fetch(`/api/canonical-ingredients/${id}`, { method: 'PATCH', body: { name } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.canonicalIngredients.all() })
    editingId.value = null
  },
})

function submitRename(id: number) {
  if (!editingName.value.trim()) return
  rename({ id, name: editingName.value.trim() })
}

// Walmart URL
const editingWalmartId = ref<number | null>(null)
const editingWalmartUrl = ref('')

function startWalmartEdit(ing: CanonicalIngredient) {
  editingWalmartId.value = ing.id
  editingWalmartUrl.value = ing.walmartUrl ?? ''
}

function cancelWalmartEdit() {
  editingWalmartId.value = null
  editingWalmartUrl.value = ''
}

const { mutate: saveWalmart } = useMutation({
  mutationFn: ({ id, walmartUrl }: { id: number; walmartUrl: string | null }) =>
    $fetch(`/api/canonical-ingredients/${id}`, { method: 'PATCH', body: { walmartUrl } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.canonicalIngredients.all() })
    editingWalmartId.value = null
  },
})

function submitWalmart(id: number) {
  const url = editingWalmartUrl.value.trim() || null
  saveWalmart({ id, walmartUrl: url })
}

// Delete
const { mutate: deleteIngredient } = useMutation({
  mutationFn: (id: number) => $fetch(`/api/canonical-ingredients/${id}`, { method: 'DELETE' }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.canonicalIngredients.all() }),
  onError: () => alert('Cannot delete: this ingredient is used by one or more dishes.'),
})

function confirmDelete(ing: CanonicalIngredient) {
  if (confirm(`Delete "${ing.name}"? This only works if no dishes use it.`)) {
    deleteIngredient(ing.id)
  }
}

// Merge
const mergeSourceId = ref<number | null>(null)
const mergeTargetId = ref<number | null>(null)
const showMergePanel = ref(false)

function startMerge(ing: CanonicalIngredient) {
  mergeSourceId.value = ing.id
  showMergePanel.value = true
}

function cancelMerge() {
  mergeSourceId.value = null
  mergeTargetId.value = null
  showMergePanel.value = false
}

const { mutate: doMerge, isPending: mergePending } = useMutation({
  mutationFn: ({ primaryId, secondaryId }: { primaryId: number; secondaryId: number }) =>
    $fetch('/api/canonical-ingredients/merge', { method: 'POST', body: { primaryId, secondaryId } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.canonicalIngredients.all() })
    cancelMerge()
  },
})

function submitMerge() {
  if (!mergeSourceId.value || !mergeTargetId.value) return
  doMerge({ primaryId: mergeTargetId.value, secondaryId: mergeSourceId.value })
}

const mergeSourceName = computed(() =>
  ingredients.value?.find(i => i.id === mergeSourceId.value)?.name ?? '',
)

// Linked dishes
const expandedId = ref<number | null>(null)
const { data: linkedDishes } = useQuery({
  queryKey: computed(() => queryKeys.canonicalIngredients.detail(expandedId.value ?? 0)),
  queryFn: async () => {
    if (!expandedId.value) return null
    const res = await $fetch<CanonicalIngredient & { dishes: { id: number; name: string }[] }>(
      `/api/canonical-ingredients/${expandedId.value}`,
    )
    return res.dishes
  },
  enabled: computed(() => expandedId.value !== null),
})

function toggleDishes(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex items-end justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Pantry</p>
        <h1 class="font-serif text-4xl font-semibold text-text">
          <em class="font-normal italic text-accent-deep">Canonical</em> ingredients
        </h1>
      </div>
      <span v-if="!isPending" class="font-mono text-sm text-text-subtle">
        {{ ingredients?.length ?? 0 }} total
      </span>
    </div>

    <!-- Merge panel -->
    <div v-if="showMergePanel" class="mb-6 rounded-lg border border-border bg-accent-soft p-5">
      <p class="mb-3 text-sm font-medium text-text">
        Merge <strong class="text-accent-deep">{{ mergeSourceName }}</strong> into:
      </p>
      <select
        v-model="mergeTargetId"
        class="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        <option :value="null">— select target —</option>
        <option
          v-for="ing in ingredients?.filter(i => i.id !== mergeSourceId)"
          :key="ing.id"
          :value="ing.id"
        >
          {{ ing.name }}
        </option>
      </select>
      <p class="mb-4 text-xs text-text-muted">
        All dish ingredients referencing "{{ mergeSourceName }}" will be relinked to the target and "{{ mergeSourceName }}" will be deleted.
      </p>
      <div class="flex gap-2">
        <button
          :disabled="!mergeTargetId || mergePending"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          @click="submitMerge"
        >
          Merge
        </button>
        <button
          class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition hover:bg-surface"
          @click="cancelMerge"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="space-y-2">
      <div v-for="n in 6" :key="n" class="h-12 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!ingredients?.length" class="py-16 text-center">
      <p class="font-serif text-xl italic text-text-subtle">No ingredients yet.</p>
      <p class="mt-2 text-sm text-text-muted">They're created when you add ingredients to dishes.</p>
    </div>

    <!-- List -->
    <div v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      <div v-for="ing in ingredients" :key="ing.id" class="px-5 py-3.5">
        <!-- Name row -->
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <div v-if="editingId === ing.id" class="flex items-center gap-2">
              <input
                v-model="editingName"
                class="rounded-lg border border-accent/60 px-2.5 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                @keyup.enter="submitRename(ing.id)"
                @keyup.escape="cancelRename"
              >
              <button class="text-xs font-medium text-accent hover:text-accent-hover" @click="submitRename(ing.id)">
                Save
              </button>
              <button class="text-xs text-text-subtle hover:text-text-muted" @click="cancelRename">
                Cancel
              </button>
            </div>
            <span v-else class="text-sm font-medium text-text">{{ ing.name }}</span>
          </div>

          <div class="flex shrink-0 items-center gap-3">
            <a
              v-if="ing.walmartUrl"
              :href="ing.walmartUrl"
              target="_blank"
              rel="noopener"
              class="text-xs text-accent hover:text-accent-hover hover:underline"
            >Walmart ↗</a>
            <button class="text-xs text-text-subtle transition hover:text-text-muted" @click="toggleDishes(ing.id)">
              dishes
            </button>
            <button class="text-xs text-text-subtle transition hover:text-accent" @click="startRename(ing)">
              rename
            </button>
            <button class="text-xs text-text-subtle transition hover:text-warning" @click="startMerge(ing)">
              merge
            </button>
            <button class="text-xs text-text-subtle transition hover:text-warning" @click="confirmDelete(ing)">
              delete
            </button>
          </div>
        </div>

        <!-- Walmart URL edit row -->
        <div class="mt-1.5">
          <div v-if="editingWalmartId === ing.id" class="flex items-center gap-2">
            <input
              v-model="editingWalmartUrl"
              type="url"
              placeholder="https://www.walmart.com/ip/..."
              class="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1 text-xs text-text focus:outline-none focus:border-accent"
              @keyup.enter="submitWalmart(ing.id)"
              @keyup.escape="cancelWalmartEdit"
            >
            <button class="text-xs font-medium text-accent hover:text-accent-hover" @click="submitWalmart(ing.id)">
              Save
            </button>
            <button class="text-xs text-text-subtle hover:text-text-muted" @click="cancelWalmartEdit">
              Cancel
            </button>
          </div>
          <button
            v-else
            class="text-xs text-text-subtle transition hover:text-text-muted"
            @click="startWalmartEdit(ing)"
          >
            {{ ing.walmartUrl ? 'edit Walmart URL' : '+ set Walmart URL' }}
          </button>
        </div>

        <!-- Linked dishes -->
        <div v-if="expandedId === ing.id" class="mt-3 rounded-lg bg-surface-alt px-4 py-3">
          <div v-if="!linkedDishes" class="text-xs text-text-subtle">Loading…</div>
          <div v-else-if="linkedDishes.length === 0" class="text-xs text-text-muted">
            No dishes use this ingredient.
          </div>
          <ul v-else class="flex flex-wrap gap-1.5">
            <li v-for="d in linkedDishes" :key="d.id">
              <NuxtLink
                :to="`/dishes/${d.id}`"
                class="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted transition hover:border-accent/40 hover:text-accent-deep"
              >{{ d.name }}</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
