import { createFreezerCategorySchema } from '../../../shared/schemas/freezer'
import { createFreezerCategory } from '../../services/freezerCategoryService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createFreezerCategorySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  return createFreezerCategory(parsed.data)
})
