import { z } from 'zod'

export const updateSettingsSchema = z.object({
  householdSize: z.number().int().min(1).optional(),
  showAllergens: z.boolean().optional(),
  backupIntervalHours: z.number().int().min(1).optional(),
  backupRetainCount: z.number().int().min(1).optional(),
}).strict()

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
