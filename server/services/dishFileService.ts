import { eq, desc } from 'drizzle-orm'
import { db } from '../database'
import { dishFiles, dishes } from '../database/schema'
import type { DishFile } from '../../shared/types/dishFile'
import { isAllowedUpload, uploadedFileMetaSchema } from '../../shared/schemas/dishFile'
import { saveFile, deleteStoredFile, readStoredFile, getMaxUploadBytes } from './fileService'

export type AddFileFailure = 'dish-not-found' | 'type-not-allowed' | 'too-large' | 'invalid-metadata'

export type AddFileResult =
  | { ok: true; file: DishFile }
  | { ok: false; reason: AddFileFailure }

export async function listFilesForDish(dishId: number): Promise<DishFile[]> {
  return db
    .select()
    .from(dishFiles)
    .where(eq(dishFiles.dishId, dishId))
    .orderBy(desc(dishFiles.createdAt), desc(dishFiles.id))
}

export async function getDishFile(id: number): Promise<DishFile | null> {
  const rows = await db.select().from(dishFiles).where(eq(dishFiles.id, id)).limit(1)
  return rows[0] ?? null
}

export async function readDishFileContents(file: DishFile): Promise<Buffer> {
  return readStoredFile(file.storedName)
}

export async function addFileToDish(
  dishId: number,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<AddFileResult> {
  const dish = await db.select({ id: dishes.id }).from(dishes).where(eq(dishes.id, dishId)).limit(1)
  if (dish.length === 0) return { ok: false, reason: 'dish-not-found' }

  const meta = uploadedFileMetaSchema.safeParse({
    originalName,
    mimeType,
    sizeBytes: buffer.byteLength,
  })
  if (!meta.success) return { ok: false, reason: 'invalid-metadata' }

  if (!isAllowedUpload(meta.data.mimeType, meta.data.originalName)) {
    return { ok: false, reason: 'type-not-allowed' }
  }
  if (meta.data.sizeBytes > getMaxUploadBytes()) {
    return { ok: false, reason: 'too-large' }
  }

  const storedName = await saveFile(buffer, meta.data.originalName)
  try {
    const rows = await db
      .insert(dishFiles)
      .values({
        dishId,
        storedName,
        originalName: meta.data.originalName,
        mimeType: meta.data.mimeType,
        sizeBytes: meta.data.sizeBytes,
        createdAt: new Date().toISOString(),
      })
      .returning()
    return { ok: true, file: rows[0]! }
  }
  catch (err) {
    // Never leave a blob on disk with no row pointing at it.
    await deleteStoredFile(storedName)
    throw err
  }
}

export async function deleteDishFile(id: number): Promise<boolean> {
  const file = await getDishFile(id)
  if (!file) return false
  await db.delete(dishFiles).where(eq(dishFiles.id, id))
  await deleteStoredFile(file.storedName)
  return true
}

/**
 * Removes every file belonging to a dish, blobs included. Called before the dish
 * row is deleted — the FK cascade clears the rows but knows nothing about disk.
 */
export async function deleteAllFilesForDish(dishId: number): Promise<void> {
  const files = await listFilesForDish(dishId)
  if (files.length === 0) return
  await db.delete(dishFiles).where(eq(dishFiles.dishId, dishId))
  await Promise.all(files.map(f => deleteStoredFile(f.storedName)))
}
