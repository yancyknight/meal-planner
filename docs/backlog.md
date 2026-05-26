# Backlog

Ordered list of features to build. Work top to bottom — later milestones have dependencies on earlier ones.
Each line is roughly one Claude Code session. Complex milestones note where to split.

Update status as sessions complete:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Milestone 0 — Project Scaffold
*Everything else depends on this. Do this first and get it clean before any features.*

- `[x]` Initialize Nuxt 4 project with `app/` directory structure
- `[x]` Install and configure Tailwind CSS v4
- `[x]` Install and configure TanStack Query (`@tanstack/vue-query`)
- `[x]` Install Drizzle ORM + drizzle-kit + better-sqlite3; create DB connection with WAL mode
- `[x]` Create empty `server/database/schema.ts`; configure drizzle-kit; add `db:*` scripts to `package.json`
- `[x]` Create base app layout: header with nav links (Dishes, Calendar, Planning, Shopping Lists, Ingredients, Settings)
- `[x]` Create `app/composables/queryKeys.ts` (empty, structure only)
- `[x]` Create `shared/schemas/` and `shared/types/` directories with placeholder files
- `[x]` Write `Dockerfile` and `compose.yaml`; confirm container builds and `/data` volume mounts correctly
- `[x]` Write `.env.example`
- `[x]` Confirm `pnpm dev` runs and `pnpm build` succeeds
- `[x]` Use the github cli to create a repo, init a local repo, set the remote repo, and commit and push everything

---

## Milestone 1 — Dish Library (Core CRUD)
*The central entity. Required before ingredients, tags, calendar, or planning.*

- `[x]` Add `dishes` table to schema; generate and run migration
- `[x]` Implement `dishService`: create, getById, list (with basic filters), update, delete, archive/unarchive
- `[x]` API routes: `GET /api/dishes`, `POST /api/dishes`, `GET /api/dishes/[id]`, `PATCH /api/dishes/[id]`, `DELETE /api/dishes/[id]`
- `[x]` Zod schemas for dish create/update in `shared/schemas/`
- `[x]` Dish list page (`/dishes`): display cards, search by name, archived toggle
- `[x]` Dish detail page (`/dishes/[id]`): all fields displayed
- `[x]` Dish create/edit form (`/dishes/new`, `/dishes/[id]/edit`): all fields, allergen multi-select, season multi-select, difficulty select
- `[x]` Image upload: `POST /api/images`, `GET /api/images/[filename]`; local path stored on dish
- `[x]` Unit tests: dishService logic; API route validation tests

---

## Milestone 2 — Tags
*Small, but needed before recipe import and planning filters.*

- `[x]` Add `tags` and `dish_tags` tables; migration
- `[x]` Tag creation inline in dish form (type to create or select existing)
- `[x]` Tag display on dish cards and detail
- `[x]` Filter dishes by tag in list view
- `[x]` Tests: tag creation, dish-tag association, filter query

---

## Milestone 3 — Canonical Ingredients + Dish Ingredients
*Needed before shopping lists and planning can reference ingredients.*

- `[x]` Add `canonical_ingredients` and `dish_ingredients` tables; migration
- `[x]` Install fuse.js; implement fuzzy match suggestion in `ingredientService`
- `[x]` Dish ingredient editor on dish create/edit form: raw text input → fuzzy suggestion → canonical link or create new
- `[x]` Ingredient management page (`/ingredients`): list all canonicals, rename, merge, set Walmart URL, view linked dishes
- `[x]` API routes for canonical ingredients and dish ingredients
- `[x]` Tests: fuzzy match threshold behavior, merge logic, cascade behavior

---

## Milestone 3.5 — Dish Suggestion Field Refactor ✅
*Aligns existing dish schema/code with the new frequency-control model (see `docs/spec.md` §5). Pure refactor — no user-facing nudge UI yet; that lands in M7.*

- `[x]` Schema migration: drop `weight` and `minIntervalDays` from `dishes`; add `cooldownDays` (integer NOT NULL DEFAULT 7), `targetIntervalDays` (integer NOT NULL DEFAULT 14), `excludedFromSuggestions` (integer NOT NULL DEFAULT 0)
- `[x]` Update `shared/schemas/dish.ts`: swap fields; add `.refine(cooldownDays ≤ targetIntervalDays)` validation
- `[x]` Update `shared/types/dish.ts`: swap field types
- `[x]` Update `server/services/dishService.ts` create/update field handling
- `[x]` Update `app/components/DishForm.vue` form state (just the field swap; no new UI controls — M7 builds those)
- `[x]` Update `app/pages/dishes/[id]/index.vue`: remove the "Weight" / "Min interval" display lines; show plain "Cooldown: X days · Target: Y days" until M7 replaces with proper UI
- `[x]` Update `test/unit/dishService.test.ts`: replace weight/minIntervalDays assertions with the new fields; verify default values; verify Zod refinement rejects `cooldown > target`
- `[x]` Verify `pnpm typecheck`, `pnpm lint`, and `pnpm test` are clean

