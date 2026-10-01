# Craft: stylized 3D

The goal is tactile and toy-like, but still lit like a real studio. Stylized doesn't mean flat; it means simplified with intent.

## Light and space

- **Use one big soft key with wide, soft shadows,** plus a cool fill and a bright environment. `addSoftKey()` uses VSM shadows for exactly this, and `useEnvironment('soft')` fills the room.
- **Stage on a cyclorama** (`addCyc`), where the floor curves into the wall so there's no horizon. Every object casts a shadow on it (`castShadows(obj)`). Shadows are what make stylized objects feel present.
- **Colour the background.** It's a design choice: pick it with the palette, not after.

## Material

- **Clay:** matte, a hint of sheen at glancing angles, a little clearcoat. `materialsClay()` and `clayMaterial()` provide it.
- **Exaggerate the geometry.** Thicker bodies, rounder corners, deeper bevels (see `CHUNKY` in the starter). Chunky reads as friendly.
- **Put text on objects as textures on their faces,** not floating 2D labels. The starter's bubbles show how.
- **Outlines (`addOutline`) are for a toon style only.** Don't mix outlined and clay objects.

## Motion

- **Everything physical is a spring.** `spring(t, t0, freq, damp)` overshoots and settles. Use freq 1.5 to 3.5 and damp 0.3 to 0.55.
- **Squash and stretch on impacts:** squash about 15% on landing, recover on a spring. Preserve volume, so x and z grow a bit when y shrinks.
- **Anticipation and follow-through:** a small dip before a hop, a wobble after landing.
- **Stagger related elements by 0.08 to 0.15 s.** Never pop three things on the same frame.
- **The camera moves like a person holding it gently.** Slow orbits and push-ins, all keyframed with `track()` and eased.

## Finish

- **Use the neutral tone curve** (keeps brand colours true), low bloom, almost no grain, no chromatic aberration, a light vignette.
- **Use a little depth of field** (aperture about 1, maxCoC about 0.006) so the backdrop softens and the subject pops.
- **Keep palette discipline:** background, one hero colour, one accent, and ink for type. The starter uses periwinkle, cobalt, butter yellow and ink.

## What makes stylized look generated

Default purple gradients with floating glossy blobs. Every object bouncing on a loop. Objects with no shadows. Rainbow palettes. Text in default system fonts. Motion without purpose: if you can't say why something moves, it shouldn't.
