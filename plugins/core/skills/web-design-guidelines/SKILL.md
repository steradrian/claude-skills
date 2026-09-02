---
name: web-design-guidelines
description: Audit UI code or designs against modern premium dashboard design principles. Use when asked to "review my UI", "audit design", "check design rules", "review UX", "is this design correct", or "check my site against best practices".
metadata:
  version: "2.0.0"
  argument-hint: <file-or-pattern>
---

# Premium Dashboard Design Audit

You are auditing UI code or designs against modern premium dashboard design standards. Benchmark: **Linear / Vercel / Raycast / Stripe / Mercury** — polished, intentional, alive.

## How It Works

1. Read the specified files (or ask the user which files/pattern to review)
2. Check against all rule categories below
3. Output findings in terse `file:line — [CATEGORY] issue description` format, sorted by severity: 🔴 blocking → 🟡 important → 🟢 suggestion
4. End with a **Quick Wins** section: fixes that are ≤5 lines each

---

## Rule Categories

### 1. DEPTH — Background & Card Containment

The UI exists on three planes: background (lowest) → cards (mid) → overlays (top). Violations destroy depth hierarchy.

- 🔴 Content floating directly on the page background without card containment — every distinct content block (tables, charts, stat blocks, forms, feeds) must live inside a card
- 🔴 Empty state or loading skeleton floating on raw background without a card wrapper
- 🟡 Card uses a smaller border-radius than the project's established card radius — border-radius must be consistent system-wide
- 🟡 Card missing its resting shadow — every card should have a defined resting elevation
- 🟡 Card border is too visually heavy — borders should define edges without announcing themselves
- 🟢 Overlays (modals, drawers, popovers) using the same shadow as resting cards — overlays need a stronger shadow to communicate higher elevation

### 2. SHADOWS — Semantic Elevation

Shadows communicate elevation and must scale predictably.

- 🔴 Shadow uses an arbitrary value not from the project's shadow token system
- 🔴 Interactive card missing hover shadow escalation — hover should escalate shadow one level
- 🟡 Modal/drawer/popover uses a resting card shadow — overlays need a stronger shadow token
- 🟡 Shadow uses a single-layer value — premium shadows are multi-layered (one tight ambient + one wider spread)
- 🟢 Dark mode shadow is identical to light mode — in dark mode, elevation is better communicated through surface color shifts than shadow contrast; reduce shadow opacity

### 3. COLOR — Tokens Only, Semantic Usage

- 🔴 Hardcoded hex, rgb, hsl, or oklch literal in a component className or style prop — all colors must come from the project's design token system
- 🔴 Semantic color (warning, success, destructive) used as standalone text color — always pair with a background tint: `bg-{semantic}/10 text-{semantic}` pill pattern
- 🔴 Icon wrapped in a tinted background container (`bg-primary/10 rounded-md p-2` pattern) — this is the single most common admin template anti-pattern; icons should be bare
- 🟡 Primary/brand accent used on more than: primary CTA, active state indicator, chart primary line, focus rings — overuse dilutes the accent
- 🟡 Trend indicator uses only a color (no icon, no sr-only text) — color alone cannot convey meaning

### 4. TYPOGRAPHY — Defined Scale Only

No arbitrary font sizes. The project must have a defined type scale and every text element must use it:

| Role | Typical scale |
|---|---|
| Page title (sub-pages) | Large, bold, tight tracking |
| Section / widget title | Medium-large, semibold |
| Card / modal title | Medium, semibold |
| Stat number | Large, bold, tight tracking, tabular-nums |
| Body | Base size |
| Label | Small, medium weight |
| Small / helper | Small, muted color |
| Caption | Extra small, muted color |

- 🔴 Arbitrary font size (`text-[Xpx]`) — replace with defined scale
- 🔴 Font size below 12px — minimum is 12px; any exception must be documented inline
- 🟡 Top-level route page (Dashboard, Menus, etc.) renders a page-level H1 — remove it; sidebar + breadcrumbs already communicate location
- 🟡 Stat number missing `tabular-nums` — digits must align vertically for counter animations and readability
- 🟢 Nav group labels use `uppercase` + `tracking-wider` — replace with lowercase, semibold, no extra tracking

### 5. MOTION & ALIVE FEEL

Every state change must transition. Nothing snaps.

- 🔴 Interactive card (stat card, quick action, clickable list item) missing hover lift — translate + shadow escalation on hover
- 🔴 CSS property changes on hover/focus with no `transition-*` — add transition, minimum `150ms`
- 🟡 Any `transition-*` or `animate-*` class missing its `motion-reduce:transition-none` or `motion-reduce:animate-none` counterpart
- 🟡 Table rows missing hover state — every row should respond to hover with a subtle background tint
- 🟢 Page content loads without any entrance treatment — staggered fade-in (opacity + small translateY) makes the UI feel alive on load

### 6. BUTTONS & INTERACTIVE STATES

One primary CTA per view. Clear, predictable hierarchy.

| Control | Correct pattern |
|---|---|
| Primary CTA (one per view) | Filled, brand color |
| Secondary action | Outlined or muted |
| Tertiary / utility | Ghost |
| Mutually-exclusive filter | Segmented control |
| Tab navigation | Tabs component |

- 🔴 Multiple filled/primary buttons in the same view — reduce to one; others become outlined or ghost
- 🔴 Mutually-exclusive filter uses filled buttons — use segmented control instead
- 🟡 Active segment in segmented control missing a `shadow-sm` — this is what creates the "raised tab" premium feel
- 🟡 Icon-only button missing `aria-label`
- 🟢 Three or more secondary buttons of equal visual weight — consolidate to a dropdown overflow

