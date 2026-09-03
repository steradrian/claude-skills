# Shared design rules

Referenced by `core:ui-designer` and `core:ui-component-builder`. These are the concrete patterns both agents enforce; keep them in one place so the designer and the builder never disagree.

**Precedence:** if the project ships a design-system package (check `package.json` for an `@<org>/ui` dependency, then read its exports), the DS component wins over every pattern below. These rules describe what a correct component looks like and are the fallback for a project with no DS export for the case. Never hand-roll a `Card`, `Badge`, `Separator`, `Skeleton` or `Text` that the DS already exports.

## Tokens only — no hardcoded values

```tsx
✓  className="bg-card text-foreground border-border"
✓  className="text-muted-foreground"
✓  className="bg-primary text-primary-foreground"
✗  className="bg-[#4a2c1a]"
✗  style={{ color: 'oklch(0.42 0.09 38)' }}
✗  className="shadow-md"  // cold gray — use the project's shadow tokens
```

Semantic color pairs — always both halves:
- Warning: `bg-warning/15 text-warning-foreground border border-warning/30`
- Success: `bg-success/10 text-success`
- Destructive: `bg-destructive/10 text-destructive`
- Muted: `bg-muted text-muted-foreground border border-border`

Never `text-warning` standalone — always pair with the background tint.

## Card anatomy

```
bg-card
border border-border        ← barely visible, defines edge without announcing itself
rounded-xl                  ← 12px. Consistent everywhere. Never rounded-lg in cards.
shadow-[var(--shadow-card)] ← resting state
p-4 (standard) / p-6 (hero or stat cards)

Interactive card adds:
hover:-translate-y-0.5
hover:shadow-[var(--shadow-card-hover)]
transition-all duration-200 motion-reduce:transition-none
cursor-pointer
```

```tsx
// Standard card
<div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] p-4">
  {content}
</div>

// Interactive card (lifts on hover — on touch devices the press state is the feedback, not the lift)
<div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] transition-all duration-200 cursor-pointer motion-reduce:transition-none">
  {content}
</div>
```

**Sibling cards share one shape.** When several rails or lists stack under a shared parent header, every card in them has the same aspect ratio and anatomy. Differentiation belongs at the group level (header, label), never at the card-shape level.

Shadow tokens (warm-tinted, defined as CSS custom properties, never arbitrary values in component code). Use **the project's token for each role** — the names below are the example convention; grep the stylesheets for what this project actually defines:

| Token | Usage |
|---|---|
| `shadow-[var(--shadow-card)]` | Default resting card |
| `shadow-[var(--shadow-card-hover)]` | Card hover / interactive lift |
| `shadow-[var(--shadow-overlay)]` | Modals, drawers, sheets, popovers |
| `shadow-[var(--shadow-header)]` | Header bottom edge |

Never `shadow-sm` / `shadow-md` / `shadow-lg` for surfaces — those are cold gray. In dark mode reduce shadow opacities by ~40%; elevation is communicated through surface color differences, not shadow contrast.

## Segmented control (filters, toggles — never a row of buttons)

