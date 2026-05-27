import { z } from 'zod'

export const updateSettingsSchema = z.object({
  householdSize: z.number().int().min(1).optional(),
  showAllergens: z.boolean().optional(),
  backupIntervalHours: z.number().int().min(1).optional(),
  backupRetainCount: z.number().int().min(1).optional(),
  freezerApproachingWindowDays: z.number().int().min(1).optional(),
  freezerAuditOverdueDays: z.number().int().min(1).optional(),
  freezerNotificationsEnabled: z.boolean().optional(),
  ntfyServerUrl: z.string().optional(),
  ntfyTopic: z.string().optional(),
  ntfyAuthToken: z.string().optional(),
  freezerWeeklyDigestDay: z.number().int().min(0).max(6).optional(),
  freezerWeeklyDigestHour: z.number().int().min(0).max(23).optional(),
  siteBaseUrl: z.string().optional(),
}).strict()

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
