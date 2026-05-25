# Freezer

A lightweight freezer-inventory module inside the meal planner. Goal: log what goes in and when,
get told what to eat or toss, with the lowest possible entry friction — the actual context for
data entry is standing at an open freezer with cold hands.

> **No quantities, no partial use.** An item is either in the freezer or it isn't. If you take
> a bag of peas out for half the recipe and put the rest back, it's still one item.

---

## UI Reference

Finalized designs live in `docs/design/freezer/`. Open `Freezer.html` in a browser to see all
screens side-by-side on a design canvas. The JSX files (`freezer-dashboard.jsx`,
`freezer-add.jsx`, `freezer-screens.jsx`) are the component source for the prototype; the CSS
lives in `freezer-styles.css`.

**What's there:**
- Dashboard — desktop + mobile, populated + empty, plus a "row expanded with actions" state
- Add item — mobile from-NFC and direct, plus first-run wizard (name-only step)
- Per-freezer view — desktop item list with filters, mobile bulk-select mode
- Audit — per-item card, resume banner, finish summary
- Settings · Freezer card — Freezers list, General, Categories, Notifications
- Calendar chip — plain chip vs. ❄ badge chip, single-link hover tip, multi-link hover tip

### Design system notes

The Freezer module extends the existing design system (Newsreader serif, Geist sans, DM Mono,
warm cream palette) with two new semantic tints only:

| Token | CSS value | Use |
|---|---|---|
| `--frost` | `oklch(0.92 0.024 198)` | ❄ badge backgrounds, NFC-selected dropdown bg, frost row border |
| `--frost-ink` | `oklch(0.48 0.045 200)` | ❄ glyphs, frost text, dish-link chips |
| `--frost-soft` | `oklch(0.95 0.018 200)` | Lighter frost tint |
| `--frost-line` | `oklch(0.83 0.035 198)` | Frost borders |
| `--expired` | `oklch(0.86 0.05 32)` | Expired-bucket row backgrounds |
| `--expired-ink` | `oklch(0.45 0.10 30)` | Expired text, "N days past" prominent value |
| `--expired-soft` | `oklch(0.94 0.025 30)` | Lighter expired tint |
| `--expired-line` | `oklch(0.78 0.07 32)` | Expired left-border on item rows |

The italic-accent rule: one meaningful word per headline, in `--accent-ink`
(e.g. `Three freezers · <em>fifty-two items</em>`). Never italicize chrome words.

### Key design decisions captured during iteration

These differ from or clarify the original spec text:

1. **Category field is a pill grid, not a dropdown.** The add form shows the 8 most common
   categories as 2-column pill cards (40px+ min-height, name + default lifetime as muted line).
   A `more categories…` tail reveals the full list. Each pill is a direct touch target — no
   extra dropdown step for the common case.

2. **Dashboard headline stands alone — no dynamic subhead.** An earlier draft had a subhead
   summarising expiring items and audit age. Removed: the headline count (`fifty-two items`)
   and the per-bucket eyebrows carry the summary without a second sentence. Per-freezer overdue
   state appears on the freezer detail page, not the dashboard header.

3. **First-run wizard is one step: name only.** The mini-wizard for creating the first freezer
   asks only for a name and shows a `Continue →` button. The NFC URL is auto-generated and
   surfaced in Settings → Freezer → Freezers after the freezer exists — no NFC URL entry during
   creation.

4. **Freezer management lives in Settings, not on the dashboard.** Adding more freezers after
   the first-run wizard happens in Settings → Freezer → Freezers. Each freezer row shows name,
   item count, days-since-audit, and a copyable NFC URL chip. The dashboard's `+ Add item` CTA
   is the only header-level action.

5. **NFC-selected freezer dropdown gets a frost-tinted treatment.** When the add form is reached
   via `?freezerId=`, the Freezer selector renders with `border-color: --frost-line` and
   `background: --frost-soft` plus a small italic serif hint "— from NFC tag · tap to change."

6. **Calendar chip hover tip — two-line layout for single-link, one-line for multi.** Single
   linked item: action verb on line 1 (`❄ Mark used`), item name in serif italic on line 2.
   Multiple linked items: one line: `❄ 3 linked items — open in Freezer ↗`.

