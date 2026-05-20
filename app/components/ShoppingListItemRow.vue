<template>
  <div
    class="flex items-start gap-3 px-5 py-4 transition"
    :class="item.checked ? 'bg-surface-alt/50' : ''"
  >
    <!-- Checkbox -->
    <button
      type="button"
      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition"
      :class="item.checked
        ? 'border-accent bg-accent text-white'
        : 'border-border bg-surface hover:border-accent'"
      :aria-label="item.checked ? 'Uncheck' : 'Check'"
      @click="$emit('toggle', !item.checked)"
    >
      <span v-if="item.checked" class="text-xs leading-none">✓</span>
    </button>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="font-medium text-text transition"
          :class="item.checked ? 'line-through text-text-muted' : ''"
        >
          {{ item.canonicalName }}
        </span>
        <!-- Walmart link -->
        <a
          v-if="item.walmartUrl"
          :href="item.walmartUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-surface-alt transition shrink-0"
          title="View on Walmart"
        >
          Walmart ↗
        </a>
      </div>

      <!-- Raw texts -->
      <p class="mt-0.5 text-xs text-text-subtle leading-relaxed">
        {{ item.rawTexts.join(' · ') }}
      </p>

      <!-- Source dishes -->
      <div v-if="item.sourceDishNames.length" class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="(name, i) in item.sourceDishNames"
          :key="i"
          class="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-muted"
        >
          {{ name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShoppingListItem } from '#server/services/shoppingListService'

defineProps<{
  item: ShoppingListItem
}>()

defineEmits<{
  toggle: [checked: boolean]
}>()
</script>
