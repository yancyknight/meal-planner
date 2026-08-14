<template>
  <div>
    <div v-if="selectedTags.length" class="flex flex-wrap gap-1.5 mb-2">
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        :style="{ backgroundColor: tag.color ?? '#6b7280' }"
      >
        {{ tag.name }}
        <button type="button" class="hover:opacity-75 leading-none" @click="remove(tag.id)">×</button>
      </span>
    </div>

    <div class="relative">
      <input
        v-model="inputText"
        type="text"
        placeholder="Add tag…"
        class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        @focus="isOpen = true"
        @blur="isOpen = false"
        @keydown.enter.prevent="selectFirst"
        @keydown.escape="isOpen = false"
        @input="isOpen = true"
      >

      <div
        v-if="isOpen && (filteredTags.length || canCreate)"
        class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
      >
        <button
          v-for="tag in filteredTags"
          :key="tag.id"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
          @mousedown.prevent="select(tag)"
        >
          <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: tag.color ?? '#6b7280' }" />
          {{ tag.name }}
        </button>

        <button
          v-if="canCreate"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-blue-600 hover:bg-blue-50"
          @mousedown.prevent="createTag"
        >
          <span class="font-medium">+</span>
          Create "{{ inputText.trim() }}"
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Tag } from '#shared/types/tag'

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>()

const queryClient = useQueryClient()
const inputText = ref('')
const isOpen = ref(false)

const { data: allTags } = useQuery({
  queryKey: computed(() => queryKeys.tags.all()),
  queryFn: () => $fetch<Tag[]>('/api/tags'),
  initialData: [],
})

const selectedTags = computed(() =>
  (allTags.value ?? []).filter(t => props.modelValue.includes(t.id))
)

const filteredTags = computed(() => {
  const q = inputText.value.trim().toLowerCase()
  return (allTags.value ?? []).filter(t =>
    !props.modelValue.includes(t.id) && (!q || t.name.includes(q))
  )
})

const canCreate = computed(() => {
  const q = inputText.value.trim().toLowerCase()
  if (!q) return false
  return !(allTags.value ?? []).some(t => t.name === q)
})

function select(tag: Tag) {
  if (!props.modelValue.includes(tag.id)) {
    emit('update:modelValue', [...props.modelValue, tag.id])
  }
  inputText.value = ''
  isOpen.value = false
}

function remove(tagId: number) {
  emit('update:modelValue', props.modelValue.filter(id => id !== tagId))
}

function selectFirst() {
  if (filteredTags.value[0]) {
    select(filteredTags.value[0])
  } else if (canCreate.value) {
    createTag()
  }
}

const { mutate: doCreateTag } = useMutation({
  mutationFn: (name: string) =>
    $fetch<Tag>('/api/tags', { method: 'POST', body: { name } }),
  onSuccess: (tag) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() })
    emit('update:modelValue', [...props.modelValue, tag.id])
    inputText.value = ''
    isOpen.value = false
  },
})

function createTag() {
  const name = inputText.value.trim()
  if (name) doCreateTag(name)
}
</script>
