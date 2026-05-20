import { mergeCanonicalIngredientsSchema } from '../../../shared/schemas/ingredient'
import { mergeCanonicals, getCanonicalIngredient } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = mergeCanonicalIngredientsSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const { primaryId, secondaryId } = parsed.data
  if (primaryId === secondaryId) {
    throw createError({ statusCode: 400, message: 'Cannot merge an ingredient with itself' })
  }
  const [primary, secondary] = await Promise.all([
    getCanonicalIngredient(primaryId),
    getCanonicalIngredient(secondaryId),
  ])
  if (!primary) throw createError({ statusCode: 404, message: 'Primary ingredient not found' })
  if (!secondary) throw createError({ statusCode: 404, message: 'Secondary ingredient not found' })
  await mergeCanonicals(primaryId, secondaryId)
  return primary
})
