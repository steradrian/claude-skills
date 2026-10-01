// Shared headless-browser setup for stills and export.
// three.js and the font are served from node_modules so renders are deterministic and work offline.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const filmURL = pathToFileURL(join(root, 'dist', 'ember.html')).href;

export function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

export async function launch({ width, height }) {
  const software = arg('software', false);
  const args = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
  if (software) args.push('--use-angle=swiftshader');
  const opts = { args, headless: !arg('headed', false) };
  if (arg('chrome', false)) opts.channel = 'chrome';
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  // three's package exports hide build/, so look for the files on disk instead of require.resolve
  const nm = join(root, 'node_modules');
  const threePath = existsSync(join(nm, 'three/build/three.min.js')) ? join(nm, 'three/build/three.min.js') : null;
  const fontDir = existsSync(join(nm, '@fontsource/instrument-sans/files')) ? join(nm, '@fontsource/instrument-sans/files') : null;
  if (!threePath) console.warn('three not found in node_modules; loading it from the CDN (run npm install for offline, deterministic renders)');
  if (threePath) await ctx.route('https://cdn.jsdelivr.net/npm/three@*/**', (r) => r.fulfill({ path: threePath, contentType: 'application/javascript' }));
  if (fontDir) {
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({
      contentType: 'text/css',
      body: [400, 500, 600].map((w) => `@font-face{font-family:"Instrument Sans";font-weight:${w};src:url(https://fonts.gstatic.com/local-${w}.woff2) format("woff2");}`).join('\n')
    }));
    await ctx.route('https://fonts.gstatic.com/**', (r) => {
      const m = r.request().url().match(/local-(\d+)/);
      if (!m) return r.continue();
      r.fulfill({ path: join(fontDir, `instrument-sans-latin-${m[1]}-normal.woff2`), contentType: 'font/woff2' });
    });
  }
  return { browser, ctx };
}

export async function openFilm(ctx, query) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let failed;
  const crashed = new Promise((_, reject) => { failed = reject; });
  page.on('pageerror', (e) => failed(new Error('The film crashed while loading: ' + e.message)));
  await page.goto(`${filmURL}?${query}`);
  await Promise.race([page.waitForFunction('window.__done === true', null, { timeout: 180000 }), crashed]);
  return { page, errors };
}
