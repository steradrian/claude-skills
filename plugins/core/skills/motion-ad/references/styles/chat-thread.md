# Style pack: chat-thread  (spec-only)

Messaging UI as the set: bubbles, typing indicators, reactions and notifications cascading. A
group chat staged and choreographed like a scene, never a single static screenshot.

## Palette logic
A platform-neutral dark chat canvas, one brand colour for sent bubbles, a neutral grey for
received bubbles, one warm accent for reactions/badges. Brand colour replaces the sent-bubble blue.

Reference: canvas `#0e1116` · sent bubble `#4c7cff` · received bubble `#1c2430` · text `#f2f4f8` ·
reaction gold `#ffb020` · online green `#34d17c`.

## Type
- UI sans: Inter, Manrope, Plus Jakarta Sans — 15–32px bubble text.
- Timestamps/meta: Inter 12–13px, tracked, low-opacity.
- Reactions are real emoji glyphs or a small consistent icon set — never custom lettering.

## Textures & materials
- `AD.bubble(parent, {x,y,w,text,sent,tail})` — asymmetric radius + tail, sent/received styling.
- `AD.typingDots(parent, {x,y,sent})` — three-dot bounce loop before a message lands.
- `AD.reactionPill(parent, {x,y,emoji,count})` — pops onto a bubble corner.
- `AD.avatar(parent, {x,y,size,initials|img})`, `AD.toast(parent, {x,y,w,title,body,icon})`.
- Canvas has a subtle dot-grid or soft gradient wallpaper, plus a faint ambient bloom on bubble
  edges instead of vignette-driven darkness.

## Film settings
`{"grain": .08, "weave": 0, "dust": 0, "vignette": .1, "leakBase": 0}` — crisp digital, near-flat;
grain only to avoid gradient banding on the dark canvas.

## Motion grammar
- Bubbles pop in with spring (scale .8→1, `out` back) and slide up slightly as the thread grows,
  pushing older messages up — recompute every prior bubble's Y from the message list each frame,
  never accumulate deltas.
- Typing indicator runs a fixed-period bounce loop (independent of scene start time) before each
  bubble lands.
- Reactions bounce onto a bubble corner with `kick(t, 4-8)`.
- Toasts slide down from the top edge, hold, slide back out.
- Camera mostly locked, following the auto-scroll of the thread rather than moving independently.

## Transitions
Thread-scroll push (new bubble shoves the stack up, camera follows) · toast cascade wipe ·
chat-to-chat card swap (current thread slides off, next slides in) · zoom-into-bubble (camera
pushes into a reaction/bubble until it fills frame and becomes the next scene's background) ·
typing-indicator match-cut into the next message.

## Components to build on first use (scripts/components/chat-thread.js)
- `AD.bubble`, `AD.typingDots`, `AD.reactionPill`, `AD.avatar`, `AD.toast` as above.
- `AD.threadScroll(container, messages, offsetY)` — recomputes bubble stack positions each frame.

## Signature moments
1. Thread building message by message, typing-indicator beats between bubbles, auto-scroll push.
2. Reaction cascade — several emoji pills pop onto one bubble in quick stagger.
3. Notification toast stack cascading down the top of frame.
4. Zoom-into-bubble transition that becomes the next scene's background.
5. Multiple threads staged as a "group," camera moving between them.

## Pitfalls
- Bubble tail side and corner radius must flip together for sent vs received — easy to mismatch.
- Auto-scroll that accumulates per-frame deltas drifts; always recompute from the full message list.
- A typing-dots loop keyed to absolute scene time resets visibly when a scene restarts — key it
  to its own start time.
- More than 2–3 simultaneous toasts reads as a system crash, not a feature moment.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Inter", "google": "Inter"},
    {"family": "Manrope", "google": "Manrope"},
    {"family": "Plus Jakarta Sans", "google": "Plus Jakarta Sans"}
  ],
  "palette": {
    "canvas": "#0e1116",
    "sentBubble": "#4c7cff",
    "receivedBubble": "#1c2430",
    "text": "#f2f4f8",
    "reactionGold": "#ffb020",
    "onlineGreen": "#34d17c"
  },
  "film": {"grain": 0.08, "weave": 0, "dust": 0, "vignette": 0.1, "leakBase": 0, "flicker": 0},
  "background": "#0e1116"
}
```
