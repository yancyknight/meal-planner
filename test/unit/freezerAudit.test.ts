import { describe, it, expect, beforeEach, vi } from 'vitest'

import { db } from '../../server/database/index'
import { freezers, freezerItems, freezerCategories } from '../../server/database/schema'
import { completeAudit, getFreezer } from '../../server/services/freezerService'
import { markFreezerItemUsed, markFreezerItemWasted } from '../../server/services/freezerItemService'

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

async function seedFreezer(name = 'Kitchen') {
  const now = new Date().toISOString()
  const [row] = await db.insert(freezers).values({ name, createdAt: now, updatedAt: now }).returning()
  return row!
}

async function seedCategory(name = 'Other', days = 90) {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(freezerCategories)
    .values({ name, defaultLifetimeDays: days, isSystem: 0, createdAt: now, updatedAt: now })
    .returning()
  return row!
}

async function seedItem(freezerId: number, categoryId: number, name = 'Chicken breast') {
  const now = new Date().toISOString()
  const addedAt = '2026-01-01'
  const tossByDate = '2026-10-01'
  const targetUseDate = '2026-05-16'
  const [row] = await db
    .insert(freezerItems)
    .values({
      freezerId,
      categoryId,
      name,
      addedAt,
      tossByDate,
      targetUseDate,
      status: 'active',
      lifetimeDaysOverride: null,
      notes: null,
      dishId: null,
      canonicalIngredientId: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row!
}

describe('freezerService.completeAudit', () => {
  let freezerId: number
  let categoryId: number

  beforeEach(async () => {
    await db.delete(freezerItems)
    await db.delete(freezers)
    await db.delete(freezerCategories)
    const f = await seedFreezer()
    freezerId = f.id
    const c = await seedCategory()
    categoryId = c.id
  })

  it('sets lastAuditedAt to a recent timestamp and returns the updated freezer', async () => {
    const before = Date.now()
    const result = await completeAudit(freezerId)
    const after = Date.now()

    expect(result).not.toBeNull()
    expect(result!.id).toBe(freezerId)
    expect(result!.lastAuditedAt).not.toBeNull()

    const ts = new Date(result!.lastAuditedAt!).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('returns null for an unknown freezer id', async () => {
    const result = await completeAudit(99999)
    expect(result).toBeNull()
  })

  it('does not update lastAuditedAt when item decisions are made (mid-audit writes)', async () => {
    const item = await seedItem(freezerId, categoryId)

    // Mark item used — simulates a mid-audit decision
    await markFreezerItemUsed(item.id)

    // lastAuditedAt should still be null (not updated by item status changes)
    const freezer = await getFreezer(freezerId)
    expect(freezer!.lastAuditedAt).toBeNull()
  })

  it('updates lastAuditedAt only on explicit audit-complete call', async () => {
    const item = await seedItem(freezerId, categoryId)
    await markFreezerItemWasted(item.id)

    // Still null before completeAudit
    expect((await getFreezer(freezerId))!.lastAuditedAt).toBeNull()

    await completeAudit(freezerId)

    expect((await getFreezer(freezerId))!.lastAuditedAt).not.toBeNull()
  })

  it('can be called multiple times — each call updates the timestamp', async () => {
    await completeAudit(freezerId)
    const first = (await getFreezer(freezerId))!.lastAuditedAt!

    // Brief pause to ensure timestamps differ
    await new Promise(r => setTimeout(r, 5))

    await completeAudit(freezerId)
    const second = (await getFreezer(freezerId))!.lastAuditedAt!

    expect(new Date(second).getTime()).toBeGreaterThanOrEqual(new Date(first).getTime())
  })
})
