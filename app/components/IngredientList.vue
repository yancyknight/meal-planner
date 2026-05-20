<script setup lang="ts">
import { ref } from 'vue'
import type { DishIngredient } from '../../shared/types/ingredient'

interface IngredientRow {
  key: number
  rawText: string
  canonicalIngredientId: number | null
  canonicalName?: string
}

const props = defineProps<{
  modelValue: DishIngredient[]
  pendingTexts?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [DishIngredient[]]
}>()

let nextKey = 0

function toRows(ingredients: DishIngredient[]): IngredientRow[] {
  return ingredients.map(i => ({
    key: nextKey++,
    rawText: i.rawText,
    canonicalIngredientId: i.canonicalIngredientId,
    canonicalName: i.canonical.name,
  }))
}

const rows = ref<IngredientRow[]>(
  props.pendingTexts && props.pendingTexts.length > 0
    ? props.pendingTexts.map(text => ({ key: nextKey++, rawText: text, canonicalIngredientId: null }))
    : toRows(props.modelValue),
)

watch(() => props.modelValue, (val) => {
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

function updateRow(index: number, data: { rawText: string; canonicalIngredientId: number | null }) {
  rows.value[index] = { ...rows.value[index]!, ...data }
  emitUpdate()
}

function emitUpdate() {
  const result = rows.value
    .filter(r => r.rawText.trim() && r.canonicalIngredientId !== null)
    .map((r, idx) => ({
      id: 0,
      dishId: 0,
      canonicalIngredientId: r.canonicalIngredientId!,
      rawText: r.rawText,
      sortOrder: idx,
      canonical: { id: r.canonicalIngredientId!, name: r.canonicalName ?? '', walmartUrl: null, createdAt: '', updatedAt: '' },
    }))
  emit('update:modelValue', result)
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
