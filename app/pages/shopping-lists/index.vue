<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Groceries</p>
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-text">
          Shopping <em class="font-normal italic text-accent-deep">lists</em>
        </h1>
      </div>
      <button
        type="button"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover shrink-0"
        @click="showDialog = true"
      >
        ✦ New list
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-lg bg-surface-alt" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!lists?.length"
      class="rounded-lg border border-border bg-surface px-8 py-16 text-center"
    >
      <p class="mb-1 font-serif text-xl text-text">No shopping lists yet</p>
      <p class="text-sm text-text-muted">Create one from a date range to see what you need to buy.</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="list in lists"
        :key="list.id"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <!-- Main info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <NuxtLink
              :to="`/shopping-lists/${list.id}`"
              class="font-serif text-lg font-semibold text-text hover:text-accent-deep transition truncate"
            >
              {{ formatDateRange(list.dateRangeStart, list.dateRangeEnd) }}
            </NuxtLink>
            <!-- Status badge -->
            <span
              v-if="list.isDone"
              class="shrink-0 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-text-muted"
            >
              Done
            </span>
            <span
              v-else
              class="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep"
            >
              Active
            </span>
          </div>
          <p class="mt-1 text-sm text-text-muted">
            {{ list.checkedCount }} / {{ list.itemCount }} items checked
            <span v-if="list.isDone && list.deletesAt" class="ml-2 text-warning">
              · Deletes in {{ formatCountdown(list.deletesAt) }}
            </span>
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink
            :to="`/shopping-lists/${list.id}`"
            class="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
          >
            View
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt transition"
            :disabled="deletingId === list.id"
            @click="confirmDelete(list.id, formatDateRange(list.dateRangeStart, list.dateRangeEnd))"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- New List Dialog — full-screen sheet on mobile, centered card on desktop -->
    <Teleport to="body">
      <div
        v-if="showDialog"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
        @click.self="closeDialog"
      >
        <div class="w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-xl border border-border bg-surface p-6 shadow-xl">
          <p class="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">New list</p>
          <h2 class="mb-5 font-serif text-2xl font-semibold text-text">
            Create shopping <em class="font-normal italic text-accent-deep">list</em>
          </h2>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">From</label>
                <input
                  v-model="form.dateRangeStart"
                  type="date"
                  class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">To</label>
                <input
                  v-model="form.dateRangeEnd"
                  type="date"
                  class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
            <p v-if="formError" class="text-sm text-warning">{{ formError }}</p>
          </div>

          <div class="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-alt transition"
              @click="closeDialog"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover transition disabled:opacity-40"
              :disabled="creating"
              @click="submitCreate"
            >
              {{ creating ? 'Creating…' : 'Create list' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { format, parseISO } from 'date-fns'
import type { ShoppingListSummary } from '#server/services/shoppingListService'

const queryClient = useQueryClient()
const router = useRouter()

const { data: lists, isPending } = useQuery({
  queryKey: queryKeys.shoppingLists.all(),
  queryFn: () => $fetch<ShoppingListSummary[]>('/api/shopping-lists'),
  refetchInterval: 60_000,
})

// Date range title (e.g. "May 20 – May 26" or "May 20 – Jun 3")
function formatDateRange(start: string, end: string): string {
  const s = parseISO(start)
  const e = parseISO(end)
  const sStr = format(s, s.getMonth() === e.getMonth() ? 'MMM d' : 'MMM d')
  const eStr = format(e, 'MMM d')
  return `${sStr} – ${eStr}`
}

// Countdown formatting
function formatCountdown(deletesAt: string): string {
  const diff = new Date(deletesAt).getTime() - Date.now()
  if (diff <= 0) return 'soon'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// New list dialog
const showDialog = ref(false)
const form = reactive({
  dateRangeStart: format(new Date(), 'yyyy-MM-dd'),
  dateRangeEnd: format(new Date(), 'yyyy-MM-dd'),
})
const formError = ref('')

function closeDialog() {
  showDialog.value = false
  formError.value = ''
}

const { mutateAsync: createList, isPending: creating } = useMutation({
  mutationFn: (body: { dateRangeStart: string; dateRangeEnd: string }) =>
    $fetch<{ id: number }>('/api/shopping-lists', { method: 'POST', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all() }),
})

async function submitCreate() {
  formError.value = ''
  if (!form.dateRangeStart || !form.dateRangeEnd) {
    formError.value = 'Both dates are required.'
    return
  }
  if (form.dateRangeEnd < form.dateRangeStart) {
    formError.value = 'End date must be on or after start date.'
    return
  }
  const list = await createList({
    dateRangeStart: form.dateRangeStart,
    dateRangeEnd: form.dateRangeEnd,
  })
  closeDialog()
  router.push(`/shopping-lists/${list.id}`)
}

// Delete
const deletingId = ref<number | null>(null)

async function confirmDelete(id: number, name: string) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  deletingId.value = id
  try {
    await $fetch(`/api/shopping-lists/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all() })
  }
  finally {
    deletingId.value = null
  }
}
</script>
