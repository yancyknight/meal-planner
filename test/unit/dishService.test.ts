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
import { dishes } from '../../server/database/schema'
import {
  createDish,
  getDishById,
  listDishes,
  updateDish,
  deleteDish,
  archiveDish,
  unarchiveDish,
} from '../../server/services/dishService'

beforeEach(async () => {
  await db.delete(dishes)
})

describe('createDish', () => {
  it('creates a dish with required fields and correct defaults', async () => {
    const dish = await createDish({ name: 'Spaghetti' })
    expect(dish.id).toBeTypeOf('number')
    expect(dish.name).toBe('Spaghetti')
    expect(dish.weight).toBe(50)
    expect(dish.allergens).toEqual([])
    expect(dish.season).toEqual([])
    expect(dish.archived).toBe(false)
    expect(dish.createdAt).toBeTypeOf('string')
  })

  it('stores and deserialises JSON array fields', async () => {
    const dish = await createDish({
      name: 'Full Dish',
      allergens: ['gluten', 'dairy'],
      season: ['spring', 'winter'],
    })
    expect(dish.allergens).toEqual(['gluten', 'dairy'])
    expect(dish.season).toEqual(['spring', 'winter'])
  })

  it('stores all optional fields', async () => {
    const dish = await createDish({
      name: 'Rich Dish',
      difficulty: 'hard',
      timeEstimateMinutes: 90,
      yieldServings: 6,
      weight: 80,
      notes: 'Some notes',
    })
    expect(dish.difficulty).toBe('hard')
    expect(dish.timeEstimateMinutes).toBe(90)
    expect(dish.yieldServings).toBe(6)
    expect(dish.weight).toBe(80)
    expect(dish.notes).toBe('Some notes')
  })
})

describe('getDishById', () => {
  it('returns the dish when it exists', async () => {
    const created = await createDish({ name: 'My Dish' })
    const found = await getDishById(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe('My Dish')
  })

  it('returns null for a non-existent id', async () => {
    expect(await getDishById(999999)).toBeNull()
  })
})

describe('listDishes', () => {
  it('returns only non-archived dishes by default', async () => {
    await createDish({ name: 'Active' })
    await createDish({ name: 'Gone', archived: true })
    const list = await listDishes()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Active')
  })

  it('returns archived dishes when archived=true', async () => {
    await createDish({ name: 'Active' })
    await createDish({ name: 'Gone', archived: true })
    const list = await listDishes({ archived: true })
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Gone')
  })

  it('filters by name search term (case-insensitive)', async () => {
    await createDish({ name: 'Spaghetti Carbonara' })
    await createDish({ name: 'Tacos al Pastor' })
    const list = await listDishes({ search: 'carbon' })
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Spaghetti Carbonara')
  })

  it('returns empty array when search has no matches', async () => {
    await createDish({ name: 'Tacos' })
    expect(await listDishes({ search: 'zzz' })).toHaveLength(0)
  })
})

describe('updateDish', () => {
  it('updates specified fields only', async () => {
    const dish = await createDish({ name: 'Old Name', weight: 50 })
    const updated = await updateDish(dish.id, { name: 'New Name' })
    expect(updated?.name).toBe('New Name')
    expect(updated?.weight).toBe(50)
  })

  it('updates JSON array fields correctly', async () => {
    const dish = await createDish({ name: 'Dish' })
    const updated = await updateDish(dish.id, { allergens: ['nuts', 'soy'] })
    expect(updated?.allergens).toEqual(['nuts', 'soy'])
  })

  it('sets nullable fields to null', async () => {
    const dish = await createDish({ name: 'Dish', notes: 'some notes' })
    const updated = await updateDish(dish.id, { notes: null })
    expect(updated?.notes).toBeNull()
  })

  it('returns null for non-existent id', async () => {
    expect(await updateDish(999999, { name: 'X' })).toBeNull()
  })
})

describe('deleteDish', () => {
  it('deletes an existing dish and returns true', async () => {
    const dish = await createDish({ name: 'Bye' })
    expect(await deleteDish(dish.id)).toBe(true)
    expect(await getDishById(dish.id)).toBeNull()
  })

  it('returns false for a non-existent id', async () => {
    expect(await deleteDish(999999)).toBe(false)
  })
})

describe('archiveDish / unarchiveDish', () => {
  it('sets archived to true', async () => {
    const dish = await createDish({ name: 'Fresh' })
    expect(dish.archived).toBe(false)
    const archived = await archiveDish(dish.id)
    expect(archived?.archived).toBe(true)
  })

  it('sets archived to false', async () => {
    const dish = await createDish({ name: 'Old', archived: true })
    const unarchived = await unarchiveDish(dish.id)
    expect(unarchived?.archived).toBe(false)
  })

  it('archived dishes are excluded from default list', async () => {
    const dish = await createDish({ name: 'Hidden' })
    await archiveDish(dish.id)
    expect(await listDishes()).toHaveLength(0)
    expect(await listDishes({ archived: true })).toHaveLength(1)
  })
})