---

## Milestone 3.6 — UI Uplift to Design System ✅
*Establish design tokens and bring existing pages into the same visual voice. See `docs/design-system.md`.
Acceptance is "consistent with each other and the design direction" — not pixel-perfect to the PDF.*

- `[x]` Add fonts — Playfair Display + Inter + JetBrains Mono (or close substitutes). Self-host or use a CDN; document the choice.
- `[x]` Define Tailwind v4 `@theme` tokens in `app/assets/css/main.css` from the palette / typography / spacing tables in `docs/design-system.md`
- `[x]` Apply base background, body font, and serif headline treatment globally
- `[x]` Refactor `app/layouts/default.vue`: centered nav with active-pill, brand mark with italic "for two", date in top-right
- `[x]` Refactor `app/pages/dishes/index.vue` (dish list): card grid, eyebrow + serif headline, search/filter controls in pills
- `[x]` Refactor `app/pages/dishes/[id]/index.vue` (dish detail): two-column layout, stat row, ingredient table, recent appearances list, source link, frequency controls (using whatever fields exist — full nudge UI is M7)
- `[x]` Refactor `app/pages/dishes/new.vue` and `app/pages/dishes/[id]/edit.vue` form chrome
- `[x]` Refactor `app/components/DishForm.vue` field styling: pills for difficulty / allergen / season, soft borders, eyebrow labels
- `[x]` Refactor `app/pages/ingredients/*` to match
- `[x]` Screenshot pass — open every existing page, confirm consistency with each other; flag any drift from the direction in the PR description for user feedback
- `[x]` Iterate based on user feedback before considering this milestone closed

---

## Milestone 4 — Recipe Auto-Import ✅
*Depends on Dish CRUD and Ingredients being in place to populate.*

- `[x]` Implement `recipeImportService`: fetch URL server-side, JSON-LD parse, OG fallback, HTML heuristic fallback
- `[x]` `POST /api/dishes/import { url }` route
- `[x]` Import UI: URL input on dish create page; prefills form on success; user reviews before saving
- `[x]` Tests: mock fetch responses for JSON-LD, OG, and fallback cases; assert correct field mapping

---

## Milestone 5 — Calendar + Plan Entries ✅
*Depends on Dish CRUD. Core calendar view and basic plan entry management.*

- `[x]` Add `plan_entries` table (including `entryKind` column with values `'fresh' | 'leftover' | 'one-off'` defaulting to `'fresh'`, plus the partial index `idx_plan_entries_dish_fresh`); migration
- `[x]` Implement `planEntryService`: create (with entryKind), delete, list by date range; leftover indicator logic; `daysSinceLastServedFresh(dishId, beforeDate)` helper that scans only `entryKind = 'fresh'` rows
- `[x]` Zod schema enforces entryKind/dishId/oneOffText correspondence (see `docs/data-model.md` plan_entries check)
- `[x]` API routes: `GET /api/plan-entries?start=&end=`, `POST /api/plan-entries`, `DELETE /api/plan-entries/[id]`
- `[x]` Calendar page (`/calendar`): week view (default), month view, day view. Visually distinguish leftover entries (↻ badge in violet) from fresh entries.
- `[x]` "Add to plan" dialog: dish search/select or one-off text; meal type selector; guest count. Manual leftover creation is allowed (toggle: "this is a leftover serving").
- `[x]` Leftover indicator on fresh plan entries where yield exceeds household + guest count
- `[x]` Tests: plan entry CRUD across all three entryKinds, leftover calculation, date range queries, `daysSinceLastServedFresh` ignoring leftover entries

---

## Milestone 6 — App Settings ✅
*Small. Unblocks leftover calculation (householdSize) and is needed before planning mode.*

- `[x]` Add `app_settings` table; seed defaults; migration
- `[x]` `GET /api/settings`, `PATCH /api/settings` routes
- `[x]` Settings page (`/settings`): household size input, app name input
- `[x]` Tests: settings read/write, default seeding

---

## Milestone 6.5 — Plan Entry Edit + Settings Cleanup ✅
*Adds remove/move for planned dishes on the calendar, and strips the now-unused app-name setting. Build with touch in mind — M6.6 will validate everything else on mobile.*

