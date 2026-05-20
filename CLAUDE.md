# Meal Planner

A self-hosted meal planning web app for household use (2 users, no auth, all data globally shared).

## Key Documentation

@import docs/vocabulary.md
@import docs/architecture.md

Detailed specs: `docs/spec.md` · `docs/data-model.md` · `docs/planning-mode.md` · `docs/testing.md`

Backlog & build order: `docs/backlog.md`

## Session Protocol

Follow these steps every session, in order. Do not skip or reorder steps.

### 1. Orient
- Re-read this file and any spec docs relevant to the feature being worked on
- Review the Current Sprint section to see if anything is already in progress
- If resuming an interrupted session, assess the current state before planning
- **Before creating any new feature branch:** sync from remote to avoid merge conflicts:
  ```bash
  git fetch origin
  git checkout main
  git pull origin main
  git checkout -b <new-branch-name>
  ```

### 2. Plan
- Write a concrete implementation checklist in the Current Sprint section (below)
- Checklist must cover: schema changes, migrations, API routes, services, components, tests
- Call out any decisions not already resolved in the spec docs and ask before assuming
- **Stop and get explicit user sign-off on the plan before writing any code**

### 3. Implement
- Work through checklist items one at a time; check each off as completed
- Write tests alongside feature code — not after
- After plan sign-off, run to completion without asking for confirmation on routine decisions — only stop for a genuine blocker (ambiguous spec, unresolvable conflict, external dependency missing)
- Keep changes focused on the current feature; note any scope creep opportunities for the backlog instead

### 4. Verify
- Run the relevant tests: `pnpm test` for unit/integration, `pnpm test:e2e` for e2e
- Show the actual test output — do not describe tests as passing without running them
- Fix all failures before proceeding; do not defer failing tests

### 5. Close
- Mark all completed checklist items in Current Sprint
- Note anything deferred, and why
- **For any UI changes:** follow the screenshot/GIF protocol below, then embed the images in the PR description.
- Create a PR via `gh pr create` — description must cover: what was built, every judgment call made during implementation, anything deferred and why, any spec divergences that need doc updates, and embedded screenshots/GIFs for all UI changes
- Send a push notification via the PushNotification tool so the PR is flagged for review
- Stop — do not wait for user confirmation; the PR is the handoff point

#### Screenshot / GIF Protocol

GitHub resolves relative image paths in PR descriptions against the **default branch (main)**, not the PR branch. Images only committed to the feature branch will be broken until merge. Always use absolute `raw.githubusercontent.com` URLs tied to a specific commit hash — they work immediately and remain stable even after the branch is deleted.

**Step 1 — Capture**
- Screenshots: save PNGs to `docs/screenshots/<milestone>/` (e.g. `docs/screenshots/m4/01-overview.png`)
- GIFs: record interaction flows with `peek` (GUI) or `byzanz-record` (CLI) and save to the same directory
- Name files with a numeric prefix so order is clear: `01-`, `02-`, etc.

**Step 2 — Commit**
```bash
git add docs/screenshots/
git commit -m "docs: add screenshots for <milestone>"
COMMIT=$(git rev-parse HEAD)
```

**Step 3 — Build working URLs**
```bash
# Template:
# https://raw.githubusercontent.com/yancyknight/meal-planner/${COMMIT}/docs/screenshots/<milestone>/<filename>

# Generate markdown for a whole milestone dir:
REPO="yancyknight/meal-planner"
for f in docs/screenshots/m4/*.png docs/screenshots/m4/*.gif; do
  [ -f "$f" ] || continue
  echo "![$(basename $f)](https://raw.githubusercontent.com/${REPO}/${COMMIT}/${f})"
done
```

**Step 4 — Embed in PR description**
Paste the `![alt](url)` lines into the PR body. Never use relative paths like `docs/screenshots/...` — always use the full `raw.githubusercontent.com` URL with the commit hash.

## Commands

```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm db:generate      # Generate migration after schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:studio        # Open Drizzle Studio
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check
```

## Project Structure

```
app/                       # Nuxt 4 frontend (app/ directory structure)
  pages/                   # File-based routing
  components/              # Vue components
  composables/             # Shared composables
    queryKeys.ts           # ALL TanStack Query keys defined here
  layouts/
shared/
  schemas/                 # Zod schemas shared between client and server
  types/                   # Shared TypeScript types (no runtime code)
server/                    # Nitro backend
  api/                     # REST API route handlers (thin — call services)
  database/
    schema.ts              # Drizzle schema — single source of truth for DB shape
    migrations/            # Auto-generated by drizzle-kit, never edit manually
    index.ts               # DB connection singleton (WAL mode applied here)
  services/                # All business logic lives here
  utils/                   # Shared server-side utilities
public/
data/                      # Docker volume mount point
  app.db                   # SQLite database file
  images/                  # Uploaded dish images
```

## Coding Conventions

- **TypeScript everywhere.** No `any`. Narrow `unknown` explicitly.
- **Zod on all API inputs.** Schemas in `shared/schemas/`, used on both client and server.
- **Services own DB access.** API handlers call `server/services/*`, never `db` directly.
- **Consistent error shape.** Return `{ error: string }` with appropriate HTTP status on failure.
- **Dates.** Store as ISO 8601 in SQLite. Calendar-only dates stored as `YYYY-MM-DD`. Use `date-fns` for all manipulation — no moment, no dayjs.
- **Booleans in SQLite.** Stored as integer (0/1). JSON arrays/objects stored as text.
- **Images.** Uploads saved to `$IMAGE_DIR/{uuid}.{ext}`. Served at `GET /api/images/[filename]`.
- **Query keys.** Every TanStack Query key is defined and exported from `app/composables/queryKeys.ts`. No inline key strings.
- **Mutations.** After any mutation, invalidate the relevant query keys — do not manually update cache.

## Environment Variables

| Variable                 | Default              | Description                              |
|--------------------------|----------------------|------------------------------------------|
| `DATABASE_URL`           | `/data/app.db`       | SQLite file path                         |
| `IMAGE_DIR`              | `/data/images`       | Image upload directory                   |
| `NUXT_PUBLIC_APP_NAME`   | `Meal Planner`       | Display name in app header               |

## Docker

Single-container deployment. `/data` is a named Docker volume containing both the database and uploaded images. App runs on port 3000. See `Dockerfile` and `compose.yaml`.

## Current Sprint

Milestone 0 complete. All items done and pushed to https://github.com/yancyknight/meal-planner.

**Implementation note:** Tailwind CSS v4 is configured via `@tailwindcss/vite` (Vite plugin) rather than `@nuxtjs/tailwindcss`, because the Nuxt module only supports Tailwind v3 as of this writing. Update `docs/architecture.md` if this is worth documenting.
