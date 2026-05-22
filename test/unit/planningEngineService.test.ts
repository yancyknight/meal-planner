import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectionWeight, isEligibleForSlot } from '../../server/services/planningEngineService'

// ── Pure function unit tests ──────────────────────────────────────────────────

describe('selectionWeight', () => {
  it('never-served dish has overdueness 1.5 and weight 1.5', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, null)).toBeCloseTo(1.5)
  })

  it('exactly at target → weight 1.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 14)).toBeCloseTo(1.0)
  })

  it('just past cooldown (7d) with target 14 → weight < 1.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 7)).toBeCloseTo(0.5)
    expect(selectionWeight(dish, 7)).toBeLessThan(1.0)
  })

  it('5× overdue → weight capped at 3.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 14 * 5)).toBe(3.0)
  })

  it('very overdue → still capped at 3.0', () => {
    const dish = { targetIntervalDays: 14 }
    expect(selectionWeight(dish, 365)).toBe(3.0)
  })

  it('respects targetIntervalDays — dish with target 7 accrues weight twice as fast as target 14', () => {
    const fast = { targetIntervalDays: 7 }
    const slow = { targetIntervalDays: 14 }
    expect(selectionWeight(fast, 7)).toBeCloseTo(selectionWeight(slow, 14))
  })
})

describe('isEligibleForSlot', () => {
  const base = { cooldownDays: 7, targetIntervalDays: 14, excludedFromSuggestions: false, archived: false }

  it('eligible when daysSince equals cooldown', () => {
    expect(isEligibleForSlot(base, 7)).toBe(true)
  })

  it('eligible when daysSince exceeds cooldown', () => {
    expect(isEligibleForSlot(base, 14)).toBe(true)
  })

  it('ineligible when still in cooldown', () => {
    expect(isEligibleForSlot(base, 6)).toBe(false)
  })

  it('ineligible when daysSince is 0 (cooked today)', () => {
    expect(isEligibleForSlot(base, 0)).toBe(false)
  })

  it('ineligible when excluded from suggestions', () => {
    expect(isEligibleForSlot({ ...base, excludedFromSuggestions: true }, 100)).toBe(false)
  })

  it('ineligible when archived', () => {
    expect(isEligibleForSlot({ ...base, archived: true }, 100)).toBe(false)
  })

  it('never-served dish is eligible (effective daysSince = 1.5 × target ≥ cooldown)', () => {
    expect(isEligibleForSlot(base, null)).toBe(true)
  })
})

// ── Integration test: leftovers don't advance daysSinceLastServedFresh ────────

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
import { daysSinceLastServedFresh } from '../../server/services/planEntryService'

async function seedDish() {
  const now = new Date().toISOString()
  const rows = await db
    .insert(dishes)
    .values({
      name: 'Test Dish',
      freeFrom: '[]',
      season: '[]',
      cooldownDays: 7,
      targetIntervalDays: 14,
      excludedFromSuggestions: 0,
      archived: false,
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

describe('leftover entries do not advance daysSinceLastServedFresh', () => {
  it('ignores leftover entries when computing days since fresh', async () => {
    const dish = await seedDish()
    const now = new Date().toISOString()

    // Fresh entry on day 0
    await db.insert(planEntries).values({
      date: '2025-01-01',
      mealType: 'dinner',
      entryKind: 'fresh',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })
    // Leftover entry on day 1 (should NOT reset the clock)
    await db.insert(planEntries).values({
      date: '2025-01-02',
      mealType: 'lunch',
      entryKind: 'leftover',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })

    // Querying from day 3 — should see 2 days since the fresh entry (Jan 1), not 1 day since leftover (Jan 2)
    const days = await daysSinceLastServedFresh(dish.id, '2025-01-03')
    expect(days).toBe(2)
  })

  it('returns null when only leftover entries exist', async () => {
    const dish = await seedDish()
    const now = new Date().toISOString()

    await db.insert(planEntries).values({
      date: '2025-01-02',
      mealType: 'lunch',
      entryKind: 'leftover',
      dishId: dish.id,
      guestCount: 0,
      createdAt: now,
    })

    const days = await daysSinceLastServedFresh(dish.id, '2025-01-10')
    expect(days).toBeNull()
  })
})
