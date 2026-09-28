# Engine API

`dist/ad.html` = template + `ad.config.json` + `engine.js` + components + `scenes.js`, all inlined
by `build.py`. Everything lives on `window.AD`. Coordinates are stage pixels (e.g. 1080x1920).

## Mental model

- `AD.scene(a, b, bg)` makes a scene visible for absolute times `[a, b)`. It has `s.el`,
  `s.bg` (background layer), and `s.cam` (put content here; transform it as the camera).
- Build DOM once, then assign `s.render = (t, lt) => { ... }`; `t` is absolute time, `lt = t - a`.
- Every frame the engine calls render for active scenes, applies camera shake from all `kick`s,
  then the film layer. Nothing else moves.
- Scenes overlap only if you let them; for cross-scene transitions use `AD.overlay(render)`.
- Brand files: list them in `ad.config.json` → `"assets": {"logo": "assets/logo.svg"}` and
  `build.py` inlines each as a data URL at `AD.assets.logo` (svg, png, jpg, webp, gif, avif).
  Never reference project files by path from `scenes.js`.

## Timing & math

| fn | use |
|----|-----|
| `kf(t, [[t0,v0,'ease'],[t1,v1], ...])` | keyframes; ease names the segment starting at that key |
| `prog(t, start, dur, 'ease')` | 0..1 eased progress of a window |
| `E.lin out2 out3 out5 in2 in3 io io2 back expo elastic` | easings |
| `q12(t)`, `qn(t, fps)` | quantize time (animate on twos: `q12(lt)`) |
| `boil(seed, t, amt=.7, rate=8)` | hand-made jitter, changes `rate` times/s |
| `wobble(seed, t, amt, speed)` | smooth drift noise |
| `rng(seed)` | deterministic random generator: never use Math.random (renders must repeat) |
| `hash(a,b)`, `clamp`, `lerp` | helpers |
| `kick(tAbs, magnitude)` | camera shake impulse (3 hit, 8 to 12 slam, 16 to 18 huge) |
| `AD.beats` | beat times from config (music sync) |
| `W, H, T, C, F` | width, height, duration, full config, film config |

## DOM

| fn | use |
|----|-----|
| `$(tag, cls, parent, style)` | create element |
| `place(el, x, y, w, h)` | absolute position by **centre** |
| `grp(parent, x, y, w, h)` | positioned group (transform-origin centre) |
| `tf(el, x, y, rot, scale, opacity, scaleX=1)` | set transform (offsets from placed position) + opacity |
| `text(parent, str, {x,y,w,h,cls,style})` | placed text div |
| `split(el, text, 'char' or 'word')` | per-letter/word spans for kinetic type (class `.sp`) |
| `typer(el, text)` + `typeTo(el, n)` | typewriter: `typeTo(el, (lt - start) / 0.035)` |
| `svg(parent, innerMarkup)` | full-stage SVG overlay; filter `url(#rough)` is available |
| `strokeReveal(path, p)` | draw a path 0..1 |

Note: `tf` overwrites `transform`. If an element needs a fixed rotation, include it in the `tf`
call every frame (e.g. `tf(el, 0, 0, -8 + wiggle)`), or put it on a parent group.

## Components: core.js

- Textures (data URLs): `NOISE` (paper grain, transparent), `MOTTLE` (blotches), `SPECK`,
  `DISTRESS` (mask). `N` = `url(NOISE)`.
- `paper(color, extraLayer?)`: CSS background with noise. `halftone(dot, bg, size, r)`.
- `mask(el, url=DISTRESS, size='cover')`: worn-print mask.
- `torn(seed, {jit, step, ins, edges:'tctc'})`: clip-path polygon (t torn, c cut; order T R B L).
- `card(parent, {x,y,w,h,bg,seed,edges,jit,step,rim,sh})`: paper piece with fibre rim + shadow;
  content goes in `card.face`. `rim:null` for no rim, `sh:'sh-lite'` or `null` for shadow.
