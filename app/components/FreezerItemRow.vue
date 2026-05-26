<template>
  <div
    class="group border-b border-border last:border-0"
    :class="isExpired ? 'border-l-2' : ''"
    :style="isExpired ? { borderLeftColor: 'var(--color-expired-line)', background: 'var(--color-expired-soft)' } : {}"
  >
    <button
      type="button"
      class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-alt"
      @click="expanded = !expanded"
    >
      <!-- Item name + meta -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-text">{{ item.name }}</p>
        <p class="mt-0.5 font-mono text-xs" :class="isExpired ? 'text-expired-ink' : 'text-text-subtle'">
          <span v-if="isExpired">
            Expired {{ daysLabel }} · {{ item.tossByDate }}
          </span>
          <span v-else>
            Toss by {{ item.tossByDate }} {{ daysLabel }}
          </span>
        </p>
        <p v-if="item.targetUseDate" class="font-mono text-xs text-text-subtle">
          ideal by {{ item.targetUseDate }}
        </p>
      </div>

      <!-- Status badge -->
      <span
        v-if="item.status !== 'active'"
        class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
        :class="item.status === 'used' ? 'bg-surface-alt text-text-muted' : 'bg-expired text-expired-ink'"
      >{{ item.status }}</span>

      <!-- Expand indicator -->
      <span class="shrink-0 text-text-subtle text-xs">{{ expanded ? '▲' : '▼' }}</span>
    </button>

    <!-- Inline actions -->
    <div v-if="expanded" class="flex flex-wrap gap-2 border-t border-border bg-surface-alt px-4 py-3">
      <button
        v-if="item.status === 'active'"
        type="button"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
        @click="emit('markUsed', item.id)"
      >Mark Used</button>
      <button
        v-if="item.status === 'active'"
        type="button"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:border-warning hover:text-warning"
        @click="emit('markWasted', item.id)"
      >Mark Wasted</button>
      <button
        type="button"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
        @click="emit('edit', item.id)"
      >Edit</button>
      <button
        v-if="item.status === 'active' && freezers.length > 1"
        type="button"
        class="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
        @click="emit('move', item.id)"
      >Move to other freezer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FreezerItem, Freezer } from '#shared/types/freezer'

const props = defineProps<{
  item: FreezerItem
  freezers: Freezer[]
}>()

const emit = defineEmits<{
  markUsed: [id: number]
  markWasted: [id: number]
  edit: [id: number]
  move: [id: number]
}>()

const expanded = ref(false)

const today = new Date().toISOString().slice(0, 10)

const isExpired = computed(() => props.item.status === 'active' && props.item.tossByDate < today)

const daysLabel = computed(() => {
  const diff = Math.round(
    (new Date(props.item.tossByDate + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime())
    / 86400000,
  )
  if (diff === 0) return '· today'
  if (diff > 0) return `· in ${diff} day${diff === 1 ? '' : 's'}`
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} past`
})
</script>
