import { deleteDish } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  const result = await deleteDish(id)

  if (result.hasPlanEntries) {
    setResponseStatus(event, 409)
    return { error: 'Cannot delete a dish that has plan entries. Archive it instead.' }
  }

  if (!result.deleted) {
    setResponseStatus(event, 404)
    return { error: 'Dish not found' }
  }

  setResponseStatus(event, 204)
  return null
})
