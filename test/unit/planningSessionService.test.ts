import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlanningSessionSchema, patchPlanningSessionSchema } from '../../shared/schemas/planningSession'

import { db } from '../../server/database/index'
import { planningSessions } from '../../server/database/schema'
import {
  listPlanningSessions,
  getPlanningSession,
  createPlanningSession,
  patchPlanningSession,
  deletePlanningSession,
} from '../../server/services/planningSessionService'

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
  await db.delete(planningSessions)
})

// ── Zod schema validation ────────────────────────────────────────

describe('createPlanningSessionSchema', () => {
  it('accepts valid input', () => {
    const r = createPlanningSessionSchema.safeParse({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    expect(r.success).toBe(true)
  })

  it('rejects invalid weekStart format', () => {
    const r = createPlanningSessionSchema.safeParse({ weekStart: '2026/05/25', mealTypes: ['dinner'] })
    expect(r.success).toBe(false)
  })

  it('rejects empty mealTypes array', () => {
    const r = createPlanningSessionSchema.safeParse({ weekStart: '2026-05-25', mealTypes: [] })
    expect(r.success).toBe(false)
  })

  it('accepts multiple meal types', () => {
    const r = createPlanningSessionSchema.safeParse({ weekStart: '2026-05-25', mealTypes: ['breakfast', 'lunch', 'dinner'] })
    expect(r.success).toBe(true)
  })
})

describe('patchPlanningSessionSchema', () => {
  it('accepts a partial patch', () => {
    const r = patchPlanningSessionSchema.safeParse({ currentStep: 2 })
    expect(r.success).toBe(true)
  })

  it('rejects invalid currentStep', () => {
    const r = patchPlanningSessionSchema.safeParse({ currentStep: 5 })
    expect(r.success).toBe(false)
  })

  it('accepts slotStates record', () => {
    const r = patchPlanningSessionSchema.safeParse({
      slotStates: { '2026-05-25:dinner': 'plan', '2026-05-26:dinner': 'skip' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid slot state value', () => {
    const r = patchPlanningSessionSchema.safeParse({
      slotStates: { '2026-05-25:dinner': 'invalid' },
    })
    expect(r.success).toBe(false)
  })
})

// ── Service CRUD ────────────────────────────────────────

describe('createPlanningSession', () => {
  it('creates a session with defaults', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    expect(session.id).toBeGreaterThan(0)
    expect(session.weekStart).toBe('2026-05-25')
    expect(session.mealTypes).toEqual(['dinner'])
    expect(session.currentStep).toBe(1)
    expect(session.slotStates).toEqual({})
    expect(session.removedPlanEntryIds).toEqual([])
    expect(session.pendingOneOffEntries).toEqual([])
    expect(session.sessionVirtualTags).toEqual([])
    expect(session.pinnedTags).toEqual([])
    expect(session.wishlistTags).toEqual([])
    expect(session.draftPlan).toEqual({})
    expect(session.shownDishIdsBySlot).toEqual({})
    expect(session.leftoverToggles).toEqual({})
    expect(session.status).toBe('in_progress')
  })
})

describe('getPlanningSession', () => {
  it('returns null for non-existent session', async () => {
    const result = await getPlanningSession(99999)
    expect(result).toBeNull()
  })

  it('returns the session by id', async () => {
    const created = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['lunch', 'dinner'] })
    const fetched = await getPlanningSession(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(created.id)
    expect(fetched!.mealTypes).toEqual(['lunch', 'dinner'])
  })
})

describe('listPlanningSessions', () => {
  it('returns all sessions ordered by createdAt desc', async () => {
    await createPlanningSession({ weekStart: '2026-05-18', mealTypes: ['dinner'] })
    await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const list = await listPlanningSessions()
    expect(list.length).toBe(2)
    expect(list[0]!.weekStart).toBe('2026-05-25')
    expect(list[1]!.weekStart).toBe('2026-05-18')
  })
})

describe('patchPlanningSession', () => {
  it('returns null for non-existent session', async () => {
    const result = await patchPlanningSession(99999, { currentStep: 2 })
    expect(result).toBeNull()
  })

  it('advances currentStep and preserves unrelated fields', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const patched = await patchPlanningSession(session.id, { currentStep: 2 })
    expect(patched!.currentStep).toBe(2)
    expect(patched!.weekStart).toBe('2026-05-25')
    expect(patched!.mealTypes).toEqual(['dinner'])
  })

  it('updates slotStates correctly', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const states = { '2026-05-25:dinner': 'skip' as const, '2026-05-26:dinner': 'plan' as const }
    const patched = await patchPlanningSession(session.id, { slotStates: states })
    expect(patched!.slotStates).toEqual(states)
  })

  it('accumulates removedPlanEntryIds', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const patched = await patchPlanningSession(session.id, { removedPlanEntryIds: [10, 11] })
    expect(patched!.removedPlanEntryIds).toEqual([10, 11])
  })

  it('stores pendingOneOffEntries', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const entries = [{ date: '2026-05-25', mealType: 'dinner' as const, text: 'Pizza night' }]
    const patched = await patchPlanningSession(session.id, { pendingOneOffEntries: entries })
    expect(patched!.pendingOneOffEntries).toEqual(entries)
  })

  it('does not clobber unpatched JSON fields', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    await patchPlanningSession(session.id, { sessionVirtualTags: ['v:quick'] })
    const patched = await patchPlanningSession(session.id, { currentStep: 3 })
    expect(patched!.sessionVirtualTags).toEqual(['v:quick'])
  })

  it('touches updatedAt on every patch', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    await new Promise(r => setTimeout(r, 5))
    const patched = await patchPlanningSession(session.id, { currentStep: 2 })
    expect(patched!.updatedAt > session.updatedAt).toBe(true)
  })

  // ── Step 3 field round-trips ──────────────────────────────────

  it('persists sessionVirtualTags', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const patched = await patchPlanningSession(session.id, { sessionVirtualTags: ['v:quick', 'v:easy'] })
    expect(patched!.sessionVirtualTags).toEqual(['v:quick', 'v:easy'])
    // Second read confirms persistence
    const fetched = await getPlanningSession(session.id)
    expect(fetched!.sessionVirtualTags).toEqual(['v:quick', 'v:easy'])
  })

  it('replaces sessionVirtualTags on subsequent patch', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    await patchPlanningSession(session.id, { sessionVirtualTags: ['v:quick'] })
    const patched = await patchPlanningSession(session.id, { sessionVirtualTags: ['v:easy', 'v:dairy-free'] })
    expect(patched!.sessionVirtualTags).toEqual(['v:easy', 'v:dairy-free'])
  })

  it('persists pinnedTags round-trip', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const pins = [
      { date: '2026-05-25', mealType: 'dinner' as const, tagRef: { kind: 'virtual' as const, id: 'v:quick' } },
      { date: '2026-05-26', mealType: 'dinner' as const, tagRef: { kind: 'real' as const, tagId: 42 } },
    ]
    const patched = await patchPlanningSession(session.id, { pinnedTags: pins })
    expect(patched!.pinnedTags).toEqual(pins)
    const fetched = await getPlanningSession(session.id)
    expect(fetched!.pinnedTags).toEqual(pins)
  })

  it('clears pinnedTags when patched with empty array', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    await patchPlanningSession(session.id, {
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'virtual', id: 'v:easy' } }],
    })
    const cleared = await patchPlanningSession(session.id, { pinnedTags: [] })
    expect(cleared!.pinnedTags).toEqual([])
  })

  it('persists wishlistTags round-trip', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const patched = await patchPlanningSession(session.id, { wishlistTags: [7, 13] })
    expect(patched!.wishlistTags).toEqual([7, 13])
    const fetched = await getPlanningSession(session.id)
    expect(fetched!.wishlistTags).toEqual([7, 13])
  })

  it('clears wishlistTags when patched with empty array', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    await patchPlanningSession(session.id, { wishlistTags: [5] })
    const cleared = await patchPlanningSession(session.id, { wishlistTags: [] })
    expect(cleared!.wishlistTags).toEqual([])
  })

  it('patchPlanningSessionSchema accepts valid pinnedTags', () => {
    const r = patchPlanningSessionSchema.safeParse({
      pinnedTags: [
        { date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'virtual', id: 'v:quick' } },
        { date: '2026-05-26', mealType: 'lunch', tagRef: { kind: 'real', tagId: 3 } },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('patchPlanningSessionSchema rejects pinnedTag with invalid tagRef kind', () => {
    const r = patchPlanningSessionSchema.safeParse({
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'other', id: 5 } }],
    })
    expect(r.success).toBe(false)
  })

  it('patchPlanningSessionSchema accepts wishlistTags', () => {
    const r = patchPlanningSessionSchema.safeParse({ wishlistTags: [1, 2, 3] })
    expect(r.success).toBe(true)
  })
})

describe('deletePlanningSession', () => {
  it('returns true when deleted', async () => {
    const session = await createPlanningSession({ weekStart: '2026-05-25', mealTypes: ['dinner'] })
    const result = await deletePlanningSession(session.id)
    expect(result).toBe(true)
    expect(await getPlanningSession(session.id)).toBeNull()
  })

  it('returns false for non-existent session', async () => {
    const result = await deletePlanningSession(99999)
    expect(result).toBe(false)
  })
})
