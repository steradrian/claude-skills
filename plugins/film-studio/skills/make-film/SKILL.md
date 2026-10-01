---
name: make-film
description: Direct, build, review and export cinematic films rendered entirely in code (three.js/WebGL, canvas, synthesized Web Audio). Covers product reveals, brand and promo films, and UI walkthroughs or explainers, in photoreal 3D, stylized 3D or 2D motion. Use this whenever the user asks for a video, ad, reel, trailer, promo, launch film, animated explainer, product showcase, motion graphics, a "video made in HTML" or "something like an Apple ad", even if they never say "film". Use it especially when earlier attempts looked generated, templated or cheap.
---

# Make a film

The kit lives at `${CLAUDE_PLUGIN_ROOT}/kit`. The `film` command is on your PATH while this plugin is enabled.

## The one rule

**Nothing is done until you have looked at it.** Every visual claim you make ("the reveal works", "text is legible", "fixed") must come from a frame you rendered and viewed in this session. This single habit is the difference between films that look filmed and films that look generated. It's also why detailed instructions alone have failed before: an agent that can't see its output can't find which of fifty details it got wrong.

## Roles

- **You are the builder and producer.** You write the film, run the tools and own the fixes.
- **`film-director` (subagent)** turns the brief into `direction.md`: the idea, look, shot list and copy. Use it before building and whenever the story needs rethinking.
- **`film-critic` (subagent)** judges review renders against the direction and the rubric. It never sees code. Use it after every review render, before you change anything.
- **The user approves** the direction and the final cut. Automated checks catch broken frames, not blandness, so the human stays in the loop at those two gates.

## Workflow

Work through these in order. Each step ends with a render.

1. **Preflight.** Run `film doctor` and fix anything missing. Stills, review and export need the headless Chromium from `npm run setup`.
2. **Direct (gate: user approval).** Delegate to `film-director` with the brief. Present `direction.md` to the user: the idea, the look, the shot list and every line of copy. Don't build until they approve or adjust it. Push back if the brief would lead to a worse or infringing film.
3. **Scaffold.** Run `film new <dir> --look <photoreal|stylized|motion2d> --format <9:16|16:9|1:1|4:5>`, then `npm install && npm run setup`. Run `npm run review` once on the untouched starter so you know what a good baseline looks and measures like.
4. **Blockout.** Rewrite `src/film.js` to the new shot list: timing, camera or layout, cuts, copy placement and sound cues as simple beats. Keep placeholder materials and colours. Then run `npm run review` and have the critic review timing, composition and legibility only. Lock pacing here, while it's still cheap to change.
5. **Look.** Do lighting, materials, colour, type and the one bold moment, following the craft file for your look. Then review, critique and fix. Repeat until the critic has no Blocker or Major issues. Expect four to eight passes.
6. **Sound.** Flesh out `FILM.score`. The review report measures loudness per second and flags clipping or dead air. Check the arc against the direction's sound plan.
7. **Final review (gate: user approval).** Run a full `npm run review -- --per-shot 3`. Show the user the contact sheet and anything still open.
8. **Export.** Run `npm run export`, which writes a 1080-wide MP4 with sub-frame motion blur and the offline-rendered score.

## The review loop

```bash
npm run review                  # two frames per shot, measured, plus the score
npm run review -- 21.8 26 40    # specific moments while chasing one issue
npm run stills -- 21.8          # a single frame, fastest
```

After each review:

1. **View the contact sheet yourself.** Read the report's automatic flags.
2. **Delegate to `film-critic`** with the review folder and `direction.md`. Take its numbered issues as the work list.
3. **Diagnose before you tweak.** For each issue, find which light, material, pass, camera or keyframe causes it. Change one thing, re-render just that moment with `stills`, and view it. The obvious cause is often wrong. See `references/lessons.md`.
4. **Re-run the full review** when the list is done, and tell the critic what changed.

**Never report a shot as done, fixed or good without a frame you viewed after the change.**

## Choosing a starter

| Starter | Look | Film type it demonstrates | Start here when |
|---|---|---|---|
| `photoreal` | Physically based 3D, true black, area lights, depth of field | Product reveal (52 s) | the product should feel real and premium |
| `stylized` | Clay-like 3D, soft shadows, saturated palette, springs | Brand or promo film (16 s) | playful, tactile, friendly |
| `motion2d` | Flat vector, kinetic type, masks, wipes, depth from shadow and lift | UI walkthrough or explainer (15 s) | the message or interface is the hero |

Starters are for their craft, not their stories. Keep the techniques, replace the concept.

## Working with the engine

A film is `src/film.js` (plus any extra `src/*.js`). It defines one `FILM` object: `total`, `format`, `look`, `shots`, `setup()`, `state(t, S)`, `apply(S)`, `draw2d()` for 2D, and `score()`. Everything on screen is a pure function of time. `state(t, S)` sets fields and nothing animates on its own, which is what makes seeking, review and deterministic export possible.

Read `references/engine-api.md` before writing film code. It lists every state field, helper and preset.

## Definition of done

- The user approved the direction, and the final contact sheet matches it.
- The critic's last pass shows no Blocker or Major issues. You viewed the frames it cites.
- The report has no automatic flags, or each remaining one is intentional and noted.
- The sound arc matches the plan, with nothing clipping.
- The MP4 is exported, if the user asked for one.

## References (read the one you need, when you need it)

- `references/film-types.md`: structures and pacing for reveals, brand films and explainers.
- `references/craft-photoreal.md`, `references/craft-stylized.md`, `references/craft-motion2d.md`: the rules for each look.
- `references/sound.md`: palettes, scheduling and the loudness arc.
- `references/engine-api.md`: the `FILM` contract, state fields, helpers and presets.
- `references/review-rubric.md`: what the critic checks. Read it yourself before a review so you catch the obvious first.
- `references/lessons.md`: real failures from the reference build, with their real causes.
