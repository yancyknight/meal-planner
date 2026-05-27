<template>
  <div
    class="flex items-start gap-3 px-5 py-4 transition"
    :class="item.checked ? 'bg-surface-alt/50' : ''"
  >
    <!-- Checkbox -->
    <button
      type="button"
      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition"
      :class="item.checked
        ? 'border-accent bg-accent text-white'
        : 'border-border bg-surface hover:border-accent'"
      :aria-label="item.checked ? 'Uncheck' : 'Check'"
      @click="$emit('toggle', !item.checked)"
    >
      <span v-if="item.checked" class="text-xs leading-none">✓</span>
    </button>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="font-medium text-text transition"
          :class="item.checked ? 'line-through text-text-muted' : ''"
        >
          {{ item.canonicalName ?? item.rawTexts[0] ?? '—' }}
        </span>
        <!-- Walmart link (only for canonical ingredient items) -->
        <template v-if="item.canonicalIngredientId != null">
          <a
            v-if="item.walmartUrl"
            :href="item.walmartUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-surface-alt transition shrink-0"
            title="View on Walmart"
          >
            Walmart ↗
          </a>
          <button
            v-else-if="!addingUrl"
            type="button"
            class="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-text-subtle hover:border-accent hover:text-accent transition shrink-0"
            @click="addingUrl = true"
          >
            + Walmart link
          </button>
        </template>
      </div>

      <!-- Inline Walmart URL input -->
      <form
        v-if="addingUrl"
        class="mt-2 flex items-center gap-2"
        @submit.prevent="submitUrl"
      >
        <input
          ref="urlInput"
          v-model="urlDraft"
          type="url"
          placeholder="https://www.walmart.com/ip/..."
          class="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          :disabled="!urlDraft.trim()"
          class="rounded px-2 py-1 text-xs font-medium bg-accent text-white hover:bg-accent-hover transition disabled:opacity-40 shrink-0"
        >
          Save
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-alt transition shrink-0"
          @click="cancelUrl"
        >
          Cancel
        </button>
      </form>

      <!-- Raw texts (only for canonical ingredient items) -->
      <p v-if="item.canonicalName" class="mt-0.5 text-xs text-text-subtle leading-relaxed">
        {{ item.rawTexts.join(' · ') }}
      </p>

      <!-- Source dishes -->
      <div v-if="item.sourceDishNames.length" class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="(name, i) in item.sourceDishNames"
          :key="i"
          class="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-muted"
        >
          {{ name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShoppingListItem } from '#server/services/shoppingListService'

defineProps<{
  item: ShoppingListItem
}>()

const emit = defineEmits<{
  toggle: [checked: boolean]
  setWalmartUrl: [url: string]
}>()

const addingUrl = ref(false)
const urlDraft = ref('')
const urlInput = ref<HTMLInputElement | null>(null)

watch(addingUrl, (val) => {
  if (val) nextTick(() => urlInput.value?.focus())
})

function submitUrl() {
  const url = urlDraft.value.trim()
  if (!url) return
  emit('setWalmartUrl', url)
  addingUrl.value = false
  urlDraft.value = ''
}

function cancelUrl() {
  addingUrl.value = false
  urlDraft.value = ''
}
</script>
