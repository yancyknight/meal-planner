import { eq, asc, inArray, sql } from 'drizzle-orm'
import Fuse from 'fuse.js'
import { db } from '../database'
import { canonicalIngredients, dishIngredients, dishes, freezerItems } from '../database/schema'
import type { CanonicalIngredient, DishIngredient, FuzzyMatch } from '../../shared/types/ingredient'
import type { DishIngredientInput } from '../../shared/schemas/ingredient'

const FUZZY_THRESHOLD = 0.4

function now(): string {
  return new Date().toISOString()
}

export async function listCanonicalIngredients(): Promise<CanonicalIngredient[]> {
  return db.select().from(canonicalIngredients).orderBy(asc(canonicalIngredients.name))
}

export async function getCanonicalIngredient(id: number): Promise<CanonicalIngredient | null> {
  const rows = await db.select().from(canonicalIngredients).where(eq(canonicalIngredients.id, id))
  return rows[0] ?? null
}

export async function findOrCreateCanonical(name: string): Promise<CanonicalIngredient> {
  const normalized = name.trim()
  const existing = await db
    .select()
    .from(canonicalIngredients)
    .where(sql`lower(${canonicalIngredients.name}) = lower(${normalized})`)
  if (existing[0]) return existing[0]
  const ts = now()
  const rows = await db
    .insert(canonicalIngredients)
    .values({ name: normalized, createdAt: ts, updatedAt: ts })
    .returning()
  return rows[0]!
}

export async function renameCanonical(id: number, name: string): Promise<CanonicalIngredient | null> {
  const rows = await db
    .update(canonicalIngredients)
    .set({ name: name.trim(), updatedAt: now() })
    .where(eq(canonicalIngredients.id, id))
    .returning()
  return rows[0] ?? null
}

export async function setWalmartUrl(id: number, walmartUrl: string | null): Promise<CanonicalIngredient | null> {
  const rows = await db
    .update(canonicalIngredients)
    .set({ walmartUrl, updatedAt: now() })
    .where(eq(canonicalIngredients.id, id))
    .returning()
  return rows[0] ?? null
}

export async function mergeCanonicals(primaryId: number, secondaryId: number): Promise<void> {
  if (primaryId === secondaryId) throw new Error('Cannot merge an ingredient with itself')
  await db
    .update(dishIngredients)
    .set({ canonicalIngredientId: primaryId })
    .where(eq(dishIngredients.canonicalIngredientId, secondaryId))
  await db
    .update(freezerItems)
    .set({ canonicalIngredientId: primaryId })
    .where(eq(freezerItems.canonicalIngredientId, secondaryId))
  await db.delete(canonicalIngredients).where(eq(canonicalIngredients.id, secondaryId))
}

export async function deleteCanonical(id: number): Promise<boolean> {
  const linked = await db
    .select({ id: dishIngredients.id })
    .from(dishIngredients)
    .where(eq(dishIngredients.canonicalIngredientId, id))
    .limit(1)
  if (linked.length > 0) return false
  await db.delete(canonicalIngredients).where(eq(canonicalIngredients.id, id))
  return true
}

export async function getDishesByCanonical(canonicalId: number): Promise<{ id: number; name: string }[]> {
  const rows = await db
    .selectDistinct({ id: dishes.id, name: dishes.name })
    .from(dishIngredients)
    .innerJoin(dishes, eq(dishIngredients.dishId, dishes.id))
    .where(eq(dishIngredients.canonicalIngredientId, canonicalId))
    .orderBy(asc(dishes.name))
  return rows
}

export async function fuzzySearch(query: string): Promise<FuzzyMatch[]> {
  if (!query.trim()) return []
  const all = await listCanonicalIngredients()
  const fuse = new Fuse(all, {
    keys: ['name'],
    threshold: FUZZY_THRESHOLD,
    includeScore: true,
  })
  const fuseResults = fuse.search(query)
  const seenIds = new Set(fuseResults.map(r => r.item.id))

  // Fuse.js matches the query pattern against each item, so a long query
  // ("Extra Virgin Olive Oil") won't match a shorter canonical ("Olive Oil").
  // Also surface any canonical whose name is contained within the query.
  const queryLower = query.toLowerCase()
  const substringMatches = all.filter(c =>
    !seenIds.has(c.id) && queryLower.includes(c.name.toLowerCase()),
  )

  return [
    ...fuseResults.map(r => ({ canonical: r.item, score: r.score ?? 1 })),
    ...substringMatches.map(c => ({ canonical: c, score: 0.05 })),
  ]
}

export async function getDishIngredients(dishId: number): Promise<DishIngredient[]> {
  const rows = await db
    .select({
      id: dishIngredients.id,
      dishId: dishIngredients.dishId,
      canonicalIngredientId: dishIngredients.canonicalIngredientId,
      rawText: dishIngredients.rawText,
      sortOrder: dishIngredients.sortOrder,
      canonical: canonicalIngredients,
    })
    .from(dishIngredients)
    .innerJoin(canonicalIngredients, eq(dishIngredients.canonicalIngredientId, canonicalIngredients.id))
    .where(eq(dishIngredients.dishId, dishId))
    .orderBy(asc(dishIngredients.sortOrder))
  return rows
}

export async function setDishIngredients(dishId: number, inputs: DishIngredientInput[]): Promise<DishIngredient[]> {
  await db.delete(dishIngredients).where(eq(dishIngredients.dishId, dishId))
  if (inputs.length === 0) return []
  await db.insert(dishIngredients).values(
    inputs.map((item, idx) => ({
      dishId,
      canonicalIngredientId: item.canonicalIngredientId,
      rawText: item.rawText,
      sortOrder: item.sortOrder ?? idx,
    })),
  )
  return getDishIngredients(dishId)
}

export async function getIngredientsForDishes(dishIds: number[]): Promise<Map<number, DishIngredient[]>> {
  if (dishIds.length === 0) return new Map()
  const rows = await db
    .select({
      id: dishIngredients.id,
      dishId: dishIngredients.dishId,
      canonicalIngredientId: dishIngredients.canonicalIngredientId,
      rawText: dishIngredients.rawText,
      sortOrder: dishIngredients.sortOrder,
      canonical: canonicalIngredients,
    })
    .from(dishIngredients)
    .innerJoin(canonicalIngredients, eq(dishIngredients.canonicalIngredientId, canonicalIngredients.id))
    .where(inArray(dishIngredients.dishId, dishIds))
    .orderBy(asc(dishIngredients.sortOrder))
  const result = new Map<number, DishIngredient[]>()
  for (const row of rows) {
    const list = result.get(row.dishId) ?? []
    list.push(row)
    result.set(row.dishId, list)
  }
  return result
}
