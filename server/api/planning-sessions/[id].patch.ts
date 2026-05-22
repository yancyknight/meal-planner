import { patchPlanningSessionSchema } from '../../../shared/schemas/planningSession'
import { patchPlanningSession } from '../../services/planningSessionService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400)
    return { error: 'Invalid id' }
  }

  const body = await readBody(event)
  const result = patchPlanningSessionSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await patchPlanningSession(id, result.data)
  if (!session) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  return session
})
