<template>
  <div>
    <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Step 3 · Optional</p>
    <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-text mb-2">
      <em class="font-normal italic text-accent-deep">Anchors</em>
    </h2>
    <p class="text-sm text-text-muted mb-8">Fine-tune the plan. All three sections are optional — skip straight to drafting if you like.</p>

    <!-- Conflict warnings -->
    <div
      v-if="conflicts.length"
      class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 space-y-1"
    >
      <p class="text-sm font-medium text-amber-800">Heads up</p>
      <p v-for="w in conflicts" :key="w" class="text-sm text-amber-700">{{ w }}</p>
    </div>

    <!-- ── A · Session-wide constraints ─────────────────────────── -->
    <section class="mb-8">
      <div class="flex items-center gap-2 mb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-text-muted">A</span>
        <h3 class="text-sm font-semibold text-text">Session-wide constraints</h3>
      </div>
      <p class="text-xs text-text-muted mb-3">Only dishes matching all selected filters will be considered for any slot.</p>

      <VirtualTagPicker
        :model-value="localVirtualTags"
        :show-allergens="showAllergens"
        @update:model-value="onVirtualTagsChange"
      />

      <!-- Summary line -->
      <p class="mt-3 text-sm text-text-muted">
        <template v-if="localVirtualTags.length === 0">
          No constraints applied — all dishes are eligible.
        </template>
        <template v-else>
          Only dishes tagged
          <strong class="text-text">{{ virtualTagSummary }}</strong>
          will be considered.
        </template>
      </p>
    </section>

    <!-- ── B · Pin a tag to a slot ──────────────────────────────── -->
    <section class="mb-8">
      <div class="flex items-center gap-2 mb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-text-muted">B</span>
        <h3 class="text-sm font-semibold text-text">Pin a tag to a slot</h3>
      </div>
      <p class="text-xs text-text-muted mb-4">Require a specific tag (or virtual filter) in a particular slot. Multiple pins on the same slot are AND-combined.</p>

      <!-- Existing pins -->
      <div v-if="localPinnedTags.length" class="space-y-2 mb-4">
        <div
          v-for="(pin, i) in localPinnedTags"
          :key="i"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <span class="font-medium text-text">{{ formatPinDate(pin.date) }}</span>
          <span class="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-muted capitalize">{{ pin.mealType }}</span>
          <span class="text-text-subtle">must be</span>
          <span class="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text">
            <template v-if="pin.tagRef.kind === 'virtual'">
              {{ virtualTagLabel(pin.tagRef.id) }}
            </template>
            <template v-else>
              {{ realTagName(pin.tagRef.tagId) }}
            </template>
          </span>
          <button
            type="button"
            class="ml-auto text-text-subtle hover:text-text transition"
            title="Remove pin"
            @click="removePin(i)"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Add-pin row -->
      <div class="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-alt px-3 py-3">
        <!-- Date -->
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-subtle">Date</label>
          <select
            v-model="newPinDate"
            class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
          >
            <option v-for="day in weekDays" :key="day.iso" :value="day.iso">{{ day.label }}</option>
          </select>
        </div>

        <!-- Meal type -->
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-subtle">Meal</label>
          <select
            v-model="newPinMealType"
            class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text capitalize"
          >
            <option v-for="mt in session.mealTypes" :key="mt" :value="mt" class="capitalize">{{ mt }}</option>
          </select>
        </div>

        <!-- Tag picker -->
        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs text-text-subtle">Tag</label>
          <TagRefPicker
            :model-value="newPinTagRef"
            :show-allergens="showAllergens"
            :real-tags="allTags ?? []"
            @update:model-value="newPinTagRef = $event"
          />
        </div>

        <button
          type="button"
          class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40 hover:bg-accent-hover"
          :disabled="!newPinTagRef"
          @click="addPin"
        >
          + Pin
        </button>
      </div>
    </section>

    <!-- ── C · Wishlist tags ─────────────────────────────────────── -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-text-muted">C</span>
        <h3 class="text-sm font-semibold text-text">Include tag somewhere</h3>
      </div>
      <p class="text-xs text-text-muted mb-4">These tags must appear at least once in the plan, in whichever slot the engine picks.</p>

      <div v-if="!allTags?.length" class="text-sm text-text-muted">No tags in your library yet.</div>
      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="tag in allTags"
          :key="tag.id"
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
          :class="isWishlisted(tag.id)
            ? 'border-accent bg-accent text-white'
            : 'border-border bg-surface text-text hover:bg-surface-alt'"
          @click="toggleWishlist(tag.id)"
        >
          <span
            class="inline-block h-2 w-2 rounded-full"
            :style="tag.color ? `background:${tag.color}` : 'background:var(--color-border)'"
          />
          {{ tag.name }}
        </button>
      </div>

      <p v-if="localWishlistTags.length" class="mt-3 text-sm text-text-muted">
        {{ localWishlistTags.length }} tag{{ localWishlistTags.length !== 1 ? 's' : '' }} wishlisted.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { parseISO, addDays, format } from 'date-fns'
