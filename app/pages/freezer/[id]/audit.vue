<template>
  <div class="mx-auto max-w-lg space-y-6">
    <!-- Back -->
    <NuxtLink :to="`/freezer/${freezerId}`" class="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
      ← Back to freezer
    </NuxtLink>

    <!-- Invalid freezer -->
    <div v-if="freezerInvalid" class="rounded-lg border border-border bg-surface p-6 text-center">
      <p class="text-sm text-text-muted">This freezer no longer exists.</p>
      <NuxtLink to="/freezer" class="mt-3 inline-block text-sm underline">← Back to Freezer</NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="py-16 text-center text-text-subtle">Loading…</div>

    <!-- Empty — no active items -->
    <div v-else-if="queue.length === 0" class="space-y-4 text-center">
      <p class="font-serif text-2xl font-semibold text-text">{{ freezerName }}</p>
      <p class="text-sm text-text-muted">No active items to audit.</p>
      <NuxtLink :to="`/freezer/${freezerId}`" class="inline-block text-sm underline">← Back</NuxtLink>
    </div>

    <!-- Finished -->
    <div v-else-if="finished" class="space-y-4 text-center">
      <p class="font-serif text-2xl font-semibold text-text">Audit complete</p>
      <p class="text-sm text-text-muted">
        {{ usedCount }} used · {{ wastedCount }} wasted · {{ queue.length - usedCount - wastedCount }} unchanged
      </p>
      <p class="text-xs text-text-subtle">Redirecting…</p>
    </div>

    <!-- Audit card -->
    <template v-else-if="currentItem">
      <div class="text-center">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Auditing</p>
        <h1 class="font-serif text-2xl font-semibold text-text">{{ freezerName }}</h1>
      </div>

      <FreezerAuditCard
        :item="currentItem"
        :current="cursor + 1"
        :total="queue.length"
        :busy="busy"
        @still-here="onStillHere"
        @used="onUsed"
        @wasted="onWasted"
        @skip="onSkip"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FreezerItem, FreezerCategory } from '#shared/types/freezer'

useHead({ title: 'Audit Freezer' })

const route = useRoute()
const freezerId = computed(() => Number(route.params.id))

const loading = ref(true)
const freezerName = ref('')
const freezerInvalid = ref(false)
const queue = ref<FreezerItem[]>([])
const seenIds = ref(new Set<number>())
const categoryMap = ref(new Map<number, string>())
const cursor = ref(0)
const busy = ref(false)
const finished = ref(false)
const usedCount = ref(0)
const wastedCount = ref(0)

const currentItem = computed(() => {
  const item = queue.value[cursor.value]
  if (!item) return null
  return {
    id: item.id,
    name: item.name,
    categoryName: categoryMap.value.get(item.categoryId) ?? 'Unknown',
    tossByDate: item.tossByDate,
    notes: item.notes,
  }
})

onMounted(async () => {
  try {
    const [freezer, items, cats] = await Promise.all([
      $fetch<{ id: number; name: string }>(`/api/freezers/${freezerId.value}`),
      $fetch<FreezerItem[]>(`/api/freezer-items?freezerId=${freezerId.value}&status=active`),
      $fetch<FreezerCategory[]>('/api/freezer-categories'),
    ])
    freezerName.value = freezer.name
    cats.forEach(c => categoryMap.value.set(c.id, c.name))
    items.forEach(i => seenIds.value.add(i.id))
    queue.value = [...items]
  }
  catch {
    freezerInvalid.value = true
  }
  finally {
    loading.value = false
  }
})

async function onUsed() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch<unknown>(`/api/freezer-items/${queue.value[cursor.value]!.id}/use`, { method: 'POST' })
    usedCount.value++
  }
  catch {
    // item may have already been acted on — advance anyway
  }
  finally {
    busy.value = false
  }
  await checkForNewItems()
  advance()
}

async function onWasted() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch<unknown>(`/api/freezer-items/${queue.value[cursor.value]!.id}/waste`, { method: 'POST' })
    wastedCount.value++
  }
  catch {
    // item may have already been acted on — advance anyway
  }
  finally {
    busy.value = false
  }
  await checkForNewItems()
  advance()
}

function onStillHere() {
  advance()
}

function onSkip() {
  advance()
}

async function checkForNewItems() {
  try {
    const fresh = await $fetch<FreezerItem[]>(`/api/freezer-items?freezerId=${freezerId.value}&status=active`)
    for (const item of fresh) {
      if (!seenIds.value.has(item.id)) {
        seenIds.value.add(item.id)
        queue.value.push(item)
      }
    }
  }
  catch {
    // best-effort; don't block progression
  }
}

function advance() {
  cursor.value++
  if (cursor.value >= queue.value.length) {
    finishAudit()
  }
}

async function finishAudit() {
  finished.value = true
  try {
    await $fetch<unknown>(`/api/freezers/${freezerId.value}/audit-complete`, { method: 'POST' })
  }
  catch {
    // best-effort; still redirect
  }
  await navigateTo(`/freezer/${freezerId.value}`)
}
</script>
