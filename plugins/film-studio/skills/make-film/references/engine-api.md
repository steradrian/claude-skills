# Engine API

A film project is `engine/` (copied from the kit; don't edit it, run `film update-engine` to refresh), `src/*.js` (your film) and `tools/`. `build.mjs` concatenates everything into one IIFE, so engine functions and constants are plain globals in your film files.

## The FILM contract

```js
const FILM = {
  title: 'Name',                 // used for <title> and reports
  total: 30,                     // seconds
  format: '9:16',                // '9:16' | '16:9' | '1:1' | '4:5' | any 'w:h'
  look: 'photoreal',             // 'photoreal' | 'stylized' | 'motion2d': picks post defaults and render path
  background: 0x000000,          // clear colour (3D looks)
  font: '"Your Font", sans-serif', fontLoads: ['600 40px "Your Font"'],  // optional; also add the <link> in engine/shell.html
  shots: [{ name, start, end }], // drives review frame selection and critic labels. Always fill it in.
  post: { bloom: 0.3 },          // override look defaults for the whole film
  checks: { blackOK: [[13, 13.5]], clipMax: 0.2, expectBlack: true, safeX: 0.05, safeY: 0.04 },
  setup() {},                    // build the scene once: environment, materials, objects, screens, lights
  state(t, S) {},                // PURE: set fields on S for time t. No side effects, no Math.random.
  apply(S) {},                   // push your custom S fields onto objects (transforms, screen updates)
  draw2d(ctx, S, W, H) {},       // motion2d only: draw the whole frame; ctx is at pixel scale
  score(sc, at, ok, N) {}        // schedule sound cues
};
```

The engine calls `setup()` once. For every frame it builds default state, calls `state(t, S)`, applies the standard fields, then calls `apply(S)` (and `draw2d` for 2D), then renders.

## Standard state fields (set in `state`)

| Field | Meaning |
|---|---|
| `camPos`, `camTarget` | `[x,y,z]` or `Vector3` |
| `fov` | vertical field of view, degrees (22 to 30 for products) |
| `focusPoint`, `aperture`, `maxCoC` | depth of field: the point in focus, strength (0 to 8), max blur as a fraction of frame height |
| `lights.<name>` | `{ i, pos, look, w, h, color }` for each area light created with `addAreaLight` or `addStudioRig` |
| `env` | environment reflection strength (0 to 1+) |
| `floor`, `shadow`, `reflStrength` | reflective floor visibility, contact-shadow opacity, reflection strength |
| `lines` | on-screen text: `{ text, y, x, align, size, weight, alpha, words[], blur, rise, color, track, font }`. Sizes are fractions of frame height. |
| `titleA`, `sweep` | embossed metal title opacity and light-sweep position (-0.35 to 1.35). Place it with `titleU.uTitleRect.value.set(x0, y0, x1, y1)`. |
| `exposure`, `fade`, `zoom`, `bloom`, `bloomThreshold`, `grain`, `vignette`, `ca`, `lift`, `tonemap` | finishing: fade to black, radial zoom blur, glow, film grain, vignette, chromatic aberration, split tone, tone curve (0 ACES, 1 neutral, 2 none) |

Add any fields of your own (for example `S.phone`, `S.ui`) and consume them in `apply`.

## Timing helpers

`seg(t, a, b)` gives 0..1 progress. `sm(t, a, b, ease)` gives eased progress. The eases are `E.inOut`, `out`, `in`, `sine`, `quint`, `expo`, `inExpo`, `inOutExpo`, `outQuint`, `outBack`, `inOutBack` and `linear`.

`spring(t, t0, freq, damp)` is a 0 to 1 spring with overshoot. `bump(t, t0, rise, decay)` is a pulse.

`track([[t0, v0], [t1, v1, ease], ...], t)` interpolates keyframes; values can be numbers or arrays.

`lerp`, `mix3`, `clamp`, `hash1(n)` (deterministic noise), `rand()` (seeded).

## 3D helpers

`poseMatrix(pos, yaw, pitch, roll)` and `W3(matrix, localPoint)` let you place cameras and lights relative to an object without touching it. `V3`, `vlerp`.

## Studio (3D looks)

- **Environments:** `useEnvironment('studio' | 'soft' | customPanels)`, and `setEnv(k)` is applied from `S.env`.
- **Materials:** `materialsPhotoreal()`, `materialsClay({ body, back, accent, dark })` and `clayMaterial(color, rough)` all fill `MAT`. `M(options, envMul, Type)` makes your own studio material.
- **Geometry:** `superRect(w, h, r)`, `smoothNormals(geo)`, `roundedSlab(w, h, d, r)` (cards, bubbles, tiles; front face UV-mapped for textures).
- **Device:** `buildPhone(MAT, { dims, camera, details })` returns `{ group, dims, screenMat }`. `PHONE` holds the default dimensions (`Z_GLASS`, `LENS` and so on).
- **Screen:** `createScreen(device, { draw(ctx, state, time, DW, DH), overlay })` returns a screen, and `screen.update(state)` redraws only when the state or the visible part of the glass changes. Design space is 1000 wide. Include `time` and `animated: true` in the state when it animates every frame.
- **Lights:**
  - `addScreenLight(device, color)` lets the screen light the scene.
  - `addAreaLight(name, color, w, h)` creates a light you drive through `S.lights`.
  - `addStudioRig()` gives you `key`, `rimL`, `rimR`, `strip` and `glint`.
  - `addSoftKey({ position, target, intensity })` is a directional light with VSM soft shadows.
  - `castShadows(obj, cast, receive)` sets shadow flags on everything inside an object.
- **Floors:** `addReflectiveFloor()` (planar reflection, `shadowBlob`, `floorU`), `addCyc({ color, back })` (studio sweep), `addOutline(mesh, color, thickness)`.
- **Globals:** `renderer`, `scene`, `camera`, `W`, `H`, `FONT`, `MAX_ANISO`, `makeCanvas`, `rr` (rounded-rect path), `wrapWords`, `drawLines`, `buildTitleMask(text)`.

## 2D (motion2d)

`draw2d(ctx, S, W, H)` runs every frame on a canvas the size of the output. The starter scales it to a 1000-wide design space with `ctx.setTransform(W / 1000, 0, 0, W / 1000, 0, 0)`. The frame then goes through the same finish (bloom, grain, vignette) as 3D.

## Tools

- `npm run dev`: watch, rebuild and serve on :5173. `?t=12` seeks; `?still&t=12` freezes a frame.
- `npm run stills -- 12 18.5 [--width 540]`: single frames into `stills/`.
- `npm run review [-- times...] [--per-shot 3] [--width 405] [--no-audio]`: the review loop output in `review/`.
- `npm run export [-- --fps 30 --blur 4 --width 1080 --from a --to b]` writes `export/film.mp4`. It needs ffmpeg.
- Any tool takes `--software` (CPU renderer, slow but works anywhere), `--chrome` (your installed Chrome) or `--headed`.
