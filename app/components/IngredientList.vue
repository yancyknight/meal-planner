<script setup lang="ts">
import { ref } from 'vue'
import type { DishIngredient, IngredientRowValue } from '../../shared/types/ingredient'
import { parseIngredientListText } from '#shared/utils/parseIngredientList'

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

const showPaste = ref(false)
const pasteText = ref('')

function openPaste() {
  showPaste.value = true
}

function cancelPaste() {
  showPaste.value = false
  pasteText.value = ''
}

function addPastedIngredients() {
  const lines = parseIngredientListText(pasteText.value)
  for (const line of lines) {
    rows.value.push({ key: nextKey++, rawText: line, canonicalIngredientId: null })
  }
  showPaste.value = false
  pasteText.value = ''
  if (lines.length > 0) emitUpdate()
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
    <div v-if="showPaste" class="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
      <label class="text-xs font-medium text-gray-500" for="ingredient-paste-textarea">
        Paste an ingredients list, one per line
      </label>
      <textarea
        id="ingredient-paste-textarea"
        v-model="pasteText"
        rows="6"
        placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
        class="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="!pasteText.trim()"
          class="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="addPastedIngredients"
        >
          Add ingredients
        </button>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          @click="cancelPaste"
        >
          Cancel
        </button>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="self-start rounded border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
        @click="addRow"
      >
        + Add ingredient
      </button>
      <button
        v-if="!showPaste"
        type="button"
        class="self-start rounded border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
        @click="openPaste"
      >
        Paste list
      </button>
    </div>
  </div>
</template>
