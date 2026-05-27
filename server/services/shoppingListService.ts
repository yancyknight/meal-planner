import { and, eq, gte, lte, lt, sql } from 'drizzle-orm'
import { db } from '../database'
import { shoppingLists, shoppingListItems, planEntries, dishIngredients, canonicalIngredients, dishes } from '../database/schema'
import type { CreateShoppingListInput } from '../../shared/schemas/shoppingList'

export interface ShoppingListSummary {
  id: number
  name: string | null
  dateRangeStart: string
  dateRangeEnd: string
  isDone: boolean
  doneAt: string | null
  createdAt: string
  itemCount: number
  checkedCount: number
  deletesAt: string | null
}

export interface ShoppingListItem {
  id: number
  canonicalIngredientId: number | null
  canonicalName: string | null
  walmartUrl: string | null
  sourceDishIds: number[]
  sourceDishNames: string[]
  rawTexts: string[]
  checked: boolean
}

export interface ShoppingListDetail {
  id: number
  name: string | null
  dateRangeStart: string
  dateRangeEnd: string
  isDone: boolean
  doneAt: string | null
  createdAt: string
  deletesAt: string | null
  items: ShoppingListItem[]
}

function computeDeletesAt(doneAt: string | null): string | null {
  if (!doneAt) return null
  const d = new Date(doneAt)
  d.setTime(d.getTime() + 36 * 60 * 60 * 1000)
  return d.toISOString()
}

export async function createShoppingList(input: CreateShoppingListInput): Promise<ShoppingListDetail> {
  const now = new Date().toISOString()

  const [list] = await db
    .insert(shoppingLists)
    .values({
      name: input.name ?? '',
      dateRangeStart: input.dateRangeStart,
      dateRangeEnd: input.dateRangeEnd,
      isDone: 0,
      doneAt: null,
      createdAt: now,
    })
    .returning()

  await generateItems(list!.id, input.dateRangeStart, input.dateRangeEnd)

  return getById(list!.id) as Promise<ShoppingListDetail>
}

async function generateItems(listId: number, start: string, end: string): Promise<void> {
  // Fresh dish entries → grouped ingredient items
  const freshEntries = await db
    .select({ dishId: planEntries.dishId })
    .from(planEntries)
    .where(
      and(
        gte(planEntries.date, start),
        lte(planEntries.date, end),
        eq(planEntries.entryKind, 'fresh'),
        sql`${planEntries.dishId} IS NOT NULL`,
      ),
    )

  const dishIds = [...new Set(freshEntries.map(e => e.dishId!).filter(Boolean))]

  if (dishIds.length > 0) {
    const ingredients = await db
      .select({
        dishId: dishIngredients.dishId,
        dishName: dishes.name,
        canonicalIngredientId: dishIngredients.canonicalIngredientId,
        rawText: dishIngredients.rawText,
      })
      .from(dishIngredients)
      .innerJoin(dishes, eq(dishIngredients.dishId, dishes.id))
      .where(sql`${dishIngredients.dishId} IN ${dishIds}`)

    const grouped = new Map<number, { dishIds: number[]; dishNames: string[]; rawTexts: string[] }>()
    for (const row of ingredients) {
      const existing = grouped.get(row.canonicalIngredientId)
      if (existing) {
        if (!existing.dishIds.includes(row.dishId)) {
          existing.dishIds.push(row.dishId)
          existing.dishNames.push(row.dishName)
        }
        existing.rawTexts.push(row.rawText)
      }
      else {
        grouped.set(row.canonicalIngredientId, {
          dishIds: [row.dishId],
          dishNames: [row.dishName],
          rawTexts: [row.rawText],
        })
      }
    }

    if (grouped.size > 0) {
      await db.insert(shoppingListItems).values(
        [...grouped.entries()].map(([canonicalIngredientId, data]) => ({
          shoppingListId: listId,
          canonicalIngredientId,
          sourceDishIds: JSON.stringify(data.dishIds),
          rawTexts: JSON.stringify(data.rawTexts),
          checked: 0,
        })),
      )
    }
  }

  // One-off entries → one row each with null canonicalIngredientId
  const oneOffEntries = await db
    .select({ oneOffText: planEntries.oneOffText })
    .from(planEntries)
    .where(
      and(
        gte(planEntries.date, start),
        lte(planEntries.date, end),
        eq(planEntries.entryKind, 'one-off'),
        sql`${planEntries.oneOffText} IS NOT NULL`,
      ),
    )

  const oneOffValues = oneOffEntries
    .filter(e => e.oneOffText)
    .map(e => ({
      shoppingListId: listId,
      canonicalIngredientId: null,
      sourceDishIds: '[]',
      rawTexts: JSON.stringify([e.oneOffText!]),
      checked: 0,
    }))

  if (oneOffValues.length > 0) {
    await db.insert(shoppingListItems).values(oneOffValues)
  }
}

