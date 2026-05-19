# Data Model

Drizzle ORM schema. SQLite with WAL mode. See `server/database/schema.ts` for the authoritative
implementation — this document describes intent and field semantics.

---

## Tables

### `dishes`

The core dish library. One row per saved dish template.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL | |
| `imageUrl` | text | nullable | External image URL (from import or manual) |
| `imageLocalPath` | text | nullable | Path relative to IMAGE_DIR. Takes display precedence over imageUrl. |
| `timeEstimateMinutes` | integer | nullable | |
| `yieldServings` | integer | nullable | Used for leftover calculation |
| `sourceUrl` | text | nullable | Link to original recipe |
| `sourceName` | text | nullable | Website or cookbook name |
| `difficulty` | text | nullable | 'easy' \| 'medium' \| 'hard' |
| `allergens` | text | NOT NULL, DEFAULT '[]' | JSON string[]. Presets + freeform. |
| `season` | text | NOT NULL, DEFAULT '[]' | JSON string[]. 'spring' \| 'summer' \| 'fall' \| 'winter'. Empty = year-round. |
| `notes` | text | nullable | |
| `weight` | integer | NOT NULL, DEFAULT 50 | 0–100. Planning suggestion probability. |
| `minIntervalDays` | integer | nullable | Minimum days since the dish was last made before it is eligible for planning suggestions again. |
| `archived` | integer | NOT NULL, DEFAULT 0 | Boolean (0/1) |
| `createdAt` | text | NOT NULL | ISO 8601 |
| `updatedAt` | text | NOT NULL | ISO 8601 |

### `canonical_ingredients`

Deduplicated global ingredient reference. All dish ingredients link here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL, UNIQUE | Display name (e.g. "Garlic") |
| `walmartUrl` | text | nullable | Manually entered Walmart product page URL |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

### `dish_ingredients`

The raw ingredient entries on each dish, linked to a canonical.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `dishId` | integer | NOT NULL, FK → dishes.id, CASCADE DELETE | |
| `canonicalIngredientId` | integer | NOT NULL, FK → canonical_ingredients.id | |
| `rawText` | text | NOT NULL | Full raw string, e.g. "3 cloves garlic, minced" |
| `sortOrder` | integer | NOT NULL, DEFAULT 0 | Display order within the dish |

### `tags`

Global tag list, shared across all dishes.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL, UNIQUE | Case-insensitive unique enforced in application |
| `color` | text | nullable | Hex color string (e.g. "#4f46e5") |

### `dish_tags`

Many-to-many join between dishes and tags.

| Column | Type | Constraints |
|---|---|---|
| `dishId` | integer | NOT NULL, FK → dishes.id, CASCADE DELETE |
| `tagId` | integer | NOT NULL, FK → tags.id, CASCADE DELETE |
| | | PK (dishId, tagId) |

### `plan_entries`

Individual scheduled items on the calendar.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `date` | text | NOT NULL | YYYY-MM-DD |
| `mealType` | text | NOT NULL | 'breakfast' \| 'lunch' \| 'dinner' \| 'uncategorized' |
| `dishId` | integer | nullable, FK → dishes.id | NULL for one-off entries |
| `oneOffText` | text | nullable | NULL for dish entries. Set for one-off entries. |
| `guestCount` | integer | NOT NULL, DEFAULT 0 | Extra guests beyond household size. Affects leftover calc. |
| `createdAt` | text | NOT NULL | |

Check: exactly one of `dishId` or `oneOffText` must be non-null (enforced in application layer).

### `shopping_lists`

Ephemeral ingredient lists for a date range. Auto-deleted 36h after marked done.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL | User-provided label |
| `dateRangeStart` | text | NOT NULL | YYYY-MM-DD |
| `dateRangeEnd` | text | NOT NULL | YYYY-MM-DD |
| `isDone` | integer | NOT NULL, DEFAULT 0 | Boolean |
| `doneAt` | text | nullable | ISO 8601. Set when isDone is first set to 1. Auto-delete trigger. |
| `createdAt` | text | NOT NULL | |

### `shopping_list_items`

