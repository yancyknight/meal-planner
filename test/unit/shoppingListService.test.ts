import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createShoppingListSchema } from '../../shared/schemas/shoppingList'

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
import {
  dishes,
  canonicalIngredients,
  dishIngredients,
  planEntries,
  shoppingLists,
  shoppingListItems,
} from '../../server/database/schema'
import {
  createShoppingList,
  listShoppingLists,
  getById,
  checkItem,
  setDone,
  deleteList,
  deleteExpired,
} from '../../server/services/shoppingListService'

async function seedDish(name: string) {
  const now = new Date().toISOString()
  const [row] = await db.insert(dishes).values({
    name, freeFrom: '[]', season: '[]', cooldownDays: 7,
    targetIntervalDays: 14, excludedFromSuggestions: 0,
    archived: false, createdAt: now, updatedAt: now,
  }).returning()
  return row!
}

async function seedIngredient(name: string) {
  const now = new Date().toISOString()
  const [row] = await db.insert(canonicalIngredients).values({
    name, createdAt: now, updatedAt: now,
  }).returning()
  return row!
}

async function seedDishIngredient(dishId: number, canonicalIngredientId: number, rawText: string) {
  await db.insert(dishIngredients).values({ dishId, canonicalIngredientId, rawText, sortOrder: 0 })
}

async function seedPlanEntry(
  dishId: number | null,
  date: string,
  entryKind: string = 'fresh',
  oneOffText: string | null = null,
) {
  const now = new Date().toISOString()
  await db.insert(planEntries).values({
    date, mealType: 'dinner', entryKind, dishId, oneOffText, guestCount: 0, createdAt: now,
  })
}

beforeEach(async () => {
  await db.delete(shoppingListItems)
  await db.delete(shoppingLists)
  await db.delete(dishIngredients)
  await db.delete(planEntries)
  await db.delete(dishes)
  await db.delete(canonicalIngredients)
})

// ── Zod schema ───────────────────────────────────────────────────

