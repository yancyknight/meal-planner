import { eq } from 'drizzle-orm'
import { db } from '../database'
import { appSettings } from '../database/schema'
import type { AppSettings } from '../../shared/types/settings'
import type { UpdateSettingsInput } from '../../shared/schemas/settings'

const DEFAULTS: AppSettings = {
  householdSize: 3,
  showAllergens: false,
  backupIntervalHours: 24,
  backupRetainCount: 7,
  freezerApproachingWindowDays: 14,
  freezerAuditOverdueDays: 60,
  freezerNotificationsEnabled: false,
  ntfyServerUrl: 'https://ntfy.sh',
  ntfyTopic: '',
  ntfyAuthToken: '',
  freezerWeeklyDigestDay: 0,
  freezerWeeklyDigestHour: 9,
}

export async function seedDefaults(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key))
    if (existing.length === 0) {
      await db.insert(appSettings).values({ key, value: JSON.stringify(value) })
    }
  }
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings)
  const map = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]))
  return {
    householdSize: typeof map.householdSize === 'number' ? map.householdSize : DEFAULTS.householdSize,
    showAllergens: typeof map.showAllergens === 'boolean' ? map.showAllergens : DEFAULTS.showAllergens,
    backupIntervalHours: typeof map.backupIntervalHours === 'number' ? map.backupIntervalHours : DEFAULTS.backupIntervalHours,
    backupRetainCount: typeof map.backupRetainCount === 'number' ? map.backupRetainCount : DEFAULTS.backupRetainCount,
    freezerApproachingWindowDays: typeof map.freezerApproachingWindowDays === 'number' ? map.freezerApproachingWindowDays : DEFAULTS.freezerApproachingWindowDays,
    freezerAuditOverdueDays: typeof map.freezerAuditOverdueDays === 'number' ? map.freezerAuditOverdueDays : DEFAULTS.freezerAuditOverdueDays,
    freezerNotificationsEnabled: typeof map.freezerNotificationsEnabled === 'boolean' ? map.freezerNotificationsEnabled : DEFAULTS.freezerNotificationsEnabled,
    ntfyServerUrl: typeof map.ntfyServerUrl === 'string' ? map.ntfyServerUrl : DEFAULTS.ntfyServerUrl,
    ntfyTopic: typeof map.ntfyTopic === 'string' ? map.ntfyTopic : DEFAULTS.ntfyTopic,
    ntfyAuthToken: typeof map.ntfyAuthToken === 'string' ? map.ntfyAuthToken : DEFAULTS.ntfyAuthToken,
    freezerWeeklyDigestDay: typeof map.freezerWeeklyDigestDay === 'number' ? map.freezerWeeklyDigestDay : DEFAULTS.freezerWeeklyDigestDay,
    freezerWeeklyDigestHour: typeof map.freezerWeeklyDigestHour === 'number' ? map.freezerWeeklyDigestHour : DEFAULTS.freezerWeeklyDigestHour,
  }
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      await db
        .insert(appSettings)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(value) } })
    }
  }
  return getSettings()
}
