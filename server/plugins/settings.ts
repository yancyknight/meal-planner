import { seedDefaults } from '../services/settingsService'

export default defineNitroPlugin(async () => {
  await seedDefaults()
})
