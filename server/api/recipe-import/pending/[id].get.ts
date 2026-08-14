import { get } from '../../../services/pendingRecipeImportService'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Import id required' }
  }

  const result = await get(id)
  if (!result) {
    setResponseStatus(event, 404)
    return { error: 'Import not found or expired' }
  }
  return result
})