### Plan entry edit
- `[x]` Add `planEntryService.update(id, patch)`; allow patching `date`, `mealType`, `guestCount`. Preserve `entryKind`/`dishId`/`oneOffText`.
- `[x]` `PATCH /api/plan-entries/[id]` route + Zod schema (partial of the create schema, excluding `entryKind`/`dishId`/`oneOffText`).
- `[x]` Make the chip remove button always visible on `PlanEntryChip` (drop the `group-hover:flex` gating) — small `×` corner button with ≥32px touch target.
- `[x]` Install `vue-draggable-plus`; wire drag-and-drop in week view so chips can be dragged between (date, mealType) slots. Optimistically update, invalidate on settle.
- `[x]` Touch/keyboard fallback: each chip exposes a **Move…** action (chip menu or long-press) that opens a slot picker dialog (date + meal type) to reassign without dragging.
- `[x]` Day view: add **Move…** affordance to each chip (single-column drag is unnecessary).
- `[x]` Month view: out of scope — tapping drills to day view where edit works.
- `[x]` Tests: PATCH zod rejects forbidden field changes; service `update` preserves `entryKind`/`dishId`; cross-slot move invalidates correct query keys.

### App name cleanup
- `[x]` Remove the "App name" card from `/settings` and drop `appName` from the form state.
- `[x]` Remove `appName` from the `PATCH /api/settings` accepted body (schema-level).
- `[x]` Leave the `app_name` column in `app_settings` (avoids a migration); service simply stops reading/writing it.
- `[x]` Remove `NUXT_PUBLIC_APP_NAME` from runtime config, `nuxt.config.ts`, `.env.example`, and the env-var table in `CLAUDE.md`.
- `[x]` Hardcode `"Meal Planner"` in `app/layouts/default.vue` (the italic *for two* stays).
- `[x]` Tests: settings PATCH ignores/rejects an `appName` field; GET still returns persisted values for `householdSize`.

---

## Milestone 6.6 — Mobile-Responsive UI Pass ✅
*Make every page usable on a phone, including a best-effort responsive layout for planning mode. Acceptance: usable at 375px wide without horizontal scroll except where explicitly intentional.*

- `[x]` **Nav/header:** collapse links into a hamburger sheet under ~640px; brand mark stays visible; today's date moves into the sheet or is dropped on small screens.
- `[x]` **Calendar week view:** the 8-column table doesn't fit phones — switch to a single-column day-stacked layout on small screens (each day shows its meal rows). Re-test DnD/Move in that layout.
- `[x]` **Calendar month view:** verify legibility; reduce per-cell entry previews from 3 → 1 on small screens; ensure the day-number bubble still fits.
- `[x]` **Calendar day view:** verify; confirm meal cards stack cleanly and **Move…** dialog is reachable.
- `[x]` **Dishes list / detail / new / edit:** card grid → single column on small screens; verify ingredient editor input, allergen/season pill wrap, image upload on touch.
- `[x]` **Ingredients page:** table → stacked cards on small screens; rename/merge/Walmart-URL controls reachable.
- `[x]` **Shopping lists:** not yet built (M8). Add a note to M8 to design responsive from the start instead of retrofitting.
- `[x]` **Dialogs** (`AddPlanEntryDialog`, the new slot-picker from M6.5): full-screen sheet on mobile, easy dismiss, no inner scroll traps.
- `[x]` **Planning wizard (`/planning/[id]`):** best-effort responsive — step indicator wraps or collapses, each step's controls stack vertically on small screens, draft review's per-slot UI usable on touch. Wizard is not yet built (M9); this is a constraint on M9, not retrofit.
- `[x]` **Touch targets:** any interactive control under 32px (chip `×`, calendar arrows, view toggle pills) bumped to ≥40px hit area on small screens.
- `[x]` **Verification:** resize browser to 375px and walk every existing page; smoke-test on a real phone against the docker port-3001 dev server; capture before/after screenshots for the PR.

---

## Milestone 7 — Frequency Controls (Nudge System) ✅
*Depends on Dish CRUD (M1) + Suggestion Field Refactor (M3.5) + Plan Entries (M5, for the `daysSinceLastServedFresh` helper). Needed before Planning Mode's suggestion engine.*

- `[x]` Schema fields already exist (added in M3.5): `cooldownDays`, `targetIntervalDays`, `excludedFromSuggestions`. This milestone wires up the UI and the selection-weight calculation.
- `[x]` Implement `selectionWeight(dish, slotDate, daysSinceLastServedFresh)` in `planningEngineService` as a pure function — easy to unit test. Formula: `min(daysSinceFresh / targetIntervalDays, 3.0)`. Never-served dishes use `daysSinceFresh = 1.5 × targetIntervalDays`.
- `[x]` Implement `isEligibleForSlot(dish, slotDate, daysSinceLastServedFresh)` — checks `excludedFromSuggestions = false`, not archived, and `daysSinceLastServedFresh ≥ cooldownDays`.
- `[x]` Nudge controls UI on dish detail/edit:
   - Frequency preset dropdown (Weekly / Biweekly / Monthly / Quarterly / Custom) sets both fields together
   - "Custom" reveals numeric inputs for `targetIntervalDays` and `cooldownDays`; cooldown defaults to `ceil(target / 2)` when switching to Custom
   - "Exclude from suggestions" toggle sets `excludedFromSuggestions`; greys (but does not hide) the frequency inputs while active
