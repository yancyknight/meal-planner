import { z } from 'zod'

export const createCanonicalIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  walmartUrl: z.string().url('Must be a valid URL').nullable().optional(),
})

export const updateCanonicalIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  walmartUrl: z.string().url('Must be a valid URL').nullable().optional(),
})

export const mergeCanonicalIngredientsSchema = z.object({
  primaryId: z.number().int().positive(),
  secondaryId: z.number().int().positive(),
})

export const dishIngredientInputSchema = z.object({
  rawText: z.string().min(1, 'Raw text is required'),
  canonicalIngredientId: z.number().int().positive(),
  sortOrder: z.number().int().default(0),
})

export const setDishIngredientsSchema = z.array(dishIngredientInputSchema)

export type CreateCanonicalIngredientInput = z.infer<typeof createCanonicalIngredientSchema>
export type UpdateCanonicalIngredientInput = z.infer<typeof updateCanonicalIngredientSchema>
export type MergeCanonicalIngredientsInput = z.infer<typeof mergeCanonicalIngredientsSchema>
export type DishIngredientInput = z.infer<typeof dishIngredientInputSchema>
