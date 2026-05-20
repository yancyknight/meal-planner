import { z } from 'zod'

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'uncategorized'] as const
export const ENTRY_KINDS = ['fresh', 'leftover', 'one-off'] as const

const basePlanEntry = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: z.enum(MEAL_TYPES),
  entryKind: z.enum(ENTRY_KINDS).default('fresh'),
  dishId: z.number().int().positive().nullable().optional(),
  oneOffText: z.string().min(1).nullable().optional(),
  guestCount: z.number().int().min(0).default(0),
})

export const createPlanEntrySchema = basePlanEntry.superRefine((val, ctx) => {
  if (val.entryKind === 'one-off') {
    if (!val.oneOffText) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'oneOffText is required for one-off entries', path: ['oneOffText'] })
    }
    if (val.dishId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dishId must be null for one-off entries', path: ['dishId'] })
    }
  } else {
    if (val.dishId == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dishId is required for fresh and leftover entries', path: ['dishId'] })
    }
    if (val.oneOffText != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'oneOffText must be null for fresh and leftover entries', path: ['oneOffText'] })
    }
  }
})

export type CreatePlanEntryInput = z.infer<typeof createPlanEntrySchema>

export const updatePlanEntrySchema = basePlanEntry
  .pick({ date: true, mealType: true, guestCount: true })
  .partial()
  .strict()

export type UpdatePlanEntryInput = z.infer<typeof updatePlanEntrySchema>
