# Ember, a real-time reveal film

A 52-second, 9:16 product reveal rendered live in the browser with three.js and Web Audio. Nothing is pre-rendered: the phone, the lights, the screen UI and the score are all generated from code and driven by one clock, so every playback is identical.

## Quick start

```bash
npm install
npm run setup        # downloads the headless Chromium used by stills and export
npm run dev          # http://localhost:5173, rebuilds on every save in src/
```

Reload the tab after a save. Controls while it plays: space or click pauses, R restarts.

URL parameters make tuning fast:

| Parameter | What it does |
|---|---|
| `?t=35` | Start playback at 35 s (audio starts there too) |
| `?still&t=35` | Render one frozen frame at 35 s, no overlay, no audio |

`dist/ember.html` is the built, self-contained page. It loads three.js r159 from jsDelivr and Instrument Sans from Google Fonts, so opening it directly needs a connection.

## Changing the content

Everything the viewer reads lives in `src/00_copy.js`: the name, the opening line, the tagline, the call to action, the clock, the question and the answer.

A few things adapt on their own and a few don't:

- **Typing speed and answer streaming stretch to fit your text.** Keep the question under about 110 characters and the answer under about 40 words, or both run too fast to read.
- **The metal title is generated from `COPY.name`.** It shrinks to fit, but short names (4 to 7 letters) carry the emboss best.
- **Screen UI colours** are in `UI_COL` at the top of `src/20_ui.js`. The ember orb's colours are in `drawOrb()` in the same file.
- **The typeface** is set in two places: the Google Fonts link in `src/shell.html` and the `FONT` constant in `src/10_core.js`. The stills and export tools load Instrument Sans from `node_modules/@fontsource` for deterministic renders. If you change the font, update `tools/browser.mjs` too, or delete the font routing there and let it load from Google.
- **The phone** is modelled in `buildPhone()` in `src/10_core.js`: body dimensions (`PW`, `PH`, `PD`, `PR`), camera module, keys and antenna lines.

## Changing the timing

Picture and sound are scheduled separately against the same clock, so **a timing change has to be made in both `src/50_timeline.js` and `src/40_audio.js`**. Search both files for the number you're moving.

| Time (s) | Beat | Picture (`50_timeline.js`) | Sound (`40_audio.js`) |
|---|---|---|---|
| 0 to 4.6 | Edge macro, hairline highlight | first `if` block in act one | drone, first whoosh |
| 4.6 / 7.4 / 10.2 / 13.0 | Hard cuts: key, lens, glass, black | act one `else if` blocks | `tick()` at each cut |
| 11.6 and 11.95 | Ember heartbeat under the glass | `bump()` calls in the glass shot | two warm tones |
| 13.5 to 16.8 | "Every idea starts in the dark." | the line block | riser from 15.2 |
| 17.2 | The hit: sweep, rims, key light | `sweepX`, `rimL`, `rimR`, `key` | `hit()` |
| 24.8 | Screen wakes | `if (t >= 24.8)` | orb bells, `hum()` |
| 26.3 / 27.0 / 27.7 | Relays switch the lights off | `offK()` calls | `relay()` at each |
| 30.5 to 33.0 | Push into the screen | camera path, `S.zoom` | whoosh, pad |
| 33.3 to 36.0 | Typing | `typed` | key taps |
| 36.25 | Send | `sent` | send tone |
| 37.4 to 41.6 | Answer streams | `stream` | sparkle bells |
| 42.5 to 48.2 | Pull back to the end card | `END_POS`, `END_TGT` | final pad, riser |
| 46.4 | Metal title and sweep | `titleA`, `sweep` | closing chime |
| 50.8 to 52.0 | Fade out | `S.fade` | master fade |

The total length is `TOTAL` in `src/10_core.js`.

## Reviewing a shot without watching the film

```bash
npm run stills -- 2 18.5 26 40          # writes stills/t02.0.png and so on
npm run stills -- 26 --width 1080       # full resolution (default is 540 wide)
```

This is the most important tool in the project. Every visual decision in this film was made by rendering frames, looking at them and fixing what was wrong. The craft guide explains the loop.

## Exporting an MP4 for Instagram or TikTok

```bash
npm run export                          # export/ember.mp4, 1080x1920, 30 fps, 4-sample motion blur
npm run export -- --fps 60 --blur 6     # smoother and slower to render
npm run export -- --width 540 --blur 1 --from 17 --to 25   # quick preview of one section
```

This renders every frame deterministically, so there are no dropped frames. It averages sub-frames across half the frame interval to get film-camera motion blur (`--shutter 0.5` is a 180-degree shutter). It renders the score offline to `export/score.wav` and muxes both with ffmpeg into H.264 and AAC at 1080x1920, which is the spec Reels and TikTok expect. Install ffmpeg first (`brew install ffmpeg`). Without it the tool leaves the frames and WAV and prints the exact command to run.

Speed depends on your GPU. I tested the pipeline in a sandbox on a software renderer, not on a Mac. If renders are slow on yours, try `--chrome` (uses your installed Chrome, which usually gets GPU access even when headless) or `--headed`. `--software` forces the CPU renderer, which works anywhere but is very slow.

## Project structure

```
src/
  shell.html        page, overlays, CSS tokens
  00_copy.js        all viewer-facing text
  10_core.js        renderer, environment, materials, phone model, floor reflection, lights
  20_ui.js          the app UI drawn onto the phone screen
  30_post.js        depth of field, bloom, metal title, grade, grain, text layer
  40_audio.js       synthesized score and sound design
  50_timeline.js    the shot list as a function of time, playback, capture hooks
  lib/ltc.js        RectAreaLight lookup tables from three.js (MIT)
build.mjs           concatenates src/ into one IIFE and inlines it into dist/ember.html
dev.mjs             watch, rebuild and serve
tools/              stills, export and shared headless-browser setup
cinematic-web-film/ the craft guide as an agent skill
```

## Licences

three.js and the RectAreaLight tables are MIT. Instrument Sans is under the SIL Open Font License. The phone is an original design. It deliberately isn't an iPhone, so the film is safe to use for a real product.
