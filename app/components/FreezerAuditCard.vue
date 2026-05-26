<template>
  <div class="rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <!-- Progress -->
    <p class="mb-4 text-center font-mono text-xs text-text-subtle">{{ current }} / {{ total }}</p>

    <!-- Item info -->
    <div class="mb-6 text-center">
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">{{ item.categoryName }}</p>
      <h2 class="font-serif text-2xl font-semibold text-text">{{ item.name }}</h2>
      <p class="mt-2 font-mono text-xs text-text-subtle">Toss by {{ item.tossByDate }}</p>
      <p v-if="item.notes" class="mt-1 text-sm text-text-muted">{{ item.notes }}</p>
    </div>

    <!-- Three primary actions -->
    <div class="grid grid-cols-3 gap-3">
      <button
        type="button"
        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-alt px-2 py-3 text-sm font-medium text-text transition hover:bg-surface-alt/80 active:scale-95"
        :disabled="busy"
        @click="$emit('still-here')"
      >
        <span class="text-lg">✓</span>
        <span>Still here</span>
      </button>
      <button
        type="button"
        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-accent px-2 py-3 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-95"
        :disabled="busy"
        @click="$emit('used')"
      >
        <span class="text-lg">✓</span>
        <span>Used</span>
      </button>
      <button
        type="button"
        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 py-3 text-sm font-medium text-text-muted transition hover:bg-surface-alt active:scale-95"
        :disabled="busy"
        @click="$emit('wasted')"
      >
        <span class="text-lg">✗</span>
        <span>Wasted</span>
      </button>
    </div>

    <!-- Skip -->
    <div class="mt-4 text-center">
      <button
        type="button"
        class="text-xs text-text-subtle underline underline-offset-2"
        :disabled="busy"
        @click="$emit('skip')"
      >Skip</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  item: {
    id: number
    name: string
    categoryName: string
    tossByDate: string
    notes: string | null
  }
  current: number
  total: number
  busy: boolean
}>()

defineEmits<{
  'still-here': []
  used: []
  wasted: []
  skip: []
}>()
</script>
