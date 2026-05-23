<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { queryKeys } from '../composables/queryKeys'
import type { CanonicalIngredient, FuzzyMatch } from '../../shared/types/ingredient'
import { extractIngredientName } from '#shared/utils/ingredientExtract'

interface Props {
  rawText: string
  canonicalIngredientId: number | null
  canonicalName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [{ rawText: string; canonicalIngredientId: number | null; canonicalName?: string }]
  remove: []
}>()

const rawText = ref(props.rawText)
const linkedCanonical = ref<CanonicalIngredient | null>(
  props.canonicalIngredientId
    ? { id: props.canonicalIngredientId, name: props.canonicalName ?? '', walmartUrl: null, createdAt: '', updatedAt: '' }
    : null,
)
const searchQuery = ref('')
const showSuggestions = ref(false)
const showManualSearch = ref(false)
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Auto-suggest when raw text changes (debounced)
watch(rawText, (val) => {
  if (linkedCanonical.value) return
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    const extracted = extractIngredientName(val)
    if (extracted.length >= 2) {
      searchQuery.value = extracted
      manualSearchQuery.value = extracted
      showSuggestions.value = true
    }
    else {
      showSuggestions.value = false
    }
  }, 350)
})

const { data: suggestions } = useQuery({
  queryKey: computed(() => queryKeys.canonicalIngredients.search(searchQuery.value)),
  queryFn: async () => {
    if (!searchQuery.value) return []
    const res = await $fetch<FuzzyMatch[]>(`/api/canonical-ingredients/search?q=${encodeURIComponent(searchQuery.value)}`)
    return res
  },
  enabled: computed(() => showSuggestions.value && searchQuery.value.length >= 2),
})

const manualSearchQuery = ref('')
const { data: manualResults } = useQuery({
  queryKey: computed(() => queryKeys.canonicalIngredients.search('manual:' + manualSearchQuery.value)),
  queryFn: async () => {
    if (!manualSearchQuery.value) return []
    const res = await $fetch<FuzzyMatch[]>(`/api/canonical-ingredients/search?q=${encodeURIComponent(manualSearchQuery.value)}`)
    return res
  },
  enabled: computed(() => showManualSearch.value && manualSearchQuery.value.length >= 1),
})

function acceptSuggestion(canonical: CanonicalIngredient) {
  linkedCanonical.value = canonical
  showSuggestions.value = false
  showManualSearch.value = false
  emit('update', { rawText: rawText.value, canonicalIngredientId: canonical.id, canonicalName: canonical.name })
}

function rejectSuggestion() {
  showSuggestions.value = false
  showManualSearch.value = true
  manualSearchQuery.value = extractIngredientName(rawText.value)
}

function clearLink() {
  linkedCanonical.value = null
  showSuggestions.value = false
  showManualSearch.value = false
  emit('update', { rawText: rawText.value, canonicalIngredientId: null })
}

async function createAndLink() {
  const name = manualSearchQuery.value.trim() || extractIngredientName(rawText.value)
  if (!name) return
  const canonical = await $fetch<CanonicalIngredient>('/api/canonical-ingredients', {
    method: 'POST',
    body: { name },
  })
  acceptSuggestion(canonical)
}

function onRawTextBlur() {
  emit('update', { rawText: rawText.value, canonicalIngredientId: linkedCanonical.value?.id ?? null })
}
</script>

<template>
  <div class="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
    <div class="flex items-center gap-2">
      <input
        v-model="rawText"
        type="text"
        placeholder="e.g. 3 cloves garlic, minced"
        class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
        @blur="onRawTextBlur"
      >
      <button
        type="button"
        class="shrink-0 text-gray-400 hover:text-red-500"
        aria-label="Remove ingredient"
        @click="emit('remove')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Linked canonical -->
    <div v-if="linkedCanonical" class="flex items-center gap-1 text-xs">
      <span class="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{{ linkedCanonical.name }}</span>
      <button type="button" class="text-gray-400 hover:text-gray-600" @click="clearLink">
        change
      </button>
    </div>

    <!-- Auto-suggest panel -->
    <div v-else-if="showSuggestions && suggestions && suggestions.length > 0" class="flex flex-col gap-1">
      <p class="text-xs text-gray-500">
        Did you mean:
      </p>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="match in suggestions.slice(0, 5)"
          :key="match.canonical.id"
          type="button"
          class="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          @click="acceptSuggestion(match.canonical)"
        >
          {{ match.canonical.name }}
        </button>
        <button type="button" class="text-xs text-gray-400 hover:text-gray-600" @click="rejectSuggestion">
          none of these
        </button>
      </div>
    </div>

    <!-- Manual search/create panel -->
    <div v-else-if="showManualSearch || (showSuggestions && suggestions && suggestions.length === 0)" class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <input
          v-model="manualSearchQuery"
          type="text"
          placeholder="Search or create ingredient..."
          class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
        >
      </div>
      <div v-if="manualResults && manualResults.length > 0" class="flex flex-wrap gap-1">
        <button
          v-for="match in manualResults.slice(0, 5)"
          :key="match.canonical.id"
          type="button"
          class="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          @click="acceptSuggestion(match.canonical)"
        >
          {{ match.canonical.name }}
        </button>
      </div>
      <button
        type="button"
        class="self-start rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700"
        @click="createAndLink"
      >
        + Create "{{ manualSearchQuery.trim() || extractIngredientName(rawText) }}"
      </button>
    </div>

    <!-- Prompt to link when raw text present but no canonical -->
    <div v-else-if="rawText.trim() && !linkedCanonical && !showSuggestions" class="text-xs text-amber-600">
      <button type="button" class="underline hover:no-underline" @click="showManualSearch = true">
        Link to ingredient
      </button>
    </div>
  </div>
</template>
