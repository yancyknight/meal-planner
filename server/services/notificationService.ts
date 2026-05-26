import { getSettings } from './settingsService'

export interface NtfyPayload {
  title: string
  message: string
  priority?: number
  click?: string
  tags?: string[]
}

export async function sendNtfy(payload: NtfyPayload): Promise<boolean> {
  const settings = await getSettings()

  if (!settings.freezerNotificationsEnabled || !settings.ntfyTopic) {
    console.log('[ntfy] notifications disabled or topic not set — skip')
    return false
  }

  const base = settings.ntfyServerUrl.replace(/\/+$/, '')
  const url = `${base}/${settings.ntfyTopic}`

  const headers: Record<string, string> = {
    'Title': payload.title,
    'Priority': String(payload.priority ?? 3),
  }
  if (payload.click) headers['Click'] = payload.click
  if (payload.tags?.length) headers['Tags'] = payload.tags.join(',')
  if (settings.ntfyAuthToken) headers['Authorization'] = `Bearer ${settings.ntfyAuthToken}`

  try {
    await fetch(url, { method: 'POST', headers, body: payload.message })
    return true
  }
  catch (err) {
    console.warn('[ntfy] send failed:', err)
    return false
  }
}
