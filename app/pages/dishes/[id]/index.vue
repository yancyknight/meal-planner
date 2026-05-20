<template>
  <div>
    <div v-if="isPending" class="animate-pulse space-y-4">
      <div class="h-8 w-48 bg-gray-200 rounded" />
      <div class="h-48 bg-gray-200 rounded-lg" />
    </div>

    <div v-else-if="error || !dish" class="text-red-600 text-sm">Dish not found.</div>

    <template v-else>
      <div class="flex items-center gap-3 mb-6">
        <NuxtLink to="/dishes" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-gray-900 flex-1">{{ dish.name }}</h1>
        <span
          v-if="dish.archived"
          class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200"
        >Archived</span>
        <NuxtLink
          :to="`/dishes/${dish.id}/edit`"
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >Edit</NuxtLink>
        <button
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          @click="toggleArchive"
        >{{ dish.archived ? 'Unarchive' : 'Archive' }}</button>
        <button
          class="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
          @click="confirmDelete"
        >Delete</button>
      </div>

      <!-- Image -->
      <div v-if="imageSrc" class="mb-6">
        <img :src="imageSrc" :alt="dish.name" class="max-h-72 rounded-lg object-cover border border-gray-200" />
      </div>

      <!-- Metadata grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div v-if="dish.difficulty">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Difficulty</p>
          <p class="text-sm text-gray-800 capitalize">{{ dish.difficulty }}</p>
        </div>
        <div v-if="dish.timeEstimateMinutes">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Time</p>
          <p class="text-sm text-gray-800">{{ dish.timeEstimateMinutes }} min</p>
        </div>
        <div v-if="dish.yieldServings">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Yield</p>
          <p class="text-sm text-gray-800">{{ dish.yieldServings }} servings</p>
        </div>
        <div v-if="dish.season.length">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Season</p>
          <p class="text-sm text-gray-800 capitalize">{{ dish.season.join(', ') }}</p>
        </div>
        <div v-if="dish.sourceName || dish.sourceUrl">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Source</p>
          <a
            v-if="dish.sourceUrl"
            :href="dish.sourceUrl"
            target="_blank"
            rel="noopener"
            class="text-sm text-blue-600 hover:underline"
          >{{ dish.sourceName ?? dish.sourceUrl }}</a>
          <p v-else class="text-sm text-gray-800">{{ dish.sourceName }}</p>
        </div>
        <div v-if="dish.allergens.length">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Allergens</p>
          <p class="text-sm text-gray-800">{{ dish.allergens.join(', ') }}</p>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="dish.tags.length" class="mb-6">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Tags</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in dish.tags"
            :key="tag.id"
            class="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            :style="{ backgroundColor: tag.color ?? '#6b7280' }"
          >{{ tag.name }}</span>
        </div>
      </div>

      <!-- Ingredients -->
      <div v-if="dishIngredients && dishIngredients.length" class="mb-6">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Ingredients</p>
        <ul class="space-y-1">
          <li
            v-for="ing in dishIngredients"
            :key="ing.id"
            class="flex items-baseline gap-2 text-sm"
          >
            <span class="text-gray-800">{{ ing.rawText }}</span>
            <span class="text-xs text-gray-400">({{ ing.canonical.name }})</span>
          </li>
        </ul>
      </div>

      <!-- Notes -->
      <div v-if="dish.notes" class="mb-6">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ dish.notes }}</p>
      </div>

      <!-- Suggestion settings -->
      <div class="border-t border-gray-100 pt-4">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Suggestion settings</p>
        <div class="flex gap-6 text-sm text-gray-600">
          <span>Cooldown: <strong class="text-gray-900">{{ dish.cooldownDays }} days</strong></span>
          <span>Target: <strong class="text-gray-900">{{ dish.targetIntervalDays }} days</strong></span>
          <span v-if="dish.excludedFromSuggestions" class="text-amber-600 font-medium">Excluded from suggestions</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Dish } from '#shared/types/dish'
import type { DishIngredient } from '#shared/types/ingredient'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const id = computed(() => Number(route.params.id))

const { data: dish, isPending, error } = useQuery({
  queryKey: computed(() => queryKeys.dishes.detail(id.value)),
  queryFn: () => $fetch<Dish>(`/api/dishes/${id.value}`),
})

const { data: dishIngredients } = useQuery({
  queryKey: computed(() => queryKeys.dishIngredients.forDish(id.value)),
  queryFn: () => $fetch<DishIngredient[]>(`/api/dishes/${id.value}/ingredients`),
})

const imageSrc = computed(() => {
  if (!dish.value) return null
  if (dish.value.imageLocalPath) return `/api/images/${dish.value.imageLocalPath}`
  return dish.value.imageUrl ?? null
})

const { mutate: patchDish } = useMutation({
  mutationFn: (data: Partial<Dish>) =>
    $fetch<Dish>(`/api/dishes/${id.value}`, { method: 'PATCH', body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
  },
})

function toggleArchive() {
  if (!dish.value) return
  patchDish({ archived: !dish.value.archived })
}

const { mutate: deleteDish } = useMutation({
  mutationFn: () => $fetch<void>(`/api/dishes/${id.value}`, { method: 'DELETE' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
    router.push('/dishes')
  },
})

function confirmDelete() {
  if (confirm('Delete this dish? This cannot be undone.')) {
    deleteDish()
  }
}
</script>
