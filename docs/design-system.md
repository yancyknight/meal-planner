# Design System

This is the visual direction extracted from `docs/design/mealplanner-design-sketch-00.pdf`.

**Tokens and patterns here are starting points, not pixel-exact requirements.** Consistency
*within the app right now* matters more than fidelity to the original sketch. Refine freely
as the product takes shape — sections marked *(starting value — iterate)* are explicitly open
for adjustment. Sections without that marker reflect the established voice and should change
only with intent.

The PDF in `docs/design/` is the source of inspiration for tone and feel. The Tailwind v4
theme tokens in `app/assets/css/main.css` are the source of truth at build time.

---

## Voice

The product reads like a thoughtful, slightly editorial cookbook. Warm, calm, not corporate.

- **Headlines use a transitional serif with italic accents** on a key word or phrase
  (e.g. "Lemon Orzo with *Spinach & Feta*", "Week of *May 18 – 24*"). The italic word is
  always meaningful content — never decoration on a chrome label.
- **Eyebrow labels** in small uppercase with letter-spacing introduce sections
  (`CALENDAR`, `INGREDIENTS`, `RECENT APPEARANCES`).
- **Iconography is restrained.** Prefer unicode glyphs (`✦ ↻ ✓ ‹ › ↗ × +`) and small dots
  for meal-type indicators over an icon library. Reach for an icon set only when a glyph
  doesn't read clearly.
- **Whitespace is generous.** Cards have room to breathe; the grid is calm; padding is on
  the larger side of conventional.

---

## Color Palette *(starting values — iterate)*

Warm cream backgrounds, deep warm-brown text, coral/terracotta as the single accent. No
cool grays — every neutral has a touch of warmth.

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FAF5EC` | App background |
| `--color-surface` | `#FFFFFF` | Card / panel backgrounds |
| `--color-surface-alt` | `#F4ECDD` | Subtle surface (selected day in mini-calendar, hover wells) |
| `--color-text` | `#231613` | Primary text |
| `--color-text-muted` | `#7A6B62` | Secondary text, eyebrows, metadata |
| `--color-text-subtle` | `#B8A89C` | Helper text, disabled states |
| `--color-border` | `#E8DFD0` | Card borders, dividers |
| `--color-accent` | `#D67961` | Primary CTA, active nav pill, brand dot |
| `--color-accent-hover` | `#C76A52` | Hover/active darker accent |
| `--color-accent-soft` | `#F6DBD0` | Accent-tinted backgrounds (selected pills, banners) |
| `--color-accent-deep` | `#A85D45` | Italic accent words in headlines |
| `--color-warning` | `#D89A4A` | Allergen warnings, soft alerts |
| `--color-leftover` | `#9B7BB8` | Leftover indicator (subtle violet) |

### Meal-type dots

Each meal type has a small colored dot used in legends, dish-card bars, and calendar headers.
These are intentionally muted so multiple can sit next to each other without shouting.

| Meal | Hex | Note |
|---|---|---|
| Breakfast | `#C9A24A` | warm amber |
| Lunch | `#6B8E5A` | sage green |
| Dinner | `#C76A52` | coral (overlaps with accent — intentional) |
| Other / Uncategorized | `#7B6BA8` | muted violet |

---

## Typography *(starting values — iterate the families; the hierarchy is stable)*

| Role | Family | Size / weight | Notes |
|---|---|---|---|
| Headline | Playfair Display (serif) | `text-3xl`–`text-5xl` / 600 | Use `<em>` for italic accent word |
| Subhead | Playfair Display italic | `text-xl` / 400 italic | Phrases like "*seven days, three meals.*" |
| Body | Inter (sans) | `text-base` / 400 | Default text |
| Eyebrow / label | Inter | `text-xs` / 500 / `uppercase tracking-wider` | Section labels |
| Stat number | Playfair Display | `text-4xl` / 600 | Large numbers in stat blocks |
| Stat label | Inter | `text-xs` / 500 / `uppercase tracking-wide` | Below stat number |
| Mono / date list | JetBrains Mono (or `font-mono`) | `text-sm` / 400 | Date columns in lists like Recent Appearances |
| Nav links | Inter | `text-sm` / 500 | Active item gets accent-pill background |

The italic-accent treatment is the signature move — apply it sparingly to a single
meaningful word or short phrase per headline, never to entire titles.

If we ship without Playfair Display, fall back to a similar transitional serif
(Lora, EB Garamond) before reaching for a system serif.

---

## Spacing & Layout *(starting values — iterate)*

- **Container.** Centered, `max-w-6xl` (~1100px), horizontal padding `px-6` mobile / `px-10` desktop.
- **Card padding.** `p-6` for content-dense cards, `p-8` for hero / detail cards.
- **Section gap.** `gap-6` between cards in the same column; `gap-8` between major sections.
- **Radius.** `rounded-lg` (8px) for cards and inputs; `rounded-full` for pills and dots.
- **Border.** `border border-[--color-border]` — 1px, low contrast. Avoid heavy borders.
- **Shadow.** *(starting value — iterate)* Cards have no shadow by default; rely on the
  border and warm-tinted surface contrast. Add a soft `shadow-sm` only when elevation
  is needed (modals, dropdowns).

---

## Components

Each component lists the Tailwind recipe and the design intent. The recipes assume the
theme tokens above are in place.

### Eyebrow

A small uppercase label introducing a section or breadcrumb.

