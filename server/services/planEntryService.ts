import { and, eq, gte, lte, desc, isNull } from 'drizzle-orm'
import { db } from '../database'
import { planEntries, dishes } from '../database/schema'
import type { PlanEntry, MealType, EntryKind } from '../../shared/types/planEntry'
import type { CreatePlanEntryInput } from '../../shared/schemas/planEntry'

type PlanEntryRow = typeof planEntries.$inferSelect

function rowToPlanEntry(
  row: PlanEntryRow,
  dish?: { name: string; imageLocalPath: string | null; imageUrl: string | null; yieldServings: number | null } | null,
): PlanEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.mealType as MealType,
    entryKind: row.entryKind as EntryKind,
    dishId: row.dishId,
    dishName: dish?.name ?? null,
    dishImageLocalPath: dish?.imageLocalPath ?? null,
    dishImageUrl: dish?.imageUrl ?? null,
    dishYieldServings: dish?.yieldServings ?? null,
    oneOffText: row.oneOffText,
    guestCount: row.guestCount,
    createdAt: row.createdAt,
  }
}

export async function listByDateRange(start: string, end: string): Promise<PlanEntry[]> {
  const rows = await db
    .select({
      entry: planEntries,
      dishName: dishes.name,
      dishImageLocalPath: dishes.imageLocalPath,
      dishImageUrl: dishes.imageUrl,
      dishYieldServings: dishes.yieldServings,
    })
    .from(planEntries)
    .leftJoin(dishes, eq(planEntries.dishId, dishes.id))
    .where(and(gte(planEntries.date, start), lte(planEntries.date, end)))
    .orderBy(planEntries.date, planEntries.mealType, planEntries.createdAt)

  return rows.map(r =>
    rowToPlanEntry(r.entry, r.dishName != null ? {
      name: r.dishName,
      imageLocalPath: r.dishImageLocalPath,
      imageUrl: r.dishImageUrl,
      yieldServings: r.dishYieldServings,
    } : null),
  )
}

export async function createPlanEntry(input: CreatePlanEntryInput): Promise<PlanEntry> {
  const ts = new Date().toISOString()
  const rows = await db
    .insert(planEntries)
    .values({
      date: input.date,
      mealType: input.mealType,
      entryKind: input.entryKind ?? 'fresh',
      dishId: input.dishId ?? null,
      oneOffText: input.oneOffText ?? null,
      guestCount: input.guestCount ?? 0,
      createdAt: ts,
    })
    .returning()

  const row = rows[0]!
  let dish = null
  if (row.dishId) {
    const dishRows = await db
      .select({ name: dishes.name, imageLocalPath: dishes.imageLocalPath, imageUrl: dishes.imageUrl, yieldServings: dishes.yieldServings })
      .from(dishes)
      .where(eq(dishes.id, row.dishId))
    dish = dishRows[0] ?? null
  }

  return rowToPlanEntry(row, dish)
}

export async function deletePlanEntry(id: number): Promise<boolean> {
  const result = await db.delete(planEntries).where(eq(planEntries.id, id)).returning({ id: planEntries.id })
  return result.length > 0
}

export async function hasEntriesForDish(dishId: number): Promise<boolean> {
  const rows = await db
    .select({ id: planEntries.id })
    .from(planEntries)
    .where(eq(planEntries.dishId, dishId))
    .limit(1)
  return rows.length > 0
}

/** Returns days since the most recent fresh plan entry for this dish before the given date, or null if never served fresh. */
export async function daysSinceLastServedFresh(dishId: number, beforeDate: string): Promise<number | null> {
  const rows = await db
    .select({ date: planEntries.date })
    .from(planEntries)
    .where(
      and(
        eq(planEntries.dishId, dishId),
        eq(planEntries.entryKind, 'fresh'),
        lte(planEntries.date, beforeDate),
      ),
    )
    .orderBy(desc(planEntries.date))
    .limit(1)

  if (!rows[0]) return null

  const lastDate = new Date(rows[0].date)
  const before = new Date(beforeDate)
  const diffMs = before.getTime() - lastDate.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/** Returns true if a fresh plan entry's yield exceeds the household serving need. */
export function hasLeftovers(yieldServings: number | null, guestCount: number, householdSize: number): boolean {
  if (yieldServings == null) return false
  return yieldServings > householdSize + guestCount
}
