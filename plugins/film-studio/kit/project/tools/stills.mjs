// Renders single frames: npm run stills -- 2 18.5 26 [--width 540]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, openFilm, arg, root, positional, viewportFor, save } from './browser.mjs';
import { build } from '../build.mjs';

const times = positional().map(Number).filter((n) => !Number.isNaN(n));
if (!times.length) { console.log('Usage: npm run stills -- <seconds> [...] [--width 540] [--software]'); process.exit(1); }
build();
const out = join(root, 'stills'); mkdirSync(out, { recursive: true });
const { browser, ctx } = await launch(viewportFor(Number(arg('width', 540))));
const { page, errors } = await openFilm(ctx, 'capture&t=0');
for (const t of times) {
  const file = join(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
  await save(file, await page.evaluate((t) => window.__captureFrame(t), t));
  console.log(`${t.toFixed(2)}s -> ${file}`);
}
if (errors.length) console.warn('Page errors:', errors.join(' | '));
await browser.close();
