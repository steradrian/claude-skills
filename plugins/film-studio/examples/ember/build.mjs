// Concatenates src/*.js (in filename order) into one IIFE and inlines it, plus the
// RectAreaLight tables, into src/shell.html. Output: dist/ember.html (self-contained).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export function build() {
  const src = join(root, 'src');
  const parts = readdirSync(src).filter((f) => /^\d\d_.*\.js$/.test(f)).sort();
  const app = "(() => {\n'use strict';\n\n" + parts.map((f) => `/* ---- ${f} ---- */\n` + readFileSync(join(src, f), 'utf8')).join('\n') + '\n})();\n';
  const html = readFileSync(join(src, 'shell.html'), 'utf8')
    .replace('/*__LTC__*/', () => readFileSync(join(src, 'lib', 'ltc.js'), 'utf8'))
    .replace('/*__APP__*/', () => app);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'ember.html'), html);
  new Function(app); // throws on a syntax error so the build fails loudly
  return { files: parts.length, kb: Math.round(html.length / 1024) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = build();
  console.log(`Built dist/ember.html from ${r.files} modules (${r.kb} KB)`);
}
