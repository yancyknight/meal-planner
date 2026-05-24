# Freezer Module — UI Design Prompt

> Paste this into Claude Designer (or equivalent) to generate the UI designs for the Freezer
> module. Self-contained — no other files need to be opened.

---

## What you're designing

A new **Freezer** module being added to an existing self-hosted meal-planning web app for a
single household. The module lets the user log items going into one of several physical
freezers, see what's expiring, link items to dishes for planning purposes, and walk through a
freezer to confirm what's still there.

**Critical context for the entry experience:** the primary moment of use is standing at an open
freezer with cold hands. NFC tags stuck to the freezer door open `/freezer/add?freezerId=<id>`
and `/freezer/<id>/audit`. Forms must be near-zero-friction. Touch targets must be generous.
This is **mobile-first** for the add and audit flows; the dashboard is used on both phone and
desktop.

---

## Brand voice and visual direction

The product reads like a **thoughtful, slightly editorial cookbook**. Warm, calm, never
corporate. Match this carefully — the Freezer module must feel like part of the same product,
not a utility bolted on.

### Color palette (warm, no cool grays)

| Token | Hex | Use |
|---|---|---|
| Background | `#FAF5EC` | App background — warm cream |
| Surface | `#FFFFFF` | Cards |
| Surface alt | `#F4ECDD` | Subtle wells, hover, selected |
| Text | `#231613` | Primary — deep warm brown |
| Text muted | `#7A6B62` | Secondary, metadata |
| Text subtle | `#B8A89C` | Helper, disabled |
| Border | `#E8DFD0` | Card borders, dividers (1px, low contrast) |
| Accent | `#D67961` | Primary CTAs, active nav, brand dot (coral/terracotta) |
| Accent hover | `#C76A52` | Hover / pressed states |
| Accent soft | `#F6DBD0` | Tinted backgrounds (selected pills, banners) |
| Accent deep | `#A85D45` | Italic accent words in headlines |
| Warning | `#D89A4A` | Soft alerts |

For the Freezer module specifically, introduce **two new semantic tints** that fit the palette:

- **Frost** — a cool but warm-leaning tint, e.g. `#D6E2E0` (background) / `#3F6864` (text). Use
  for the ❄ accents on the dashboard, freezer-meal calendar badges, and the freezer-card
  identifier. Keep it muted so it sits *next to* the existing coral accent without competing.
- **Expired** — a desaturated red-brown for the expired bucket, e.g. `#E5C4B8` (background) /
  `#8C3A2A` (text). Warmer than a typical alert red — has to live in the same warm palette.

Don't lean heavily on either tint. They are signals, not decoration.

### Typography

| Role | Family | Notes |
|---|---|---|
| Headline | Playfair Display (transitional serif) | Use `<em>` for an italic accent word — *"Garage freezer"*, *"Approaching this week"* |
| Subhead | Playfair Display italic | Soft framing lines like *"three freezers, fifty-two items"* |
| Body | Inter | Default |
| Eyebrow | Inter, small uppercase, tracked | Section labels — `FREEZER`, `EXPIRED`, `APPROACHING`, `RECENTLY ADDED` |
| Stat number | Playfair Display, 600 | Large counts in headers |
| Mono | JetBrains Mono | Dates in lists when alignment matters |

The **italic-accent treatment is the signature move** — one meaningful word per headline,
sparingly applied. Never italicize a whole title.

### Iconography

Restrained. Prefer Unicode glyphs (`✦ ↻ ✓ ‹ › ↗ × +`) over an icon library. Specific to this
module:

- **❄** for freezer identity throughout (the only feature-specific glyph)
- **⚠** in front of "Expired" bucket headers
- **⏳** in front of "Approaching" bucket headers
- **✚** in front of "Recently added" bucket headers
- **▢ / ◉** for action chips ("still here" / "used")

Don't introduce additional iconography unless a glyph would be unclear. No emoji on
destructive actions.

### Layout primitives (from the existing design system)

- Container `max-w-6xl`, horizontal padding `px-6` mobile / `px-10` desktop
- Card radius `rounded-lg` (8px); pills `rounded-full`
- Card padding `p-6` content-dense, `p-8` for hero/detail
- Section gap `gap-6` within column, `gap-8` between sections
- No shadows by default — borders and warm surface contrast carry elevation
- Generous whitespace; the grid is calm

---

## Pages to design

Design each page in **two states minimum (mobile 375px and desktop 1100px)**, and for each,
both a **populated** state and an **empty** state. Include any modal/dialog overlays that the
page can produce.

