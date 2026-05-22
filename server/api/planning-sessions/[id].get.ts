import { getPlanningSession } from '../../services/planningSessionService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400)
    return { error: 'Invalid id' }
  }

  const session = await getPlanningSession(id)
  if (!session) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  return session
})
