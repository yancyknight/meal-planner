<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <!-- Header band -->
    <div class="sticky top-0 z-20 border-b border-border bg-surface px-4 sm:px-6">
      <div class="mx-auto flex max-w-6xl items-center justify-between py-3">
        <NuxtLink to="/calendar" class="text-sm text-text-muted hover:text-text transition flex items-center gap-1">
          ← Calendar
        </NuxtLink>
        <span class="text-xs font-medium uppercase tracking-wider text-text-muted hidden sm:block">
          Planning session #{{ session?.id }} — draft — auto-saved
        </span>
        <button
          type="button"
          class="text-sm text-text-muted hover:text-text transition"
          @click="discardSession"
        >
          Discard session
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex-1 flex items-center justify-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>

    <!-- Not found -->
    <div v-else-if="!session" class="flex-1 flex items-center justify-center p-8 text-center">
      <div>
        <p class="font-serif text-xl text-text mb-2">Session not found</p>
        <NuxtLink to="/planning" class="text-sm text-accent hover:underline">← Back to planning</NuxtLink>
      </div>
    </div>

    <!-- Wizard body -->
    <div v-else class="flex-1 mx-auto w-full max-w-6xl flex flex-col lg:flex-row gap-0">
      <!-- Left sidebar -->
      <aside class="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-surface px-5 py-6">
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Plan a week</p>
        <p class="font-serif text-lg font-semibold text-text mb-0.5">
          {{ weekRangeLabel }}
        </p>
        <p class="text-sm italic text-text-muted mb-6">{{ slotSummary }}</p>

        <!-- Step list -->
        <ol class="space-y-3">
          <li
            v-for="step in steps"
            :key="step.n"
            class="flex items-start gap-3"
          >
            <!-- Circle indicator -->
            <span
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              :class="stepCircleClass(step.n)"
            >
              <template v-if="step.n < session.currentStep">✓</template>
              <template v-else>{{ step.n }}</template>
            </span>
            <!-- Label -->
            <div>
              <p
                class="text-sm font-medium"
                :class="step.n === session.currentStep ? 'text-text' : step.n < session.currentStep ? 'text-text-muted' : 'text-text-subtle'"
              >
                {{ step.title }}
              </p>
              <p class="text-xs text-text-subtle">{{ step.caption }}</p>
            </div>
          </li>
        </ol>
      </aside>

      <!-- Main content -->
      <main class="flex-1 px-4 sm:px-8 py-8">
        <!-- Step 1: When & What -->
        <WizardStep1
          v-if="session.currentStep === 1"
          :session="session"
          @update="handleUpdate"
        />

        <!-- Step 2: Slot Setup -->
        <WizardStep2
          v-else-if="session.currentStep === 2"
          :session="session"
          @update="handleUpdate"
        />

        <!-- Steps 3 & 4 (future sessions) -->
        <div v-else class="text-center py-16">
          <p class="font-serif text-xl text-text mb-2">Step {{ session.currentStep }}</p>
          <p class="text-sm text-text-muted">Coming in the next session.</p>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <div v-if="session" class="sticky bottom-0 border-t border-border bg-surface px-4 sm:px-6 py-3">
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <button
          type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-alt transition disabled:opacity-40"
          :disabled="session.currentStep === 1 || isSaving"
          @click="goBack"
        >
          ← Back
        </button>

        <span class="text-sm text-text-muted tabular-nums">{{ session.currentStep }} / 4</span>

        <button
          type="button"
          class="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
          :disabled="!canContinue || isSaving"
          @click="goForward"
        >
          <template v-if="isSaving">Saving…</template>
          <template v-else-if="session.currentStep === 4">Confirm &amp; save plan</template>
          <template v-else>Continue →</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { format, parseISO, addDays } from 'date-fns'
import type { PlanningSession } from '#shared/types/planningSession'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const id = computed(() => Number(route.params.id))

const { data: session, isPending } = useQuery({
  queryKey: computed(() => queryKeys.planningSessions.detail(id.value)),
  queryFn: () => $fetch<PlanningSession>(`/api/planning-sessions/${id.value}`),
})

const steps = [
  { n: 1, title: 'When & What', caption: 'Choose a week and meal types' },
  { n: 2, title: 'Slot Setup', caption: 'Plan, skip, or keep each slot' },
  { n: 3, title: 'Anchors', caption: 'Optional filters and pins' },
  { n: 4, title: 'Draft & Finalize', caption: 'Review and confirm' },
]

function stepCircleClass(n: number) {
  if (!session.value) return ''
  if (n < session.value.currentStep) return 'bg-surface-alt text-text-muted border border-border'
  if (n === session.value.currentStep) return 'bg-accent text-white'
  return 'border border-border text-text-subtle'
}

const weekRangeLabel = computed(() => {
  if (!session.value) return ''
  const start = parseISO(session.value.weekStart)
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} – ${format(end, 'd')}`
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
})

const slotSummary = computed(() => {
  if (!session.value) return ''
  const types = session.value.mealTypes
  const count = types.length * 7
  const label = types.length === 1
    ? `${types[0]} only`
    : types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ').toLowerCase()
  return `${count} slot${count !== 1 ? 's' : ''}, ${label}`
})

// Step validity — components signal readiness via the session state
const canContinue = computed(() => {
  if (!session.value) return false
  const s = session.value
  if (s.currentStep === 1) return s.weekStart !== '' && s.mealTypes.length > 0
  if (s.currentStep === 2) return true
  return true
})

// The child step components emit an update object; we merge and patch
const isSaving = ref(false)

async function handleUpdate(patch: Partial<PlanningSession>) {
  if (!session.value) return
  isSaving.value = true
  try {
    const updated = await $fetch<PlanningSession>(`/api/planning-sessions/${id.value}`, {
      method: 'PATCH',
      body: patch,
    })
    queryClient.setQueryData(queryKeys.planningSessions.detail(id.value), updated)
  }
  finally {
    isSaving.value = false
  }
}

async function goForward() {
  if (!session.value || !canContinue.value) return
  if (session.value.currentStep >= 4) return
  await handleUpdate({ currentStep: (session.value.currentStep + 1) as 1 | 2 | 3 | 4 })
}

async function goBack() {
  if (!session.value || session.value.currentStep <= 1) return
  await handleUpdate({ currentStep: (session.value.currentStep - 1) as 1 | 2 | 3 | 4 })
}

async function discardSession() {
  if (!confirm('Discard this planning session? This cannot be undone.')) return
  await $fetch(`/api/planning-sessions/${id.value}`, { method: 'DELETE' })
  queryClient.invalidateQueries({ queryKey: queryKeys.planningSessions.all() })
  router.push('/planning')
}
</script>
