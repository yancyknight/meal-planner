<template>
  <div class="min-h-screen bg-bg">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-6xl items-center px-6 py-3 lg:px-10">
        <!-- Brand mark -->
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
          <span class="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <span class="text-sm font-medium text-text">
            {{ appName }} <em class="font-serif font-normal italic text-accent-deep">for two</em>
          </span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden sm:flex flex-1 items-center gap-1 text-sm ml-8" aria-label="Main navigation">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-full px-4 py-1.5 text-text-muted transition hover:text-text"
            active-class="bg-accent-soft text-accent-deep font-medium"
            :aria-current="route.path.startsWith(link.to) ? 'page' : undefined"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Desktop date -->
        <time class="hidden sm:block shrink-0 font-mono text-xs text-text-subtle ml-auto">{{ today }}</time>

        <!-- Mobile hamburger -->
        <button
          type="button"
          class="sm:hidden ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:bg-surface-alt transition"
          :aria-expanded="mobileMenuOpen"
          aria-label="Open navigation menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span v-if="!mobileMenuOpen" aria-hidden="true" class="text-lg leading-none">☰</span>
          <span v-else aria-hidden="true" class="text-lg leading-none">×</span>
        </button>
      </div>

      <!-- Mobile dropdown menu -->
      <div v-if="mobileMenuOpen" class="sm:hidden border-t border-border bg-surface px-6 py-3">
        <nav class="flex flex-col gap-1" aria-label="Main navigation">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-lg px-4 py-3 text-sm text-text-muted transition hover:bg-surface-alt hover:text-text"
            active-class="bg-accent-soft text-accent-deep font-medium"
            :aria-current="route.path.startsWith(link.to) ? 'page' : undefined"
            @click="mobileMenuOpen = false"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <time class="mt-3 block font-mono text-xs text-text-subtle px-4">{{ today }}</time>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const appName = 'Meal Planner'

const navLinks = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/planning', label: 'Planning' },
  { to: '/shopping-lists', label: 'Shopping Lists' },
  { to: '/dishes', label: 'Dishes' },
  { to: '/freezer', label: 'Freezer' },
  { to: '/ingredients', label: 'Ingredients' },
  { to: '/settings', label: 'Settings' },
]

const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())

const mobileMenuOpen = ref(false)

const route = useRoute()
watch(() => route.path, () => { mobileMenuOpen.value = false })
</script>
