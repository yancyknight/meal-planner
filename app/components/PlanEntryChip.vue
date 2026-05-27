<template>
  <div
    class="relative rounded-lg border p-2.5 transition"
    :class="[entryClass, full ? 'flex items-start gap-3' : '', highlighted ? 'ring-2 ring-accent' : '']"
  >
    <!-- Thumbnail (full/day view only) -->
    <img
      v-if="full && thumbSrc"
      :src="thumbSrc"
      class="h-10 w-10 rounded object-cover flex-shrink-0"
    />

    <div class="min-w-0 flex-1 pr-12">
      <!-- Entry name — links to dish detail when a dish is attached -->
      <NuxtLink
        v-if="entry.dishId != null"
        :to="`/dishes/${entry.dishId}`"
        :title="label"
        class="line-clamp-2 text-sm font-medium leading-snug text-text hover:text-accent transition"
        @click.stop
      >{{ label }}</NuxtLink>
      <p v-else class="line-clamp-2 text-sm font-medium leading-snug text-text" :title="label">
        {{ label }}
      </p>

      <!-- Meta row -->
      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <!-- Freezer badge -->
        <span
          v-if="freezerLink"
          class="font-medium"
          style="color: var(--color-frost-ink, #3B82F6);"
        >❄</span>

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

      <!-- Freezer mark-used affordance -->
      <div v-if="freezerLink" class="mt-1.5">
        <button
          v-if="freezerLink.itemCount === 1 && freezerLink.singleItemId"
          type="button"
          class="text-xs font-medium transition"
          style="color: var(--color-frost-ink, #3B82F6);"
          :disabled="markingUsed"
          @click.stop="markUsed"
        >❄ Mark {{ freezerLink.singleItemName || 'item' }} as used</button>
        <NuxtLink
          v-else
          :to="`/freezer`"
          class="text-xs font-medium transition"
          style="color: var(--color-frost-ink, #3B82F6);"
          @click.stop
        >❄ {{ freezerLink.itemCount }} linked items — open in Freezer ↗</NuxtLink>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="absolute right-1 top-1 flex items-center gap-0.5">
      <button
        type="button"
        class="md:hidden flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded text-xs text-text-subtle hover:bg-surface-alt hover:text-text transition"
        title="Move to another slot"
        @click.stop="$emit('move')"
      >↗</button>
      <button
        type="button"
        class="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded text-xs text-text-subtle hover:bg-surface-alt hover:text-text transition"
        title="Remove"
        aria-label="Remove entry"
        @click.stop="$emit('delete')"
      >×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { PlanEntry } from '#shared/types/planEntry'
import type { AppSettings } from '#shared/types/settings'

interface FreezerLink {
  itemCount: number
  singleItemId: number | null
  singleItemName: string | null
}

const props = defineProps<{
  entry: PlanEntry
  full?: boolean
  highlighted?: boolean
  freezerLink?: FreezerLink
}>()

defineEmits<{ delete: [], move: [] }>()

const queryClient = useQueryClient()
const markingUsed = ref(false)

const { mutate: doMarkUsed } = useMutation({
  mutationFn: (id: number) => $fetch(`/api/freezer-items/${id}/use`, { method: 'POST' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.freezerItems.all() })
    queryClient.invalidateQueries({ queryKey: queryKeys.freezerPlannerFeed.all() })
  },
  onSettled: () => { markingUsed.value = false },
})

function markUsed() {
  const id = props.freezerLink?.singleItemId
  if (!id) return
  markingUsed.value = true
  doMarkUsed(id)
}

const { data: settings } = useQuery({
  queryKey: computed(() => queryKeys.settings.all()),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
  staleTime: 60_000,
})

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
  const householdSize = settings.value?.householdSize ?? 3
  return props.entry.dishYieldServings > householdSize + props.entry.guestCount
})

const entryClass = computed(() => {
  if (props.entry.entryKind === 'leftover') return 'border-leftover/30 bg-leftover/5'
  if (props.entry.entryKind === 'one-off') return 'border-border bg-surface-alt'
  return 'border-border bg-surface'
})
</script>
