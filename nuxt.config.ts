import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/test-utils',
    '@oro.ad/nuxt-claude-devtools',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '*/15 * * * *': ['shopping-lists:cleanup'],
    },
  },
})
