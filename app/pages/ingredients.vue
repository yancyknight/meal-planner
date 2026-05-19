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
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Ingredients</h1>
      <span v-if="!isPending" class="text-sm text-gray-400">{{ ingredients?.length ?? 0 }} total</span>
    </div>

    <!-- Merge panel -->
    <div v-if="showMergePanel" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p class="mb-3 text-sm font-medium text-amber-800">
        Merge "{{ mergeSourceName }}" into:
      </p>
      <select
        v-model="mergeTargetId"
        class="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
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
      <p class="mb-3 text-xs text-amber-700">
        All dish ingredients referencing "{{ mergeSourceName }}" will be relinked to the target. "{{ mergeSourceName }}" will be deleted.
      </p>
      <div class="flex gap-2">
        <button
          :disabled="!mergeTargetId || mergePending"
          class="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
          @click="submitMerge"
        >
          Merge
        </button>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50" @click="cancelMerge">
          Cancel
        </button>
      </div>
    </div>

    <div v-if="isPending" class="space-y-2">
      <div v-for="n in 6" :key="n" class="h-12 animate-pulse rounded-lg bg-gray-200" />
    </div>

    <div v-else-if="!ingredients?.length" class="py-12 text-center text-sm text-gray-400">
      No ingredients yet. They're created when you add ingredients to dishes.
    </div>

    <div v-else class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      <div v-for="ing in ingredients" :key="ing.id" class="px-4 py-3">
        <!-- Name row -->
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <div v-if="editingId === ing.id" class="flex items-center gap-2">
              <input
                v-model="editingName"
                class="rounded border border-indigo-400 px-2 py-0.5 text-sm focus:outline-none"
                @keyup.enter="submitRename(ing.id)"
                @keyup.escape="cancelRename"
              >
              <button class="text-xs text-indigo-600 hover:underline" @click="submitRename(ing.id)">
                Save
              </button>
              <button class="text-xs text-gray-400 hover:text-gray-600" @click="cancelRename">
                Cancel
              </button>
            </div>
            <span v-else class="font-medium text-gray-800">{{ ing.name }}</span>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <a
              v-if="ing.walmartUrl"
              :href="ing.walmartUrl"
              target="_blank"
              rel="noopener"
              class="text-xs text-blue-500 hover:underline"
            >Walmart</a>
            <button class="text-xs text-gray-400 hover:text-gray-600" @click="toggleDishes(ing.id)">
              dishes
            </button>
            <button class="text-xs text-gray-400 hover:text-indigo-600" @click="startRename(ing)">
              rename
            </button>
            <button class="text-xs text-gray-400 hover:text-amber-600" @click="startMerge(ing)">
              merge
            </button>
            <button class="text-xs text-gray-400 hover:text-red-500" @click="confirmDelete(ing)">
              delete
            </button>
          </div>
        </div>

        <!-- Walmart URL row -->
        <div class="mt-1">
          <div v-if="editingWalmartId === ing.id" class="flex items-center gap-2">
            <input
              v-model="editingWalmartUrl"
              type="url"
              placeholder="https://www.walmart.com/ip/..."
              class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:border-indigo-400"
              @keyup.enter="submitWalmart(ing.id)"
              @keyup.escape="cancelWalmartEdit"
            >
            <button class="text-xs text-indigo-600 hover:underline" @click="submitWalmart(ing.id)">
              Save
            </button>
            <button class="text-xs text-gray-400 hover:text-gray-600" @click="cancelWalmartEdit">
              Cancel
            </button>
          </div>
          <button
            v-else
            class="text-xs text-gray-400 hover:text-gray-600"
            @click="startWalmartEdit(ing)"
          >
            {{ ing.walmartUrl ? 'edit Walmart URL' : '+ set Walmart URL' }}
          </button>
        </div>

        <!-- Linked dishes -->
        <div v-if="expandedId === ing.id" class="mt-2 rounded bg-gray-50 px-3 py-2">
          <div v-if="!linkedDishes" class="text-xs text-gray-400">
            Loading…
          </div>
          <div v-else-if="linkedDishes.length === 0" class="text-xs text-gray-400">
            No dishes use this ingredient.
          </div>
          <ul v-else class="flex flex-wrap gap-1">
            <li v-for="d in linkedDishes" :key="d.id">
              <NuxtLink
                :to="`/dishes/${d.id}`"
                class="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
              >{{ d.name }}</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
