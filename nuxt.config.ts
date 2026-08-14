import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
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
      '*/15 * * * *': ['shopping-lists:cleanup', 'recipe-import:cleanup-pending'],
      '0 0 * * *': ['dishes:cleanup-cooldowns'],
      '0 * * * *': ['database:backup', 'freezer:weekly-digest'],
      '0 8 * * *': ['freezer:expiry-check'],
    },
  },
})
