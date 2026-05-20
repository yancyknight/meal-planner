import { z } from 'zod'

export const recipeImportRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
})

export type RecipeImportRequest = z.infer<typeof recipeImportRequestSchema>
