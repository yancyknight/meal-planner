import { describe, it, expect } from 'vitest'
import type { Dish } from '../../shared/types/dish'
import type { PinnedTag } from '../../shared/types/planningSession'
import {
  VIRTUAL_TAGS,
  getVirtualTag,
  matchesVirtualTag,
  matchesTag,
} from '../../shared/virtualTags'
import { detectAnchorConflicts } from '../../shared/utils/anchorConflicts'

// ── Helpers ──────────────────────────────────────────────────────

function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: 'Test Dish',
    imageUrl: null,
    imageLocalPath: null,
    timeEstimateMinutes: null,
    yieldServings: null,
    sourceUrl: null,
    sourceName: null,
    difficulty: null,
    freeFrom: [],
    season: [],
    notes: null,
    cooldownDays: 7,
    targetIntervalDays: 14,
    excludedFromSuggestions: false,
    archived: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── VIRTUAL_TAGS registry ────────────────────────────────────────

describe('VIRTUAL_TAGS', () => {
  it('has exactly 9 entries', () => {
    expect(VIRTUAL_TAGS).toHaveLength(9)
  })

  it('all IDs start with v:', () => {
    for (const t of VIRTUAL_TAGS) {
      expect(t.id).toMatch(/^v:/)
    }
  })

  it('has 2 non-dietary and 7 dietary tags', () => {
    const nonDietary = VIRTUAL_TAGS.filter(t => !t.isDietary)
    const dietary = VIRTUAL_TAGS.filter(t => t.isDietary)
    expect(nonDietary).toHaveLength(2)
    expect(dietary).toHaveLength(7)
  })
})

describe('getVirtualTag', () => {
  it('finds a known tag', () => {
    const tag = getVirtualTag('v:quick')
    expect(tag).toBeDefined()
    expect(tag!.label).toBe('quick')
  })

  it('returns undefined for unknown id', () => {
    expect(getVirtualTag('v:unknown')).toBeUndefined()
  })
})

// ── v:quick ──────────────────────────────────────────────────────

describe('v:quick predicate', () => {
  it('matches a dish with timeEstimateMinutes = 20', () => {
    expect(matchesVirtualTag(makeDish({ timeEstimateMinutes: 20 }), 'v:quick')).toBe(true)
  })

  it('matches a dish with timeEstimateMinutes = 15', () => {
    expect(matchesVirtualTag(makeDish({ timeEstimateMinutes: 15 }), 'v:quick')).toBe(true)
  })

  it('does not match a dish with timeEstimateMinutes = 21', () => {
    expect(matchesVirtualTag(makeDish({ timeEstimateMinutes: 21 }), 'v:quick')).toBe(false)
  })

  it('does not match a dish with null timeEstimateMinutes', () => {
    expect(matchesVirtualTag(makeDish({ timeEstimateMinutes: null }), 'v:quick')).toBe(false)
  })
})

// ── v:easy ───────────────────────────────────────────────────────

describe('v:easy predicate', () => {
  it('matches an easy dish', () => {
    expect(matchesVirtualTag(makeDish({ difficulty: 'easy' }), 'v:easy')).toBe(true)
  })

  it('does not match medium difficulty', () => {
    expect(matchesVirtualTag(makeDish({ difficulty: 'medium' }), 'v:easy')).toBe(false)
  })

  it('does not match null difficulty', () => {
    expect(matchesVirtualTag(makeDish({ difficulty: null }), 'v:easy')).toBe(false)
  })
})

// ── freeFrom dietary tags ────────────────────────────────────────

const dietaryTests: Array<{ id: string; value: Dish['freeFrom'][number] }> = [
  { id: 'v:dairy-free', value: 'dairy-free' },
  { id: 'v:gluten-free', value: 'gluten-free' },
  { id: 'v:nut-free', value: 'nut-free' },
  { id: 'v:shellfish-free', value: 'shellfish-free' },
  { id: 'v:egg-free', value: 'egg-free' },
  { id: 'v:soy-free', value: 'soy-free' },
  { id: 'v:peanut-free', value: 'peanut-free' },
]

describe.each(dietaryTests)('$id predicate', ({ id, value }) => {
  it('matches when dish.freeFrom includes the value', () => {
    expect(matchesVirtualTag(makeDish({ freeFrom: [value] }), id)).toBe(true)
  })

  it('does not match when freeFrom is empty', () => {
    expect(matchesVirtualTag(makeDish({ freeFrom: [] }), id)).toBe(false)
  })

  it('does not match when freeFrom contains a different value', () => {
    const other = dietaryTests.find(t => t.value !== value)!.value
    expect(matchesVirtualTag(makeDish({ freeFrom: [other] }), id)).toBe(false)
  })
})

