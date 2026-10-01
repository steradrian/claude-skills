---
name: cinematic-web-film
description: How to build browser-rendered product films, reveal ads, launch trailers and cinematic hero animations (three.js/WebGL, canvas, Web Audio) that look filmed rather than generated. Use this skill whenever someone asks for an Apple-style ad, a product reveal, a promo reel, a cinematic intro, a "video" made in HTML, a 3D product showcase, motion design in the browser, or says previous attempts looked cheap, templated or vibecoded, even if they never say "cinematic".
---

# Cinematic web film

This skill captures how the Ember reveal film was made. That film is a 52-second, 9:16 product reveal rendered live in the browser. It exists because other agents produced work that looked generated, and this one didn't. The difference was not a secret shader. It was a way of working, plus a handful of decisions about light, camera and restraint that generated work almost never makes.

The reference implementation sits next to this folder (`../src`). When a section below names a technique, the file it lives in is given so you can read working code instead of reinventing it.

## Why generated work looks generated

Recognise these before you start, because they are the default output of any model asked for "a cinematic animation":

- **Light is painted instead of cast.** Gradients, glows and glass effects sit on top of flat shapes, and nothing in the scene is lit by anything.
- **Everything moves at once, all the time.** Floating, pulsing, parallax and fade-up-on-every-element, with no stillness for the eye to rest on.
- **The camera is a slideshow.** Linear tweens, wide lenses and no focus falloff. Nothing is in front of or behind anything.
- **Too many effects.** Glassmorphism, neon, particles, chromatic aberration and metal text everywhere. Each effect is a signature, and five signatures cancel into noise.
- **Tinted near-black backgrounds, all-caps tracked labels, a gradient accent word.** These are template chrome.
- **Nobody looked at the output.** The code was written blind and shipped. This is the biggest one, and the next section fixes it.

## The workflow (don't skip steps)

1. **Validate the concept before writing code.** Write a one-line idea, a dark-to-light (or tension-to-release) arc, a shot list with timecodes, and every line of copy. Get the person to approve it. Push back on requests that would produce a worse or infringing film: a real brand's product, stock footage that can't be relit, effects that are someone else's signature.
2. **Write a compact token system.** Four to six named colours, one typeface, one principle ("light is the only designer"). Pick one bold moment and keep everything else quiet.
3. **Make time the only input.** Write the film as `computeState(t)`, a pure function from seconds to camera, lights, materials, UI and text, plus `applyState()`. Never animate with independent tweens or `requestAnimationFrame` deltas. This one decision gives you seeking, freezing a frame, deterministic export and audio sync for free. See `../src/50_timeline.js`.
4. **Build a still-frame mode on day one.** `?still&t=18.5` renders exactly that frame and sets `window.__done = true`. Drive it with a headless browser to write PNGs. See `../tools/stills.mjs`.
5. **Review in contact sheets and write the critique down.** Render 6 to 15 frames across the timeline, tile them into one image, look at it and list what's wrong in plain words ("front glass whites out at 21.8 s", "answer clips at the right edge"). Fix and re-render. Expect five to ten passes. Every good frame in the reference film came out of this loop, and none came out right the first time.
6. **Diagnose before you tweak.** When something looks wrong, find out which light, material or pass causes it before changing numbers. Change one thing and re-render. See `references/lessons.md` for real examples where the obvious cause was the wrong one.
7. **Measure the sound, don't guess it.** Render the score offline and print peak and RMS per second. Check the arc: quiet tension, a loud hit, a fuller body, an intimate middle and a resolved end. Check that nothing clips.
8. **Export deterministically.** Render frame by frame with sub-frame motion blur, render audio offline, and mux with ffmpeg. Never tell someone to screen-record a real-time film if you can avoid it. See `../tools/export.mjs`.

## Light is the director

- **Reveal with light, not with opacity.** The object is always there. Lights move, switch on, or sweep across it. The first shot of the reference film is a hairline highlight crawling along a corner in total darkness.
- **Use physically based lights with area.** In three.js that means `RectAreaLight` (it needs the LTC tables in `../src/lib/ltc.js`) plus an environment map baked from emissive panels in a black room (`buildEnv()` in `../src/10_core.js`). Strip-shaped lights make strip-shaped reflections, which is the look people read as a product studio.
- **Narrow strips beat big softboxes on glossy surfaces.** A light wider than the glass's reflected angle mirrors across the whole screen and reads as "the display turned on". Keep glass-facing lights narrow and let the object's rotation slide the reflection across.
- **Make light a story beat.** In the reference film, three relay clicks switch the studio lights off one by one until the phone's screen is the only light. It lights the floor warm, and the idea literally becomes the light. Find the equivalent for your product.
- **Let the product emit light when it can.** A screen should be an emissive material and a light source (a `RectAreaLight` parented to the screen) that spills onto the floor and frame.
- **Use true black.** Darkness is the canvas. Keep blacks at 0: no tinted backgrounds, no split toning or grain lifting pure black.

