# Planning Mode

Planning Mode is a multi-step wizard for generating Plan Entries over a date range. Sessions are
persisted to the database at every step so the user can close the browser and resume at any time.

Active sessions are listed at `/planning`. A session can be resumed or deleted from that list.
Once finalized, the session is deleted — only committed Plan Entries remain on the calendar.

---

## Step Flow

```
Step 1: Date Range & Meal Types
Step 2: Review Existing Entries
Step 3: One-Off Events
Step 4: Filters
Step 5: Composition Rules
Step 6: Leftover Suggestions
Step 7: Draft Review
Step 8: Finalize
```

The user can navigate back to any previous step. Advancing a step saves state to the DB immediately.

---

## Step 1: Date Range & Meal Types

**Inputs:**
- Start date (date picker)
- End date (date picker)
- Meal types to plan: checkbox group — Breakfast, Lunch, Dinner (any combination; at least one required)

`uncategorized` slots are never planned automatically.

Saved to session: `dateRangeStart`, `dateRangeEnd`, `mealTypes`

---

## Step 2: Review Existing Entries

System queries all Plan Entries in the selected date range for the selected meal types.

**For each entry found:**
- Display: date, meal type, dish name (or one-off text)
- Action: **Keep** or **Remove**
  - Keep → slot is marked as confirmed; excluded from Draft Plan generation
  - Remove → entry is deleted from the calendar when the user advances past this step

A "Keep All" and "Remove All" bulk action is provided.

If no entries exist in the range, this step is skipped automatically.

Saved to session: `confirmedEntryIds` (IDs of kept entries)

---

## Step 3: One-Off Events

User adds free-text One-Off Entries that should block the planning algorithm for specific slots.

Examples: "Dinner at Gram's", "Pizza delivery night", "Out of town"

**Per entry:**
- Text input
- Date picker
- Meal type selector

These entries are saved to `planning_session.oneOffEntries` (not yet written to the calendar).
They are committed to the calendar as One-Off Plan Entries when the session is finalized.

If the user skips this step (adds nothing), that is valid.

---

## Step 4: Filters

Optional constraints. Dishes must meet ALL active filters to be eligible for generation.

| Filter | Type | Default |
|---|---|---|
| Max time (minutes) | Integer input or "No limit" | No limit |
| Difficulty | Multi-select: Easy, Medium, Hard | All |
| Must include tags | Tag multi-select (dish must have ALL selected) | None |
| Must exclude tags | Tag multi-select (dish must have NONE) | None |
| Allergen exclusions | Allergen multi-select | None |
| Season | Multi-select: Spring, Summer, Fall, Winter | Current season pre-selected |

Dishes with `excludedFromSuggestions = true` are always filtered out regardless of these settings.

Saved to session: `filters`

---

## Step 5: Composition Rules

User adds zero or more rules that pin a specific dish characteristic to a specific date and meal type.

**Each rule:**
- Date (must be within the session range)
- Meal type (must be one of the selected meal types)
- Constraint type: **Tag** or **Canonical Ingredient**
- Constraint value: selected tag or canonical ingredient

**Example rules:**
- `2025-06-06 / Dinner / Tag: pizza` → Friday dinner must be a pizza dish
- `2025-06-10 / Lunch / Ingredient: Chicken Breast` → Tuesday lunch must use chicken breast
- `2025-06-08 / Dinner / Tag: soup` → Sunday dinner must be a soup

If multiple rules exist for the same date+meal type, the planning engine uses best-effort matching: it first attempts to find a dish satisfying all rules for that slot, then progressively relaxes them one at a time (most specific first) until a match is found. When a fallback occurs, the draft slot is clearly labeled — e.g. "⚠ Partial match: no dish found with both [tag: pasta] and [ingredient: Chicken Breast] — matched on tag only."

Composition rules are applied on top of session filters — a dish must meet both to be placed in a ruled slot.

Saved to session: `compositionRules`

---

## Step 6: Leftover Suggestions

This step is shown only if any confirmed or already-placed dinner Plan Entries produce leftovers
(i.e., `dish.yieldServings > householdSize + planEntry.guestCount`).

**For each such dinner entry:**
- Show: dish name, date, yield, estimated leftover servings
- Prompt: "Add [Dish Name] as leftovers for lunch on [next day]?"
- Toggle: Yes / No (default No)

If "Yes", a Plan Entry with `entryKind = 'leftover'` is queued for the next day's lunch slot using the same dish.
This queued entry is excluded from generation (slot is pre-filled in the draft) and does **not** reset that dish's cooldown clock — only the originating fresh entry advances the cooldown / overdueness calculation.

If the next day's lunch slot is already filled (confirmed entry or one-off), the suggestion is not shown for that slot.

Saved to session: leftover selections embedded in `draftPlan` (marked with `type: 'leftover'`).

---

## Step 7: Draft Review

The planning engine generates a Draft Plan for all open slots (not blocked by confirmed entries, one-offs, or leftover fills).

### Generation Algorithm

Slots are processed in chronological order so that a dish chosen on day N correctly increments `daysSinceLastServedFresh` for day N+1.

