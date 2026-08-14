<template>
  <div class="mx-auto max-w-lg space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink to="/freezer" class="mb-3 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
        ← Freezer
      </NuxtLink>
      <h1 class="font-serif text-2xl font-semibold text-text">Add to freezer</h1>
    </div>

    <!-- Invalid freezerId from NFC tag -->
    <div v-if="prefillFreezerIdInvalid" class="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
      This freezer no longer exists — pick another below.
    </div>

    <!-- No freezers yet -->
    <div v-if="freezers && (freezers as Freezer[]).length === 0" class="rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">
      No freezers found.
      <NuxtLink to="/settings" class="underline">Add one in Settings</NuxtLink> first.
    </div>

    <FreezerItemForm
      v-else-if="categories && freezers"
      :categories="categories as FreezerCategory[]"
      :freezers="freezers as Freezer[]"
      :prefill-freezer-id="resolvedPrefillFreezerId"
      :saving="saving"
      submit-label="Add to Freezer"
      @submit="handleSubmit"
    >
      <template #cancel>
        <NuxtLink
          :to="resolvedPrefillFreezerId ? `/freezer/add?freezerId=${resolvedPrefillFreezerId}` : '/freezer'"
          class="rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-alt"
        >Cancel</NuxtLink>
      </template>
    </FreezerItemForm>
  </div>
</template>

<script setup lang="ts">
import type { Freezer, FreezerCategory } from '#shared/types/freezer'
import type { CreateFreezerItemInput } from '#shared/schemas/freezer'

useHead({ title: 'Add to Freezer' })

const route = useRoute()
const prefillFreezerId = computed(() => {
  const id = Number(route.query.freezerId)
  return id > 0 ? id : undefined
})

const { data: freezers } = useFetch<Freezer[]>('/api/freezers', { key: 'freezers' })
const { data: categories } = useFetch<FreezerCategory[]>('/api/freezer-categories', { key: 'freezer-categories' })

const prefillFreezerIdInvalid = computed(() => {
  if (!prefillFreezerId.value || !freezers.value) return false
  return !(freezers.value as Freezer[]).some(f => f.id === prefillFreezerId.value)
})

// When the requested freezer doesn't exist, don't pass it as a prefill
const resolvedPrefillFreezerId = computed(() =>
  prefillFreezerIdInvalid.value ? undefined : prefillFreezerId.value,
)

const saving = ref(false)

async function handleSubmit(data: CreateFreezerItemInput) {
  saving.value = true
  try {
    await $fetch<unknown>('/api/freezer-items', { method: 'POST', body: data })
    if (resolvedPrefillFreezerId.value) {
      await navigateTo(`/freezer/add?freezerId=${resolvedPrefillFreezerId.value}`)
    }
    else {
      await navigateTo('/freezer')
    }
  }
  finally {
    saving.value = false
  }
}
</script>
