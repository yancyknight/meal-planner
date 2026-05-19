import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { randomUUID } from 'node:crypto'

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
}

function getImageDir(): string {
  return process.env.IMAGE_DIR ?? '/data/images'
}

export async function saveImage(buffer: Buffer, originalFilename: string): Promise<string> {
  const dir = getImageDir()
  await mkdir(dir, { recursive: true })

  const ext = extname(originalFilename).replace('.', '').toLowerCase() || 'jpg'
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(dir, filename), buffer)
  return filename
}

export async function readImageFile(filename: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const dir = getImageDir()
  const filepath = join(dir, basename(filename))
  const buffer = await readFile(filepath)
  const ext = extname(filename).replace('.', '').toLowerCase()
  const mimeType = MIME_MAP[ext] ?? 'application/octet-stream'
  return { buffer, mimeType }
}
