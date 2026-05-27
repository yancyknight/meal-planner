import { count, eq } from 'drizzle-orm'
import { db } from '../database'
import { freezerCategories, freezerItems } from '../database/schema'
import type { FreezerCategory } from '../../shared/types/freezer'
import type { CreateFreezerCategoryInput, UpdateFreezerCategoryInput } from '../../shared/schemas/freezer'

function now(): string {
  return new Date().toISOString()
}

const SEEDED_CATEGORIES: Array<{ name: string; defaultLifetimeDays: number }> = [
  { name: 'Raw Poultry', defaultLifetimeDays: 270 },
  { name: 'Raw Red Meat', defaultLifetimeDays: 365 },
  { name: 'Raw Ground Meat', defaultLifetimeDays: 120 },
  { name: 'Raw Fish (Lean)', defaultLifetimeDays: 180 },
  { name: 'Raw Fish (Fatty)', defaultLifetimeDays: 90 },
  { name: 'Cooked Leftovers', defaultLifetimeDays: 90 },
  { name: 'Soups & Stews', defaultLifetimeDays: 90 },
  { name: 'Bread & Baked Goods', defaultLifetimeDays: 90 },
  { name: 'Prepared Meals & Pizza', defaultLifetimeDays: 60 },
  { name: 'Vegetables (Frozen)', defaultLifetimeDays: 240 },
  { name: 'Fruit', defaultLifetimeDays: 365 },
  { name: 'Stock & Broth', defaultLifetimeDays: 180 },
  { name: 'Sauces', defaultLifetimeDays: 180 },
  { name: 'Butter', defaultLifetimeDays: 270 },
  { name: 'Hard Cheese', defaultLifetimeDays: 180 },
  { name: 'Ice Cream', defaultLifetimeDays: 60 },
  { name: 'Other', defaultLifetimeDays: 90 },
]

async function insertSystemCategories(): Promise<void> {
  const ts = now()
  await db.insert(freezerCategories)
    .values(SEEDED_CATEGORIES.map(c => ({ ...c, isSystem: 1, createdAt: ts, updatedAt: ts })))
    .onConflictDoNothing()
}

export async function seedCategories(): Promise<void> {
  const [row] = await db.select({ n: count() }).from(freezerCategories)
  if ((row?.n ?? 0) > 0) return
  await insertSystemCategories()
}

export async function restoreDefaultCategories(): Promise<void> {
  await insertSystemCategories()
}

export async function listFreezerCategories(): Promise<FreezerCategory[]> {
  return db.select().from(freezerCategories).orderBy(freezerCategories.name)
}

export async function getFreezerCategory(id: number): Promise<FreezerCategory | null> {
  const rows = await db.select().from(freezerCategories).where(eq(freezerCategories.id, id))
  return rows[0] ?? null
}

export async function createFreezerCategory(input: CreateFreezerCategoryInput): Promise<FreezerCategory> {
  const ts = now()
  const rows = await db
    .insert(freezerCategories)
    .values({ name: input.name, defaultLifetimeDays: input.defaultLifetimeDays, isSystem: 0, createdAt: ts, updatedAt: ts })
    .returning()
  return rows[0]!
}

export async function updateFreezerCategory(id: number, input: UpdateFreezerCategoryInput): Promise<FreezerCategory | null> {
  const set: Record<string, unknown> = { updatedAt: now() }
  if (input.name !== undefined) set.name = input.name
  if (input.defaultLifetimeDays !== undefined) set.defaultLifetimeDays = input.defaultLifetimeDays
  const rows = await db
    .update(freezerCategories)
    .set(set)
    .where(eq(freezerCategories.id, id))
    .returning()
  return rows[0] ?? null
}

export async function deleteFreezerCategory(id: number): Promise<{ deleted: boolean; reason?: string }> {
  const linked = await db
    .select({ id: freezerItems.id })
    .from(freezerItems)
    .where(eq(freezerItems.categoryId, id))
    .limit(1)
  if (linked.length > 0) {
    return { deleted: false, reason: 'Category has items. Move all items to another category before deleting.' }
  }
  await db.delete(freezerCategories).where(eq(freezerCategories.id, id))
  return { deleted: true }
}
