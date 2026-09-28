# Style pack: retro-vhs  (spec-only)

Home video from 1994: tracking noise, chroma bleed, CRT curvature, on-screen timecode, cheesy
chrome type, and deliberate "rewind" transitions. Nostalgic, funny, self-aware.

## Palette logic
Washed, slightly magenta/green-shifted colours; blacks lifted to dark grey; whites bloom.
Reference: CRT black `#16141a`, lifted grey `#2b2830`, VHS magenta `#e0407a`, teal `#2fbfa8`,
warm white `#f3ead8`, OSD green `#5cff7a` (for the timecode only).

## Type
- OSD: a pixel/mono font (VT323, Press Start 2P used sparingly) for "PLAY ▸", timecode, channel.
- Headline: chunky 90s display with a chrome gradient + dark outline (e.g. Rubik Mono One,
  Bungee), or a brushy script for irony.
- Body: Space Mono.

## Components to build on first use (scripts/components/vhs.js)
- `crt(stage)`: overlay with scanlines (repeating-linear-gradient 2px), slight barrel curvature via
  SVG displacement or radial vignette, bloom (blurred screen-blend copy of the frame is too heavy;
  fake it with a light radial overlay).
- `tracking(t)`: horizontal band of noise that rolls through the frame occasionally.
- `chroma(el, amt)`: red/blue offset copies (like rgbSplit, softer, always on at 2 to 3px).
- `osd(parent)`: "PLAY ▸" + running timecode (derived from t, SP/LP label).
- `rewind(t0, t1)`: reversed motion + fast-forward lines + "◂◂" OSD for a transition.
- `chrome(el)`: gradient-filled text with outline and a moving specular glint.

## Film settings
Use the engine's grain at .45, weave 1.2, dust 0 (VHS doesn't get film dust), vignette .45,
leakBase 0, flicker .06, plus the CRT overlay from vhs.js.

## Motion grammar
- Slightly jerky: on-twos for type, occasional dropped frames (hold 2 frames at random cuts).
- Zooms are "camcorder" digital zooms: stepped scale jumps, not smooth.
- Big moments get a tracking glitch and an OSD label change.

## Transitions
Rewind / fast-forward · channel change (static burst 3 to 5 frames) · tape stop (image stretches
and drops) · tracking roll.

## Signature moments
Opening "PLAY ▸" OSD over black · product shown like a 90s infomercial with chrome type ·
rewind back to the start as the loop.

## Pitfalls
Too much distortion makes copy unreadable: keep the key line clean for its full read time.
Scanlines alias on phone screens at some scales; test on the contact sheet and in the MP4.

## Defaults
```json
{"components": ["core"],
 "fonts": [{"family": "OSD", "google": "VT323"},
           {"family": "Chunky", "google": "Bungee"},
           {"family": "Mono", "google": "Space Mono", "axes": "wght@400;700"}],
 "palette": {"crt": "#16141a", "lifted": "#2b2830", "magenta": "#e0407a", "teal": "#2fbfa8", "white": "#f3ead8", "osd": "#5cff7a"},
 "film": {"grain": 0.45, "weave": 1.2, "dust": 0, "vignette": 0.45, "leakBase": 0, "flicker": 0.06},
 "background": "#16141a"}
```
