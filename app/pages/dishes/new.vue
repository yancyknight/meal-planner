<template>
  <div class="max-w-2xl">
    <div class="mb-8">
      <NuxtLink to="/dishes" class="text-sm text-text-subtle transition hover:text-text-muted">‹ Dishes</NuxtLink>
      <div class="mt-2">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">New</p>
        <h1 class="font-serif text-3xl font-semibold text-text">Add a dish</h1>
      </div>
    </div>

    <!-- Import from URL -->
    <div class="mb-8 rounded-xl border border-border bg-surface p-5">
      <p class="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Import from URL</p>
      <div class="flex gap-2">
        <input
          v-model="importUrl"
          type="url"
          placeholder="https://www.seriouseats.com/..."
          class="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          :disabled="importLoading"
          @keydown.enter.prevent="runImport"
        />
        <button
          type="button"
          :disabled="importLoading || !importUrl.trim()"
          class="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="runImport"
        >
          {{ importLoading ? 'Importing…' : 'Import' }}
        </button>
      </div>
      <p v-if="importError" class="mt-2 text-sm text-warning">{{ importError }}</p>
      <p v-if="importSuccess" class="mt-2 text-sm text-text-muted">
        Imported from <span class="font-medium text-text">{{ importSuccess }}</span>. Review the fields below before saving.
      </p>
    </div>

    <div v-if="saveError" class="mb-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-warning">
      {{ saveError }}
    </div>

    <DishForm
      :key="formKey"
      :initial-values="importedValues"
      :pending-ingredient-texts="importedIngredientTexts"
      :loading="isPending"
      @submit="handleSubmit"
    >
      <template #actions>
        <NuxtLink to="/dishes" class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition hover:bg-surface-alt">Cancel</NuxtLink>
      </template>
    </DishForm>
  </div>
</template>

<script setup lang="ts">
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateDishInput } from '#shared/schemas/dish'
import type { Dish } from '#shared/types/dish'
import type { CanonicalIngredient, IngredientRowValue } from '#shared/types/ingredient'
import type { RecipeImportResult } from '#shared/types/recipeImport'

const router = useRouter()
const queryClient = useQueryClient()
const saveError = ref<string>()

// Import state
const importUrl = ref('')
const importLoading = ref(false)
const importError = ref<string>()
const importSuccess = ref<string>()
const formKey = ref(0)
const importedValues = ref<Partial<CreateDishInput> | undefined>()
const importedIngredientTexts = ref<string[] | undefined>()

async function runImport() {
  const url = importUrl.value.trim()
  if (!url) return
  importError.value = undefined
  importSuccess.value = undefined
  importLoading.value = true
  try {
    const result = await $fetch<RecipeImportResult>('/api/dishes/import', {
      method: 'POST',
      body: { url },
    })
    importedValues.value = {
      name: result.name,
      imageUrl: result.imageUrl ?? null,
      timeEstimateMinutes: result.timeEstimateMinutes ?? null,
      yieldServings: result.yieldServings ?? null,
      sourceUrl: result.sourceUrl,
      sourceName: result.sourceName ?? null,
    }
    importedIngredientTexts.value = result.ingredientTexts
    importSuccess.value = result.sourceName ?? new URL(url).hostname
    formKey.value++
  }
  catch (e: unknown) {
    importError.value = (e as { data?: { error?: string } })?.data?.error ?? 'Import failed'
  }
  finally {
    importLoading.value = false
  }
}

async function resolveIngredients(rows: IngredientRowValue[]) {
  return Promise.all(
    rows
      .filter(r => r.rawText.trim())
      .map(async (r) => {
        if (r.canonicalIngredientId !== null) return r
        const canonical = await $fetch<CanonicalIngredient>('/api/canonical-ingredients', {
          method: 'POST',
          body: { name: r.rawText.trim() },
        })
        return { ...r, canonicalIngredientId: canonical.id }
      }),
  )
}

const { mutateAsync, isPending } = useMutation({
  mutationFn: async (data: CreateDishInput & { pendingImageFile?: File; ingredients: IngredientRowValue[] }) => {
    let imageLocalPath: string | null = null

    if (data.pendingImageFile) {
      const formData = new FormData()
      formData.append('file', data.pendingImageFile)
      const result = await $fetch<{ filename: string }>('/api/images', {
        method: 'POST',
        body: formData,
      })
      imageLocalPath = result.filename
    }

    const dish = await $fetch<Dish>('/api/dishes', {
      method: 'POST',
      body: { ...data, pendingImageFile: undefined, ingredients: undefined, imageLocalPath: imageLocalPath ?? data.imageLocalPath },
    })

    const resolved = await resolveIngredients(data.ingredients)
    if (resolved.length > 0) {
      await $fetch(`/api/dishes/${dish.id}/ingredients`, {
        method: 'PUT',
        body: resolved.map((i, idx) => ({
          rawText: i.rawText,
          canonicalIngredientId: i.canonicalIngredientId,
          sortOrder: idx,
        })),
      })
    }

    return dish
  },
  onSuccess: (dish) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dishIngredients.forDish(dish.id) })
    router.push(`/dishes/${dish.id}`)
  },
})

async function handleSubmit(data: CreateDishInput & { pendingImageFile?: File; ingredients: IngredientRowValue[] }) {
  saveError.value = undefined
  try {
    await mutateAsync(data)
  }
  catch (e: unknown) {
    saveError.value = (e as { data?: { error?: string } })?.data?.error ?? 'Failed to save dish'
  }
}
</script>
