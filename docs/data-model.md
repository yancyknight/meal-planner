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
| `freeFrom` | text | NOT NULL, DEFAULT '[]' | JSON string[]. Dietary claims this dish is certified free from. Presets: `gluten-free`, `dairy-free`, `nut-free`, `shellfish-free`, `egg-free`, `soy-free`, `peanut-free`. |
| `season` | text | NOT NULL, DEFAULT '[]' | JSON string[]. 'spring' \| 'summer' \| 'fall' \| 'winter'. Empty = year-round. |
| `notes` | text | nullable | |
| `cooldownDays` | integer | NOT NULL, DEFAULT 7 | Hard floor. Dish ineligible if its most recent Fresh Plan Entry is within this many days of the slot date. |
| `targetIntervalDays` | integer | NOT NULL, DEFAULT 14 | Soft goal. Desired average gap between fresh servings. Must be ≥ `cooldownDays` (enforced in Zod). |
| `excludedFromSuggestions` | integer | NOT NULL, DEFAULT 0 | Boolean (0/1). When 1, never proposed by the planning engine. |
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
| `entryKind` | text | NOT NULL, DEFAULT 'fresh' | 'fresh' \| 'leftover' \| 'one-off'. Only `fresh` rows count toward a Dish's cooldown / overdueness. |
| `dishId` | integer | nullable, FK → dishes.id | Set for 'fresh' and 'leftover'; NULL for 'one-off'. |
| `oneOffText` | text | nullable | Set for 'one-off'; NULL otherwise. |
| `freezerItemId` | integer | nullable, FK → freezer_items.id ON DELETE SET NULL | Only set on 'one-off' entries created from a standalone freezer recommendation. Drives the ❄ badge and mark-used affordance. |
| `guestCount` | integer | NOT NULL, DEFAULT 0 | Extra guests beyond household size. Affects leftover calc. Only meaningful on 'fresh' entries. |
| `createdAt` | text | NOT NULL | |

Check (enforced in application layer): `entryKind = 'one-off'` ↔ `oneOffText` non-null AND `dishId` null. `entryKind ∈ {'fresh', 'leftover'}` ↔ `dishId` non-null AND `oneOffText` null AND `freezerItemId` null. `freezerItemId` may only be set when `entryKind = 'one-off'`.

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

Persisted state for in-progress Planning Mode wizards. See `docs/planning-mode.md` for the JSON shapes.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `weekStart` | text | NOT NULL | YYYY-MM-DD — Monday of the planned week. v1 sessions always cover seven days. |
| `mealTypes` | text | NOT NULL | JSON string[] |
| `currentStep` | integer | NOT NULL, DEFAULT 1 | 1–4 |
| `slotStates` | text | NOT NULL, DEFAULT '{}' | JSON Record<slotKey, 'plan' \| 'skip' \| 'one-off' \| 'keep'> |
| `removedPlanEntryIds` | text | NOT NULL, DEFAULT '[]' | JSON integer[] — existing entries marked for deletion on finalize |
| `pendingOneOffEntries` | text | NOT NULL, DEFAULT '[]' | JSON array of `{date, mealType, text}` |
| `sessionVirtualTags` | text | NOT NULL, DEFAULT '[]' | JSON string[] — virtual tag IDs (e.g. `['v:quick','v:dairy-free']`) |
| `pinnedTags` | text | NOT NULL, DEFAULT '[]' | JSON array of `{date, mealType, tagRef}` where `tagRef` is `{kind:'real',tagId}` or `{kind:'virtual',id}` |
| `wishlistTags` | text | NOT NULL, DEFAULT '[]' | JSON integer[] — real tag IDs only |
| `draftPlan` | text | NOT NULL, DEFAULT '{}' | JSON keyed by `date:mealType` |
| `shownDishIdsBySlot` | text | NOT NULL, DEFAULT '{}' | JSON Record<slotKey, integer[]> |
| `leftoverToggles` | text | NOT NULL, DEFAULT '{}' | JSON Record<slotKey, boolean> — toggles set in Step 4 on originating dinner slots |
| `status` | text | NOT NULL, DEFAULT 'in_progress' | 'in_progress' \| 'finalizing' |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

### `freezers`

Physical freezers. Small table (typically 1–3 rows).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL | Display name |
| `lastAuditedAt` | text | nullable | ISO 8601. Updated when an audit walk-through finishes. |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

### `freezer_categories`

Storage classifications. Seeded on first run; editable; custom categories allowed.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `name` | text | NOT NULL, UNIQUE | |
| `defaultLifetimeDays` | integer | NOT NULL | Default lifetime applied to new items in this category. |
| `isSystem` | integer | NOT NULL, DEFAULT 0 | Hint that the row was seeded. Does not prevent edit/delete. |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

