import { and, eq, like, desc, inArray } from 'drizzle-orm'
import { db } from '../database'
import { dishes, dishTags } from '../database/schema'
import type { Dish } from '../../shared/types/dish'
import type { Tag } from '../../shared/types/tag'
import type { CreateDishInput, UpdateDishInput } from '../../shared/schemas/dish'
import { getTagsForDishes, setDishTags } from './tagService'

type DishRow = typeof dishes.$inferSelect

function rowToDish(row: DishRow, dishTagList: Tag[] = []): Dish {
  return {
    ...row,
    difficulty: row.difficulty as Dish['difficulty'],
    allergens: JSON.parse(row.allergens) as string[],
    season: JSON.parse(row.season) as Dish['season'],
    tags: dishTagList,
  }
}

function now(): string {
  return new Date().toISOString()
}

export interface ListDishesOptions {
  search?: string
  archived?: boolean
  tagId?: number
}

export async function listDishes(opts: ListDishesOptions = {}): Promise<Dish[]> {
  const { search, archived = false, tagId } = opts
  const conditions = [eq(dishes.archived, archived)]

  if (search) conditions.push(like(dishes.name, `%${search}%`))

  if (tagId !== undefined) {
    const tagged = await db
      .select({ dishId: dishTags.dishId })
      .from(dishTags)
      .where(eq(dishTags.tagId, tagId))
    if (tagged.length === 0) return []
    conditions.push(inArray(dishes.id, tagged.map(r => r.dishId)))
  }

  const rows = await db
    .select()
    .from(dishes)
    .where(and(...conditions))
    .orderBy(desc(dishes.createdAt))

  if (rows.length === 0) return []
  const tagMap = await getTagsForDishes(rows.map(r => r.id))
  return rows.map(row => rowToDish(row, tagMap.get(row.id) ?? []))
}

export async function getDishById(id: number): Promise<Dish | null> {
  const rows = await db.select().from(dishes).where(eq(dishes.id, id))
  if (!rows[0]) return null
  const tagMap = await getTagsForDishes([id])
  return rowToDish(rows[0], tagMap.get(id) ?? [])
}

export async function createDish(input: CreateDishInput & { tagIds?: number[] }): Promise<Dish> {
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

  const dish = rowToDish(rows[0]!)

  if (input.tagIds?.length) {
    await setDishTags(dish.id, input.tagIds)
    const tagMap = await getTagsForDishes([dish.id])
    return { ...dish, tags: tagMap.get(dish.id) ?? [] }
  }

  return dish
}

export async function updateDish(id: number, input: UpdateDishInput & { tagIds?: number[] }): Promise<Dish | null> {
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
  if (!rows[0]) return null

  if (input.tagIds !== undefined) {
    await setDishTags(id, input.tagIds)
  }

  const tagMap = await getTagsForDishes([id])
  return rowToDish(rows[0], tagMap.get(id) ?? [])
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
