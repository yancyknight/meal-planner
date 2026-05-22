import { dishCooldownPutSchema } from '../../../../shared/schemas/dishCooldown'
import * as dishCooldownService from '../../../services/dishCooldownService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid dish ID' })
  }
  const body = await readBody(event)
  const parsed = dishCooldownPutSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid body' })
  }
  await dishCooldownService.set(id, parsed.data.endsAt)
  const record = await dishCooldownService.get(id)
  return { cooldown: record }
})
