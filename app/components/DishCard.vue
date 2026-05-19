<template>
  <NuxtLink
    :to="`/dishes/${dish.id}`"
    class="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
  >
    <div class="h-36 bg-gray-100 relative">
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="dish.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
        <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <span
        v-if="dish.archived"
        class="absolute top-2 left-2 px-2 py-0.5 bg-gray-700 text-white text-xs rounded-full"
      >Archived</span>
    </div>
    <div class="p-3">
      <h3 class="font-medium text-gray-900 text-sm truncate">{{ dish.name }}</h3>
      <div class="flex items-center gap-2 mt-1.5 flex-wrap">
        <span
          v-if="dish.difficulty"
          :class="['px-2 py-0.5 rounded-full text-xs font-medium', difficultyClass]"
        >{{ dish.difficulty }}</span>
        <span v-if="dish.timeEstimateMinutes" class="text-xs text-gray-400">{{ dish.timeEstimateMinutes }}m</span>
        <span v-if="dish.season.length" class="text-xs text-gray-400">{{ dish.season.join(', ') }}</span>
      </div>
      <div v-if="dish.tags.length" class="flex flex-wrap gap-1 mt-1.5">
        <span
          v-for="tag in dish.tags"
          :key="tag.id"
          class="px-1.5 py-0.5 rounded-full text-xs font-medium text-white leading-tight"
          :style="{ backgroundColor: tag.color ?? '#6b7280' }"
        >{{ tag.name }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Dish } from '#shared/types/dish'

const props = defineProps<{ dish: Dish }>()

const imageSrc = computed(() => {
  if (props.dish.imageLocalPath) return `/api/images/${props.dish.imageLocalPath}`
  return props.dish.imageUrl ?? null
})

const difficultyClass = computed(() => {
  if (!props.dish.difficulty) return ''
  return { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' }[props.dish.difficulty]
})
</script>
