import { createPlanEntrySchema } from '../../../shared/schemas/planEntry'
import { createPlanEntry } from '../../services/planEntryService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createPlanEntrySchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  setResponseStatus(event, 201)
  return createPlanEntry(result.data)
})
