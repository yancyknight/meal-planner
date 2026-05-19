import { setDishIngredientsSchema } from '../../../../shared/schemas/ingredient'
import { setDishIngredients } from '../../../services/ingredientService'
import { getDishById } from '../../../services/dishService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid dish ID' })
  }
  const dish = await getDishById(id)
  if (!dish) {
    throw createError({ statusCode: 404, message: 'Dish not found' })
  }
  const body = await readBody(event)
  const parsed = setDishIngredientsSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  return setDishIngredients(id, parsed.data)
})
