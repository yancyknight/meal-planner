<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Dishes</h1>
      <NuxtLink
        to="/dishes/new"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
      >
        + Add dish
      </NuxtLink>
    </div>

    <div class="flex items-center gap-3 mb-6">
      <div class="relative flex-1 max-w-sm">
        <input
          v-model="search"
          type="text"
          placeholder="Search dishes…"
          class="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <select
        v-if="allTags?.length"
        v-model="selectedTagId"
        class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option :value="undefined">All tags</option>
        <option v-for="tag in allTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
      </select>
      <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
        <input v-model="showArchived" type="checkbox" class="rounded border-gray-300 text-blue-600" />
        Show archived
      </label>
    </div>

    <div v-if="isPending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="n in 8" :key="n" class="h-48 bg-gray-100 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="error" class="text-red-600 text-sm">Failed to load dishes.</div>

    <div v-else-if="!dishes?.length" class="text-center py-16 text-gray-400">
      <p class="text-lg">No dishes yet.</p>
      <NuxtLink to="/dishes/new" class="text-blue-600 hover:underline text-sm mt-2 inline-block">Add your first dish</NuxtLink>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <DishCard v-for="dish in dishes" :key="dish.id" :dish="dish" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { Dish } from '#shared/types/dish'
import type { Tag } from '#shared/types/tag'

const search = ref('')
const showArchived = ref(false)
const selectedTagId = ref<number>()
const debouncedSearch = refDebounced(search, 300)

const { data: allTags } = useQuery({
  queryKey: computed(() => queryKeys.tags.all()),
  queryFn: () => $fetch<Tag[]>('/api/tags'),
  initialData: [],
})

const filters = computed(() => ({
  search: debouncedSearch.value || undefined,
  archived: showArchived.value,
  tagId: selectedTagId.value,
}))

const { data: dishes, isPending, error } = useQuery({
  queryKey: computed(() => queryKeys.dishes.list(filters.value)),
  queryFn: async (): Promise<Dish[]> => {
    const params = new URLSearchParams()
    if (filters.value.search) params.set('search', filters.value.search)
    if (filters.value.archived) params.set('archived', 'true')
    if (filters.value.tagId) params.set('tagId', String(filters.value.tagId))
    return $fetch<Dish[]>(`/api/dishes?${params}`)
  },
})
</script>
