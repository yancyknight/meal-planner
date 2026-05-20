import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importFromUrl } from '../../server/services/recipeImportService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeResponse(body: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  })
}

function jsonLdHtml(recipe: Record<string, unknown>): string {
  return `<html><head>
    <title>Test Recipe</title>
    <script type="application/ld+json">${JSON.stringify(recipe)}<\/script>
  </head><body></body></html>`
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('importFromUrl — JSON-LD parsing', () => {
  it('extracts all fields from a Recipe schema', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Spaghetti Carbonara',
      image: 'https://example.com/img.jpg',
      totalTime: 'PT30M',
      recipeYield: '4 servings',
      recipeIngredient: ['200g spaghetti', '4 eggs', '100g pancetta'],
    })))

    const result = await importFromUrl('https://example.com/carbonara')
    expect(result.name).toBe('Spaghetti Carbonara')
    expect(result.imageUrl).toBe('https://example.com/img.jpg')
    expect(result.timeEstimateMinutes).toBe(30)
    expect(result.yieldServings).toBe(4)
    expect(result.sourceUrl).toBe('https://example.com/carbonara')
    expect(result.sourceName).toBe('example.com')
    expect(result.ingredientTexts).toEqual(['200g spaghetti', '4 eggs', '100g pancetta'])
  })

  it('combines prepTime + cookTime when totalTime is absent', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Test',
      prepTime: 'PT15M',
      cookTime: 'PT45M',
    })))

    const result = await importFromUrl('https://example.com/test')
    expect(result.timeEstimateMinutes).toBe(60)
  })

  it('handles time with hours and minutes', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Test',
      totalTime: 'PT1H30M',
    })))

    const result = await importFromUrl('https://example.com/test')
    expect(result.timeEstimateMinutes).toBe(90)
  })

  it('parses numeric recipeYield', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Test',
      recipeYield: 6,
    })))

    const result = await importFromUrl('https://example.com/test')
    expect(result.yieldServings).toBe(6)
  })

  it('finds Recipe inside @graph', async () => {
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: 'Page' },
          { '@type': 'Recipe', name: 'Graph Recipe', recipeIngredient: ['1 cup flour'] },
        ],
      })}<\/script>
    </head></html>`))

    const result = await importFromUrl('https://example.com/test')
    expect(result.name).toBe('Graph Recipe')
    expect(result.ingredientTexts).toEqual(['1 cup flour'])
  })

  it('handles image as array', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Test',
      image: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    })))

    const result = await importFromUrl('https://example.com/test')
    expect(result.imageUrl).toBe('https://example.com/img1.jpg')
  })

  it('handles image as object with url property', async () => {
    mockFetch.mockReturnValue(makeResponse(jsonLdHtml({
      '@type': 'Recipe',
      name: 'Test',
      image: { '@type': 'ImageObject', url: 'https://example.com/img.jpg' },
    })))

    const result = await importFromUrl('https://example.com/test')
    expect(result.imageUrl).toBe('https://example.com/img.jpg')
  })

  it('skips malformed JSON-LD and continues', async () => {
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <script type="application/ld+json">NOT VALID JSON<\/script>
      <meta property="og:title" content="OG Fallback" />
    </head></html>`))

    const result = await importFromUrl('https://example.com/test')
    expect(result.name).toBe('OG Fallback')
  })
})

describe('importFromUrl — OG fallback', () => {
  it('extracts name and image from Open Graph tags', async () => {
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <meta property="og:title" content="Chicken Tikka Masala" />
      <meta property="og:image" content="https://example.com/tikka.jpg" />
      <meta property="og:site_name" content="Food Network" />
    </head></html>`))

    const result = await importFromUrl('https://example.com/tikka')
    expect(result.name).toBe('Chicken Tikka Masala')
    expect(result.imageUrl).toBe('https://example.com/tikka.jpg')
    expect(result.sourceName).toBe('Food Network')
    expect(result.ingredientTexts).toEqual([])
    expect(result.timeEstimateMinutes).toBeNull()
  })

  it('falls back to domain when og:site_name is absent', async () => {
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <meta property="og:title" content="Something" />
    </head></html>`))

    const result = await importFromUrl('https://www.mysite.com/recipe')
    expect(result.sourceName).toBe('mysite.com')
  })
})

describe('importFromUrl — HTML heuristic fallback', () => {
  it('extracts name from title tag and ingredients from a short list', async () => {
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <title>Classic Hummus Recipe</title>
    </head><body>
      <ul>
        <li>1 can chickpeas</li>
        <li>2 tbsp tahini</li>
        <li>1 lemon, juiced</li>
        <li>2 cloves garlic</li>
      </ul>
    </body></html>`))

    const result = await importFromUrl('https://example.com/hummus')
    expect(result.name).toBe('Classic Hummus Recipe')
    expect(result.ingredientTexts).toContain('1 can chickpeas')
    expect(result.ingredientTexts).toHaveLength(4)
  })

  it('ignores long paragraph lists and falls back to empty ingredients', async () => {
    const longItems = Array.from({ length: 5 }, () => 'x'.repeat(100)).map(t => `<li>${t}</li>`).join('')
    mockFetch.mockReturnValue(makeResponse(`<html><head>
      <title>Some Page</title>
    </head><body><ul>${longItems}</ul></body></html>`))

    const result = await importFromUrl('https://example.com/page')
    expect(result.ingredientTexts).toEqual([])
  })
})

describe('importFromUrl — error handling', () => {
  it('throws when fetch returns non-200', async () => {
    mockFetch.mockReturnValue(makeResponse('Not Found', 404))

    await expect(importFromUrl('https://example.com/missing')).rejects.toThrow('HTTP 404')
  })

  it('throws when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(importFromUrl('https://example.com/down')).rejects.toThrow('Could not fetch the recipe page')
  })

  it('throws when page has no usable data', async () => {
    mockFetch.mockReturnValue(makeResponse('<html><body>No structured data here.</body></html>'))

    await expect(importFromUrl('https://example.com/empty')).rejects.toThrow('No recipe data found')
  })
})
