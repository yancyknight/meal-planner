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

## Milestone 8 — Shopping Lists
*Depends on Plan Entries and Canonical Ingredients.*

- `[ ]` Add `shopping_lists` and `shopping_list_items` tables; migration
- `[ ]` Implement `shoppingListService`: generate from date range, check/uncheck item, mark done, auto-delete eligibility query
- `[ ]` Nitro scheduled task: `server/tasks/shopping-lists/cleanup.ts`; register in `nuxt.config.ts` with `experimental.tasks: true`
- `[ ]` API routes for shopping lists and items
- `[ ]` Shopping list management page (`/shopping-lists`): all lists, status badges, deletion countdown on done lists
- `[ ]` Shopping list detail page (`/shopping-lists/[id]`): combined view + by-dish toggle, item checkboxes, Walmart links, mark-done button
- `[ ]` Tests: list generation (ingredient grouping, rawTexts, source dish tracking), check state persistence, auto-delete timing logic, scheduled task runs

---

## Milestone 9 — Planning Mode
*Most complex feature. Depends on almost everything above. Split into three sessions. Build each step's layout responsive from the start per the M6.6 constraint — do not retrofit.*

### Session A — Session Setup + Steps 1–3
- `[ ]` Add `planning_sessions` table; migration
- `[ ]` Implement `planningSessionService`: create, read, update step state, delete
- `[ ]` API routes for planning sessions
- `[ ]` Planning sessions list page (`/planning`): active sessions, resume/delete
- `[ ]` Wizard shell at `/planning/[id]`: step indicator, back/forward navigation, state persistence
- `[ ]` Step 1: date range + meal type selection
- `[ ]` Step 2: review existing entries (keep/remove per entry, bulk actions)
- `[ ]` Step 3: one-off event entry (add/remove free-text entries with date + meal type)
- `[ ]` Tests: session CRUD, step state serialization, step 2 entry query, step 3 one-off accumulation

### Session B — Steps 4–6 (Filters, Composition Rules, Leftover Suggestions)
- `[ ]` Step 4: filter UI (time, difficulty, tags, allergens, season) — no minimum-weight filter
- `[ ]` Step 5: composition rule builder (add/remove rules, date + meal type + tag/ingredient constraint)
- `[ ]` Composition rule conflict detection (warn if filters exclude all dishes matching a rule's constraint)
- `[ ]` Step 6: leftover suggestion UI (per-dinner entry, opt-in toggle for next-day lunch). Leftover placements are queued as `type: 'leftover'` in `draftPlan` and finalized as `entryKind: 'leftover'` plan entries.
- `[ ]` Tests: filter application against dish pool, composition rule validation, leftover eligibility detection

### Session C — Steps 7–8 (Draft Generation, Reroll, Finalize)
- `[ ]` Implement full Draft Plan generation in `planningEngineService`: chronological slot iteration, filter + cooldown eligibility + rule application, best-effort rule relaxation with warning labels, weighted-random selection by `selectionWeight` (from M7), in-draft used-dish tracking, treating already-placed Fresh slots as fresh history for later slots in the same draft
- `[ ]` Step 7: draft review UI — per-slot dish display, reroll button, reroll depletion warning, override (manual pick), clear slot. Slot warnings differentiate "no filter-matching dishes" vs "all matching dishes still in cooldown."
- `[ ]` Step 8: finalize summary + confirm; write all entries to calendar with correct `entryKind` (`'dish' → 'fresh'`, `'leftover' → 'leftover'`, `'one-off' → 'one-off'`); delete session
- `[ ]` Tests: generation algorithm (selection weight distribution matches target intervals in expectation, cooldown enforced across draft, best-effort relaxation, depletion handling), finalize write logic with correct entryKind mapping, session cleanup on finalize

---

## Milestone 10 — Polish & Edge Cases
*After all features are working. One or more sessions.*

- `[ ]` Dish list: sort options (last cooked fresh, target interval), advanced filter panel
- `[ ]` Calendar: navigate to arbitrary date, keyboard shortcuts
- `[ ]` Prevent dish delete when plan entries exist (should already be in M1 — verify UX is clear)
- `[ ]` Empty states for all list views
- `[ ]` Error boundary handling (import failures, network errors in shopping list generation)
- `[ ]` Accessibility pass (keyboard nav, aria labels on interactive components)

---

## Notes on Session Sizing

If a milestone feels too large mid-session, it's fine to split it. Common split points:
- "API + service" as one session, "UI" as the next
- Planning Mode is already pre-split — don't try to do more than one session of it at once

The scaffold (M0) is the one session where you want everything fully working before moving on.
If Docker or Drizzle setup is taking a full session by itself, that's normal — don't rush it.
