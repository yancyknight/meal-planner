import { createCanonicalIngredientSchema } from '../../../shared/schemas/ingredient'
import { findOrCreateCanonical, setWalmartUrl } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createCanonicalIngredientSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const canonical = await findOrCreateCanonical(parsed.data.name)
  if (parsed.data.walmartUrl !== undefined) {
    return setWalmartUrl(canonical.id, parsed.data.walmartUrl ?? null)
  }
  return canonical
})
