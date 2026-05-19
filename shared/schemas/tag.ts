import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>
