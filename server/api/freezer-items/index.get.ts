import { listFreezerItemsSchema } from '../../../shared/schemas/freezer'
import { listFreezerItems } from '../../services/freezerItemService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = listFreezerItemsSchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid query' })
  }
  return listFreezerItems(parsed.data)
})
