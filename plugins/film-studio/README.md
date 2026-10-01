# Film Studio, a Claude Code plugin

Direct, build, review and export cinematic films rendered in code: product reveals, brand films and UI explainers, in photoreal 3D, stylized 3D or 2D motion, with synthesized sound.

It's built from the process that produced the Ember reveal film. It isn't a list of instructions. It packages the three things that actually made the difference:

- **An engine with tuned defaults.**
  - A time-driven timeline and area-light studio rigs.
  - Physically based and clay material presets, and an original phone model.
  - Screens that stay sharp up close, depth of field, bloom and film finishing.
  - A synthesized score engine and deterministic export.

  Agents start from something that already looks filmed.
- **Eyes and rulers.** `npm run review` renders frames across every shot, measures them (lifted blacks, blown highlights, text outside the safe area, black frames), tiles a labelled contact sheet, and measures the score's loudness arc and clipping.
- **A process with gates and a separate critic.** The `make-film` skill runs direct → blockout → look → sound → review → export. The `film-director` subagent writes the concept and shot list for your approval. The `film-critic` subagent judges frames without ever reading code, so the builder can't grade its own work.

## Install

```bash
# from the adrian marketplace (steradrian/claude-skills)
claude plugin install film-studio@adrian

# or try a local checkout for one session
claude --plugin-dir plugins/film-studio
```

Run `claude plugin validate plugins/film-studio` if anything doesn't load.

Requirements are Node 18+ and ffmpeg for MP4 export (`brew install ffmpeg`). Each film project installs its own Playwright Chromium with `npm run setup`.

## Use

Ask Claude Code for a film in plain words, for example: *"Make a 30-second vertical launch film for our AI chat app, photoreal, dark and premium."* The skill triggers on its own. You can also invoke it with `/film-studio:make-film`.

You'll be asked to approve the direction (idea, look, shot list, every line of copy) before anything is built, and to approve the final contact sheet before export.

Direct commands (on PATH while the plugin is enabled):

```bash
film new my-film --look stylized --format 9:16    # scaffold from a starter
film doctor                                        # check the setup
film review | stills | dev | export                # the project's tools
film update-engine                                 # refresh engine/ and tools/ in a project
```

## The starters

| Look | Starter | Film type | Length |
|---|---|---|---|
| `photoreal` | Ember: a phone revealed in the dark; its screen becomes the only light | Product reveal | 52 s |
| `stylized` | A clay phone drops into a soft studio; ideas pop out as 3D bubbles | Brand or promo | 16 s |
| `motion2d` | Kinetic type, a circle wipe, a flat UI walkthrough in three beats, a lockup | UI explainer | 15 s |

All three are verified. I built each one, rendered it, reviewed the frames and fixed what was wrong, and they render with zero automatic flags. The photoreal starter is pixel-identical to the published Ember film. Starters are for their craft, not their stories: the director agent is told not to reuse their concepts unless they genuinely fit.

## What's where

```
.claude-plugin/        plugin.json
examples/ember/        the original Ember project (src, tools, built dist/ember.html) and its predecessor skill, cinematic-web-film; the photoreal starter was extracted from it
skills/make-film/      the orchestrating skill + references (film types, three craft guides, sound, engine API, review rubric, lessons)
agents/                film-director, film-critic
bin/film               the CLI
kit/engine/            the runtime copied into every film project
kit/project/           build, dev server, stills, review and export tools
kit/templates/         the three starter films
```

## Honest limits

- **Agents still need to look.** The skill enforces viewing frames, but a session that skips the review loop will produce weaker work. The critic and the gates are there to make skipping it hard.
- **The automated checks find broken frames, not boring ones.** Taste still comes from the director, the critic and you.
- **Render speed depends on the GPU.** The tools were tested on a software renderer in a sandbox, not on macOS. If headless renders are slow on your Mac, add `--chrome` to use your installed Chrome.
- **Browser real-time rendering isn't a render farm.** Hands, people, liquids and cloth will look fake. The craft guides steer concepts away from them.
