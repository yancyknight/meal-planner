import { runWeeklyDigest } from '../../services/freezerNotificationService'
import { getSettings } from '../../services/settingsService'

export default defineTask({
  meta: {
    name: 'freezer:weekly-digest',
    description: 'Send weekly freezer digest (hourly heartbeat; internal day/hour guard)',
  },
  async run() {
    const settings = await getSettings()
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const hour = now.getUTCHours()

    if (dayOfWeek !== settings.freezerWeeklyDigestDay || hour !== settings.freezerWeeklyDigestHour) {
      return { result: 'Not the scheduled time — skipped' }
    }

    await runWeeklyDigest()
    return { result: 'Weekly digest sent' }
  },
})
