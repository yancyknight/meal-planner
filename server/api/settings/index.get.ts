import { getSettings } from '../../services/settingsService'

export default defineEventHandler(async () => {
  return getSettings()
})
