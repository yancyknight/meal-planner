import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../server/database/index', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('../../server/database/schema')

  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: 'server/database/migrations' })
  return { db }
})

import { db } from '../../server/database/index'
import { tags, dishTags, dishes } from '../../server/database/schema'
import { listTags, findOrCreateTag, setDishTags, getTagsForDishes } from '../../server/services/tagService'
import { createDish, listDishes } from '../../server/services/dishService'

beforeEach(async () => {
  await db.delete(dishTags)
  await db.delete(tags)
  await db.delete(dishes)
})

describe('findOrCreateTag', () => {
  it('creates a new tag and assigns a color', async () => {
    const tag = await findOrCreateTag('italian')
    expect(tag.id).toBeTypeOf('number')
    expect(tag.name).toBe('italian')
    expect(tag.color).toBeTypeOf('string')
    expect(tag.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns the existing tag on a duplicate call', async () => {
    const first = await findOrCreateTag('italian')
    const second = await findOrCreateTag('italian')
    expect(second.id).toBe(first.id)
    expect(second.color).toBe(first.color)
  })

  it('normalises name to lowercase', async () => {
    const tag = await findOrCreateTag('  Italian  ')
    expect(tag.name).toBe('italian')
  })

  it('treats different casing as the same tag (case-insensitive dedup)', async () => {
    const a = await findOrCreateTag('Vegan')
    const b = await findOrCreateTag('vegan')
    expect(b.id).toBe(a.id)
  })

  it('accepts a caller-supplied color', async () => {
    const tag = await findOrCreateTag('weeknight', '#123456')
    expect(tag.color).toBe('#123456')
  })
})

describe('listTags', () => {
  it('returns all tags in alphabetical order', async () => {
    await findOrCreateTag('zucchini')
    await findOrCreateTag('apple')
    await findOrCreateTag('mango')
    const list = await listTags()
    expect(list.map(t => t.name)).toEqual(['apple', 'mango', 'zucchini'])
  })

  it('returns empty array when no tags exist', async () => {
    expect(await listTags()).toEqual([])
  })
})

describe('setDishTags', () => {
  it('associates tags with a dish', async () => {
    const dish = await createDish({ name: 'Pasta' })
    const italian = await findOrCreateTag('italian')
    const quick = await findOrCreateTag('quick')
    await setDishTags(dish.id, [italian.id, quick.id])
    const tagMap = await getTagsForDishes([dish.id])
    const names = (tagMap.get(dish.id) ?? []).map(t => t.name).sort()
    expect(names).toEqual(['italian', 'quick'])
  })

  it('replaces existing associations on subsequent call', async () => {
    const dish = await createDish({ name: 'Pasta' })
    const italian = await findOrCreateTag('italian')
    const quick = await findOrCreateTag('quick')
    await setDishTags(dish.id, [italian.id, quick.id])
    await setDishTags(dish.id, [italian.id])
    const tagMap = await getTagsForDishes([dish.id])
    expect(tagMap.get(dish.id)?.map(t => t.name)).toEqual(['italian'])
  })

  it('clears all tags when passed an empty array', async () => {
    const dish = await createDish({ name: 'Pasta' })
    const italian = await findOrCreateTag('italian')
    await setDishTags(dish.id, [italian.id])
    await setDishTags(dish.id, [])
    const tagMap = await getTagsForDishes([dish.id])
    expect(tagMap.get(dish.id) ?? []).toEqual([])
  })
})

describe('getTagsForDishes', () => {
  it('returns empty map for no dish IDs', async () => {
    const result = await getTagsForDishes([])
    expect(result.size).toBe(0)
  })

  it('only returns tags for dishes that have them', async () => {
    const a = await createDish({ name: 'A' })
    const b = await createDish({ name: 'B' })
    const tag = await findOrCreateTag('italian')
    await setDishTags(a.id, [tag.id])
    const tagMap = await getTagsForDishes([a.id, b.id])
    expect(tagMap.get(a.id)?.map(t => t.name)).toEqual(['italian'])
    expect(tagMap.get(b.id)).toBeUndefined()
  })
})

describe('listDishes tagId filter', () => {
  it('returns only dishes that have the given tag', async () => {
    const pasta = await createDish({ name: 'Pasta' })
    const tacos = await createDish({ name: 'Tacos' })
    const italian = await findOrCreateTag('italian')
    await setDishTags(pasta.id, [italian.id])

    const results = await listDishes({ tagId: italian.id })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Pasta')
  })

  it('returns empty array when no dishes have the tag', async () => {
    await createDish({ name: 'Pasta' })
    const tag = await findOrCreateTag('vegan')
    expect(await listDishes({ tagId: tag.id })).toHaveLength(0)
  })

  it('includes tags on the returned dish objects', async () => {
    const dish = await createDish({ name: 'Pasta' })
    const italian = await findOrCreateTag('italian')
    await setDishTags(dish.id, [italian.id])
    const results = await listDishes({ tagId: italian.id })
    expect(results[0].tags.map(t => t.name)).toEqual(['italian'])
  })
})