- `[x]` Dish detail: show planning stats — times cooked fresh, last cooked date, days since last cooked fresh (driven by the M5 `daysSinceLastServedFresh` helper)
- `[x]` Tests for `selectionWeight` and `isEligibleForSlot`:
   - never-served dish → overdueness 1.5, selection weight 1.5
   - just out of cooldown → eligible, selection weight < 1.0
   - exactly at target → selection weight 1.0
   - 5× overdue → selection weight capped at 3.0
   - still in cooldown → ineligible (regardless of overdueness)
   - excluded dish → ineligible
   - leftover plan entries do not advance `daysSinceLastServedFresh` (integration test against M5 helper)

---

## Milestone 8 — Shopping Lists ✅
*Depends on Plan Entries and Canonical Ingredients.*

- `[x]` Add `shopping_lists` and `shopping_list_items` tables; migration
- `[x]` Implement `shoppingListService`: generate from date range, check/uncheck item, mark done, auto-delete eligibility query
- `[x]` Nitro scheduled task: `server/tasks/shopping-lists/cleanup.ts`; register in `nuxt.config.ts` with `experimental.tasks: true`
- `[x]` API routes for shopping lists and items
- `[x]` Shopping list management page (`/shopping-lists`): all lists, status badges, deletion countdown on done lists
- `[x]` Shopping list detail page (`/shopping-lists/[id]`): combined view + by-dish toggle, item checkboxes, Walmart links, mark-done button
- `[x]` Tests: list generation (ingredient grouping, rawTexts, source dish tracking), check state persistence, auto-delete timing logic, scheduled task runs

---

## Milestone 8.5 — Pre-Planning Polish ✅
*Round of bug fixes and UX polish across the shipped milestones (M1, M3, M5, M6.5, M6.6, M7, M8) collected from hands-on testing. Land before M9 so Planning Mode is built against a clean baseline. Group items by surface area when splitting into sessions.*

### Bug fixes
- `[x]` **M7 — Custom frequency reveals nothing.** Fixed: added `explicitlyCustom` local ref in `FrequencyControls.vue` so clicking Custom reliably shows numeric inputs regardless of current prop values.
- `[x]` **M3 — Dish ingredients vanish on save / when linking to canonical.** Fixed: added `isEmitting` flag to suppress watch round-trip; `emitUpdate` now emits all rows; unlinked rows auto-create a canonical ingredient on save via `POST /api/canonical-ingredients`.

### Calendar UX (M5 / M6.5)
- `[x]` **Drag-and-drop targets visible while dragging.**
- `[x]` **Subtle save feedback after drop.**
- `[x]` **Hide "Move…" button on larger screens.**
- `[x]` **Wrap or reveal long dish names on week view.**
- `[x]` **Add structure (grid lines / row banding) to week view.**
- `[x]` **All calendar views: clicking a dish chip links to the dish detail page.**

### Shopping lists (M8)
- `[x]` **Drop the shopping-list name field.** Name is optional in Zod; title renders as formatted date range everywhere. DB column kept (no migration); empty string written when not provided.
- `[x]` **Meal chips in shopping-list detail link to the dish page.**

### Navigation & home (global)
- `[x]` **Remove the welcome page; make week calendar the home.**
- `[x]` **Reorder primary nav.** New order: Calendar, Planning, Shopping Lists, Dishes, Ingredients, Settings.

### Settings — allergen visibility
- `[x]` Add `showAllergens` boolean to `app_settings` (key-value store, no migration needed).
- `[x]` Settings page: "Show allergens" toggle (default off).
- `[x]` When `showAllergens` is false: hide allergen pills on dish detail. DishCard had no allergen display. M9 must respect this — allergen filter in Planning Mode should check `showAllergens`.
- `[ ]` Tests: setting toggles; Zod validates new field. *(deferred — low risk, covered by existing settings test pattern)*

### Mobile fixes (extends M6.6)
- `[x]` **Dish detail mobile: title position.** Title now rendered at top of page on mobile (hidden in right column, shown above grid).
- `[x]` **Month view mobile: dish previews show only first letter.** Now shows 3-char abbreviation on small screens.
- `[x]` **New-shopping-list modal positioning on mobile.** Full-screen sheet on mobile, centered card on `sm+`.

---

## Milestone 8.6 — Allergen Semantic Fix ✅
*Pre-M9. Inverts the `allergens` field from "contains" to "free from" semantics so that skipping the field doesn't falsely imply allergen safety. Lays the groundwork for virtual tags in M9. See `docs/spec.md` §1 and `docs/data-model.md`.*

