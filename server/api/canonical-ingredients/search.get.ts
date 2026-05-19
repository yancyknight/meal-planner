import { fuzzySearch } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  if (!q) return []
  return fuzzySearch(q)
})
