// Renders the film frame by frame (deterministic, no dropped frames), renders the score
// offline, and muxes both into an MP4 with ffmpeg.
//   npm run export                        1080x1920, 30 fps, 4-sample motion blur
//   npm run export -- --fps 60 --blur 6   smoother, slower
//   npm run export -- --width 540 --blur 1 --from 17 --to 25   quick preview of one section
// Output: export/ember.mp4 (plus export/frames/*.png and export/score.wav).
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, openFilm, arg, root } from './browser.mjs';
import { build } from '../build.mjs';

build();
const width = Number(arg('width', 1080)), height = Math.round((width * 16) / 9);
const fps = Number(arg('fps', 30)), blur = Math.max(1, Number(arg('blur', 4))), shutter = Number(arg('shutter', 0.5));
const outDir = join(root, 'export'), framesDir = join(outDir, 'frames');
rmSync(framesDir, { recursive: true, force: true }); mkdirSync(framesDir, { recursive: true });

const { browser, ctx } = await launch({ width, height });
const { page, errors } = await openFilm(ctx, 'capture&t=0');
const info = await page.evaluate(() => window.__filmInfo);
const from = Number(arg('from', 0)), to = Math.min(Number(arg('to', info.total)), info.total);
const first = Math.round(from * fps), last = Math.round(to * fps);
console.log(`Rendering ${last - first} frames at ${info.width}x${info.height}, ${fps} fps, ${blur} sub-frame(s) each`);
const started = Date.now();
for (let f = first; f < last; f++) {
  const url = await page.evaluate(([t, fps, sub, sh]) => window.__captureFrame(t, fps, sub, sh), [f / fps, fps, blur, shutter]);
  writeFileSync(join(framesDir, String(f - first).padStart(5, '0') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  if ((f - first) % fps === 0 || f === last - 1) {
    const done = f - first + 1, rate = (Date.now() - started) / done;
    process.stdout.write(`\r  ${done}/${last - first} frames, ~${Math.round((rate * (last - f - 1)) / 1000)} s left   `);
  }
}
console.log('\nRendering the score offline...');
const wav = await page.evaluate(() => window.__renderAudioWav());
writeFileSync(join(outDir, 'score.wav'), Buffer.from(wav, 'base64'));
await browser.close();
if (errors.length) console.warn('Page reported errors:', errors.join(' | '));

const mp4 = join(outDir, 'ember.mp4');
const ffArgs = ['-y', '-framerate', String(fps), '-i', join(framesDir, '%05d.png'),
  '-ss', String(from), '-t', String(to - from), '-i', join(outDir, 'score.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '320k', '-shortest', mp4];
const ff = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });
if (ff.error || ff.status !== 0) {
  console.log('\nffmpeg was not found or failed. Frames and score are ready; mux them with:\n  ffmpeg ' + ffArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' '));
} else console.log(`\nDone: ${mp4}`);
if (existsSync(mp4) && !arg('keep-frames', false)) rmSync(framesDir, { recursive: true, force: true });
