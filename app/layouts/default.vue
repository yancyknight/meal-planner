<template>
  <div class="min-h-screen bg-bg">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-6xl items-center px-6 py-3 lg:px-10">
        <!-- Brand mark -->
        <NuxtLink to="/" class="mr-8 flex items-center gap-2 shrink-0">
          <span class="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <span class="text-sm font-medium text-text">
            {{ appName }} <em class="font-serif font-normal italic text-accent-deep">for two</em>
          </span>
        </NuxtLink>

        <!-- Nav -->
        <nav class="flex flex-1 items-center gap-1 text-sm">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-full px-4 py-1.5 text-text-muted transition hover:text-text"
            active-class="bg-accent-soft text-accent-deep font-medium"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Date -->
        <time class="shrink-0 font-mono text-xs text-text-subtle">{{ today }}</time>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-6 py-8 lg:px-10">
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

const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
</script>
