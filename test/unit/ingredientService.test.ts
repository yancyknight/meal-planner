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
import { canonicalIngredients, dishIngredients, dishes, freezerItems, freezerCategories, freezers } from '../../server/database/schema'
import {
  listCanonicalIngredients,
  findOrCreateCanonical,
  renameCanonical,
  mergeCanonicals,
  deleteCanonical,
  getDishesByCanonical,
  fuzzySearch,
  getDishIngredients,
  setDishIngredients,
} from '../../server/services/ingredientService'
import { createDish } from '../../server/services/dishService'

beforeEach(async () => {
  await db.delete(dishIngredients)
  await db.delete(freezerItems)
  await db.delete(canonicalIngredients)
  await db.delete(dishes)
})

describe('findOrCreateCanonical', () => {
  it('creates a new canonical ingredient', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    expect(ci.id).toBeTypeOf('number')
    expect(ci.name).toBe('Garlic')
  })

  it('returns existing on duplicate call (case-insensitive dedup)', async () => {
    const a = await findOrCreateCanonical('Garlic')
    const b = await findOrCreateCanonical('garlic')
    expect(b.id).toBe(a.id)
  })

  it('preserves original casing on first create', async () => {
    const ci = await findOrCreateCanonical('Olive Oil')
    expect(ci.name).toBe('Olive Oil')
  })
})

describe('listCanonicalIngredients', () => {
  it('returns all ingredients in alphabetical order', async () => {
    await findOrCreateCanonical('Zucchini')
    await findOrCreateCanonical('Apple')
    await findOrCreateCanonical('Mango')
    const list = await listCanonicalIngredients()
    expect(list.map(i => i.name)).toEqual(['Apple', 'Mango', 'Zucchini'])
  })

  it('returns empty array when none exist', async () => {
    expect(await listCanonicalIngredients()).toEqual([])
  })
})

describe('renameCanonical', () => {
  it('renames an ingredient', async () => {
    const ci = await findOrCreateCanonical('Garlick')
    const renamed = await renameCanonical(ci.id, 'Garlic')
    expect(renamed?.name).toBe('Garlic')
  })

  it('returns null for non-existent id', async () => {
    expect(await renameCanonical(9999, 'Ghost')).toBeNull()
  })
})

describe('mergeCanonicals', () => {
  it('relinks dish_ingredients from secondary to primary and deletes secondary', async () => {
    const primary = await findOrCreateCanonical('Garlic')
    const secondary = await findOrCreateCanonical('garlic cloves')
    const dish = await createDish({ name: 'Pasta' })
    await setDishIngredients(dish.id, [
      { rawText: '2 cloves garlic cloves', canonicalIngredientId: secondary.id, sortOrder: 0 },
    ])

    await mergeCanonicals(primary.id, secondary.id)

    const ings = await getDishIngredients(dish.id)
    expect(ings[0]!.canonicalIngredientId).toBe(primary.id)

    const all = await listCanonicalIngredients()
    expect(all.find(i => i.id === secondary.id)).toBeUndefined()
  })

  it('throws when merging an ingredient with itself', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    await expect(mergeCanonicals(ci.id, ci.id)).rejects.toThrow()
  })
})

describe('deleteCanonical', () => {
  it('deletes an unused canonical', async () => {
    const ci = await findOrCreateCanonical('Unused')
    const deleted = await deleteCanonical(ci.id)
    expect(deleted).toBe(true)
    const list = await listCanonicalIngredients()
    expect(list.find(i => i.id === ci.id)).toBeUndefined()
  })

  it('refuses to delete a canonical in use', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    const dish = await createDish({ name: 'Pasta' })
    await setDishIngredients(dish.id, [
      { rawText: '3 cloves garlic', canonicalIngredientId: ci.id, sortOrder: 0 },
    ])
    const deleted = await deleteCanonical(ci.id)
    expect(deleted).toBe(false)
  })
})

describe('getDishesByCanonical', () => {
  it('returns dishes that use the canonical', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    const pasta = await createDish({ name: 'Pasta' })
    const soup = await createDish({ name: 'Soup' })
    await setDishIngredients(pasta.id, [{ rawText: '3 cloves', canonicalIngredientId: ci.id, sortOrder: 0 }])
    await setDishIngredients(soup.id, [{ rawText: '1 clove', canonicalIngredientId: ci.id, sortOrder: 0 }])

    const result = await getDishesByCanonical(ci.id)
    expect(result.map(d => d.name).sort()).toEqual(['Pasta', 'Soup'])
  })

  it('returns empty when no dishes use the canonical', async () => {
    const ci = await findOrCreateCanonical('Truffle')
    expect(await getDishesByCanonical(ci.id)).toEqual([])
  })
})

