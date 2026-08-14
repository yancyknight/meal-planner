import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Dish } from '../../shared/types/dish'
import type { PlanningSession } from '../../shared/types/planningSession'

const TEST_DB_PATH = '/tmp/planning-session-reroll-api-test.db'

if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
const _sqlite = new Database(TEST_DB_PATH)
migrate(drizzle(_sqlite), { migrationsFolder: 'server/database/migrations' })

beforeEach(() => {
  _sqlite.exec('DELETE FROM planning_sessions')
  _sqlite.exec('DELETE FROM dishes')
})

process.env.DATABASE_URL = TEST_DB_PATH

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  browser: false,
})

async function createDish(name: string): Promise<Dish> {
  return $fetch<Dish>('/api/dishes', {
    method: 'POST',
    body: { name },
  })
}

describe('POST /api/planning-sessions/[id]/reroll', () => {
  it('replaces the slot with a different eligible dish instead of crashing', async () => {
    const dishA = await createDish('Reroll Test Dish A')
    const dishB = await createDish('Reroll Test Dish B')

    const session = await $fetch<PlanningSession>('/api/planning-sessions', {
      method: 'POST',
      body: { weekStart: '2026-08-17', mealTypes: ['dinner'] },
    })

    const slotKey = '2026-08-17:dinner'
    const seeded = await $fetch<PlanningSession>(`/api/planning-sessions/${session.id}`, {
      method: 'PATCH',
      body: {
        draftPlan: { [slotKey]: { kind: 'dish', dishId: dishA.id } },
        // Simulate dishA already having been shown, so reroll must pick dishB.
        shownDishIdsBySlot: { [slotKey]: [dishA.id] },
      },
    })
    expect(seeded.draftPlan[slotKey]?.dishId).toBe(dishA.id)

    const result = await $fetch<{ session?: PlanningSession; exhausted: boolean }>(
      `/api/planning-sessions/${session.id}/reroll`,
      { method: 'POST', body: { slotKey } },
    )

    expect(result.exhausted).toBe(false)
    expect(result.session?.draftPlan[slotKey]?.dishId).toBe(dishB.id)
  })

  it('returns exhausted rather than erroring when no other dish is eligible', async () => {
    const dishA = await createDish('Reroll Test Dish Only')

    const session = await $fetch<PlanningSession>('/api/planning-sessions', {
      method: 'POST',
      body: { weekStart: '2026-08-17', mealTypes: ['dinner'] },
    })

    const slotKey = '2026-08-17:dinner'
    await $fetch(`/api/planning-sessions/${session.id}`, {
      method: 'PATCH',
      body: {
        draftPlan: { [slotKey]: { kind: 'dish', dishId: dishA.id } },
        shownDishIdsBySlot: { [slotKey]: [dishA.id] },
      },
    })

    const result = await $fetch<{ session?: PlanningSession; exhausted: boolean }>(
      `/api/planning-sessions/${session.id}/reroll`,
      { method: 'POST', body: { slotKey } },
    )

    expect(result.exhausted).toBe(true)
  })
})
