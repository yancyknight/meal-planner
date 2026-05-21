# Milestone 8.5 — Pre-Planning Polish: Implementation Checklist

Branch: `milestone-8-5-pre-planning-polish`

Mark items `[x]` as completed. Items marked `[~]` are deferred to the next session.

---

## Bug Fixes

- [x] **BF-1:** Custom frequency inputs not showing (`FrequencyControls.vue`)
  - Add local `explicitlyCustom: Ref<boolean>`
  - `activePreset` computed returns `'custom'` when flag is set or values don't match any preset
  - `applyPreset('custom')` sets flag; named preset clicks clear it

- [x] **BF-2:** Ingredient rows disappear / don't save (`IngredientList.vue`, `DishForm.vue`)
  - Add `isEmitting` flag in `IngredientList.vue` to suppress watch during local emitUpdate calls
  - Change `emitUpdate` to emit ALL rows (not just linked)
  - In `DishForm.vue` on submit: auto-create a canonical for any unlinked row via POST /api/ingredients/canonical before saving
  - Add regression tests: link one row → others remain; save all unlinked → all persisted

---

## Calendar UX

- [x] **CAL-1:** Drop targets visible while dragging (`calendar.vue`)
- [x] **CAL-2:** Subtle save feedback after drop (`calendar.vue`)
- [x] **CAL-3:** Hide "Move…" button on larger screens (`PlanEntryChip.vue`)
- [x] **CAL-4:** Wrap long dish names (`PlanEntryChip.vue`)
- [x] **CAL-5:** Add grid structure to week view (`calendar.vue`)
- [x] **CAL-6:** Chip click → dish detail page (`PlanEntryChip.vue`, `calendar.vue`, month view)

---

## Shopping Lists

- [x] **SL-1:** Drop the name field (`shopping-lists/index.vue`, `shopping-lists/[id].vue`, Zod schema, service)
- [x] **SL-2:** Meal chips link to dish page (`shopping-lists/[id].vue`)

---

## Navigation & Home

- [x] **NAV-1:** Remove welcome page; calendar is home (`pages/index.vue`)
- [x] **NAV-2:** Reorder nav (`layouts/default.vue`)

---

## Settings — Allergen Visibility

- [x] **ALG-1:** Schema — uses key-value table, no migration needed; seedDefaults updated
- [x] **ALG-2:** Service + API (`settingsService.ts`, Zod schema)
- [x] **ALG-3:** Settings page toggle (`pages/settings.vue`)
- [x] **ALG-4:** Conditional display — dish detail gated; DishCard has no allergens to hide
- [ ] **ALG-5:** Tests — toggle persists; Zod validates new field (deferred — settings tests already cover pattern)

---

## Mobile Fixes

- [x] **MOB-1:** Dish detail title on mobile (`pages/dishes/[id]/index.vue`)
- [x] **MOB-2:** Month view mobile previews (`calendar.vue`) — 3-char abbreviation on small screens
- [x] **MOB-3:** New-shopping-list modal on mobile (`shopping-lists/index.vue`) — full-screen sheet

---

## Session boundary

If the session ends before all items are complete, stop at a clean point (no partial implementations), update this file with `[x]` for completed items, and note what's next.
