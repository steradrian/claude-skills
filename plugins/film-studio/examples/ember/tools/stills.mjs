// Renders single frames so you can review a shot without playing the film.
//   npm run stills -- 2 18.5 26 40      (times in seconds)
//   npm run stills -- 26 --width 1080   (default width 540, height follows 9:16)
// Frames land in stills/tNN.N.png.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, openFilm, arg, root } from './browser.mjs';
import { build } from '../build.mjs';

const times = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] || '').startsWith('--')).map(Number).filter((n) => !Number.isNaN(n));
if (!times.length) { console.log('Usage: npm run stills -- <seconds> [<seconds> ...] [--width 540] [--software]'); process.exit(1); }
build();
const width = Number(arg('width', 540)), height = Math.round((width * 16) / 9);
const out = join(root, 'stills'); mkdirSync(out, { recursive: true });
const { browser, ctx } = await launch({ width, height });
for (const t of times) {
  const started = Date.now();
  const { page, errors } = await openFilm(ctx, `still&t=${t}`);
  const file = join(out, `t${t.toFixed(1).padStart(4, '0')}.png`);
  await page.locator('#c').screenshot({ path: file });
  console.log(`${t.toFixed(1)}s -> ${file} (${Date.now() - started} ms)${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
