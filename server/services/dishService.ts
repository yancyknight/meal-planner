import { and, eq, like, desc, asc, inArray, sql } from 'drizzle-orm'
import { db } from '../database'
import { dishes, dishTags, planEntries } from '../database/schema'
import type { Dish, DishSort } from '../../shared/types/dish'
import type { Tag } from '../../shared/types/tag'
import type { CreateDishInput, UpdateDishInput } from '../../shared/schemas/dish'
import { getTagsForDishes, setDishTags } from './tagService'
import { hasEntriesForDish } from './planEntryService'

type DishRow = typeof dishes.$inferSelect

function rowToDish(row: DishRow, dishTagList: Tag[] = []): Dish {
  return {
    ...row,
    difficulty: row.difficulty as Dish['difficulty'],
    freeFrom: JSON.parse(row.freeFrom) as Dish['freeFrom'],
    season: JSON.parse(row.season) as Dish['season'],
    excludedFromSuggestions: row.excludedFromSuggestions === 1,
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
  virtualTagId?: string
  sort?: DishSort
}

export async function listDishes(opts: ListDishesOptions = {}): Promise<Dish[]> {
  const { search, archived = false, tagId, virtualTagId, sort = 'created_desc' } = opts
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

  if (virtualTagId !== undefined) {
    switch (virtualTagId) {
      case 'v:quick':
        conditions.push(sql`${dishes.timeEstimateMinutes} IS NOT NULL AND ${dishes.timeEstimateMinutes} <= 20`)
        break
      case 'v:easy':
        conditions.push(eq(dishes.difficulty, 'easy'))
        break
      case 'v:dairy-free':
        conditions.push(like(dishes.freeFrom, '%"dairy-free"%'))
        break
      case 'v:gluten-free':
        conditions.push(like(dishes.freeFrom, '%"gluten-free"%'))
        break
      case 'v:nut-free':
        conditions.push(like(dishes.freeFrom, '%"nut-free"%'))
        break
      case 'v:shellfish-free':
        conditions.push(like(dishes.freeFrom, '%"shellfish-free"%'))
        break
      case 'v:egg-free':
        conditions.push(like(dishes.freeFrom, '%"egg-free"%'))
        break
      case 'v:soy-free':
        conditions.push(like(dishes.freeFrom, '%"soy-free"%'))
        break
      case 'v:peanut-free':
        conditions.push(like(dishes.freeFrom, '%"peanut-free"%'))
        break
    }
  }

  if (sort === 'last_cooked_desc') {
    // LEFT JOIN to get the most recent fresh plan entry per dish, sort by it DESC (never-cooked last)
    const rows = await db
      .select({ dish: dishes, lastCooked: sql<string | null>`max(case when ${planEntries.entryKind} = 'fresh' then ${planEntries.date} end)`.as('lastCooked') })
      .from(dishes)
      .leftJoin(planEntries, eq(planEntries.dishId, dishes.id))
      .where(and(...conditions))
      .groupBy(dishes.id)
      .orderBy(sql`lastCooked DESC NULLS LAST`)

    if (rows.length === 0) return []
    const tagMap = await getTagsForDishes(rows.map(r => r.dish.id))
    return rows.map(r => rowToDish(r.dish, tagMap.get(r.dish.id) ?? []))
  }

  const orderClause =
    sort === 'name_asc' ? asc(dishes.name) :
    sort === 'target_interval_asc' ? asc(dishes.targetIntervalDays) :
    desc(dishes.createdAt)

  const rows = await db
    .select()
    .from(dishes)
    .where(and(...conditions))
    .orderBy(orderClause)

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
      freeFrom: JSON.stringify(input.freeFrom ?? []),
      season: JSON.stringify(input.season ?? []),
      notes: input.notes ?? null,
      cooldownDays: input.cooldownDays ?? 7,
      targetIntervalDays: input.targetIntervalDays ?? 14,
      excludedFromSuggestions: input.excludedFromSuggestions ? 1 : 0,
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
  if (input.freeFrom !== undefined) updates.freeFrom = JSON.stringify(input.freeFrom)
  if (input.season !== undefined) updates.season = JSON.stringify(input.season)
  if (input.notes !== undefined) updates.notes = input.notes ?? null
  if (input.cooldownDays !== undefined) updates.cooldownDays = input.cooldownDays
  if (input.targetIntervalDays !== undefined) updates.targetIntervalDays = input.targetIntervalDays
  if (input.excludedFromSuggestions !== undefined) updates.excludedFromSuggestions = input.excludedFromSuggestions ? 1 : 0
  if (input.archived !== undefined) updates.archived = input.archived

  const rows = await db.update(dishes).set(updates).where(eq(dishes.id, id)).returning()
  if (!rows[0]) return null

  if (input.tagIds !== undefined) {
    await setDishTags(id, input.tagIds)
  }

  const tagMap = await getTagsForDishes([id])
  return rowToDish(rows[0], tagMap.get(id) ?? [])
}

export async function deleteDish(id: number): Promise<{ deleted: boolean; hasPlanEntries: boolean }> {
  if (await hasEntriesForDish(id)) {
    return { deleted: false, hasPlanEntries: true }
  }
  const result = await db.delete(dishes).where(eq(dishes.id, id)).returning({ id: dishes.id })
  return { deleted: result.length > 0, hasPlanEntries: false }
}

export async function archiveDish(id: number): Promise<Dish | null> {
  return updateDish(id, { archived: true })
}

export async function unarchiveDish(id: number): Promise<Dish | null> {
  return updateDish(id, { archived: false })
}
