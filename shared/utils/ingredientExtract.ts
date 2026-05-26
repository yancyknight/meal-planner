// Matches: mixed number (1 1/2), fraction (1/4), integer/decimal (1, 0.5)
// followed by an optional range "to <number>"
const NUMBER = '(?:(?:\\d+\\s+)?\\d+\\/\\d+|\\d+(?:\\.\\d+)?)'
const QUANTITY_RE = new RegExp(`^\\s*${NUMBER}(?:\\s+to\\s+${NUMBER})?\\s*`, 'i')

const UNITS = [
  'teaspoons?', 'tsp\\.?',
  'tablespoons?', 'tbsp\\.?',
  'fluid ounces?', 'fl\\.? oz\\.?',
  'ounces?', 'oz\\.?',
  'pounds?', 'lbs?\\.?',
  'cups?',
  'cloves?',
  'pinch(?:es)?',
  'dash(?:es)?',
  'cans?',
  'bunches?',
  'slices?',
  'pieces?',
  'sprigs?',
  'sticks?',
  'packages?', 'pkgs?\\.?',
  'heads?',
  'stalks?',
  'links?',
  'quarts?', 'qt\\.?',
  'pints?', 'pt\\.?',
  'gallons?', 'gal\\.?',
  'liters?', 'l\\.?',
  'milliliters?', 'ml\\.?',
  'grams?', 'g\\.?',
  'kilograms?', 'kg\\.?',
]

const UNIT_RE = new RegExp(`^(?:${UNITS.join('|')})\\s+`, 'i')

const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4', '½': '1/2', '¾': '3/4',
  '⅓': '1/3', '⅔': '2/3',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

function normalizeUnicodeFractions(s: string): string {
  return s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (ch, offset) => {
    const ascii = UNICODE_FRACTIONS[ch] ?? ''
    // "1½" → "1 1/2" (insert space when preceded by a digit)
    return offset > 0 && /\d/.test(s.charAt(offset - 1)) ? ` ${ascii}` : ascii
  })
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

export function extractIngredientName(raw: string): string {
  let s = normalizeUnicodeFractions(raw.trim())

  // Strip parenthesized content anywhere in the string
  s = s.replace(/\s*\([^)]*\)/g, '')

  // Strip leading quantity (e.g. "1 1/2", "1 to 1 1/2", "3", "0.5")
  s = s.replace(QUANTITY_RE, '')

  // Strip leading unit
  s = s.replace(UNIT_RE, '')

  // Strip trailing comma-prep clause (", minced" / ", finely chopped" etc.)
  s = s.replace(/,.*$/, '')

  s = s.trim()

  if (!s) return raw.trim()

  return titleCase(s)
}