For each open slot:
1. Start with all non-archived dishes where `excludedFromSuggestions = false`
2. Apply session filters (Step 4)
3. **Eligibility (cooldown):** drop any dish whose most recent `entryKind = 'fresh'` Plan Entry (looking at both committed entries and already-placed Fresh slots in the in-progress draft) is within `cooldownDays` of the slot date. Dishes never served fresh are treated as `daysSinceLastServedFresh = 1.5 × targetIntervalDays` for both eligibility and the overdueness math.
4. If a composition rule (or rules) exist for this date+meal type, apply them with **best-effort matching**:
   - First attempt: filter to dishes matching **all** rules for this slot
   - If no candidates remain: relax rules one at a time (most specific first — ingredient constraints before tag constraints) and retry
   - If a match required relaxing any rule: mark the slot with a warning label listing exactly which constraint(s) were not met (e.g. "⚠ Partial match: no dish has tag [pizza] — constraint relaxed")
   - If no eligible dish remains even after full relaxation: fall through to unruled behavior and mark slot "⚠ Composition rule could not be satisfied"
5. **Compute Selection Weight** for each candidate:
   ```
   overdueness     = daysSinceLastServedFresh / targetIntervalDays
   selectionWeight = min(overdueness, 3.0)
   ```
6. Remove dishes already placed elsewhere in this draft from the primary pool
7. Select by weighted random from the primary pool using `selectionWeight`
   - If primary pool is empty (all eligible dishes already used): use the full eligible pool (secondary pool) — flagging that a repeat is being used
8. Mark selected dish as used; record it in `usedDishIds` and treat it as a Fresh placement when evaluating later slots in this draft

**If no eligible dishes exist for a slot**, show:
> "No matching dishes for [date] [meal type]"
> With a breakdown: e.g. "3 dishes match your filters but are still within their cooldown period · 0 dishes remain"
> And an "Override manually" option

### Draft UI (per slot)

Each slot in the draft shows:
- Dish name, difficulty badge, time estimate, season tags
- **Reroll** button: replaces this slot with the next weighted-random eligible dish
  - Dishes already suggested for *this specific slot* during rerolling are not shown again
  - If all eligible dishes for a slot have been shown: display "All matching dishes have been suggested. Show from the beginning?" — user confirms before cycling back
- **Override** button: open dish search to manually pick any dish (bypasses filters)
- **Clear** button: leave this slot unplanned in the final output

Summary bar showing: X slots filled, Y slots cleared, Z leftover fills, W manual overrides.

Saved to session: `draftPlan`, `usedDishIds`, `shownDishIdsBySlot`

---

## Step 8: Finalize

Final review before committing.

**Summary shows:**
- Date range
- Meal types planned
- Count of slots filled vs cleared
- Total unique Canonical Ingredients across all selected dishes (useful for grocery complexity preview)
- Any slots that were left empty (with a note they won't be added to the calendar)

**On "Confirm & Save":**
1. All draft Dish Plan Entries are written to `plan_entries`
2. All queued One-Off Entries from Step 3 are written to `plan_entries`
3. Any entries marked "Remove" in Step 2 are deleted from `plan_entries`
4. The Planning Session record is deleted
5. User is redirected to the Calendar view at the session's start date

**Cancel** at any point deletes the session and discards all changes. A confirmation prompt is shown ("This will discard your planning session. Continue?").

---

## Planning Session Schema

```typescript
interface PlanningSession {
  id: number
  dateRangeStart: string           // YYYY-MM-DD
  dateRangeEnd: string             // YYYY-MM-DD
  mealTypes: MealType[]            // e.g. ['lunch', 'dinner']
  currentStep: number              // 1–8
  filters: {
    maxTimeMinutes: number | null
    difficulties: Difficulty[]
    requiredTagIds: number[]
    excludedTagIds: number[]
    excludedAllergens: string[]
    seasons: Season[]
  }
  compositionRules: {
    date: string
    mealType: MealType
    constraintType: 'tag' | 'ingredient'
    constraintId: number           // tag ID or canonical ingredient ID
  }[]
  draftPlan: {
    [slotKey: string]: {           // slotKey = `${date}:${mealType}`
      type: 'dish' | 'one-off' | 'leftover' | 'empty'
      // On finalize, `type` maps to `plan_entries.entryKind`:
      //   'dish'     → 'fresh'
      //   'leftover' → 'leftover'
      //   'one-off'  → 'one-off'
      //   'empty'    → not written
      dishId?: number
      oneOffText?: string
      isManualOverride?: boolean
    }
  }
  confirmedEntryIds: number[]      // plan_entry IDs kept in Step 2
  pendingOneOffEntries: {          // Step 3 entries, not yet in DB
    date: string
    mealType: MealType
    text: string
  }[]
  usedDishIds: number[]            // dishes placed anywhere in current draft
  shownDishIdsBySlot: {            // reroll history per slot
    [slotKey: string]: number[]
  }
  status: 'in_progress' | 'finalizing'
  createdAt: string
  updatedAt: string
}
```

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Filters so strict no dishes qualify for any slot | Show warning at top of Step 7; all slots show "No eligible dishes" |
| All filter-matching dishes are still within their cooldown for a given slot | Slot shows "No eligible dishes — N matching dishes are still in cooldown"; offer manual override |
| Composition rule references a dish that the filters exclude | Warn in Step 5: "Your filters exclude all dishes with tag [X]" |
| The same slot has a confirmed entry AND a one-off added in Step 3 | One-off is rejected with an error: "That slot is already occupied" |
| User rerolls until all eligible dishes shown | Prompt to restart shown-list; confirm before cycling |
| Planning session is open while another browser tab adds plan entries | Step 2 re-fetches on enter; warn if entries were added after session started |
