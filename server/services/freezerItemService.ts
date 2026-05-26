import { eq, and, lt, gte, desc, asc, inArray } from 'drizzle-orm'
import { db } from '../database'
import { freezerItems, freezers, freezerCategories } from '../database/schema'
import type { FreezerItem, FreezerDashboardPayload, FreezerBucketGroup, Freezer } from '../../shared/types/freezer'
import type { CreateFreezerItemInput, UpdateFreezerItemInput, ListFreezerItemsInput } from '../../shared/schemas/freezer'
import { getFreezerCategory } from './freezerCategoryService'

function now(): string {
  return new Date().toISOString()
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function midpoint(a: string, b: string): string {
  const aMs = new Date(a + 'T00:00:00Z').getTime()
  const bMs = new Date(b + 'T00:00:00Z').getTime()
  const mid = Math.floor((aMs + bMs) / 2)
  return new Date(mid).toISOString().slice(0, 10)
}

export function computeDates(
  addedAt: string,
  lifetimeDays: number,
): { tossByDate: string; targetUseDate: string } {
  const tossByDate = addDays(addedAt, lifetimeDays)
  const targetUseDate = midpoint(addedAt, tossByDate)
  return { tossByDate, targetUseDate }
}

export async function createFreezerItem(input: CreateFreezerItemInput): Promise<FreezerItem> {
  const category = await getFreezerCategory(input.categoryId)
  if (!category) throw new Error('Category not found')

  const lifetimeDays = input.lifetimeDaysOverride ?? category.defaultLifetimeDays
  const { tossByDate, targetUseDate: computedTargetUseDate } = computeDates(input.addedAt, lifetimeDays)
  const targetUseDate = input.targetUseDate ?? computedTargetUseDate

  const ts = now()
  const rows = await db
    .insert(freezerItems)
    .values({
      freezerId: input.freezerId,
      categoryId: input.categoryId,
      name: input.name,
      notes: input.notes ?? null,
      dishId: input.dishId ?? null,
      canonicalIngredientId: input.canonicalIngredientId ?? null,
      addedAt: input.addedAt,
      lifetimeDaysOverride: input.lifetimeDaysOverride ?? null,
      tossByDate,
      targetUseDate,
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()
  return rows[0]!
}

export async function getFreezerItem(id: number): Promise<FreezerItem | null> {
  const rows = await db.select().from(freezerItems).where(eq(freezerItems.id, id))
  return rows[0] ?? null
}

export async function listFreezerItems(filters: ListFreezerItemsInput = {}): Promise<FreezerItem[]> {
  const conditions = []
  if (filters.freezerId !== undefined) conditions.push(eq(freezerItems.freezerId, filters.freezerId))
  if (filters.categoryId !== undefined) conditions.push(eq(freezerItems.categoryId, filters.categoryId))
  if (filters.status !== undefined) {
    conditions.push(eq(freezerItems.status, filters.status))
  }
  else {
    conditions.push(eq(freezerItems.status, 'active'))
  }

  const query = db.select().from(freezerItems)
  if (conditions.length > 0) query.where(and(...conditions))
  return query.orderBy(asc(freezerItems.tossByDate))
}

export async function updateFreezerItem(id: number, input: UpdateFreezerItemInput): Promise<FreezerItem | null> {
  const set: Record<string, unknown> = { updatedAt: now() }
  if (input.name !== undefined) set.name = input.name
  if (input.notes !== undefined) set.notes = input.notes
  if (input.dishId !== undefined) set.dishId = input.dishId
  if (input.canonicalIngredientId !== undefined) set.canonicalIngredientId = input.canonicalIngredientId
  if (input.categoryId !== undefined) set.categoryId = input.categoryId
  if (input.freezerId !== undefined) set.freezerId = input.freezerId
  if (input.targetUseDate !== undefined) set.targetUseDate = input.targetUseDate

  const rows = await db
    .update(freezerItems)
    .set(set)
    .where(eq(freezerItems.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteFreezerItem(id: number): Promise<boolean> {
  const result = await db.delete(freezerItems).where(eq(freezerItems.id, id)).returning({ id: freezerItems.id })
  return result.length > 0
}

export async function markFreezerItemUsed(id: number): Promise<FreezerItem | null> {
  const rows = await db
    .update(freezerItems)
    .set({ status: 'used', statusChangedAt: now(), updatedAt: now() })
    .where(eq(freezerItems.id, id))
    .returning()
  return rows[0] ?? null
}

export async function markFreezerItemWasted(id: number): Promise<FreezerItem | null> {
  const rows = await db
    .update(freezerItems)
    .set({ status: 'wasted', statusChangedAt: now(), updatedAt: now() })
    .where(eq(freezerItems.id, id))
    .returning()
  return rows[0] ?? null
}

function groupByFreezer(items: FreezerItem[], allFreezers: Freezer[]): FreezerBucketGroup[] {
  const freezerMap = new Map(allFreezers.map(f => [f.id, f]))
  const groupMap = new Map<number, FreezerItem[]>()
  for (const item of items) {
    const list = groupMap.get(item.freezerId) ?? []
    list.push(item)
    groupMap.set(item.freezerId, list)
  }
  const groups: FreezerBucketGroup[] = []
  for (const [freezerId, groupItems] of groupMap) {
    const freezer = freezerMap.get(freezerId)
    if (freezer) groups.push({ freezer, items: groupItems })
  }
  return groups
}

export async function getDashboard(approachingWindowDays: number = 14): Promise<FreezerDashboardPayload> {
  const today = todayStr()
  const approachingCutoff = addDays(today, approachingWindowDays)
  const recentlyAddedCutoff = addDays(today, -7)

  const [allFreezersRows, expiredRows, approachingRows, recentRows] = await Promise.all([
    db.select().from(freezers).orderBy(asc(freezers.name)),

    db.select().from(freezerItems)
      .where(and(eq(freezerItems.status, 'active'), lt(freezerItems.tossByDate, today)))
      .orderBy(asc(freezerItems.tossByDate)),

    db.select().from(freezerItems)
      .where(and(
        eq(freezerItems.status, 'active'),
        gte(freezerItems.tossByDate, today),
        lt(freezerItems.tossByDate, approachingCutoff),
      ))
      .orderBy(asc(freezerItems.tossByDate)),

    db.select().from(freezerItems)
      .where(and(
        eq(freezerItems.status, 'active'),
        gte(freezerItems.addedAt, recentlyAddedCutoff),
      ))
      .orderBy(desc(freezerItems.addedAt)),
  ])

  return {
    expired: groupByFreezer(expiredRows, allFreezersRows),
    approaching: groupByFreezer(approachingRows, allFreezersRows),
    recentlyAdded: groupByFreezer(recentRows, allFreezersRows),
  }
}
