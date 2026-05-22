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
  freeFrom: ('gluten-free' | 'dairy-free' | 'nut-free' | 'shellfish-free' | 'egg-free' | 'soy-free' | 'peanut-free')[]
  season: ('spring' | 'summer' | 'fall' | 'winter')[]
  notes: string | null
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
  archived: boolean
  tags: Tag[]
  createdAt: string
  updatedAt: string
}
