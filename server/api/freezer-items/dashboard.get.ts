import { getDashboard } from '../../services/freezerItemService'
import { getSettings } from '../../services/settingsService'

export default defineEventHandler(async () => {
  const settings = await getSettings()
  return getDashboard(settings.freezerApproachingWindowDays)
})
