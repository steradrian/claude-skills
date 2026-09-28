# Storyboard

The storyboard is the contract with the user. Once approved, build exactly it; if you need to
change a beat during the build, say so in the review.

## Beat sheet

Fill the table in `storyboard.md`. Every beat has exactly one hero element (the thing the eye
must land on). If you can't name it, the beat is muddy.

| # | Time | Beat (what we see) | Type on screen | Motion + transition out | Hero | Sound cue |
|---|------|--------------------|----------------|-------------------------|------|-----------|
| 1 | 0.0-2.5 | Black. Ransom letters slam in one by one; red marker strikes the word. | "They called it" / "WASTE." | letters on twos with shake per slam → torn-paper wipe up | the word WASTE | 6 hits + marker squeak |

## Duration templates (seconds)

**15s** (7 to 10 beats):
- 0.0 to 2.5: hook (strongest image/line of the ad, often before any branding)
- 2.5 to 5.5: build / context
- 5.5 to 8.5: turn + hero moment (product/idea at its best, hold a beat)
- 8.5 to 11.5: proof, rapid cuts 0.6 to 0.8s each
- 11.5 to 15.0: brand end card (logo, one line, CTA), hold ≥ 1.5s fully readable

**6s** (3 to 4 beats): 0 to 1.5 hook · 1.5 to 4 hero · 4 to 6 logo + line.

**30s** (12 to 18 beats): hook 0 to 3 · setup 3 to 9 · development 9 to 18 · hero 18 to 23 ·
proof 23 to 26 · end card 26 to 30. Needs a stronger concept; montage alone gets boring.

## Timing rules

- On-screen text needs `0.5 + words / 3` seconds of fully legible time (after its entrance).
- Hard cuts on beats; if there's music, every cut lands on a value in `beats` (or a half-beat).
- Rapid-cut sections: 0.6 to 0.8s per cut, never below 0.4s for anything with text.
- Hold the hero at least 1.2s with only secondary motion (bob, drift, push-in).
- Vary rhythm: fast section, then a hold, then fast. Constant speed reads as noise.
- Transitions should be motivated by the content (a torn sheet wipe in collage, a whip-pan after a
  fast move, a light burn into a new scene), and each style pack lists its own vocabulary.

## Safe zones (kept by `ad.config.json` → `safe_zone`: top, right, bottom, left in px)

- **9:16**: top 220 (account name, progress), bottom 400 (caption, CTA button, audio), right 130
  (like/comment rail), left 60. Key text and the logo live inside. Texture and big background type
  may bleed; mark such elements `data-bleed="1"` so the checker ignores them.
- **4:5 / 1:1**: 60 all round, bottom 100 to 120.
- **16:9**: 60 to 80 all round, bottom 120 if it may carry subtitles.

## Key frames → config

For each beat choose the frame that best shows it (usually just after the hero lands, not during
motion) and add it to `ad.config.json`:

```json
"shots": [{"t": 1.9, "label": "hook: WASTE struck"}, {"t": 7.3, "label": "hero: shoe + notes"}]
```

Also add transition accents to the film settings:
`"film": {"leaks": [[5.28, 0.7, 0.1]], "flashes": [8.55, 9.3]}` (leak = [time, amount, width]).

## The pitch paragraph

Write the storyboard's top as a pitch, one short paragraph per section: "We open on black. Before
anyone knows what this is, six scraps of paper slam in spelling WASTE...". The user reads it at the
final review next to the cut, so it must explain every choice without you in the room.