One row per Canonical Ingredient per Shopping List.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `shoppingListId` | integer | NOT NULL, FK → shopping_lists.id, CASCADE DELETE | |
| `canonicalIngredientId` | integer | NOT NULL, FK → canonical_ingredients.id | |
| `sourceDishIds` | text | NOT NULL | JSON array of dish IDs that contribute this ingredient |
| `rawTexts` | text | NOT NULL | JSON array of raw strings from source dishes (parallel to sourceDishIds) |
| `checked` | integer | NOT NULL, DEFAULT 0 | Boolean. Persisted to DB. |

### `planning_sessions`

Persisted state for in-progress Planning Mode wizards.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `dateRangeStart` | text | NOT NULL | YYYY-MM-DD |
| `dateRangeEnd` | text | NOT NULL | YYYY-MM-DD |
| `mealTypes` | text | NOT NULL | JSON string[] |
| `currentStep` | integer | NOT NULL, DEFAULT 1 | 1–8 |
| `filters` | text | NOT NULL, DEFAULT '{}' | JSON (see planning-mode.md) |
| `compositionRules` | text | NOT NULL, DEFAULT '[]' | JSON array |
| `draftPlan` | text | NOT NULL, DEFAULT '{}' | JSON keyed by `date:mealType` |
| `confirmedEntryIds` | text | NOT NULL, DEFAULT '[]' | JSON integer[] |
| `pendingOneOffEntries` | text | NOT NULL, DEFAULT '[]' | JSON array |
| `usedDishIds` | text | NOT NULL, DEFAULT '[]' | JSON integer[] |
| `shownDishIdsBySlot` | text | NOT NULL, DEFAULT '{}' | JSON Record<slotKey, integer[]> |
| `status` | text | NOT NULL, DEFAULT 'in_progress' | 'in_progress' \| 'finalizing' |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

### `app_settings`

Key-value store for global app configuration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | text | PK | Setting name |
| `value` | text | NOT NULL | JSON-encoded value |

Default rows seeded on first run:
- `householdSize` → `"2"`
- `appName` → `"Meal Planner"`

---

## Indexes

```sql
CREATE INDEX idx_plan_entries_date ON plan_entries(date);
CREATE INDEX idx_plan_entries_dish_id ON plan_entries(dishId);
CREATE INDEX idx_dish_ingredients_dish_id ON dish_ingredients(dishId);
CREATE INDEX idx_dish_ingredients_canonical_id ON dish_ingredients(canonicalIngredientId);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shoppingListId);
CREATE INDEX idx_canonical_ingredients_name ON canonical_ingredients(name);
CREATE INDEX idx_dishes_archived ON dishes(archived);
```

---

## Entity Relationships

```
dishes ──< dish_ingredients >── canonical_ingredients
dishes ──< dish_tags >── tags
plan_entries >── dishes (nullable; null = one-off)
shopping_lists ──< shopping_list_items >── canonical_ingredients
```

---

## Auto-Delete Task

A Nitro scheduled task at `server/tasks/shopping-lists/cleanup.ts` deletes Shopping Lists where:

```sql
isDone = 1 AND doneAt < (current_time - 36 hours)
```

Cascade deletes on `shopping_list_items` handle item cleanup automatically.

**Configuration** — tasks are experimental in Nitro and must be opted in via `nuxt.config.ts`:

```ts
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '*/15 * * * *': ['shopping-lists:cleanup']   // runs every 15 minutes
  }
}
```

The task file (`server/tasks/shopping-lists/cleanup.ts`) uses `defineTask` and calls the shopping list service directly. The task name is derived from the file path: `shopping-lists:cleanup`.

Note: Nitro scheduled tasks use the [croner](https://croner.56k.guru/) engine on the `node_server` preset used in Docker, so no external scheduler or cron daemon is needed.

---

## Design Notes

**Why JSON arrays in SQLite?**
Fields like `allergens`, `season`, `mealTypes` are stored as JSON text rather than junction tables
because: (1) they are never queried by individual element in complex joins, (2) the sets are small
and bounded, and (3) it simplifies reads. Tag filtering uses the junction table because tags are
user-defined and queried by ID.

**Why no separate `dish_history` table?**
Frequency tracking is derived from `plan_entries` (Option 1 — planned = made). This avoids
maintaining a separate table and is fully reversible if we switch to Option 2 or 3 later.
The service layer computes `lastPlannedDate` and `timesPlanned` via query at read time.
