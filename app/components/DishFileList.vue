<template>
  <div>
    <ul v-if="files?.length" class="mb-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
      <li
        v-for="file in files"
        :key="file.id"
        class="flex items-center gap-3 bg-surface px-4 py-2.5"
      >
        <span class="text-lg leading-none text-text-subtle" aria-hidden="true">{{ glyphFor(file) }}</span>
        <a
          :href="`/api/dish-files/${file.id}/download`"
          target="_blank"
          rel="noopener"
          class="min-w-0 flex-1 truncate text-sm text-accent transition hover:text-accent-hover hover:underline"
          :title="file.originalName"
        >{{ file.originalName }}</a>
        <span class="shrink-0 font-mono text-xs text-text-subtle">{{ formatBytes(file.sizeBytes) }}</span>
        <button
          type="button"
          class="shrink-0 rounded px-1.5 text-sm text-text-subtle transition hover:text-warning disabled:opacity-50"
          :disabled="deletingId === file.id"
          :aria-label="`Remove ${file.originalName}`"
          @click="confirmDelete(file)"
        >×</button>
      </li>
    </ul>

    <p v-else-if="!isPending" class="mb-3 text-sm text-text-subtle">No files attached yet.</p>

    <FileDropzone
      :accept="acceptAttr"
      :allowed-extensions="allowedExtensions"
      :max-bytes="maxBytes"
      :disabled="uploading"
      :hint="uploading ? 'Uploading…' : hint"
      multiple
      @select="uploadAll"
    />

    <p v-if="uploadError" class="mt-2 text-xs text-warning">{{ uploadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import type { DishFile } from '#shared/types/dishFile'
import { ALLOWED_FILE_TYPES, FILE_ACCEPT_ATTR, MAX_UPLOAD_BYTES } from '#shared/schemas/dishFile'

const props = defineProps<{ dishId: number }>()

const queryClient = useQueryClient()

const acceptAttr = FILE_ACCEPT_ATTR
const allowedExtensions = Object.keys(ALLOWED_FILE_TYPES)
const maxBytes = MAX_UPLOAD_BYTES
const hint = `PDFs, images, and documents up to ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`

const { data: files, isPending } = useQuery({
  queryKey: computed(() => queryKeys.dishFiles.forDish(props.dishId)),
  queryFn: () => $fetch<DishFile[]>(`/api/dishes/${props.dishId}/files`),
})

const uploading = ref(false)
const uploadError = ref<string>()
const deletingId = ref<number>()

function invalidate() {
  queryClient.invalidateQueries({ queryKey: queryKeys.dishFiles.forDish(props.dishId) })
}

async function uploadAll(selected: File[]) {
  uploading.value = true
  uploadError.value = undefined
  try {
    for (const file of selected) {
      const body = new FormData()
      body.append('file', file)
      try {
        await $fetch<DishFile>(`/api/dishes/${props.dishId}/files`, { method: 'POST', body })
      }
      catch (err) {
        const message = (err as { data?: { error?: string } })?.data?.error
        uploadError.value = `${file.name} — ${message ?? 'upload failed. Please try again.'}`
      }
    }
    invalidate()
  }
  finally {
    uploading.value = false
  }
}

async function confirmDelete(file: DishFile) {
  if (!confirm(`Remove "${file.originalName}"? This cannot be undone.`)) return
  deletingId.value = file.id
  uploadError.value = undefined
  try {
    await $fetch<unknown>(`/api/dish-files/${file.id}`, { method: 'DELETE' })
    invalidate()
  }
  catch {
    uploadError.value = `Failed to remove ${file.originalName}.`
  }
  finally {
    deletingId.value = undefined
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function glyphFor(file: DishFile): string {
  if (file.mimeType === 'application/pdf') return '▤'
  if (file.mimeType.startsWith('image/')) return '✦'
  if (file.mimeType.startsWith('text/')) return '≡'
  return '◈'
}
</script>
