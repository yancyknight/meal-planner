import { updateCanonicalIngredientSchema } from '../../../shared/schemas/ingredient'
import { renameCanonical, setWalmartUrl, getCanonicalIngredient } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }
  const body = await readBody(event)
  const parsed = updateCanonicalIngredientSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const existing = await getCanonicalIngredient(id)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Ingredient not found' })
  }
  let result = existing
  if (parsed.data.name !== undefined) {
    result = (await renameCanonical(id, parsed.data.name)) ?? existing
  }
  if (parsed.data.walmartUrl !== undefined) {
    result = (await setWalmartUrl(id, parsed.data.walmartUrl ?? null)) ?? result
  }
  return result
})
