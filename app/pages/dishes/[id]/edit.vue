<template>
  <div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink :to="`/dishes/${id}`" class="text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-gray-900">Edit dish</h1>
    </div>

    <div v-if="loadPending" class="animate-pulse space-y-4">
      <div v-for="n in 5" :key="n" class="h-10 bg-gray-200 rounded" />
    </div>

    <div v-else-if="loadError || !dish" class="text-red-600 text-sm">Failed to load dish.</div>

    <template v-else>
      <div v-if="saveError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        {{ saveError }}
      </div>

      <DishForm
        :initial-values="dish"
        submit-label="Save changes"
        :loading="savePending"
        @submit="handleSubmit"
      >
        <template #actions>
          <NuxtLink :to="`/dishes/${id}`" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</NuxtLink>
        </template>
      </DishForm>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateDishInput } from '#shared/schemas/dish'
import type { Dish } from '#shared/types/dish'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const id = computed(() => Number(route.params.id))
const saveError = ref<string>()

const { data: dish, isPending: loadPending, error: loadError } = useQuery({
  queryKey: computed(() => queryKeys.dishes.detail(id.value)),
  queryFn: () => $fetch<Dish>(`/api/dishes/${id.value}`),
})

const { mutateAsync, isPending: savePending } = useMutation({
  mutationFn: async (data: CreateDishInput & { pendingImageFile?: File }) => {
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

    return $fetch<Dish>(`/api/dishes/${id.value}`, {
      method: 'PATCH',
      body: { ...data, pendingImageFile: undefined, imageLocalPath },
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
    router.push(`/dishes/${id.value}`)
  },
})

async function handleSubmit(data: CreateDishInput & { pendingImageFile?: File }) {
  saveError.value = undefined
  try {
    await mutateAsync(data)
  }
  catch (e: unknown) {
    saveError.value = (e as { data?: { error?: string } })?.data?.error ?? 'Failed to save changes'
  }
}
</script>
