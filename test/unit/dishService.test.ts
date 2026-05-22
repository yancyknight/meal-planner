import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createDishSchema } from '../../shared/schemas/dish'

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
import { dishes, planEntries } from '../../server/database/schema'
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
  await db.delete(planEntries)
  await db.delete(dishes)
})

describe('createDish', () => {
  it('creates a dish with required fields and correct defaults', async () => {
    const dish = await createDish({ name: 'Spaghetti' })
    expect(dish.id).toBeTypeOf('number')
    expect(dish.name).toBe('Spaghetti')
    expect(dish.cooldownDays).toBe(7)
    expect(dish.targetIntervalDays).toBe(14)
    expect(dish.excludedFromSuggestions).toBe(false)
    expect(dish.freeFrom).toEqual([])
    expect(dish.season).toEqual([])
    expect(dish.archived).toBe(false)
    expect(dish.createdAt).toBeTypeOf('string')
  })

  it('stores and deserialises JSON array fields', async () => {
    const dish = await createDish({
      name: 'Full Dish',
      freeFrom: ['gluten-free', 'dairy-free'],
      season: ['spring', 'winter'],
    })
    expect(dish.freeFrom).toEqual(['gluten-free', 'dairy-free'])
    expect(dish.season).toEqual(['spring', 'winter'])
  })

  it('stores all optional fields', async () => {
    const dish = await createDish({
      name: 'Rich Dish',
      difficulty: 'hard',
      timeEstimateMinutes: 90,
      yieldServings: 6,
      cooldownDays: 10,
      targetIntervalDays: 21,
      notes: 'Some notes',
    })
    expect(dish.difficulty).toBe('hard')
    expect(dish.timeEstimateMinutes).toBe(90)
    expect(dish.yieldServings).toBe(6)
    expect(dish.cooldownDays).toBe(10)
    expect(dish.targetIntervalDays).toBe(21)
    expect(dish.notes).toBe('Some notes')
  })

  it('stores excludedFromSuggestions as boolean', async () => {
    const dish = await createDish({ name: 'Excluded', excludedFromSuggestions: true })
    expect(dish.excludedFromSuggestions).toBe(true)
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
    const dish = await createDish({ name: 'Old Name', cooldownDays: 5 })
    const updated = await updateDish(dish.id, { name: 'New Name' })
    expect(updated?.name).toBe('New Name')
    expect(updated?.cooldownDays).toBe(5)
  })

  it('updates JSON array fields correctly', async () => {
    const dish = await createDish({ name: 'Dish' })
    const updated = await updateDish(dish.id, { freeFrom: ['nut-free', 'soy-free'] })
    expect(updated?.freeFrom).toEqual(['nut-free', 'soy-free'])
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
  it('deletes an existing dish with no plan entries', async () => {
    const dish = await createDish({ name: 'Bye' })
    const result = await deleteDish(dish.id)
    expect(result).toEqual({ deleted: true, hasPlanEntries: false })
    expect(await getDishById(dish.id)).toBeNull()
  })

  it('returns deleted: false for a non-existent id', async () => {
    const result = await deleteDish(999999)
    expect(result).toEqual({ deleted: false, hasPlanEntries: false })
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

describe('createDishSchema freeFrom validation', () => {
  it('accepts all preset values', () => {
    const presets = ['gluten-free', 'dairy-free', 'nut-free', 'shellfish-free', 'egg-free', 'soy-free', 'peanut-free']
    const result = createDishSchema.safeParse({ name: 'Dish', freeFrom: presets })
    expect(result.success).toBe(true)
  })

  it('rejects unknown / legacy values', () => {
    // Old "contains" names must not slip through under the new "free from" semantic.
    const result = createDishSchema.safeParse({ name: 'Dish', freeFrom: ['gluten'] })
    expect(result.success).toBe(false)
  })

  it('accepts an empty array (no claims)', () => {
    const result = createDishSchema.safeParse({ name: 'Dish', freeFrom: [] })
    expect(result.success).toBe(true)
  })
})

describe('listDishes sort', () => {
  it('name_asc returns dishes in alphabetical order', async () => {
    await createDish({ name: 'Zucchini' })
    await createDish({ name: 'Apple Pie' })
    await createDish({ name: 'Muffins' })
    const list = await listDishes({ sort: 'name_asc' })
    expect(list.map(d => d.name)).toEqual(['Apple Pie', 'Muffins', 'Zucchini'])
  })

  it('target_interval_asc returns dishes ordered by shortest interval first', async () => {
    await createDish({ name: 'Weekly', cooldownDays: 4, targetIntervalDays: 7 })
    await createDish({ name: 'Monthly', cooldownDays: 15, targetIntervalDays: 30 })
    await createDish({ name: 'Biweekly', cooldownDays: 7, targetIntervalDays: 14 })
    const list = await listDishes({ sort: 'target_interval_asc' })
    expect(list.map(d => d.name)).toEqual(['Weekly', 'Biweekly', 'Monthly'])
  })

  it('last_cooked_desc puts most-recently-cooked first, never-cooked last', async () => {
    const a = await createDish({ name: 'Old Cooked' })
    const b = await createDish({ name: 'Recent Cooked' })
    await createDish({ name: 'Never Cooked' })

    await db.insert(planEntries).values({
      dishId: a.id, date: '2026-01-01', mealType: 'dinner', entryKind: 'fresh',
      guestCount: 0, createdAt: new Date().toISOString(),
    })
    await db.insert(planEntries).values({
      dishId: b.id, date: '2026-03-01', mealType: 'dinner', entryKind: 'fresh',
      guestCount: 0, createdAt: new Date().toISOString(),
    })

    const list = await listDishes({ sort: 'last_cooked_desc' })
    expect(list[0]!.name).toBe('Recent Cooked')
    expect(list[1]!.name).toBe('Old Cooked')
    expect(list[2]!.name).toBe('Never Cooked')
  })

  it('last_cooked_desc ignores leftover entries', async () => {
    const a = await createDish({ name: 'Fresh Only' })
    const b = await createDish({ name: 'Leftover Only' })

    await db.insert(planEntries).values({
      dishId: a.id, date: '2026-02-01', mealType: 'dinner', entryKind: 'fresh',
      guestCount: 0, createdAt: new Date().toISOString(),
    })
    await db.insert(planEntries).values({
      dishId: b.id, date: '2026-05-01', mealType: 'lunch', entryKind: 'leftover',
      guestCount: 0, createdAt: new Date().toISOString(),
    })

    const list = await listDishes({ sort: 'last_cooked_desc' })
    // Fresh Only has a fresh entry; Leftover Only has no fresh entry → sorted last
    expect(list[0]!.name).toBe('Fresh Only')
    expect(list[1]!.name).toBe('Leftover Only')
  })
})

describe('listDishes virtualTagId filter', () => {
  it('v:quick returns only dishes with time ≤ 20 min', async () => {
    await createDish({ name: 'Fast', timeEstimateMinutes: 15 })
    await createDish({ name: 'Slow', timeEstimateMinutes: 60 })
    await createDish({ name: 'Unknown' })
    const list = await listDishes({ virtualTagId: 'v:quick' })
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Fast')
  })

  it('v:easy returns only dishes with difficulty = easy', async () => {
    await createDish({ name: 'Easy Dish', difficulty: 'easy' })
    await createDish({ name: 'Hard Dish', difficulty: 'hard' })
    await createDish({ name: 'No Difficulty' })
    const list = await listDishes({ virtualTagId: 'v:easy' })
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Easy Dish')
  })

  it('v:dairy-free returns only dishes with dairy-free in freeFrom', async () => {
    await createDish({ name: 'Dairy Free', freeFrom: ['dairy-free', 'nut-free'] })
    await createDish({ name: 'Nut Free Only', freeFrom: ['nut-free'] })
    await createDish({ name: 'No Claims' })
    const list = await listDishes({ virtualTagId: 'v:dairy-free' })
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Dairy Free')
  })

  it('virtualTagId stacks with search filter (AND logic)', async () => {
    await createDish({ name: 'Quick Pasta', timeEstimateMinutes: 10 })
    await createDish({ name: 'Quick Tacos', timeEstimateMinutes: 18 })
    await createDish({ name: 'Slow Pasta', timeEstimateMinutes: 90 })
    const list = await listDishes({ virtualTagId: 'v:quick', search: 'pasta' })
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Quick Pasta')
  })
})

describe('createDishSchema frequency field validation', () => {
  it('accepts cooldownDays equal to targetIntervalDays', () => {
    const result = createDishSchema.safeParse({ name: 'Dish', cooldownDays: 7, targetIntervalDays: 7 })
    expect(result.success).toBe(true)
  })

  it('accepts cooldownDays less than targetIntervalDays', () => {
    const result = createDishSchema.safeParse({ name: 'Dish', cooldownDays: 4, targetIntervalDays: 7 })
    expect(result.success).toBe(true)
  })

  it('rejects cooldownDays greater than targetIntervalDays', () => {
    const result = createDishSchema.safeParse({ name: 'Dish', cooldownDays: 10, targetIntervalDays: 7 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('cooldownDays')
    }
  })
})