- `[x]` Schema migration: rename `dishes.allergens` → `dishes.freeFrom` (keep NOT NULL DEFAULT '[]'). Migration **clears existing values** (`UPDATE dishes SET freeFrom = '[]'`) — the semantic is flipping so prior data would mean the opposite.
- `[x]` Update `shared/schemas/dish.ts`: rename field; presets become `gluten-free`, `dairy-free`, `nut-free`, `shellfish-free`, `egg-free`, `soy-free`, `peanut-free`.
- `[x]` Update `shared/types/dish.ts`: rename field.
- `[x]` Update `server/services/dishService.ts` create/update/list field handling and any allergen-aware filter logic.
- `[x]` `DishForm.vue`: relabel section "Free from" with the new preset chips. Each chip clearly reads e.g. "Dairy-Free." No freeform entries in v1.
- `[x]` Dish detail page: relabel chip group; subject to existing `showAllergens` setting.
- `[x]` Dish library filter: replace "exclude allergen X" control with "must be X-free" virtual-tag style filter (use the virtual tag IDs from M9 scaffolding if landed; otherwise inline the same predicate temporarily).
- `[x]` Recipe import: do **not** auto-populate `freeFrom`. The source rarely makes that claim explicitly; safer to leave empty.
- `[x]` Tests: Zod accepts/rejects expected preset names; service round-trips; existing `dishService.test.ts` allergen assertions updated; settings `showAllergens` still hides chips on detail.

---

## Milestone 9 — Planning Mode ✅
*Most complex feature. Depends on M8.6 (free-from field) and everything above. Split into three sessions. Build each step's layout responsive from the start per the M6.6 constraint — do not retrofit. Respect the `showAllergens` setting from M8.5 — when off, hide dietary virtual tags from pickers (already-selected ones stay functional).*

**Design reference:** `docs/planning-mode.md` (4-step flow, virtual tags, pinned tags, wishlist tags, tag-overlap diversity, season multiplier).

### Session A — Session Setup + Steps 1–2 ✅
- `[x]` Add `planning_sessions` table per `docs/data-model.md` (new shape: `weekStart` (Monday date, not a range), `slotStates`, `removedPlanEntryIds`, `pendingOneOffEntries`, `sessionVirtualTags`, `pinnedTags`, `wishlistTags`, `draftPlan`, `shownDishIdsBySlot`, `leftoverToggles`); migration.
- `[x]` Implement `planningSessionService`: create, read, update step state, delete.
- `[x]` API routes for planning sessions (list, get, patch, finalize, delete).
- `[x]` Planning sessions list page (`/planning`): active sessions, resume/delete.
- `[x]` Wizard shell at `/planning/[id]`: persistent header (`Planning session #<id> — draft — auto-saved`, Discard), left sidebar with 4-step status list, footer with Back / progress / Continue. State persists on every advance.
- `[x]` **Step 1 — When & What:** week picker (Monday-anchored, prev/next arrows, contextual hint *this week / next week / in N weeks*) + meal-type toggle chips (default: Dinner only) + info banner with slot count.
- `[x]` **Step 2 — Slot Setup:** one card per day in a two-column grid (single column on mobile); per-slot state pills (`plan` / `skip` / `one-off` (+ text) / `keep` (existing entries)); bulk actions (*Skip all Plan*, *Plan all Skip*, *Keep all existing*); live state-count summary.
- `[x]` Tests: session CRUD, step state serialization, slot state transitions, removedPlanEntryIds and pendingOneOffEntries accumulation.

### Session B — Step 3 (Anchors) + Virtual Tag Scaffolding ✅
- `[x]` Implement virtual tag registry (server-side): tag IDs `v:quick`, `v:easy`, `v:dairy-free`, `v:gluten-free`, `v:nut-free`, `v:shellfish-free`, `v:egg-free`, `v:soy-free`, `v:peanut-free`. Each maps to a SQL predicate.
- `[x]` Tag-matching helper `matchesTag(dish, tagRef)`: detects `v:` prefix and applies predicate; otherwise joins on `dish_tags`.
- `[x]` Tag picker component that surfaces real + virtual tags with visual distinction (virtual chips carry a primary label + italic sub-label like `quick · ≤ 20 min`; respect `showAllergens` for dietary virtual tags).
- `[x]` **Step 3 — Anchors UI:** three optional sections:
  - Session-wide constraints (virtual tags only)
  - Pin tag to slot (date + mealType + tag, real or virtual; multiple pins allowed; AND-combined per slot)
  - Wishlist tags (real tags only)
- `[x]` Pinned-tag conflict detection: warn if a session-wide virtual tag excludes all dishes carrying a pinned/wishlist tag.
- `[x]` Tests: virtual tag predicate correctness, tag matching across real/virtual, pinned tag CRUD, wishlist tag CRUD, conflict detection.

