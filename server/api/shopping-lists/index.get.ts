import { listShoppingLists } from '../../services/shoppingListService'

export default defineEventHandler(async () => {
  return listShoppingLists()
})
