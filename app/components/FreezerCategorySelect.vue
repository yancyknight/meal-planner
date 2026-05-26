<template>
  <div class="space-y-2">
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="cat in visibleCategories"
        :key="cat.id"
        type="button"
        class="flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition min-h-[44px]"
        :class="modelValue === cat.id
          ? 'border-accent bg-accent-soft text-accent-deep'
          : 'border-border bg-surface hover:border-accent-soft hover:bg-surface-alt text-text'"
        @click="emit('update:modelValue', cat.id)"
      >
        <span class="text-sm font-medium leading-snug">{{ cat.name }}</span>
        <span class="font-mono text-xs text-text-subtle">{{ cat.defaultLifetimeDays }}d</span>
      </button>

      <button
        v-if="!showAll && categories.length > 8"
        type="button"
        class="col-span-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-muted transition hover:bg-surface-alt"
        @click="showAll = true"
      >
        more categories…
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FreezerCategory } from '#shared/types/freezer'

const props = defineProps<{
  modelValue: number | null
  categories: FreezerCategory[]
}>()

const emit = defineEmits<{
  'update:modelValue': [id: number]
}>()

const showAll = ref(false)

const visibleCategories = computed(() =>
  showAll.value ? props.categories : props.categories.slice(0, 8),
)
</script>