## Camera language

- **Use long lenses.** A vertical field of view of 22 to 30 degrees compresses space and flatters products. Wide lenses read as cheap 3D.
- **Use depth of field on every macro.** Implement a real depth pass and a gather blur (64 golden-angle samples) with a physically shaped circle of confusion. See `dofPass` in `../src/30_post.js`. Focus on the detail that tells the story and let everything else melt into bokeh.
- **Ease everything.** Sine and cubic in-outs for camera paths, and nothing linear. Moves should be slower than feels natural.
- **Cut on sound.** Macro glimpses cut hard on a tick. The hero move is one continuous take from the hit to the end card, and continuity is what makes it feel directed.
- **Frame for the format.** A 9:16 frame with an upright phone is a gift, so use it. Leave room for the floor reflection. Check that UI text never clips at the frame edge, including during camera drift.

## Materials and model

- **Smooth normals.** `ExtrudeGeometry` is non-indexed, so its default normals are faceted and look terrible up close. Average normals by position (`smoothNormals()` in `../src/10_core.js`).
- **Continuous corners.** Build outlines from superellipse corners (`superRect()`), not circular arcs. Add bevels with many segments on every edge that catches light.
- **Physical metal.** `metalness: 1`, a warm titanium tint, roughness around 0.3, anisotropy along the brushing direction, and a subtle roughness map. Keep brushed textures off small parts, where they read as scratches.
- **Details that sell it at macro distance:** a stepped lens ring from a lathe profile, an iridescent lens coating, antenna breaks, a port and speaker holes. Nobody consciously sees them, and everybody feels their absence.
- **Planar floor reflection.** Render a reflected camera into a half-resolution mip-mapped target and sample it with Fresnel and distance fade (`updateReflectionCamera()` and the floor `onBeforeCompile`). It grounds the object and doubles every light for free.
- **Sharp screen UI at any distance.** Redraw the UI canvas only for the part of the glass the camera sees and remap the texture to it (`visibleGlassWindow()` in `../src/20_ui.js`).

## Finish

- **Render into a half-float target and tonemap once, at the end,** with ACES. Do the colour conversion yourself in the composite pass.
- **Bloom only real highlights.** Set the threshold above UI white (about 1.2) once a screen fills the frame, or every letter glows.
- **Keep chromatic aberration at about 0.005, weighted to the corners.** More than that fringes every thin highlight and every UI glyph.
- **Grain lives in the mid-tones.** Scale it down in pure black. Animate it with time so it's deterministic.
- **Use one vignette and one gentle split tone,** masked so blacks stay black.

## Type and copy

- **One family, sentence case, small and quiet.** One line per shot at most.
- **Exactly one bold typographic moment.** In the reference film it's the end title as embossed brushed metal: a height map from a blurred text mask, normals from its gradient, and a moving specular band. See `TITLE_GLSL` in `../src/30_post.js`. Don't also do glass text, gradient text or neon.
- **Reveal words one at a time with a blur-to-sharp and a small rise.** It's cinematic, not a typewriter.
- **Write copy with a turn in it.** For example, "Every idea starts in the dark." sets up "Bring your ideas to light." Show the product doing something specific and human, not "Lorem ipsum" or feature lists.

## Sound

- **Synthesize and schedule everything against the same clock as the picture.** In practice that's an `AudioContext` scheduled at start, with the picture reading `ctx.currentTime`. See `../src/40_audio.js`.
- **The palette:** a low drone with slow filter movement, mechanical ticks on cuts, a riser that cuts to silence just before the hit, a sub-drop hit with a glass sparkle, and pads with slow filter opens. Add soft pulses for momentum, relay clicks for the lights, quiet key taps, FM bells for the AI moments and a closing chime.
- **Silence is an instrument.** The half second before the hit matters more than the hit.

## Review checklist (run it on every contact sheet)

- Is any glossy surface fully white? Find the light that's mirroring across it.
- Are blacks at 0? Check the grain, the split tone and the vignette.
- Does every macro have one clear point of focus?
- Is any UI or text glowing, fringed or clipped at an edge?
- Can you tell what the product is by the end of the reveal? Does the floor reflection read?
- Is there one bold moment, and only one?
- Would a stranger say "that looks like a render" or "that looks like a render someone lit"?
- Is the sound's loudness arc right, with nothing clipping?

## Briefing another agent

When handing this work to another agent, give it this skill and insist on the loop. For example:

> Build the film as a pure function of time with a `?still&t=` mode. After every change, render a contact sheet of at least 8 frames, look at it, and write a numbered critique before touching code. Do not report a shot as done until you've seen it rendered. Read `references/lessons.md` first.

If the agent can't render and view images, it will not reach this quality no matter how good the instructions are. That capability is the real requirement.

## References

- `references/lessons.md` is the failure log from the reference build: what looked wrong, the real cause, and the fix, with numbers. Read it before your first review pass.
