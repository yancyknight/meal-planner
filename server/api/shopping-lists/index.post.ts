import { createShoppingListSchema } from '../../../shared/schemas/shoppingList'
import { createShoppingList } from '../../services/shoppingListService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createShoppingListSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }
  return createShoppingList(parsed.data)
})