describe('createShoppingListSchema', () => {
  it('accepts valid input', () => {
    const r = createShoppingListSchema.safeParse({
      name: 'Week of May 19',
      dateRangeStart: '2025-05-19',
      dateRangeEnd: '2025-05-25',
    })
    expect(r.success).toBe(true)
  })

  it('accepts omitted name (name is now optional)', () => {
    const r = createShoppingListSchema.safeParse({
      dateRangeStart: '2025-05-19',
      dateRangeEnd: '2025-05-25',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const r = createShoppingListSchema.safeParse({
      dateRangeStart: '05/19/2025',
      dateRangeEnd: '2025-05-25',
    })
    expect(r.success).toBe(false)
  })
})

// ── List generation ──────────────────────────────────────────────

describe('createShoppingList — ingredient grouping', () => {
  it('groups ingredients from multiple dishes by canonical', async () => {
    const garlic = await seedIngredient('Garlic')
    const onion = await seedIngredient('Onion')
    const pasta = await seedIngredient('Pasta')

    const dishA = await seedDish('Pasta Arrabbiata')
    const dishB = await seedDish('Garlic Bread')

    await seedDishIngredient(dishA.id, garlic.id, '4 cloves garlic')
    await seedDishIngredient(dishA.id, pasta.id, '200g pasta')
    await seedDishIngredient(dishB.id, garlic.id, '2 tbsp minced garlic')
    await seedDishIngredient(dishB.id, onion.id, '1 onion')

    await seedPlanEntry(dishA.id, '2025-05-20')
    await seedPlanEntry(dishB.id, '2025-05-21')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })

    expect(list.items).toHaveLength(3)

    const garlicItem = list.items.find(i => i.canonicalName === 'Garlic')!
    expect(garlicItem).toBeDefined()
    expect(garlicItem.sourceDishIds).toHaveLength(2)
    expect(garlicItem.rawTexts).toContain('4 cloves garlic')
    expect(garlicItem.rawTexts).toContain('2 tbsp minced garlic')
    expect(garlicItem.sourceDishNames).toContain('Pasta Arrabbiata')
    expect(garlicItem.sourceDishNames).toContain('Garlic Bread')

    const pastaItem = list.items.find(i => i.canonicalName === 'Pasta')!
    expect(pastaItem.sourceDishIds).toHaveLength(1)
    expect(pastaItem.rawTexts).toEqual(['200g pasta'])
  })

  it('one-off entry with null text does not appear (no contribution)', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Garlic Soup')
    await seedDishIngredient(dish.id, garlic.id, '3 cloves garlic')

    await seedPlanEntry(dish.id, '2025-05-20', 'fresh')
    await seedPlanEntry(null, '2025-05-21', 'one-off', null)

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    expect(list.items).toHaveLength(1)
    expect(list.items[0]!.canonicalName).toBe('Garlic')
  })

  it('one-off entry with text appears as a separate item with null canonicalName', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Garlic Soup')
    await seedDishIngredient(dish.id, garlic.id, '3 cloves garlic')

    await seedPlanEntry(dish.id, '2025-05-20', 'fresh')
    await seedPlanEntry(null, '2025-05-21', 'one-off', 'Burger King')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    expect(list.items).toHaveLength(2)

    const ingredientItem = list.items.find(i => i.canonicalName === 'Garlic')!
    expect(ingredientItem).toBeDefined()

    const oneOffItem = list.items.find(i => i.canonicalName === null)!
    expect(oneOffItem).toBeDefined()
    expect(oneOffItem.canonicalIngredientId).toBeNull()
    expect(oneOffItem.rawTexts).toEqual(['Burger King'])
    expect(oneOffItem.sourceDishIds).toEqual([])
  })

  it('multiple one-off entries each produce a separate item', async () => {
    await seedPlanEntry(null, '2025-05-20', 'one-off', 'Pizza Night')
    await seedPlanEntry(null, '2025-05-21', 'one-off', 'Dinner at Gram\'s House')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    expect(list.items).toHaveLength(2)
    const texts = list.items.map(i => i.rawTexts[0])
    expect(texts).toContain('Pizza Night')
    expect(texts).toContain('Dinner at Gram\'s House')
  })

  it('one-off items appear after ingredient items (sorted last)', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Garlic Bread')
    await seedDishIngredient(dish.id, garlic.id, '2 cloves')
    await seedPlanEntry(dish.id, '2025-05-20', 'fresh')
    await seedPlanEntry(null, '2025-05-20', 'one-off', 'Restaurant pickup')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    expect(list.items).toHaveLength(2)
    expect(list.items[0]!.canonicalName).toBe('Garlic')
    expect(list.items[1]!.canonicalName).toBeNull()
  })

  it('one-off item checkbox works (null canonical ingredient)', async () => {
    await seedPlanEntry(null, '2025-05-20', 'one-off', 'Takeout')
    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    const item = list.items[0]!
    expect(item.checked).toBe(false)

    await checkItem(item.id, true)
    const updated = await getById(list.id)
    expect(updated!.items[0]!.checked).toBe(true)
  })

  it('excludes leftover entries — only fresh entries contribute', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Roasted Garlic Chicken')
    await seedDishIngredient(dish.id, garlic.id, '1 head of garlic')

    // Fresh entry — contributes
    await seedPlanEntry(dish.id, '2025-05-20', 'fresh')
    // Leftover entry — does NOT contribute (already cooked)
    await seedPlanEntry(dish.id, '2025-05-21', 'leftover')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    // Garlic appears once (from fresh), not twice
    expect(list.items).toHaveLength(1)
    expect(list.items[0]!.sourceDishIds).toHaveLength(1)
  })

  it('produces an empty list when no fresh entries exist in range', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Garlic Soup')
    await seedDishIngredient(dish.id, garlic.id, '3 cloves garlic')
    // Entry outside the range
    await seedPlanEntry(dish.id, '2025-06-01', 'fresh')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    expect(list.items).toHaveLength(0)
  })

  it('items are ordered alphabetically by canonical name', async () => {
    const zucchini = await seedIngredient('Zucchini')
    const apple = await seedIngredient('Apple')
    const basil = await seedIngredient('Basil')
    const dish = await seedDish('Summer Ratatouille')
    await seedDishIngredient(dish.id, zucchini.id, '2 zucchini')
    await seedDishIngredient(dish.id, apple.id, '1 apple')
    await seedDishIngredient(dish.id, basil.id, 'fresh basil')
    await seedPlanEntry(dish.id, '2025-05-20')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    const names = list.items.map(i => i.canonicalName)
    expect(names).toEqual(['Apple', 'Basil', 'Zucchini'])
  })
})

// ── Check state ──────────────────────────────────────────────────

describe('checkItem', () => {
  it('marks a single item checked without affecting others', async () => {
    const garlic = await seedIngredient('Garlic')
    const onion = await seedIngredient('Onion')
    const dish = await seedDish('Soup')
    await seedDishIngredient(dish.id, garlic.id, '3 cloves')
    await seedDishIngredient(dish.id, onion.id, '1 onion')
    await seedPlanEntry(dish.id, '2025-05-20')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    const garlicItem = list.items.find(i => i.canonicalName === 'Garlic')!
    const onionItem = list.items.find(i => i.canonicalName === 'Onion')!

    await checkItem(garlicItem.id, true)

    const updated = await getById(list.id)
    expect(updated!.items.find(i => i.id === garlicItem.id)!.checked).toBe(true)
    expect(updated!.items.find(i => i.id === onionItem.id)!.checked).toBe(false)
  })

  it('can uncheck a previously checked item', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Garlic Toast')
    await seedDishIngredient(dish.id, garlic.id, '2 cloves')
    await seedPlanEntry(dish.id, '2025-05-20')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    const item = list.items[0]!

    await checkItem(item.id, true)
    await checkItem(item.id, false)

    const updated = await getById(list.id)
    expect(updated!.items[0]!.checked).toBe(false)
  })

  it('returns false for a non-existent item', async () => {
    const result = await checkItem(99999, true)
    expect(result).toBe(false)
  })
})