Seeded rows (see [`freezer-mode.md` §Data Model](./freezer-mode.md#seeded-defaults) for the full table): *Raw Poultry · 270*, *Raw Red Meat · 365*, *Raw Ground Meat · 120*, *Raw Fish (Lean) · 180*, *Raw Fish (Fatty) · 90*, *Cooked Leftovers · 90*, *Soups & Stews · 90*, *Bread & Baked Goods · 90*, *Prepared Meals & Pizza · 60*, *Vegetables (Frozen) · 240*, *Fruit · 365*, *Stock & Broth · 180*, *Sauces · 180*, *Butter · 270*, *Hard Cheese · 180*, *Ice Cream · 60*, *Other · 90*.

### `freezer_items`

Individual items in a freezer.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `freezerId` | integer | NOT NULL, FK → freezers.id | No cascade — freezers with active items can't be deleted. |
| `categoryId` | integer | NOT NULL, FK → freezer_categories.id | No cascade — categories with active items can't be deleted. |
| `name` | text | NOT NULL | |
| `notes` | text | nullable | Freeform |
| `dishId` | integer | nullable, FK → dishes.id ON DELETE SET NULL | Planner anchor when set. |
| `canonicalIngredientId` | integer | nullable, FK → canonical_ingredients.id ON DELETE SET NULL | Informational link. |
| `addedAt` | text | NOT NULL | YYYY-MM-DD |
| `lifetimeDaysOverride` | integer | nullable | When set, overrides the category's `defaultLifetimeDays` for this item's `tossByDate` math. |
| `tossByDate` | text | NOT NULL | YYYY-MM-DD. Computed and **stored** at creation: `addedAt + lifetimeDays`. |
| `targetUseDate` | text | NOT NULL | YYYY-MM-DD. Computed and **stored** at creation: midpoint of `addedAt` and `tossByDate`. **Never recomputed**; user-editable. |
| `status` | text | NOT NULL, DEFAULT 'active' | 'active' \| 'used' \| 'wasted' |
| `statusChangedAt` | text | nullable | ISO 8601. Set when status moves off 'active'. |
| `createdAt` | text | NOT NULL | |
| `updatedAt` | text | NOT NULL | |

Check (enforced in the Zod schema): `lifetimeDaysOverride >= 1`; `tossByDate > addedAt`;
`addedAt <= targetUseDate <= tossByDate`.

### `dish_files`

Supporting files attached to a Dish — most often a PDF assembled by hand when a cook combines
parts of two recipes, so the household does not have to hunt down both sources again.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | PK, autoincrement | |
| `dishId` | integer | NOT NULL, FK → dishes ON DELETE CASCADE | Owning dish |
| `storedName` | text | NOT NULL | Name on disk: `{uuid}.{ext}` under `$FILE_DIR` |
| `originalName` | text | NOT NULL | Name the file was uploaded with; shown in the UI and in `Content-Disposition` |
| `mimeType` | text | NOT NULL | As reported at upload, validated against the extension allowlist |
| `sizeBytes` | integer | NOT NULL | Byte length of the stored blob |
| `createdAt` | text | NOT NULL | ISO 8601 |

Rows cascade with the dish, but the blobs do not — `dishService.deleteDish` calls
`dishFileService.deleteAllFilesForDish` first so nothing is orphaned on disk.

---

### `app_settings`

Key-value store for global app configuration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | text | PK | Setting name |
| `value` | text | NOT NULL | JSON-encoded value |

Default rows seeded on first run:
- `householdSize` → `"2"`
- `appName` → `"Meal Planner"`
- `freezerApproachingWindowDays` → `"14"`
- `freezerAuditOverdueDays` → `"60"`
- `freezerNotificationsEnabled` → `"false"`
- `ntfyServerUrl` → `"https://ntfy.sh"`
- `ntfyTopic` → `""`
- `ntfyAuthToken` → `""`
- `freezerWeeklyDigestDay` → `"0"`
- `freezerWeeklyDigestHour` → `"9"`

---

## Indexes

```sql
CREATE INDEX idx_plan_entries_date ON plan_entries(date);
CREATE INDEX idx_plan_entries_dish_id ON plan_entries(dishId);
CREATE INDEX idx_plan_entries_dish_fresh ON plan_entries(dishId, date) WHERE entryKind = 'fresh';
CREATE INDEX idx_plan_entries_freezer_item_id ON plan_entries(freezerItemId) WHERE freezerItemId IS NOT NULL;
CREATE INDEX idx_dish_ingredients_dish_id ON dish_ingredients(dishId);
CREATE INDEX idx_dish_ingredients_canonical_id ON dish_ingredients(canonicalIngredientId);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shoppingListId);
CREATE INDEX idx_canonical_ingredients_name ON canonical_ingredients(name);
CREATE INDEX idx_dishes_archived ON dishes(archived);
CREATE INDEX idx_dish_files_dish_id ON dish_files(dishId);
CREATE INDEX idx_freezer_items_freezer_id ON freezer_items(freezerId);
CREATE INDEX idx_freezer_items_status ON freezer_items(status);
CREATE INDEX idx_freezer_items_toss_by ON freezer_items(tossByDate) WHERE status = 'active';
CREATE INDEX idx_freezer_items_dish_id ON freezer_items(dishId) WHERE status = 'active' AND dishId IS NOT NULL;
CREATE INDEX idx_freezer_items_standalone ON freezer_items(targetUseDate) WHERE status = 'active' AND dishId IS NULL;
```

The partial index `idx_plan_entries_dish_fresh` accelerates the `daysSinceLastServedFresh` lookup used by the planning engine: "most recent fresh entry for this dish before this date."

---

## Entity Relationships

```
dishes ──< dish_ingredients >── canonical_ingredients
dishes ──< dish_tags >── tags
dishes ──< dish_files
plan_entries >── dishes (nullable; null = one-off)
plan_entries >── freezer_items (nullable; set on one-off entries created from standalone freezer recommendations)
shopping_lists ──< shopping_list_items >── canonical_ingredients
freezers ──< freezer_items >── freezer_categories
freezer_items >── dishes (nullable; planner anchor)
freezer_items >── canonical_ingredients (nullable; informational)
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
Fields like `freeFrom`, `season`, `mealTypes` are stored as JSON text rather than junction tables
because: (1) they are never queried by individual element in complex joins, (2) the sets are small
and bounded, and (3) it simplifies reads. Tag filtering uses the junction table because tags are
user-defined and queried by ID.

**Why no separate `dish_history` table?**
Frequency tracking is derived from `plan_entries` (Option 1 — planned = made). This avoids
maintaining a separate table and is fully reversible if we switch to Option 2 or 3 later.
The service layer computes `lastPlannedDate` and `timesPlanned` via query at read time.
