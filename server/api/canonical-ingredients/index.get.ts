import { listCanonicalIngredients } from '../../services/ingredientService'

export default defineEventHandler(async () => {
  return listCanonicalIngredients()
})
