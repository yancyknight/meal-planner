import { and, eq, like, desc } from 'drizzle-orm'
import { db } from '../database'
import { dishes } from '../database/schema'
import type { Dish } from '../../shared/types/dish'
import type { CreateDishInput, UpdateDishInput } from '../../shared/schemas/dish'

type DishRow = typeof dishes.$inferSelect

function rowToDish(row: DishRow): Dish {
  return {
    ...row,
    difficulty: row.difficulty as Dish['difficulty'],
    allergens: JSON.parse(row.allergens) as string[],
    season: JSON.parse(row.season) as Dish['season'],
  }
}

function now(): string {
  return new Date().toISOString()
}

export interface ListDishesOptions {
  search?: string
  archived?: boolean
}

export async function listDishes(opts: ListDishesOptions = {}): Promise<Dish[]> {
  const { search, archived = false } = opts

  const conditions = [eq(dishes.archived, archived)]
  if (search) {
    conditions.push(like(dishes.name, `%${search}%`))
  }

  const rows = await db
    .select()
    .from(dishes)
    .where(and(...conditions))
    .orderBy(desc(dishes.createdAt))

  return rows.map(rowToDish)
}

export async function getDishById(id: number): Promise<Dish | null> {
  const rows = await db.select().from(dishes).where(eq(dishes.id, id))
  return rows[0] ? rowToDish(rows[0]) : null
}

export async function createDish(input: CreateDishInput): Promise<Dish> {
  const ts = now()
  const rows = await db
    .insert(dishes)
    .values({
      name: input.name,
      imageUrl: input.imageUrl ?? null,
      imageLocalPath: input.imageLocalPath ?? null,
      timeEstimateMinutes: input.timeEstimateMinutes ?? null,
      yieldServings: input.yieldServings ?? null,
      sourceUrl: input.sourceUrl ?? null,
      sourceName: input.sourceName ?? null,
      difficulty: input.difficulty ?? null,
      allergens: JSON.stringify(input.allergens ?? []),
      season: JSON.stringify(input.season ?? []),
      notes: input.notes ?? null,
      weight: input.weight ?? 50,
      minIntervalDays: input.minIntervalDays ?? null,
      archived: input.archived ?? false,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()

  return rowToDish(rows[0]!)
}

export async function updateDish(id: number, input: UpdateDishInput): Promise<Dish | null> {
  const updates: Partial<DishRow> = { updatedAt: now() }

  if (input.name !== undefined) updates.name = input.name
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl ?? null
  if (input.imageLocalPath !== undefined) updates.imageLocalPath = input.imageLocalPath ?? null
  if (input.timeEstimateMinutes !== undefined) updates.timeEstimateMinutes = input.timeEstimateMinutes ?? null
  if (input.yieldServings !== undefined) updates.yieldServings = input.yieldServings ?? null
  if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl ?? null
  if (input.sourceName !== undefined) updates.sourceName = input.sourceName ?? null
  if (input.difficulty !== undefined) updates.difficulty = input.difficulty ?? null
  if (input.allergens !== undefined) updates.allergens = JSON.stringify(input.allergens)
  if (input.season !== undefined) updates.season = JSON.stringify(input.season)
  if (input.notes !== undefined) updates.notes = input.notes ?? null
  if (input.weight !== undefined) updates.weight = input.weight
  if (input.minIntervalDays !== undefined) updates.minIntervalDays = input.minIntervalDays ?? null
  if (input.archived !== undefined) updates.archived = input.archived

  const rows = await db.update(dishes).set(updates).where(eq(dishes.id, id)).returning()
  return rows[0] ? rowToDish(rows[0]) : null
}

export async function deleteDish(id: number): Promise<boolean> {
  // Note: plan-entry guard will be enforced here once plan_entries table exists (M5).
  const result = await db.delete(dishes).where(eq(dishes.id, id)).returning({ id: dishes.id })
  return result.length > 0
}

export async function archiveDish(id: number): Promise<Dish | null> {
  return updateDish(id, { archived: true })
}

export async function unarchiveDish(id: number): Promise<Dish | null> {
  return updateDish(id, { archived: false })
}
