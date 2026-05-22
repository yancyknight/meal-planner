<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Meal planning</p>
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
          Planning <em class="font-normal italic text-accent-deep">sessions</em>
        </h1>
      </div>
      <button
        type="button"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover shrink-0 disabled:opacity-40"
        :disabled="creating"
        @click="startNewSession"
      >
        {{ creating ? 'Starting…' : '✦ Plan a week' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!sessions?.length"
      class="rounded-lg border border-border bg-surface px-8 py-16 text-center"
    >
      <p class="mb-1 font-serif text-xl text-text">No planning sessions</p>
      <p class="text-sm text-text-muted">Start a new session to plan your meals for the week.</p>
    </div>

    <!-- Session list -->
    <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <NuxtLink
              :to="`/planning/${session.id}`"
              class="font-serif text-lg font-semibold text-text hover:text-accent-deep transition"
            >
              Week of {{ formatWeek(session.weekStart) }}
            </NuxtLink>
            <span class="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              Step {{ session.currentStep }} of 4
            </span>
          </div>
          <p class="text-sm text-text-muted">
            {{ formatMealTypes(session.mealTypes) }} · started {{ formatDate(session.createdAt) }}
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink
            :to="`/planning/${session.id}`"
            class="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
          >
            Resume →
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
            :disabled="deletingId === session.id"
            @click="confirmDelete(session)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { format, parseISO, addDays, startOfWeek } from 'date-fns'
import type { PlanningSession } from '#shared/types/planningSession'

const queryClient = useQueryClient()
const router = useRouter()

const { data: sessions, isPending } = useQuery({
  queryKey: queryKeys.planningSessions.all(),
  queryFn: () => $fetch<PlanningSession[]>('/api/planning-sessions'),
})

function formatWeek(weekStart: string): string {
  const start = parseISO(weekStart)
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} – ${format(end, 'd')}`
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
}

function formatMealTypes(mealTypes: string[]): string {
  return mealTypes.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')
}

function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d')
}

function currentMonday(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

const { mutateAsync: createSession, isPending: creating } = useMutation({
  mutationFn: (body: { weekStart: string; mealTypes: string[] }) =>
    $fetch<PlanningSession>('/api/planning-sessions', { method: 'POST', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.planningSessions.all() }),
})

async function startNewSession() {
  const session = await createSession({
    weekStart: currentMonday(),
    mealTypes: ['dinner'],
  })
  router.push(`/planning/${session.id}`)
}

const deletingId = ref<number | null>(null)

async function confirmDelete(session: PlanningSession) {
  if (!confirm(`Delete the planning session for week of ${formatWeek(session.weekStart)}? This cannot be undone.`)) return
  deletingId.value = session.id
  try {
    await $fetch(`/api/planning-sessions/${session.id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: queryKeys.planningSessions.all() })
  }
  finally {
    deletingId.value = null
  }
}
</script>
