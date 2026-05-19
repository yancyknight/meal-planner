# Product Specification

## Overview

A self-hosted meal planning web app for a two-person household. No authentication — all data is globally accessible. Core features:

1. **Dish Library** — catalog of dishes with rich metadata and suggestion settings
2. **Calendar** — meal plan with breakfast/lunch/dinner/uncategorized slots per day
3. **Planning Mode** — multi-step wizard for generating a plan over a date range
4. **Shopping Lists** — ephemeral ingredient lists generated from calendar date ranges
5. **Ingredient Management** — canonical ingredient database with Walmart product links
6. **Settings** — household configuration

---

## 1. Dish Library

### Dish Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `imageUrl` | string \| null | External URL (e.g. from recipe import) |
| `imageLocalPath` | string \| null | Local upload path. Takes display precedence |
| `timeEstimateMinutes` | integer \| null | Combined prep + cook time |
| `yieldServings` | integer \| null | Number of servings the dish produces |
| `sourceUrl` | string \| null | Link to original recipe online |
| `sourceName` | string \| null | Website name or cookbook title |
| `difficulty` | `easy` \| `medium` \| `hard` \| null | |
| `allergens` | string[] | Presets: gluten, dairy, nuts, shellfish, eggs, soy, peanuts. Plus freeform entries. |
| `season` | string[] | Any combination of: spring, summer, fall, winter. Empty = year-round. |
| `notes` | string \| null | Freeform internal notes |
| `weight` | integer 0–100 | Base suggestion probability. Default 50. |
| `minIntervalDays` | integer \| null | Min days that must pass since the dish was last made before it is eligible for planning again. Null = no constraint. |
| `archived` | boolean | Default false. Archived dishes hidden from browsing and planning. |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Dish Actions

- **Create manually** — fill form
- **Import from URL** — server fetches and parses the recipe page, prefills form for user review; user confirms before saving
- **Edit** — all fields editable
- **Archive / Unarchive** — archived dishes are excluded from planning suggestions and hidden in default views; reversible at any time
- **Delete** — only allowed if the dish has zero Plan Entries. If it has history, the user must archive instead.

### Dish Library View

- Default: shows non-archived dishes
- Search: by name (full text)
- Filters: tags, difficulty, allergens, season, max time, archived toggle
- Sort: name A–Z, date added, last planned, weight

### Dish Detail View

- All fields displayed
- Ingredient list (raw text with canonical ingredient linked)
- Planning stats: times planned, last planned date
- Suggestion settings (weight slider + nudge controls — see §5)

### Ingredient Entry on a Dish

When adding a Dish Ingredient:
1. User types the raw text (e.g. "3 cloves garlic, minced")
2. System extracts the likely ingredient name portion and fuzzy-searches Canonical Ingredients
3. If a strong match exists, surfaces a suggestion: "Did you mean: **Garlic**?"
4. User confirms the suggested canonical, searches for a different one, or creates a new canonical
5. Raw text and canonical ID both saved to the Dish Ingredient record

---

## 2. Canonical Ingredients

A global, deduplicated ingredient reference table. Dish Ingredients link to these.

### Canonical Ingredient Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Canonical display name. Required, unique. |
| `walmartUrl` | string \| null | Direct Walmart product page link. Manually entered. |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Ingredient Management View

Dedicated view listing all canonical ingredients. Allows:
- **Rename** — updates display everywhere
- **Merge** — select two canonicals; all dish ingredients referencing the secondary get relinked to the primary; secondary is deleted
- **Set Walmart URL** — paste a product page URL
- **View dishes** — see all dishes that use this ingredient

---

## 3. Tags

Global tag list. Created on the fly when typing in a dish form. Reused across dishes.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Unique |
| `color` | string \| null | Hex color for display |

Usage examples: cuisine type (italian, mexican), course (main, side, soup), occasion (weeknight, weekend), dietary (vegetarian, vegan), style (quick, comfort food).

No dedicated tag management view in v1 — managed inline on dish forms.

---

## 4. Calendar

### Views

| View | Description |
|---|---|
| Month view | Each day shows a count/summary of planned items |
| Week view | Each day shows all slots with planned items |
| Day view | Full detail for one day, all slots |

### Meal Type Slots

Each day has four slots: `breakfast`, `lunch`, `dinner`, `uncategorized`. Each slot can hold any number of Plan Entries.

### Plan Entry

A Plan Entry is either:
- **Dish Entry** — references a saved Dish. Shows name, meal type, thumbnail, difficulty badge.
- **One-Off Entry** — free text only (e.g. "Burger King", "Dinner at Gram's House"). Does not link to the Dish library.

### Adding a Plan Entry

From any calendar slot, open the "Add" dialog:
- Toggle: Dish or One-Off
- If Dish: search/browse Dish library, select
- If One-Off: enter text
- Meal type defaults to the slot; user can change

### Plan Entry Fields

| Field | Type | Notes |
|---|---|---|
| `date` | YYYY-MM-DD | |
| `mealType` | breakfast \| lunch \| dinner \| uncategorized | |
| `dishId` | integer \| null | Null for One-Off |
| `oneOffText` | string \| null | Null for Dish entries |
| `guestCount` | integer | Extra guests beyond household size. Default 0. |
| `createdAt` | datetime | |

