# Lessons from the Ember build

Every entry below was found by rendering frames and looking at them. The "obvious" cause was wrong often enough that the rule is: find the cause, then change one thing.

## Picture

**Blacks looked navy.**
The split tone added blue to the shadows, and 0.008 linear blue becomes about 23/255 after sRGB encoding. Grain also lifted pure black. Fix: mask the shadow toning with `smoothstep(0.0, 0.12, luma)` and scale grain to 25% in pure black.

**Macro shots were blown out.**
Sweep lights sized for a full product shot were far too hot at macro distance, and glass at a grazing angle reflects close to 100% (Fresnel). Fix: intensities dropped from 60 to 4 on the grazing glass shot, from 22 to 7 on the key, and from 18 to 3 on the lens. Always re-tune intensity per shot.

**The front glass turned fully white during the reveal, twice, for different reasons.**
First suspect: the sweep light. Narrowing it did nothing. Second suspect: the big overhead softbox. Narrowing that did nothing either. The real cause was a rim light behind the phone. At that yaw the glass mirrored it, and it was wider than the glass's reflected angle, so it covered the whole face. Fix: rim strips narrowed from 0.26 to 0.085 wide with intensity raised to keep the energy. The reflection became a band that slides across the glass, which is the shot you want.

**The lens macro didn't read as a lens.**
Twice. The camera was so close the lens was wider than the frame. The glint light also wasn't at the mirror angle, so it never appeared on the lens glass. Fix: compute the frame width (`2 * d * tan(fov/2) * aspect`) before placing macro cameras. For a glint, reflect the view vector off the surface normal and put the light on that line.

**Brushed texture on the side keys looked like scratches.**
The texture was scaled for the long frame, not small parts. Fix: a separate key material with no roughness map and lower anisotropy.

**The floor never appeared.**
The reveal camera was too tight: the phone filled 85% of the frame height and the reflection fell below it. Fix: pull back so the phone fills about 70%, and lower the look-at target slightly.

**The floor looked like grey haze, then like a hard orange rectangle.**
At roughness 0.3 the screen light's reflection was a sharp rectangle. At 0.55 the key light turned the whole floor grey. Fix: roughness 0.4 and a darker albedo.

**Chat text glowed and fringed.**
The screen's emissive intensity pushed white text above the bloom threshold, and chromatic aberration fringed every glyph. Fix: emissive intensity drops to about 1.1 once the chat fills the frame, the bloom threshold rises to 1.25 and aberration falls to 0.005. Draw glows into the UI canvas itself (the orb has its own gradient halo) instead of relying on bloom.

**Answer text clipped at the right edge.**
Camera drift plus a UI column that was too wide for the visible width. Fix: pull the camera back slightly, narrow the columns and cut the drift amplitude in half.

**A grey block flickered during the push into the screen.**
It was the home indicator, smeared into a trapezoid by the zoom blur. Fix: fade it in with the chat UI after the move.

**The metal title looked gold and gummy.**
The bevel was too wide, the warm fill too strong and the face too flat. Fix: blur radius 7 to 4, warm bottom light cut to 40%, a stronger top-to-bottom face gradient, and a faint drifting sheen so it isn't dead after the sweep passes.

## Sound

**The mix was upside down.**
The act-one drone measured about -16 dB RMS and the post-reveal music about -27 dB, so the film got quieter when the light came on. Most of the drone's energy was sub-bass you'd feel on headphones and not hear on a phone. Fix: drone down 60%, pads, pulse and final chord roughly doubled. Resulting arc: -24 intro, -28 before the hit, -13 at the hit, -20 through the reveal, -27 in the chat, -16 at the closing chime.

## Tooling

**A headless render hung for three minutes with no output.**
`require.resolve('three/build/three.min.js')` fails because three's package `exports` hides `build/`. The request route was never installed, three.js didn't load, the page threw, and the tool waited for a ready flag that never came. Fix: resolve files by path on disk, and fail fast on the first page error.

**Two-sample motion blur ghosts.**
Two sub-frames give a visible double image on fast moves. Use four or more for final renders.
