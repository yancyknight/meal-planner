import { updateFreezerItemSchema } from '../../../shared/schemas/freezer'
import { updateFreezerItem } from '../../services/freezerItemService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const body = await readBody(event)
  const parsed = updateFreezerItemSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const item = await updateFreezerItem(id, parsed.data)
  if (!item) throw createError({ statusCode: 404, message: 'Freezer item not found' })
  return item
})