export async function listShoppingLists(): Promise<ShoppingListSummary[]> {
  const lists = await db
    .select()
    .from(shoppingLists)
    .orderBy(sql`${shoppingLists.createdAt} DESC`)

  if (lists.length === 0) return []

  const allItems = await db
    .select({
      shoppingListId: shoppingListItems.shoppingListId,
      checked: shoppingListItems.checked,
    })
    .from(shoppingListItems)

  const countsByList = new Map<number, { total: number; checked: number }>()
  for (const item of allItems) {
    const existing = countsByList.get(item.shoppingListId) ?? { total: 0, checked: 0 }
    existing.total++
    if (item.checked) existing.checked++
    countsByList.set(item.shoppingListId, existing)
  }

  return lists.map((list) => {
    const counts = countsByList.get(list.id) ?? { total: 0, checked: 0 }
    return {
      id: list.id,
      name: list.name,
      dateRangeStart: list.dateRangeStart,
      dateRangeEnd: list.dateRangeEnd,
      isDone: list.isDone === 1,
      doneAt: list.doneAt,
      createdAt: list.createdAt,
      itemCount: counts.total,
      checkedCount: counts.checked,
      deletesAt: computeDeletesAt(list.doneAt),
    }
  })
}

export async function getById(id: number): Promise<ShoppingListDetail | null> {
  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.id, id))

  if (!list) return null

  const items = await db
    .select({
      id: shoppingListItems.id,
      canonicalIngredientId: shoppingListItems.canonicalIngredientId,
      canonicalName: canonicalIngredients.name,
      walmartUrl: canonicalIngredients.walmartUrl,
      sourceDishIds: shoppingListItems.sourceDishIds,
      rawTexts: shoppingListItems.rawTexts,
      checked: shoppingListItems.checked,
    })
    .from(shoppingListItems)
    .leftJoin(canonicalIngredients, eq(shoppingListItems.canonicalIngredientId, canonicalIngredients.id))
    .where(eq(shoppingListItems.shoppingListId, id))
    .orderBy(
      sql`CASE WHEN ${canonicalIngredients.name} IS NULL THEN 1 ELSE 0 END`,
      canonicalIngredients.name,
      shoppingListItems.id,
    )

  // Resolve dish names for all sourceDishIds
  const allDishIds = [...new Set(items.flatMap(item => JSON.parse(item.sourceDishIds) as number[]))]
  const dishNameMap = new Map<number, string>()
  if (allDishIds.length > 0) {
    const dishRows = await db
      .select({ id: dishes.id, name: dishes.name })
      .from(dishes)
      .where(sql`${dishes.id} IN ${allDishIds}`)
    for (const d of dishRows) dishNameMap.set(d.id, d.name)
  }

  return {
    id: list.id,
    name: list.name,
    dateRangeStart: list.dateRangeStart,
    dateRangeEnd: list.dateRangeEnd,
    isDone: list.isDone === 1,
    doneAt: list.doneAt,
    createdAt: list.createdAt,
    deletesAt: computeDeletesAt(list.doneAt),
    items: items.map(item => {
      const dishIds = JSON.parse(item.sourceDishIds) as number[]
      return {
        id: item.id,
        canonicalIngredientId: item.canonicalIngredientId,
        canonicalName: item.canonicalName,
        walmartUrl: item.walmartUrl,
        sourceDishIds: dishIds,
        sourceDishNames: dishIds.map(id => dishNameMap.get(id) ?? ''),
        rawTexts: JSON.parse(item.rawTexts) as string[],
        checked: item.checked === 1,
      }
    }),
  }
}

export async function checkItem(itemId: number, checked: boolean): Promise<boolean> {
  const result = await db
    .update(shoppingListItems)
    .set({ checked: checked ? 1 : 0 })
    .where(eq(shoppingListItems.id, itemId))
    .returning({ id: shoppingListItems.id })
  return result.length > 0
}

export async function setDone(listId: number, isDone: boolean): Promise<ShoppingListDetail | null> {
  const now = new Date().toISOString()
  const [current] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, listId))
  if (!current) return null

  const doneAt = isDone
    ? (current.doneAt ?? now)
    : null

  await db
    .update(shoppingLists)
    .set({ isDone: isDone ? 1 : 0, doneAt })
    .where(eq(shoppingLists.id, listId))

  return getById(listId)
}

export async function deleteList(listId: number): Promise<boolean> {
  const result = await db
    .delete(shoppingLists)
    .where(eq(shoppingLists.id, listId))
    .returning({ id: shoppingLists.id })
  return result.length > 0
}

export async function deleteExpired(): Promise<number> {
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  const result = await db
    .delete(shoppingLists)
    .where(
      and(
        eq(shoppingLists.isDone, 1),
        lt(shoppingLists.doneAt, cutoff),
      ),
    )
    .returning({ id: shoppingLists.id })
  return result.length
}