### Session C — Step 4 (Draft, Reroll, Finalize) + Engine ✅
- `[x]` Implement full Draft Plan generation in `planningEngineService` per `docs/planning-mode.md` Algorithm: virtual-tag prefilter, pinned-slot pass first (with best-effort relaxation + warning labels), wishlist pass (uniform-random slot, weighted by `score` within tag), chronological remaining pass; weighted-random by `selectionWeight × seasonMultiplier × diversityFactor`. Honor in-draft Fresh history for cooldown.
- `[x]` Implement `reroll(slotKey)` that preserves pin/wishlist tag and honors `shownDishIdsBySlot`; depletion warning + restart prompt when exhausted.
- `[x]` **Step 4 — Draft & Finalize UI:**
  - **Vertical day-card stack:** one card per planned day, one row per selected meal type inside. Each row: meal label · colored abbreviation tile · dish name + meta line (difficulty dots · time · `yields N` · real tags · pin/wishlist chips) · right-side `Reroll · Swap · Clear` action buttons.
  - State-specific row treatments: KEPT — LOCKED (green tint, Clear-only), one-off existing/new (lavender tint), skipped (hatched, blank-on-calendar text), leftover (cream tint with `↻ from <day> dinner` origin pointer), NO MATCH (orange tint, italic reason line, full-row "Swap manually" CTA).
  - Top stat row: `15 DISHES FILLED · 1 LEFTOVER SLOT · 1 ONE-OFF · 2 KEPT · 1 SKIPPED · 1 NO ELIGIBLE DISH`. Plus an `APPLIED ·` line echoing the active anchors.
  - Inline leftover toggle on high-yield dinner rows (queues `entryKind: 'leftover'` for next-day lunch; disabled when target slot is Keep/One-off).
  - `ON CONFIRM` footer block: `N entries will be written · K kept · M left blank`
  - Confirm: writes draft + pending one-offs + leftover-queued entries; deletes `removedPlanEntryIds`; deletes session row; redirects to calendar
- `[x]` Tests: generation algorithm (selection weight × season multiplier × diversity factor distribution matches expectations; cooldown enforced across draft; pinned relaxation; wishlist placement + reroll preserves tag; depletion handling), finalize write logic with correct `entryKind` mapping, session cleanup on finalize.

---

## Milestone 10 — Polish & Edge Cases ✅
*After all features are working. One or more sessions.*

- `[x]` Dish list: sort options (last cooked fresh, target interval), advanced filter panel
- `[x]` Calendar: navigate to arbitrary date, keyboard shortcuts
- `[x]` Prevent dish delete when plan entries exist (should already be in M1 — verify UX is clear)
- `[x]` Empty states for all list views
- `[x]` Error boundary handling (import failures, network errors in shopping list generation)
- `[x]` Accessibility pass (keyboard nav, aria labels on interactive components)

---

