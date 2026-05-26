import { listFreezerCategories } from '../../services/freezerCategoryService'

export default defineEventHandler(async () => {
  return listFreezerCategories()
})
