# Craft: 2D motion

The goal is graphic, precise and confident, like a design studio's motion reel. Depth comes from shadow, lift and layering, not from 3D.

## Type is the lead actor

- **Use a real scale.** In the starters' 1000-wide design space: display 130 to 170, headline 100 to 110, caption 70 to 80, UI 28 to 34, call to action 28 to 30.
- **Tight tracking at display sizes** (-0.02 to -0.035 em), neutral at small sizes. One family, two or three weights.
- **Reveal text through masks** (`slotText` in the starter): words rise through an invisible slot. Fades are the fallback, not the default.
- **Move text in phrases,** not letters. Letter-by-letter animation reads as a template.

## Motion curves

- **Graphic moves** (wipes, slides, scale-ins of shapes) use expo curves: `E.expo`, `E.inOutExpo`, and `E.inExpo` for exits.
- **Physical moves** (cards, phones, bubbles, avatars) use `spring()`.
- **Exits are faster than entrances.** Leave the frame on `inExpo` or `inOutBack`.
- **Stagger by 0.05 to 0.15 s.** Overlap the exit of one beat with the entrance of the next.

## Depth in 2D

- **Soft drop shadows** tinted with the background colour, never grey (`shadowed()` in the starter). Bigger blur and offset means higher up.
- **Lift:** a card that is "picked up" scales up 5 to 10% and its shadow grows.
- **Parallax:** background texture drifts slower than midground.
- **Light:** backgrounds are gradients lit from one side, never a flat fill.

## Transitions

- **Circle wipes from a meaningful point** (the orb). Directional wipes that carry the next scene in with them. Match cuts between shapes.
- **Every transition means something:** the problem gets absorbed, the idea expands, the product arrives.

## UI in motion

- **Draw real, specific UI** with the product's actual copy. Show the interaction: the tap, the typing, the result arriving.
- **One interaction per beat,** captioned above. Let each land for at least 1 s before the next.

## Finish

- **Tone curve `none`** (the plate is already display-ready), light bloom for glows, grain about 0.018 for texture, a small vignette.
- **Export with `--blur 4` or more.** 2D motion without motion blur strobes on fast moves.

## What makes 2D motion look generated

Everything fading up from below on every element. Default easing. Centred-everything layouts with no hierarchy. Stock icons. Gradients as decoration rather than light. Numbers counting up for no reason.
