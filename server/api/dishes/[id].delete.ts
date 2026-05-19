import { deleteDish } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  const deleted = await deleteDish(id)
  if (!deleted) {
    setResponseStatus(event, 404)
    return { error: 'Dish not found' }
  }

  setResponseStatus(event, 204)
  return null
})
