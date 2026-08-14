import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateSettingsSchema } from '../../shared/schemas/settings'

import { db } from '../../server/database/index'
import { appSettings } from '../../server/database/schema'
import {
  seedDefaults,
  getSettings,
  updateSettings,
} from '../../server/services/settingsService'

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

beforeEach(async () => {
  await db.delete(appSettings)
})

describe('updateSettingsSchema', () => {
  it('accepts householdSize', () => {
    const r = updateSettingsSchema.safeParse({ householdSize: 4 })
    expect(r.success).toBe(true)
  })

  it('accepts an empty object', () => {
    const r = updateSettingsSchema.safeParse({})
    expect(r.success).toBe(true)
  })

  it('rejects appName — removed field', () => {
    const r = updateSettingsSchema.safeParse({ appName: 'My Kitchen' })
    expect(r.success).toBe(false)
  })

  it('rejects unknown fields alongside valid ones', () => {
    const r = updateSettingsSchema.safeParse({ householdSize: 3, appName: 'test' })
    expect(r.success).toBe(false)
  })
})

describe('seedDefaults', () => {
  it('inserts householdSize with correct default', async () => {
    await seedDefaults()
    const settings = await getSettings()
    expect(settings.householdSize).toBe(3)
  })

  it('is idempotent — calling twice does not change values', async () => {
    await seedDefaults()
    await updateSettings({ householdSize: 5 })
    await seedDefaults()
    const settings = await getSettings()
    expect(settings.householdSize).toBe(5)
  })
})

describe('getSettings', () => {
  it('returns default householdSize when table is empty', async () => {
    const settings = await getSettings()
    expect(settings.householdSize).toBe(3)
  })

  it('returns stored householdSize after seeding', async () => {
    await seedDefaults()
    const settings = await getSettings()
    expect(typeof settings.householdSize).toBe('number')
  })

  it('does not include appName in the returned object', async () => {
    await seedDefaults()
    const settings = await getSettings()
    expect('appName' in settings).toBe(false)
  })
})

describe('updateSettings', () => {
  it('updates householdSize', async () => {
    await seedDefaults()
    const result = await updateSettings({ householdSize: 4 })
    expect(result.householdSize).toBe(4)
  })

  it('persists changes across subsequent getSettings calls', async () => {
    await seedDefaults()
    await updateSettings({ householdSize: 6 })
    const settings = await getSettings()
    expect(settings.householdSize).toBe(6)
  })
})