## Milestone 11 — One-Off Dish Cooldown ✅
*Depends on M1 (dish CRUD), M7 (frequency controls), M9 (planning engine). Fixes allergen display bug (#21) and adds the one-off cooldown feature (#23).*

- `[x]` **Bug fix #21:** Dish detail page (`/dishes/[id]/index.vue`) — `freeFrom` chip display section already added in M10; confirmed present and gated by `showAllergens` setting
- `[x]` Add `dish_cooldowns` table: `id` (integer PK), `dishId` (FK → dishes, unique), `endsAt` (TEXT ISO `YYYY-MM-DD`), `createdAt`; generate and run migration
- `[x]` Implement `dishCooldownService`: `set(dishId, endsAt)` (upsert — only one per dish), `get(dishId)` → record or null, `remove(dishId)`, `isActive(record, asOf?)`, `getActiveDishIds(ids, asOf?)` (batch lookup for planning engine), `cleanup()` (deletes records where `endsAt < today`)
- `[x]` API routes: `GET /api/dishes/[id]/cooldown`, `PUT /api/dishes/[id]/cooldown` (Zod: `{ endsAt: YYYY-MM-DD, min today }`), `DELETE /api/dishes/[id]/cooldown`
- `[x]` Update `isEligibleForSlot` in `planningEngineService`: added `oneOffCooldownActive` boolean param (Option A — pure function); call sites in `generate.post.ts` and `reroll.post.ts` resolve active cooldown IDs via `getActiveDishIds` before invoking the engine
- `[x]` Dish detail page: show active one-off cooldown badge ("Paused until <date>") + Remove button; show "Set one-off cooldown" date-picker form when no cooldown is active
- `[x]` Added `server/tasks/dishes/cleanup-cooldowns.ts`; registered in `nuxt.config.ts` on daily cron
- `[x]` Tests: `dishCooldownService` set/get/remove/isActive/getActiveDishIds/cleanup (18 tests); `isEligibleForSlot` rejects dish with active one-off cooldown (2 new tests in planningEngineService.test.ts)

---

## Milestone 12 — Database Backups ✅
*Depends on M0 (Nitro task infrastructure). Standalone infrastructure feature (#25).*

- `[x]` Add env vars: `BACKUP_DIR` (default `/data/backups`); interval and retain count moved to app_settings (DB) so they are configurable from the UI without touching Docker env vars
- `[x]` Implement `server/services/backupService.ts` + `server/tasks/database/backup.ts`: uses `sqlite.backup(destination)` from `better-sqlite3`; interval guard reads `backupIntervalHours` from settings; auto-creates `BACKUP_DIR` if missing; prunes oldest files beyond `backupRetainCount`
- `[x]` Register task in `nuxt.config.ts` with `0 * * * *` hourly cron; task guards internally against interval
- `[x]` Settings page: Backups card with editable interval + retain count fields and read-only status panel (last backup, next backup, file count)
- `[x]` Tests: 10 tests covering prune behavior, correct filename format, auto-create dir, interval guard skip/run; all passing

---

## Milestone 13 — CI/CD, Deployment Template & README ✅
*Issue #26 (Docker image build) must land before #28 (deployment template) and #29 (README) can reference the image. All three are non-app-code changes.*

- `[x]` **#26 — GitHub Actions Docker build:** `.github/workflows/docker-publish.yml` — trigger on `v*.*.*` tag push; build multi-arch image (`linux/amd64` + `linux/arm64`) using `docker/build-push-action`; push to GitHub Container Registry (`ghcr.io/<owner>/<repo>`) tagged with the version and `latest`; no push on non-tag runs (build-only smoke test on `main`)
- `[x]` **#28 — Deployment compose template:** `deploy/compose.yml` — references the `ghcr.io` image; two named volumes (`meal-planner-data`, `meal-planner-backups`); Watchtower with HTTP API update trigger + daily poll fallback; `deploy/backup.sh` hot backup via throwaway Alpine container; `deploy/update.sh` Watchtower API trigger script; `deploy/README.md` explains the setup
- `[x]` **#29 — README.md:** project overview (what it does, key features, 4 screenshots); prominent disclaimer (personal/household use, no auth/authz, LAN or Tailscale VPN only, not designed for public internet); Docker quick-start using `deploy/compose.yml`; link to `docs/` for detailed spec; note that the app is opinionated/single-household and forks are welcome

---

## Milestone 14 — Freezer Core (Phase 1) ✅
*Standalone module. Independently usable as a freezer log. No NFC, no audit, no notifications, no planner change. See `docs/freezer-mode.md`.*

- `[x]` Schema: `freezers`, `freezer_categories`, `freezer_items` tables; migration; seeded category rows
- `[x]` Service: `freezerService` (CRUD; reject delete when active items present)
- `[x]` Service: `freezerCategoryService` (CRUD; first-run seed; reject delete when active items present)
- `[x]` Service: `freezerItemService` — create computes and **stores** `tossByDate` and `targetUseDate` (midpoint); status transitions; dashboard bucketing query
- `[x]` API routes for freezers, categories, items (excluding audit-complete, planner-feed)
- `[x]` Zod schemas in `shared/schemas/freezer.ts`; types in `shared/types/freezer.ts`; query keys in `app/composables/queryKeys.ts`
- `[x]` Pages: `/freezer` (dashboard with Expired / Approaching / Recently Added buckets, grouped by freezer), `/freezer/add`, `/freezer/[id]`
- `[x]` Components: `FreezerItemRow`, `FreezerItemForm`, `FreezerCategorySelect`, `FreezerDashboardBucket`
- `[x]` Add `Freezer` link to top nav between `Dishes` and `Planning`
- `[x]` Settings: Freezer card with `freezerApproachingWindowDays` input + Categories editor (rename, edit `defaultLifetimeDays`, add custom). Add the new settings keys to `settingsService.DEFAULTS` and the Zod settings schema.
- `[x]` `ingredientService.merge` extended to relink `freezer_items.canonicalIngredientId` alongside `dish_ingredients`
- `[x]` Tests: `tossByDate` / `targetUseDate` computation (incl. category default vs override); status transitions; dashboard bucketing query; merge-relink behavior

---

## Milestone 15 — Freezer Audit, NFC (Phase 2) ✅
*Adds the per-freezer audit flow and NFC-friendly deep links. Depends on M14.*

- `[x]` `freezers.lastAuditedAt` column already exists from M14; add `POST /api/freezers/[id]/audit-complete` and the service write
- `[x]` Page: `/freezer/[id]/audit` — mobile-first walk-through, three-button card per item (Still here / Used / Wasted), Skip option, progress indicator
- `[x]` Component: `FreezerAuditCard`
- `[x]` Items added mid-audit append to the queue
- `[x]` `/freezer/add` page reads `?freezerId=` query and pre-selects; handles missing/invalid id by falling back to a picker
- `[x]` `/freezer/[id]/audit` handles deleted freezer with a redirect-to-`/freezer` + toast
- `[x]` README addendum: NFC URL scheme (one add tag + one audit tag per freezer)
- `[x]` Tests: audit transitions persist per decision; `lastAuditedAt` updates only on finish; deep-link fallbacks

---

## Milestone 16 — Freezer Notifications (Phase 3)
*ntfy.sh push triggers for expiring items, weekly digest, audit-overdue. Depends on M14.*

- `[ ]` Service: `notificationService.sendNtfy({ title, message, priority, click, tags })` — fetch POST, best-effort, log and swallow errors
- `[ ]` Service: `freezerNotificationService` — composes expiry / digest / audit-overdue messages from current freezer state
- `[ ]` Task: `server/tasks/freezer/expiry-check.ts` — daily; expiry message + audit-overdue check (per-freezer suppression window via `app_settings` JSON blob to avoid spam)
- `[ ]` Task: `server/tasks/freezer/weekly-digest.ts` — hourly heartbeat; internal day-of-week + hour guard reading `freezerWeeklyDigestDay` / `freezerWeeklyDigestHour`
- `[ ]` Register both crons in `nuxt.config.ts`
- `[ ]` Settings: ntfy URL / topic / optional auth token; master "notifications enabled" toggle; weekly-digest day + hour; audit-overdue threshold days
- `[ ]` Tests: message composition (counts and dish/item names correct); scheduled-task day/hour guard; ntfy POST mock when reachable and unreachable; suppression window writes/reads
- `[ ]` Document the ntfy setup steps in the README

---

## Milestone 17 — Freezer + Planner Integration (Phase 4)
*Adds freezer urgency as a planner score multiplier. Depends on M14 and M9 (planning engine).*

- `[ ]` `GET /api/freezer/planner-feed` — returns `{ hints: [{ dishId, earliestTargetUseDate, itemCount, freezerNames }], standaloneHints: [{ freezerItemId, name, targetUseDate, tossByDate, freezerName }] }`; `hints` deduped by dish; `standaloneHints` are active items with null `dishId`, ordered by `targetUseDate` ascending
- `[ ]` `freezerItemService.getPlannerHints()` implements the dish-linked query (driven by `idx_freezer_items_dish_id`); `freezerItemService.getStandaloneHints()` implements the standalone query (driven by `idx_freezer_items_standalone`)
- `[ ]` Engine: `planningEngineService.computeScore` accepts optional `freezerHints` map; `freezerUrgencyMultiplier(slotDate, earliestTargetUseDate)` (1.0 far from target → 2.0 at target → 3.0 at-or-past, clamped)
- `[ ]` Wire `freezerHints` through `generate.post.ts` and `reroll.post.ts` (both load the feed when the engine is invoked)
- `[ ]` Schema migration: add `plan_entries.freezerItemId` (nullable FK → `freezer_items.id` ON DELETE SET NULL); add `idx_plan_entries_freezer_item_id` partial index
- `[ ]` `PlanEntryChip.vue` shows a ❄ badge for fresh entries whose dish appears in the planner feed, and for one-off entries with a non-null `freezerItemId`
- `[ ]` Standalone recommendations: inline list shown during planning (and on the calendar page) surfacing `standaloneHints` ordered by urgency; items already linked to a one-off entry in the week being planned are filtered out; one-tap Add creates a one-off entry with `freezerItemId` set
- `[ ]` Calendar chip long-press / hover action: "Mark [item name] as used" — visible only when the dish has exactly one active linked freezer item; multi-item case shows "Manage from freezer" → links to `/freezer`; also visible on one-off entries with a `freezerItemId`
- `[ ]` Tests: feed dedupes correctly (3 items, 2 freezers → 1 hint, earliest target use); standalone hints ordered by targetUseDate, already-linked items excluded for the planned week; multiplier values at key dates (target − 30 / target / target + 7); end-to-end engine test: a freezer-linked dish is pulled forward over its naturally-overdue alternative when the target date is closer; one-off entry creation with freezerItemId

---

## Post-MVP / Parking Lot

*Ideas explicitly deferred until after the core feature ships. No commitment to build.*

- **Calendar "show only freezer meals" filter.** With the ❄ chip badge in M17, a one-tap filter on the calendar that hides non-freezer entries would let the household quickly see what's already pencilled in from the freezer. Out of scope for M17 — small additive change after MVP.
- **Per-category approaching-toss-by windows.** Today the window is a single global setting. Per-category (e.g. raw fish at 3 days, ice cream at 30) is more accurate but adds settings UI.
- **Audit history per freezer.** A small log table to see "how often did we audit this freezer last year."
- **Freezer item bulk import.** CSV/JSON paste-in for first-time setup.

---

## Notes on Session Sizing

If a milestone feels too large mid-session, it's fine to split it. Common split points:
- "API + service" as one session, "UI" as the next
- Planning Mode is already pre-split — don't try to do more than one session of it at once

The scaffold (M0) is the one session where you want everything fully working before moving on.
If Docker or Drizzle setup is taking a full session by itself, that's normal — don't rush it.
