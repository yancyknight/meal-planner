import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DEFAULT_MAX_UPLOAD_MB } from '../../shared/schemas/dishFile'

export function getFileDir(): string {
  return process.env.FILE_DIR ?? '/data/files'
}

/** Server-side upload ceiling. MAX_UPLOAD_MB overrides the shared default. */
export function getMaxUploadBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_MB)
  const mb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_MB
  return Math.floor(mb * 1024 * 1024)
}

/** Writes the buffer under a generated name and returns that stored name. */
export async function saveFile(buffer: Buffer, originalFilename: string): Promise<string> {
  const dir = getFileDir()
  await mkdir(dir, { recursive: true })

  const ext = extname(originalFilename).replace('.', '').toLowerCase()
  const storedName = ext ? `${randomUUID()}.${ext}` : randomUUID()
  await writeFile(join(dir, storedName), buffer)
  return storedName
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  return readFile(join(getFileDir(), basename(storedName)))
}

/** Removes a stored file. A file that is already gone is not an error. */
export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await unlink(join(getFileDir(), basename(storedName)))
  }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
