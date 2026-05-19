<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
        <NuxtLink to="/" class="font-semibold text-gray-900 mr-2">
          {{ appName }}
        </NuxtLink>
        <nav class="flex items-center gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            active-class="text-gray-900 bg-gray-100 font-medium"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const appName = useRuntimeConfig().public.appName ?? 'Meal Planner'

const navLinks = [
  { to: '/dishes', label: 'Dishes' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/planning', label: 'Planning' },
  { to: '/shopping-lists', label: 'Shopping Lists' },
  { to: '/ingredients', label: 'Ingredients' },
  { to: '/settings', label: 'Settings' },
]
</script>
