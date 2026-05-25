import { createFreezerItemSchema } from '../../../shared/schemas/freezer'
import { createFreezerItem } from '../../services/freezerItemService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createFreezerItemSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  return createFreezerItem(parsed.data)
})
