import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { db } from '../../server/database/index'
import { appSettings } from '../../server/database/schema'
import {
  seedDefaults,
  getSettings,
  updateSettings,
} from '../../server/services/settingsService'

beforeEach(async () => {
  await db.delete(appSettings)
})

describe('seedDefaults', () => {
  it('inserts householdSize and appName with correct defaults', async () => {
    await seedDefaults()
    const settings = await getSettings()
    expect(settings.householdSize).toBe(3)
    expect(settings.appName).toBe('Meal Planner')
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
  it('returns defaults when table is empty', async () => {
    const settings = await getSettings()
    expect(settings.householdSize).toBe(3)
    expect(settings.appName).toBe('Meal Planner')
  })

  it('returns stored values after seeding', async () => {
    await seedDefaults()
    const settings = await getSettings()
    expect(typeof settings.householdSize).toBe('number')
    expect(typeof settings.appName).toBe('string')
  })
})

describe('updateSettings', () => {
  it('updates householdSize without affecting appName', async () => {
    await seedDefaults()
    const result = await updateSettings({ householdSize: 4 })
    expect(result.householdSize).toBe(4)
    expect(result.appName).toBe('Meal Planner')
  })

  it('updates appName without affecting householdSize', async () => {
    await seedDefaults()
    const result = await updateSettings({ appName: 'Our Kitchen' })
    expect(result.appName).toBe('Our Kitchen')
    expect(result.householdSize).toBe(3)
  })

  it('updates both fields at once', async () => {
    await seedDefaults()
    const result = await updateSettings({ householdSize: 2, appName: 'Just Us' })
    expect(result.householdSize).toBe(2)
    expect(result.appName).toBe('Just Us')
  })

  it('persists changes across subsequent getSettings calls', async () => {
    await seedDefaults()
    await updateSettings({ householdSize: 6 })
    const settings = await getSettings()
    expect(settings.householdSize).toBe(6)
  })
})
