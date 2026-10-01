// Shared headless-browser setup. three.js and the font are served from node_modules,
// so renders are deterministic and work offline.
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const filmPath = join(root, 'dist', 'film.html');
export const filmURL = pathToFileURL(filmPath).href;

export function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
export function positional() {
  const out = [];
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) { const n = process.argv[i + 1]; if (n !== undefined && !n.startsWith('--') && isNaN(Number(n)) === false && ['width', 'cols', 'fps', 'blur', 'shutter', 'from', 'to', 'per-shot'].includes(a.slice(2))) i++; continue; }
    out.push(a);
  }
  return out;
}
/** viewport for a given output width, from the film's declared format */
export function viewportFor(width) {
  const m = readFileSync(filmPath, 'utf8').match(/format:\s*['"](\d+):(\d+)['"]/);
  const [fw, fh] = m ? [Number(m[1]), Number(m[2])] : [9, 16];
  return { width, height: Math.round((width * fh) / fw) };
}
export async function launch(viewport) {
  const args = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
  if (arg('software', false)) args.push('--use-angle=swiftshader');
  const opts = { args, headless: !arg('headed', false) };
  if (arg('chrome', false)) opts.channel = 'chrome';
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const nm = join(root, 'node_modules');
  const threePath = join(nm, 'three/build/three.min.js'), fontDir = join(nm, '@fontsource/instrument-sans/files');
  if (existsSync(threePath)) await ctx.route('https://cdn.jsdelivr.net/npm/three@*/**', (r) => r.fulfill({ path: threePath, contentType: 'application/javascript' }));
  else console.warn('three not found in node_modules; loading it from the CDN (run npm install for offline, deterministic renders)');
  if (existsSync(fontDir)) {
    await ctx.route('https://fonts.googleapis.com/**', (r) => {
      if (!r.request().url().includes('Instrument')) return r.continue();
      r.fulfill({ contentType: 'text/css', body: [400, 500, 600, 700].map((w) => `@font-face{font-family:"Instrument Sans";font-weight:${w};src:url(https://fonts.gstatic.com/local-${w}.woff2) format("woff2");}`).join('\n') });
    });
    await ctx.route('https://fonts.gstatic.com/local-*', (r) => {
      const w = r.request().url().match(/local-(\d+)/)[1];
      r.fulfill({ path: join(fontDir, `instrument-sans-latin-${w}-normal.woff2`), contentType: 'font/woff2' });
    });
  }
  return { browser, ctx };
}
export async function openFilm(ctx, query) {
  const page = await ctx.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let failed; const crashed = new Promise((_, reject) => { failed = reject; });
  page.on('pageerror', (e) => { errors.push(e.message); failed(new Error('The film crashed: ' + e.message)); });
  await page.goto(`${filmURL}?${query}`);
  await Promise.race([page.waitForFunction('window.__done === true', null, { timeout: 180000 }), crashed]);
  return { page, errors };
}
export const save = (file, dataURL) => import('node:fs').then(({ writeFileSync }) => writeFileSync(file, Buffer.from(dataURL.split(',')[1], 'base64')));
