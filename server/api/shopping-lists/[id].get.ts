import { getById } from '../../services/shoppingListService'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const list = await getById(id)
  if (!list) throw createError({ statusCode: 404, message: 'Shopping list not found' })
  return list
})
