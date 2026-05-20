import { updateSettingsSchema } from '../../../shared/schemas/settings'
import { updateSettings } from '../../services/settingsService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = updateSettingsSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }
  return updateSettings(result.data)
})
