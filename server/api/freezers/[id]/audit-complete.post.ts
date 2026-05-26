import { completeAudit } from '../../../services/freezerService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const freezer = await completeAudit(id)
  if (!freezer) throw createError({ statusCode: 404, message: 'Freezer not found' })
  return freezer
})
