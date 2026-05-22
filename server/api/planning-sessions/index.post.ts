import { createPlanningSessionSchema } from '../../../shared/schemas/planningSession'
import { createPlanningSession } from '../../services/planningSessionService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createPlanningSessionSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  setResponseStatus(event, 201)
  return createPlanningSession(result.data)
})
