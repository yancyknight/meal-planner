import { listByDateRange } from '../../services/planEntryService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const start = typeof query.start === 'string' ? query.start : undefined
  const end = typeof query.end === 'string' ? query.end : undefined

  if (!start || !end) {
    setResponseStatus(event, 400)
    return { error: 'start and end query params are required (YYYY-MM-DD)' }
  }

  return listByDateRange(start, end)
})
