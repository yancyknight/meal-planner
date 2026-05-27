export type { MealType } from './planEntry'

export type SlotState = 'plan' | 'skip' | 'one-off' | 'keep'

export type TagRef =
  | { kind: 'real'; tagId: number }
  | { kind: 'virtual'; id: string }

export interface PinnedTag {
  date: string
  mealType: MealType
  tagRef: TagRef
}

export interface PendingOneOffEntry {
  date: string
  mealType: MealType
  text: string
}

export interface DraftSlot {
  kind: 'dish' | 'leftover-suggestion' | 'standalone-freezer'
  dishId: number
  freezerItemId?: number
  oneOffText?: string
  isManualOverride?: boolean
  warningLabels?: string[]
  wishlistTag?: number
  leftoverFor?: string
}

export interface PlanningSession {
  id: number
  weekStart: string
  mealTypes: MealType[]
  currentStep: 1 | 2 | 3 | 4
  slotStates: Record<string, SlotState>
  removedPlanEntryIds: number[]
  pendingOneOffEntries: PendingOneOffEntry[]
  sessionVirtualTags: string[]
  pinnedTags: PinnedTag[]
  wishlistTags: number[]
  draftPlan: Record<string, DraftSlot>
  shownDishIdsBySlot: Record<string, number[]>
  leftoverToggles: Record<string, boolean>
  status: 'in_progress' | 'finalizing'
  createdAt: string
  updatedAt: string
}
