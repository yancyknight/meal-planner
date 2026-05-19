import { eq, asc, inArray } from 'drizzle-orm'
import { db } from '../database'
import { tags, dishTags } from '../database/schema'
import type { Tag } from '../../shared/types/tag'
import { pickTagColor } from '../utils/tagColors'

export async function listTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(asc(tags.name))
}

export async function findOrCreateTag(name: string, color?: string | null): Promise<Tag> {
  const normalized = name.trim().toLowerCase()
  const existing = await db.select().from(tags).where(eq(tags.name, normalized))
  if (existing[0]) return existing[0]
  const rows = await db.insert(tags).values({
    name: normalized,
    color: color ?? pickTagColor(),
  }).returning()
  return rows[0]!
}

export async function setDishTags(dishId: number, tagIds: number[]): Promise<void> {
  await db.delete(dishTags).where(eq(dishTags.dishId, dishId))
  if (tagIds.length > 0) {
    await db.insert(dishTags).values(tagIds.map(tagId => ({ dishId, tagId })))
  }
}

export async function getTagsForDishes(dishIds: number[]): Promise<Map<number, Tag[]>> {
  if (dishIds.length === 0) return new Map()
  const rows = await db
    .select({ dishId: dishTags.dishId, tag: tags })
    .from(dishTags)
    .innerJoin(tags, eq(dishTags.tagId, tags.id))
    .where(inArray(dishTags.dishId, dishIds))
  const result = new Map<number, Tag[]>()
  for (const row of rows) {
    const list = result.get(row.dishId) ?? []
    list.push(row.tag)
    result.set(row.dishId, list)
  }
  return result
}
