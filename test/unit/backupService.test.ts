import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { runBackup, pruneOldBackups, getStatus } from '../../server/services/backupService'

vi.mock('../../server/database/index', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('../../server/database/schema')

  const sqliteDb = new Database(':memory:')
  sqliteDb.pragma('foreign_keys = ON')
  const db = drizzle(sqliteDb, { schema })
  migrate(db, { migrationsFolder: 'server/database/migrations' })

  const { writeFileSync } = await import('node:fs')
  const sqlite = {
    backup: vi.fn().mockImplementation(async (dest: string) => {
      writeFileSync(dest, 'backup-placeholder')
    }),
  }

  return { db, sqlite }
})

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'))
  process.env.BACKUP_DIR = tmpDir
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  delete process.env.BACKUP_DIR
})

describe('pruneOldBackups', () => {
  it('deletes the oldest files beyond the retain count', () => {
    const files = [
      '2026-01-01T00-00-00-app.db',
      '2026-01-02T00-00-00-app.db',
      '2026-01-03T00-00-00-app.db',
      '2026-01-04T00-00-00-app.db',
      '2026-01-05T00-00-00-app.db',
    ]
    for (const f of files) fs.writeFileSync(path.join(tmpDir, f), 'x')

    pruneOldBackups(tmpDir, 3)

    const remaining = fs.readdirSync(tmpDir).sort()
    expect(remaining).toHaveLength(3)
    expect(remaining).toEqual([
      '2026-01-03T00-00-00-app.db',
      '2026-01-04T00-00-00-app.db',
      '2026-01-05T00-00-00-app.db',
    ])
  })

  it('does nothing when file count is at or below retain limit', () => {
    const files = ['2026-01-01T00-00-00-app.db', '2026-01-02T00-00-00-app.db']
    for (const f of files) fs.writeFileSync(path.join(tmpDir, f), 'x')

    pruneOldBackups(tmpDir, 3)

    expect(fs.readdirSync(tmpDir)).toHaveLength(2)
  })

  it('deletes all when retain count is zero', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-01-01T00-00-00-app.db'), 'x')

    pruneOldBackups(tmpDir, 0)

    expect(fs.readdirSync(tmpDir)).toHaveLength(0)
  })
})

describe('runBackup', () => {
  it('creates a backup file with correct timestamp filename format', async () => {
    await runBackup()

    const files = fs.readdirSync(tmpDir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-app\.db$/)
  })

  it('auto-creates BACKUP_DIR when it does not exist', async () => {
    const subDir = path.join(tmpDir, 'auto-created')
    process.env.BACKUP_DIR = subDir

    await runBackup()

    expect(fs.existsSync(subDir)).toBe(true)
    expect(fs.readdirSync(subDir)).toHaveLength(1)
  })

  it('skips backup when last backup is within the interval', async () => {
    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
    fs.writeFileSync(path.join(tmpDir, `${ts}-app.db`), 'existing')

    await runBackup()

    expect(fs.readdirSync(tmpDir)).toHaveLength(1)
  })

  it('runs backup when last backup is older than the interval', async () => {
    // Timestamp 25 hours in the past
    const old = new Date(Date.now() - 25 * 3600 * 1000)
    const ts = old.toISOString().replace(/:/g, '-').replace(/\..+/, '')
    fs.writeFileSync(path.join(tmpDir, `${ts}-app.db`), 'old')

    await runBackup()

    expect(fs.readdirSync(tmpDir)).toHaveLength(2)
  })
})

describe('getStatus', () => {
  it('returns nulls and zero count when no backups exist', async () => {
    const status = await getStatus()

    expect(status.lastBackup).toBeNull()
    expect(status.nextBackup).toBeNull()
    expect(status.backupCount).toBe(0)
  })

  it('returns last backup timestamp and count from existing files', async () => {
    const files = [
      '2026-01-01T00-00-00-app.db',
      '2026-01-02T00-00-00-app.db',
    ]
    for (const f of files) fs.writeFileSync(path.join(tmpDir, f), 'x')

    const status = await getStatus()

    expect(status.backupCount).toBe(2)
    expect(status.lastBackup).toBe('2026-01-02T00:00:00.000Z')
    expect(status.nextBackup).not.toBeNull()
  })

  it('nextBackup is lastBackup + backupIntervalHours', async () => {
    fs.writeFileSync(path.join(tmpDir, '2026-06-01T12-00-00-app.db'), 'x')

    const status = await getStatus()

    expect(status.lastBackup).toBe('2026-06-01T12:00:00.000Z')
    // Default interval is 24h
    expect(status.nextBackup).toBe('2026-06-02T12:00:00.000Z')
  })
})
