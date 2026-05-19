import type { Tag } from './tag'

export interface Dish {
  id: number
  name: string
  imageUrl: string | null
  imageLocalPath: string | null
  timeEstimateMinutes: number | null
  yieldServings: number | null
  sourceUrl: string | null
  sourceName: string | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  allergens: string[]
  season: ('spring' | 'summer' | 'fall' | 'winter')[]
  notes: string | null
  weight: number
  minIntervalDays: number | null
  archived: boolean
  tags: Tag[]
  createdAt: string
  updatedAt: string
}
