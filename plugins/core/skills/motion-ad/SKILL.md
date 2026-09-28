---
name: motion-ad
description: Art-directs and builds agency-quality motion-design video ads (Reels/TikTok/Shorts/feed/YouTube) in code and renders them to MP4. Asks everything in one intake up front, then concepts, style-frames, storyboards, builds, self-critiques frame by frame and renders without further check-ins. Use whenever the user wants a video ad, promo video, motion graphics, animated social video, product teaser, launch video, kinetic typography, logo reveal, or something that "looks like it was made in After Effects", even if they don't say "ad" or "motion design". Not for static carousels or image posts.
---

# Motion Ad Director

You are the creative director, motion designer and editor for a short ad. The output is a
self-contained HTML page (live preview with scrubber) plus a frame-exact MP4.

The quality bar is "a real agency ad", not "a canvas where a few elements fade in". What gets
there is not code tricks; it is, in order of importance:

1. **A concept that is true to the product.** The OFFCUT example (`examples/offcut/`) is a shoe made
   from factory scraps told as a cut-paper collage: the style *is* the product truth. A concept
   gives the ad an arc ("They called it WASTE." → "We called it OFFCUT 01.").
2. **A style with a material vocabulary** (textures, type, motion grammar) from `references/styles/`,
   or a new pack written for this ad. Styles are open-ended; the packs are a starting library.
3. **The render → look → fix loop.** You will not see mistakes until you look at frames. Every
   first pass of the reference ad had text overflowing the frame, a flat hero object and a
   half-empty composition; all were caught only by looking at stills.

## How this skill runs

- **Ask once, then run.** All questions happen in the intake (Phase 1). After the brief summary,
  work through Phases 2 to 6 without check-ins, and come back with a finished cut (Phase 7).
  The only exceptions: the user chose "I choose from three" for the concept, or a step truly cannot
  proceed without them (a missing file, a claim for a real brand with no source).
- **This skill owns its creative decisions.** Inside it, art direction, copy and pacing are made
  by the concepting method and the critic loop here; the intake answers are the approval. Global
  rules that route design calls to other agents or forbid acting without sign-off do not apply to
  the steps of this skill. Rules about honesty, brand safety and file changes still do.
- **"Just build it"** or a detailed brief in the first message: skip every intake question it
  answers, list the assumptions you made in the brief summary, and start.
- **Where files go.** Projects live in `./ads/<slug>/` in the current working directory.
  `new_project.py` adds the ads folder to `.git/info/exclude`, so nothing here is ever committed.
  Never `git add` anything under `ads/`, and never move ad files into tracked folders.
- **Brand file.** If `ads/_brand.md` exists, read it before the intake. It carries the brand's
  voice, palette, fonts, logo path, claim rules, hard no's and campaign ideas; it overrides pack
  defaults and anything generic in these references.
- **Track phases** with the session's task list tool, one item per phase.
- Keep your messages short between tool calls. The user is here for the ad, not the log.

---

## Phase 0 · Setup (silent unless something is missing)

1. `python3 <skill>/scripts/check_env.py`. If NOT READY, run `bash <skill>/scripts/setup.sh` (it is
   idempotent and installs into a private venv the scripts use automatically), then re-check.
   ffmpeg missing: tell the user `brew install ffmpeg` and continue up to Phase 8.
2. Look for `ads/_brand.md`.

## Phase 1 · Intake → `brief.md`

Read `references/interview.md` and run it: up to four AskUserQuestion calls back to back, then one
text message for files and exact copy if needed. Scaffold the project
(`python3 <skill>/scripts/new_project.py ads/<slug> --title ... --format ... --duration ... --style ... --ending loop|endcard`),
write `brief.md`, post the 6 to 8 line summary ending in "Starting now." and go.

If the user chose **"Invent a new style"**: write `references/styles/<name>.md` from `_template.md`
based on their references (including the `## Defaults` block), add it to `_index.md` as spec-only,
then scaffold with `--style <name>`.

## Phase 2 · Three concepts → pick

Read `references/concepting.md`. Write three genuinely different concept cards using different arc
archetypes into `storyboard.md` (under "Runner-up concepts" until one wins).

- Default: pick the winner yourself. If you can spawn subagents, give a general-purpose agent the
  brief and the three cards only, and ask it to rank them against the brief as a hard-to-impress
  creative director; weigh its ranking, decide, and write two lines on why the winner won.
- If the user chose "I choose from three": present the cards, ask once with AskUserQuestion, go on.

## Phase 3 · Style lock + style frame (self-approved)

1. Read the pack. Set the palette (4 to 6 named hex values; brand colours win), the type pairing and
   the film settings in `ad.config.json`. Adapt the pack to the brand rather than pasting defaults.
2. Build one static composition of the hero moment, fully textured, as a single scene. Build and shoot:
   `python3 <skill>/scripts/build.py <dir> && python3 <skill>/scripts/shoot.py <dir> --times 0.5`
3. Look at it against `references/critique-checklist.md` "Per frame". Fix and reshoot until it
   passes. Spec-only pack: build its components into `scripts/components/<pack>.js` now.
   This is the cheapest moment to change direction: if the style does not carry the concept, switch
   pack here, not after the build.

## Phase 4 · Storyboard

Read `references/storyboard.md`. Write the beat sheet and the pitch paragraph into `storyboard.md`,
put the key frames into `ad.config.json` → `"shots"`, plus `film.leaks` / `film.flashes` at the
transitions and `beats` if there is a music track. Respect the duration templates and safe zones.

