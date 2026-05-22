# Planning Mode

Planning Mode is a four-step wizard for generating Plan Entries over a date range. Sessions persist
to the database at every step so the user can close the browser and resume any time.

Active sessions are listed at `/planning`. A session can be resumed or deleted from that list.
Once finalized, the session is deleted — only committed Plan Entries remain on the calendar.

---

## Design Principles

The wizard intentionally surfaces only the inputs that a typical household actually thinks about
when planning meals. Constraints that *can* be derived from existing dish data — time estimate,
difficulty, dietary claims — are exposed as **virtual tags** rather than as a separate filter UI.
Diversity (e.g. "not three pasta dishes in a row") and seasonality are handled by the algorithm,
not by user inputs.

---

## Step Flow

```
Step 1: When & What        — date range, meal types
Step 2: Slot Setup         — per-slot state (plan / skip / one-off / keep)
Step 3: Anchors (optional) — session-wide virtual tags · pinned tags · wishlist tags
Step 4: Draft & Finalize   — generated draft with reroll / swap / clear · inline leftover toggle · confirm
```

The user can navigate back to any previous step. Advancing a step saves state to the DB immediately.

---

## Step 1: When & What

**Inputs:**

- Start date (date picker)
- End date (date picker)
- Meal types to plan: checkbox group — Breakfast, Lunch, Dinner (any combination; at least one required). **Default: Dinner only.**

`uncategorized` slots are never planned automatically.

Saved to session: `dateRangeStart`, `dateRangeEnd`, `mealTypes`.

---

## Step 2: Slot Setup

A single screen showing every slot in the selected range and meal types. Each slot has one of four states:

| State | Meaning |
|---|---|
| **Plan** | Default for empty slots. Algorithm will fill this slot in Step 4. |
| **Skip** | Slot is intentionally left blank (e.g. "we're at Gram's"). No entry is written on finalize. |
| **One-off** + text | Free-text Plan Entry (e.g. "Pizza delivery"). Saved as `entryKind: 'one-off'` on finalize. |
| **Keep** | Default for slots that already have a Plan Entry in the calendar. Entry stays as-is and is excluded from generation. **Remove** toggles to "Plan" — the existing entry is deleted on finalize. |

Bulk actions: "Plan all empty," "Skip all empty," "Keep all existing."

Saved to session: `slotStates` (keyed by `${date}:${mealType}`), `removedPlanEntryIds`, `pendingOneOffEntries`.

If the entire range has no existing entries, the "Keep" column simply isn't shown.

---

## Step 3: Anchors (Optional)

Three independent sections, each optional. All three operate on **tags** (real or virtual).

### Session-wide constraints

Multi-select of **virtual tags only**. Tags ticked here apply to every slot in `Plan` state as a hard pre-filter — only dishes matching all selected virtual tags are eligible.

```
[⚡ quick]  [🟢 easy]  [🥛 dairy-free]  [🌾 gluten-free]  [🥜 nut-free]  ...
```

