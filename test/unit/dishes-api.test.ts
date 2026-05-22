import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Dish } from '../../shared/types/dish'

const TEST_DB_PATH = '/tmp/dishes-api-test.db'

if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
const _sqlite = new Database(TEST_DB_PATH)
migrate(drizzle(_sqlite), { migrationsFolder: 'server/database/migrations' })

beforeEach(() => {
  _sqlite.exec('DELETE FROM dishes')
})

process.env.DATABASE_URL = TEST_DB_PATH

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  browser: false,
})

describe('GET /api/dishes', () => {
  it('returns an array', async () => {
    const data = await $fetch('/api/dishes')
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('POST /api/dishes', () => {
  it('returns 400 when name is missing', async () => {
    const response = await $fetch('/api/dishes', {
      method: 'POST',
      body: {},
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('returns 400 when name is empty string', async () => {
    const response = await $fetch('/api/dishes', {
      method: 'POST',
      body: { name: '' },
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('creates a dish and returns the full object', async () => {
    const data = await $fetch<Dish>('/api/dishes', {
      method: 'POST',
      body: { name: 'API Route Test Dish', freeFrom: ['gluten-free'] },
    })
    expect(data.id).toBeTypeOf('number')
    expect(data.name).toBe('API Route Test Dish')
    expect(data.freeFrom).toEqual(['gluten-free'])
  })
})

describe('GET /api/dishes/[id]', () => {
  it('returns 404 for a non-existent id', async () => {
    const response = await $fetch('/api/dishes/999999999', {
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('returns 400 for a non-numeric id', async () => {
    const response = await $fetch('/api/dishes/not-a-number', {
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('returns the dish for a valid id', async () => {
    const created = await $fetch<Dish>('/api/dishes', {
      method: 'POST',
      body: { name: 'Detail Test Dish' },
    })
    const dish = await $fetch<Dish>(`/api/dishes/${created.id}`)
    expect(dish.id).toBe(created.id)
    expect(dish.name).toBe('Detail Test Dish')
  })
})

describe('PATCH /api/dishes/[id]', () => {
  it('returns 404 for non-existent id', async () => {
    const response = await $fetch('/api/dishes/999999999', {
      method: 'PATCH',
      body: { name: 'X' },
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('updates and returns the dish', async () => {
    const created = await $fetch<Dish>('/api/dishes', {
      method: 'POST',
      body: { name: 'Before Update' },
    })
    const updated = await $fetch<Dish>(`/api/dishes/${created.id}`, {
      method: 'PATCH',
      body: { name: 'After Update' },
    })
    expect(updated.name).toBe('After Update')
  })
})

describe('DELETE /api/dishes/[id]', () => {
  it('returns 404 for non-existent id', async () => {
    const response = await $fetch('/api/dishes/999999999', {
      method: 'DELETE',
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('deletes an existing dish', async () => {
    const created = await $fetch<Dish>('/api/dishes', {
      method: 'POST',
      body: { name: 'To Be Deleted' },
    })
    await $fetch(`/api/dishes/${created.id}`, { method: 'DELETE' })
    const response = await $fetch(`/api/dishes/${created.id}`, { ignoreResponseError: true })
    expect(response).toMatchObject({ error: expect.any(String) })
  })
})