- `tape(parent, x, y, w, h, seed, color)`.

## Components: collage.js

- `P` palette (from `config.palette`; extra keys such as `denim` pass through), `TX` ready
  backgrounds: `paper ink red gray kraft news half grid cork stripes`.
- `ransom(parent, word, {cx, cy, size, seed, order, styles})` returns `[{g, X, Y, rot, i, seed}]`;
  animate each `g`. `ransomWidth(word, size, seed, order)` pre-measures to keep it in bounds.
- `stamp(parent, text, {x,y,w,h,color,size})`: slam it with `tf` scale 2.6→1, `in3`, 0.12s.
- `newsText(parent, {x,y,w,h,rot,op,size,cols,copy})`: faint body copy texture (auto `data-bleed`).
- `halftoneText(parent, str, {x,y,w,h,size,color,dot,font})` returns `{g, front, back}`.
- `misregister(parent, str, {x,y,w,h,size,font,top,under,off})`: two-colour print lockup.
- `markerPath(parent, d, {color,width})` → path for `strokeReveal`.
- `markerText(parent, str, {...})` + `clipReveal(el, p)`: handwriting reveal.
- `outlineWord(parent, str, {x,y,w,h,size,stroke,color,font})`: giant outlined background word
  (`data-bleed`, so it may run off-frame); drive it with `tf`.
- `tornWipe({a, b, bg, seed, rot, ease})`: torn paper sheet that sweeps up over a cut between
  absolute times a and b (an `AD.overlay`). Give it the next scene's background.

Worked example of all of the above: `examples/offcut/engine/` (`scenes.js` + `helpers.js`, which
holds the OFFCUT-only shoe SVG as a model for a project hero).

## Components: receipt-thermal.js

- `RP` palette (`paper ink stamp perforation barcode housing`, from `config.palette`).
- `roll(parent, {x, y, w, maxLen, seed, size, font, pad})`: paper feeding UP out of a slot at
  (x, y). `r.add(node, s, h)` places a node at paper position s (px from the leading edge = top);
  `r.feed(L)` sets how much paper is out; drive `r.el` with `tf` for tear-offs.
- `feedAt(t, [[t0, L0], [t1, L1], ...], step)`: stepper-motor feed length (24 ticks/s).
- `printer(parent, {x, slotY, w, h})` → `{g, body, slot, led}`; add it after the roll so the paper
  vanishes into the slot.
- `line({label, value, size, weight, align, font, spacing, color})`: receipt row with a dotted
  leader; `label` is HTML. `perforation(w)`, `barcode(w, h, seed)`.
- `inkStamp(parent, html, {x, y, w, h, color, size, solid})`: rubber stamp; `solid: true` when it
  lands on printed lines (outline stamps vanish over text).
- `hl(word, color)` wraps a word in a marker highlight; `highlight(el, p)` wipes it in.
- Cameras that follow a growing object use `AD.frameOn` (core.js, below); keep captions on
  `s.el` (above the camera), not on `s.cam`, when the camera zooms hard.

Worked example: `ads/masa-de-alaturi` in bearmenu-fe (local, not in this skill).

## Components: device.js (phones with real app screens)

- `phone(parent, {x, y, w, finish, capW, capH, depth, shadow, safeTop, safeBottom})`: a generic
  modern phone in CSS (silver / graphite / sand), vector-sharp at any zoom, with edge thickness
  under 3D rotation and a glare that follows the angle. It draws the status bar (9:41, signal,
  wifi, battery) around the camera pill and the home indicator, and shows app pages in `ph.view`,
  the safe area below the notch. **Capture pages at the safe viewport, 390 x 751** (844 − 59 − 34),
  or the app's top bar ends up under the camera pill. `ph.status({bg, fg, bottom, indicator})`
  matches the bars to the current page. `ph.pose({rx, ry, rz, s, x, y, z})` every frame.
