import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { setup, $fetch, fetch as fetchRaw } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Dish } from '../../shared/types/dish'
import type { DishFile } from '../../shared/types/dishFile'

const TEST_DB_PATH = '/tmp/dish-files-api-test.db'
const TEST_FILE_DIR = join(tmpdir(), 'dish-files-api-test')

if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
const _sqlite = new Database(TEST_DB_PATH)
migrate(drizzle(_sqlite), { migrationsFolder: 'server/database/migrations' })

beforeEach(() => {
  _sqlite.exec('DELETE FROM dish_files')
  _sqlite.exec('DELETE FROM dishes')
  rmSync(TEST_FILE_DIR, { recursive: true, force: true })
})

afterAll(() => {
  rmSync(TEST_FILE_DIR, { recursive: true, force: true })
})

process.env.DATABASE_URL = TEST_DB_PATH
process.env.FILE_DIR = TEST_FILE_DIR

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  browser: false,
})

async function createDish(name = 'Roast Chicken'): Promise<Dish> {
  return $fetch<Dish>('/api/dishes', { method: 'POST', body: { name } })
}

function form(filename: string, type: string, content = '%PDF-1.4 test'): FormData {
  const body = new FormData()
  body.append('file', new File([content], filename, { type }))
  return body
}

async function upload(dishId: number, filename: string, type: string, content?: string) {
  return $fetch<DishFile>(`/api/dishes/${dishId}/files`, { method: 'POST', body: form(filename, type, content) })
}

describe('POST /api/dishes/[id]/files', () => {
  it('stores the file and returns its metadata', async () => {
    const dish = await createDish()
    const file = await upload(dish.id, 'combined.pdf', 'application/pdf')

    expect(file.id).toBeTypeOf('number')
    expect(file.dishId).toBe(dish.id)
    expect(file.originalName).toBe('combined.pdf')
    expect(file.mimeType).toBe('application/pdf')
    expect(readdirSync(TEST_FILE_DIR)).toContain(file.storedName)
  })

  it('rejects a disallowed file type with 400', async () => {
    const dish = await createDish()
    await expect(upload(dish.id, 'evil.sh', 'application/x-sh')).rejects.toMatchObject({ status: 400 })
  })

  it('returns 404 for an unknown dish', async () => {
    await expect(upload(999999, 'a.pdf', 'application/pdf')).rejects.toMatchObject({ status: 404 })
  })

  it('returns 400 when no file part is present', async () => {
    const dish = await createDish()
    await expect(
      $fetch(`/api/dishes/${dish.id}/files`, { method: 'POST', body: new FormData() }),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('GET /api/dishes/[id]/files', () => {
  it('lists the files attached to the dish', async () => {
    const dish = await createDish()
    await upload(dish.id, 'sauce.pdf', 'application/pdf')

    const files = await $fetch<DishFile[]>(`/api/dishes/${dish.id}/files`)
    expect(files).toHaveLength(1)
    expect(files[0]!.originalName).toBe('sauce.pdf')
  })

  it('returns an empty array for a dish with no files', async () => {
    const dish = await createDish()
    expect(await $fetch<DishFile[]>(`/api/dishes/${dish.id}/files`)).toEqual([])
  })
})

describe('GET /api/dish-files/[id]/download', () => {
  it('serves an inline-safe type with its own content type', async () => {
    const dish = await createDish()
    const file = await upload(dish.id, 'combined.pdf', 'application/pdf')

    const res = await fetchRaw(`/api/dish-files/${file.id}/download`)
    expect(res.headers.get('content-type')).toContain('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('inline')
    expect(res.headers.get('content-disposition')).toContain('combined.pdf')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('forces a download for types that are not inline-safe', async () => {
    const dish = await createDish()
    const file = await upload(dish.id, 'plan.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    const res = await fetchRaw(`/api/dish-files/${file.id}/download`)
    expect(res.headers.get('content-type')).toContain('application/octet-stream')
    expect(res.headers.get('content-disposition')).toContain('attachment')
  })

  it('returns 404 for an unknown file', async () => {
    await expect($fetch('/api/dish-files/999999/download')).rejects.toMatchObject({ status: 404 })
  })
})

describe('DELETE /api/dish-files/[id]', () => {
  it('removes the file and its blob', async () => {
    const dish = await createDish()
    const file = await upload(dish.id, 'gone.pdf', 'application/pdf')

    await $fetch(`/api/dish-files/${file.id}`, { method: 'DELETE' })

    expect(await $fetch<DishFile[]>(`/api/dishes/${dish.id}/files`)).toEqual([])
    expect(readdirSync(TEST_FILE_DIR)).not.toContain(file.storedName)
    await expect($fetch(`/api/dish-files/${file.id}/download`)).rejects.toMatchObject({ status: 404 })
  })

  it('returns 404 for an unknown file', async () => {
    await expect($fetch('/api/dish-files/999999', { method: 'DELETE' })).rejects.toMatchObject({ status: 404 })
  })
})
