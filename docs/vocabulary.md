# Vocabulary

Standardized terms used throughout the codebase, documentation, and UI copy.
Use these terms consistently in code identifiers, comments, API routes, and UI strings.

## Core Entities

| Term | Definition |
|---|---|
| **Dish** | A saved recipe template in the library. Represents something that *can* be made, not a specific cooking event. Has ingredients, metadata, and suggestion settings. |
| **Canonical Ingredient** | The deduplicated master record for an ingredient (e.g. "Garlic"). The global reference that dish ingredients link to. |
| **Dish Ingredient** | The raw ingredient entry on a specific Dish (e.g. "3 cloves garlic, minced"). Always linked to exactly one Canonical Ingredient. |
| **Tag** | A user-defined label applied to a Dish for filtering and planning composition (e.g. "pasta", "vegetarian", "soup"). Distinct from a **Virtual Tag**, which is derived from dish fields. |
| **Virtual Tag** | A filter token computed from dish fields at query time (e.g. `⚡ quick` = `timeEstimateMinutes ≤ 20`, `🥛 dairy-free` = `'dairy-free' ∈ freeFrom`). Not stored in the `tags` table; cannot be assigned manually on a Dish. ID prefix `v:`. |
| **Free From** | The list of dietary claims a Dish is certified free from (e.g. `dairy-free`, `gluten-free`). Replaces the old `allergens` field. Skipping all = no claims (not assumed free of any allergen). |
| **Plan Entry** | A single scheduled item on the calendar. Comes in three kinds — see **Entry Kind**. |
| **Entry Kind** | The category of a Plan Entry. One of `fresh` (a Dish cooked from scratch), `leftover` (eating previously-cooked leftovers of the same Dish), or `one-off` (free text, no Dish reference). Only `fresh` entries advance the cooldown / overdueness clock for a Dish. |
| **One-Off Entry** | A Plan Entry with `entryKind = 'one-off'`: free text instead of a Dish reference. Used for restaurants, events, "Dinner at Gram's House". Occupies a slot and blocks planning. |
| **Fresh Entry** | A Plan Entry with `entryKind = 'fresh'`: references a Dish and represents the cook event itself. The only kind counted by `daysSinceLastServedFresh`. |
| **Leftover Entry** | A Plan Entry with `entryKind = 'leftover'`: references a Dish (typically the same one cooked the prior day) and represents eating leftovers. Does not reset the cooldown clock. |
| **Meal Type** | The time-of-day slot classification for a Plan Entry. Values: `breakfast`, `lunch`, `dinner`, `uncategorized`. |
| **Planning Session** | A persisted, in-progress multi-step wizard for generating Plan Entries over a date range. Survives browser refresh. |
| **Draft Plan** | The generated set of proposed Plan Entries within a Planning Session, before the user finalizes them. |
| **Shopping List** | An ephemeral, user-created list of ingredients derived from Plan Entries over a date range. Auto-deleted 36 hours after marked done. |
| **Shopping List Item** | A single Canonical Ingredient line within a Shopping List, with check state and source dish traceability. |

## Planning Mode Terms

| Term | Definition |
|---|---|
| **Session-Wide Virtual Tag** | A virtual tag applied across every Plan slot in a Planning Session — acts as a hard pre-filter on the candidate pool. Only virtual tags are eligible here (not real tags). |
| **Pinned Tag** | A constraint binding a specific `(date, mealType)` slot to a tag (real or virtual). The slot must be filled with a Dish carrying that tag; the engine relaxes best-effort if no candidate exists. |
| **Wishlist Tag** | A real tag the user wants represented *somewhere* in the Draft Plan but does not care where. The engine picks one open `Plan` slot at random for each wishlist tag. Reroll on a wishlist-placed slot preserves the tag constraint. |
| **Slot State** | Per-slot state in Step 2 of the wizard: `plan` (algorithm fills), `skip` (leave blank), `one-off` (free text), `keep` (existing entry stays). |
| **Overdueness** | A Dish's `daysSinceLastServedFresh / targetIntervalDays` at a given slot date. 1.0 = exactly on schedule; >1.0 = overdue; <1.0 = recently served. Never-served Dishes are treated as `1.5 × targetIntervalDays` since served (overdueness 1.5). |
| **Selection Weight** | The capped overdueness used for weighted-random Dish selection within Planning Mode: `min(overdueness, 3.0)`. Only computed for Dishes that pass eligibility (cooldown + filters). |
| **Season Multiplier** | Soft seasonal bias on Selection Weight, evaluated against the **slot's date**. `1.0` if the Dish is year-round (empty `season`) or in-season for the slot's date; `0.5` otherwise. |
| **Tag Overlap Penalty** | Soft diversity bias on Selection Weight. For a candidate Dish at a slot, count the Dishes already placed in this draft sharing at least one tag with the candidate; multiply Selection Weight by `1 / (1 + overlapCount)`. Discourages clusters of similar dishes without forbidding them. |
| **Reroll** | Replace a specific Draft Plan slot with a new weighted-random Dish that still satisfies the slot's stored constraints (pin / wishlist tag if present). Honors the per-slot shown-list to avoid immediate repeats. |

## Dish Settings Terms

| Term | Definition |
|---|---|
| **Cooldown Days** | Hard floor. The minimum number of days that must pass since a Dish was last cooked fresh before it is eligible to be suggested again. Leftover servings do not reset this clock. |
| **Target Interval Days** | Soft goal. The desired average gap (in days) between fresh servings of this Dish. Drives Selection Weight via Overdueness. |
| **Excluded From Suggestions** | Boolean on a Dish. When true, the Dish is never proposed by the planning engine but remains visible in the library (unlike Archived, which also hides it from default browsing). |
| **Frequency Preset** | UI helper that sets both Target Interval and Cooldown together. Values: Weekly (7 / 4), Biweekly (14 / 7), Monthly (30 / 15), Quarterly (90 / 45), Custom. |

## Status Terms

| Term | Definition |
|---|---|
| **Archived** (Dish) | Hidden from browsing and planning suggestions. Preserved for history. Reversible. |
| **Done** (Shopping List) | Marked complete by explicit user action. Starts the 36-hour auto-deletion countdown. |

## What We Do NOT Use

Avoid these terms to prevent confusion:

| Avoid | Use Instead |
|---|---|
| ~~Recipe~~ | **Dish** |
| ~~Meal~~ as a generic noun | **Dish** (the template) or **Plan Entry** (the scheduled instance) |
| ~~Event~~ for calendar items | **Plan Entry** or **One-Off Entry** |
| ~~User~~ | Omit — no multi-user concept, all data is global |
| ~~Make~~ (as in "make a dish") | **Plan** (to add to calendar) or simply use in context |
| ~~Weight~~ / ~~Effective Weight~~ / ~~Min Interval Days~~ | Removed in favor of **Cooldown Days**, **Target Interval Days**, **Overdueness**, **Selection Weight** |
| ~~Composition Rule~~ | Removed in the M9 redesign. Replaced by **Pinned Tag** (date+slot+tag) and **Wishlist Tag** (tag somewhere in plan). |
| ~~Allergens~~ (as "contains") | Replaced by **Free From** (inverted semantic — "certified free from") in M8.6. |
