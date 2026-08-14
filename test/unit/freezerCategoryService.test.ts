import { describe, it, expect, beforeEach, vi } from 'vitest'

import { db } from '../../server/database/index'
import { freezerCategories } from '../../server/database/schema'
import {
  seedCategories,
  restoreDefaultCategories,
  listFreezerCategories,
} from '../../server/services/freezerCategoryService'

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
  await db.delete(freezerCategories)
})

describe('seedCategories', () => {
  it('inserts system categories when the table is empty', async () => {
    await seedCategories()
    const cats = await listFreezerCategories()
    expect(cats.length).toBeGreaterThan(0)
    expect(cats.every(c => c.isSystem === 1)).toBe(true)
  })

  it('is a no-op when rows already exist', async () => {
    await seedCategories()
    const countBefore = (await listFreezerCategories()).length

    await seedCategories()
    const countAfter = (await listFreezerCategories()).length

    expect(countAfter).toBe(countBefore)
  })
})

describe('listFreezerCategories', () => {
  it('does not re-insert a deleted system category', async () => {
    await seedCategories()
    const cats = await listFreezerCategories()
    const target = cats[0]!
    await db.delete(freezerCategories).where(
      (await import('drizzle-orm')).eq(freezerCategories.id, target.id),
    )

    const after = await listFreezerCategories()
    expect(after.find(c => c.id === target.id)).toBeUndefined()
  })
})

describe('restoreDefaultCategories', () => {
  it('re-inserts a previously deleted system category', async () => {
    await seedCategories()
    const cats = await listFreezerCategories()
    const target = cats.find(c => c.name === 'Raw Poultry')!
    await db.delete(freezerCategories).where(
      (await import('drizzle-orm')).eq(freezerCategories.id, target.id),
    )

    const afterDelete = await listFreezerCategories()
    expect(afterDelete.find(c => c.name === 'Raw Poultry')).toBeUndefined()

    await restoreDefaultCategories()
    const afterRestore = await listFreezerCategories()
    expect(afterRestore.find(c => c.name === 'Raw Poultry')).toBeDefined()
  })

  it('does not duplicate existing categories', async () => {
    await seedCategories()
    const countBefore = (await listFreezerCategories()).length

    await restoreDefaultCategories()
    const countAfter = (await listFreezerCategories()).length

    expect(countAfter).toBe(countBefore)
  })
})
