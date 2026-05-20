import { z } from 'zod'

export const updateSettingsSchema = z.object({
  householdSize: z.number().int().min(1).optional(),
  appName: z.string().min(1).optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