### 7. TABLES

- 🟡 Table is not inside a card — wrap the entire table section (toolbar + table + pagination) in a card
- 🟡 Table row borders are too visually heavy — row separators should be subtle (reduce opacity on the border color)
- 🟡 Column consistently shows empty data (dashes) — hide it from the default column visibility
- 🟡 Table toolbar (search, filters, actions) is not visually separated from the table header row — add a border-bottom between toolbar and table
- 🟢 Type or status badges in tables not using the pill pattern — use `bg-{semantic}/10 text-{semantic} rounded-full px-2 py-0.5 text-xs font-medium`

### 8. ICONS

- 🔴 Icon inside a tinted background container — remove it; bare icon with muted color is correct
- 🔴 Decorative icon missing `aria-hidden`
- 🔴 Icon-only interactive element missing `aria-label`
- 🟢 Icon color doesn't transition on hover/active — add `transition-colors` so icon responds to interactive state

### 9. ACCESSIBILITY

- 🔴 `outline-none` or `outline: 0` without a visible replacement focus ring
- 🔴 Focus ring uses default browser style — should be custom ring using brand color
- 🔴 Color alone conveys meaning (trend up/down, status) with no icon or sr-only text alternative
- 🟡 Touch target below 44×44px in a non-desktop-only context
- 🟡 Loading skeleton missing `role="status"` or `aria-live="polite"`
- 🟡 Data visualization missing `aria-label` on the chart container

### 10. LAYOUT & STRUCTURE

- 🟡 Inconsistent vertical spacing — establish two values only: one for within-section spacing (e.g. 16px) and one for between-section spacing (e.g. 32px)
- 🟡 Breadcrumbs shown on a 2-level route — breadcrumbs are only warranted at 3+ levels deep
- 🟡 Quick action card is taller than ~64px — compact horizontal cards (56–64px, icon-left) are the correct pattern
- 🟢 Content width unconstrained on wide screens — apply a max-width container (`max-w-7xl` or similar) with centered margin

### 11. CHARTS

Charts are a frequent source of design violations.

- 🔴 Chart floating on page background without a card wrapper — every chart lives inside a card with a header row (title + controls)
- 🔴 Recharts tooltip missing `contentStyle` — must always be styled with CSS vars (`--color-popover`, `--color-border`, `--color-foreground`) and `--shadow-overlay`
- 🔴 Default charting library colors in use — replace with warm brand-derived chart tokens (`chart-1` through `chart-5`)
- 🟡 Line stroke width is 1px — upgrade to 2–2.5px (1px looks fragile)
- 🟡 Bar corners are square — add top border-radius (`[4, 4, 0, 0]`) for modern feel
- 🟡 Grid lines have full opacity — reduce to `strokeOpacity={0.3}` + `strokeDasharray="3 3"`
- 🟡 X-axis shows ISO dates ("2026-02-24") — format as human-readable ("Feb 24"); max 6–8 labels for 30-day data
- 🟡 Chart magic numbers inline (`strokeWidth={2.5}` etc.) — extract to named constants at the top of the file
- 🟡 Chart container missing accessibility wrapper — use `<figure role="img" aria-label={...}>`
- 🟡 Area fill is solid color — use a gradient from accent at ~12% opacity (top) to transparent (bottom)
- 🟡 Chart animations missing `motion-reduce` fallback
- 🟢 Donut chart has no center summary — add total value + label in the center hole

### 12. NAVIGATION & SIDEBAR

- 🔴 Active nav item uses a solid background fill — correct pattern: `border-l-2 border-primary` + low-opacity background tint (`bg-primary/8`)
- 🔴 Active and inactive nav items are visually indistinguishable — active: `font-semibold text-foreground`; inactive: `font-medium text-muted-foreground`
- 🟡 Sidebar has no visual separation from page content — add a right-edge separator (shadow or border)
- 🟡 Nav group labels use `uppercase` + `tracking-wider` — replace with lowercase `font-semibold text-[11px] text-muted-foreground`, no tracking modifier
- 🟢 Collapsed nav links missing `aria-label` — required when icon-only in collapsed mode

### 13. MICRO-DETAILS

- 🟡 No `::selection` color override — default browser blue clashes with warm palettes; set to brand accent at ~20% opacity
- 🟡 Scrollbars unstyled — style them thin (6–8px) with a warm-tinted thumb to match the palette
- 🟡 Disabled elements missing `cursor-not-allowed` — pair with reduced opacity
- 🟡 Number formatting uses hardcoded separators — use `Intl.NumberFormat` with the active locale
- 🟡 Empty state shows a blank frame (empty chart, bare table headers) — show a warm illustration + message + CTA instead
- 🟢 Loading skeleton shape doesn't match the content it replaces — card skeleton for cards, line skeleton for text rows, circle for avatars

---

## Output Format

```
src/components/stat-card.tsx:14 — [DEPTH] StatCard renders on raw background without a card wrapper.
src/components/stat-card.tsx:22 — [SHADOWS] Arbitrary shadow value; use project's shadow token instead.
src/app/dashboard/page.tsx:8 — [TYPOGRAPHY] <h1> on a top-level route — remove it.
```

End with:

**Quick wins (≤5 lines each):**
- `stat-card.tsx:14` — Wrap content: `<div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] p-6">`
- `dashboard/page.tsx:8` — Delete the `<h1>` element

If no violations: "No violations found. ✓"
