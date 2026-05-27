import { restoreDefaultCategories, listFreezerCategories } from '../../services/freezerCategoryService'

export default defineEventHandler(async () => {
  await restoreDefaultCategories()
  return listFreezerCategories()
})
