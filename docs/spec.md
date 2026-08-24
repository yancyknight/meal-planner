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
| `freeFrom` | string[] | Dietary claims this dish is certified free from. Presets: `gluten-free`, `dairy-free`, `nut-free`, `shellfish-free`, `egg-free`, `soy-free`, `peanut-free`. Skipping all = no claims (not assumed allergen-free). |
| `season` | string[] | Any combination of: spring, summer, fall, winter. Empty = year-round. |
| `notes` | string \| null | Freeform internal notes |
| `cooldownDays` | integer | Hard floor. Dish is ineligible for planning suggestions if it was last cooked fresh within this many days. Default 7. |
| `targetIntervalDays` | integer | Soft goal. Desired average gap (days) between fresh servings. Drives Selection Weight. Must be ≥ `cooldownDays`. Default 14. |
| `excludedFromSuggestions` | boolean | Default false. When true, never proposed by the planning engine but still visible in the library. |
| `archived` | boolean | Default false. Archived dishes hidden from browsing and planning. |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Dish Actions

- **Create manually** — fill form
- **Import from URL** — server fetches and parses the recipe page, prefills form for user review; user confirms before saving
- **Edit** — all fields editable
- **Archive / Unarchive** — archived dishes are excluded from planning suggestions and hidden in default views; reversible at any time
- **Delete** — only allowed if the dish has zero Plan Entries. If it has history, the user must archive instead.
- **Attach files** — upload supporting files (see *Dish Files* below)

### Dish Library View

- Default: shows non-archived dishes
- Search: by name (full text)
- Filters: tags (including virtual tags — see §3), archived toggle
- Sort: name A–Z, date added, last planned

### Dish Detail View

- All fields displayed
- Ingredient list (raw text with canonical ingredient linked)
- Planning stats: times planned, last planned date
- Frequency controls (preset dropdown + advanced cooldown/target inputs + exclude toggle — see §5)
- Files section — attached files with download and remove, plus a drop zone to add more

### Dish Files

Supporting files attached to a Dish. The motivating case: a cook combines the main part of one
recipe with the sauce from another, assembles a PDF by hand, and attaches it so nobody has to
hunt down both sources next time.

- Upload by drag-and-drop or file picker, on both the dish detail view and the dish edit form
- Uploads save immediately rather than on form submit, so the create form shows
  "Save the dish first to attach files" instead of a drop zone
- Multiple files per dish; listed newest first with name, size, and a download link
- Allowed types are an extension allowlist — PDFs, images, plain text/markdown/CSV, and common
  Office and OpenDocument formats. Anything else is refused.
- Maximum 100 MB per file (`MAX_UPLOAD_MB`)
- Removing a file deletes it from disk; deleting a dish deletes all of its files

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

### Virtual Tags

Filter tokens computed from dish fields at query time, not stored in the `tags` table. Cannot be assigned manually on a dish form — they appear in *filtering* contexts only (planning anchors, dish library filter).

| ID | Display | Rule |
|---|---|---|
| `v:quick` | ⚡ quick | `dish.timeEstimateMinutes ≤ 20` |
| `v:easy` | 🟢 easy | `dish.difficulty = 'easy'` |
| `v:dairy-free` | 🥛 dairy-free | `'dairy-free' ∈ dish.freeFrom` |
| `v:gluten-free` | 🌾 gluten-free | `'gluten-free' ∈ dish.freeFrom` |
| `v:nut-free` | 🥜 nut-free | `'nut-free' ∈ dish.freeFrom` |
| `v:shellfish-free` | 🦐 shellfish-free | `'shellfish-free' ∈ dish.freeFrom` |
| `v:egg-free` | 🥚 egg-free | `'egg-free' ∈ dish.freeFrom` |
| `v:soy-free` | 🫘 soy-free | `'soy-free' ∈ dish.freeFrom` |
| `v:peanut-free` | 🥜 peanut-free | `'peanut-free' ∈ dish.freeFrom` |

