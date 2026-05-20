import { integer, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

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
  allergens: text('allergens').notNull().default('[]'),
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
