import { createTagSchema } from '../../../shared/schemas/tag'
import { findOrCreateTag } from '../../services/tagService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createTagSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  setResponseStatus(event, 201)
  return findOrCreateTag(result.data.name, result.data.color)
})
