import { randomUUID } from 'node:crypto'
import { eq, lt } from 'drizzle-orm'
import { db } from '../database'
import { pendingRecipeImports } from '../database/schema'
import type { RecipeImportResult } from '../../shared/types/recipeImport'

const TTL_MS = 30 * 60 * 1000

export async function create(result: RecipeImportResult): Promise<string> {
  const id = randomUUID()
  await db.insert(pendingRecipeImports).values({
    id,
    resultJson: JSON.stringify(result),
    createdAt: new Date().toISOString(),
  })
  return id
}

// Idempotent within the TTL window (not single-use): Nuxt's vue-query setup here has no
// SSR dehydration/hydration wiring, so a page load fires this query once server-side
// during SSR and again client-side after hydration. A single-use claim would have the
// SSR-side fetch silently consume the import before the client ever saw it.
export async function get(id: string): Promise<RecipeImportResult | null> {
  const rows = await db
    .select()
    .from(pendingRecipeImports)
    .where(eq(pendingRecipeImports.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (new Date(row.createdAt).getTime() < Date.now() - TTL_MS) return null
  return JSON.parse(row.resultJson) as RecipeImportResult
}

export async function cleanupExpired(): Promise<number> {
  const cutoff = new Date(Date.now() - TTL_MS).toISOString()
  const deleted = await db
    .delete(pendingRecipeImports)
    .where(lt(pendingRecipeImports.createdAt, cutoff))
    .returning({ id: pendingRecipeImports.id })
  return deleted.length
}
