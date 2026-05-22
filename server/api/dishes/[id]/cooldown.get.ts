import * as dishCooldownService from '../../../services/dishCooldownService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid dish ID' })
  }
  const record = await dishCooldownService.get(id)
  return { cooldown: record }
})