### Leftovers

When viewing a Dish Plan Entry:
- If `dish.yieldServings > (householdSize + entry.guestCount)`: show a "🥡 Leftovers" indicator
- The leftover count is informational: `yieldServings - (householdSize + guestCount)` servings
- Planning Mode uses this to offer a leftover-lunch suggestion for the next day (see Planning Mode spec)

---

## 5. Dish Weight & Nudge System

### Weight

Each Dish has a `weight` (0–100, default 50). This is the base suggestion probability used by the planning engine.

- Weight **0** = dish is effectively excluded from all suggestions
- Weight **100** = maximum probability of being selected
- Dishes are selected by weighted random, not strict ordering

### Effective Weight (planning engine internal)

```
effectiveWeight = baseWeight × recencyFactor × intervalFactor
```

**recencyFactor:**
- 1.0 if the dish has never been made
- Linearly decays from 1.0 toward 0.1 as `daysSinceLastMade` approaches `minIntervalDays` (or 60 days if null)
- Recovers back to 1.0 after `minIntervalDays × 1.5` days (or 90 days if null)

**intervalFactor:**
- 0 if `minIntervalDays` is set AND `daysSinceLastMade < minIntervalDays`
- 1 otherwise

`daysSinceLastMade` is derived from past Plan Entries (dates before today) for that dish — not from when it was last shown in a draft. A dish that was suggested but not selected is not penalized.

### Nudge Controls (on Dish Detail / Edit)

| Control | What it does |
|---|---|
| Weight slider 0–100 | Sets `weight` directly |
| "Exclude from suggestions" toggle | Sets `weight = 0` (also disables slider while active) |
| "How often" dropdown | Sets `minIntervalDays`: Anytime → null · Often → 14 · Monthly → 30 · Every 3 months → 90 · Every 6 months → 180 |
| "Boost" button | `weight = min(weight + 20, 100)` — quick way to say "more of this" |

---

## 6. Dish Frequency Tracking

**Strategy: Option 1** — assume planned = made. No manual confirmation required.

Frequency stats are computed from Plan Entries with a `dishId` and a `date` in the past.

Stats displayed on Dish Detail:
- Total times planned (all time)
- Last planned date
- Days since last planned

Used by the planning engine's recency factor calculation.

Future options considered but not implemented in v1:
- Weekly confirmation prompt (Option 2)
- Per-entry "mark as made" checkbox (Option 3)

---

## 7. Shopping Lists

### Creation

User selects a name and date range. System queries all Dish Plan Entries in that range, collects their Dish Ingredients, and groups by Canonical Ingredient to build the list.

One-Off Entries do not contribute ingredients.

### Shopping List Item Display

Each item shows:
- Canonical ingredient name (large/prominent)
- Walmart link button (if `walmartUrl` is set)
- Source raw text strings from each contributing dish (subtle, secondary text)
- Which dishes contribute this ingredient (subtle chip list)
- Checkbox

### Views

**Combined view** (default): All items sorted alphabetically by canonical name. Each item shows all contributing dishes.

**By-dish view**: Items sectioned by dish. Items appearing in multiple dishes appear under each.

### List Status

- **Active** → in use
- **Done** → marked by explicit user button tap ("Mark list as done"). Not triggered automatically when all items are checked.
- Done lists auto-delete after **36 hours**. The deletion countdown is shown clearly (e.g. "Deletes in 14h").
- "Undo done" available at any time before deletion.

### List Management View

All shopping lists shown with:
- Name and date range
- Item count / checked count
- Status badge (Active / Done — deletes in Xh)
- Delete button (immediate, manual)

---

## 8. App Settings

Accessible from a persistent settings page.

| Setting | Default | Description |
|---|---|---|
| `householdSize` | 2 | Used for leftover calculations |
| `appName` | "Meal Planner" | Shown in the app header |

---

## 9. Recipe Auto-Import

URL import endpoint: `POST /api/dishes/import { url }`

Server fetches the page and extracts structured data:
1. JSON-LD `Recipe` schema (most reliable — supported by major recipe sites)
2. Open Graph metadata fallback
3. Best-effort HTML heuristic fallback (title tag, `<ul>` ingredient lists, time meta tags)

Returns a prefilled dish payload. The client shows the import result in the Dish form for user review. The user can edit any field. **Saving is explicit** — import never auto-saves.

Fields populated when available: name, imageUrl, timeEstimateMinutes, yieldServings, sourceUrl (the import URL), sourceName (domain name), raw ingredient strings (user links canonicals after).

---

## 10. Pages & Navigation

| Route | Page |
|---|---|
| `/` | Redirect to `/calendar` |
| `/calendar` | Calendar (defaults to week view, current week) |
| `/dishes` | Dish library list |
| `/dishes/new` | Create dish form |
| `/dishes/[id]` | Dish detail |
| `/dishes/[id]/edit` | Edit dish form |
| `/ingredients` | Canonical ingredient management |
| `/shopping-lists` | Shopping list management view |
| `/shopping-lists/[id]` | Shopping list detail (combined + by-dish toggle) |
| `/planning` | Active planning sessions list + start new |
| `/planning/[id]` | Planning session wizard |
| `/settings` | App settings |
