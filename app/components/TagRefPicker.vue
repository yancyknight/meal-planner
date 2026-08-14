<template>
  <div ref="containerRef" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-alt"
      :class="modelValue ? 'text-text' : 'text-text-muted'"
      @click="open = !open"
    >
      <span v-if="modelValue" class="flex items-center gap-1.5">
        <span v-if="selectedVirtual">{{ selectedVirtual.emoji }} {{ selectedVirtual.label }}</span>
        <span v-else-if="selectedReal">{{ selectedReal.name }}</span>
      </span>
      <span v-else>Pick a tag…</span>
      <span class="text-text-subtle">▾</span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-border bg-surface shadow-lg"
    >
      <!-- Search -->
      <div class="border-b border-border px-3 py-2">
        <input
          ref="searchRef"
          v-model="query"
          type="text"
          class="w-full bg-transparent text-sm outline-none placeholder:text-text-subtle"
          placeholder="Search tags…"
          @keydown.escape="open = false"
        >
      </div>

      <div class="max-h-56 overflow-y-auto py-1">
        <!-- Virtual tags -->
        <template v-if="filteredVirtual.length">
          <p class="px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-subtle">Virtual</p>
          <button
            v-for="tag in filteredVirtual"
            :key="tag.id"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-alt"
            @click="select({ kind: 'virtual', id: tag.id })"
          >
            <span>{{ tag.emoji }}</span>
            <span class="font-medium text-text">{{ tag.label }}</span>
            <span class="ml-auto text-xs italic text-text-muted">{{ tag.subLabel }}</span>
          </button>
        </template>

        <!-- Real tags -->
        <template v-if="filteredReal.length">
          <p class="px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-subtle" :class="filteredVirtual.length ? 'mt-1 border-t border-border pt-2' : ''">Tags</p>
          <button
            v-for="tag in filteredReal"
            :key="tag.id"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-alt"
            @click="select({ kind: 'real', tagId: tag.id })"
          >
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              :style="tag.color ? `background:${tag.color}` : 'background:var(--color-border)'"
            />
            <span class="text-text">{{ tag.name }}</span>
          </button>
        </template>

        <p v-if="!filteredVirtual.length && !filteredReal.length" class="px-3 py-3 text-sm text-text-muted">
          No tags found
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VIRTUAL_TAGS } from '#shared/virtualTags'
import type { TagRef } from '#shared/types/planningSession'
import type { Tag } from '#shared/types/tag'

const props = defineProps<{
  modelValue: TagRef | null
  showAllergens: boolean
  realTags: Tag[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TagRef | null]
}>()

const open = ref(false)
const query = ref('')
const containerRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

const visibleVirtual = computed(() =>
  VIRTUAL_TAGS.filter((t) => !t.isDietary || props.showAllergens),
)

const filteredVirtual = computed(() => {
  if (!query.value) return visibleVirtual.value
  const q = query.value.toLowerCase()
  return visibleVirtual.value.filter(
    (t) => t.label.includes(q) || t.subLabel.includes(q),
  )
})

const filteredReal = computed(() => {
  if (!query.value) return props.realTags
  const q = query.value.toLowerCase()
  return props.realTags.filter((t) => t.name.toLowerCase().includes(q))
})

const selectedVirtual = computed(() => {
  const v = props.modelValue
  if (!v || v.kind !== 'virtual') return null
  return VIRTUAL_TAGS.find((t) => t.id === v.id) ?? null
})

const selectedReal = computed(() => {
  const v = props.modelValue
  if (!v || v.kind !== 'real') return null
  return props.realTags.find((t) => t.id === v.tagId) ?? null
})

function select(tagRef: TagRef) {
  emit('update:modelValue', tagRef)
  open.value = false
  query.value = ''
}

watch(open, (val) => {
  if (val) {
    nextTick(() => searchRef.value?.focus())
  }
})

// Close on outside click
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})

function onOutsideClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
</script>
