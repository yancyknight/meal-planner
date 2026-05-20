import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlanEntrySchema } from '../../shared/schemas/planEntry'

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
  createPlanEntry,
  deletePlanEntry,
  listByDateRange,
  daysSinceLastServedFresh,
  hasEntriesForDish,
  hasLeftovers,
} from '../../server/services/planEntryService'

async function seedDish(name = 'Test Dish', yieldServings: number | null = null) {
  const now = new Date().toISOString()
  const rows = await db
    .insert(dishes)
    .values({
      name,
      allergens: '[]',
      season: '[]',
      cooldownDays: 7,
      targetIntervalDays: 14,
      excludedFromSuggestions: 0,
      archived: false,
      yieldServings,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return rows[0]!
}

beforeEach(async () => {
  await db.delete(planEntries)
  await db.delete(dishes)
})

// ── Zod schema validation ────────────────────────────────────────

describe('createPlanEntrySchema', () => {
  it('accepts a valid fresh entry', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'fresh', dishId: 1 })
    expect(r.success).toBe(true)
  })

  it('accepts a valid leftover entry', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'lunch', entryKind: 'leftover', dishId: 2 })
    expect(r.success).toBe(true)
  })

  it('accepts a valid one-off entry', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'one-off', oneOffText: 'Pizza night', dishId: null })
    expect(r.success).toBe(true)
  })

  it('rejects one-off without oneOffText', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'one-off', dishId: null })
    expect(r.success).toBe(false)
  })

  it('rejects one-off with dishId set', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'one-off', oneOffText: 'Takeout', dishId: 1 })
    expect(r.success).toBe(false)
  })

  it('rejects fresh without dishId', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'fresh' })
    expect(r.success).toBe(false)
  })

  it('rejects fresh with oneOffText', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', entryKind: 'fresh', dishId: 1, oneOffText: 'oops' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const r = createPlanEntrySchema.safeParse({ date: '01/15/2025', mealType: 'dinner', entryKind: 'fresh', dishId: 1 })
    expect(r.success).toBe(false)
  })

  it('defaults entryKind to fresh', () => {
    const r = createPlanEntrySchema.safeParse({ date: '2025-01-15', mealType: 'dinner', dishId: 1 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.entryKind).toBe('fresh')
  })
})

// ── CRUD ─────────────────────────────────────────────────────────

describe('createPlanEntry', () => {
  it('creates a fresh entry with dish data joined', async () => {
    const dish = await seedDish('Spaghetti')
    const entry = await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    expect(entry.id).toBeTypeOf('number')
    expect(entry.dishId).toBe(dish.id)
    expect(entry.dishName).toBe('Spaghetti')
    expect(entry.entryKind).toBe('fresh')
    expect(entry.guestCount).toBe(0)
    expect(entry.oneOffText).toBeNull()
  })

  it('creates a leftover entry', async () => {
    const dish = await seedDish()
    const entry = await createPlanEntry({ date: '2025-06-02', mealType: 'lunch', entryKind: 'leftover', dishId: dish.id, guestCount: 0 })
    expect(entry.entryKind).toBe('leftover')
    expect(entry.dishId).toBe(dish.id)
  })

  it('creates a one-off entry', async () => {
    const entry = await createPlanEntry({ date: '2025-06-03', mealType: 'dinner', entryKind: 'one-off', dishId: null, oneOffText: 'Burger King', guestCount: 0 })
    expect(entry.entryKind).toBe('one-off')
    expect(entry.oneOffText).toBe('Burger King')
    expect(entry.dishId).toBeNull()
    expect(entry.dishName).toBeNull()
  })
})

describe('deletePlanEntry', () => {
  it('deletes an existing entry', async () => {
    const dish = await seedDish()
    const entry = await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    const result = await deletePlanEntry(entry.id)
    expect(result).toBe(true)
    const remaining = await listByDateRange('2025-06-01', '2025-06-01')
    expect(remaining).toHaveLength(0)
  })

  it('returns false for non-existent id', async () => {
    expect(await deletePlanEntry(99999)).toBe(false)
  })
})

