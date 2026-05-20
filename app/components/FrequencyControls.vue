<template>
  <div class="space-y-4">
    <!-- Exclude toggle -->
    <label class="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        :aria-checked="excludedFromSuggestions"
        class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
        :class="excludedFromSuggestions ? 'bg-warning' : 'bg-border'"
        @click="$emit('update:excludedFromSuggestions', !excludedFromSuggestions)"
      >
        <span
          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
          :class="excludedFromSuggestions ? 'translate-x-4' : 'translate-x-0'"
        />
      </button>
      <span class="text-sm" :class="excludedFromSuggestions ? 'text-warning' : 'text-text-muted'">
        Exclude from suggestions
      </span>
    </label>

    <!-- Preset pills -->
    <div :class="excludedFromSuggestions ? 'opacity-50 pointer-events-none' : ''">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in PRESETS"
          :key="preset.key"
          type="button"
          class="rounded-full border px-3 py-1 text-sm transition"
          :class="activePreset === preset.key
            ? 'border-accent bg-accent-soft text-accent-deep font-medium'
            : 'border-border text-text-muted hover:bg-surface-alt'"
          @click="applyPreset(preset.key)"
        >{{ preset.label }}</button>
      </div>
    </div>

    <!-- Custom numeric inputs (only shown when preset === 'custom') -->
    <div
      v-if="activePreset === 'custom'"
      class="grid grid-cols-2 gap-3"
      :class="excludedFromSuggestions ? 'opacity-50 pointer-events-none' : ''"
    >
      <div>
        <label class="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Target (days)
        </label>
        <input
          :value="targetIntervalDays"
          type="number"
          min="1"
          :max="365"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          @change="onTargetChange(($event.target as HTMLInputElement).valueAsNumber)"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Cooldown (days)
        </label>
        <input
          :value="cooldownDays"
          type="number"
          min="1"
          :max="targetIntervalDays"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
          @change="onCooldownChange(($event.target as HTMLInputElement).valueAsNumber)"
        />
        <p v-if="cooldownDays > targetIntervalDays" class="mt-1 text-xs text-warning">
          Cooldown must be ≤ target
        </p>
      </div>
    </div>

    <!-- Summary line when a named preset is active -->
    <p v-else class="text-xs text-text-subtle" :class="excludedFromSuggestions ? 'opacity-50' : ''">
      Target every {{ targetIntervalDays }}d · Cooldown {{ cooldownDays }}d
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:cooldownDays': [value: number]
  'update:targetIntervalDays': [value: number]
  'update:excludedFromSuggestions': [value: boolean]
}>()

const PRESETS = [
  { key: 'weekly', label: 'Weekly', target: 7, cooldown: 4 },
  { key: 'biweekly', label: 'Biweekly', target: 14, cooldown: 7 },
  { key: 'monthly', label: 'Monthly', target: 30, cooldown: 15 },
  { key: 'quarterly', label: 'Quarterly', target: 90, cooldown: 45 },
  { key: 'custom', label: 'Custom', target: 0, cooldown: 0 },
] as const

type PresetKey = (typeof PRESETS)[number]['key']

const activePreset = computed<PresetKey>(() => {
  const match = PRESETS.find(
    p => p.key !== 'custom' && p.target === props.targetIntervalDays && p.cooldown === props.cooldownDays,
  )
  return match ? match.key : 'custom'
})

function applyPreset(key: PresetKey) {
  if (key === 'custom') {
    // Keep current target; reset cooldown to ceil(target / 2) only if switching from a named preset
    if (activePreset.value !== 'custom') {
      emit('update:cooldownDays', Math.ceil(props.targetIntervalDays / 2))
    }
    return
  }
  const preset = PRESETS.find(p => p.key === key)!
  emit('update:targetIntervalDays', preset.target)
  emit('update:cooldownDays', preset.cooldown)
}

function onTargetChange(val: number) {
  if (!Number.isFinite(val) || val < 1) return
  emit('update:targetIntervalDays', val)
  // Keep cooldown valid
  if (props.cooldownDays > val) {
    emit('update:cooldownDays', val)
  }
}

function onCooldownChange(val: number) {
  if (!Number.isFinite(val) || val < 1) return
  emit('update:cooldownDays', Math.min(val, props.targetIntervalDays))
}
</script>
