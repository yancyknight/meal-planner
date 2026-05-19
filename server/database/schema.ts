import { integer, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core'

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
  weight: integer('weight').notNull().default(50),
  minIntervalDays: integer('minIntervalDays'),
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
