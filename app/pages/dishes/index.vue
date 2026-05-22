<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Library</p>
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
          Your <em class="font-normal italic text-accent-deep">dishes</em>
        </h1>
      </div>
      <NuxtLink
        to="/dishes/new"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover shrink-0"
      >
        ✦ Add dish
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="mb-6 space-y-3">
      <!-- Row 1: Search + Sort + Archived -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-48 max-w-sm">
          <input
            v-model="search"
            type="text"
            placeholder="Search dishes…"
            class="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <svg class="absolute left-2.5 top-2.5 h-4 w-4 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          v-model="sort"
          class="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label="Sort dishes"
        >
          <option value="created_desc">Newest first</option>
          <option value="name_asc">Name A–Z</option>
          <option value="last_cooked_desc">Recently cooked</option>
          <option value="target_interval_asc">Frequency (most often)</option>
        </select>

        <label class="ml-auto flex cursor-pointer items-center gap-2 text-sm text-text-muted select-none">
          <input v-model="showArchived" type="checkbox" class="rounded border-border accent-accent" />
          Show archived
        </label>
      </div>

      <!-- Row 2: Tag filter pills -->
      <div v-if="allTags?.length || visibleVirtualTags.length" class="flex flex-wrap gap-1.5">
        <button
          class="rounded-full border px-4 py-1.5 text-xs transition"
          :class="!selectedTagId && !selectedVirtualTagId
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="selectedTagId = undefined; selectedVirtualTagId = undefined"
        >All</button>

        <!-- Real tags -->
        <button
          v-for="tag in allTags"
          :key="tag.id"
          class="rounded-full border px-4 py-1.5 text-xs transition"
          :class="selectedTagId === tag.id
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="selectedTagId = tag.id; selectedVirtualTagId = undefined"
        >{{ tag.name }}</button>

        <!-- Divider when both exist -->
        <span v-if="allTags?.length && visibleVirtualTags.length" class="my-auto h-4 w-px bg-border" />

        <!-- Virtual tags -->
        <button
          v-for="vtag in visibleVirtualTags"
          :key="vtag.id"
          class="rounded-full border px-4 py-1.5 text-xs transition"
          :class="selectedVirtualTagId === vtag.id
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="selectedVirtualTagId = vtag.id; selectedTagId = undefined"
        >{{ vtag.emoji }} {{ vtag.label }}</button>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="isPending" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in 8" :key="n" class="h-52 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-warning">Failed to load dishes.</div>

    <!-- Empty state -->
    <div v-else-if="!dishes?.length" class="py-20 text-center">
      <p class="font-serif text-2xl text-text-subtle italic">
        {{ selectedTagId || selectedVirtualTagId ? 'No dishes match this filter.' : 'Nothing here yet.' }}
      </p>
      <NuxtLink v-if="!selectedTagId && !selectedVirtualTagId" to="/dishes/new" class="mt-3 inline-block text-sm text-accent hover:text-accent-hover hover:underline">
        Add your first dish ↗
      </NuxtLink>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DishCard v-for="dish in dishes" :key="dish.id" :dish="dish" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { Dish, DishSort } from '#shared/types/dish'
import type { Tag } from '#shared/types/tag'
import type { AppSettings } from '#shared/types/settings'
import { VIRTUAL_TAGS } from '#shared/virtualTags'

const search = ref('')
const showArchived = ref(false)
const selectedTagId = ref<number>()
const selectedVirtualTagId = ref<string>()
const sort = ref<DishSort>('created_desc')
const debouncedSearch = refDebounced(search, 300)

const { data: allTags } = useQuery({
  queryKey: computed(() => queryKeys.tags.all()),
  queryFn: () => $fetch<Tag[]>('/api/tags'),
  initialData: [],
})

const { data: settings } = useQuery({
  queryKey: computed(() => queryKeys.settings.all()),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
})

const visibleVirtualTags = computed(() =>
  VIRTUAL_TAGS.filter(vt => !vt.isDietary || settings.value?.showAllergens)
)

const filters = computed(() => ({
  search: debouncedSearch.value || undefined,
  archived: showArchived.value,
  tagId: selectedTagId.value,
  virtualTagId: selectedVirtualTagId.value,
  sort: sort.value,
}))

const { data: dishes, isPending, error } = useQuery({
  queryKey: computed(() => queryKeys.dishes.list(filters.value)),
  queryFn: async (): Promise<Dish[]> => {
    const params = new URLSearchParams()
    if (filters.value.search) params.set('search', filters.value.search)
    if (filters.value.archived) params.set('archived', 'true')
    if (filters.value.tagId) params.set('tagId', String(filters.value.tagId))
    if (filters.value.virtualTagId) params.set('virtualTagId', filters.value.virtualTagId)
    if (filters.value.sort) params.set('sort', filters.value.sort)
    return $fetch<Dish[]>(`/api/dishes?${params}`)
  },
})
</script>