describe('setDishIngredients', () => {
  it('inserts ingredients for a dish', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    const dish = await createDish({ name: 'Pasta' })
    const result = await setDishIngredients(dish.id, [
      { rawText: '3 cloves garlic, minced', canonicalIngredientId: ci.id, sortOrder: 0 },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]!.rawText).toBe('3 cloves garlic, minced')
    expect(result[0]!.canonical.name).toBe('Garlic')
  })

  it('replaces all ingredients on second call', async () => {
    const ci1 = await findOrCreateCanonical('Garlic')
    const ci2 = await findOrCreateCanonical('Onion')
    const dish = await createDish({ name: 'Pasta' })
    await setDishIngredients(dish.id, [
      { rawText: '3 cloves garlic', canonicalIngredientId: ci1.id, sortOrder: 0 },
    ])
    await setDishIngredients(dish.id, [
      { rawText: '1 onion, diced', canonicalIngredientId: ci2.id, sortOrder: 0 },
    ])
    const ings = await getDishIngredients(dish.id)
    expect(ings).toHaveLength(1)
    expect(ings[0]!.canonical.name).toBe('Onion')
  })

  it('clears all ingredients when passed empty array', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    const dish = await createDish({ name: 'Pasta' })
    await setDishIngredients(dish.id, [
      { rawText: '3 cloves', canonicalIngredientId: ci.id, sortOrder: 0 },
    ])
    await setDishIngredients(dish.id, [])
    expect(await getDishIngredients(dish.id)).toHaveLength(0)
  })

  it('cascades delete when the dish is deleted', async () => {
    const ci = await findOrCreateCanonical('Garlic')
    const dish = await createDish({ name: 'Pasta' })
    await setDishIngredients(dish.id, [
      { rawText: '3 cloves', canonicalIngredientId: ci.id, sortOrder: 0 },
    ])
    await db.delete(dishes).where((await import('drizzle-orm')).eq(dishes.id, dish.id))
    const rows = await db.select().from(dishIngredients)
    expect(rows).toHaveLength(0)
  })
})

describe('fuzzySearch', () => {
  it('returns matches above threshold', async () => {
    await findOrCreateCanonical('Garlic')
    await findOrCreateCanonical('Olive Oil')
    const results = await fuzzySearch('garlic')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.canonical.name).toBe('Garlic')
  })

  it('returns empty array for empty query', async () => {
    await findOrCreateCanonical('Garlic')
    expect(await fuzzySearch('')).toEqual([])
  })

  it('returns empty array when library is empty', async () => {
    expect(await fuzzySearch('garlic')).toEqual([])
  })

  it('does not return poor matches', async () => {
    await findOrCreateCanonical('Zucchini')
    const results = await fuzzySearch('xyzzyx')
    expect(results).toHaveLength(0)
  })

  it('handles substring matches', async () => {
    await findOrCreateCanonical('Extra Virgin Olive Oil')
    const results = await fuzzySearch('olive oil')
    expect(results.length).toBeGreaterThan(0)
  })

  it('surfaces canonical when query is longer (bidirectional)', async () => {
    await findOrCreateCanonical('Olive Oil')
    const results = await fuzzySearch('Extra Virgin Olive Oil')
    expect(results.map(r => r.canonical.name)).toContain('Olive Oil')
  })

  it('surfaces canonical on exact match', async () => {
    await findOrCreateCanonical('Olive Oil')
    const results = await fuzzySearch('Olive Oil')
    expect(results.map(r => r.canonical.name)).toContain('Olive Oil')
  })
})

describe('mergeCanonicals — freezer_items relink', () => {
  it('relinks freezer_items.canonicalIngredientId to the primary', async () => {
    const now = new Date().toISOString()
    const primary = await findOrCreateCanonical('Chicken')
    const secondary = await findOrCreateCanonical('chicken pieces')

    // Seed a freezer + category so we can insert a freezer item
    const [freezer] = await db.insert(freezers).values({ name: 'Test Freezer', createdAt: now, updatedAt: now }).returning()
    const [category] = await db.insert(freezerCategories).values({
      name: 'Raw Poultry', defaultLifetimeDays: 270, isSystem: 0, createdAt: now, updatedAt: now,
    }).returning()

    const [item] = await db.insert(freezerItems).values({
      freezerId: freezer!.id,
      categoryId: category!.id,
      name: 'Chicken thighs',
      canonicalIngredientId: secondary.id,
      addedAt: '2026-06-01',
      tossByDate: '2027-02-26',
      targetUseDate: '2026-10-14',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).returning()

    await mergeCanonicals(primary.id, secondary.id)

    const [updated] = await db.select().from(freezerItems).where(
      (await import('drizzle-orm')).eq(freezerItems.id, item!.id),
    )
    expect(updated!.canonicalIngredientId).toBe(primary.id)

    const all = await listCanonicalIngredients()
    expect(all.find(c => c.id === secondary.id)).toBeUndefined()
  })
})
