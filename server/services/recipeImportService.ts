import type { RecipeImportResult } from '../../shared/types/recipeImport'

function parseIso8601Duration(duration: unknown): number | null {
  if (typeof duration !== 'string') return null
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return null
  const hours = parseInt(match[1] ?? '0', 10)
  const minutes = parseInt(match[2] ?? '0', 10)
  const total = hours * 60 + minutes
  return total > 0 ? total : null
}

function parseYield(yieldVal: unknown): number | null {
  if (typeof yieldVal === 'number') return Math.round(yieldVal) || null
  if (Array.isArray(yieldVal)) return parseYield(yieldVal[0])
  if (typeof yieldVal === 'string') {
    const match = yieldVal.match(/\d+/)
    return match ? parseInt(match[0], 10) : null
  }
  return null
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return null
  }
}

function extractImageUrl(img: unknown): string | null {
  if (typeof img === 'string') return img
  if (Array.isArray(img)) return extractImageUrl(img[0])
  if (img && typeof img === 'object' && 'url' in img && typeof (img as Record<string, unknown>).url === 'string') {
    return (img as { url: string }).url
  }
  return null
}

function extractJsonLd(html: string, url: string): RecipeImportResult | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(scriptPattern)) {
    let data: unknown
    try {
      data = JSON.parse(match[1]!)
    }
    catch {
      continue
    }

    const candidates: unknown[] = []
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>
      if (obj['@type'] === 'Recipe') {
        candidates.push(obj)
      }
      else if (Array.isArray(obj['@graph'])) {
        for (const item of obj['@graph'] as unknown[]) {
          if (item && typeof item === 'object' && (item as Record<string, unknown>)['@type'] === 'Recipe') {
            candidates.push(item)
          }
        }
      }
    }
    else if (Array.isArray(data)) {
      for (const item of data) {
        if (item && typeof item === 'object' && (item as Record<string, unknown>)['@type'] === 'Recipe') {
          candidates.push(item)
        }
      }
    }

    if (candidates.length === 0) continue

    const recipe = candidates[0] as Record<string, unknown>
    const name = typeof recipe['name'] === 'string' ? recipe['name'].trim() : null
    if (!name) continue

    const ingredientTexts: string[] = []
    if (Array.isArray(recipe['recipeIngredient'])) {
      for (const ing of recipe['recipeIngredient']) {
        if (typeof ing === 'string' && ing.trim()) ingredientTexts.push(ing.trim())
      }
    }

    let timeMinutes = parseIso8601Duration(recipe['totalTime'])
    if (!timeMinutes) {
      const prep = parseIso8601Duration(recipe['prepTime']) ?? 0
      const cook = parseIso8601Duration(recipe['cookTime']) ?? 0
      timeMinutes = prep + cook || null
    }

    return {
      name,
      imageUrl: extractImageUrl(recipe['image']),
      timeEstimateMinutes: timeMinutes,
      yieldServings: parseYield(recipe['recipeYield']),
      sourceUrl: url,
      sourceName: extractDomain(url),
      ingredientTexts,
    }
  }
  return null
}

function getMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]!
  }
  return null
}

function extractOg(html: string, url: string): RecipeImportResult | null {
  const title = getMeta(html, 'og:title')
  if (!title) return null
  return {
    name: title.trim(),
    imageUrl: getMeta(html, 'og:image'),
    timeEstimateMinutes: null,
    yieldServings: null,
    sourceUrl: url,
    sourceName: getMeta(html, 'og:site_name') ?? extractDomain(url),
    ingredientTexts: [],
  }
}

function extractHeuristic(html: string, url: string): RecipeImportResult | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const name = titleMatch ? titleMatch[1]!.trim() : null
  if (!name) return null

  let ingredientTexts: string[] = []
  for (const listMatch of html.matchAll(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi)) {
    const items: string[] = []
    for (const liMatch of listMatch[1]!.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const text = liMatch[1]!.replace(/<[^>]+>/g, '').trim()
      if (text.length > 0 && text.length < 200) items.push(text)
    }
    if (items.length >= 3 && items.reduce((s, i) => s + i.length, 0) / items.length < 80) {
      ingredientTexts = items
      break
    }
  }

  return {
    name,
    imageUrl: null,
    timeEstimateMinutes: null,
    yieldServings: null,
    sourceUrl: url,
    sourceName: extractDomain(url),
    ingredientTexts,
  }
}

export async function importFromUrl(url: string): Promise<RecipeImportResult> {
  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPlannerBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    html = await response.text()
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    throw new Error(`Could not fetch the recipe page: ${msg}`)
  }

  const result = extractJsonLd(html, url) ?? extractOg(html, url) ?? extractHeuristic(html, url)
  if (!result) throw new Error('No recipe data found on that page')
  return result
}