7. **Preview chip uses accent-soft, not frost.** The toss-by / target-use preview chip on the
   add form uses `--accent-glow` background with an `ACCENT-SOFT` border and a `PREVIEW`
   eyebrow label. Frost is reserved strictly for ❄ freezer-identity moments; accent carries
   the "system computed this for you" signal.

---

## Design Principles

1. **Logging > inventory.** The user is not maintaining a count. They are logging events: *added*,
   *used*, *wasted*. Anything that requires more taps than that is friction that defeats the
   feature.
2. **Time is the only constraint that matters.** Items have a freshness window. The dashboard,
   notifications, and planner integration are all expressions of "when should this be used."
3. **Categories carry the defaults.** Per-item lifetime overrides exist but are the exception.
   Category defaults are doing the work.
4. **Freezer identity is stable.** NFC tags written today must still work after a freezer is
   renamed. Freezer IDs are forever; names are display labels.
5. **Planner integration is opt-in per item.** Items linked to a Dish bias the planning engine's
   scoring. Items without a dish link can still surface as recommendations and be manually added
   to the calendar as one-off entries linked to the freezer item.

---

## Concepts

| Term | Definition |
|---|---|
| **Freezer** | A physical freezer. The household may have multiple. Items live in exactly one. |
| **Freezer Category** | Classification of a stored item (e.g. *Raw Poultry*, *Cooked Leftovers*). Carries a default lifetime in days. Editable; user-defined categories allowed. |
| **Freezer Item** | A single thing in a single freezer. Has a name, category, date added, status. |
| **Toss-By Date** | `addedAt + lifetimeDays`. Computed at creation. The hard "stop eating this" line. |
| **Target Use Date** | The midpoint between `addedAt` and `tossByDate`. The "ideal" use date used as a planner weighting input. Frozen at creation. The user can override; the system never recomputes it. |
| **Lifetime Days** | Number of days from `addedAt` to `tossByDate`. Defaults from the item's category, optionally overridden per item. |
| **Audit** | A walk-through of one freezer where the user confirms every active item is still there, marks any as used or wasted, and the freezer's `lastAuditedAt` timestamp updates. |
| **Approaching-Toss-By Window** | Configurable global setting (default 14 days). Items inside this window from `tossByDate` show on the dashboard's "Approaching" bucket. |

---

## Data Model

> See `docs/data-model.md` for the authoritative table definitions. This section describes intent.

Three new tables, all `freezer_`-prefixed for module separability.

### `freezers`

The set of physical freezers. Small (typically 1–3 rows).

- `id`, `name`, `lastAuditedAt` (nullable ISO 8601), `createdAt`, `updatedAt`.

### `freezer_categories`

Storage classifications. Seeded with sensible defaults on first run; the user can edit or add to
them. `isSystem` is a hint, not a constraint — seeded rows can still be renamed and deleted.

- `id`, `name` (unique), `defaultLifetimeDays`, `isSystem` (0/1), `createdAt`, `updatedAt`.

#### Seeded defaults

| Name | Default lifetime (days) | Note |
|---|---:|---|
| Raw Poultry | 270 | Whole cuts; chicken, turkey |
| Raw Red Meat | 365 | Whole cuts; beef, pork, lamb |
| Raw Ground Meat | 120 | Beef, turkey, sausage |
| Raw Fish (Lean) | 180 | Cod, tilapia, etc. |
| Raw Fish (Fatty) | 90 | Salmon, mackerel, tuna |
| Cooked Leftovers | 90 | |
| Soups & Stews | 90 | |
| Bread & Baked Goods | 90 | |
| Prepared Meals & Pizza | 60 | |
| Vegetables (Frozen) | 240 | Blanched / commercial |
| Fruit | 365 | |
| Stock & Broth | 180 | |
| Sauces | 180 | |
| Butter | 270 | |
| Hard Cheese | 180 | |
| Ice Cream | 60 | |
| Other | 90 | Fallback |

Values are conservative and chosen for *quality*, not just safety. The user can adjust any of
them in the settings UI.

### `freezer_items`

The actual logged items.

