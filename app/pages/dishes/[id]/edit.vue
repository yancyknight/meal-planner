<template>
  <div class="max-w-2xl">
    <div class="mb-8">
      <NuxtLink :to="`/dishes/${id}`" class="text-sm text-text-subtle transition hover:text-text-muted">‹ Dish</NuxtLink>
      <div class="mt-2">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Edit</p>
        <h1 class="font-serif text-3xl font-semibold text-text">Edit dish</h1>
      </div>
    </div>

    <div v-if="loadPending" class="animate-pulse space-y-4">
      <div v-for="n in 5" :key="n" class="h-10 rounded bg-surface-alt" />
    </div>

    <div v-else-if="loadError || !dish" class="text-sm text-warning">Failed to load dish.</div>

    <template v-else>
      <div v-if="saveError" class="mb-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-warning">
        {{ saveError }}
      </div>

      <DishForm
        :initial-values="dish"
        :initial-ingredients="existingIngredients ?? []"
        submit-label="Save changes"
        :loading="savePending"
        @submit="handleSubmit"
      >
        <template #actions>
          <NuxtLink :to="`/dishes/${id}`" class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition hover:bg-surface-alt">Cancel</NuxtLink>
        </template>
      </DishForm>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateDishInput } from '#shared/schemas/dish'
import type { Dish } from '#shared/types/dish'
import type { DishIngredient } from '#shared/types/ingredient'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const id = computed(() => Number(route.params.id))
const saveError = ref<string>()

const { data: dish, isPending: loadPending, error: loadError } = useQuery({
  queryKey: computed(() => queryKeys.dishes.detail(id.value)),
  queryFn: () => $fetch<Dish>(`/api/dishes/${id.value}`),
})

const { data: existingIngredients } = useQuery({
  queryKey: computed(() => queryKeys.dishIngredients.forDish(id.value)),
  queryFn: () => $fetch<DishIngredient[]>(`/api/dishes/${id.value}/ingredients`),
})

const { mutateAsync, isPending: savePending } = useMutation({
  mutationFn: async (data: CreateDishInput & { pendingImageFile?: File; ingredients: DishIngredient[] }) => {
    let imageLocalPath = data.imageLocalPath ?? null

    if (data.pendingImageFile) {
      const formData = new FormData()
      formData.append('file', data.pendingImageFile)
      const result = await $fetch<{ filename: string }>('/api/images', {
        method: 'POST',
        body: formData,
      })
      imageLocalPath = result.filename
    }

    await $fetch<Dish>(`/api/dishes/${id.value}`, {
      method: 'PATCH',
      body: { ...data, pendingImageFile: undefined, ingredients: undefined, imageLocalPath },
    })

    await $fetch(`/api/dishes/${id.value}/ingredients`, {
      method: 'PUT',
      body: data.ingredients.map((i, idx) => ({
        rawText: i.rawText,
        canonicalIngredientId: i.canonicalIngredientId,
        sortOrder: idx,
      })),
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dishIngredients.forDish(id.value) })
    router.push(`/dishes/${id.value}`)
  },
})

async function handleSubmit(data: CreateDishInput & { pendingImageFile?: File; ingredients: DishIngredient[] }) {
  saveError.value = undefined
  try {
    await mutateAsync(data)
  }
  catch (e: unknown) {
    saveError.value = (e as { data?: { error?: string } })?.data?.error ?? 'Failed to save changes'
  }
}
</script>
