import { updateFreezerCategorySchema } from '../../../shared/schemas/freezer'
import { updateFreezerCategory } from '../../services/freezerCategoryService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid id' })
  const body = await readBody(event)
  const parsed = updateFreezerCategorySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const category = await updateFreezerCategory(id, parsed.data)
  if (!category) throw createError({ statusCode: 404, message: 'Category not found' })
  return category
})
