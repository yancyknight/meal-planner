<template>
  <div
    class="group relative rounded-lg border p-2.5 transition"
    :class="[entryClass, full ? 'flex items-start gap-3' : '']"
  >
    <!-- Thumbnail (full/day view only) -->
    <img
      v-if="full && thumbSrc"
      :src="thumbSrc"
      class="h-10 w-10 rounded object-cover flex-shrink-0"
    />

    <div class="min-w-0 flex-1">
      <!-- Entry name -->
      <p class="truncate text-sm font-medium leading-snug text-text">
        {{ label }}
      </p>

      <!-- Meta row -->
      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <!-- Leftover badge -->
        <span v-if="entry.entryKind === 'leftover'" class="text-leftover font-medium">↻ leftover</span>

        <!-- One-off badge -->
        <span v-if="entry.entryKind === 'one-off'" class="text-text-subtle italic">one-off</span>

        <!-- Leftovers available indicator (fresh only) -->
        <span
          v-if="entry.entryKind === 'fresh' && hasLeftoversAvailable"
          class="text-leftover"
          title="Leftovers expected"
        >↻ leftovers</span>
      </div>
    </div>

    <!-- Delete button -->
    <button
      type="button"
      class="absolute right-1 top-1 hidden rounded p-0.5 text-xs text-text-subtle hover:text-text group-hover:flex items-center"
      title="Remove"
      @click.stop="$emit('delete')"
    >×</button>
  </div>
</template>

<script setup lang="ts">
import type { PlanEntry } from '#shared/types/planEntry'

// Hardcoded until M6 (App Settings) provides the real value.
const HOUSEHOLD_SIZE = 3

const props = defineProps<{
  entry: PlanEntry
  full?: boolean
}>()

defineEmits<{ delete: [] }>()

const label = computed(() => {
  if (props.entry.entryKind === 'one-off') return props.entry.oneOffText ?? '—'
  return props.entry.dishName ?? '—'
})

const thumbSrc = computed(() => {
  if (!props.entry.dishImageLocalPath && !props.entry.dishImageUrl) return null
  return props.entry.dishImageLocalPath
    ? `/api/images/${props.entry.dishImageLocalPath}`
    : props.entry.dishImageUrl
})

const hasLeftoversAvailable = computed(() => {
  if (props.entry.dishYieldServings == null) return false
  return props.entry.dishYieldServings > HOUSEHOLD_SIZE + props.entry.guestCount
})

const entryClass = computed(() => {
  if (props.entry.entryKind === 'leftover') return 'border-leftover/30 bg-leftover/5'
  if (props.entry.entryKind === 'one-off') return 'border-border bg-surface-alt'
  return 'border-border bg-surface'
})
</script>
