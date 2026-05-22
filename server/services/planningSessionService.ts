import { eq, desc } from 'drizzle-orm'
import { db } from '../database'
import { planningSessions } from '../database/schema'
import type { PlanningSession, MealType, SlotState, PinnedTag, PendingOneOffEntry, DraftSlot } from '../../shared/types/planningSession'
import type { CreatePlanningSessionInput, PatchPlanningSessionInput } from '../../shared/schemas/planningSession'

type SessionRow = typeof planningSessions.$inferSelect

function rowToSession(row: SessionRow): PlanningSession {
  return {
    id: row.id,
    weekStart: row.weekStart,
    mealTypes: JSON.parse(row.mealTypes) as MealType[],
    currentStep: row.currentStep as 1 | 2 | 3 | 4,
    slotStates: JSON.parse(row.slotStates) as Record<string, SlotState>,
    removedPlanEntryIds: JSON.parse(row.removedPlanEntryIds) as number[],
    pendingOneOffEntries: JSON.parse(row.pendingOneOffEntries) as PendingOneOffEntry[],
    sessionVirtualTags: JSON.parse(row.sessionVirtualTags) as string[],
    pinnedTags: JSON.parse(row.pinnedTags) as PinnedTag[],
    wishlistTags: JSON.parse(row.wishlistTags) as number[],
    draftPlan: JSON.parse(row.draftPlan) as Record<string, DraftSlot>,
    shownDishIdsBySlot: JSON.parse(row.shownDishIdsBySlot) as Record<string, number[]>,
    leftoverToggles: JSON.parse(row.leftoverToggles) as Record<string, boolean>,
    status: row.status as 'in_progress' | 'finalizing',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listPlanningSessions(): Promise<PlanningSession[]> {
  const rows = await db
    .select()
    .from(planningSessions)
    .orderBy(desc(planningSessions.createdAt))
  return rows.map(rowToSession)
}

export async function getPlanningSession(id: number): Promise<PlanningSession | null> {
  const rows = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.id, id))
  return rows[0] ? rowToSession(rows[0]) : null
}

export async function createPlanningSession(input: CreatePlanningSessionInput): Promise<PlanningSession> {
  const ts = new Date().toISOString()
  const rows = await db
    .insert(planningSessions)
    .values({
      weekStart: input.weekStart,
      mealTypes: JSON.stringify(input.mealTypes),
      currentStep: 1,
      slotStates: '{}',
      removedPlanEntryIds: '[]',
      pendingOneOffEntries: '[]',
      sessionVirtualTags: '[]',
      pinnedTags: '[]',
      wishlistTags: '[]',
      draftPlan: '{}',
      shownDishIdsBySlot: '{}',
      leftoverToggles: '{}',
      status: 'in_progress',
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()
  return rowToSession(rows[0]!)
}

export async function patchPlanningSession(id: number, patch: PatchPlanningSessionInput): Promise<PlanningSession | null> {
  const updates: Partial<typeof planningSessions.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (patch.weekStart !== undefined) updates.weekStart = patch.weekStart
  if (patch.mealTypes !== undefined) updates.mealTypes = JSON.stringify(patch.mealTypes)
  if (patch.currentStep !== undefined) updates.currentStep = patch.currentStep
  if (patch.slotStates !== undefined) updates.slotStates = JSON.stringify(patch.slotStates)
  if (patch.removedPlanEntryIds !== undefined) updates.removedPlanEntryIds = JSON.stringify(patch.removedPlanEntryIds)
  if (patch.pendingOneOffEntries !== undefined) updates.pendingOneOffEntries = JSON.stringify(patch.pendingOneOffEntries)
  if (patch.sessionVirtualTags !== undefined) updates.sessionVirtualTags = JSON.stringify(patch.sessionVirtualTags)
  if (patch.pinnedTags !== undefined) updates.pinnedTags = JSON.stringify(patch.pinnedTags)
  if (patch.wishlistTags !== undefined) updates.wishlistTags = JSON.stringify(patch.wishlistTags)
  if (patch.draftPlan !== undefined) updates.draftPlan = JSON.stringify(patch.draftPlan)
  if (patch.shownDishIdsBySlot !== undefined) updates.shownDishIdsBySlot = JSON.stringify(patch.shownDishIdsBySlot)
  if (patch.leftoverToggles !== undefined) updates.leftoverToggles = JSON.stringify(patch.leftoverToggles)
  if (patch.status !== undefined) updates.status = patch.status

  const rows = await db
    .update(planningSessions)
    .set(updates)
    .where(eq(planningSessions.id, id))
    .returning()

  return rows[0] ? rowToSession(rows[0]) : null
}

export async function deletePlanningSession(id: number): Promise<boolean> {
  const result = await db
    .delete(planningSessions)
    .where(eq(planningSessions.id, id))
    .returning({ id: planningSessions.id })
  return result.length > 0
}
