// The review loop in one command. Renders frames across the film (by default two per shot),
// measures each one, tiles a contact sheet, renders and measures the score, and writes a report.
//   npm run review                      frames chosen from FILM.shots
//   npm run review -- 18.5 21.8 26      specific times
//   npm run review -- --per-shot 3 --width 405 --no-audio
// Output: review/contact-sheet*.png, review/frames/*.png, review/report.md, review/report.json, review/score.wav
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch, openFilm, arg, root, positional, viewportFor, save } from './browser.mjs';
import { build } from '../build.mjs';

build();
const out = join(root, 'review'), framesDir = join(out, 'frames');
rmSync(out, { recursive: true, force: true }); mkdirSync(framesDir, { recursive: true });
const { browser, ctx } = await launch(viewportFor(Number(arg('width', 405))));
const { page, errors } = await openFilm(ctx, 'capture&t=0');
const info = await page.evaluate(() => window.__filmInfo);

let times = positional().map(Number).filter((n) => !Number.isNaN(n));
if (!times.length) {
  const k = Number(arg('per-shot', 2)), fr = k === 1 ? [0.55] : Array.from({ length: k }, (_, i) => 0.25 + (0.6 * i) / (k - 1));
  times = info.shots.length ? info.shots.flatMap((s) => fr.map((f) => +(s.start + f * (s.end - s.start)).toFixed(2))) : Array.from({ length: 12 }, (_, i) => +(((i + 0.5) / 12) * info.total).toFixed(2));
}
console.log(`Reviewing ${times.length} frames of "${info.title}" (${info.format}, ${info.look}, ${info.total}s)`);
const items = [];
for (const t of times) {
  const r = await page.evaluate((t) => window.__analyze(t), t);
  const file = join(framesDir, `t${t.toFixed(2).padStart(5, '0')}.png`);
  await save(file, r.frame); delete r.frame; r.file = `frames/t${t.toFixed(2).padStart(5, '0')}.png`;
  items.push(r);
  process.stdout.write(`\r  ${items.length}/${times.length}`);
}
console.log('');
const perSheet = 15, sheets = [];
for (let i = 0; i < items.length; i += perSheet) {
  const name = items.length > perSheet ? `contact-sheet-${sheets.length + 1}.png` : 'contact-sheet.png';
  await save(join(out, name), await page.evaluate(([its, cols]) => window.__contactSheet(its, cols), [items.slice(i, i + perSheet), Number(arg('cols', 5))]));
  sheets.push(name);
}
let audio = null;
if (!arg('no-audio', false)) {
  const a = await page.evaluate(() => window.__renderAudio());
  writeFileSync(join(out, 'score.wav'), Buffer.from(a.wav, 'base64'));
  const secs = a.seconds, peak = Math.max(...secs.map((s) => s.peak)), flags = [];
  if (peak > 0.97) flags.push(`Peak ${peak} is at or near full scale: the score clips. Lower the loudest cue.`);
  let run = 0;
  for (const s of secs) { if (s.s >= 1 && s.s < secs.length - 2 && s.rms < -50) { run++; if (run === 3) flags.push(`Near-silence from ${s.s - 2}s for 3+ seconds. Intended as a beat?`); } else run = 0; }
  const loudest = secs.reduce((m, s) => (s.rms > m.rms ? s : m), secs[0]);
  audio = { peak, loudest, flags, seconds: secs };
}
await browser.close();
for (const it of items) delete it.thumb;
const frameFlags = items.filter((i) => i.flags.length);
const md = [];
md.push(`# Review: ${info.title}`, '', `${info.format}, ${info.look}, ${info.total}s. ${items.length} frames. Contact sheet${sheets.length > 1 ? 's' : ''}: ${sheets.join(', ')}.`, '');
md.push('## Automatic flags', '');
if (!frameFlags.length && !(audio && audio.flags.length) && !errors.length) md.push('None. That only means nothing measurable is broken. It says nothing about whether the film is good; that is the critic\'s job.', '');
for (const i of frameFlags) for (const f of i.flags) md.push(`- **${i.t.toFixed(2)}s** (${i.shot || 'no shot'}): ${f}`);
if (audio) for (const f of audio.flags) md.push(`- **Audio**: ${f}`);
for (const e of errors) md.push(`- **Console error**: ${e}`);
md.push('', '## Frames', '', '| Time | Shot | Mean | Darkest 1% | Brightest 1% | Pure white | Render ms | File |', '|---|---|---|---|---|---|---|---|');
for (const i of items) md.push(`| ${i.t.toFixed(2)} | ${i.shot} | ${Math.round(i.mean * 255)} | ${Math.round(i.p1 * 255)} | ${Math.round(i.p99 * 255)} | ${(i.clipped * 100).toFixed(1)}% | ${i.ms} | ${i.file} |`);
if (audio) {
  md.push('', '## Sound', '', `Peak ${audio.peak}. Loudest second: ${audio.loudest.s}s at ${audio.loudest.rms} dB RMS.`, '', 'Loudness per second (dB RMS):', '', '```');
  for (let i = 0; i < audio.seconds.length; i += 10) md.push(audio.seconds.slice(i, i + 10).map((s) => `${String(s.s).padStart(3)}s ${String(s.rms).padStart(6)}`).join('  '));
  md.push('```');
}
md.push('', 'Values are 0-255 sRGB. Render times from a headless browser are only comparable with each other.');
writeFileSync(join(out, 'report.md'), md.join('\n') + '\n');
writeFileSync(join(out, 'report.json'), JSON.stringify({ info, items, audio: audio && { ...audio }, errors }, null, 2));
console.log(`Wrote review/report.md and ${sheets.join(', ')}. Flags: ${frameFlags.reduce((n, i) => n + i.flags.length, 0) + (audio ? audio.flags.length : 0) + errors.length}`);
