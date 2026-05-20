import { recipeImportRequestSchema } from '../../../shared/schemas/recipeImport'
import { importFromUrl } from '../../services/recipeImportService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = recipeImportRequestSchema.safeParse(body)
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request' }
  }

  try {
    return await importFromUrl(parsed.data.url)
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    setResponseStatus(event, 422)
    return { error: msg }
  }
})
