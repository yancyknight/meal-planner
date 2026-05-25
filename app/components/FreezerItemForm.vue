<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <!-- Freezer selector -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Freezer</label>
      <div
        v-if="nfcFreezer"
        class="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
        style="border-color: var(--color-frost-line); background: var(--color-frost-soft);"
      >
        <span class="flex-1 font-medium" style="color: var(--color-frost-ink);">{{ nfcFreezer.name }}</span>
        <button
          type="button"
          class="text-xs text-text-muted underline hover:text-text"
          @click="changingFreezer = true"
        >tap to change</button>
        <span class="font-serif text-xs italic" style="color: var(--color-frost-ink);">— from NFC tag</span>
      </div>
      <select
        v-else-if="changingFreezer || !nfcFreezer"
        v-model.number="form.freezerId"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        required
      >
        <option value="" disabled>Select a freezer…</option>
        <option v-for="f in freezers" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
    </div>

    <!-- Name -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Name</label>
      <input
        ref="nameInput"
        v-model="form.name"
        type="text"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-serif text-base focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder="e.g. Chicken breasts"
        required
      />
    </div>

    <!-- Category -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Category</label>
      <FreezerCategorySelect
        v-model="form.categoryId"
        :categories="categories"
      />
    </div>

    <!-- Date added -->
    <div>
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Date Added</label>
      <div class="flex items-center gap-3">
        <span class="rounded-full border border-border bg-surface px-3 py-1 text-sm">
          {{ dateChipLabel }} · {{ form.addedAt }}
        </span>
        <button
          type="button"
          class="text-xs text-text-muted underline hover:text-text"
          @click="showDatePicker = !showDatePicker"
        >Change</button>
      </div>
      <input
        v-if="showDatePicker"
        v-model="form.addedAt"
        type="date"
        class="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>

    <!-- Preview chip -->
    <div
      v-if="computedPreview"
      class="rounded-lg border px-3 py-2.5 text-sm"
      style="border-color: var(--color-accent-soft); background: color-mix(in oklch, var(--color-accent-soft) 40%, white);"
    >
      <p class="mb-0.5 font-mono text-xs uppercase tracking-wide text-text-subtle">Preview</p>
      <p class="text-text">
        Toss by <strong>{{ computedPreview.tossByDate }}</strong>
        · target use <strong>{{ computedPreview.targetUseDate }}</strong>
      </p>
    </div>

    <!-- Collapsed sections -->
    <details class="rounded-lg border border-border">
      <summary class="cursor-pointer px-3 py-2.5 text-sm text-text-muted select-none">
        Lifetime override <span v-if="form.lifetimeDaysOverride" class="text-text">({{ form.lifetimeDaysOverride }}d)</span>
      </summary>
      <div class="border-t border-border px-3 py-3">
        <label class="mb-1 block text-xs text-text-muted">Override lifetime (days)</label>
        <input
          v-model.number="form.lifetimeDaysOverride"
          type="number"
          min="1"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Leave blank to use category default"
        />
      </div>
    </details>

    <details class="rounded-lg border border-border">
      <summary class="cursor-pointer px-3 py-2.5 text-sm text-text-muted select-none">Notes</summary>
      <div class="border-t border-border px-3 py-3">
        <textarea
          v-model="form.notes"
          rows="3"
          class="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Optional notes"
        />
      </div>
    </details>

    <details class="rounded-lg border border-border">
      <summary class="cursor-pointer px-3 py-2.5 text-sm text-text-muted select-none">
        Link to a dish
        <span v-if="selectedDish" class="text-text">— {{ selectedDish.name }}</span>
      </summary>
      <div class="border-t border-border px-3 py-3 space-y-2">
        <p class="text-xs text-text-muted">Surfaces in planner so it's used in time.</p>
        <input
          v-model="dishSearch"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Search dishes…"
        />
        <div v-if="dishResults.length" class="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface">
          <button
            v-for="d in dishResults"
            :key="d.id"
            type="button"
            class="block w-full px-3 py-2 text-left text-sm hover:bg-surface-alt"
            :class="form.dishId === d.id ? 'bg-accent-soft text-accent-deep' : 'text-text'"
            @click="selectDish(d)"
          >{{ d.name }}</button>
        </div>
        <button
          v-if="form.dishId"
          type="button"
          class="text-xs text-text-muted underline"
          @click="form.dishId = null; selectedDish = null; dishSearch = ''"
        >Remove link</button>
      </div>
    </details>

    <!-- Submit -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <slot name="cancel" />
      <button
        type="submit"
        :disabled="!canSubmit || saving"
        class="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        {{ saving ? 'Saving…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { FreezerCategory, Freezer, FreezerItem } from '#shared/types/freezer'
