import { deleteFreezerCategory } from '../../services/freezerCategoryService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const result = await deleteFreezerCategory(id)
  if (!result.deleted) {
    throw createError({ statusCode: 409, message: result.reason ?? 'Cannot delete category' })
  }
  return { ok: true }
})
