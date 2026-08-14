import { z } from 'zod'

const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'uncategorized'])
const slotStateSchema = z.enum(['plan', 'skip', 'one-off', 'keep'])

const tagRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('real'), tagId: z.number().int().positive() }),
  z.object({ kind: z.literal('virtual'), id: z.string().min(1) }),
])

const pinnedTagSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: mealTypeSchema,
  tagRef: tagRefSchema,
})

const pendingOneOffEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: mealTypeSchema,
  text: z.string().min(1),
})

export const createPlanningSessionSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealTypes: z.array(mealTypeSchema).min(1),
})

export const patchPlanningSessionSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealTypes: z.array(mealTypeSchema).min(1).optional(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  slotStates: z.record(z.string(), slotStateSchema).optional(),
  removedPlanEntryIds: z.array(z.number().int().positive()).optional(),
  pendingOneOffEntries: z.array(pendingOneOffEntrySchema).optional(),
  sessionVirtualTags: z.array(z.string()).optional(),
  pinnedTags: z.array(pinnedTagSchema).optional(),
  wishlistTags: z.array(z.number().int().positive()).optional(),
  draftPlan: z.record(z.string(), z.object({
    kind: z.enum(['dish', 'leftover-suggestion', 'standalone-freezer']),
    dishId: z.number().int(),
    freezerItemId: z.number().int().positive().optional(),
    oneOffText: z.string().optional(),
    isManualOverride: z.boolean().optional(),
    warningLabels: z.array(z.string()).optional(),
    wishlistTag: z.number().int().positive().optional(),
    leftoverFor: z.string().optional(),
  })).optional(),
  shownDishIdsBySlot: z.record(z.string(), z.array(z.number().int().positive())).optional(),
  leftoverToggles: z.record(z.string(), z.boolean()).optional(),
  status: z.enum(['in_progress', 'finalizing']).optional(),
})

export const rerollSchema = z.object({
  slotKey: z.string().min(1),
})

export const generateDraftSchema = z.object({})

export const finalizeSchema = z.object({})

export type CreatePlanningSessionInput = z.infer<typeof createPlanningSessionSchema>
export type PatchPlanningSessionInput = z.infer<typeof patchPlanningSessionSchema>
export type RerollInput = z.infer<typeof rerollSchema>
