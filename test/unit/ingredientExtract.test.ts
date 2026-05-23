import { describe, it, expect } from 'vitest'
import { extractIngredientName } from '../../shared/utils/ingredientExtract'

describe('extractIngredientName', () => {
  // Issue #37 examples
  it('strips teaspoon + quantity', () => {
    expect(extractIngredientName('1 teaspoon Worcestershire sauce')).toBe('Worcestershire Sauce')
  })

  it('strips fraction + teaspoon', () => {
    expect(extractIngredientName('1/4 teaspoon sweet or smoked paprika')).toBe('Sweet Or Smoked Paprika')
  })

  it('strips mixed number + teaspoons', () => {
    expect(extractIngredientName('1 1/2 teaspoons coarse salt')).toBe('Coarse Salt')
  })

  it('strips range + pounds', () => {
    expect(extractIngredientName('1 to 1 1/2 pounds lean ground beef')).toBe('Lean Ground Beef')
  })

  // Edge cases
  it('passes through plain ingredient with no quantity', () => {
    expect(extractIngredientName('garlic')).toBe('Garlic')
  })

  it('passes through already-clean title-cased name', () => {
    expect(extractIngredientName('Ground Beef')).toBe('Ground Beef')
  })

  it('strips trailing comma-prep clause', () => {
    expect(extractIngredientName('garlic, minced')).toBe('Garlic')
  })

  it('falls back to original when extraction yields nothing', () => {
    expect(extractIngredientName('2')).toBe('2')
  })

  it('handles decimal quantities', () => {
    expect(extractIngredientName('0.5 cups flour')).toBe('Flour')
  })

  it('strips tablespoon abbreviation', () => {
    expect(extractIngredientName('2 tbsp olive oil')).toBe('Olive Oil')
  })

  it('strips cup', () => {
    expect(extractIngredientName('3 cups chicken broth')).toBe('Chicken Broth')
  })

  it('strips ounces', () => {
    expect(extractIngredientName('8 ounces cream cheese')).toBe('Cream Cheese')
  })

  it('handles extra whitespace', () => {
    expect(extractIngredientName('  2   cloves   garlic  ')).toBe('Garlic')
  })

  // Unicode fractions
  it('strips unicode fraction ½ + unit', () => {
    expect(extractIngredientName('½ cup extra virgin olive oil')).toBe('Extra Virgin Olive Oil')
  })

  it('strips unicode fraction ¼ + unit', () => {
    expect(extractIngredientName('¼ teaspoon pepper')).toBe('Pepper')
  })

  it('strips unicode fraction ¾ + unit', () => {
    expect(extractIngredientName('¾ cup milk')).toBe('Milk')
  })

  it('handles integer followed by unicode fraction (1½)', () => {
    expect(extractIngredientName('1½ cups flour')).toBe('Flour')
  })

  // Parenthesized content
  it('strips parenthesized content', () => {
    expect(extractIngredientName('creamy balsamic dressing (store bought OR see recipe below)')).toBe('Creamy Balsamic Dressing')
  })

  it('strips parenthesized prep note inline', () => {
    expect(extractIngredientName('butter (softened)')).toBe('Butter')
  })

  it('strips parens and quantity together', () => {
    expect(extractIngredientName('2 tablespoons olive oil (extra virgin)')).toBe('Olive Oil')
  })
})
