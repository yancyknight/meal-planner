# Testing

## Libraries

| Purpose | Library | Notes |
|---|---|---|
| Unit & integration test runner | [Vitest](https://vitest.dev/) | Native to the Vite/Nuxt ecosystem; shares config with the app |
| Vue component testing | [@vue/test-utils](https://test-utils.vuejs.org/) + Vitest | Mount and interact with components in isolation |
| Nuxt integration testing | [@nuxt/test-utils](https://nuxt.com/docs/getting-started/testing) | Spins up a real Nuxt instance for API route and SSR tests |
| End-to-end testing | [Playwright](https://playwright.dev/) | Full browser automation; first-class support via `@nuxt/test-utils/e2e` |
| Test database | In-memory SQLite (`:memory:`) | Isolated per test run; seeded in `beforeEach` |

No separate test database process needed — better-sqlite3's in-memory mode is fast and fully isolated.

## Test Types & What Each Covers

### Unit Tests (`*.test.ts` co-located in `server/services/`)

Pure logic with no HTTP or DB involvement. The most important targets:

- **Planning engine** — weight calculation, effective weight formula, best-effort composition rule relaxation, reroll depletion logic, slot generation given a set of candidates and filters
- **Ingredient fuzzy matching** — confirm match suggestions fire above threshold, don't fire below it, and handle edge cases (empty library, exact duplicates, substring matches)
- **Leftover calculation** — yield vs household size math, guestCount handling
- **Shopping list generation** — ingredient grouping, rawTexts aggregation, source dish tracking
- **Auto-delete eligibility** — the 36-hour window logic

### Service Integration Tests (`*.test.ts` in `server/services/` using in-memory DB)

Test service functions against a real (in-memory) SQLite database. Cover the persistence behavior that unit tests can't:

- CRUD operations and cascade deletes
- Frequency stat queries (`lastMadeDate`, `timesMade` derived from plan entries)
- Planning session state serialization/deserialization roundtrips
- Shopping list generation from actual plan entry + dish ingredient data

### API Route Tests (via `@nuxt/test-utils`)

Test the HTTP layer: input validation, error shapes, and correct delegation to services. Not a full re-test of service logic — just that the route wires up correctly.

- Valid requests return correct status codes and shapes
- Invalid/missing inputs return `{ error: string }` with 400
- Missing resources return 404
- Delete-with-history returns the correct rejection response

### Component Tests (Vue Test Utils + Vitest)

For components with non-trivial internal logic that doesn't belong in a service:

- Planning wizard step navigation (can advance, can go back, step validation)
- Reroll depletion UI state (warning shown when pool exhausted)
- Shopping list check/uncheck behavior
- Composition rule builder (add, remove, validate rules)
- Ingredient entry fuzzy suggestion flow (suggestion appears, user accepts/rejects)

Keep component tests focused on logic and state, not visual layout. Don't test that a button is blue.

### End-to-End Tests (Playwright)

Cover the critical user journeys that span multiple layers. These are the most expensive to write and maintain — keep the suite small and focused on flows that would be catastrophic to break silently:

- **Dish import flow** — paste URL, verify prefilled fields, save dish, confirm it appears in library
- **Full planning session** — create session, step through all 8 steps, finalize, verify plan entries appear on calendar
- **Shopping list lifecycle** — create list from date range, check items, mark done, verify deletion countdown
- **Reroll exhaustion** — plan a slot with a very small eligible pool, reroll until exhausted, confirm warning and reset behavior

## Test Organization

```
server/
  services/
    planningEngineService.test.ts    # unit + service integration
    ingredientService.test.ts
    shoppingListService.test.ts
    ...
  api/
    dishes.test.ts                   # API route tests
    planning-sessions.test.ts
    ...
app/
  components/
    PlanningWizard.test.ts           # component tests
    IngredientEntry.test.ts
    ...
tests/
  e2e/
    dish-import.spec.ts              # Playwright e2e
    planning-session.spec.ts
    shopping-list.spec.ts
  fixtures/
    db.ts                            # shared in-memory DB setup helpers
    seeds.ts                         # reusable test data factories
```

## Test Data Strategy

Use **factory functions** in `tests/fixtures/seeds.ts` rather than static fixtures. Each factory creates a minimal valid object and accepts overrides:

```typescript
// Example pattern — actual implementations written per session
export function makeDish(overrides?: Partial<Dish>): Dish { ... }
export function makePlanEntry(overrides?: Partial<PlanEntry>): PlanEntry { ... }
```

This keeps tests readable and resilient to schema changes — only the factory needs updating when a field is added.

## Commands

```bash
pnpm test              # Run all unit and integration tests (Vitest)
pnpm test:watch        # Watch mode
pnpm test:e2e          # Run Playwright e2e suite
pnpm test:coverage     # Coverage report
```

## What We Are Not Testing

- Visual regression (no screenshot tests — overkill for a household app)
- The Drizzle ORM itself or SQLite internals
- Third-party library behavior (fuse.js scoring, croner scheduling)
- Recipe import HTML parsing against live external sites (too brittle; mock the fetch in unit tests)
