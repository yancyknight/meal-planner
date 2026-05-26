import { createFreezerSchema } from '../../../shared/schemas/freezer'
import { createFreezer } from '../../services/freezerService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createFreezerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  return createFreezer(parsed.data)
})
