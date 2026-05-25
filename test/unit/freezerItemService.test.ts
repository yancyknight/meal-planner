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
import { freezerItems, freezerCategories, freezers } from '../../server/database/schema'
import {
  createFreezerItem,
  getFreezerItem,
  listFreezerItems,
  markFreezerItemUsed,
  markFreezerItemWasted,
  getDashboard,
  computeDates,
} from '../../server/services/freezerItemService'
import { seedCategories, listFreezerCategories } from '../../server/services/freezerCategoryService'

let freezerId: number
let categoryId: number

async function seedFreezer(name = 'Kitchen Freezer') {
  const now = new Date().toISOString()
  const [row] = await db.insert(freezers).values({ name, createdAt: now, updatedAt: now }).returning()
  return row!
}

async function seedCategory(name = 'Cooked Leftovers', defaultLifetimeDays = 90) {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(freezerCategories)
    .values({ name, defaultLifetimeDays, isSystem: 0, createdAt: now, updatedAt: now })
    .returning()
  return row!
}

beforeEach(async () => {
  await db.delete(freezerItems)
  await db.delete(freezerCategories)
  await db.delete(freezers)

  const f = await seedFreezer()
  freezerId = f.id
  const c = await seedCategory()
  categoryId = c.id
})

// ---- computeDates (pure, no DB) ----

describe('computeDates', () => {
  it('tossByDate = addedAt + lifetimeDays', () => {
    const { tossByDate } = computeDates('2026-01-01', 90)
    expect(tossByDate).toBe('2026-04-01')
  })

  it('targetUseDate is the midpoint of addedAt and tossByDate', () => {
    const { targetUseDate } = computeDates('2026-01-01', 90)
    // Jan 1 + 90d = Apr 1; midpoint = Jan 1 + 45d = Feb 15
    const mid = new Date('2026-02-15T00:00:00Z').toISOString().slice(0, 10)
    expect(targetUseDate).toBe(mid)
  })

  it('uses lifetimeDaysOverride when provided', () => {
    const { tossByDate } = computeDates('2026-01-01', 30)
    expect(tossByDate).toBe('2026-01-31')
  })

  it('works across year boundaries', () => {
    const { tossByDate } = computeDates('2025-12-01', 60)
    expect(tossByDate).toBe('2026-01-30')
  })
})

// ---- createFreezerItem ----

describe('createFreezerItem', () => {
  it('uses category default lifetime when no override', async () => {
    const item = await createFreezerItem({
      freezerId,
      categoryId,
      name: 'Leftover chili',
      addedAt: '2026-06-01',
    })
    expect(item.tossByDate).toBe('2026-08-30') // +90 days
    expect(item.status).toBe('active')
    expect(item.lifetimeDaysOverride).toBeNull()
  })

  it('uses lifetimeDaysOverride when provided', async () => {
    const item = await createFreezerItem({
      freezerId,
      categoryId,
      name: 'Quick use item',
      addedAt: '2026-06-01',
      lifetimeDaysOverride: 30,
    })
    expect(item.tossByDate).toBe('2026-07-01') // +30 days
    expect(item.lifetimeDaysOverride).toBe(30)
  })

  it('accepts a caller-supplied targetUseDate override', async () => {
    const item = await createFreezerItem({
      freezerId,
      categoryId,
      name: 'Custom target',
      addedAt: '2026-06-01',
      targetUseDate: '2026-07-15',
    })
    expect(item.targetUseDate).toBe('2026-07-15')
  })

  it('stores status = active by default', async () => {
    const item = await createFreezerItem({
      freezerId, categoryId, name: 'Test', addedAt: '2026-06-01',
    })
    expect(item.status).toBe('active')
    expect(item.statusChangedAt).toBeNull()
  })

  it('throws when category is not found', async () => {
    await expect(createFreezerItem({
      freezerId, categoryId: 99999, name: 'X', addedAt: '2026-06-01',
    })).rejects.toThrow('Category not found')
  })
})

// ---- status transitions ----

describe('markFreezerItemUsed', () => {
  it('sets status to used and records statusChangedAt', async () => {
    const item = await createFreezerItem({
      freezerId, categoryId, name: 'Chicken', addedAt: '2026-06-01',
    })
    const updated = await markFreezerItemUsed(item.id)
    expect(updated!.status).toBe('used')
    expect(updated!.statusChangedAt).not.toBeNull()
  })

  it('returns null for non-existent id', async () => {
    const result = await markFreezerItemUsed(99999)
    expect(result).toBeNull()
  })
})

