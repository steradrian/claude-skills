# Style pack: product-ui-kinetic  (spec-only)

Real app UI — cards, chips, search bars, map tiles, toasts — as the hero, flying, stacking and
zooming with screen-recording energy. No phone bezel, no mockup frame: the UI itself fills the
stage and bleeds off every edge.

## Palette logic
One brand colour carries every primary action and selected state; surfaces stay near-white or
near-black; semantic colours (success, alert) appear only on the specific chip/badge they belong
to, never as decoration. Brand colour replaces the default blue.

Reference: surface `#f7f7f8` · ink `#14151a` · brand blue `#3b5bfd` · success `#1fb974` ·
alert `#ff4b4b` · hairline grey `#e4e4e8`.

## Type
- Display: Manrope (800), Plus Jakarta Sans (700) for headlines set over the UI.
- UI/body: Inter, Plus Jakarta Sans, 15–34px — must match what the fake app itself uses.
- Numerals/meta: JetBrains Mono, Roboto Mono for timestamps, prices, coordinates — tabular figures.

## Textures & materials
- `AD.uiCard` elevation via two-layer `drop-shadow`, 16–24px radius, optional glass
  (`backdrop-filter: blur`) variant for overlay panels.
- `AD.uiSearchBar`, `AD.uiChip` (filter pills, selected/unselected states).
- `AD.uiMapTile` flat vector map pattern (roads, blocks) behind pins — never a real map screenshot.
- `AD.uiToast` notification banner; `AD.uiTabBar` bottom nav rendered as a floating set piece.
- Background is a very faint dot-grid or soft radial brand-tinted gradient, never flat white.

## Film settings
`{"grain": .08, "weave": 0, "dust": 0, "vignette": .15, "leakBase": 0}` — this is a clean digital
surface, not film; skip grain-heavy or leak treatments entirely.

## Motion grammar
- Full frame rate, no on-twos, no boil — crisp and rendered, not hand-made.
- Entrances: translate + scale (0.92→1) + opacity with `back`/`elastic`, reserved for 1–2 hero
  cards per scene; everything else enters with plain `out5` or it reads bouncy and cheap.
- Camera behaves like a screen recording: continuous slow pan/zoom, occasional push-through a
  card until it fills frame and becomes the next scene's background (zoom-through transition).
- A `tapRipple`/`cursorDot` sells interaction — never actual finger/hand art.
- Depth via parallax scale + short `blur(4-8px)` on receding cards, not on the hero.

## Transitions
Card stack shuffle (fan out / collapse) · zoom-through a card into full-bleed background ·
swipe-dismiss (card flicks off-frame, next card already staged behind it) · glass panel wipe
(blurred translucent sheet slides across) · tab-bar snap (icon fills, content cross-fades under it).

## Components to build on first use (scripts/components/product-ui-kinetic.js)
- `AD.uiCard(parent, {x,y,w,h,title,subtitle,icon,elevation})` — elevated content card, `.face` for content.
- `AD.uiChip(parent, {x,y,label,tone})` — pill, tone = default/selected/success/alert.
- `AD.uiSearchBar(parent, {x,y,w,placeholder})` — typed via `typer`/`typeTo`.
- `AD.uiMapTile(parent, {x,y,w,h,pins})` — flat map with pin drops + route `strokeReveal`.
- `AD.uiToast(parent, {x,y,text,icon})` — slide-down banner with auto-dismiss curve.
- `AD.tapRipple(parent, x, y, t0)` / `AD.cursorDot(parent)` — interaction feedback.

## Signature moments
1. Cards cascading into a stack, then fanning out to reveal each one.
2. Search bar typing a real query; result chips populate one by one.
3. Map pins dropping with bounce, route line drawing between them.
4. Zoom-through transition — a card fills frame and becomes the next scene.
5. Notification toasts cascading and dismissing in sequence.

## Pitfalls
- No phone bezel, ever — cropping tight to the UI is what keeps it from reading as a mockup ad.
- Card shadows via strong `box-shadow` blur muddy the edges at video compression; prefer
  `filter: drop-shadow` two-layer per the craft rules.
- Typed search strings need width-safe containers or they reflow mid-type; pre-measure.
- Elastic/back easing on every element at once reads chaotic — reserve for hero entrances only.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Manrope", "google": "Manrope"},
    {"family": "Plus Jakarta Sans", "google": "Plus Jakarta Sans"},
    {"family": "JetBrains Mono", "google": "JetBrains Mono"}
  ],
  "palette": {
    "surface": "#f7f7f8",
    "ink": "#14151a",
    "brand": "#3b5bfd",
    "success": "#1fb974",
    "alert": "#ff4b4b",
    "hairline": "#e4e4e8"
  },
  "film": {"grain": 0.08, "weave": 0, "dust": 0, "vignette": 0.15, "leakBase": 0, "flicker": 0},
  "background": "#f7f7f8"
}
```