Virtual tags are derived from dish fields at query time — see [`spec.md` §3 Virtual Tags](./spec.md#virtual-tags) for the full list and rules. Real tags are not offered here because session-wide thematic constraints ("every dinner must be pizza") are not a real use case — that intent is served by per-slot pins.

### Pin tag to slot

Zero or more pins. Each pin is `(date, mealType, tag)` where `tag` may be a real tag *or* a virtual tag. Example pins:

- `Fri 2026-06-05 · Dinner · 🍕 pizza` — Friday dinner must be a pizza-tagged dish.
- `Tue 2026-06-09 · Dinner · ⚡ quick` — soccer Tuesday must be ≤20 min.

When generating, pinned slots are resolved first. If no eligible dish matches a pin, the slot is filled with a clearly labeled warning ("⚠ Pinned tag [pizza] — no matching dish found"). The slot still gets a placeholder dish (best-effort from the unconstrained pool) and can be rerolled or overridden manually in Step 4.

Multiple pins on the same slot are AND-combined ("dinner must be both pasta and easy").

### Include tag somewhere ("wishlist")

Zero or more **real tags** the user wants represented at least once in the plan but doesn't care where. Example: `[rice]  [soup]`.

For each wishlist tag, after pinned slots are resolved, the engine picks one unfilled `Plan` slot uniformly at random and places an eligible dish carrying that tag. Reroll on a wishlist-placed slot keeps the tag constraint. If no eligible dish exists for the tag, the wishlist entry is skipped and the user is warned.

Wishlist is real-tag-only; virtual-tag wishlists ("include one quick dish somewhere") are not a real use case.

Saved to session: `sessionVirtualTags: string[]`, `pinnedTags: { date, mealType, tagRef }[]`, `wishlistTags: string[]`.

---

## Step 4: Draft & Finalize

A single screen that combines draft generation, per-slot adjustment, leftover suggestion, and final confirmation.

### Draft Generation

The planning engine is called with the session state and produces a complete `draftPlan` (see Algorithm). Slots already in `Skip`, `Keep`, or `One-off` states are not touched.

### Per-slot UI

Each `Plan`-state slot shows:

- Dish name, difficulty chip, time estimate
- Any active warning labels (e.g. "⚠ Pinned tag relaxed")
- **Reroll** — replace with the next weighted-random eligible dish. Honors any pinned tag or wishlist tag attached to this slot. Already-shown dishes for this slot are excluded until the pool is exhausted, at which point the user is prompted to restart the shown-list.
- **Swap** — open a dish-search dialog to manually pick any dish (bypasses filters). Marked as `isManualOverride`.
- **Clear** — leave this slot blank in the final output.

`Keep` slots show the existing entry read-only.
`Skip` slots show "Skipped — no entry will be written."
`One-off` slots show the entered text.

### Inline Leftover Toggle

On any `Plan`, `Keep`, or `Swap` slot whose dish has `yieldServings > householdSize + guestCount`, a small affordance appears:

> 🥡 Add leftover lunch tomorrow? `[ toggle ]`

Toggling on queues a `entryKind: 'leftover'` Plan Entry for the next day's lunch slot using the same dish, provided that slot isn't already filled. This replaces the dedicated leftover step from the prior spec.

Leftover placements **do not** advance the dish's cooldown — only the originating Fresh entry counts.

### Summary Bar

```
12 dinners planned · 2 skipped · 1 one-off · 3 leftover lunches queued
```

### Confirm & Save

On Confirm:

1. All `Plan` slots in `draftPlan` write `entryKind: 'fresh'` Plan Entries (or `'one-off'` for one-off type, `'leftover'` for queued leftovers).
2. `pendingOneOffEntries` write `entryKind: 'one-off'`.
3. `removedPlanEntryIds` are deleted from `plan_entries`.
4. The Planning Session row is deleted.
5. User is redirected to the Calendar view at the session's start date.

**Cancel** at any point prompts ("This will discard your planning session. Continue?") and deletes the session.

---

## Algorithm

Stateless function `planningEngineService.generateDraft(input) → draftPlan` plus a per-slot `reroll(input, slotKey) → dishId`.

### Inputs

```typescript
{
  slots: { date: string, mealType: MealType, state: 'plan' | 'skip' | 'one-off' | 'keep' }[]
  sessionVirtualTags: string[]            // e.g. ['v:quick', 'v:dairy-free']
  pinnedTags: { date, mealType, tagRef }[]
  wishlistTags: string[]                  // real tag IDs only
  committedEntries: PlanEntry[]           // pre-existing Fresh/Leftover entries up to and within the range
  householdSize: number
  showAllergens: boolean                  // for filtering pickers; engine accepts whatever it receives
}
```

### Per-slot eligibility predicate

A candidate dish is eligible for a slot iff:

1. `dish.archived = false` and `dish.excludedFromSuggestions = false`
2. **Session virtual tags** — dish satisfies every selected virtual tag (hard filter)
3. **Pinned tags** — for the specific slot, dish satisfies every pin on that slot (hard filter, with best-effort relaxation if no candidate survives — see below)
4. **Cooldown** — `daysSinceLastServedFresh(dish, slotDate) ≥ dish.cooldownDays`. The lookup considers both committed Fresh entries and already-placed Fresh slots earlier in this draft. Never-served dishes use `daysSince = 1.5 × targetIntervalDays`.

### Selection score

For each eligible candidate at a given slot:

```
overdueness       = daysSinceFresh / dish.targetIntervalDays
selectionWeight   = min(overdueness, 3.0)
seasonMultiplier  = 1.0  if dish.season is empty (year-round)
                    1.0  if seasonOf(slot.date) ∈ dish.season
                    0.5  otherwise
tagOverlapCount   = number of dishes already placed in this draft sharing ≥1 tag with this dish
diversityFactor   = 1 / (1 + tagOverlapCount)
score             = selectionWeight × seasonMultiplier × diversityFactor
```

`seasonOf` maps a date to its meteorological season (Mar–May spring, Jun–Aug summer, Sep–Nov fall, Dec–Feb winter). Always evaluated on the **slot's date**, not today.

### Generation order

1. **Resolve pinned slots first.** For each pinned slot in date order:
   - Build the eligible pool with all hard filters including the pin.
   - If non-empty: weighted-random by `score`. Mark slot, add dish to in-draft history.
   - If empty: best-effort relaxation — relax the pin (drop one constraint at a time if multiple pins on the slot) and retry. If still empty after full relaxation, pick best-effort from the unconstrained eligible pool and attach a warning label listing which constraint(s) were dropped.
2. **Place wishlist tags.** For each wishlist tag (in user-entered order):
   - Find all `Plan`-state slots not already filled.
   - Pick one uniformly at random.
   - From eligible dishes for that slot, filter to those carrying the wishlist tag. If non-empty: weighted-random by `score`. Mark slot with `wishlistTag = <tagId>` so reroll preserves it.
   - If no dish in the pool carries the tag: skip this wishlist entry, attach a top-level warning ("No eligible dish has tag [rice]").
3. **Fill remaining `Plan` slots in chronological order.** For each:
   - Build eligible pool (hard filters, no pin).
   - Remove dishes already used elsewhere in this draft from the primary pool.
   - Weighted-random by `score` from the primary pool. If primary is empty, use the secondary pool (allow repeats) with a warning.
   - If still empty (no eligible dishes at all): mark the slot "No eligible dishes for [date] [meal type]" with a reason breakdown ("3 dishes match your filters but are still in cooldown") and offer manual override.

### Reroll

`reroll(slotKey)` rebuilds the eligible pool with the slot's stored constraints (pin or wishlist tag if any), excludes dishes already shown for *this slot* during this session, and picks the next weighted-random candidate. When the shown-list is exhausted, the user is prompted to restart it ("All matching dishes have been suggested. Show from the beginning?").

---

## Planning Session Schema

```typescript
interface PlanningSession {
  id: number
  dateRangeStart: string                    // YYYY-MM-DD
  dateRangeEnd: string                      // YYYY-MM-DD
  mealTypes: MealType[]                     // e.g. ['lunch', 'dinner']
  currentStep: 1 | 2 | 3 | 4

  // Step 2
  slotStates: {
    [slotKey: string]: 'plan' | 'skip' | 'one-off' | 'keep'
    // slotKey = `${date}:${mealType}`
  }
  removedPlanEntryIds: number[]             // existing entries marked for deletion on finalize
  pendingOneOffEntries: {
    date: string
    mealType: MealType
    text: string
  }[]

  // Step 3
  sessionVirtualTags: string[]              // e.g. ['v:quick', 'v:dairy-free']
  pinnedTags: {
    date: string
    mealType: MealType
    tagRef: { kind: 'real', tagId: number } | { kind: 'virtual', id: string }
  }[]
  wishlistTags: number[]                    // real tag IDs only

  // Step 4
  draftPlan: {
    [slotKey: string]: {
      kind: 'dish' | 'leftover-suggestion'
      dishId: number
      isManualOverride?: boolean
      warningLabels?: string[]              // e.g. ['Pinned tag [pizza] relaxed']
      wishlistTag?: number                  // present if this slot was placed by the wishlist pass
      leftoverFor?: string                  // present on leftover-suggestion entries — slotKey of the dinner this came from
    }
  }
  shownDishIdsBySlot: {
    [slotKey: string]: number[]
  }
  leftoverToggles: {                        // user toggles in Step 4
    [slotKey: string]: boolean              // slotKey of the originating dinner
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
| Session-wide virtual tags exclude all dishes | Step 4 shows top-level warning; every Plan slot shows "No eligible dishes." |
| Pinned tag has no matching dish | Slot is filled best-effort from unconstrained pool, labeled "⚠ Pinned tag [X] relaxed." |
| Wishlist tag has no matching dish | Wishlist entry skipped; top-level warning shown. |
| All filter-matching dishes are still in cooldown for a slot | Slot shows "No eligible dishes — N matching dishes are still in cooldown"; manual override offered. |
| Leftover toggle on but next-day lunch already has Keep/One-off | Toggle is disabled with a tooltip explaining why. |
| User rerolls until all eligible dishes shown | Prompt to restart shown-list; confirm before cycling. |
| External tab adds a plan entry while session is open | Step 2 re-fetches on enter; warn if entries appeared after session started. |
| Pin and wishlist target same tag | Allowed; pin counts as the wishlist's "one slot." Wishlist pass skips that tag if it's already represented. |
