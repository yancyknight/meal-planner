<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="tag in visibleTags"
      :key="tag.id"
      type="button"
      class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
      :class="isSelected(tag.id)
        ? 'border-accent bg-accent text-white'
        : 'border-border bg-surface text-text hover:bg-surface-alt'"
      @click="toggle(tag.id)"
    >
      <span>{{ tag.emoji }}</span>
      <span class="font-medium">{{ tag.label }}</span>
      <span
        class="text-xs"
        :class="isSelected(tag.id) ? 'text-white/70' : 'text-text-muted'"
      >{{ tag.subLabel }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { VIRTUAL_TAGS } from '#shared/virtualTags'

const props = defineProps<{
  modelValue: string[]
  showAllergens: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const visibleTags = computed(() =>
  VIRTUAL_TAGS.filter((t) => !t.isDietary || props.showAllergens),
)

function isSelected(id: string) {
  return props.modelValue.includes(id)
}

function toggle(id: string) {
  const next = isSelected(id)
    ? props.modelValue.filter((v) => v !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}
</script>
