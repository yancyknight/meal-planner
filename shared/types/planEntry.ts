export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'uncategorized'
export type EntryKind = 'fresh' | 'leftover' | 'one-off'

export interface PlanEntry {
  id: number
  date: string
  mealType: MealType
  entryKind: EntryKind
  dishId: number | null
  dishName: string | null
  dishImageLocalPath: string | null
  dishImageUrl: string | null
  dishYieldServings: number | null
  oneOffText: string | null
  freezerItemId: number | null
  guestCount: number
  createdAt: string
}
