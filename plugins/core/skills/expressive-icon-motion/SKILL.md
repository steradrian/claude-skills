---
name: expressive-icon-motion
description: Design character animations for icons and small glyphs — the kind where a part of the drawing physically does something. Use when asked to "animate this icon", "make these icons feel alive", "reactive svg icons", for animated nav/tab bars, or whenever an icon animation has been called too subtle or flat. NOT for animating containers, pages or lists — use framer-motion-patterns for those.
metadata:
  version: '1.0.0'
  origin: 'Written after three failed rounds on a mobile tab bar. Every disqualifier below is a mistake that shipped.'
---

# Expressive Icon Motion

Animating an icon is not animating a UI element that happens to be small. The
rules that make a card or a modal feel right — short durations, one or two
GPU properties, restraint — produce dead icons. This skill is the opposite
doctrine, scoped to glyphs.

**It overrides `core:motion-designer` inside that scope.** That agent's
duration table (100–150ms for micro-interactions, "never exceed 500ms") and
its property list (translate / scale / rotate / opacity) describe container
motion. Briefing it for icon character work without this skill reliably
returns a 3-unit translate, which is invisible. If you spawn it for icon work,
put this doctrine in the brief.

---

## The thesis

**The icon depicts an object. Animate the object's behaviour, not the path's
properties.**

The generative question is never "what property can I tween." It is:

> *What does this thing do in the real world, and can I stage that in ~600ms?*

A roof jumps. Utensils uncross, because that is what you do with cutlery
before eating. A calendar rolls pages, because that is time passing. A pin
falls and plants itself. A compass needle spins and settles.

"Roof translates up 3 units" is not a roof jumping. "Fork rotates 12°" is not
uncrossing. Those are property tweens wearing an object's name, and users read
them as nothing at all.

---

## The five mechanism classes

Every good glyph animation is one of these. Pick the class first, then stage it.

| Class | What happens | Examples |
|---|---|---|
| **Detach and return** | A part leaves the body, travels, comes back | Roof jumps · handset lifts off the base · lid pops |
| **Articulate** | Parts hinge apart or together; the outline changes completely | Utensils uncross · scissors open · book opens · wings spread |
| **Cycle content** | The container holds still, contents move through it | Calendar rolls pages · clock hands sweep · funnel passes particles |
| **Fall and land** | Gravity, impact, and a consequence timed to the impact | Pin drops and fills on the descent · stamp presses · coin lands |
| **Deform** | The body squashes, stretches or inflates without separating | Heart inflates · bell rings and wobbles · speech bubble puffs |

If a proposed animation fits none of these, it is probably a property tween.

---

## Disqualifiers

Reject the idea if any of these is true. Each one is a mistake that shipped.

- **It can be described as "property X goes from A to B."** That is a tween, not
  a behaviour.
- **The silhouette is the same shape throughout.** Crossed and uncrossed
  utensils are identifiable from the outline alone at thumbnail size. A roof
  that moved 3 units is not. If the outline doesn't change, nothing reads.
- **Travel is under ~5 grid units.** See the amplitude floor below.
- **A fill or colour change *is* the animation.** Fill is a payoff beat inside a
  gesture — the pin's dot fills *on the descent*, landing with the impact. Fill
  on its own is decoration.
- **It is a spring from one pose to another.** A spring has one phase and its
  overshoot lands after the eye has stopped caring. Springs are for settling,
  not for performing.
- **All the icons in a set do the same thing.** Four icons that each "lift a
  part upward" have no character. One idea per icon, drawn from what that
  object does.

---

## The amplitude floor

The single most common failure is motion that is technically present and
physically invisible. Do the arithmetic before designing:

```
physical px per grid unit = rendered icon size ÷ viewBox size
```

A 22px icon on a 24-unit viewBox is **0.92px per unit**. So:

| Travel | On screen | Verdict |
|---|---|---|
| 3 units | 2.8px | Invisible. A fingertip covers it. |
| 5 units | 4.6px | Marginal. |
| 8 units | 7.4px | Reads clearly. |

**Floor: 6 units. Target: 8–10, or 25–40% of the box.** Rotation should be 30°+
to change a silhouette; 12° does not. Parts are allowed to leave the viewBox —
set `overflow="visible"` and use the padding the tab or button already has.

Ranked by legibility at 22px: **rotation > non-uniform deformation > scale >
translation.** Translation is the weakest and is usually the wrong first choice.

---

## Phase structure

A jump is not a move. It is a performance with beats:

1. **Anticipation** — a small move *opposite* the main one. This is what tells
   the eye something is about to happen, and it is what a spring cannot do
   because its overshoot happens at the end.