import type { CreateFreezerItemInput } from '#shared/schemas/freezer'

const props = defineProps<{
  categories: FreezerCategory[]
  freezers: Freezer[]
  prefillFreezerId?: number
  initialValues?: Partial<FreezerItem>
  submitLabel?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateFreezerItemInput]
}>()

const nameInput = ref<HTMLInputElement>()
const changingFreezer = ref(false)
const showDatePicker = ref(false)
const dishSearch = ref('')
const selectedDish = ref<{ id: number; name: string } | null>(null)

const today = new Date().toISOString().slice(0, 10)

const form = reactive<{
  freezerId: number | null
  name: string
  categoryId: number | null
  addedAt: string
  lifetimeDaysOverride: number | null
  notes: string
  dishId: number | null
  targetUseDate: string | null
}>({
  freezerId: props.prefillFreezerId ?? props.initialValues?.freezerId ?? null,
  name: props.initialValues?.name ?? '',
  categoryId: props.initialValues?.categoryId ?? null,
  addedAt: props.initialValues?.addedAt ?? today,
  lifetimeDaysOverride: props.initialValues?.lifetimeDaysOverride ?? null,
  notes: props.initialValues?.notes ?? '',
  dishId: props.initialValues?.dishId ?? null,
  targetUseDate: props.initialValues?.targetUseDate ?? null,
})

const nfcFreezer = computed(() =>
  props.prefillFreezerId
    ? props.freezers.find(f => f.id === props.prefillFreezerId) ?? null
    : null,
)

const dateChipLabel = computed(() => {
  if (form.addedAt === today) return 'Today'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(form.addedAt + 'T00:00:00'))
})

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function midpoint(a: string, b: string): string {
  const aMs = new Date(a + 'T00:00:00Z').getTime()
  const bMs = new Date(b + 'T00:00:00Z').getTime()
  return new Date(Math.floor((aMs + bMs) / 2)).toISOString().slice(0, 10)
}

const computedPreview = computed(() => {
  if (!form.categoryId || !form.addedAt) return null
  const cat = props.categories.find(c => c.id === form.categoryId)
  if (!cat) return null
  const lifetimeDays = form.lifetimeDaysOverride ?? cat.defaultLifetimeDays
  const tossByDate = addDays(form.addedAt, lifetimeDays)
  const targetUseDate = midpoint(form.addedAt, tossByDate)
  return { tossByDate, targetUseDate }
})

// Dish search (uses existing dishes API)
const { data: allDishes } = useFetch('/api/dishes', { default: () => [] })
const dishResults = computed(() => {
  if (!dishSearch.value.trim()) return []
  const q = dishSearch.value.toLowerCase()
  return (allDishes.value as Array<{ id: number; name: string }>)
    .filter(d => d.name.toLowerCase().includes(q))
    .slice(0, 8)
})

function selectDish(d: { id: number; name: string }) {
  form.dishId = d.id
  selectedDish.value = d
  dishSearch.value = ''
}

const canSubmit = computed(() =>
  !!form.freezerId && !!form.name.trim() && !!form.categoryId,
)

async function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    freezerId: form.freezerId!,
    name: form.name.trim(),
    categoryId: form.categoryId!,
    addedAt: form.addedAt,
    lifetimeDaysOverride: form.lifetimeDaysOverride ?? undefined,
    notes: form.notes || undefined,
    dishId: form.dishId ?? undefined,
    targetUseDate: form.targetUseDate ?? undefined,
  } as CreateFreezerItemInput)
}

onMounted(() => {
  nextTick(() => nameInput.value?.focus())
})
</script>
