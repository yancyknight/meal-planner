import { describe, it, expect } from 'vitest'
import { parseIngredientListText } from '../../shared/utils/parseIngredientList'

describe('parseIngredientListText', () => {
  it('splits plain lines', () => {
    expect(parseIngredientListText('2 cups flour\n1 tsp salt\n3 eggs')).toEqual([
      '2 cups flour',
      '1 tsp salt',
      '3 eggs',
    ])
  })

  it('drops blank lines', () => {
    expect(parseIngredientListText('2 cups flour\n\n\n1 tsp salt')).toEqual([
      '2 cups flour',
      '1 tsp salt',
    ])
  })

  it('strips hyphen and bullet markers', () => {
    expect(parseIngredientListText('- 2 cups flour\n* 1 tsp salt\n• 3 eggs\n● 1 onion\n▪ 1 clove garlic')).toEqual([
      '2 cups flour',
      '1 tsp salt',
      '3 eggs',
      '1 onion',
      '1 clove garlic',
    ])
  })

  it('strips numbered list markers', () => {
    expect(parseIngredientListText('1. 2 cups flour\n2) 1 tsp salt')).toEqual([
      '2 cups flour',
      '1 tsp salt',
    ])
  })

  it('drops bare section headers', () => {
    expect(parseIngredientListText('Ingredients:\n2 cups flour\nFor the topping:\n1/2 cup butter')).toEqual([
      '2 cups flour',
      '1/2 cup butter',
    ])
  })

  it('does not drop lines that merely contain a colon with content', () => {
    expect(parseIngredientListText('Salt: to taste')).toEqual(['Salt: to taste'])
  })

  it('trims surrounding whitespace', () => {
    expect(parseIngredientListText('   2 cups flour   \n  1 tsp salt  ')).toEqual([
      '2 cups flour',
      '1 tsp salt',
    ])
  })

  it('handles CRLF line endings', () => {
    expect(parseIngredientListText('2 cups flour\r\n1 tsp salt\r\n')).toEqual([
      '2 cups flour',
      '1 tsp salt',
    ])
  })

  it('returns an empty array for blank input', () => {
    expect(parseIngredientListText('   \n\n  ')).toEqual([])
  })

  it('preserves a single-line paste', () => {
    expect(parseIngredientListText('2 cups flour')).toEqual(['2 cups flour'])
  })
})
