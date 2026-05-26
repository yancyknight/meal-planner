<template>
  <section v-if="groups.length || showWhenEmpty" class="space-y-4">
    <!-- Bucket header -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium uppercase tracking-wide" :class="headerClass">
        {{ icon }} {{ label }}
      </span>
      <span class="font-mono text-xs text-text-subtle">— {{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</span>
    </div>

    <!-- Empty state -->
    <p v-if="!groups.length" class="text-sm text-text-subtle">Nothing here.</p>

    <!-- Per-freezer groups -->
    <div v-for="group in groups" :key="group.freezer.id" class="overflow-hidden rounded-lg border border-border bg-surface">
      <!-- Freezer sub-header -->
      <div class="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2">
        <NuxtLink
          :to="`/freezer/${group.freezer.id}`"
          class="text-xs font-medium text-text-muted hover:text-text"
        >{{ group.freezer.name }}</NuxtLink>
        <span class="font-mono text-xs text-text-subtle">{{ group.items.length }}</span>
      </div>

      <!-- Items -->
      <FreezerItemRow
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        :freezers="allFreezers"
        @mark-used="emit('markUsed', $event)"
        @mark-wasted="emit('markWasted', $event)"
        @edit="emit('edit', $event)"
        @move="emit('move', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FreezerBucketGroup, Freezer } from '#shared/types/freezer'

const props = defineProps<{
  label: string
  icon: string
  groups: FreezerBucketGroup[]
  allFreezers: Freezer[]
  variant: 'expired' | 'approaching' | 'recent'
  showWhenEmpty?: boolean
}>()

const emit = defineEmits<{
  markUsed: [id: number]
  markWasted: [id: number]
  edit: [id: number]
  move: [id: number]
}>()

const totalItems = computed(() => props.groups.reduce((sum, g) => sum + g.items.length, 0))

const headerClass = computed(() => ({
  'text-expired-ink': props.variant === 'expired',
  'text-warning': props.variant === 'approaching',
  'text-text-muted': props.variant === 'recent',
}))
</script>
