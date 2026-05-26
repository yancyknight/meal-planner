import { deleteFreezer } from '../../services/freezerService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const result = await deleteFreezer(id)
  if (!result.deleted) {
    throw createError({ statusCode: 409, message: result.reason ?? 'Cannot delete freezer' })
  }
  return { ok: true }
})
