import { z } from 'zod'

export const ALLERGEN_PRESETS = ['gluten', 'dairy', 'nuts', 'shellfish', 'eggs', 'soy', 'peanuts'] as const
export const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter'] as const
export const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'] as const

export const createDishSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  imageUrl: z.string().url().nullable().optional(),
  imageLocalPath: z.string().nullable().optional(),
  timeEstimateMinutes: z.number().int().positive().nullable().optional(),
  yieldServings: z.number().int().positive().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  difficulty: z.enum(DIFFICULTY_OPTIONS).nullable().optional(),
  allergens: z.array(z.string()).optional(),
  season: z.array(z.enum(SEASON_OPTIONS)).optional(),
  notes: z.string().nullable().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  minIntervalDays: z.number().int().positive().nullable().optional(),
  archived: z.boolean().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
})

export const updateDishSchema = createDishSchema.partial()

export type CreateDishInput = z.infer<typeof createDishSchema>
export type UpdateDishInput = z.infer<typeof updateDishSchema>
