<template>
  <div>
    <div v-if="presets?.length" class="flex flex-wrap gap-2 mb-2">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        :class="[
          'px-3 py-1 rounded-full text-sm border transition-colors',
          modelValue.includes(preset)
            ? 'bg-red-100 border-red-300 text-red-700'
            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200',
        ]"
        @click="toggle(preset)"
      >
        {{ preset }}
      </button>
    </div>

    <div class="flex gap-2">
      <input
        v-model="inputText"
        type="text"
        :placeholder="placeholder"
        class="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keydown.enter.prevent="add"
      />
      <button
        type="button"
        class="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        @click="add"
      >Add</button>
    </div>

    <div v-if="customTags.length" class="flex flex-wrap gap-2 mt-2">
      <span
        v-for="tag in customTags"
        :key="tag"
        class="px-2 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs flex items-center gap-1"
      >
        {{ tag }}
        <button type="button" class="hover:text-red-600" @click="remove(tag)">×</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string[]
  presets?: readonly string[]
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Add tag...',
})

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const inputText = ref('')

const customTags = computed(() =>
  props.presets
    ? props.modelValue.filter(v => !(props.presets as readonly string[]).includes(v))
    : props.modelValue
)

function toggle(tag: string) {
  const next = props.modelValue.includes(tag)
    ? props.modelValue.filter(v => v !== tag)
    : [...props.modelValue, tag]
  emit('update:modelValue', next)
}

function add() {
  const val = inputText.value.trim().toLowerCase()
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  inputText.value = ''
}

function remove(tag: string) {
  emit('update:modelValue', props.modelValue.filter(v => v !== tag))
}
</script>
