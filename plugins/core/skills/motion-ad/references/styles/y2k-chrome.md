# Style pack: y2k-chrome  (spec-only)

Early-2000s digital optimism: bevelled chrome type, bubble/blob shapes, noisy candy gradients,
early-web UI chrome (title bars, loading bars, a drawn cursor). Bouncy and rendered, never gritty.

## Palette logic
A metallic chrome gradient carries type and frames; one or two candy accent gradients carry hero
shapes; a noisy desktop-wallpaper gradient sits behind everything. No sparkle/star glyphs — shine
comes from the specular sweep and chrome bevel, never a decorative icon. Brand colour becomes the
lead candy gradient.

Reference: chrome light `#f4f6fa` → chrome shadow `#5c6472` · cyber blue `#3ea0ff` → violet
`#7b5cff` · magenta `#ff2ea6` → orange `#ff8a3d` · desktop teal `#0e6f74` → purple `#5b2a86`.

## Type
- Display chrome: Bungee, Fredoka, Baloo 2 (chunky/rounded, rendered via bevel technique below).
- UI/window chrome: VT323 or Chakra Petch, small, for title bars and status labels.
- Body: Quicksand, Poppins.

## Textures & materials
- `AD.chromeText(parent, str, {x,y,size,font,gradient})` — three-layer bevel: dark offset copy
  behind, gradient-fill main copy, thin white highlight stroke on top.
- `AD.blob(parent, {x,y,w,h,seed,gradient})` — organic animated blob, squash-and-stretch capable.
- `AD.uiWindow(parent, {x,y,w,h,title,content})` — title bar, traffic-light buttons, frosted panel.
- `AD.progressBar(parent, {x,y,w,pct})` — faux loading bar for boot-up beats.
- `AD.cursor(parent, {x,y})` — drawn mouse cursor with a click-ripple helper.
- Backgrounds are noisy gradients (CSS gradient + low-opacity `NOISE` overlay) for the dithered look.

## Film settings
`{"grain": .28, "weave": 0, "dust": .1, "vignette": .05, "leakBase": 0}` — period-accurate dither
noise, near-zero vignette, no light leaks; the signature light effect is the chrome specular
sweep, not film damage.

## Motion grammar
- Elastic/bouncy motion throughout, but reserved to 2–3 hero elements per scene (`E.elastic`/
  `back`, overshoot scale 1.15–1.3 settling) — everything else uses `out5` or it turns chaotic.
- Blobs squash-and-stretch like early Flash animation.
- A specular highlight band sweeps continuously across chrome hero type/shapes, masked to the
  glyph or shape it's on.
- UI windows "boot up": scale from 0 with a swoosh, progress bar fills fast, content pops in after.
- Full frame rate, no on-twos, no boil/grain-heavy treatment — smooth and rendered, digital-clean.
- Camera mostly static with gentle drift; this is a flat-screen desktop world, not handheld.

## Transitions
Window-close/minimize wipe (frame scales into a corner, next scene "opens" the same way) · blob-
morph iris (a blob scales up as a mask) · chrome-slab swipe (a chrome bar slides across the cut,
specular sweep timed to it) · dial-up scanline build-in (coarse top-to-bottom band reveal, used
sparingly as a period gag) · drag-and-drop snap (cursor drags an element into place, bounce-lands).

## Components to build on first use (scripts/components/y2k-chrome.js)
- `AD.chromeText`, `AD.blob`, `AD.uiWindow`, `AD.progressBar`, `AD.cursor` as above.
- `AD.specularSweep(el, t, period)` — animated highlight band, masked to its target shape.

## Signature moments
1. Chrome wordmark booting up with elastic bounce and a specular sweep across it.
2. UI window opening with a swoosh, progress bar filling, content popping in.
3. Blob shapes squash-stretching as containers for feature callouts.
4. Cursor drag-and-drop snapping a UI element into a window, bounce landing.
5. Window-close wipe transition between scenes; chrome-slab swipe on hard cuts.

## Pitfalls
- Chrome bevel needs its three layers in order (dark offset, gradient fill, highlight stroke) or
  it renders as flat gradient text, not chrome.
- An unmasked specular sweep covering the full rectangle looks like a loading bar, not a shine.
- Elastic easing on every element in a scene at once reads chaotic — stagger it, and give the
  rest of the scene `out5`.
- No sparkle/star glyphs anywhere — shine is the specular sweep and blob highlights, never an icon.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Bungee", "google": "Bungee"},
    {"family": "Chakra Petch", "google": "Chakra Petch"},
    {"family": "Quicksand", "google": "Quicksand"}
  ],
  "palette": {
    "chromeLight": "#f4f6fa",
    "chromeShadow": "#5c6472",
    "cyberBlue": "#3ea0ff",
    "violet": "#7b5cff",
    "magenta": "#ff2ea6",
    "deskTeal": "#0e6f74",
    "deskPurple": "#5b2a86"
  },
  "film": {"grain": 0.28, "weave": 0, "dust": 0.1, "vignette": 0.05, "leakBase": 0, "flicker": 0},
  "background": "#0e6f74"
}
```
