import { recipeImportHtmlRequestSchema } from '../../../shared/schemas/recipeImport'
import { parseRecipeHtml } from '../../services/recipeImportService'
import { create as createPendingImport } from '../../services/pendingRecipeImportService'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }

  const body = await readBody(event)
  const parsed = recipeImportHtmlRequestSchema.safeParse(body)
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request' }
  }

  try {
    const result = parseRecipeHtml(parsed.data.html, parsed.data.url)
    const importId = await createPendingImport(result)
    return { importId }
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    setResponseStatus(event, 422)
    return { error: msg }
  }
})
