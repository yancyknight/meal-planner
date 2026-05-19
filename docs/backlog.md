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

- `[ ]` Initialize Nuxt 4 project with `app/` directory structure
- `[ ]` Install and configure Tailwind CSS v4
- `[ ]` Install and configure TanStack Query (`@tanstack/vue-query`)
- `[ ]` Install Drizzle ORM + drizzle-kit + better-sqlite3; create DB connection with WAL mode
- `[ ]` Create empty `server/database/schema.ts`; configure drizzle-kit; add `db:*` scripts to `package.json`
- `[ ]` Create base app layout: header with nav links (Dishes, Calendar, Planning, Shopping Lists, Ingredients, Settings)
- `[ ]` Create `app/composables/queryKeys.ts` (empty, structure only)
- `[ ]` Create `shared/schemas/` and `shared/types/` directories with placeholder files
- `[ ]` Write `Dockerfile` and `compose.yaml`; confirm container builds and `/data` volume mounts correctly
- `[ ]` Write `.env.example`
- `[ ]` Confirm `pnpm dev` runs and `pnpm build` succeeds
- `[ ]` Use the github cli to create a repo, init a local repo, set the remote repo, and commit and push everything

---

## Milestone 1 — Dish Library (Core CRUD)
*The central entity. Required before ingredients, tags, calendar, or planning.*

- `[ ]` Add `dishes` table to schema; generate and run migration
- `[ ]` Implement `dishService`: create, getById, list (with basic filters), update, delete, archive/unarchive
- `[ ]` API routes: `GET /api/dishes`, `POST /api/dishes`, `GET /api/dishes/[id]`, `PATCH /api/dishes/[id]`, `DELETE /api/dishes/[id]`
- `[ ]` Zod schemas for dish create/update in `shared/schemas/`
- `[ ]` Dish list page (`/dishes`): display cards, search by name, archived toggle
- `[ ]` Dish detail page (`/dishes/[id]`): all fields displayed
- `[ ]` Dish create/edit form (`/dishes/new`, `/dishes/[id]/edit`): all fields, allergen multi-select, season multi-select, difficulty select
- `[ ]` Image upload: `POST /api/images`, `GET /api/images/[filename]`; local path stored on dish
- `[ ]` Unit tests: dishService logic; API route validation tests

---

## Milestone 2 — Tags
*Small, but needed before recipe import and planning filters.*

- `[ ]` Add `tags` and `dish_tags` tables; migration
- `[ ]` Tag creation inline in dish form (type to create or select existing)
- `[ ]` Tag display on dish cards and detail
- `[ ]` Filter dishes by tag in list view
- `[ ]` Tests: tag creation, dish-tag association, filter query

---

## Milestone 3 — Canonical Ingredients + Dish Ingredients
*Needed before shopping lists and planning can reference ingredients.*

- `[ ]` Add `canonical_ingredients` and `dish_ingredients` tables; migration
- `[ ]` Install fuse.js; implement fuzzy match suggestion in `ingredientService`
- `[ ]` Dish ingredient editor on dish create/edit form: raw text input → fuzzy suggestion → canonical link or create new
- `[ ]` Ingredient management page (`/ingredients`): list all canonicals, rename, merge, set Walmart URL, view linked dishes
- `[ ]` API routes for canonical ingredients and dish ingredients
- `[ ]` Tests: fuzzy match threshold behavior, merge logic, cascade behavior

---

## Milestone 4 — Recipe Auto-Import
*Depends on Dish CRUD and Ingredients being in place to populate.*

- `[ ]` Implement `recipeImportService`: fetch URL server-side, JSON-LD parse, OG fallback, HTML heuristic fallback
- `[ ]` `POST /api/dishes/import { url }` route
- `[ ]` Import UI: URL input on dish create page; prefills form on success; user reviews before saving
- `[ ]` Tests: mock fetch responses for JSON-LD, OG, and fallback cases; assert correct field mapping

---

## Milestone 5 — Calendar + Plan Entries
*Depends on Dish CRUD. Core calendar view and basic plan entry management.*

