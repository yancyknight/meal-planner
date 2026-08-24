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

GET    /api/dishes/[id]/files   # List files attached to a dish
POST   /api/dishes/[id]/files   # Upload a file attachment (multipart, field name `file`)
GET    /api/dish-files/[id]/download  # Serve an attachment
DELETE /api/dish-files/[id]     # Delete an attachment (row + blob)

GET    /api/freezers
POST   /api/freezers
GET    /api/freezers/[id]
PATCH  /api/freezers/[id]
DELETE /api/freezers/[id]
POST   /api/freezers/[id]/audit-complete   # Updates lastAuditedAt

GET    /api/freezer-categories
POST   /api/freezer-categories
PATCH  /api/freezer-categories/[id]
DELETE /api/freezer-categories/[id]

GET    /api/freezer-items                   # ?freezerId=&status=&categoryId=
GET    /api/freezer-items/dashboard         # Bucketed payload for the dashboard
POST   /api/freezer-items
GET    /api/freezer-items/[id]
PATCH  /api/freezer-items/[id]
DELETE /api/freezer-items/[id]
POST   /api/freezer-items/[id]/use
POST   /api/freezer-items/[id]/waste

GET    /api/freezer/planner-feed            # Planner consumption contract (Phase 4)
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
- `fileService.ts` — disk layer for dish file attachments (`$FILE_DIR`), plus the upload ceiling
- `dishFileService.ts` — attachment CRUD; validates type and size, keeps rows and blobs in sync
- `freezerService.ts` — freezer CRUD + audit-complete writes
- `freezerCategoryService.ts` — category CRUD + first-run seeding
- `freezerItemService.ts` — item CRUD, status transitions, dashboard bucketing, planner-feed query
- `notificationService.ts` — generic ntfy POST. Best-effort delivery; logs and swallows errors. Reusable beyond freezer.
- `freezerNotificationService.ts` — composes expiry / digest / audit-overdue messages from current freezer state

## Scheduled Tasks

Nitro's scheduled task system (experimental — requires opt-in in `nuxt.config.ts`) is used for background maintenance. Tasks live in `server/tasks/`.

```ts
// nuxt.config.ts
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '*/15 * * * *': ['shopping-lists:cleanup'],
    '0 0 * * *':    ['dishes:cleanup-cooldowns'],
    '0 * * * *':    ['database:backup'],
    '0 8 * * *':    ['freezer:expiry-check'],     // (Phase 3) daily expiry + audit-overdue
    '0 * * * *':    ['freezer:weekly-digest'],    // (Phase 3) hourly heartbeat; task guards by day+hour
  }
}
```

Tasks use the `defineTask` helper and call service functions directly — no HTTP layer involved. On the `node_server` preset (used in Docker), scheduling is powered by the [croner](https://croner.56k.guru/) engine internally.

For schedules that the user must be able to change from the UI (e.g. the freezer weekly-digest day/hour), the cron entry is a coarse heartbeat and the task itself reads the user-configured time from `app_settings` and exits early when the heartbeat doesn't match. This avoids touching `nuxt.config.ts` for runtime configuration. The existing `database:backup` task uses the same pattern (hourly heartbeat, internal interval guard).

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

## File Attachments

Supporting files on a Dish (see [`data-model.md`](./data-model.md#dish_files)) are stored the same
way images are, in their own directory:

- Uploads: `POST /api/dishes/[id]/files` (multipart, field `file`) → saved to `$FILE_DIR/{uuid}.{ext}`
- Serving: `GET /api/dish-files/[id]/download` → reads the blob, restores `originalName`
- `FILE_DIR` defaults to `/data/files`; `MAX_UPLOAD_MB` (default 100) caps a single upload

Validation is an **extension allowlist** (`shared/schemas/dishFile.ts`) checked against the
reported MIME type; a generic `application/octet-stream` falls back to trusting the extension,
since browsers report it for markdown, HEIC, and Office formats. `readMultipartFormData` buffers
the whole body in memory, which is what the size cap is really bounding — a `413` beats an OOM.

Only a small inline-safe list (pdf, raster images, `text/plain`) is served with its own
`Content-Type`. Everything else goes out as `application/octet-stream` with
`Content-Disposition: attachment`, so a stored html or svg can never execute against this origin.
All responses carry `X-Content-Type-Options: nosniff`.

Blobs are not covered by the backup task, which copies `app.db` only.

## Planning Engine

Stateless functions in `planningEngineService.ts`:

- `generateDraft(input) → draftPlan` — builds a full draft for a session.
- `reroll(input, slotKey) → dishId` — replaces a single slot, honoring its stored constraints.

The engine never mutates state; callers persist results to `planning_sessions`. Virtual tag IDs (prefixed `v:`) are detected at predicate-build time and substituted with their SQL filter instead of a `dish_tags` join.

Inputs, per-slot eligibility, selection scoring, and generation order live in **[`planning-mode.md`](./planning-mode.md#algorithm)** — that document is canonical.

The engine optionally accepts `freezerHints: Map<dishId, { earliestTargetUseDate }>` (Phase 4 of the Freezer module — see [`freezer-mode.md` §Planner Integration](./freezer-mode.md#planner-integration)). When present, the score is multiplied by an additional `freezerUrgencyMultiplier(slotDate, earliestTargetUseDate)` factor that ramps up as the slot approaches or passes the target use date. The contract is consumed via `GET /api/freezer/planner-feed`, which returns both dish-linked `hints` and `standaloneHints` for active items with no dish link (surfaced as inline one-off entry recommendations).

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
