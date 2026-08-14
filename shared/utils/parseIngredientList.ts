// Strips leading list markers: "-", "*", "•", "●", "▪", "○", "1.", "1)"
const BULLET_RE = /^\s*(?:[-*•●▪○]|\d+[.)])\s+/

// A bare section label with no measurement, e.g. "Ingredients:" or "For the sauce:"
const SECTION_HEADER_RE = /^[a-z][a-z\s]*:$/i

/**
 * Splits a block of pasted text (e.g. copied from a recipe site or note) into
 * individual ingredient lines, one per row. Strips bullet/number markers and
 * drops blank lines and bare section headers.
 */
export function parseIngredientListText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(BULLET_RE, '').trim())
    .filter((line) => {
      if (!line) return false
      if (SECTION_HEADER_RE.test(line) && line.split(/\s+/).length <= 4) return false
      return true
    })
}
