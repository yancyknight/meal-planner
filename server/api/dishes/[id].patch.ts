import { updateDishSchema } from '../../../shared/schemas/dish'
import { updateDish } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  const body = await readBody(event)
  const result = updateDishSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  const dish = await updateDish(id, result.data)
  if (!dish) {
    setResponseStatus(event, 404)
    return { error: 'Dish not found' }
  }

  return dish
})
