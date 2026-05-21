import { deleteExpired } from '../../services/shoppingListService'

export default defineTask({
  meta: {
    name: 'shopping-lists:cleanup',
    description: 'Delete shopping lists that have been done for more than 36 hours',
  },
  async run() {
    const deleted = await deleteExpired()
    return { result: `Deleted ${deleted} expired shopping list(s)` }
  },
})