2. **Action** — the main travel, fast.
3. **Apex or impact** — the extreme, briefly held.
4. **Consequence** — squash on landing, a secondary part reacting, the fill.
5. **Settle** — return to rest, slightly overshooting.

Five or six keyframes, **400–700ms total**. This deliberately exceeds the
usual UI ceiling. An icon gesture is a performance the user chose to trigger,
not a transition they are waiting through.

Secondary parts follow the primary by 60–120ms. Never simultaneous — the eye
needs to read cause, then effect.

---

## Reactive means driven by input, not by state

"Reactive SVG" does not mean "SVG that plays a clip." It means the glyph
responds to the user.

A state-driven animation fires *after* the outcome: finger lands, nothing
happens, route changes, component re-renders, clip plays. There is no
connection between the finger and the drawing, and no amplitude rescues that.

Build two layers:

- **Pointer layer** — responds on `pointerdown`, immediately, before any
  navigation exists. Holds while held. Releases on lift. Springs back on cancel
  (finger slides off). This is the layer that makes it feel alive.
- **State layer** — the selected/active pose, if any. Keep it mild. Colour and
  stroke weight already communicate selection, so the held pose does not have to
  carry character. Spend the budget on the gesture instead.

---

## Geometry: splitting vs. drawing

Icon-library glyphs are drawn as few paths as possible, which is the opposite of
what motion needs.

- **Splitting** is usually enough: a house's roof and walls are one closed path;
  cut it at the eaves and the round caps hide the seam at rest.
- **Drawing is sometimes required**, and you must flag it rather than discover it
  mid-build. A lucide calendar has no pages — it is a box, a rule and six dots.
  Nothing there can roll. Rolling pages means new geometry.
- **When new geometry is too much, keep the class and change the staging.**
  Calendar pages out of reach → cycle the two rows of day dots upward under a
  clip, old rows leaving the top, new entering from below. Still cycle-content,
  still time passing, no new shapes. **Never substitute downward into a fill or
  a scale and claim the class survived** — that is how a jumping roof becomes a
  3px translate.

---

## SVG implementation notes

- Transform origins on SVG children need explicit user-space values
  (`originX: "12px"`). The default is the element's own box, which is wrong for
  a sub-part meant to pivot elsewhere. Safari resolves these via
  `transform-box: view-box` — verify on iOS.
- **Never morph `d`.** Interpolation requires identical command counts and fails
  silently otherwise. Get shape change from rotation, separation and deformation.
- `pathLength` gives stroke-draw with no dash arithmetic. Keep draws under 250ms.
- Springs interpolate two keyframes. A multi-keyframe array needs a tween with
  explicit easing, or split the layers across nested elements.
- Set `initial={false}` on the root or every icon plays its gesture on hydration.
- Reduced motion: snap the transforms, keep the state legible. Reduced motion
  means less movement, not less feedback.

---

## A starter catalogue

Worked examples, to copy the *method* rather than the specific gestures:

| Icon | Gesture | Class |
|---|---|---|
| House | Roof dips, launches clear of the walls, falls, squashes on landing | Detach and return |
| Utensils | The X opens into two separate utensils, 30–40° each, around low pivots | Articulate |
| Map pin | Rises, falls, the dot fills during the descent and lands with the impact | Fall and land |
| Calendar | Day-dot rows roll upward under a clip, new rows entering from below | Cycle content |
| Search | The lens sweeps an arc, handle pivoting behind it; something appears in the glass on the return | Cycle content + payoff |
| Compass | Needle spins hard, overshoots north, wobbles, settles | Cycle content |
| Filter | Particles drop in, squeeze through the neck one at a time, one drops out | Cycle content |
| Share | The two outer nodes launch along their connecting lines and off the edge | Detach, no return |
| Bookmark | Slides down and tucks away until only the top edge shows, notch last | Fall and land |
| Bell | Swings from its crown, clapper lagging, wobbling to rest | Deform / articulate |

**Some glyphs resist this, and saying so is the right answer.** A person icon is
a circle and an arc with almost no affordance. Flag it and propose a different
idea rather than shipping a shrug and calling it character.

---

## Verifying it reads

Do not judge a glyph animation from the code or from a desktop browser at 100%.

1. **Thumbnail test** — view at the real rendered size on a real device. Most
   failures are invisible here and nowhere else.
2. **Silhouette test** — screenshot the extreme frame and fill every path black.
   If it is the same shape as the rest pose, the gesture will not read.
3. **Scrub test** — record it and step through. You should be able to name each
   phase. If there are only two frames worth looking at, it is a tween.
4. **Ask for a rating, not approval.** "Is this good?" gets a yes. "How does this
   land, 1 to 10?" surfaces a 3 while it is still cheap to fix.
