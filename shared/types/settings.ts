export interface AppSettings {
  householdSize: number
  showAllergens: boolean
  backupIntervalHours: number
  backupRetainCount: number
  freezerApproachingWindowDays: number
  freezerAuditOverdueDays: number
  freezerNotificationsEnabled: boolean
  ntfyServerUrl: string
  ntfyTopic: string
  ntfyAuthToken: string
  freezerWeeklyDigestDay: number
  freezerWeeklyDigestHour: number
  siteBaseUrl: string
}
