# Vocabulary

Standardized terms used throughout the codebase, documentation, and UI copy.
Use these terms consistently in code identifiers, comments, API routes, and UI strings.

## Core Entities

| Term | Definition |
|---|---|
| **Dish** | A saved recipe template in the library. Represents something that *can* be made, not a specific cooking event. Has ingredients, metadata, and suggestion settings. |
| **Canonical Ingredient** | The deduplicated master record for an ingredient (e.g. "Garlic"). The global reference that dish ingredients link to. |
| **Dish Ingredient** | The raw ingredient entry on a specific Dish (e.g. "3 cloves garlic, minced"). Always linked to exactly one Canonical Ingredient. |
| **Tag** | A user-defined label applied to a Dish for filtering and planning composition (e.g. "pasta", "quick", "vegetarian", "soup"). |
| **Plan Entry** | A single scheduled item on the calendar. Either a reference to a saved Dish or a One-Off Entry. |
| **One-Off Entry** | A Plan Entry with free text instead of a Dish reference. Used for restaurants, events, "Dinner at Gram's House". Occupies a slot and blocks planning. |
| **Meal Type** | The time-of-day slot classification for a Plan Entry. Values: `breakfast`, `lunch`, `dinner`, `uncategorized`. |
| **Planning Session** | A persisted, in-progress multi-step wizard for generating Plan Entries over a date range. Survives browser refresh. |
| **Draft Plan** | The generated set of proposed Plan Entries within a Planning Session, before the user finalizes them. |
| **Shopping List** | An ephemeral, user-created list of ingredients derived from Plan Entries over a date range. Auto-deleted 36 hours after marked done. |
| **Shopping List Item** | A single Canonical Ingredient line within a Shopping List, with check state and source dish traceability. |

## Planning Mode Terms

| Term | Definition |
|---|---|
| **Composition Rule** | A user-specified constraint for the Draft Plan: "on [specific date], a [meal type] slot should include a Dish with [tag] or [canonical ingredient]". |
| **Effective Weight** | The computed suggestion probability for a Dish at a point in time. Combines base weight, recency penalty, and interval constraint. |
| **Reroll** | Replace a specific Draft Plan slot with a new randomly selected Dish that still matches the session filters. |

## Dish Settings Terms

| Term | Definition |
|---|---|
| **Weight** | Integer 0–100 on a Dish controlling its base probability of being suggested. Default 50. Weight 0 = never suggest. |
| **Min Interval Days** | Minimum number of days that must pass between this Dish being suggested in separate plans. |

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
