import { z } from 'zod'

const todayStr = () => new Date().toISOString().slice(0, 10)

export const dishCooldownPutSchema = z.object({
  endsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endsAt must be YYYY-MM-DD')
    .refine((d) => d >= todayStr(), { message: 'endsAt must be today or in the future' }),
})

export type DishCooldownPutBody = z.infer<typeof dishCooldownPutSchema>
