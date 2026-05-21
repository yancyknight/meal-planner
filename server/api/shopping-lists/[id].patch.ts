import { updateShoppingListDoneSchema } from '../../../shared/schemas/shoppingList'
import { setDone } from '../../services/shoppingListService'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody(event)
  const parsed = updateShoppingListDoneSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const list = await setDone(id, parsed.data.isDone)
  if (!list) throw createError({ statusCode: 404, message: 'Shopping list not found' })
  return list
})