- Page helpers are in safe-view capture px: `screenPage(ph, src)` (`scrollTo(px)`, clamped to the
  page end), `screenSheet(ph, src)` (a drawer that slides up; `set(p, scroll)`), `tapAt(ph, x, y)`
  (a ripple), `screenPoint(ph, px, py, cx, cy)` (stage px, to aim `AD.frameOn` for a dive).
- `lift(ph, src, box, {hole, radius, scroll})`: an ELEMENT capture (tone pill, review card,
  highlighted span) placed exactly over its spot inside the phone's 3D rig; `set({z, s, x, y, rx,
  ry, rz, o, lift})` pops it toward the camera with a growing two-layer shadow and leaves a gap in
  the page. This is how a highlight is "wrapped": the element itself comes out of the screen,
  never an outline drawn over a flat screenshot.
- Motion blur: `ad.config.json` → `"motion_blur": {"samples": 6, "shutter": 0.5, "ranges":
  [[t0, t1], ...]}` makes render.py average sub-frames across the shutter on fast moves.
- Captures come from the real app pages with a fictional data layer (bearmenu: `ads/_mock/`);
  the engine waits for every image to decode before the first frame.

`frameOn(fx, fy, px, py, k)` (core.js): camera that keeps stage point (fx, fy) at screen point
(px, py) at scale k; returns `[x, y]` for `tf(s.cam, x, y, rot, k)`.

## Adding components for a new style

Create `scripts/components/<style>.js` in the skill (so every future ad can use it), wrap it in an
IIFE, read what you need from `AD`, and `Object.assign(AD, {...})`. List it in the project's
`components`. Project-only helpers can live in the project as `helpers.js`, listed as
`"helpers.js"` in `components`. Document new functions in this file.

## Patterns

**Staggered slam-in on twos**
```js
L.forEach(l => { const st = .85 + l.i * .075; const p = clamp((q12(lt) - st) / .17); const e = E.back(p);
  tf(l.g, 0, (1 - e) * -40, l.rot + (1 - p) * 22 + boil(l.seed, lt, .8), lerp(2.5, 1, e), p > 0 ? 1 : 0) });
L.forEach(l => kick(sceneStart + .85 + l.i * .075 + .17, 5));   // at build time, absolute times
```
**Whip-pan out / in (end of scene A, start of scene B)**
```js
const whip = prog(lt, dur - .17, .17, 'in3'); tf(s.cam, -1500 * whip, 0, 0, 1);
s.cam.style.filter = whip > 0 ? `blur(${whip * 22}px)` : 'none';
// scene B: const w = 1 - prog(lt, 0, .16, 'out3'); tf(s.cam, 1500 * w, ...); blur(w * 22)
```
**Sub-cuts inside one scene** (rapid proof section): build each cut as a child container, then
`sub.forEach((d, i) => d.style.display = i === k ? 'block' : 'none')` with `k` from cut times.
**Cross-scene wipe**: `AD.tornWipe({a, b, bg})`, or roll your own with
`AD.overlay((t, el) => { el.style.display = t >= a && t < b ? 'block' : 'none'; ... })`.
**Fit a ransom row to the safe zone**: `let size = 178; while (AD.ransomWidth(word, size, seed, order) > maxW) size -= 2;`
with `maxW` = safe width / final camera scale, centred on the middle of the safe zone.
**SVG parts that animate independently**: give each part `class="pg"`, set
`style.transformBox='fill-box'; transformOrigin='50% 50%'` and drive `style.transform` per frame.
**Music sync**: `const b = AD.beats; kick(b[4], 10);` and schedule cuts at beat times.

## Debug

- `dist/ad.html?t=7.3` opens paused at 7.3s; the scrubber and Space work in the preview.
- `window.__render(t)` renders any time (used by shoot/render scripts).
- `shoot.py --times 7.2,7.3,7.4` to inspect a moment frame by frame.
