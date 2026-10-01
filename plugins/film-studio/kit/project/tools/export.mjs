// Frame-by-frame MP4 export with sub-frame motion blur and the offline-rendered score.
//   npm run export                       1080 wide, 30 fps, 4-sample motion blur
//   npm run export -- --fps 60 --blur 6
//   npm run export -- --width 540 --blur 1 --from 17 --to 25
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, openFilm, arg, root, viewportFor, save } from './browser.mjs';
import { build } from '../build.mjs';

build();
const fps = Number(arg('fps', 30)), blur = Math.max(1, Number(arg('blur', 4))), shutter = Number(arg('shutter', 0.5));
const outDir = join(root, 'export'), framesDir = join(outDir, 'frames');
rmSync(framesDir, { recursive: true, force: true }); mkdirSync(framesDir, { recursive: true });
const { browser, ctx } = await launch(viewportFor(Number(arg('width', 1080))));
const { page, errors } = await openFilm(ctx, 'capture&t=0');
const info = await page.evaluate(() => window.__filmInfo);
const from = Number(arg('from', 0)), to = Math.min(Number(arg('to', info.total)), info.total);
const first = Math.round(from * fps), last = Math.round(to * fps), started = Date.now();
console.log(`Rendering ${last - first} frames at ${info.width}x${info.height}, ${fps} fps, ${blur} sub-frame(s) each`);
for (let f = first; f < last; f++) {
  await save(join(framesDir, String(f - first).padStart(5, '0') + '.png'), await page.evaluate(([t, a, b, c]) => window.__captureFrame(t, a, b, c), [f / fps, fps, blur, shutter]));
  if ((f - first) % fps === 0 || f === last - 1) { const done = f - first + 1; process.stdout.write(`\r  ${done}/${last - first} frames, ~${Math.round(((Date.now() - started) / done) * (last - f - 1) / 1000)} s left   `); }
}
console.log('\nRendering the score offline...');
const a = await page.evaluate(() => window.__renderAudio());
writeFileSync(join(outDir, 'score.wav'), Buffer.from(a.wav, 'base64'));
await browser.close();
if (errors.length) console.warn('Page errors:', errors.join(' | '));
const mp4 = join(outDir, 'film.mp4');
const ffArgs = ['-y', '-framerate', String(fps), '-i', join(framesDir, '%05d.png'), '-ss', String(from), '-t', String(to - from), '-i', join(outDir, 'score.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '320k', '-shortest', mp4];
const ff = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });
if (ff.error || ff.status !== 0) console.log('\nffmpeg not found or failed. Frames and score are ready; mux with:\n  ffmpeg ' + ffArgs.join(' '));
else console.log(`\nDone: ${mp4}`);
if (existsSync(mp4) && !arg('keep-frames', false)) rmSync(framesDir, { recursive: true, force: true });
