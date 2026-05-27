import { z } from 'zod'

// --- Freezer ---

export const createFreezerSchema = z.object({
  name: z.string().trim().min(1),
})

export const updateFreezerSchema = z.object({
  name: z.string().trim().min(1),
})

export type CreateFreezerInput = z.infer<typeof createFreezerSchema>
export type UpdateFreezerInput = z.infer<typeof updateFreezerSchema>

// --- FreezerCategory ---

export const createFreezerCategorySchema = z.object({
  name: z.string().trim().min(1),
  defaultLifetimeDays: z.number().int().min(1),
})

export const updateFreezerCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  defaultLifetimeDays: z.number().int().min(1).optional(),
}).refine(d => d.name !== undefined || d.defaultLifetimeDays !== undefined, {
  message: 'At least one field must be provided',
})

export type CreateFreezerCategoryInput = z.infer<typeof createFreezerCategorySchema>
export type UpdateFreezerCategoryInput = z.infer<typeof updateFreezerCategorySchema>

// --- FreezerItem ---

export const freezerItemStatusSchema = z.enum(['active', 'used', 'wasted'])

export const createFreezerItemSchema = z.object({
  freezerId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1),
  notes: z.string().nullable().optional(),
  dishId: z.number().int().positive().nullable().optional(),
  canonicalIngredientId: z.number().int().positive().nullable().optional(),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lifetimeDaysOverride: z.number().int().min(1).nullable().optional(),
  targetUseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eligibleForPlanning: z.boolean().optional(),
})

export const updateFreezerItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  notes: z.string().nullable().optional(),
  dishId: z.number().int().positive().nullable().optional(),
  canonicalIngredientId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().optional(),
  freezerId: z.number().int().positive().optional(),
  targetUseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eligibleForPlanning: z.boolean().optional(),
})

export const listFreezerItemsSchema = z.object({
  freezerId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: freezerItemStatusSchema.optional(),
})

export type CreateFreezerItemInput = z.infer<typeof createFreezerItemSchema>
export type UpdateFreezerItemInput = z.infer<typeof updateFreezerItemSchema>
export type ListFreezerItemsInput = z.infer<typeof listFreezerItemsSchema>
