import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { existsSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { db } from '../../server/database/index'
import { dishes, dishFiles } from '../../server/database/schema'
import { createDish, deleteDish } from '../../server/services/dishService'
import {
  addFileToDish,
  listFilesForDish,
  getDishFile,
  deleteDishFile,
  deleteAllFilesForDish,
  readDishFileContents,
} from '../../server/services/dishFileService'
import { getFileDir, getMaxUploadBytes } from '../../server/services/fileService'

// Read lazily by getFileDir(), so setting it after the imports is fine.
const TEST_FILE_DIR = join(tmpdir(), 'dish-file-service-test')
process.env.FILE_DIR = TEST_FILE_DIR

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

beforeEach(async () => {
  await db.delete(dishFiles)
  await db.delete(dishes)
  rmSync(TEST_FILE_DIR, { recursive: true, force: true })
})

afterAll(() => {
  rmSync(TEST_FILE_DIR, { recursive: true, force: true })
})

async function makeDish(name = 'Roast Chicken') {
  return createDish({ name })
}

function pdf(content = 'combined recipe') {
  return Buffer.from(`%PDF-1.4\n${content}`)
}

function onDisk(storedName: string): boolean {
  return existsSync(join(getFileDir(), storedName))
}

describe('addFileToDish', () => {
  it('writes the blob to disk and returns the persisted row', async () => {
    const dish = await makeDish()
    const result = await addFileToDish(dish.id, pdf(), 'chicken-with-sauce.pdf', 'application/pdf')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.file.dishId).toBe(dish.id)
    expect(result.file.originalName).toBe('chicken-with-sauce.pdf')
    expect(result.file.mimeType).toBe('application/pdf')
    expect(result.file.sizeBytes).toBe(pdf().byteLength)
    expect(result.file.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    expect(onDisk(result.file.storedName)).toBe(true)
    expect((await readDishFileContents(result.file)).toString()).toBe(pdf().toString())
  })

  it('rejects a dish that does not exist', async () => {
    const result = await addFileToDish(9999, pdf(), 'a.pdf', 'application/pdf')
    expect(result).toEqual({ ok: false, reason: 'dish-not-found' })
  })

  it('rejects a disallowed file type and writes nothing to disk', async () => {
    const dish = await makeDish()
    const result = await addFileToDish(dish.id, Buffer.from('#!/bin/sh'), 'evil.sh', 'application/x-sh')

    expect(result).toEqual({ ok: false, reason: 'type-not-allowed' })
    expect(await listFilesForDish(dish.id)).toEqual([])
    expect(existsSync(getFileDir()) ? readdirSync(getFileDir()) : []).toEqual([])
  })

  it('rejects an allowed extension carrying a mismatched MIME type', async () => {
    const dish = await makeDish()
    const result = await addFileToDish(dish.id, Buffer.from('<script>'), 'sneaky.pdf', 'text/html')
    expect(result).toEqual({ ok: false, reason: 'type-not-allowed' })
  })

  it('accepts an allowed extension when the browser reports a generic MIME type', async () => {
    const dish = await makeDish()
    const result = await addFileToDish(dish.id, Buffer.from('# notes'), 'notes.md', 'application/octet-stream')
    expect(result.ok).toBe(true)
  })

  it('rejects a file over the upload ceiling', async () => {
    const dish = await makeDish()
    const previous = process.env.MAX_UPLOAD_MB
    process.env.MAX_UPLOAD_MB = '1'
    try {
      expect(getMaxUploadBytes()).toBe(1024 * 1024)
      const oversize = Buffer.alloc(getMaxUploadBytes() + 1)
      const result = await addFileToDish(dish.id, oversize, 'huge.pdf', 'application/pdf')

      expect(result).toEqual({ ok: false, reason: 'too-large' })
      expect(await listFilesForDish(dish.id)).toEqual([])
    }
    finally {
      if (previous === undefined) delete process.env.MAX_UPLOAD_MB
      else process.env.MAX_UPLOAD_MB = previous
    }
  })

  it('falls back to the default ceiling when MAX_UPLOAD_MB is unset or invalid', () => {
    const previous = process.env.MAX_UPLOAD_MB
    delete process.env.MAX_UPLOAD_MB
    expect(getMaxUploadBytes()).toBe(100 * 1024 * 1024)
    process.env.MAX_UPLOAD_MB = 'not-a-number'
    expect(getMaxUploadBytes()).toBe(100 * 1024 * 1024)
    if (previous === undefined) delete process.env.MAX_UPLOAD_MB
    else process.env.MAX_UPLOAD_MB = previous
  })

  it('rejects an empty file', async () => {
    const dish = await makeDish()
    const result = await addFileToDish(dish.id, Buffer.alloc(0), 'empty.pdf', 'application/pdf')
    expect(result).toEqual({ ok: false, reason: 'invalid-metadata' })
  })
})

describe('listFilesForDish', () => {
  it('returns only that dish\'s files, newest first', async () => {
    const dishA = await makeDish('A')
    const dishB = await makeDish('B')

    const first = await addFileToDish(dishA.id, pdf('1'), 'first.pdf', 'application/pdf')
    await new Promise(r => setTimeout(r, 5))
    const second = await addFileToDish(dishA.id, pdf('2'), 'second.pdf', 'application/pdf')
    await addFileToDish(dishB.id, pdf('3'), 'other.pdf', 'application/pdf')

    expect(first.ok && second.ok).toBe(true)
    const files = await listFilesForDish(dishA.id)
    expect(files.map(f => f.originalName)).toEqual(['second.pdf', 'first.pdf'])
  })

  it('returns an empty array for a dish with no files', async () => {
    const dish = await makeDish()
    expect(await listFilesForDish(dish.id)).toEqual([])
  })
})

describe('deleteDishFile', () => {
  it('removes the row and the blob', async () => {
    const dish = await makeDish()
    const added = await addFileToDish(dish.id, pdf(), 'sauce.pdf', 'application/pdf')
    if (!added.ok) throw new Error('setup failed')

    expect(await deleteDishFile(added.file.id)).toBe(true)
    expect(await getDishFile(added.file.id)).toBeNull()
    expect(onDisk(added.file.storedName)).toBe(false)
  })

  it('returns false for an unknown id', async () => {
    expect(await deleteDishFile(4242)).toBe(false)
  })
})

describe('deleteAllFilesForDish', () => {
  it('clears every row and blob for the dish', async () => {
    const dish = await makeDish()
    const a = await addFileToDish(dish.id, pdf('a'), 'a.pdf', 'application/pdf')
    const b = await addFileToDish(dish.id, pdf('b'), 'b.png', 'image/png')
    if (!a.ok || !b.ok) throw new Error('setup failed')

    await deleteAllFilesForDish(dish.id)

    expect(await listFilesForDish(dish.id)).toEqual([])
    expect(onDisk(a.file.storedName)).toBe(false)
    expect(onDisk(b.file.storedName)).toBe(false)
  })

  it('is a no-op for a dish with no files', async () => {
    const dish = await makeDish()
    await expect(deleteAllFilesForDish(dish.id)).resolves.toBeUndefined()
  })
})

describe('deleting a dish', () => {
  it('leaves no file rows and no blobs behind', async () => {
    const dish = await makeDish()
    const added = await addFileToDish(dish.id, pdf(), 'combined.pdf', 'application/pdf')
    if (!added.ok) throw new Error('setup failed')

    const result = await deleteDish(dish.id)
    expect(result.deleted).toBe(true)

    expect(await db.select().from(dishFiles)).toEqual([])
    expect(onDisk(added.file.storedName)).toBe(false)
  })

  it('keeps files when the delete is refused because plan entries exist', async () => {
    const dish = await makeDish()
    const added = await addFileToDish(dish.id, pdf(), 'keep.pdf', 'application/pdf')
    if (!added.ok) throw new Error('setup failed')

    const { planEntries } = await import('../../server/database/schema')
    await db.insert(planEntries).values({
      date: '2026-01-01',
      mealType: 'dinner',
      entryKind: 'fresh',
      dishId: dish.id,
      createdAt: new Date().toISOString(),
    })

    const result = await deleteDish(dish.id)
    expect(result).toEqual({ deleted: false, hasPlanEntries: true })
    expect(await listFilesForDish(dish.id)).toHaveLength(1)
    expect(onDisk(added.file.storedName)).toBe(true)

    await db.delete(planEntries)
  })
})
