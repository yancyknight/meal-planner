import { getCanonicalIngredient, getDishesByCanonical } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }
  const canonical = await getCanonicalIngredient(id)
  if (!canonical) {
    throw createError({ statusCode: 404, message: 'Ingredient not found' })
  }
  const dishes = await getDishesByCanonical(id)
  return { ...canonical, dishes }
})
