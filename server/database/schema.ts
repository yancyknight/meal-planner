import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

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
