<template>
  <NuxtLink
    :to="`/dishes/${dish.id}`"
    class="block overflow-hidden rounded-lg border border-border bg-surface transition hover:shadow-sm"
  >
    <!-- Image -->
    <div class="relative h-40 bg-surface-alt">
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="dish.name"
        class="h-full w-full object-cover"
      >
      <div v-else class="flex h-full items-center justify-center text-text-subtle">
        <span class="text-4xl">✦</span>
      </div>
      <span
        v-if="dish.archived"
        class="absolute left-2 top-2 rounded-full bg-text/70 px-2 py-0.5 text-xs text-surface"
      >Archived</span>
    </div>

    <!-- Body -->
    <div class="p-4">
      <h3 class="font-serif text-base font-semibold leading-snug text-text">{{ dish.name }}</h3>

      <!-- Difficulty dots + time -->
      <div class="mt-2 flex items-center gap-3">
        <span v-if="dish.difficulty" class="flex items-center gap-0.5" :title="dish.difficulty">
          <span
            v-for="n in 3"
            :key="n"
            class="inline-block h-1.5 w-1.5 rounded-full"
            :class="n <= difficultyLevel ? 'bg-text-muted' : 'bg-text-subtle'"
          />
        </span>
        <span v-if="dish.timeEstimateMinutes" class="text-xs text-text-muted">{{ dish.timeEstimateMinutes }}m</span>
        <span v-if="dish.season.length" class="text-xs text-text-subtle capitalize">{{ dish.season.join(', ') }}</span>
      </div>

      <!-- Tags -->
      <div v-if="dish.tags.length" class="mt-2.5 flex flex-wrap gap-1">
        <span
          v-for="tag in dish.tags"
          :key="tag.id"
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
          :style="tag.color ? { backgroundColor: tag.color + '22', color: tag.color } : {}"
          :class="!tag.color ? 'bg-surface-alt text-text-muted' : ''"
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

const difficultyLevelMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
const difficultyLevel = computed(() => props.dish.difficulty ? (difficultyLevelMap[props.dish.difficulty] ?? 0) : 0)
</script>