### 1. `/freezer` — Dashboard (most important)

The first thing the user sees. Used on phone and desktop equally.

**Header band**

- Eyebrow `FREEZER`
- Editorial headline like `Three freezers · *fifty-two items*` (italic accent on a meaningful
  word — pick what feels right)
- Subhead/meta line: a soft, useful sentence like *"Two items hit toss-by this morning. The
  garage freezer hasn't been audited in 32 days."*
- Right side: a `+ Add item` primary button. On mobile this collapses to a floating action
  bottom-right.

**Bucket: Expired** (only shown if non-empty)

- Eyebrow with the expired tint: `⚠ EXPIRED — toss now · 2`
- Grouped by freezer (e.g. *Garage freezer · 2*, *Kitchen freezer · 0* — hide empty groups)
- Each row: item name, *days past toss-by* prominent in expired-tint, category as a small
  muted tag, the actual toss-by date as a small mono line
- Row actions revealed inline: `Mark used · Mark wasted · Edit`. On mobile, tap the row to
  open an inline action sheet.

**Bucket: Approaching** (always shown if any active items exist)

- Eyebrow: `⏳ APPROACHING — next 14 days · 4` (the "14" is the configurable window)
- Same group-by-freezer treatment
- Each row: item name, *"in N days"* on the right, plus the toss-by date in mono small
- A row with a linked dish gets a small ❄+dish chip after the item name (e.g. *"❄ Linked:
  Lasagna"*)

**Bucket: Recently added** (last 7 days)

- Eyebrow: `✚ RECENTLY ADDED — last 7 days · 2`
- More compressed than the other buckets — confirms recent entries without competing for
  attention

**Per-row inline actions on tap/click** (mobile and desktop)

- Mark used, Mark wasted, Edit, Move to another freezer
- These should feel like a discreet expansion of the row, not a popover with a tail. The
  design system favors quiet inline reveals over heavy overlays.

**Empty state**

- One freezer-shaped illustration or large ❄ glyph
- Headline: `Your freezer log starts *here*.`
- Subhead: *"Add a freezer to begin, or tap any freezer's NFC tag to log an item."*
- Primary button: `Set up a freezer`

### 2. `/freezer/add` — Add item form

The friction-critical surface. Must work well one-handed on a phone, at an open freezer.

**Fields, in this exact order:**

1. **Freezer** — large dropdown. When arrived via NFC (`?freezerId=` query), this is
   pre-selected and rendered with a small *"from NFC tag"* hint underneath. Tappable to
   change.
2. **Name** — large text input, auto-focused on load. The single most important field.
3. **Category** — pill grid (not dropdown) of the most-used 8–10 categories, with a `more…`
   tail that reveals the full list. Each pill is a meaningful touch target (40px+ tall).
   Each pill shows the category name + its default lifetime as a small muted line.
4. **Date added** — defaults to today; rendered as a chip with `Today · May 24` plus a quiet
   `Change` link. Rarely touched.
5. Collapsible: **Lifetime override**. When collapsed, shows the category default like *"Toss
   by Aug 14 (90 days)"*.
6. Collapsible: **Notes**.
7. Collapsible: **Link to a dish** — typeahead.
8. Collapsible: **Link to an ingredient** — typeahead.

**Live preview chip** above the submit row, always visible:

> *Toss by `Aug 14` · target use `Jun 25`*

Updates as the user changes category / override / date. This chip is the user's confidence
signal that the system understood them.

**Submit** — full-width primary button `Add to freezer`. After save, the form clears the name
field and stays on the page if the user arrived via NFC, so they can rapid-fire add multiple
items. Otherwise it bounces back to `/freezer`.

**Empty / first-run state of this page** — if no freezers exist yet, the page shows a
mini-wizard to create one first.

### 3. `/freezer/[id]` — One freezer's items

Per-freezer view. Less editorial than the dashboard; more list-y.

- Header: editorial headline with the freezer's name, italic accent on a word; subhead with
  *"48 items · last audited 32 days ago"*
- Right side header actions: `Audit this freezer` (primary) and `+ Add item`
- Filter row: category chips (multi-select); status toggle (Active default; All shows
  used/wasted history with muted treatment)
- List of items sorted by `tossByDate` ascending — same row treatment as the dashboard
  buckets, but flat (no grouping). Items in the approaching window show the urgency in soft
  tinted left border; expired items show the expired tint border.
- Bulk select: a small checkbox appears on each row when the user taps a long-press or "Edit"
  toggle at the top. Bulk actions: *Mark used*, *Mark wasted*, *Move*.

### 4. `/freezer/[id]/audit` — Audit walk-through

Mobile-first, **single-purpose screen**, no surrounding chrome (header collapses to just a
title and a Discard link). This is a focused mode.

**Per-item card** — full-screen on mobile, one item at a time:

- Item name as a hero serif headline, italic accent on a word
- Below: category tag, *added Aug 14*, *toss by Nov 12 — in 21 days*
- Notes (if any) rendered as a quiet block quote
- Three large action buttons stacked, each meeting a 64px tall touch target:
  - `✓ Still here` (primary, accent)
  - `◉ Used` (secondary)
  - `× Wasted` (tertiary, muted)
- Small `Skip` link at the bottom — moves on without writing

**Header strip:**

- `Auditing Garage freezer` on the left
- Progress: `3 / 18` middle
- `Discard` (with confirm) on the right

**Finish state:**

- After the last item, present a summary card: *"You audited 18 items: 14 still here · 3
  used · 1 wasted."*
- Single button: `Finish audit` — writes `lastAuditedAt`, returns to `/freezer/[id]`

**Resume state:**

- If the user opens the audit URL after a partial walkthrough, the queue picks up at the
  first item not yet decided. Show a small banner at the top of the first card: *"Resuming
  audit. 14 items remaining."*

### 5. Settings additions on `/settings`

A new card titled `Freezer`. Sits among the existing Settings cards (Household, Backups,
etc.). Subsections:

1. **General**
   - "Approaching toss-by window" — numeric input with `days` suffix; default `14`
   - "Audit reminder threshold" — numeric input with `days` suffix; default `60`

2. **Categories**
   - Table-like list of all categories with inline edit: name + `defaultLifetimeDays`
   - Tiny `+ Add category` row at the bottom
   - Each row has a `×` delete with confirm; system-seeded categories carry a tiny *"default"*
     label but can still be edited/deleted

3. **Notifications (ntfy.sh)**
   - "Enable freezer notifications" toggle
   - When enabled: fields for ntfy server URL, topic, optional auth token
   - "Weekly digest day" — day-of-week picker
   - "Weekly digest hour" — hour picker (0–23)
   - A small `Send test push` button on the right of the enable toggle

4. **Export**
   - One button: `Download freezer data (.json)` — downloads the full export

### 6. Calendar chip — small change to existing component

The app's existing calendar shows planned dishes as chips. When a dish has any active linked
freezer item, its calendar chip carries a small **❄ badge** in the frost tint. Design the
chip with and without the badge so the visual relationship is clear. On long-press / hover,
a tiny affordance appears: *"❄ Mark [item name] as used"* — show what this looks like when
exactly one item is linked, and what it looks like when multiple items are linked (different
text, links to `/freezer`).

---

## Things to get right

- **Audit mode is the hardest UX.** Cold hands. Possibly bad lighting. One-handed. Make the
  buttons huge and the cognitive load small.
- **The dashboard is the home base.** The household will check it once a week minimum. It
  has to feel like a *page* worth landing on, not a list view.
- **Linked-dish display.** Items linked to dishes get a frost-tint dish chip *"❄ Linked:
  Lasagna"*. Items not linked have no chip. The user should be able to tell at a glance
  which items will influence planning.
- **The italic accent.** Apply it to one meaningful word per headline. Look for the word that
  carries the emotional weight of the line ("Approaching *this week*", "Three freezers ·
  *fifty-two items*"). Avoid italicizing chrome words like "Add" or "Settings."
- **Don't introduce new icon sets.** The product uses unicode glyphs deliberately.
- **No new accent color.** Frost and expired are the only two new tints, and they're muted by
  design.

---

## Things NOT to design

- The existing pages aren't being redesigned (calendar, dishes, planning wizard, shopping
  lists, ingredients). The only change to existing pages is the small ❄ badge on calendar
  chips for freezer-linked entries.
- No admin / multi-user UI — single household, no auth, no roles.
- No quantity / unit / partial-use UI on items — items are either in the freezer or they
  aren't.
- No notification feed/inbox inside the app — pushes go through ntfy, the user reads them
  there.
- No barcode scanning, no photo upload, no per-zone freezer subdivisions — explicitly out of
  scope.

---

## Deliverable

Per page: mobile (375px) and desktop (1100px), with populated and empty states. Plus one
sheet showing the calendar chip variant (with and without the ❄ badge) so the connection to
existing chrome is clear. Annotate any choices that are open for iteration.
