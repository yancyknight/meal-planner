<template>
  <div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/dishes" class="text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-gray-900">New dish</h1>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
      {{ error }}
    </div>

    <DishForm :loading="isPending" @submit="handleSubmit">
      <template #actions>
        <NuxtLink to="/dishes" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</NuxtLink>
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
