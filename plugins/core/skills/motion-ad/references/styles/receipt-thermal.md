# Style pack: receipt-thermal  (proven)

First build: bearmenu "Masa de alături" (15s, 9:16, 2026-09-28). Components live in
`scripts/components/receipt-thermal.js` (see engine-api.md); the notes below the spec record what
that build learned.

Thermal-printer receipts, order tickets and slips: mono type, perforated tear-offs, ink that
fades at the edges of a long print run. The frame prints the ad rather than displaying it.

## Palette logic
One warm-dark "thermal ink" replaces pure black (real thermal print is never true black), one
paper colour, one stamp accent for emphasis (PAID / HOT / NEW), one perforation-grey neutral.
Brand colour becomes the stamp accent.

Reference: paper `#f3efe6` · thermal ink `#3a332c` · stamp red `#c81d25` · perforation grey
`#cfc8b8` · barcode black `#17140f`.

## Type
- Body/numerals: JetBrains Mono, IBM Plex Mono, Space Mono — tabular figures mandatory for
  ticking totals.
- Header/logo line: Courier Prime bold for the classic receipt masthead.
- Sizes: line items 40–56px, totals/hero number 140px+, footer fine print 36px.

## Textures & materials
- `AD.receipt` paper-roll container with subtle vertical fibre grain, curls at the free end.
- `AD.receiptLine(parent, {label, value, y})` — label left, tabular value right, dot-leader fill.
- `AD.perforation(parent, {x, y, w})` — dashed tear line, scales dash spacing with width.
- `AD.barcode(parent, {x, y, w, h, code})` / QR variant.
- `AD.inkStamp(parent, {text, x, y, rot, color})` — distressed rubber-stamp slam.
- Ink fades toward the top of very long prints (opacity ramp on early lines) — the "run out of
  paper heat" detail that sells the medium.

## Film settings
`{"grain": .35, "weave": .8, "dust": .3, "vignette": .2, "leakBase": 0}` — paper fibre grain, no
light leaks (this is print, not exposed film).

## Motion grammar
- Print-head reveal: each line clip-path-wipes in top-down as the "head" passes, not a fade.
- Full receipt scrolls/feeds downward continuously; camera can lock or slow-track with the feed.
- Totals and hero numbers tick like an odometer (per-digit roll, tabular widths only).
- Stamps slam last with `back`/`in3` + `kick(t, 10-14)`.
- At the free end, the paper curls via a perspective/skew transform — apply the curl to the
  container, the print-reveal to the content, in that order.

## Transitions
Guillotine tear-off (a cut line sweeps across, top half curls away) · roll-to-next-receipt swipe ·
crumple-and-toss · ink-stamp slam covering the cut · accordion fold-over reveal.

## Components to build on first use (scripts/components/receipt-thermal.js)
- `AD.receipt(parent, {x,y,w,seed})` — roll container, exposes `.feed` for content, `.curl(p)`.
- `AD.receiptLine(parent, {label,value,y})`, `AD.perforation(parent,{x,y,w})`.
- `AD.barcode(parent, {x,y,w,h,code})`.
- `AD.inkStamp(parent, {text,x,y,rot,color})`.
- `AD.printReveal(el, p)` — top-down clip-path wipe with a soft ink-fade leading edge.

## Signature moments
1. Full receipt printing down the frame, line by line, total ticking up at the end.
2. Guillotine tear-off transition into the next scene.
3. Ink stamp slamming over the hero claim (PAID / HOT / NEW) with a camera kick.
4. Close-up on the curling paper end, logo/tagline on it.
5. Barcode/QR sweep-scan with a flash frame, like a checkout beep.

## Pitfalls
- Non-tabular mono digits make the odometer tick jitter horizontally — verify tabular-nums.
- Curl transform must wrap, not replace, the print-reveal clip-path or lines clip at the wrong angle.
- True black ink reads as laser print, not thermal — keep it warm dark grey, and fade it at the
  top of long runs.
- Perforation dash spacing that doesn't scale with width looks like a scan line, not a tear edge.

## Learned in the first build
- **Printer at the bottom, paper feeds UP.** Hanging paper from a top printer puts the header at the
  bottom, upside down. `AD.roll` feeds up; the header leads and reads first.
- **Park the printer in the platform-UI zone** (slot ≈ y 1650 on 9:16). The bottom 400 px are
  covered by the caption anyway; a big printer body above it is dead space. Feed a blank tail after
  any line that must be read, so it rises clear of y 1520.
- **Receipts 820-840 px wide on 9:16**, mono 46 px for body lines, 80-92 px for the hero line.
  640 px receipts in a 1080 frame look lost.
- **Camera follows the paper** with `AD.frameOn`: tight while the paper is short, closing in as a
  long run speeds up so the oldest lines leave the top. The "endless receipt" only reads if it
  actually overflows the frame.
- **Outline stamps vanish over print.** `inkStamp(..., {solid: true})`, and put it on blank paper or
  a torn edge, not over the evidence.
- **Captions go on `s.el`**, not `s.cam`, whenever the camera zooms hard.
- **Flashes on dark scenes** need `film.flashAmount` ≈ .9 in the paper colour, or they read as a
  grey wash. Film dust 0: scratches read as render hairlines on clean paper.
- Rhythm that worked at 130 BPM: first four lines a beat or more apart (readable), then every beat,
  then half-beats; the repeated highlighted word carries the message when the reader can't keep up.

## Defaults
```json
{
  "components": ["core", "receipt-thermal"],
  "fonts": [
    {"family": "Courier Prime", "google": "Courier Prime"},
    {"family": "JetBrains Mono", "google": "JetBrains Mono"},
    {"family": "IBM Plex Mono", "google": "IBM Plex Mono"}
  ],
  "palette": {
    "paper": "#f3efe6",
    "ink": "#3a332c",
    "stamp": "#c81d25",
    "housing": "#1b1613",
    "perforation": "#cfc8b8",
    "barcode": "#17140f"
  },
  "film": {"grain": 0.35, "weave": 0.8, "dust": 0.3, "vignette": 0.2, "leakBase": 0, "flicker": 0},
  "background": "#f3efe6"
}
```
