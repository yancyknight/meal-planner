<template>
  <div class="flex gap-3 flex-wrap">
    <label
      v-for="option in options"
      :key="option"
      class="flex items-center gap-1.5 cursor-pointer"
    >
      <input
        type="checkbox"
        :checked="modelValue.includes(option)"
        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        @change="toggle(option)"
      >
      <span class="text-sm text-gray-700 capitalize">{{ option }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string[]
  options: readonly string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

function toggle(option: string) {
  const next = props.modelValue.includes(option)
    ? props.modelValue.filter(v => v !== option)
    : [...props.modelValue, option]
  emit('update:modelValue', next)
}
</script>