// ── Date range query ─────────────────────────────────────────────

describe('listByDateRange', () => {
  it('returns only entries within the range', async () => {
    const dish = await seedDish()
    await createPlanEntry({ date: '2025-05-31', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    await createPlanEntry({ date: '2025-06-03', mealType: 'lunch', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    await createPlanEntry({ date: '2025-06-04', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })

    const result = await listByDateRange('2025-06-01', '2025-06-03')
    expect(result).toHaveLength(2)
    expect(result.every(e => e.date >= '2025-06-01' && e.date <= '2025-06-03')).toBe(true)
  })

  it('returns an empty array when no entries in range', async () => {
    const result = await listByDateRange('2025-01-01', '2025-01-07')
    expect(result).toEqual([])
  })
})

// ── daysSinceLastServedFresh ──────────────────────────────────────

describe('daysSinceLastServedFresh', () => {
  it('returns null when dish has never been served fresh', async () => {
    const dish = await seedDish()
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-10')).toBeNull()
  })

  it('returns correct days since last fresh entry', async () => {
    const dish = await seedDish()
    await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-08')).toBe(7)
  })

  it('uses the most recent fresh entry when multiple exist', async () => {
    const dish = await seedDish()
    await createPlanEntry({ date: '2025-05-20', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    // Should use June 1 (most recent), not May 20
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-08')).toBe(7)
  })

  it('ignores leftover entries — they do not count toward daysSince', async () => {
    const dish = await seedDish()
    // Fresh on June 1
    await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    // Leftover on June 3 (should NOT reset the clock)
    await createPlanEntry({ date: '2025-06-03', mealType: 'lunch', entryKind: 'leftover', dishId: dish.id, guestCount: 0 })
    // Should still be 7 days from June 1, not 5 from June 3
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-08')).toBe(7)
  })

  it('ignores fresh entries on or after beforeDate', async () => {
    const dish = await seedDish()
    await createPlanEntry({ date: '2025-06-08', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    // beforeDate is June 8 — the entry ON that date should count as lte
    // Actually: beforeDate is "before this date" — let's check with June 9
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-09')).toBe(1)
    // Future entry should not affect lookback from June 7
    expect(await daysSinceLastServedFresh(dish.id, '2025-06-07')).toBeNull()
  })
})

// ── hasEntriesForDish ────────────────────────────────────────────

describe('hasEntriesForDish', () => {
  it('returns false when dish has no entries', async () => {
    const dish = await seedDish()
    expect(await hasEntriesForDish(dish.id)).toBe(false)
  })

  it('returns true when dish has a plan entry', async () => {
    const dish = await seedDish()
    await createPlanEntry({ date: '2025-06-01', mealType: 'dinner', entryKind: 'fresh', dishId: dish.id, guestCount: 0 })
    expect(await hasEntriesForDish(dish.id)).toBe(true)
  })
})

// ── hasLeftovers (pure function) ──────────────────────────────────

describe('hasLeftovers', () => {
  it('returns false when yieldServings is null', () => {
    expect(hasLeftovers(null, 0)).toBe(false)
  })

  it('returns false when yield equals household (3) + guests', () => {
    expect(hasLeftovers(3, 0)).toBe(false)
  })

  it('returns true when yield exceeds household (3) + guests', () => {
    expect(hasLeftovers(4, 0)).toBe(true)  // 4 > 3+0
    expect(hasLeftovers(7, 2)).toBe(true)  // 7 > 3+2
  })

  it('accounts for guest count', () => {
    // household=3, guests=2 → threshold is 5; needs strictly more than 5 to have leftovers
    expect(hasLeftovers(5, 2)).toBe(false) // 5 > 5 is false
    expect(hasLeftovers(6, 2)).toBe(true)  // 6 > 5
  })
})
