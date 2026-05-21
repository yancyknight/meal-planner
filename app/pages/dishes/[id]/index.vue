<template>
  <div>
    <!-- Loading -->
    <div v-if="isPending" class="animate-pulse space-y-4">
      <div class="h-6 w-32 rounded bg-surface-alt" />
      <div class="h-64 rounded-lg bg-surface-alt" />
    </div>

    <!-- Error -->
    <div v-else-if="error || !dish" class="text-sm text-warning">Dish not found.</div>

    <template v-else>
      <!-- Back + actions bar -->
      <div class="mb-6 flex flex-wrap items-center gap-2">
        <NuxtLink to="/dishes" class="text-text-subtle transition hover:text-text-muted text-sm">‹ Dishes</NuxtLink>
        <span class="flex-1" />
        <span
          v-if="dish.archived"
          class="rounded-full border border-border px-3 py-0.5 text-xs text-text-muted"
        >Archived</span>
        <NuxtLink
          :to="`/dishes/${dish.id}/edit`"
          class="rounded-lg border border-border px-4 py-1.5 text-sm text-text transition hover:bg-surface-alt min-h-[36px] flex items-center"
        >Edit</NuxtLink>
        <button
          class="rounded-lg border border-border px-4 py-1.5 text-sm text-text transition hover:bg-surface-alt min-h-[36px]"
          @click="toggleArchive"
        >{{ dish.archived ? 'Unarchive' : 'Archive' }}</button>
        <button
          class="rounded-lg border border-border px-4 py-1.5 text-sm text-warning transition hover:bg-accent-soft min-h-[36px]"
          @click="confirmDelete"
        >Delete</button>
      </div>

      <!-- Title — shown at top on mobile, hidden on lg (rendered again in right column) -->
      <div class="mb-6 lg:hidden">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Dish</p>
        <h1 class="font-serif text-3xl font-semibold leading-tight text-text">{{ dish.name }}</h1>
      </div>

      <!-- Two-column layout -->
      <div class="grid gap-8 lg:grid-cols-[280px_1fr]">

        <!-- Left column: image + quick meta -->
        <aside class="space-y-6">
          <!-- Image -->
          <div class="overflow-hidden rounded-lg border border-border bg-surface-alt">
            <img
              v-if="imageSrc"
              :src="imageSrc"
              :alt="dish.name"
              class="w-full object-cover"
            />
            <div v-else class="flex h-52 items-center justify-center text-text-subtle">
              <span class="text-5xl">✦</span>
            </div>
          </div>

          <!-- Stat row -->
          <div class="flex items-end gap-6">
            <div v-if="dish.timeEstimateMinutes" class="flex flex-col">
              <span class="font-serif text-3xl font-semibold text-text">{{ dish.timeEstimateMinutes }}</span>
              <span class="text-xs font-medium uppercase tracking-wide text-text-muted">minutes</span>
            </div>
            <div v-if="dish.yieldServings" class="flex flex-col">
              <span class="font-serif text-3xl font-semibold text-text">{{ dish.yieldServings }}</span>
              <span class="text-xs font-medium uppercase tracking-wide text-text-muted">servings</span>
            </div>
            <div v-if="dish.difficulty" class="flex flex-col">
              <span class="flex items-center gap-0.5 pt-1">
                <span
                  v-for="n in 3"
                  :key="n"
                  class="inline-block h-2.5 w-2.5 rounded-full"
                  :class="n <= difficultyLevel ? 'bg-text-muted' : 'bg-text-subtle'"
                />
              </span>
              <span class="mt-1 text-xs font-medium uppercase tracking-wide text-text-muted capitalize">{{ dish.difficulty }}</span>
            </div>
          </div>

          <!-- Season -->
          <div v-if="dish.season.length">
            <p class="mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">Season</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="s in dish.season"
                :key="s"
                class="rounded-full bg-surface-alt px-3 py-1 text-xs capitalize text-text-muted"
              >{{ s }}</span>
            </div>
          </div>

          <!-- Source -->
          <div v-if="dish.sourceName || dish.sourceUrl">
            <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Source</p>
            <a
              v-if="dish.sourceUrl"
              :href="dish.sourceUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline"
            >{{ dish.sourceName ?? dish.sourceUrl }} ↗</a>
            <p v-else class="text-sm text-text">{{ dish.sourceName }}</p>
          </div>

          <!-- Planning stats -->
          <div class="rounded-lg border border-border p-4">
            <p class="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Planning History</p>
            <div v-if="dishStats" class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-text-muted">Times cooked</span>
                <span class="font-medium text-text">{{ dishStats.totalFreshCooks }}</span>
              </div>
              <div v-if="dishStats.lastCookedDate" class="flex justify-between">
                <span class="text-text-muted">Last cooked</span>
                <span class="font-medium text-text">{{ formatDate(dishStats.lastCookedDate) }}</span>
              </div>
              <div v-if="dishStats.daysSinceLastFresh !== null" class="flex justify-between">
                <span class="text-text-muted">Days since fresh</span>
                <span class="font-medium text-text">{{ dishStats.daysSinceLastFresh }}</span>
              </div>
              <p v-if="dishStats.totalFreshCooks === 0" class="text-text-subtle">Never planned</p>
            </div>
            <div v-else class="h-12 animate-pulse rounded bg-surface-alt" />
          </div>

          <!-- Frequency controls (auto-save on change) -->
          <div class="rounded-lg border border-border p-4">
            <div class="mb-3 flex items-center gap-2">
              <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Frequency</p>
              <span v-if="frequencySaving" class="text-xs text-text-subtle">Saving…</span>
              <span v-else-if="frequencySaved" class="text-xs text-accent">Saved</span>
            </div>
            <FrequencyControls
              v-model:cooldown-days="frequencyForm.cooldownDays"
              v-model:target-interval-days="frequencyForm.targetIntervalDays"
              v-model:excluded-from-suggestions="frequencyForm.excludedFromSuggestions"
            />
          </div>
        </aside>

        <!-- Right column: main content -->
        <div class="space-y-8">
          <!-- Headline (hidden on mobile — rendered above the grid instead) -->
          <div class="hidden lg:block">
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Dish</p>
            <h1 class="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-text">{{ dish.name }}</h1>
          </div>

          <!-- Allergens (gated by showAllergens setting) -->
          <div v-if="settings?.showAllergens && dish.allergens.length">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Allergens</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="allergen in dish.allergens"
                :key="allergen"
                class="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1 text-xs text-warning"
              >⚠ {{ allergen }}</span>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="dish.tags.length">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Tags</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in dish.tags"
                :key="tag.id"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs"
                :style="tag.color ? { backgroundColor: tag.color + '22', color: tag.color } : {}"
                :class="!tag.color ? 'bg-surface-alt text-text-muted' : ''"
              >{{ tag.name }}</span>
            </div>
          </div>

          <!-- Ingredients -->
          <div v-if="dishIngredients?.length">
            <p class="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Ingredients</p>
            <div class="rounded-lg border border-border overflow-hidden">
              <table class="w-full text-sm">
                <tbody class="divide-y divide-border">
                  <tr v-for="ing in dishIngredients" :key="ing.id" class="bg-surface px-4">
                    <td class="px-4 py-2.5 text-text">{{ ing.rawText }}</td>
                    <td class="px-4 py-2.5 font-mono text-xs text-text-subtle">{{ ing.canonical.name }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="dish.notes">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Notes</p>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{{ dish.notes }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Dish } from '#shared/types/dish'
import type { DishIngredient } from '#shared/types/ingredient'
import type { DishStats } from '#shared/types/dishStats'
import type { AppSettings } from '#shared/types/settings'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const id = computed(() => Number(route.params.id))

const { data: dish, isPending, error } = useQuery({
  queryKey: computed(() => queryKeys.dishes.detail(id.value)),
  queryFn: () => $fetch<Dish>(`/api/dishes/${id.value}`),
})

const { data: dishIngredients } = useQuery({
  queryKey: computed(() => queryKeys.dishIngredients.forDish(id.value)),
  queryFn: () => $fetch<DishIngredient[]>(`/api/dishes/${id.value}/ingredients`),
})

const { data: dishStats } = useQuery({
  queryKey: computed(() => queryKeys.dishes.stats(id.value)),
  queryFn: () => $fetch<DishStats>(`/api/dishes/${id.value}/stats`),
})

const { data: settings } = useQuery({
  queryKey: computed(() => queryKeys.settings.all()),
  queryFn: () => $fetch<AppSettings>('/api/settings'),
  staleTime: 60_000,
})

const imageSrc = computed(() => {
  if (!dish.value) return null
  if (dish.value.imageLocalPath) return `/api/images/${dish.value.imageLocalPath}`
  return dish.value.imageUrl ?? null
})

const difficultyLevelMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
const difficultyLevel = computed(() => dish.value?.difficulty ? (difficultyLevelMap[dish.value.difficulty] ?? 0) : 0)

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Frequency controls (auto-save with debounce) ────────────────

interface FrequencyForm {
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
}

const frequencyForm = reactive<FrequencyForm>({
  cooldownDays: 7,
  targetIntervalDays: 14,
  excludedFromSuggestions: false,
})

// Sync from loaded dish data (runs once when dish loads)
watch(dish, (d) => {
  if (!d) return
  frequencyForm.cooldownDays = d.cooldownDays
  frequencyForm.targetIntervalDays = d.targetIntervalDays
  frequencyForm.excludedFromSuggestions = d.excludedFromSuggestions
}, { immediate: true })

const frequencySaving = ref(false)
const frequencySaved = ref(false)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let savedFeedbackTimeout: ReturnType<typeof setTimeout> | null = null

watch(frequencyForm, (form) => {
  if (!dish.value) return
  if (saveTimeout) clearTimeout(saveTimeout)
  frequencySaved.value = false
  saveTimeout = setTimeout(async () => {
    frequencySaving.value = true
    try {
      await $fetch<Dish>(`/api/dishes/${id.value}`, {
        method: 'PATCH',
        body: {
          cooldownDays: form.cooldownDays,
          targetIntervalDays: form.targetIntervalDays,
          excludedFromSuggestions: form.excludedFromSuggestions,
        },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
      frequencySaved.value = true
      if (savedFeedbackTimeout) clearTimeout(savedFeedbackTimeout)
      savedFeedbackTimeout = setTimeout(() => { frequencySaved.value = false }, 2000)
    }
    finally {
      frequencySaving.value = false
    }
  }, 800)
}, { deep: true })

// ── Other mutations ──────────────────────────────────────────────

const { mutate: patchDish } = useMutation({
  mutationFn: (data: Partial<Dish>) =>
    $fetch<Dish>(`/api/dishes/${id.value}`, { method: 'PATCH', body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
  },
})

function toggleArchive() {
  if (!dish.value) return
  patchDish({ archived: !dish.value.archived })
}

const { mutate: deleteDish } = useMutation({
  mutationFn: () => $fetch<void>(`/api/dishes/${id.value}`, { method: 'DELETE' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dishes.all() })
    router.push('/dishes')
  },
})

function confirmDelete() {
  if (confirm('Delete this dish? This cannot be undone.')) {
    deleteDish()
  }
}
</script>
