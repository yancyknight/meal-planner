import { z } from 'zod'

export const createShoppingListSchema = z.object({
  name: z.string().min(1),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const updateShoppingListItemSchema = z.object({
  checked: z.boolean(),
})

export const updateShoppingListDoneSchema = z.object({
  isDone: z.boolean(),
})

export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>