import type { PlanningSession, PinnedTag, TagRef } from '#shared/types/planningSession'
import type { Tag } from '#shared/types/tag'
import type { Dish } from '#shared/types/dish'
import type { AppSettings } from '#shared/types/settings'
import { VIRTUAL_TAGS, getVirtualTag } from '#shared/virtualTags'
import { detectAnchorConflicts } from '#shared/utils/anchorConflicts'

const props = defineProps<{
  session: PlanningSession
}>()

const emit = defineEmits<{
  update: [patch: Partial<PlanningSession>]
}>()

// ── Local state (mirrors session props) ──────────────────────────
const localVirtualTags = ref<string[]>([...props.session.sessionVirtualTags])
const localPinnedTags = ref<PinnedTag[]>(props.session.pinnedTags.map(p => ({ ...p })))
const localWishlistTags = ref<number[]>([...props.session.wishlistTags])

// ── Add-pin row state ────────────────────────────────────────────
const weekDays = computed(() => {
  const start = parseISO(props.session.weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    return { iso: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE MMM d') }
  })
})

const newPinDate = ref(weekDays.value[0]?.iso ?? '')
const newPinMealType = ref(props.session.mealTypes[0])
const newPinTagRef = ref<TagRef | null>(null)

// ── Remote data ──────────────────────────────────────────────────
const { data: settings } = useQuery({
  queryKey: queryKeys.settings.all(),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
})

const { data: allTags } = useQuery({
  queryKey: queryKeys.tags.all(),
  queryFn: () => $fetch<Tag[]>('/api/tags'),
})

const { data: allDishes } = useQuery({
  queryKey: queryKeys.dishes.list(),
  queryFn: () => $fetch<Dish[]>('/api/dishes'),
})

const showAllergens = computed(() => settings.value?.showAllergens ?? false)

// ── Conflict detection ───────────────────────────────────────────
const conflicts = computed(() => {
  if (!allDishes.value) return []
  return detectAnchorConflicts({
    sessionVirtualTagIds: localVirtualTags.value,
    pinnedTags: localPinnedTags.value,
    wishlistTagIds: localWishlistTags.value,
    dishes: allDishes.value,
    allTags: allTags.value ?? [],
  })
})

// ── Display helpers ──────────────────────────────────────────────
const virtualTagSummary = computed(() => {
  return localVirtualTags.value
    .map(id => getVirtualTag(id)?.label ?? id)
    .join(' + ')
})

function formatPinDate(iso: string): string {
  return format(parseISO(iso), 'EEE M/d')
}

function virtualTagLabel(id: string): string {
  const t = getVirtualTag(id)
  return t ? `${t.emoji} ${t.label}` : id
}

function realTagName(tagId: number): string {
  return allTags.value?.find(t => t.id === tagId)?.name ?? `#${tagId}`
}

function isWishlisted(tagId: number): boolean {
  return localWishlistTags.value.includes(tagId)
}

// ── Actions ──────────────────────────────────────────────────────
function onVirtualTagsChange(next: string[]) {
  localVirtualTags.value = next
  emitUpdate()
}

function addPin() {
  if (!newPinTagRef.value || !newPinDate.value || !newPinMealType.value) return

  // Prevent exact duplicate
  const isDup = localPinnedTags.value.some(p => {
    if (p.date !== newPinDate.value || p.mealType !== newPinMealType.value) return false
    if (p.tagRef.kind !== newPinTagRef.value!.kind) return false
    if (p.tagRef.kind === 'virtual' && newPinTagRef.value!.kind === 'virtual')
      return p.tagRef.id === newPinTagRef.value!.id
    if (p.tagRef.kind === 'real' && newPinTagRef.value!.kind === 'real')
      return p.tagRef.tagId === (newPinTagRef.value as { kind: 'real'; tagId: number }).tagId
    return false
  })
  if (isDup) return

  localPinnedTags.value.push({
    date: newPinDate.value,
    mealType: newPinMealType.value,
    tagRef: newPinTagRef.value,
  })
  newPinTagRef.value = null
  emitUpdate()
}

function removePin(index: number) {
  localPinnedTags.value.splice(index, 1)
  emitUpdate()
}

function toggleWishlist(tagId: number) {
  if (isWishlisted(tagId)) {
    localWishlistTags.value = localWishlistTags.value.filter(id => id !== tagId)
  } else {
    localWishlistTags.value.push(tagId)
  }
  emitUpdate()
}

function emitUpdate() {
  emit('update', {
    sessionVirtualTags: [...localVirtualTags.value],
    pinnedTags: localPinnedTags.value.map(p => ({ ...p })),
    wishlistTags: [...localWishlistTags.value],
  })
}
</script>
