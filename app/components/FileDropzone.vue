<template>
  <div>
    <div
      class="rounded-lg border border-dashed px-4 py-6 text-center transition"
      :class="dragging ? 'border-accent bg-accent-soft/40' : 'border-border bg-surface hover:bg-surface-alt'"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p class="text-sm text-text-muted">
        Drag a file here, or
        <button
          type="button"
          class="text-accent underline underline-offset-2 transition hover:text-accent-hover"
          :disabled="disabled"
          @click="fileInputRef?.click()"
        >browse</button>
      </p>
      <p v-if="hint" class="mt-1.5 text-xs text-text-subtle">{{ hint }}</p>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onInputChange"
      >
    </div>

    <p v-if="rejection" class="mt-2 text-xs text-warning">{{ rejection }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** `accept` attribute for the underlying input, e.g. ".pdf,.png". */
  accept?: string
  multiple?: boolean
  disabled?: boolean
  /** Helper line under the prompt. */
  hint?: string
  /** Per-file size ceiling in bytes; oversized files are rejected before they are emitted. */
  maxBytes?: number
  /** Extensions to accept, lowercase and without the dot. Empty = accept anything. */
  allowedExtensions?: readonly string[]
}

const props = withDefaults(defineProps<Props>(), {
  accept: undefined,
  multiple: false,
  disabled: false,
  hint: undefined,
  maxBytes: undefined,
  allowedExtensions: () => [],
})

const emit = defineEmits<{ select: [files: File[]] }>()

const fileInputRef = ref<HTMLInputElement>()
const dragging = ref(false)
const rejection = ref<string>()

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx < 0 ? '' : name.slice(idx + 1).toLowerCase()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function reject(file: File, reason: string) {
  rejection.value = `${file.name} — ${reason}`
}

function accepted(files: File[]): File[] {
  rejection.value = undefined
  return files.filter((file) => {
    if (props.allowedExtensions.length && !props.allowedExtensions.includes(extensionOf(file.name))) {
      reject(file, 'that file type is not supported.')
      return false
    }
    if (props.maxBytes !== undefined && file.size > props.maxBytes) {
      reject(file, `too large (${formatBytes(file.size)}). Maximum is ${formatBytes(props.maxBytes)}.`)
      return false
    }
    return true
  })
}

function handle(files: File[]) {
  if (props.disabled || files.length === 0) return
  const ok = accepted(props.multiple ? files : files.slice(0, 1))
  if (ok.length) emit('select', ok)
}

function onDragLeave(event: DragEvent) {
  // Ignore bubbling from children — only clear when the pointer leaves the zone.
  if (event.currentTarget instanceof Node && event.relatedTarget instanceof Node
    && event.currentTarget.contains(event.relatedTarget)) return
  dragging.value = false
}

function onDrop(event: DragEvent) {
  dragging.value = false
  handle(Array.from(event.dataTransfer?.files ?? []))
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  handle(Array.from(input.files ?? []))
  // Reset so re-picking the same file fires change again.
  input.value = ''
}
</script>
