import { z } from 'zod'

export const FREE_FROM_PRESETS = ['gluten-free', 'dairy-free', 'nut-free', 'shellfish-free', 'egg-free', 'soy-free', 'peanut-free'] as const
export const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter'] as const
export const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'] as const

const frequencyRefinement = (d: { cooldownDays?: number; targetIntervalDays?: number }) => {
  if (d.cooldownDays !== undefined && d.targetIntervalDays !== undefined) {
    return d.cooldownDays <= d.targetIntervalDays
  }
  return true
}
const frequencyRefinementOptions = {
  message: 'cooldownDays must be ≤ targetIntervalDays',
  path: ['cooldownDays'],
}

const dishFields = z.object({
  name: z.string().min(1, 'Name is required'),
  imageUrl: z.string().url().nullable().optional(),
  imageLocalPath: z.string().nullable().optional(),
  timeEstimateMinutes: z.number().int().positive().nullable().optional(),
  yieldServings: z.number().int().positive().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  difficulty: z.enum(DIFFICULTY_OPTIONS).nullable().optional(),
  freeFrom: z.array(z.enum(FREE_FROM_PRESETS)).optional(),
  season: z.array(z.enum(SEASON_OPTIONS)).optional(),
  notes: z.string().nullable().optional(),
  cooldownDays: z.number().int().min(1).optional(),
  targetIntervalDays: z.number().int().min(1).optional(),
  excludedFromSuggestions: z.boolean().optional(),
  archived: z.boolean().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
})

export const createDishSchema = dishFields.refine(frequencyRefinement, frequencyRefinementOptions)
export const updateDishSchema = dishFields.partial().refine(frequencyRefinement, frequencyRefinementOptions)

export type CreateDishInput = z.infer<typeof createDishSchema>
export type UpdateDishInput = z.infer<typeof updateDishSchema>
