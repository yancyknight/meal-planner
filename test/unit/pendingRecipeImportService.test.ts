import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { db } from '../../server/database/index'
import { pendingRecipeImports } from '../../server/database/schema'
import { create, get, cleanupExpired } from '../../server/services/pendingRecipeImportService'
import type { RecipeImportResult } from '../../shared/types/recipeImport'

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

const sampleResult: RecipeImportResult = {
  name: 'Test Recipe',
  imageUrl: null,
  timeEstimateMinutes: null,
  yieldServings: null,
  sourceUrl: 'https://example.com/recipe',
  sourceName: 'example.com',
  ingredientTexts: ['1 cup flour'],
}

describe('pendingRecipeImportService', () => {
  beforeEach(async () => {
    await db.delete(pendingRecipeImports)
  })

  describe('create / get', () => {
    it('stores and returns the result', async () => {
      const id = await create(sampleResult)
      expect(await get(id)).toEqual(sampleResult)
    })

    it('is idempotent — repeated reads return the same result', async () => {
      const id = await create(sampleResult)
      await get(id)
      expect(await get(id)).toEqual(sampleResult)
    })

    it('returns null for an unknown id', async () => {
      expect(await get('00000000-0000-0000-0000-000000000000')).toBeNull()
    })

    it('returns null for a row past the TTL, even before cleanup runs', async () => {
      const id = await create(sampleResult)
      const staleCreatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      await db.update(pendingRecipeImports).set({ createdAt: staleCreatedAt }).where(eq(pendingRecipeImports.id, id))
      expect(await get(id)).toBeNull()
    })
  })

  describe('cleanupExpired', () => {
    it('deletes only rows past the TTL and returns the count', async () => {
      const freshId = await create(sampleResult)
      const staleId = await create(sampleResult)
      const staleCreatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      await db.update(pendingRecipeImports).set({ createdAt: staleCreatedAt }).where(eq(pendingRecipeImports.id, staleId))

      const deletedCount = await cleanupExpired()
      expect(deletedCount).toBe(1)

      const rows = await db.select().from(pendingRecipeImports)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.id).toBe(freshId)
    })
  })
})
