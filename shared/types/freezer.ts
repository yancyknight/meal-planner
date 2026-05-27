export interface Freezer {
  id: number
  name: string
  lastAuditedAt: string | null
  createdAt: string
  updatedAt: string
  activeItemCount?: number
}

export interface FreezerCategory {
  id: number
  name: string
  defaultLifetimeDays: number
  isSystem: number
  createdAt: string
  updatedAt: string
}

export type FreezerItemStatus = 'active' | 'used' | 'wasted'

export interface FreezerItem {
  id: number
  freezerId: number
  categoryId: number
  name: string
  notes: string | null
  dishId: number | null
  canonicalIngredientId: number | null
  addedAt: string
  lifetimeDaysOverride: number | null
  tossByDate: string
  targetUseDate: string
  eligibleForPlanning: number
  status: FreezerItemStatus
  statusChangedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FreezerItemWithRefs extends FreezerItem {
  freezer: Freezer
  category: FreezerCategory
}

export interface FreezerBucketGroup {
  freezer: Freezer
  items: FreezerItem[]
}

export interface FreezerDashboardPayload {
  expired: FreezerBucketGroup[]
  approaching: FreezerBucketGroup[]
  recentlyAdded: FreezerBucketGroup[]
}
