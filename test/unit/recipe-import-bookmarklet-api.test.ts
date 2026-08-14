import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch, url } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const TEST_DB_PATH = '/tmp/recipe-import-bookmarklet-api-test.db'

if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
const _sqlite = new Database(TEST_DB_PATH)
migrate(drizzle(_sqlite), { migrationsFolder: 'server/database/migrations' })

beforeEach(() => {
  _sqlite.exec('DELETE FROM pending_recipe_imports')
})

process.env.DATABASE_URL = TEST_DB_PATH

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  browser: false,
})

const jsonLdHtml = `<html><head>
  <script type="application/ld+json">${JSON.stringify({
    '@type': 'Recipe',
    name: 'Bookmarklet Recipe',
    recipeIngredient: ['1 cup flour'],
  })}</script>
</head></html>`

describe('POST /api/recipe-import/bookmarklet', () => {
  it('parses posted html and returns an importId with CORS header', async () => {
    const response = await fetch(url('/api/recipe-import/bookmarklet'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/recipe', html: jsonLdHtml }),
    })
    const data = await response.json()
    expect(data).toMatchObject({ importId: expect.any(String) })
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('returns 204 with CORS header on OPTIONS', async () => {
    const response = await fetch(url('/api/recipe-import/bookmarklet'), { method: 'OPTIONS' })
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('returns 400 when html is missing', async () => {
    const response = await $fetch('/api/recipe-import/bookmarklet', {
      method: 'POST',
      body: { url: 'https://example.com/recipe' },
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })

  it('returns 422 when the html has no recognizable recipe data', async () => {
    const response = await $fetch('/api/recipe-import/bookmarklet', {
      method: 'POST',
      body: { url: 'https://example.com/empty', html: '<html><body>Nothing here.</body></html>' },
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })
})

describe('GET /api/recipe-import/pending/[id]', () => {
  it('returns the stored result and is idempotent across repeated reads', async () => {
    const { importId } = await $fetch<{ importId: string }>('/api/recipe-import/bookmarklet', {
      method: 'POST',
      body: { url: 'https://example.com/recipe', html: jsonLdHtml },
    })

    const first = await $fetch(`/api/recipe-import/pending/${importId}`)
    expect(first).toMatchObject({ name: 'Bookmarklet Recipe', ingredientTexts: ['1 cup flour'] })

    const second = await $fetch(`/api/recipe-import/pending/${importId}`)
    expect(second).toMatchObject({ name: 'Bookmarklet Recipe', ingredientTexts: ['1 cup flour'] })
  })

  it('returns 404 for an unknown id', async () => {
    const response = await $fetch('/api/recipe-import/pending/00000000-0000-0000-0000-000000000000', {
      ignoreResponseError: true,
    })
    expect(response).toMatchObject({ error: expect.any(String) })
  })
})
