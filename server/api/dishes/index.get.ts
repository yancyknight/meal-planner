import { listDishes } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' && query.search ? query.search : undefined
  const archived = query.archived === 'true'

  return listDishes({ search, archived })
})
