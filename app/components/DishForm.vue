<template>
  <form class="space-y-7" @submit.prevent="handleSubmit">
    <!-- Name -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
        Name <span class="text-accent">*</span>
      </label>
      <input
        v-model="form.name"
        type="text"
        required
        class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="e.g. Spaghetti Carbonara"
      />
    </div>

    <!-- Image -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Image</label>
      <div v-if="imagePreview" class="mb-3 relative inline-block">
        <img :src="imagePreview" alt="Dish preview" class="h-32 w-48 rounded-lg border border-border object-cover" />
        <button
          type="button"
          class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-xs text-text-muted hover:text-warning"
          @click="clearImage"
        >×</button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="block w-full text-sm text-text-muted file:mr-3 file:rounded file:border-0 file:bg-surface-alt file:px-3 file:py-1.5 file:text-sm file:text-text hover:file:bg-border"
        @change="handleFileChange"
      />
      <p class="mt-2 text-xs text-text-subtle">Or enter an image URL:</p>
      <input
        v-model="form.imageUrl"
        type="url"
        class="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="https://..."
        @blur="onImageUrlBlur"
      />
    </div>

    <!-- Source -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Source URL</label>
        <input
          v-model="form.sourceUrl"
          type="url"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="https://..."
        />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Source Name</label>
        <input
          v-model="form.sourceName"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="e.g. NYT Cooking"
        />
      </div>
    </div>

    <!-- Time + Yield -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Time (minutes)</label>
        <input
          v-model.number="form.timeEstimateMinutes"
          type="number"
          min="1"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="30"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Yield (servings)</label>
        <input
          v-model.number="form.yieldServings"
          type="number"
          min="1"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="4"
        />
      </div>
    </div>

    <!-- Difficulty pills -->
    <div>
      <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">Difficulty</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in difficultyOptions"
          :key="opt.value ?? 'none'"
          type="button"
          class="rounded-full border px-4 py-1.5 text-sm transition"
          :class="form.difficulty === opt.value
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="form.difficulty = opt.value"
        >
          <span v-if="opt.value" class="mr-1.5 inline-flex gap-0.5">
            <span
              v-for="n in 3"
              :key="n"
              class="inline-block h-1.5 w-1.5 rounded-full"
              :class="n <= (difficultyLevelMap[opt.value] ?? 0) ? 'bg-current' : 'opacity-20 bg-current'"
            />
          </span>
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Allergens -->
    <div>
      <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">Allergens</label>
      <TagInput
        v-model="form.allergens"
        :presets="ALLERGEN_PRESETS"
        placeholder="Add custom allergen..."
      />
    </div>

    <!-- Season pills -->
    <div>
      <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
        Season <span class="normal-case tracking-normal font-normal text-text-subtle">(empty = year-round)</span>
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in SEASON_OPTIONS"
          :key="opt"
          type="button"
          class="rounded-full border px-4 py-1.5 text-sm capitalize transition"
          :class="form.season.includes(opt)
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="toggleSeason(opt)"
        >{{ opt }}</button>
      </div>
    </div>

    <!-- Tags -->
    <div>
      <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">Tags</label>
      <DishTagSelector v-model="form.tagIds" />
    </div>

    <!-- Ingredients -->
    <div>
      <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">Ingredients</label>
      <IngredientList v-model="ingredients" :pending-texts="props.pendingIngredientTexts" />
    </div>

    <!-- Notes -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">Notes</label>
      <textarea
        v-model="form.notes"
        rows="3"
        class="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="Internal notes, variations, tips..."
      />
    </div>

    <!-- Frequency controls -->
    <div class="rounded-lg border border-border p-4">
      <p class="mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">Planning Frequency</p>
      <FrequencyControls
        v-model:cooldown-days="form.cooldownDays"
        v-model:target-interval-days="form.targetIntervalDays"
        v-model:excluded-from-suggestions="form.excludedFromSuggestions"
      />
    </div>

    <!-- Submit -->
    <div class="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
      <slot name="actions" />
      <button
        type="submit"
        :disabled="loading"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
import type { DishIngredient, IngredientRowValue } from '#shared/types/ingredient'

interface Props {
  initialValues?: Partial<CreateDishInput> & { imageLocalPath?: string | null; tags?: Tag[] }
  initialIngredients?: DishIngredient[]
  pendingIngredientTexts?: string[]
  submitLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save dish',
  loading: false,
})

const emit = defineEmits<{
  submit: [data: CreateDishInput & { tagIds: number[]; pendingImageFile?: File; ingredients: IngredientRowValue[] }]
}>()

const difficultyOptions = [
  { value: null as null | 'easy' | 'medium' | 'hard', label: '—' },
  { value: 'easy' as const, label: 'Easy' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'hard' as const, label: 'Hard' },
]
const difficultyLevelMap = { easy: 1, medium: 2, hard: 3 } as const

const fileInputRef = ref<HTMLInputElement>()
const pendingImageFile = ref<File>()
const imagePreview = ref<string>()
const ingredients = ref<IngredientRowValue[]>(
  props.initialIngredients?.map(i => ({
    rawText: i.rawText,
    canonicalIngredientId: i.canonicalIngredientId,
    canonicalName: i.canonical.name,
  })) ?? [],
)

watch(() => props.initialIngredients, (val) => {
  if (val && val.length > 0 && ingredients.value.length === 0) {
    ingredients.value = val.map(i => ({
      rawText: i.rawText,
      canonicalIngredientId: i.canonicalIngredientId,
      canonicalName: i.canonical.name,
    }))
  }
})

type DishFormState = Omit<CreateDishInput, 'allergens' | 'season' | 'tagIds' | 'cooldownDays' | 'targetIntervalDays' | 'excludedFromSuggestions'> & {
  allergens: string[]
  season: (typeof SEASON_OPTIONS)[number][]
  tagIds: number[]
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
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
  }
  else if (props.initialValues?.imageUrl) {
    imagePreview.value = props.initialValues.imageUrl
  }
})

function toggleSeason(opt: (typeof SEASON_OPTIONS)[number]) {
  const idx = form.season.indexOf(opt)
  if (idx === -1) form.season.push(opt)
  else form.season.splice(idx, 1)
}

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
