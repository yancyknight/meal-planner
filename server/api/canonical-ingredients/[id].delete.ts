import { deleteCanonical } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }
  const deleted = await deleteCanonical(id)
  if (!deleted) {
    throw createError({ statusCode: 409, message: 'Cannot delete: ingredient is used by one or more dishes' })
  }
  return { success: true }
})