- `[ ]` Add `plan_entries` table; migration
- `[ ]` Implement `planEntryService`: create, delete, list by date range; leftover indicator logic
- `[ ]` API routes: `GET /api/plan-entries?start=&end=`, `POST /api/plan-entries`, `DELETE /api/plan-entries/[id]`
- `[ ]` Calendar page (`/calendar`): week view (default), month view, day view
- `[ ]` "Add to plan" dialog: dish search/select or one-off text; meal type selector; guest count
- `[ ]` Leftover indicator on plan entries where yield exceeds household + guest count
- `[ ]` Tests: plan entry CRUD, leftover calculation, date range queries

---

## Milestone 6 — App Settings
*Small. Unblocks leftover calculation (householdSize) and is needed before planning mode.*

- `[ ]` Add `app_settings` table; seed defaults; migration
- `[ ]` `GET /api/settings`, `PATCH /api/settings` routes
- `[ ]` Settings page (`/settings`): household size input, app name input
- `[ ]` Tests: settings read/write, default seeding

---

## Milestone 7 — Dish Weight & Nudge System
*Depends on Dish CRUD. Needed before planning mode's suggestion engine.*

- `[ ]` `weight` and `minIntervalDays` fields already in schema (added in M1); this milestone wires up the UI and engine logic
- `[ ]` Implement effective weight calculation in `planningEngineService` (isolated, pure function — easy to unit test)
- `[ ]` Nudge controls UI on dish detail/edit: weight slider, exclude toggle, "how often" dropdown, boost button
- `[ ]` Dish detail: show planning stats (times made, last made date, days since last made)
- `[ ]` Tests: effective weight formula across all factor combinations; edge cases (never made, interval not yet elapsed, interval elapsed)

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
*Most complex feature. Depends on almost everything above. Split into three sessions.*

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
- `[ ]` Step 4: filter UI (time, difficulty, tags, allergens, season, min weight)
- `[ ]` Step 5: composition rule builder (add/remove rules, date + meal type + tag/ingredient constraint)
- `[ ]` Composition rule conflict detection (warn if filters exclude all dishes matching a rule's constraint)
- `[ ]` Step 6: leftover suggestion UI (per-dinner entry, opt-in toggle for next-day lunch)
- `[ ]` Tests: filter application against dish pool, composition rule validation, leftover eligibility detection

### Session C — Steps 7–8 (Draft Generation, Reroll, Finalize)
- `[ ]` Implement full Draft Plan generation in `planningEngineService`: slot iteration, filter + rule application, best-effort rule relaxation with warning labels, weighted random selection, used-dish tracking
- `[ ]` Step 7: draft review UI — per-slot dish display, reroll button, reroll depletion warning, override (manual pick), clear slot
- `[ ]` Step 8: finalize summary + confirm; write all entries to calendar; delete session
- `[ ]` Tests: generation algorithm (weighted selection distribution, best-effort relaxation, depletion handling), finalize write logic, session cleanup on finalize

---

## Milestone 10 — Polish & Edge Cases
*After all features are working. One or more sessions.*

- `[ ]` Dish list: sort options (last made, weight), advanced filter panel
- `[ ]` Calendar: navigate to arbitrary date, keyboard shortcuts
- `[ ]` Prevent dish delete when plan entries exist (should already be in M1 — verify UX is clear)
- `[ ]` Empty states for all list views
- `[ ]` Mobile layout review and fixes
- `[ ]` Error boundary handling (import failures, network errors in shopping list generation)
- `[ ]` Accessibility pass (keyboard nav, aria labels on interactive components)

---

## Notes on Session Sizing

If a milestone feels too large mid-session, it's fine to split it. Common split points:
- "API + service" as one session, "UI" as the next
- Planning Mode is already pre-split — don't try to do more than one session of it at once

The scaffold (M0) is the one session where you want everything fully working before moving on.
If Docker or Drizzle setup is taking a full session by itself, that's normal — don't rush it.
