# Architecture

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Nuxt 4 | `app/` directory structure |
| Backend | Nitro (via Nuxt) | API routes in `server/api/` |
| Database | SQLite (better-sqlite3) | WAL mode; single file at `DATABASE_URL` |
| ORM | Drizzle ORM + drizzle-kit | Schema-first; migrations auto-generated |
| Client data layer | TanStack Query (`@tanstack/vue-query`) | All API interactions; no Pinia for server state |
| Styling | Tailwind CSS v4 | |
| Validation | Zod | Shared schemas in `shared/schemas/` |
| Date handling | date-fns | No moment.js, no dayjs |
| Fuzzy search | fuse.js | Ingredient deduplication suggestions |

## Database Setup

Connection singleton at `server/database/index.ts`:

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const sqlite = new Database(process.env.DATABASE_URL ?? '/data/app.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

Migrations run automatically on server startup via a Nitro plugin.

## API Layer

REST conventions for all routes:

```
GET    /api/dishes              # List with filters
POST   /api/dishes              # Create
GET    /api/dishes/[id]         # Get one
PATCH  /api/dishes/[id]         # Update
DELETE /api/dishes/[id]         # Delete (only if no plan entries)

POST   /api/dishes/import       # Auto-import from URL

GET    /api/plan-entries        # List by date range (?start=&end=)
POST   /api/plan-entries        # Create
DELETE /api/plan-entries/[id]   # Delete

GET    /api/canonical-ingredients
POST   /api/canonical-ingredients
PATCH  /api/canonical-ingredients/[id]
POST   /api/canonical-ingredients/[id]/merge  # Merge into another

GET    /api/tags
POST   /api/tags

GET    /api/shopping-lists
POST   /api/shopping-lists      # Create (generates items from date range)
GET    /api/shopping-lists/[id]
PATCH  /api/shopping-lists/[id] # Mark done, rename
DELETE /api/shopping-lists/[id]
PATCH  /api/shopping-lists/[id]/items/[itemId]  # Check/uncheck item

GET    /api/planning-sessions
POST   /api/planning-sessions
GET    /api/planning-sessions/[id]
PATCH  /api/planning-sessions/[id]  # Save step state
POST   /api/planning-sessions/[id]/finalize
DELETE /api/planning-sessions/[id]

GET    /api/settings
PATCH  /api/settings

GET    /api/images/[filename]   # Serve uploaded images
POST   /api/images              # Upload image; returns filename
```

## Service Layer

Business logic belongs in `server/services/`, not in API handlers.
API handlers: validate input → call service → return result.

Key services:
- `dishService.ts` — CRUD, archive, import orchestration
- `ingredientService.ts` — canonical ingredient management, fuzzy suggestions
- `recipeImportService.ts` — URL fetch + structured data extraction
- `planEntryService.ts` — calendar reads/writes, leftover calculations
- `planningEngineService.ts` — cooldown eligibility, selection weight (overdueness) calculation, Draft Plan generation
- `shoppingListService.ts` — list generation and item management
- `planningSessionService.ts` — session persistence and step management
- `imageService.ts` — upload, serve, and cleanup of dish images

## Scheduled Tasks

Nitro's scheduled task system (experimental — requires opt-in in `nuxt.config.ts`) is used for background maintenance. Tasks live in `server/tasks/`.

```ts
// nuxt.config.ts
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '*/15 * * * *': ['shopping-lists:cleanup']
  }
}
```

Tasks use the `defineTask` helper and call service functions directly — no HTTP layer involved. On the `node_server` preset (used in Docker), scheduling is powered by the [croner](https://croner.56k.guru/) engine internally.

## Recipe Auto-Import

`POST /api/dishes/import { url }` — server-side only (avoids CORS):

1. Fetch the URL from the server
2. Attempt JSON-LD `Recipe` schema extraction
3. Fall back to Open Graph metadata
4. Fall back to best-effort HTML heuristics (title, ingredient lists, time meta tags)

Returns a prefilled dish payload for user review. **Does not save automatically.**
The user confirms or edits all fields before the dish is created.

## Ingredient Deduplication

When a user types a new raw ingredient text on a Dish:
1. Extract the likely ingredient name (trim quantity/prep from the string)
2. Run extracted name through fuse.js against all existing Canonical Ingredient names
3. If top match score exceeds threshold, suggest it: "Did you mean: Garlic?"
4. User selects existing canonical or creates new one
5. Dish Ingredient stores both the raw text and the canonical foreign key

## Image Storage

- Uploads: `POST /api/images` → saved to `$IMAGE_DIR/{uuid}.{ext}` → returns `{ filename }`
- Serving: `GET /api/images/[filename]` → reads from `$IMAGE_DIR`
- Dish model stores `imageUrl` (external, from import) and `imageLocalPath` (local upload)
- Display priority: local > external URL

## Planning Engine

Stateless function in `planningEngineService.ts`. Inputs:

```typescript
{
  slots: { date: string, mealType: MealType, state: 'plan' | 'skip' | 'one-off' | 'keep' }[]
  sessionVirtualTags: string[]                  // virtual tag IDs (e.g. 'v:quick', 'v:dairy-free')
  pinnedTags: { date, mealType, tagRef }[]      // tagRef: real tag ID or virtual tag ID
  wishlistTags: number[]                        // real tag IDs only
  committedEntries: PlanEntry[]                 // pre-existing Fresh/Leftover entries
  shownDishIdsBySlot: Record<string, number[]>  // for reroll depletion tracking
  householdSize: number
}
```

### Per-slot eligibility

A candidate dish is eligible for a slot iff:

1. `dish.archived = false` and `dish.excludedFromSuggestions = false`
2. **Session virtual tags** — dish satisfies every selected virtual tag (hard filter)
3. **Pinned tags** — for the specific slot, dish satisfies every pin on that slot (hard filter, with best-effort relaxation if no candidate survives)
4. **Cooldown** — `daysSinceLastServedFresh(dish, slotDate) ≥ dish.cooldownDays`. The lookup considers both committed Fresh entries and already-placed Fresh slots earlier in this draft. Never-served dishes use `daysSinceFresh = 1.5 × targetIntervalDays`.

### Selection score

```
overdueness       = daysSinceFresh / dish.targetIntervalDays
selectionWeight   = min(overdueness, 3.0)
seasonMultiplier  = 1.0 if dish.season is empty (year-round)
                    1.0 if seasonOf(slot.date) ∈ dish.season
                    0.5 otherwise
diversityFactor   = 1 / (1 + tagOverlapCount)   // overlap with dishes already placed this draft
score             = selectionWeight × seasonMultiplier × diversityFactor
```

`seasonOf` always uses the slot's date, not today.

### Generation order

1. **Pinned slots first.** Process pinned slots in date order. For each: build eligible pool with the pin, weighted-random by `score`. If empty, relax pin constraints one at a time and mark the slot with a warning label.
2. **Wishlist tags.** For each wishlist tag (in user-entered order): pick one unfilled `Plan` slot uniformly at random; filter eligibility by the wishlist tag; weighted-random by `score`. Store the wishlist tag on the slot so reroll preserves it. If no eligible dish carries the tag anywhere, skip and warn at the session level.
3. **Remaining `Plan` slots.** Iterate chronologically. Build eligible pool (no pin), exclude already-used dishes from primary pool, weighted-random by `score`. Fall back to allowing repeats if the primary pool is empty. If no eligible dish at all: return `{ noEligible: true, reason }` distinguishing "no filter matches" from "all matches in cooldown."

`Skip`, `Keep`, and `One-off` slots are never touched by the engine.

Virtual tag matching: tag IDs prefixed `v:` are detected at predicate-build time and substituted with the corresponding SQL filter (e.g. `timeEstimateMinutes <= 20`) instead of a `dish_tags` join.

## Shopping List Generation

`POST /api/shopping-lists { name, dateRangeStart, dateRangeEnd }`:
1. Query all Plan Entries (Dish type only) in range
2. For each Dish, collect its Dish Ingredients → group by Canonical Ingredient ID
3. Create Shopping List Item per unique Canonical Ingredient
4. Each item stores: `sourceDishIds` (JSON array), `rawTexts` (JSON array of raw strings from each source dish)
5. Items store the canonical link for Walmart URL lookup

## Docker Architecture

```
Container (node:lts-alpine)
├── Nuxt 4 built app
└── /data (named volume)
    ├── app.db
    └── images/
```

Port 3000 exposed. Data persisted across container restarts via the named volume.
All configuration via environment variables — no config files baked into the image.
