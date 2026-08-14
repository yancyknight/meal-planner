import { z } from 'zod'

export const recipeImportRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
})

export type RecipeImportRequest = z.infer<typeof recipeImportRequestSchema>

export const recipeImportHtmlRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  html: z.string().min(1, 'Page HTML is required').max(5_000_000, 'Page HTML is too large'),
})

export type RecipeImportHtmlRequest = z.infer<typeof recipeImportHtmlRequestSchema>
