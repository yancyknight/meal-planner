import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import { db } from '../../server/database/index'
import { appSettings } from '../../server/database/schema'
import { sendNtfy } from '../../server/services/notificationService'

vi.mock('../../server/database/index', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('../../server/database/schema')

  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: 'server/database/migrations' })
  return { db }
})

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)

async function setSettings(overrides: Record<string, unknown>) {
  for (const [key, value] of Object.entries(overrides)) {
    await db
      .insert(appSettings)
      .values({ key, value: JSON.stringify(value) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(value) } })
  }
}

beforeEach(async () => {
  await db.delete(appSettings)
  fetchSpy.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendNtfy', () => {
  it('returns false and skips fetch when notifications are disabled', async () => {
    await setSettings({ freezerNotificationsEnabled: false, ntfyTopic: 'my-topic', ntfyServerUrl: 'https://ntfy.sh' })
    const result = await sendNtfy({ title: 'Test', message: 'hello' })
    expect(result).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns false and skips fetch when topic is empty', async () => {
    await setSettings({ freezerNotificationsEnabled: true, ntfyTopic: '', ntfyServerUrl: 'https://ntfy.sh' })
    const result = await sendNtfy({ title: 'Test', message: 'hello' })
    expect(result).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts to the correct URL with required headers', async () => {
    await setSettings({
      freezerNotificationsEnabled: true,
      ntfyTopic: 'my-topic',
      ntfyServerUrl: 'https://ntfy.sh',
      ntfyAuthToken: '',
    })
    fetchSpy.mockResolvedValue({ ok: true })

    const result = await sendNtfy({ title: 'Freezer alert', message: 'test body', priority: 3, tags: ['snowflake'] })

    expect(result).toBe(true)
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toBe('https://ntfy.sh/my-topic')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Title']).toBe('Freezer alert')
    expect(opts.headers['Priority']).toBe('3')
    expect(opts.headers['Tags']).toBe('snowflake')
    expect(opts.headers['Authorization']).toBeUndefined()
    expect(opts.body).toBe('test body')
  })

  it('includes Authorization header when auth token is set', async () => {
    await setSettings({
      freezerNotificationsEnabled: true,
      ntfyTopic: 'my-topic',
      ntfyServerUrl: 'https://ntfy.sh',
      ntfyAuthToken: 'secret-token',
    })
    fetchSpy.mockResolvedValue({ ok: true })

    await sendNtfy({ title: 'Test', message: 'body' })

    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(opts.headers['Authorization']).toBe('Bearer secret-token')
  })

  it('returns false and logs when fetch throws', async () => {
    await setSettings({
      freezerNotificationsEnabled: true,
      ntfyTopic: 'my-topic',
      ntfyServerUrl: 'https://ntfy.sh',
      ntfyAuthToken: '',
    })
    fetchSpy.mockRejectedValue(new Error('network error'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await sendNtfy({ title: 'Test', message: 'body' })

    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('strips trailing slash from server URL', async () => {
    await setSettings({
      freezerNotificationsEnabled: true,
      ntfyTopic: 'alerts',
      ntfyServerUrl: 'https://ntfy.example.com/',
      ntfyAuthToken: '',
    })
    fetchSpy.mockResolvedValue({ ok: true })

    await sendNtfy({ title: 'Test', message: 'body' })

    const [url] = fetchSpy.mock.calls[0] as [string]
    expect(url).toBe('https://ntfy.example.com/alerts')
  })
})
