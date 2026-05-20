import { deleteList } from '../../services/shoppingListService'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const deleted = await deleteList(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Shopping list not found' })
  return { success: true }
})