// ── matchesVirtualTag unknown id ─────────────────────────────────

describe('matchesVirtualTag', () => {
  it('returns false for an unknown virtual tag id', () => {
    expect(matchesVirtualTag(makeDish(), 'v:unknown')).toBe(false)
  })
})

// ── matchesTag ───────────────────────────────────────────────────

describe('matchesTag', () => {
  it('delegates to matchesVirtualTag for virtual refs', () => {
    const dish = makeDish({ difficulty: 'easy' })
    expect(matchesTag(dish, { kind: 'virtual', id: 'v:easy' })).toBe(true)
    expect(matchesTag(dish, { kind: 'virtual', id: 'v:quick' })).toBe(false)
  })

  it('checks dish.tags for real refs', () => {
    const dish = makeDish({ tags: [{ id: 5, name: 'pasta', color: null }] })
    expect(matchesTag(dish, { kind: 'real', tagId: 5 })).toBe(true)
    expect(matchesTag(dish, { kind: 'real', tagId: 99 })).toBe(false)
  })

  it('returns false for real ref when dish has no tags', () => {
    expect(matchesTag(makeDish({ tags: [] }), { kind: 'real', tagId: 1 })).toBe(false)
  })
})

// ── detectAnchorConflicts ────────────────────────────────────────

describe('detectAnchorConflicts', () => {
  const dishA = makeDish({ id: 1, difficulty: 'easy', tags: [{ id: 10, name: 'pasta', color: null }] })
  const dishB = makeDish({ id: 2, difficulty: 'hard', tags: [{ id: 11, name: 'soup', color: null }] })

  it('returns empty array when no virtual tags are selected', () => {
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: [],
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'real', tagId: 10 } }],
      wishlistTagIds: [],
      dishes: [dishA, dishB],
    })
    expect(warnings).toEqual([])
  })

  it('returns empty array when no conflict exists', () => {
    // v:easy matches dishA, which has tag 10 (pasta) → no conflict
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'real', tagId: 10 } }],
      wishlistTagIds: [],
      dishes: [dishA, dishB],
    })
    expect(warnings).toEqual([])
  })

  it('warns when pinned real tag has no dishes surviving virtual filter', () => {
    // v:easy only allows dishA; pinned tag 11 (soup) is only on dishB → conflict
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'real', tagId: 11 } }],
      wishlistTagIds: [],
      dishes: [dishA, dishB],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('soup')
  })

  it('warns when wishlist real tag has no dishes surviving virtual filter', () => {
    // v:easy only allows dishA; wishlist tag 11 (soup) only on dishB → conflict
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: [],
      wishlistTagIds: [11],
      dishes: [dishA, dishB],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('soup')
  })

  it('warns when pinned virtual tag has no dishes surviving combined filter', () => {
    // v:easy only allows dishA; pinned v:quick with dishA having no time set → conflict
    const dishEasyNoTime = makeDish({ id: 3, difficulty: 'easy', timeEstimateMinutes: null })
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'virtual', id: 'v:quick' } }],
      wishlistTagIds: [],
      dishes: [dishEasyNoTime],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('quick')
  })

  it('does not produce duplicate warnings for the same tag appearing in multiple pin slots', () => {
    const pins: PinnedTag[] = [
      { date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'real', tagId: 11 } },
      { date: '2026-05-26', mealType: 'dinner', tagRef: { kind: 'real', tagId: 11 } },
    ]
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: pins,
      wishlistTagIds: [],
      dishes: [dishA, dishB],
    })
    expect(warnings).toHaveLength(1)
  })

  it('can produce separate warnings for pin conflict and wishlist conflict', () => {
    const dishPasta = makeDish({ id: 4, difficulty: 'easy', tags: [{ id: 10, name: 'pasta', color: null }] })
    const dishSoup = makeDish({ id: 5, difficulty: 'hard', tags: [{ id: 11, name: 'soup', color: null }] })
    const dishRice = makeDish({ id: 6, difficulty: 'hard', tags: [{ id: 12, name: 'rice', color: null }] })
    // v:easy only allows dishPasta; pinned tag 11 (soup) and wishlist tag 12 (rice) → 2 warnings
    const warnings = detectAnchorConflicts({
      sessionVirtualTagIds: ['v:easy'],
      pinnedTags: [{ date: '2026-05-25', mealType: 'dinner', tagRef: { kind: 'real', tagId: 11 } }],
      wishlistTagIds: [12],
      dishes: [dishPasta, dishSoup, dishRice],
    })
    expect(warnings).toHaveLength(2)
  })
})
