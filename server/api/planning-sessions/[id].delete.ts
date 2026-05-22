import { deletePlanningSession } from '../../services/planningSessionService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400)
    return { error: 'Invalid id' }
  }

  const deleted = await deletePlanningSession(id)
  if (!deleted) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  setResponseStatus(event, 204)
  return null
})
