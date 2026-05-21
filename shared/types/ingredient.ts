export interface CanonicalIngredient {
  id: number
  name: string
  walmartUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface DishIngredient {
  id: number
  dishId: number
  canonicalIngredientId: number
  rawText: string
  sortOrder: number
  canonical: CanonicalIngredient
}

export interface FuzzyMatch {
  canonical: CanonicalIngredient
  score: number
}

// A row in the ingredient editor — canonical link is optional (unlinked rows auto-resolve on save)
export interface IngredientRowValue {
  rawText: string
  canonicalIngredientId: number | null
  canonicalName?: string
}
