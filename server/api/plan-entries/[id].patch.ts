import { updatePlanEntrySchema } from '../../../shared/schemas/planEntry'
import { updatePlanEntry } from '../../services/planEntryService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid plan entry ID' }
  }

  const body = await readBody(event)
  const parsed = updatePlanEntrySchema.safeParse(body)
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { error: parsed.error.flatten() }
  }

  const entry = await updatePlanEntry(id, parsed.data)
  if (!entry) {
    setResponseStatus(event, 404)
    return { error: 'Plan entry not found' }
  }

  return entry
})