Virtual tag IDs use a `v:` prefix so they're trivially distinguishable from real tag IDs (numeric). Dishes with a `null` field that a virtual tag references are not in that tag's set — no "unknown = maybe" ambiguity.

Dietary virtual tags respect the `showAllergens` setting (M8.5): when `showAllergens` is false, dietary virtual tags are hidden from pickers but still functional if previously selected.

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

A Plan Entry has an `entryKind`:
- **Fresh** (`entryKind: 'fresh'`) — references a saved Dish, represents the cook event. Shows name, meal type, thumbnail, difficulty badge. The only kind that advances a Dish's cooldown / overdueness clock.
- **Leftover** (`entryKind: 'leftover'`) — references a saved Dish (usually the same one cooked the prior day), represents eating leftovers. Visually distinguished from fresh entries (e.g. "🥡 Leftover: [Dish]"). Does **not** reset the cooldown clock.
- **One-Off** (`entryKind: 'one-off'`) — free text only (e.g. "Burger King", "Dinner at Gram's House"). Does not link to the Dish library.

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
| `entryKind` | `fresh` \| `leftover` \| `one-off` | Default `fresh`. `one-off` requires `oneOffText`; `fresh` and `leftover` require `dishId`. |
| `dishId` | integer \| null | Set for `fresh` and `leftover`; null for `one-off`. |
| `oneOffText` | string \| null | Set for `one-off`; null otherwise. |
| `guestCount` | integer | Extra guests beyond household size. Default 0. Only meaningful on `fresh` entries (leftovers don't consume fresh servings). |
| `createdAt` | datetime | |

### Leftovers

When viewing a Dish Plan Entry:
- If `dish.yieldServings > (householdSize + entry.guestCount)`: show a "🥡 Leftovers" indicator
- The leftover count is informational: `yieldServings - (householdSize + guestCount)` servings
- Planning Mode uses this to offer a leftover-lunch suggestion for the next day (see Planning Mode spec)

---

## 5. Dish Frequency Controls

Each Dish carries two intuitive numbers that drive how often it appears in generated plans:

- **`cooldownDays`** — hard floor. Never suggest the Dish if it was cooked fresh within this many days.
- **`targetIntervalDays`** — soft goal. The desired average gap between fresh servings.

Plus one boolean:

- **`excludedFromSuggestions`** — when true, never proposed by the planning engine (but Dish stays visible in the library).

Validation: `1 ≤ cooldownDays ≤ targetIntervalDays`.

### Selection Algorithm (planning engine internal)

For each open slot, processed in date order:

```
daysSince        = days between slot date and the Dish's most recent FRESH past Plan Entry
                   (if the Dish has never been served fresh: daysSince = 1.5 × targetIntervalDays)

eligible         = daysSince ≥ cooldownDays   (plus filters and not excludedFromSuggestions)

overdueness      = daysSince / targetIntervalDays
selectionWeight  = min(overdueness, 3.0)
```

The planning engine builds the eligible pool for the slot, then picks via weighted-random using `selectionWeight`. **Leftover Plan Entries do not count** toward `daysSince` — only Fresh entries advance the cooldown / overdueness clock.

**Why this works:** at steady state a Dish gets picked when its overdueness is ≈ 1.0, so the long-run gap converges to `targetIntervalDays`. A Dish with `target = 7` accrues weight twice as fast as one with `target = 14`, so over time it appears twice as often — exactly the ratio the user dialed in.

**Why the cap at 3.0:** prevents a single forgotten Dish (e.g. one not served for a year) from dominating selection once it does become eligible again.

**Why `1.5 × targetIntervalDays` for never-served:** mild "try this soon" bias without letting a bulk-imported batch crowd out the rotation.

### Nudge Controls (on Dish Detail / Edit)

| Control | What it does |
|---|---|
| Frequency preset dropdown | Sets `targetIntervalDays` and `cooldownDays` together. Weekly → 7 / 4 · Biweekly → 14 / 7 · Monthly → 30 / 15 · Quarterly → 90 / 45 · Custom. When the user enters Custom mode, `cooldownDays` defaults to `ceil(targetIntervalDays / 2)`. |
| Advanced (custom) | Numeric inputs for `targetIntervalDays` and `cooldownDays` directly. Enforces `cooldownDays ≤ targetIntervalDays`. |
| "Exclude from suggestions" toggle | Sets `excludedFromSuggestions = true`. The frequency controls remain editable but greyed-out while exclusion is active. |

---

## 6. Dish Frequency Tracking

**Strategy: Option 1** — assume planned = made. No manual confirmation required.

Frequency stats are computed from Plan Entries with `entryKind = 'fresh'`, a non-null `dishId`, and a `date` in the past. Leftover entries are not counted (a leftover lunch is not a separate cook event).

Stats displayed on Dish Detail:
- Total times cooked fresh (all time)
- Last cooked date (most recent Fresh entry)
- Days since last cooked fresh
- (Optional in M10) Total times eaten as leftovers

Used by the planning engine to compute `daysSinceLastServedFresh` → overdueness → selection weight.

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

## 10. Freezer

A logging-style freezer-inventory module. Users log items as they go in, see what's expiring or
already past its toss-by date, and optionally link items to Dishes so the planning engine can
pull a Dish forward when there's a corresponding item in the freezer.

No quantities, no partial use — an item is either in the freezer or it isn't.

Detailed spec: **[`freezer-mode.md`](./freezer-mode.md)**.

### Concepts (summary)

- **Freezer** — a physical freezer; the household may have multiple.
- **Freezer Category** — classification with a default lifetime in days (e.g. *Raw Poultry* → 270 days). Seeded list, editable, custom categories allowed.
- **Freezer Item** — name, category, freezer, `addedAt`, `tossByDate` (computed from category lifetime), `targetUseDate` (midpoint between `addedAt` and `tossByDate`, frozen at creation), optional link to a Dish, optional link to a Canonical Ingredient.
- **Status** — `active`, `used`, `wasted`. Both terminal states are tracked separately for later category-tuning insight.
- **Audit** — a per-freezer walk-through that confirms what's actually still there and updates the freezer's `lastAuditedAt` timestamp.

### Dashboard

`/freezer` shows three buckets, grouped by freezer: **Expired** (past `tossByDate`),
**Approaching** (within the configurable approaching-window, default 14 days), **Recently
Added** (last 7 days). `targetUseDate` shows on each item but is not its own bucket — it's a
planner weighting input, not a user-facing urgency signal.

### NFC entry

Two URL patterns per freezer, designed to survive renames (IDs not slugs):

- `/freezer/add?freezerId=<id>` — pre-selects the freezer on the add form.
- `/freezer/<id>/audit` — jumps straight into audit mode.

### Notifications (ntfy.sh)

Configurable per-household ntfy server + topic. Triggers: daily expiry check, weekly digest,
audit-overdue per freezer. Best-effort delivery; failures are logged and skipped.

### Planner integration

A Freezer Item with a non-null `dishId` becomes a hint to the planning engine: the linked Dish
gets a score boost that ramps up as a slot date approaches (or passes) the item's
`targetUseDate`. Calendar chips for those dishes carry a small ❄ badge. The user always marks
items as used manually — the planner suggests, it does not consume.

See [`freezer-mode.md` §Planner Integration](./freezer-mode.md#planner-integration) for the
contract and the multiplier curve.

### Phasing

The feature ships in four phases (Milestones 14–17): Core (CRUD + dashboard) → Audit + NFC →
Notifications → Planner Integration. Phase 1 is independently usable as a freezer log.

---

## 11. Pages & Navigation

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
| `/freezer` | Freezer dashboard (Expired / Approaching / Recently Added) |
| `/freezer/add` | Add freezer item (accepts `?freezerId=<id>` from NFC) |
| `/freezer/[id]` | One freezer's item list; audit entry point |
| `/freezer/[id]/audit` | Per-freezer audit walk-through |
| `/settings` | App settings (includes Freezer card) |
