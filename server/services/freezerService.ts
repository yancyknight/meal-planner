import { eq } from 'drizzle-orm'
import { db } from '../database'
import { freezers, freezerItems } from '../database/schema'
import type { Freezer } from '../../shared/types/freezer'
import type { CreateFreezerInput, UpdateFreezerInput } from '../../shared/schemas/freezer'

function now(): string {
  return new Date().toISOString()
}

export async function listFreezers(): Promise<Freezer[]> {
  return db.select().from(freezers).orderBy(freezers.name)
}

export async function getFreezer(id: number): Promise<Freezer | null> {
  const rows = await db.select().from(freezers).where(eq(freezers.id, id))
  return rows[0] ?? null
}

export async function createFreezer(input: CreateFreezerInput): Promise<Freezer> {
  const ts = now()
  const rows = await db
    .insert(freezers)
    .values({ name: input.name, createdAt: ts, updatedAt: ts })
    .returning()
  return rows[0]!
}

export async function updateFreezer(id: number, input: UpdateFreezerInput): Promise<Freezer | null> {
  const rows = await db
    .update(freezers)
    .set({ name: input.name, updatedAt: now() })
    .where(eq(freezers.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteFreezer(id: number): Promise<{ deleted: boolean; reason?: string }> {
  const active = await db
    .select({ id: freezerItems.id })
    .from(freezerItems)
    .where(eq(freezerItems.freezerId, id))
    .limit(1)
  if (active.length > 0) {
    return { deleted: false, reason: 'Freezer has items. Move or remove all items before deleting.' }
  }
  await db.delete(freezers).where(eq(freezers.id, id))
  return { deleted: true }
}
