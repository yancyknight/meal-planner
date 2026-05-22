import { listDishes } from '../../services/dishService'
import type { DishSort } from '../../../shared/types/dish'

const VALID_SORTS: DishSort[] = ['name_asc', 'created_desc', 'last_cooked_desc', 'target_interval_asc']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' && query.search ? query.search : undefined
  const archived = query.archived === 'true'
  const tagIdRaw = query.tagId
  const tagId = typeof tagIdRaw === 'string' && tagIdRaw ? Number(tagIdRaw) : undefined
  const virtualTagId = typeof query.virtualTagId === 'string' && query.virtualTagId ? query.virtualTagId : undefined
  const sortRaw = typeof query.sort === 'string' ? query.sort : undefined
  const sort = VALID_SORTS.includes(sortRaw as DishSort) ? (sortRaw as DishSort) : undefined

  return listDishes({ search, archived, tagId, virtualTagId, sort })
})
