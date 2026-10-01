# Sound

Every sound is synthesized in `FILM.score(sc, at, ok, N)` and scheduled against the picture's clock. `at(e)` converts film seconds to audio time, `ok(e)` skips cues before a seek point, and `N` holds note frequencies (`N.C4`, `N.Fs5` and so on).

## Instruments (on `sc`)

| Call | Use |
|---|---|
| `drone(t0, t1)` | Low tension bed with air |
| `pad(t, notes, dur, { peak, a, rel, cut, cut2 })` | Chords that open up, and the main musical body |
| `hit(t)` | Sub drop plus a glass sparkle, for the big reveal |
| `riser(t0, t1, peak)` | Builds into a cut; stops dead at `t1` |
| `tick(t)`, `relay(t)`, `snap(t)` | Precision clicks, mechanical switches, UI taps |
| `whoosh(t, dur, f1, f2, peak, pan1, pan2)` | Camera moves and wipes |
| `kick(t, peak)`, `shaker(t, peak, pan)`, `bass(t, f, { dur, peak })` | Pulse and groove |
| `bell(t, f, peak, dur, pan, send, ratio, index)` | Frequency-modulated (FM) bells for magic moments and AI beats |
| `pluck(t, f, { peak, dur, pan })` | Marimba-ish mallet notes (stylized, 2D) |
| `pop(t, { f, peak, pan })`, `boing(t, { f, peak })` | Bubbles, landings, bounces |
| `tone(t, {...})`, `noiseHit(t, {...})` | Build anything else |

## Rules

- **Build the cue list with the shot list.** Every cut or transition gets a sound. Every sound gets a reason.
- **Silence is an instrument.** Cut everything for 0.3 to 0.5 s before the biggest hit.
- **Plan the loudness arc, then measure it.** The review report prints dB RMS per second. The reference arc: intro about -24, pre-hit dip about -28, hit about -13, body about -20, intimate section about -27, resolve about -16.
- **Watch the sub.** Sub-bass carries most of the measured energy but is barely audible on phone speakers. Keep drones modest, and put energy in the mids where phones play it.
- **Peaks stay under 0.97.** The report flags clipping. Lower the loudest cue rather than the master.
