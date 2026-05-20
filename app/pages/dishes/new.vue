<template>
  <div class="max-w-2xl">
    <div class="mb-8">
      <NuxtLink to="/dishes" class="text-sm text-text-subtle transition hover:text-text-muted">‹ Dishes</NuxtLink>
      <div class="mt-2">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">New</p>
        <h1 class="font-serif text-3xl font-semibold text-text">Add a dish</h1>
      </div>
    </div>

    <div v-if="error" class="mb-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-warning">
      {{ error }}
    </div>

    <DishForm :loading="isPending" @submit="handleSubmit">
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
import type { DishIngredient } from '#shared/types/ingredient'

const router = useRouter()
const queryClient = useQueryClient()
const error = ref<string>()

const { mutateAsync, isPending } = useMutation({
  mutationFn: async (data: CreateDishInput & { pendingImageFile?: File; ingredients: DishIngredient[] }) => {
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

    if (data.ingredients.length > 0) {
      await $fetch(`/api/dishes/${dish.id}/ingredients`, {
        method: 'PUT',
        body: data.ingredients.map((i, idx) => ({
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

async function handleSubmit(data: CreateDishInput & { pendingImageFile?: File; ingredients: DishIngredient[] }) {
  error.value = undefined
  try {
    await mutateAsync(data)
  }
  catch (e: unknown) {
    error.value = (e as { data?: { error?: string } })?.data?.error ?? 'Failed to save dish'
  }
}
</script>