describe('markFreezerItemWasted', () => {
  it('sets status to wasted and records statusChangedAt', async () => {
    const item = await createFreezerItem({
      freezerId, categoryId, name: 'Salmon', addedAt: '2026-06-01',
    })
    const updated = await markFreezerItemWasted(item.id)
    expect(updated!.status).toBe('wasted')
    expect(updated!.statusChangedAt).not.toBeNull()
  })
})

// ---- listFreezerItems default filter ----

describe('listFreezerItems', () => {
  it('returns only active items by default', async () => {
    const a = await createFreezerItem({ freezerId, categoryId, name: 'Active', addedAt: '2026-06-01' })
    await markFreezerItemUsed(a.id)
    await createFreezerItem({ freezerId, categoryId, name: 'Still active', addedAt: '2026-06-01' })

    const list = await listFreezerItems()
    expect(list.every(i => i.status === 'active')).toBe(true)
    expect(list.length).toBe(1)
  })

  it('filters by freezerId', async () => {
    const other = await seedFreezer('Garage Freezer')
    await createFreezerItem({ freezerId, categoryId, name: 'Kitchen item', addedAt: '2026-06-01' })
    await createFreezerItem({ freezerId: other.id, categoryId, name: 'Garage item', addedAt: '2026-06-01' })

    const list = await listFreezerItems({ freezerId: other.id })
    expect(list.length).toBe(1)
    expect(list[0]!.name).toBe('Garage item')
  })
})

// ---- getDashboard bucketing ----

describe('getDashboard', () => {
  it('puts items past tossByDate in expired bucket', async () => {
    await createFreezerItem({ freezerId, categoryId, name: 'Expired', addedAt: '2020-01-01', lifetimeDaysOverride: 1 })
    const dash = await getDashboard(14)
    const expiredNames = dash.expired.flatMap(g => g.items).map(i => i.name)
    expect(expiredNames).toContain('Expired')
  })

  it('puts items within the approaching window in approaching bucket', async () => {
    // Toss by = today + 5 days → inside 14-day window
    const addedAt = new Date()
    addedAt.setUTCDate(addedAt.getUTCDate() - 25) // 25 days ago + 30 days lifetime = toss in 5 days
    const addedStr = addedAt.toISOString().slice(0, 10)
    await createFreezerItem({ freezerId, categoryId, name: 'Approaching', addedAt: addedStr, lifetimeDaysOverride: 30 })
    const dash = await getDashboard(14)
    const names = dash.approaching.flatMap(g => g.items).map(i => i.name)
    expect(names).toContain('Approaching')
  })

  it('puts items added within 7 days in recentlyAdded bucket', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3)
    const addedStr = threeDaysAgo.toISOString().slice(0, 10)
    await createFreezerItem({ freezerId, categoryId, name: 'Recent', addedAt: addedStr })
    const dash = await getDashboard(14)
    const names = dash.recentlyAdded.flatMap(g => g.items).map(i => i.name)
    expect(names).toContain('Recent')
  })

  it('groups items by freezer within each bucket', async () => {
    const garage = await seedFreezer('Garage')
    const addedAt = new Date()
    addedAt.setUTCDate(addedAt.getUTCDate() - 95) // past any 90-day category
    const addedStr = addedAt.toISOString().slice(0, 10)
    await createFreezerItem({ freezerId, categoryId, name: 'Kitchen expired', addedAt: addedStr, lifetimeDaysOverride: 1 })
    await createFreezerItem({ freezerId: garage.id, categoryId, name: 'Garage expired', addedAt: addedStr, lifetimeDaysOverride: 1 })

    const dash = await getDashboard(14)
    expect(dash.expired.length).toBe(2)
    const freezerNames = dash.expired.map(g => g.freezer.name).sort()
    expect(freezerNames).toContain('Garage')
  })

  it('excludes used and wasted items from all buckets', async () => {
    const item = await createFreezerItem({ freezerId, categoryId, name: 'Consumed', addedAt: '2020-01-01', lifetimeDaysOverride: 1 })
    await markFreezerItemUsed(item.id)
    const dash = await getDashboard(14)
    const allNames = [
      ...dash.expired.flatMap(g => g.items),
      ...dash.approaching.flatMap(g => g.items),
      ...dash.recentlyAdded.flatMap(g => g.items),
    ].map(i => i.name)
    expect(allNames).not.toContain('Consumed')
  })
})

// ---- seedCategories (idempotent) ----

describe('seedCategories', () => {
  it('seeds 17 default categories on first call', async () => {
    await seedCategories()
    const cats = await listFreezerCategories()
    expect(cats.length).toBe(17)
  })

  it('is idempotent — second call does not duplicate', async () => {
    await seedCategories()
    await seedCategories()
    const cats = await listFreezerCategories()
    expect(cats.length).toBe(17)
  })
})
