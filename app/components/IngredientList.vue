<script setup lang="ts">
import { ref } from 'vue'
import type { DishIngredient, IngredientRowValue } from '../../shared/types/ingredient'

interface IngredientRow {
  key: number
  rawText: string
  canonicalIngredientId: number | null
  canonicalName?: string
}

const props = defineProps<{
  modelValue: IngredientRowValue[]
  pendingTexts?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [IngredientRowValue[]]
}>()

let nextKey = 0

function toRows(ingredients: (DishIngredient | IngredientRowValue)[]): IngredientRow[] {
  return ingredients.map(i => ({
    key: nextKey++,
    rawText: i.rawText,
    canonicalIngredientId: i.canonicalIngredientId,
    canonicalName: 'canonical' in i ? i.canonical.name : (i as IngredientRowValue).canonicalName,
  }))
}

const rows = ref<IngredientRow[]>(
  props.pendingTexts && props.pendingTexts.length > 0
    ? props.pendingTexts.map(text => ({ key: nextKey++, rawText: text, canonicalIngredientId: null }))
    : toRows(props.modelValue),
)

// Suppresses the modelValue watcher while we are the ones emitting the change,
// preventing a round-trip that would wipe unlinked rows from local state.
let isEmitting = false

watch(() => props.modelValue, (val) => {
  if (isEmitting) return
  if (val.length === 0 && rows.value.length === 0) return
  rows.value = toRows(val)
}, { deep: false })

function addRow() {
  rows.value.push({ key: nextKey++, rawText: '', canonicalIngredientId: null })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emitUpdate()
}

function updateRow(index: number, data: { rawText: string; canonicalIngredientId: number | null; canonicalName?: string }) {
  rows.value[index] = { ...rows.value[index]!, ...data }
  emitUpdate()
}

function emitUpdate() {
  isEmitting = true
  const result: IngredientRowValue[] = rows.value
    .filter(r => r.rawText.trim())
    .map(r => ({
      rawText: r.rawText,
      canonicalIngredientId: r.canonicalIngredientId,
      canonicalName: r.canonicalName,
    }))
  emit('update:modelValue', result)
  nextTick(() => { isEmitting = false })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <IngredientEntry
      v-for="(row, idx) in rows"
      :key="row.key"
      :raw-text="row.rawText"
      :canonical-ingredient-id="row.canonicalIngredientId"
      :canonical-name="row.canonicalName"
      @update="updateRow(idx, $event)"
      @remove="removeRow(idx)"
    />
    <button
      type="button"
      class="self-start rounded border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
      @click="addRow"
    >
      + Add ingredient
    </button>
  </div>
</template>
