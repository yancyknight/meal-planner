import { markFreezerItemUsed } from '../../../services/freezerItemService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const item = await markFreezerItemUsed(id)
  if (!item) throw createError({ statusCode: 404, message: 'Freezer item not found' })
  return item
})
