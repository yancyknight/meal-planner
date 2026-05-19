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
        @input="onImageUrlInput"
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
      <div class="flex flex-wrap gap-2 mb-2">
        <button
          v-for="preset in ALLERGEN_PRESETS"
          :key="preset"
          type="button"
          :class="[
            'px-3 py-1 rounded-full text-sm border transition-colors',
            form.allergens.includes(preset)
              ? 'bg-red-100 border-red-300 text-red-700'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200',
          ]"
          @click="toggleAllergen(preset)"
        >
          {{ preset }}
        </button>
      </div>
      <div class="flex gap-2">
        <input
          v-model="customAllergenInput"
          type="text"
          class="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add custom allergen..."
          @keydown.enter.prevent="addCustomAllergen"
        />
        <button
          type="button"
          class="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          @click="addCustomAllergen"
        >Add</button>
      </div>
      <div v-if="customAllergens.length" class="flex flex-wrap gap-2 mt-2">
        <span
          v-for="allergen in customAllergens"
          :key="allergen"
          class="px-2 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs flex items-center gap-1"
        >
          {{ allergen }}
          <button type="button" class="hover:text-red-600" @click="removeCustomAllergen(allergen)">×</button>
        </span>
      </div>
    </div>

    <!-- Season -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Season <span class="text-gray-400 text-xs font-normal">(empty = year-round)</span></label>
      <div class="flex gap-3">
        <label
          v-for="season in SEASON_OPTIONS"
          :key="season"
          class="flex items-center gap-1.5 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="form.season.includes(season)"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            @change="toggleSeason(season)"
          />
          <span class="text-sm text-gray-700 capitalize">{{ season }}</span>
        </label>
      </div>
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

interface Props {
  initialValues?: Partial<CreateDishInput> & { imageLocalPath?: string | null }
  submitLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save dish',
  loading: false,
})

const emit = defineEmits<{
  submit: [data: CreateDishInput & { pendingImageFile?: File }]
}>()

const fileInputRef = ref<HTMLInputElement>()
const customAllergenInput = ref('')
const pendingImageFile = ref<File>()
const imagePreview = ref<string>()

type DishFormState = Omit<CreateDishInput, 'allergens' | 'season'> & {
  allergens: string[]
  season: (typeof SEASON_OPTIONS)[number][]
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
  weight: props.initialValues?.weight ?? 50,
  minIntervalDays: props.initialValues?.minIntervalDays ?? null,
})

// Show existing local image or URL as preview
onMounted(() => {
  if (props.initialValues?.imageLocalPath) {
    imagePreview.value = `/api/images/${props.initialValues.imageLocalPath}`
  } else if (props.initialValues?.imageUrl) {
    imagePreview.value = props.initialValues.imageUrl
  }
})

const customAllergens = computed(() =>
  form.allergens.filter(a => !ALLERGEN_PRESETS.includes(a as (typeof ALLERGEN_PRESETS)[number]))
)

function toggleAllergen(allergen: string) {
  const idx = form.allergens.indexOf(allergen)
  if (idx === -1) form.allergens.push(allergen)
  else form.allergens.splice(idx, 1)
}

function addCustomAllergen() {
  const val = customAllergenInput.value.trim().toLowerCase()
  if (val && !form.allergens.includes(val)) {
    form.allergens.push(val)
  }
  customAllergenInput.value = ''
}

function removeCustomAllergen(allergen: string) {
  const idx = form.allergens.indexOf(allergen)
  if (idx !== -1) form.allergens.splice(idx, 1)
}

function toggleSeason(season: (typeof SEASON_OPTIONS)[number]) {
  const idx = form.season.indexOf(season)
  if (idx === -1) form.season.push(season)
  else form.season.splice(idx, 1)
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingImageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  form.imageUrl = null
}

function onImageUrlInput() {
  if (form.imageUrl) {
    imagePreview.value = form.imageUrl
    pendingImageFile.value = undefined
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

function clearImage() {
  imagePreview.value = undefined
  pendingImageFile.value = undefined
  form.imageUrl = null
  form.imageLocalPath = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleSubmit() {
  emit('submit', { ...form, pendingImageFile: pendingImageFile.value })
}
</script>
