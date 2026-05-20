export interface RecipeImportResult {
  name: string
  imageUrl: string | null
  timeEstimateMinutes: number | null
  yieldServings: number | null
  sourceUrl: string
  sourceName: string | null
  ingredientTexts: string[]
}
