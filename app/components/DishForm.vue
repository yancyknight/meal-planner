<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
      <input
        v-model="form.name"
        type="text"
        required
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="e.g. Spaghetti Carbonara"
      />
    </div>

    <!-- Image -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Image</label>
      <div
        v-if="imagePreview"
        class="mb-2 relative inline-block"
      >
        <img :src="imagePreview" alt="Dish preview" class="h-32 w-48 object-cover rounded-md border border-gray-200" />
        <button
          type="button"
          class="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-500 text-xs"
          @click="clearImage"
        >×</button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        @change="handleFileChange"
      />
      <p class="text-xs text-gray-400 mt-1">Or enter an image URL:</p>
      <input
        v-model="form.imageUrl"
        type="url"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="https://..."
        @blur="onImageUrlBlur"
      />
    </div>

    <!-- Source -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
        <input
          v-model="form.sourceUrl"
          type="url"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://..."
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
        <input
          v-model="form.sourceName"
          type="text"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. NYT Cooking"
        />
      </div>
    </div>

    <!-- Time, Yield, Difficulty -->
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
        <input
          v-model.number="form.timeEstimateMinutes"
          type="number"
          min="1"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="30"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Yield (servings)</label>
        <input
          v-model.number="form.yieldServings"
          type="number"
          min="1"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="4"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
        <select
          v-model="form.difficulty"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option :value="null">—</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>

    <!-- Allergens -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
      <TagInput
        v-model="form.allergens"
        :presets="ALLERGEN_PRESETS"
        placeholder="Add custom allergen..."
      />
    </div>

    <!-- Season -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Season <span class="text-gray-400 text-xs font-normal">(empty = year-round)</span></label>
      <CheckboxGroup
        :model-value="form.season"
        :options="SEASON_OPTIONS"
        @update:model-value="form.season = $event as typeof form.season"
      />
    </div>

    <!-- Tags -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
      <DishTagSelector v-model="form.tagIds" />
    </div>

    <!-- Ingredients -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
      <IngredientList v-model="ingredients" />
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
      <textarea
        v-model="form.notes"
        rows="3"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Internal notes, variations, tips..."
      />
    </div>

    <!-- Submit -->
    <div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
      <slot name="actions" />
      <button
        type="submit"
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Saving…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { CreateDishInput } from '#shared/schemas/dish'
import { ALLERGEN_PRESETS, SEASON_OPTIONS } from '#shared/schemas/dish'
import type { Tag } from '#shared/types/tag'
import type { DishIngredient } from '#shared/types/ingredient'

interface Props {
  initialValues?: Partial<CreateDishInput> & { imageLocalPath?: string | null; tags?: Tag[] }
  initialIngredients?: DishIngredient[]
  submitLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save dish',
  loading: false,
})

const emit = defineEmits<{
  submit: [data: CreateDishInput & { tagIds: number[]; pendingImageFile?: File; ingredients: DishIngredient[] }]
}>()

const fileInputRef = ref<HTMLInputElement>()
const pendingImageFile = ref<File>()
const imagePreview = ref<string>()
const ingredients = ref<DishIngredient[]>(props.initialIngredients ?? [])

watch(() => props.initialIngredients, (val) => {
  if (val && val.length > 0 && ingredients.value.length === 0) {
    ingredients.value = val
  }
})

type DishFormState = Omit<CreateDishInput, 'allergens' | 'season' | 'tagIds'> & {
  allergens: string[]
  season: (typeof SEASON_OPTIONS)[number][]
  tagIds: number[]
}

const form = reactive<DishFormState>({
  name: props.initialValues?.name ?? '',
  imageUrl: props.initialValues?.imageUrl ?? null,
  imageLocalPath: props.initialValues?.imageLocalPath ?? null,
  timeEstimateMinutes: props.initialValues?.timeEstimateMinutes ?? null,
  yieldServings: props.initialValues?.yieldServings ?? null,
  sourceUrl: props.initialValues?.sourceUrl ?? null,
  sourceName: props.initialValues?.sourceName ?? null,
  difficulty: props.initialValues?.difficulty ?? null,
  allergens: [...(props.initialValues?.allergens ?? [])],
  season: [...(props.initialValues?.season ?? [])] as (typeof SEASON_OPTIONS)[number][],
  notes: props.initialValues?.notes ?? null,
  cooldownDays: props.initialValues?.cooldownDays ?? 7,
  targetIntervalDays: props.initialValues?.targetIntervalDays ?? 14,
  excludedFromSuggestions: props.initialValues?.excludedFromSuggestions ?? false,
  tagIds: props.initialValues?.tagIds ?? props.initialValues?.tags?.map(t => t.id) ?? [],
})

onMounted(() => {
  if (props.initialValues?.imageLocalPath) {
    imagePreview.value = `/api/images/${props.initialValues.imageLocalPath}`
  } else if (props.initialValues?.imageUrl) {
    imagePreview.value = props.initialValues.imageUrl
  }
})

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  pendingImageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  form.imageUrl = null
}

function onImageUrlBlur() {
  if (form.imageUrl) {
    if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = form.imageUrl
    pendingImageFile.value = undefined
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

function clearImage() {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = undefined
  pendingImageFile.value = undefined
  form.imageUrl = null
  form.imageLocalPath = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleSubmit() {
  emit('submit', { ...form, pendingImageFile: pendingImageFile.value, ingredients: ingredients.value })
}
</script>
