import { createDishSchema } from '../../../shared/schemas/dish'
import { createDish } from '../../services/dishService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createDishSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  setResponseStatus(event, 201)
  return createDish(result.data)
})