- `id`, `freezerId` (FK), `categoryId` (FK), `name`, `notes` (nullable).
- `dishId` (nullable FK → dishes; **planner anchor** when set; see [Planner integration](#planner-integration)).
- `canonicalIngredientId` (nullable FK → canonical_ingredients; informational only).
- `addedAt` (YYYY-MM-DD), `lifetimeDaysOverride` (nullable integer).
- `tossByDate` (YYYY-MM-DD, computed and stored at create), `targetUseDate` (YYYY-MM-DD, computed
  and stored at create).
- `status` (`active` | `used` | `wasted`), `statusChangedAt` (nullable ISO 8601).
- `createdAt`, `updatedAt`.

`tossByDate` and `targetUseDate` are stored, not derived at read time. Storing them means the
existing approaching-window query is a simple range scan and target-use stays stable under any
later category-default edits. The planner integration relies on `targetUseDate` being the value
that was set when the item was created — recomputing it would shift planner urgency unexpectedly.

#### Status semantics

- `active` — in the freezer.
- `used` — taken out and eaten / cooked. Cleared from active views.
- `wasted` — thrown out (e.g. freezer burn, found expired, accident). Tracked separately from
  `used` because the user wants to see how often things get wasted; useful for tuning category
  lifetimes later.

Both `used` and `wasted` are terminal. There is no "undo to active" UI in v1, but the underlying
service allows it via direct API call.

#### FK behavior

- `freezer_items.freezerId` is `NOT NULL` with no cascade — freezers cannot be deleted while
  items reference them. The UI offers a "move all items to another freezer" action before delete.
- `freezer_items.categoryId` is `NOT NULL` with no cascade — categories with items cannot be
  deleted. The UI offers a "move all items to another category" action before delete.
- `freezer_items.dishId` is nullable; `ON DELETE SET NULL`. If a linked dish is deleted, the
  freezer item survives with its existing name and category.
- `freezer_items.canonicalIngredientId` is nullable; `ON DELETE SET NULL`. The
  `ingredientService.merge` flow must relink freezer items the same way it relinks
  `dish_ingredients` (small addition to existing merge logic).

#### Indexes

```sql
CREATE INDEX idx_freezer_items_freezer_id ON freezer_items(freezerId);
CREATE INDEX idx_freezer_items_status ON freezer_items(status);
CREATE INDEX idx_freezer_items_toss_by ON freezer_items(tossByDate) WHERE status = 'active';
CREATE INDEX idx_freezer_items_dish_id ON freezer_items(dishId) WHERE status = 'active' AND dishId IS NOT NULL;
```

The partial index on `tossByDate` is the dashboard's primary query. The partial index on `dishId`
is the planner-feed query.

---

## Pages & Routes

| Route | Page |
|---|---|
| `/freezer` | Dashboard. Bucketed by Expired / Approaching / Recently Added. Grouped by freezer. |
| `/freezer/add` | Add-item form. Accepts `?freezerId=<id>` query param (NFC entry). |
| `/freezer/[id]` | Items in one freezer. Lists active items, filterable. Audit entry point. |
| `/freezer/[id]/audit` | Audit walk-through for one freezer. Direct deep link (NFC entry). |
| `/settings` | Existing settings page; gains a Freezer card (categories, window, ntfy). |

Top nav gets a `Freezer` link inserted between `Shopping Lists` and `Dishes` once the dashboard
exists. (Phase 1.)

### Dashboard layout (`/freezer`)

```
┌─────────────────────────────────────────────────────────┐
│ FREEZER  (3 items expiring soon)                       │
│ Last audited: Garage freezer · 32 days ago             │
├─────────────────────────────────────────────────────────┤
│ ⚠ EXPIRED — toss now             Garage freezer · 2    │
│   ▢ Salmon fillets               -4 days · 2026-05-20  │
│   ▢ Cooked lasagna               -1 day  · 2026-05-23  │
│                                                         │
│ ⏳ APPROACHING — next 14 days    Garage freezer · 4    │
│   ▢ Ground beef                  in 3 days             │
│   ▢ ...                                                 │
│                                  Kitchen freezer · 1    │
│   ▢ Bread loaf                   in 10 days            │
│                                                         │
│ ✚ RECENTLY ADDED — last 7 days   2 items               │
│   ...                                                   │
└─────────────────────────────────────────────────────────┘
```

Items are grouped first by bucket, then by freezer within each bucket. Tap on a row reveals
inline actions: *Mark Used · Mark Wasted · Edit · Move to other freezer*. The `targetUseDate` is
displayed on each row as a small muted line (*ideal by May 28*) but does not get its own bucket —
target-use is a planner input, not a user-facing urgency signal.

### Add-item flow (`/freezer/add`)

Form fields, in entry order:

1. **Freezer** — defaulted from `?freezerId` query (NFC) or last-used freezer. NFC-arrived state renders with frost tint + "from NFC tag · tap to change" hint.
2. **Name** — free text, auto-focused. Large serif input.
3. **Category** — 2-column pill grid of the 8 most-used categories. Each pill shows the category name and its `defaultLifetimeDays` as a muted mono line. A `more categories…` tail spans both columns to reveal the full list. Direct touch target — no dropdown step.
4. **Date added** — defaults to today; rendered as a chip (`Today · May 24`) with a quiet `Change` link. Rarely touched.
5. **Lifetime override** (collapsed; collapsed state shows the computed default like *"Toss by Aug 22 (90 d)"*).
6. **Notes** (collapsed).
7. **Link to a dish** (collapsed; type-ahead. Helper: *"Surfaces in planner so it's used in time."*).
8. **Link to an ingredient** (collapsed; type-ahead. Helper: *"Used in the shopping list as on-hand."*).

`tossByDate` and `targetUseDate` are shown live as the user picks category / overrides lifetime
("toss by Aug 14 · target use Jun 25"). Both are computed client-side for the preview, then
re-computed authoritatively server-side on save.

Submit → write item → redirect back to `?freezerId` if present (so a series of NFC-driven
additions feels fluid), otherwise back to `/freezer`.

### Per-freezer view (`/freezer/[id]`)

Lists all active items in one freezer sorted by `tossByDate` ascending. Filters: category,
status (default `active`). Bulk actions: *Mark used (selected)*, *Mark wasted (selected)*.
Entry point for audit mode (Phase 2).

### Audit mode (`/freezer/[id]/audit`) — Phase 2

Mobile-first walk-through. Surfaces every active item, one at a time, with three large touch
targets:

- **Still here** — leave as-is. Advance.
- **Used** — set status to `used`. Advance.
- **Wasted** — set status to `wasted`. Advance.

A small "Skip" link advances without writing. A progress indicator shows *3 / 18*. On finish,
`freezers.lastAuditedAt` is updated and the user is bounced back to `/freezer/[id]`.

If new items have been added since audit started, they appear at the end of the queue.

---

## Settings

A new Freezer card in `/settings` (existing key-value `app_settings` store; no schema migration).

| Setting key | Default | Description |
|---|---|---|
| `freezerApproachingWindowDays` | `14` | Days before `tossByDate` an item appears in "Approaching." |
| `freezerAuditOverdueDays` | `60` | Days since `lastAuditedAt` before the audit-overdue notification fires. |
| `freezerNotificationsEnabled` | `false` | Master toggle for ntfy pushes. |
| `ntfyServerUrl` | `"https://ntfy.sh"` | ntfy server base URL. |
| `ntfyTopic` | `""` | Topic on the ntfy server. Required when notifications are enabled. |
| `ntfyAuthToken` | `null` | Optional bearer token for private servers. |
| `freezerWeeklyDigestDay` | `0` | Day of week (0 = Sunday) for weekly digest. |
| `freezerWeeklyDigestHour` | `9` | Hour (0–23) for weekly digest. |

A separate "Freezer Categories" subsection in the same card lists categories with inline editing
of `defaultLifetimeDays` and an "Add category" form.

---

## NFC URL Scheme

Stable, human-readable URLs that resolve inside the same Nuxt app. Tags carry plain HTTPS URLs,
no custom schemes. Two tag types:

### 1. Add-to-freezer tag

```
https://<host>/freezer/add?freezerId=<id>
```

- Stick on / near the freezer door.
- `freezerId` is the database row id, not a slug — renaming a freezer does not invalidate the tag.
- If the freezer has been deleted: the `/freezer/add` page displays a "this freezer no longer
  exists — pick another" picker and lets the flow continue.
- If the `freezerId` param is missing entirely: the page shows the same picker.

### 2. Audit tag

```
https://<host>/freezer/<id>/audit
```

- Stick on / near the freezer door, alongside the add tag.
- Same rename-resilience: ID, not slug.
- If the freezer has been deleted: redirect to `/freezer` with a small "this audit tag points to
  a deleted freezer" toast.

### Tag content guidance (for the user, not the app)

- Encode the full HTTPS URL on the tag.
- Use the LAN hostname (or Tailscale name) the household actually browses on. The freezer module
  does not care which.
- A typical household uses two tags per freezer (one add, one audit). Three freezers = six tags.

---

## Notifications (ntfy.sh)

ntfy is reached via simple HTTPS POST. No SDK, no library — `fetch` is enough. All notifications
are best-effort: if ntfy is unreachable, the failure is logged and the scheduled task moves on.

### Triggers

| Trigger | Cadence | Schedule | Body |
|---|---|---|---|
| **Expiry check** | Daily | `0 8 * * *` | "❄ N items just entered the 14-day window · K items just crossed toss-by." Includes the names of newly-entering items. |
| **Weekly digest** | Weekly | configurable day/hour | "❄ Freezer summary: A active · B approaching · C expired. Last audited: D days ago for [name]." |
| **Audit overdue** | Daily | piggybacks on the expiry-check task | "❄ [Freezer name] hasn't been audited in N days." One push per overdue freezer, with a 7-day suppression window to avoid spam. |

The expiry-check task only notifies on **transitions**: an item that *just entered* the
approaching window since the previous run, or *just crossed* its toss-by date. Items sitting in
the same bucket day after day do not generate repeated pushes. The previous-run snapshot
(`{ approachingItemIds: number[], expiredItemIds: number[] }`) is stored in `app_settings`
under `freezerExpiryLastSnapshot`; the diff against the current state determines what to send.

The expiry-check task carries the audit-overdue logic to avoid a second cron entry. Suppression
state for audit-overdue also lives in `app_settings`, keyed by `freezerId`.

The weekly digest does send unconditionally on its scheduled day/hour — it's the steady
heartbeat that catches anything the transition-based daily push might miss.

### POST shape

```
POST {ntfyServerUrl}/{ntfyTopic}
Headers:
  Title: Freezer alert
  Tags: snowflake
  Priority: 3
  Authorization: Bearer {ntfyAuthToken}    (only if set)
Body: <message text>
```

Each notification includes a click URL header that deep-links into `/freezer` so the user can
act on the push.

### Implementation

- `server/services/notificationService.ts` — generic `sendNtfy({ title, message, priority, click })`. Reusable beyond freezer.
- `server/services/freezerNotificationService.ts` — composes the messages from current freezer state.
- `server/tasks/freezer/expiry-check.ts` — daily; calls expiry check and audit-overdue check.
- `server/tasks/freezer/weekly-digest.ts` — runs every hour with an internal day-of-week / hour
  guard so the user can change the schedule from the settings UI without touching `nuxt.config.ts`.

Crons added to `nuxt.config.ts`:

```ts
nitro: {
  scheduledTasks: {
    '0 8 * * *':  ['freezer:expiry-check'],
    '0 * * * *':  ['freezer:weekly-digest'],   // hourly heartbeat; task guards by configured day+hour
  },
}
```

### When notifications are disabled

If `freezerNotificationsEnabled` is `false` or `ntfyTopic` is empty, the tasks log a one-line
skip message and return. No partial sends.

---

## JSON Export

`GET /api/freezer/export` returns a single JSON document containing every freezer, every
category, and every item (active and historical) for backup. Mirrors the structure of the
database tables. Content type `application/json`, content-disposition `attachment` with a
timestamped filename.

Lands in Phase 2 alongside audit mode — both are "I want to manage my freezer offline" features.

---

## Planner Integration

Lands in Phase 4 as a separate engine change. The freezer module exposes a stable contract; the
planner change consumes it.

### Contract

```
GET /api/freezer/planner-feed
→ {
  hints: [
    {
      dishId: number
      earliestTargetUseDate: string    // YYYY-MM-DD
      itemCount: number                // active items linked to this dish
      freezerNames: string[]           // distinct freezers holding linked items
    }
  ],
  standaloneHints: [
    {
      freezerItemId: number
      name: string                     // freezer item name, used as the one-off entry text
      targetUseDate: string            // YYYY-MM-DD
      tossByDate: string               // YYYY-MM-DD — shown alongside recommendation
      freezerName: string
    }
  ]
}
```

- `hints` — one entry per dish, deduplicated across items. Only active items with a non-null
  `dishId`. If three items in two freezers link to the same dish, that dish gets one hint whose
  `earliestTargetUseDate` is the earliest among them and whose `freezerNames` is the union.
- `standaloneHints` — one entry per active item with a **null `dishId`**, ordered by
  `targetUseDate` ascending. These are surfaced as manual-add recommendations in the planner;
  the user adds them to the calendar as one-off entries. Used / wasted items are excluded.

### Engine consumption

The planning engine accepts a new optional input:

```typescript
freezerHints?: Map<number /* dishId */, {
  earliestTargetUseDate: string
  itemCount: number
}>
```

`planningEngineService.computeScore` is extended with a new multiplicative factor:

```
freezerUrgency  = freezerUrgencyMultiplier(slotDate, hint?.earliestTargetUseDate)
score           = selectionWeight × seasonMultiplier × diversityFactor × freezerUrgency
```

Where:

```
function freezerUrgencyMultiplier(slot, target) {
  if (!target) return 1.0
  const diff = daysBetween(slot, target)    // positive if slot is before target, negative if after
  if (diff > dish.targetIntervalDays) return 1.0   // far from target — no boost
  if (diff <= 0) return 3.0                        // slot at or past target — strong pull
  // linear ramp from 1.0 → 2.0 across the target-interval window
  return 1.0 + (1.0 - diff / dish.targetIntervalDays)
}
```

The clamp at 3.0 mirrors `selectionWeight`'s existing cap — a single linked item shouldn't be
able to dominate the whole week.

> **"Whichever is sooner."** When a dish would naturally be picked because of overdueness, and
> it also has a freezer hint, the engine picks the slot that maximizes urgency: a normal
> overdueness-driven placement with `freezerUrgency = 1.0` competes against a freezer-driven
> placement with a higher multiplier. The weighted-random math naturally favors whichever date
> is more urgent, which is what *"use the freezer item use date or the dish use date, whichever
> is sooner"* maps to in the engine's idiom.

### Standalone item recommendations

The planner UI surfaces `standaloneHints` as a sidebar or inline recommendation list alongside
the normal planning flow — *"❄ You have [item name] in the freezer — add it to a day?"* with a
one-tap "Add" action. Tapping Add drops a one-off entry onto the selected date/meal slot with the
freezer item's name as text and the `freezerItemId` set on the entry. The entry behaves exactly
like any other one-off (no dish cooldown, no scoring) except it carries the freezer link for the
❄ badge and the mark-used affordance.

The standalone recommendations are shown in order of urgency (`targetUseDate` ascending, with
items past `targetUseDate` shown first). Items that already have a one-off entry linking to them
in the current calendar week are filtered out of the recommendation list to avoid duplicate
nudges.

### Calendar display

Plan entries for dishes with active linked freezer items display a small ❄ badge on the chip.
One-off entries with a `freezerItemId` also display a ❄ badge. Both are driven by the same
`planner-feed` query, called from the calendar pages.

### Auto-clear on cook

When a `fresh` Plan Entry for a dish is committed (planning-mode finalize, manual add, or move),
the freezer module does *not* automatically mark the linked item as used. The user marks items
manually from the dashboard or audit — the planner is suggesting, not consuming. This avoids
ambiguity when a dish has multiple linked items (which one got cooked?).

A small reminder appears on the calendar chip's hover/long-press: *"❄ From freezer — mark
[item name] as used?"* with a one-tap action.

---

## API Surface

REST routes, all under `/api/freezer*`. Conventions match existing modules.

```
GET    /api/freezers                       # List freezers
POST   /api/freezers                       # Create
GET    /api/freezers/[id]                  # Get one (incl. lastAuditedAt)
PATCH  /api/freezers/[id]                  # Rename
DELETE /api/freezers/[id]                  # Delete (rejects if has active items)

GET    /api/freezer-categories             # List categories
POST   /api/freezer-categories             # Create
PATCH  /api/freezer-categories/[id]        # Rename / change defaultLifetimeDays
DELETE /api/freezer-categories/[id]        # Delete (rejects if has active items)

GET    /api/freezer-items?freezerId=&status=&categoryId=    # Filterable list
GET    /api/freezer-items/dashboard        # Bucketed payload for the dashboard
POST   /api/freezer-items                  # Create (computes tossByDate + targetUseDate server-side)
GET    /api/freezer-items/[id]
PATCH  /api/freezer-items/[id]             # Edit (does not recompute targetUseDate)
DELETE /api/freezer-items/[id]             # Hard delete (rare; status changes preferred)
POST   /api/freezer-items/[id]/use         # Mark used
POST   /api/freezer-items/[id]/waste       # Mark wasted

POST   /api/freezers/[id]/audit-complete   # Sets lastAuditedAt = now; called when audit finishes

GET    /api/freezer/export                 # JSON export of everything
GET    /api/freezer/planner-feed           # Planner consumption contract (Phase 4)
```

Zod schemas live in `shared/schemas/freezer.ts` and are reused on both sides.

Query keys (`app/composables/queryKeys.ts`):

```ts
freezers: {
  all: () => ['freezers'] as const,
  detail: (id: number) => ['freezers', id] as const,
},
freezerCategories: {
  all: () => ['freezer-categories'] as const,
},
freezerItems: {
  all: () => ['freezer-items'] as const,
  list: (filters?: Record<string, unknown>) => ['freezer-items', 'list', filters] as const,
  detail: (id: number) => ['freezer-items', id] as const,
  dashboard: () => ['freezer-items', 'dashboard'] as const,
},
freezerPlannerFeed: {
  all: () => ['freezer', 'planner-feed'] as const,
},
```

---

## Component Breakdown

Phase 1:

- `app/pages/freezer/index.vue` — dashboard.
- `app/pages/freezer/add.vue` — add-item form (reads `?freezerId`).
- `app/pages/freezer/[id].vue` — per-freezer list.
- `app/components/FreezerItemRow.vue` — single row with inline actions.
- `app/components/FreezerItemForm.vue` — shared form used by add and edit.
- `app/components/FreezerCategorySelect.vue` — dropdown with inline-create.
- `app/components/FreezerDashboardBucket.vue` — Expired / Approaching / Recently Added column.

Phase 2 adds:

- `app/pages/freezer/[id]/audit.vue` — audit walk-through.
- `app/components/FreezerAuditCard.vue` — the per-item three-button card.

Phase 3 adds nothing new in components (notifications are server-side); just the Settings card additions.

Phase 4 adds:

- A `❄` badge variant on `PlanEntryChip.vue` driven by the planner-feed query.
- Per-row "mark from freezer as used" affordance on calendar chips.

---

## Phased Build Plan

> Each phase is independently shippable and usable. Phase 1 alone is a complete freezer log.

### Phase 1 — Freezer Core (Milestone 14)

CRUD for freezers, categories, and items. The dashboard. No audit, no NFC, no notifications, no
planner change.

- Schema migration: `freezers`, `freezer_categories`, `freezer_items`. Seed default categories.
- Services: `freezerService`, `freezerCategoryService`, `freezerItemService`.
- API routes (see [API Surface](#api-surface), minus audit / export / planner-feed).
- Pages: `/freezer`, `/freezer/add`, `/freezer/[id]`.
- Add `Freezer` to top nav between `Shopping Lists` and `Dishes`.
- Settings: Freezer card with approaching-window + categories editor (categories CRUD via the
  existing Freezer settings UI).
- Tests: service unit tests for `tossByDate` / `targetUseDate` computation and status
  transitions; API validation; dashboard bucketing.

### Phase 2 — Audit Mode, NFC, Export (Milestone 15)

- Audit page + per-freezer `lastAuditedAt` writes.
- `/freezer/add?freezerId=<id>` and `/freezer/[id]/audit` deep-link handling for NFC.
- JSON export endpoint.
- Document the NFC scheme in the README and `docs/`.
- Tests: audit transitions, lastAuditedAt persistence, export shape.

### Phase 3 — Notifications (Milestone 16)

- `notificationService` (generic ntfy POST).
- `freezerNotificationService` (message composition).
- Settings additions: ntfy URL/topic/token, enable toggle, weekly digest day/hour, audit-overdue
  threshold.
- Scheduled tasks: `freezer:expiry-check` (daily, includes audit-overdue), `freezer:weekly-digest`
  (hourly heartbeat with internal day/hour guard).
- Tests: message composition, scheduled-task guards, ntfy POST fallback when unreachable.

### Phase 4 — Planner Integration (Milestone 17)

- `GET /api/freezer/planner-feed` endpoint — returns both `hints` (dish-linked) and
  `standaloneHints` (no dish link), ordered by urgency.
- Engine: `planningEngineService.computeScore` accepts `freezerHints`; new
  `freezerUrgencyMultiplier`.
- Calendar: ❄ badge on `PlanEntryChip` for dish entries with active linked freezer items, and
  for one-off entries with a `freezerItemId`.
- Standalone recommendations UI: surfaces `standaloneHints` with one-tap "Add" to drop a
  one-off calendar entry linked to the freezer item.
- `plan_entries.freezerItemId` FK: allows one-off entries to carry a freezer item link.
- "Mark from freezer as used" inline action on the calendar chip (both dish entries and
  freezer-linked one-off entries).
- Tests: feed dedup by dish, standalone hints ordering, multiplier curve at key dates (far /
  at-target / past-target), engine end-to-end pulling a freezer-linked dish forward, one-off
  entry creation with freezerItemId, recommendation filtering for already-linked weeks.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Add an item dated in the future | Allowed (e.g. logging something the user is about to freeze). `tossByDate`/`targetUseDate` compute forward from `addedAt` as normal. |
| `lifetimeDaysOverride` set, then category changes later | Override wins (it's a per-item value). `tossByDate`/`targetUseDate` are not recomputed. |
| Category default lifetime is edited later | Existing items keep their original `tossByDate`/`targetUseDate`. Future items use the new default. |
| Linked Dish is deleted | `dishId` set to NULL via cascade; item remains. Planner feed stops including the (now-orphaned) hint. |
| Linked Canonical Ingredient is merged | `canonicalIngredientId` repointed to the merge target by the existing merge service (small addition required). |
| Freezer deleted while items present | API rejects with `409`. UI offers "move all to another freezer" first. |
| Category deleted while items present | API rejects with `409`. UI offers "move all to another category" first. |
| Audit interrupted mid-walkthrough | All decisions made so far persist immediately (one write per decision). Resuming the URL picks up where the user left off; unfinished items are still in `active` state. `lastAuditedAt` is only updated on explicit "finish." |
| ntfy server unreachable | Task logs a single warning and returns success. No retry; the next scheduled run picks it up. The transition snapshot is **not** updated on send failure, so the missed transitions get retried on the next run. |
| User toggles notifications off mid-week | Next scheduled task run sees the disabled flag and skips. No "drain queue" — there is no queue. |
| Item enters the approaching window, exits via mark-used, then a new item enters the same window | Each entry is a fresh transition relative to the prior snapshot — both notify. The snapshot tracks ids, not counts. |
| NFC tag points to a deleted freezer | Add page: freezer-picker is shown with a note. Audit page: redirect to `/freezer` with a toast. |
| Plan-entry-driven freezer auto-use | Not in v1. The planner suggests; the user marks. |
| One-off entry's linked freezer item deleted | `freezerItemId` set to NULL via cascade; entry survives as a plain one-off. ❄ badge disappears; "mark as used" affordance disappears. |
| Standalone freezer item already linked to a plan entry this week | Filtered from the recommendation list for that week to avoid duplicate nudges. The item still appears on the dashboard. |