```tsx
<div className="bg-muted flex gap-0.5 rounded-lg p-1">
  {options.map((opt) => (
    <button
      key={opt.value}
      className={cn(
        'rounded-md px-3 py-1 text-sm transition-all duration-150 motion-reduce:transition-none',
        value === opt.value
          ? 'bg-background text-foreground font-medium shadow-sm' // shadow-sm is essential
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

The `shadow-sm` on the active segment is the "raised tab" feel. Without it, it's just a gray bar. If the DS exports a `Tabs` or `SegmentedControl`, use it.

## Icons

- **Lucide only**, rendered bare: `<Icon className="h-4 w-4 text-muted-foreground" aria-hidden />`, transitioning to `text-foreground` or `text-primary` on hover/active.
- **Never** wrap an icon in a `bg-primary/10 rounded-md p-2` container — this is the admin-template anti-pattern. Exception: timeline markers in an activity feed may use small `rounded-full` circles with a category color at 10% opacity.
- **No emoji as icons, ever.** No AI-cliché icons: no `Sparkles`, `Wand`, `Bot`, `Brain`, `Zap` for "smart" features. Pick an icon that describes the *action or object*, not the technology.
- **Image fallback pattern**: when an image fails or is absent, never drop a bare icon onto a flat background. Use the project's fallback surface — a gradient tinted from the brand hue with a drop-shadowed icon (or the DS's fallback component) — so the fallback reads as designed, not broken.
- Icon-only controls: always `aria-label`. Decorative icons: always `aria-hidden`.

## Consumer, mobile-first surfaces

The default surface. Design at 375px first; everything below is the phone layout, and desktop adapts it.

- **Cards in rails.** Horizontally-scrolling rails of cards are the primary way collections are browsed. The rail scrolls inside its own container with the page never scrolling sideways; cards snap where the platform supports it. Sibling rails under one header share one card shape (see **Card anatomy**).
- **Sheets and drawers over new pages.** Secondary content opens as a bottom sheet with a visible drag handle, dismissed by handle and backdrop. It is not a second navigation stack, and the panel is inset so it owns the whole sheet rather than floating inside it.
- **Sticky CTAs.** The primary action lives in the bottom third — a sticky bottom bar for a committed action — and respects `env(safe-area-inset-bottom)` so nothing hides under the home indicator. Destructive actions never sit where a thumb rests.
- **Touch targets ≥ 44×44px**, with ≥ 8px between adjacent targets. An icon-only control at 24px is a defect, not "compact".
- **One primary action per screen**, filled. Everything else is `outline` / `ghost`. Mutually-exclusive filters are a segmented control, never a row of buttons.
- **Image-first.** Every card family has a fixed aspect ratio so nothing jumps on load, and every image slot has a designed fallback — the gradient-plus-drop-shadowed-icon pattern in **Icons**, never a bare icon on a flat background.
- **Empty, loading and error states are designed surfaces**, not blank frames: a skeleton shaped like the content it replaces, an empty state with one sentence and a next action.

## Data-dense surfaces (admin, dashboards)

The patterns below apply to internal, data-dense screens — tables, dashboards, editorial tooling. **They are not the consumer default**: on a consumer mobile surface, prefer a card list to a table, and a value in a card to a chart.

### Tables and badges

```
Container:    bg-card border border-border rounded-xl shadow-[var(--shadow-card)] overflow-hidden
Row density:  [&_td]:py-2.5 on the wrapper (~40px rows)
Row borders:  border-border/50 (not full --border — should be barely visible)
Row hover:    hover:bg-muted/50 transition-colors duration-150
Selected row: bg-primary/5 border-l-2 border-primary
Header:       text-foreground font-medium, border-b border-border/50
```

Do not edit a generated table primitive — override at the usage layer. On mobile, prefer a card list over a table; a horizontally-scrolling table is a last resort and must scroll inside its own container.

Badge pattern (use the DS `Badge` if it exists; these are its variants). Where a token is named below, use **the project's token for that role** — the name in parentheses is the example, not a guarantee it exists:
- Highlighted: the project's warning tint plus its on-warning text token (e.g. `bg-warning/15 text-warning-foreground border border-warning/30`) with `text-xs font-medium uppercase tracking-wide`
- Secondary category: a secondary chart/accent hue at low opacity (e.g. `bg-chart-5/15 text-foreground border border-chart-5/30`) with the same type treatment
- Draft / muted (a status badge for unpublished records — an admin concept): `bg-muted text-muted-foreground border border-border text-xs font-medium uppercase tracking-wide`

### Chart tooltip (always styled — never the library default)

```tsx
contentStyle={{
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-foreground)',
  fontSize: '12px',
  boxShadow: 'var(--shadow-overlay)',
}}
```

Substitute the project's own popover, border, radius and overlay-shadow tokens if they are named differently. Chart colors derive from the brand's accent hue family (the project's chart series tokens, e.g. `chart-1` … `chart-5`), never the library's blue/red/green defaults. Every chart lives inside a card; wrap in `<figure role="img" aria-label={…}>`.

## Spacing rhythm

- Within a section (between related items): `gap-4` (16px) or `space-y-4`
- Between sections: `space-y-8` (32px)
- Only these two values at the page/section level.

## Motion restraint

Every CSS property that changes on hover/focus/press has a `transition-*`, paired with `motion-reduce:transition-none`; every `animate-*` with `motion-reduce:animate-none`. Animate only `transform`, `opacity`, `color`, `box-shadow` — never `width`, `height`, `top`, `left`. Reduced motion means less motion, not no feedback.
