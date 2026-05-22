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
import { set, get, remove, isActive, getActiveDishIds, cleanup } from '../../server/services/dishCooldownService'

async function seedDish(name: string) {
  const now = new Date().toISOString()
  const [row] = await db.insert(dishes).values({
    name, freeFrom: '[]', season: '[]', cooldownDays: 7,
    targetIntervalDays: 14, excludedFromSuggestions: 0,
    archived: false, createdAt: now, updatedAt: now,
  }).returning()
  return row!
}

describe('dishCooldownService', () => {
  let dishId: number

  beforeEach(async () => {
    const { dishCooldowns } = await import('../../server/database/schema')
    await db.delete(dishCooldowns)
    const d = await seedDish('Test Dish')
    dishId = d.id
  })

  describe('set / get', () => {
    it('creates a cooldown record', async () => {
      await set(dishId, '2099-12-31')
      const record = await get(dishId)
      expect(record).not.toBeNull()
      expect(record!.dishId).toBe(dishId)
      expect(record!.endsAt).toBe('2099-12-31')
    })

    it('upserts — second set overwrites the first', async () => {
      await set(dishId, '2099-12-31')
      await set(dishId, '2099-06-01')
      const record = await get(dishId)
      expect(record!.endsAt).toBe('2099-06-01')
    })

    it('returns null when no cooldown exists', async () => {
      expect(await get(dishId)).toBeNull()
    })
  })

  describe('remove', () => {
    it('deletes the cooldown record', async () => {
      await set(dishId, '2099-12-31')
      await remove(dishId)
      expect(await get(dishId)).toBeNull()
    })

    it('is idempotent — no error when nothing to remove', async () => {
      await expect(remove(dishId)).resolves.toBeUndefined()
    })
  })

  describe('isActive', () => {
    it('returns false when record is null', () => {
      expect(isActive(null)).toBe(false)
    })

    it('returns true when endsAt is in the future', () => {
      expect(isActive({ endsAt: '2099-12-31' })).toBe(true)
    })

    it('returns true when endsAt equals asOf', () => {
      expect(isActive({ endsAt: '2026-05-22' }, '2026-05-22')).toBe(true)
    })

    it('returns false when endsAt is before asOf', () => {
      expect(isActive({ endsAt: '2026-05-21' }, '2026-05-22')).toBe(false)
    })

    it('uses asOf parameter correctly', () => {
      expect(isActive({ endsAt: '2026-06-01' }, '2026-05-22')).toBe(true)
      expect(isActive({ endsAt: '2026-05-01' }, '2026-05-22')).toBe(false)
    })
  })

  describe('getActiveDishIds', () => {
    it('returns empty set for empty input', async () => {
      const result = await getActiveDishIds([])
      expect(result.size).toBe(0)
    })

    it('returns dish ID when it has an active cooldown', async () => {
      await set(dishId, '2099-12-31')
      const result = await getActiveDishIds([dishId], '2026-05-22')
      expect(result.has(dishId)).toBe(true)
    })

    it('excludes dish ID when cooldown is expired', async () => {
      await set(dishId, '2026-01-01')
      const result = await getActiveDishIds([dishId], '2026-05-22')
      expect(result.has(dishId)).toBe(false)
    })

    it('excludes dish IDs with no cooldown record', async () => {
      const result = await getActiveDishIds([dishId], '2026-05-22')
      expect(result.has(dishId)).toBe(false)
    })

    it('handles multiple dishes correctly', async () => {
      const d2 = await seedDish('Dish 2')
      const d3 = await seedDish('Dish 3')
      await set(dishId, '2099-12-31') // active
      await set(d2.id, '2026-01-01')  // expired
      // d3 has no record
      const result = await getActiveDishIds([dishId, d2.id, d3.id], '2026-05-22')
      expect(result.has(dishId)).toBe(true)
      expect(result.has(d2.id)).toBe(false)
      expect(result.has(d3.id)).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('removes expired records', async () => {
      await set(dishId, '2026-01-01')
      await cleanup()
      expect(await get(dishId)).toBeNull()
    })

    it('preserves active records', async () => {
      await set(dishId, '2099-12-31')
      await cleanup()
      expect(await get(dishId)).not.toBeNull()
    })

    it('removes expired and preserves active in the same run', async () => {
      const d2 = await seedDish('Dish 2')
      await set(dishId, '2026-01-01') // expired
      await set(d2.id, '2099-12-31')  // active
      await cleanup()
      expect(await get(dishId)).toBeNull()
      expect(await get(d2.id)).not.toBeNull()
    })
  })
})
