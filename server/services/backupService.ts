import fs from 'node:fs'
import path from 'node:path'
import { sqlite } from '../database'
import { getSettings } from './settingsService'

function getBackupDir(): string {
  return process.env.BACKUP_DIR ?? '/data/backups'
}

function getBackupFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-app\.db$/.test(f))
    .sort()
}

function parseFilenameTimestamp(filename: string): Date {
  // filename: YYYY-MM-DDTHH-mm-ss-app.db
  const base = filename.replace(/-app\.db$/, '')
  const dateStr = base.substring(0, 10)
  const timeStr = base.substring(11, 19).replace(/-/g, ':')
  return new Date(`${dateStr}T${timeStr}Z`)
}

export function pruneOldBackups(dir: string, retainCount: number): void {
  const files = getBackupFiles(dir)
  const deleteCount = files.length - retainCount
  if (deleteCount <= 0) return
  for (const f of files.slice(0, deleteCount)) {
    fs.unlinkSync(path.join(dir, f))
  }
}

export async function runBackup(): Promise<void> {
  const { backupIntervalHours, backupRetainCount } = await getSettings()
  const dir = getBackupDir()

  fs.mkdirSync(dir, { recursive: true })

  const files = getBackupFiles(dir)
  if (files.length > 0) {
    const newestTime = parseFilenameTimestamp(files[files.length - 1]!)
    const elapsed = Date.now() - newestTime.getTime()
    if (elapsed < backupIntervalHours * 3600 * 1000) {
      return
    }
  }

  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
  const dest = path.join(dir, `${ts}-app.db`)

  await sqlite.backup(dest)
  pruneOldBackups(dir, backupRetainCount)
}

export async function getStatus(): Promise<{
  lastBackup: string | null
  nextBackup: string | null
  backupCount: number
}> {
  const { backupIntervalHours } = await getSettings()
  const dir = getBackupDir()

  try {
    fs.mkdirSync(dir, { recursive: true })
    const files = getBackupFiles(dir)
    if (files.length === 0) {
      return { lastBackup: null, nextBackup: null, backupCount: 0 }
    }
    const lastBackupTime = parseFilenameTimestamp(files[files.length - 1]!)
    const nextBackupTime = new Date(lastBackupTime.getTime() + backupIntervalHours * 3600 * 1000)
    return {
      lastBackup: lastBackupTime.toISOString(),
      nextBackup: nextBackupTime.toISOString(),
      backupCount: files.length,
    }
  }
  catch {
    return { lastBackup: null, nextBackup: null, backupCount: 0 }
  }
}