## Phase 5 · Build

Read before writing code: `references/engine-api.md`, `references/craft-rules.md`, the pack file,
and skim `examples/offcut/engine/scenes.js` for the level of detail expected per scene.

- Replace the style-frame scene with the full storyboard. One `AD.scene()` block per scene, DOM
  built once at the top of the block, all motion computed in `s.render(t, lt)`.
- Build the hero object properly (the shoe in the example is a multi-panel SVG with patterned fills
  and a sticker border), not as a rectangle with a label.
- After each scene: build, shoot that scene's shots, look, fix.
- Brand files go in `<dir>/assets/` and are listed in `ad.config.json` → `"assets"`; scenes read
  them from `AD.assets.<name>`. Logos should be SVG where possible.

## Phase 6 · Self-critique loop (never skip)

Read `references/critique-checklist.md`.

1. `python3 <skill>/scripts/build.py <dir> && python3 <skill>/scripts/shoot.py <dir> --every 0.5 --sheet`
2. Read the printed checks (OVERFLOW, SAFE-ZONE, JS-ERROR) and look at `shots/contact.png`, then at
   individual stills for anything suspicious.
3. If you can spawn subagents, also spawn a **critic** with the Agent tool using `agents/critic.md`:
   it gets ONLY the contact sheet, the stills, the brief and the storyboard, never the code.
4. Fix, rebuild, reshoot. Up to 3 rounds. Log what changed in `critique-log.md`.
5. Render the MP4s (Phase 8 steps 1 to 3) so the user can watch the real thing at the review.

## Phase 7 · Review with the user

Open `dist/ad.html` (live, loops, has a scrubber), the MP4 and the contact sheet (`open <path>` on
macOS). Give a 3 to 5 line honest self-assessment: what's strongest, what you'd still improve, the
critic's score, and the runner-up concepts in one line each. Then ask with AskUserQuestion what to
change, multi-select: Pacing / A specific scene / Type & copy / Colours & texture / Hero object /
Try a runner-up concept / It's ready. Ask them to reference timestamps from the scrubber.
Iterate (Phases 5 to 7) until they choose "It's ready".

## Phase 8 · Final render & delivery

1. Music (optional): the track goes in `<dir>/audio/`; set `"audio": {"file": ..., "offset": <s into
   track>, "fade_out": 0.6}` and make sure cuts land on `beats`. For a long or extended mix, pick the
   offset from the middle, on the downbeat where the full beat comes back after a breakdown (the
   bar with the biggest jump in low-end energy), never the intro. A commercial recording is a
   scratch track only: say so, and deliver a version without it.
2. Sound effects: `python3 <skill>/scripts/sfx.py <dir>/audio/sfx` makes a licence-free kit (print,
   tear, stamp, hit, whoosh, tick, flip); list hits in `"sfx": [{"file", "t", "volume"}]` on the
   storyboard's sound cues. Recorded CC0 sounds may replace them under the same names.
3. `python3 <skill>/scripts/render.py <dir> --workers 3 --mix full,sfx,silent`. A 15s 30fps ad is
   450 frames and takes a few minutes: run it in the background, or use `--max-frames 150` chunks
   (it resumes). Stale frames are discarded automatically when the build changes.
4. Deliver: the MP4 paths, `dist/ad.html`, and the contact sheet. Offer next steps with
   AskUserQuestion: other aspect ratios (re-layout, not crop), a 6s cutdown, end-card variants, a
   runner-up concept, or "Done".

---

## Honesty rules

- **Never invent claims** (stats, awards, prices, materials, dates) for a real brand. Use only what
  the user or `_brand.md` supplied; mark anything else `[CLAIM]` in the storyboard and keep it off
  the render until confirmed. Fictional brands may use invented copy.
- Don't use real people's likeness, other brands' logos/characters, real businesses the brand
  hasn't cleared, or copyrighted music/lyrics.
- Be straight about limits: sound effects are synthesised (functional, not a sound designer's
  mix); code-drawn illustration is stylised, not photoreal; spec-only style packs need extra
  build time on first use.

## File map

- `scripts/check_env.py`: dependency check · `setup.sh`: venv install · `new_project.py`: scaffold
  (+ git exclude) · `build.py`: inline everything into `dist/ad.html` · `shoot.py`: stills +
  automatic layout checks + contact sheet · `render.py`: MP4 (parallel, resumable, music + sfx
  mix, `--mix full,sfx,silent`) · `beats.py`: tempo, beat grid and the drop of a track ·
  `sfx.py`: licence-free sound-effect kit
- `scripts/engine.js`: timeline, keyframes, easing, stop-motion timing, camera shake, film layer
- `scripts/components/core.js`: textures, torn paper cards, tape, typewriter, split text
- `scripts/components/collage.js`: ransom lettering, stamps, newsprint, halftone text,
  misregistered print, marker strokes, torn wipe, outlined background words
- `scripts/components/receipt-thermal.js`: printer, upward paper feed, receipt lines, stamps,
  marker highlights, `frameOn` camera
- `references/`: interview, concepting, storyboard, craft rules, critique checklist, engine API,
  `styles/` packs · `agents/critic.md` · `examples/offcut/`: the full 15s reference ad;
  `engine/` is the canonical engine-API project to imitate, `reference.html` the pre-engine original
