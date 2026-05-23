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

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

export function extractIngredientName(raw: string): string {
  let s = raw.trim()

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
