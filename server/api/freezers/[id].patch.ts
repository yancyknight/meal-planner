import { updateFreezerSchema } from '../../../shared/schemas/freezer'
import { updateFreezer } from '../../services/freezerService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const body = await readBody(event)
  const parsed = updateFreezerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const freezer = await updateFreezer(id, parsed.data)
  if (!freezer) throw createError({ statusCode: 404, message: 'Freezer not found' })
  return freezer
})
