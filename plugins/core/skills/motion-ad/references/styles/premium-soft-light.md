# Style pack: premium-soft-light  (spec-only)

Quiet luxury: soft gradients, frosted glass, slow camera moves, light sweeping across surfaces,
lots of air. Everything is expensive-feeling because nothing hurries.

## Honest constraint
This style depends on a beautiful hero. With product photography (transparent PNG cut-outs) it
can look genuinely premium. Without photos, steer the concept to typography, abstract light
and material, or an app UI, and tell the user why. A code-drawn product in this style looks cheap.

## Palette logic
Tonal: one hue family in 4 to 5 values plus warm white. Reference (warm): bone `#f4efe8`, sand
`#e6d9c8`, clay `#c9a88a`, espresso `#3b2a22`. Cool alternative: mist `#eef1f4`, steel `#c9d2dc`,
slate `#5b6875`, ink `#1b2027`. Accent only as light, never as a flat block.

## Type
Elegant pairing: a refined serif display (e.g. Fraunces at low optical size, Cormorant, Instrument
Serif) + a quiet sans (Inter, Manrope) for small text. Tracking +0.02em on small caps labels,
generous line height. Type sizes smaller than other packs; whitespace does the work.

## Materials (components to build on first use: scripts/components/soft.js)
- `glassCard(parent, {x,y,w,h,radius})`: `backdrop-filter: blur(24px) saturate(1.2)`, 1px inner
  highlight border, very soft two-layer shadow.
- `gradientField(parent, stops)`: layered radial gradients that drift slowly (`wobble`), plus fine
  noise (`AD.N`) to avoid banding.
- `lightSweep(el, p)`: a diagonal highlight (linear-gradient mask) moving across a surface.
- `softReveal(el, p)`: blur(20px)→0 + opacity + 20px rise.
- `productShot(parent, dataUrl, {x,y,w})`: cut-out with contact shadow and reflection.

## Film settings
`{"grain": .12, "weave": 0, "dust": 0, "vignette": .15, "leakBase": 0, "flicker": 0}`, with
optional one warm leak at the reveal.

## Motion grammar
- Slow: 0.8 to 1.6s moves with `io`/`io2`; camera push 1.0 → 1.05 over a whole scene.
- Parallax depth with 3 layers, gentle.
- Reveals by blur-and-rise, never slams, never shake.
- Holds are long (1.5 to 2.5s). Fewer beats: 5 to 7 in 15s.

## Transitions
Cross-dissolve through a light bloom · focus pull (blur out, blur in) · a light sweep that wipes
into the next scene · slow match move on a curved surface.

## Signature moments
The product turning slowly under a moving light · a single line of serif type resolving from
blur · a glass card with one key number.

## Pitfalls
Banding in gradients (always add noise). Too many elements. Default "SaaS" look if you use
rounded cards everywhere; keep glass to one element per scene.

## Defaults
```json
{"components": ["core"],
 "fonts": [{"family": "Serif", "google": "Instrument Serif", "axes": "ital@0;1"},
           {"family": "Sans", "google": "Manrope", "axes": "wght@300..700"}],
 "palette": {"bone": "#f4efe8", "sand": "#e6d9c8", "clay": "#c9a88a", "espresso": "#3b2a22"},
 "film": {"grain": 0.12, "weave": 0, "dust": 0, "vignette": 0.15, "leakBase": 0, "flicker": 0},
 "background": "#f4efe8"}
```
