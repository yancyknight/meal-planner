import { getDishById } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  const dish = await getDishById(id)
  if (!dish) {
    setResponseStatus(event, 404)
    return { error: 'Dish not found' }
  }

  return dish
})
