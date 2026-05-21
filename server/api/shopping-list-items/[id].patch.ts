import { updateShoppingListItemSchema } from '../../../shared/schemas/shoppingList'
import { checkItem } from '../../services/shoppingListService'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody(event)
  const parsed = updateShoppingListItemSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const updated = await checkItem(id, parsed.data.checked)
  if (!updated) throw createError({ statusCode: 404, message: 'Item not found' })
  return { success: true }
})
