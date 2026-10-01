# Craft: photoreal 3D

The goal is a render someone lit, not a render. The light tells the story.

## Light

- **Reveal with light, never with opacity.** The object is always there. Lights move, switch on or sweep across it.
- **Use area lights and an environment built from softboxes.** `addStudioRig()` and `useEnvironment('studio')` do this. Strip lights make strip reflections, and that is what reads as a product studio.
- **On glossy surfaces, narrow strips beat big softboxes.** A light wider than the glass's reflected angle mirrors across the whole screen and reads as "the display turned on". Keep lights that face glass under about 0.1 units wide and let rotation slide the reflection across.
- **Make light a story beat.** The reference switches studio lights off one by one until the product's own screen is the only light.
- **Let emissive products emit.** A screen is an emissive material plus `addScreenLight()`, and it lights the floor and frame.
- **Re-tune intensity for every shot.** A light that's right for a full view blows out a macro.

## Camera

- **Use long lenses:** a vertical field of view of 22 to 30 degrees. Wide lenses read as cheap 3D.
- **Put depth of field on every macro.** Set `S.focusPoint` on the detail that tells the story, `S.aperture` 5 to 7 and `S.maxCoC` about 0.02. Use a whisper of it (aperture 1 to 2, maxCoC under 0.01) on wide shots.
- **Check the width before placing a macro camera.** Frame width is `2 * d * tan(fov / 2) * aspect`. Twice in the reference build, a lens didn't read because it was wider than the frame.
- **Ease every move.** Sine and cubic in-outs, slower than feels natural. Cut on sound. The hero move is one continuous take.

## Materials and model

- **Smooth normals on everything extruded.** `smoothNormals()` handles this, and `buildPhone()` and `roundedSlab()` already use it.
- **Continuous corners** from `superRect()`, with bevels on every edge that catches light.
- **Metal:** `metalness 1`, roughness about 0.3, anisotropy along the brush direction. Keep brushed textures off small parts.
- **Macro details:** a stepped lens ring, an iridescent coating, antenna breaks, ports. Nobody sees them consciously.
- **Planar floor reflection** via `addReflectiveFloor()`. Frame so the reflection is in shot. It grounds the object.

## Finish

- **Use the ACES tone curve**, bloom only on highlights, and chromatic aberration around 0.005.
- **Keep grain in the mid-tones and blacks at 0.** The review flags lifted blacks.
- **When a screen fills the frame,** drop its emissive intensity to about 1.1 and raise the bloom threshold to about 1.25, or UI text glows.
- **Exactly one bold typographic moment.** The embossed metal title (`buildTitleMask`, `S.titleA`, `S.sweep`) is one. Don't add glass or gradient text on top.
