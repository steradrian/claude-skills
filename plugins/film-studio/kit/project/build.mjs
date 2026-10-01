// Bundles engine/ + src/ into one self-contained page: dist/film.html
// Order: engine modules (00..98), then every src/*.js in filename order, then engine/99_player.js.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export function build() {
  const eng = join(root, 'engine'), src = join(root, 'src');
  const engineFiles = readdirSync(eng).filter((f) => /^\d\d_.*\.js$/.test(f)).sort();
  const player = engineFiles.filter((f) => f.startsWith('99_')), core = engineFiles.filter((f) => !f.startsWith('99_'));
  const filmFiles = readdirSync(src).filter((f) => f.endsWith('.js')).sort();
  const part = (dir, f) => `/* ---- ${dir}/${f} ---- */\n` + readFileSync(join(root, dir, f), 'utf8');
  const app = "(() => {\n'use strict';\n\n" + [...core.map((f) => part('engine', f)), ...filmFiles.map((f) => part('src', f)), ...player.map((f) => part('engine', f))].join('\n') + '\n})();\n';
  new Function(app); // fail loudly on a syntax error
  const title = (filmFiles.map((f) => readFileSync(join(src, f), 'utf8')).join('\n').match(/title:\s*['"`]([^'"`]+)['"`]/) || [, 'Film'])[1];
  const html = readFileSync(join(eng, 'shell.html'), 'utf8')
    .replaceAll('{{TITLE}}', title)
    .replace('/*__LTC__*/', () => readFileSync(join(eng, 'lib', 'ltc.js'), 'utf8'))
    .replace('/*__APP__*/', () => app);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'film.html'), html);
  return { files: filmFiles.length, kb: Math.round(html.length / 1024), title };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = build();
  console.log(`Built dist/film.html ("${r.title}", ${r.files} film file(s), ${r.kb} KB)`);
}