```html
<p class="text-xs font-medium uppercase tracking-wider text-[--color-text-muted]">
  Calendar
</p>
```

### Card

The default container for any grouped content.

```html
<div class="rounded-lg border border-[--color-border] bg-[--color-surface] p-6">
  ...
</div>
```

### Headline with italic accent

```html
<h1 class="font-serif text-4xl font-semibold text-[--color-text]">
  Week of <em class="text-[--color-accent-deep] italic font-normal">May 18 – 24</em>
</h1>
```

### Button — primary

Coral fill, soft rounded, generous horizontal padding.

```html
<button class="rounded-lg bg-[--color-accent] px-5 py-2.5 text-sm font-medium text-white
               hover:bg-[--color-accent-hover] transition">
  ✦ Plan a week
</button>
```

### Button — ghost / secondary

Transparent with subtle hover.

```html
<button class="rounded-lg border border-[--color-border] px-5 py-2.5 text-sm font-medium
               text-[--color-text] hover:bg-[--color-surface-alt] transition">
  ← Back
</button>
```

### Pill (filter / toggle)

Used for difficulty selectors, view toggles, frequency presets. Active state uses the soft accent.

```html
<!-- inactive -->
<button class="rounded-full border border-[--color-border] px-4 py-1.5 text-sm
               text-[--color-text] hover:bg-[--color-surface-alt]">Easy</button>

<!-- active -->
<button class="rounded-full bg-[--color-accent-soft] border border-[--color-accent]
               px-4 py-1.5 text-sm text-[--color-accent-deep] font-medium">
  ✓ Easy
</button>
```

### Tag chip

Smaller pill for dish tags. Neutral background; allergen tags get a warning marker.

```html
<span class="inline-flex items-center gap-1 rounded-full bg-[--color-surface-alt]
             px-3 py-1 text-xs text-[--color-text-muted]">
  vegetarian
</span>

<span class="inline-flex items-center gap-1 rounded-full bg-[--color-surface-alt]
             px-3 py-1 text-xs text-[--color-warning]">
  ⚠ dairy
</span>
```

### Stat block

Large serif number with a small uppercase label.

```html
<div class="flex flex-col">
  <span class="font-serif text-4xl font-semibold text-[--color-text]">27</span>
  <span class="text-xs font-medium uppercase tracking-wide text-[--color-text-muted]">
    Days since last made
  </span>
</div>
```

### Nav (top bar)

Centered horizontal list. The active route gets a soft accent pill.

```html
<nav class="flex items-center gap-1 text-sm">
  <a class="rounded-full px-4 py-1.5 text-[--color-text-muted] hover:text-[--color-text]">
    Calendar
  </a>
  <a class="rounded-full bg-[--color-accent-soft] px-4 py-1.5 text-[--color-accent-deep]
            font-medium">
    Dishes
  </a>
  ...
</nav>
```

The brand mark on the left is a small accent-colored dot followed by "Meal Planner *for two*"
with the household phrase in italic serif.

### Meal card (in calendar grid)

A small card representing a planned dish in a calendar cell.

```html
<div class="rounded-lg border border-[--color-border] bg-[--color-surface] p-3 text-sm">
  <p class="font-medium text-[--color-text] leading-snug">Lemon Orzo with Spinach &amp; Feta</p>
  <div class="mt-2 flex items-center gap-2 text-xs text-[--color-text-muted]">
    <span aria-hidden="true">●●●</span>   <!-- difficulty dots: filled = level -->
    <span>25m</span>
    <span class="text-[--color-leftover]">↻ leftovers</span>
  </div>
</div>
```

Empty slots show a centered `+` glyph at low opacity.

### Banner / inline note

Soft accent-tinted strip used for informational callouts ("38 dishes match your defaults").

```html
<div class="rounded-lg bg-[--color-accent-soft] px-4 py-3 text-sm text-[--color-text]">
  <strong class="text-[--color-accent-deep]">38 dishes</strong> match your defaults
  — <em>a healthy pool</em>.
</div>
```

---

## Patterns

### Detail-page layout

Two-column on desktop: image / hero meta on the left (~280px), content stack on the right.
Collapses to a single column on mobile. Used on dish detail and (eventually) shopping list detail.

### Wizard / multi-step layout

Left rail with numbered steps showing completion checkmarks; main panel on the right.
Step titles bold, subtitles in muted text. Used in Planning Mode.

### Stat row

Three or four stat blocks in a horizontal flex with `gap-12`. Used at the top of detail pages.

### Difficulty dots

Three small dots: filled count = difficulty (Easy = 1, Medium = 2, Hard = 3).
Filled dot is `--color-text-muted`, empty dot is `--color-text-subtle`.

---

## Open Questions / Things to Confirm

- Final font choices — locked in once we know if we can host Playfair Display and Inter
  locally vs hot-linking from a CDN.
- Exact accent hex (`#D67961`) — eyeballed from the PDF; user may want a slightly cooler or warmer coral.
- Mobile layout for the calendar grid — the PDF only shows desktop. Likely stack days vertically.
- Dark mode — not yet considered. Defer until the light theme is solid.

---

## Notes on the PDF

The dish detail page in the PDF still shows the old weight / "Effective Weight" UI. That section
will be reimagined under the new frequency-control model (see `docs/spec.md` §5 and
`docs/backlog.md` M7). Keep the visual treatment — pill presets, sectioned card with eyebrow,
small explanatory copy — but replace the content with the new cooldown / target / exclude controls.
