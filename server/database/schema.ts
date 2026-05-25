import { integer, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { FreezerItemStatus } from '../../shared/types/freezer'

export const shoppingLists = sqliteTable('shopping_lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  dateRangeStart: text('dateRangeStart').notNull(),
  dateRangeEnd: text('dateRangeEnd').notNull(),
  isDone: integer('isDone').notNull().default(0),
  doneAt: text('doneAt'),
  createdAt: text('createdAt').notNull(),
})

export const shoppingListItems = sqliteTable('shopping_list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shoppingListId: integer('shoppingListId').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  canonicalIngredientId: integer('canonicalIngredientId').notNull().references(() => canonicalIngredients.id),
  sourceDishIds: text('sourceDishIds').notNull().default('[]'),
  rawTexts: text('rawTexts').notNull().default('[]'),
  checked: integer('checked').notNull().default(0),
}, (table) => [
  index('idx_shopping_list_items_list_id').on(table.shoppingListId),
])

export const canonicalIngredients = sqliteTable('canonical_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  walmartUrl: text('walmartUrl'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (table) => [
  index('idx_canonical_ingredients_name').on(table.name),
])

export const dishes = sqliteTable('dishes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  imageUrl: text('imageUrl'),
  imageLocalPath: text('imageLocalPath'),
  timeEstimateMinutes: integer('timeEstimateMinutes'),
  yieldServings: integer('yieldServings'),
  sourceUrl: text('sourceUrl'),
  sourceName: text('sourceName'),
  difficulty: text('difficulty'),
  freeFrom: text('freeFrom').notNull().default('[]'),
  season: text('season').notNull().default('[]'),
  notes: text('notes'),
  cooldownDays: integer('cooldownDays').notNull().default(7),
  targetIntervalDays: integer('targetIntervalDays').notNull().default(14),
  excludedFromSuggestions: integer('excludedFromSuggestions').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (table) => [
  index('idx_dishes_archived').on(table.archived),
])

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color'),
})

export const dishTags = sqliteTable('dish_tags', {
  dishId: integer('dishId').notNull().references(() => dishes.id, { onDelete: 'cascade' }),
  tagId: integer('tagId').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.dishId, table.tagId] }),
])

export const dishIngredients = sqliteTable('dish_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dishId: integer('dishId').notNull().references(() => dishes.id, { onDelete: 'cascade' }),
  canonicalIngredientId: integer('canonicalIngredientId').notNull().references(() => canonicalIngredients.id),
  rawText: text('rawText').notNull(),
  sortOrder: integer('sortOrder').notNull().default(0),
}, (table) => [
  index('idx_dish_ingredients_dish_id').on(table.dishId),
  index('idx_dish_ingredients_canonical_id').on(table.canonicalIngredientId),
])

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const planningSessions = sqliteTable('planning_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekStart: text('weekStart').notNull(),
  mealTypes: text('mealTypes').notNull().default('["dinner"]'),
  currentStep: integer('currentStep').notNull().default(1),
  slotStates: text('slotStates').notNull().default('{}'),
  removedPlanEntryIds: text('removedPlanEntryIds').notNull().default('[]'),
  pendingOneOffEntries: text('pendingOneOffEntries').notNull().default('[]'),
  sessionVirtualTags: text('sessionVirtualTags').notNull().default('[]'),
  pinnedTags: text('pinnedTags').notNull().default('[]'),
  wishlistTags: text('wishlistTags').notNull().default('[]'),
  draftPlan: text('draftPlan').notNull().default('{}'),
  shownDishIdsBySlot: text('shownDishIdsBySlot').notNull().default('{}'),
  leftoverToggles: text('leftoverToggles').notNull().default('{}'),
  status: text('status').notNull().default('in_progress'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const dishCooldowns = sqliteTable('dish_cooldowns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dishId: integer('dishId').notNull().references(() => dishes.id, { onDelete: 'cascade' }).unique(),
  endsAt: text('endsAt').notNull(),
  createdAt: text('createdAt').notNull(),
})

export const planEntries = sqliteTable('plan_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  mealType: text('mealType').notNull(),
  entryKind: text('entryKind').notNull().default('fresh'),
  dishId: integer('dishId').references(() => dishes.id),
  oneOffText: text('oneOffText'),
  guestCount: integer('guestCount').notNull().default(0),
  createdAt: text('createdAt').notNull(),
}, (table) => [
  index('idx_plan_entries_date').on(table.date),
  index('idx_plan_entries_dish_id').on(table.dishId),
  index('idx_plan_entries_dish_fresh').on(table.dishId, table.date).where(sql`entryKind = 'fresh'`),
])

export const freezers = sqliteTable('freezers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  lastAuditedAt: text('lastAuditedAt'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const freezerCategories = sqliteTable('freezer_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  defaultLifetimeDays: integer('defaultLifetimeDays').notNull(),
  isSystem: integer('isSystem').notNull().default(0),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const freezerItems = sqliteTable('freezer_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  freezerId: integer('freezerId').notNull().references(() => freezers.id),
  categoryId: integer('categoryId').notNull().references(() => freezerCategories.id),
  name: text('name').notNull(),
  notes: text('notes'),
  dishId: integer('dishId').references(() => dishes.id, { onDelete: 'set null' }),
  canonicalIngredientId: integer('canonicalIngredientId').references(() => canonicalIngredients.id, { onDelete: 'set null' }),
  addedAt: text('addedAt').notNull(),
  lifetimeDaysOverride: integer('lifetimeDaysOverride'),
  tossByDate: text('tossByDate').notNull(),
  targetUseDate: text('targetUseDate').notNull(),
  status: text('status').notNull().default('active').$type<FreezerItemStatus>(),
  statusChangedAt: text('statusChangedAt'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (table) => [
  index('idx_freezer_items_freezer_id').on(table.freezerId),
  index('idx_freezer_items_status').on(table.status),
  index('idx_freezer_items_toss_by').on(table.tossByDate).where(sql`status = 'active'`),
  index('idx_freezer_items_dish_id').on(table.dishId).where(sql`status = 'active' AND dishId IS NOT NULL`),
  index('idx_freezer_items_standalone').on(table.targetUseDate).where(sql`status = 'active' AND dishId IS NULL`),
])
