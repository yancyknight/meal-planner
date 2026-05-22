import { eq, inArray, lt } from 'drizzle-orm'
import { db } from '../database'
import { dishCooldowns } from '../database/schema'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function set(dishId: number, endsAt: string): Promise<void> {
  const now = new Date().toISOString()
  await db
    .insert(dishCooldowns)
    .values({ dishId, endsAt, createdAt: now })
    .onConflictDoUpdate({ target: dishCooldowns.dishId, set: { endsAt, createdAt: now } })
}

export async function get(dishId: number) {
  const rows = await db
    .select()
    .from(dishCooldowns)
    .where(eq(dishCooldowns.dishId, dishId))
    .limit(1)
  return rows[0] ?? null
}

export async function remove(dishId: number): Promise<void> {
  await db.delete(dishCooldowns).where(eq(dishCooldowns.dishId, dishId))
}

export function isActive(record: { endsAt: string } | null, asOf?: string): boolean {
  if (!record) return false
  return record.endsAt >= (asOf ?? today())
}

/** Returns the set of dishIds that have an active cooldown as of asOf (defaults to today). */
export async function getActiveDishIds(dishIds: number[], asOf?: string): Promise<Set<number>> {
  if (dishIds.length === 0) return new Set()
  const cutoff = asOf ?? today()
  const rows = await db
    .select({ dishId: dishCooldowns.dishId, endsAt: dishCooldowns.endsAt })
    .from(dishCooldowns)
    .where(inArray(dishCooldowns.dishId, dishIds))
  return new Set(rows.filter(r => r.endsAt >= cutoff).map(r => r.dishId))
}

export async function cleanup(): Promise<void> {
  await db.delete(dishCooldowns).where(lt(dishCooldowns.endsAt, today()))
}