// ── Mark done / undo ─────────────────────────────────────────────

describe('setDone', () => {
  it('marks a list as done and records doneAt', async () => {
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25',
      isDone: 0, doneAt: null, createdAt: new Date().toISOString(),
    }).returning()

    const updated = await setDone(sl!.id, true)
    expect(updated!.isDone).toBe(true)
    expect(updated!.doneAt).not.toBeNull()
    expect(updated!.deletesAt).not.toBeNull()
  })

  it('undoes done, clearing doneAt and deletesAt', async () => {
    const now = new Date().toISOString()
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25',
      isDone: 1, doneAt: now, createdAt: now,
    }).returning()

    const updated = await setDone(sl!.id, false)
    expect(updated!.isDone).toBe(false)
    expect(updated!.doneAt).toBeNull()
    expect(updated!.deletesAt).toBeNull()
  })

  it('preserves the original doneAt if already set when re-marking done', async () => {
    const original = '2025-05-20T12:00:00.000Z'
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25',
      isDone: 1, doneAt: original, createdAt: original,
    }).returning()

    // Mark done again — should not move the doneAt clock forward
    const updated = await setDone(sl!.id, true)
    expect(updated!.doneAt).toBe(original)
  })
})

// ── Auto-delete timing ────────────────────────────────────────────

describe('deleteExpired', () => {
  it('deletes lists that have been done for more than 36 hours', async () => {
    const oldDoneAt = new Date(Date.now() - 37 * 60 * 60 * 1000).toISOString()
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Old', dateRangeStart: '2025-05-01', dateRangeEnd: '2025-05-07',
      isDone: 1, doneAt: oldDoneAt, createdAt: oldDoneAt,
    }).returning()

    const deleted = await deleteExpired()
    expect(deleted).toBe(1)

    const remaining = await getById(sl!.id)
    expect(remaining).toBeNull()
  })

  it('does not delete lists done within the last 36 hours', async () => {
    const recentDoneAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Recent', dateRangeStart: '2025-05-01', dateRangeEnd: '2025-05-07',
      isDone: 1, doneAt: recentDoneAt, createdAt: recentDoneAt,
    }).returning()

    const deleted = await deleteExpired()
    expect(deleted).toBe(0)

    const remaining = await getById(sl!.id)
    expect(remaining).not.toBeNull()
  })

  it('does not delete active (not done) lists', async () => {
    const now = new Date().toISOString()
    const [sl] = await db.insert(shoppingLists).values({
      name: 'Active', dateRangeStart: '2025-05-01', dateRangeEnd: '2025-05-07',
      isDone: 0, doneAt: null, createdAt: now,
    }).returning()

    const deleted = await deleteExpired()
    expect(deleted).toBe(0)

    const remaining = await getById(sl!.id)
    expect(remaining).not.toBeNull()
  })

  it('deletes cascade to shopping_list_items', async () => {
    const garlic = await seedIngredient('Garlic')
    const dish = await seedDish('Soup')
    await seedDishIngredient(dish.id, garlic.id, '2 cloves')
    await seedPlanEntry(dish.id, '2025-05-20')

    const list = await createShoppingList({ name: 'Test', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })

    const oldDoneAt = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString()
    await db.update(shoppingLists)
      .set({ isDone: 1, doneAt: oldDoneAt })
      .where((t => require('drizzle-orm').eq(t.id, list.id))(shoppingLists))

    await deleteExpired()

    const itemsRemaining = await db.select().from(shoppingListItems).where(
      (t => require('drizzle-orm').eq(t.shoppingListId, list.id))(shoppingListItems),
    )
    expect(itemsRemaining).toHaveLength(0)
  })
})

// ── listShoppingLists summary counts ─────────────────────────────

describe('listShoppingLists', () => {
  it('returns correct item and checked counts', async () => {
    const garlic = await seedIngredient('Garlic')
    const onion = await seedIngredient('Onion')
    const dish = await seedDish('Soup')
    await seedDishIngredient(dish.id, garlic.id, '3 cloves')
    await seedDishIngredient(dish.id, onion.id, '1 onion')
    await seedPlanEntry(dish.id, '2025-05-20')

    const list = await createShoppingList({ name: 'My List', dateRangeStart: '2025-05-19', dateRangeEnd: '2025-05-25' })
    const garlicItem = list.items.find(i => i.canonicalName === 'Garlic')!
    await checkItem(garlicItem.id, true)

    const summaries = await listShoppingLists()
    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.itemCount).toBe(2)
    expect(summaries[0]!.checkedCount).toBe(1)
  })
})
