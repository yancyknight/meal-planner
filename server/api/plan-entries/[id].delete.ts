import { deletePlanEntry } from '../../services/planEntryService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid plan entry ID' }
  }

  const deleted = await deletePlanEntry(id)
  if (!deleted) {
    setResponseStatus(event, 404)
    return { error: 'Plan entry not found' }
  }

  setResponseStatus(event, 204)
  return null
})
