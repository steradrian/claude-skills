// Rebuilds on every save in src/ and serves dist/ at http://localhost:5173.
// Reload the browser tab to see changes. Append ?t=35 to jump to 35 s,
// or ?still&t=35 to freeze on a single frame while you tune it.
import { createServer } from 'node:http';
import { readFileSync, watch, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const rebuild = () => {
  try { const r = build(); console.log(`[${new Date().toLocaleTimeString()}] rebuilt (${r.kb} KB)`); }
  catch (e) { console.error('Build failed:', e.message); }
};
rebuild();
let timer;
watch(join(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 80); });
createServer((req, res) => {
  const file = join(root, 'dist', 'ember.html');
  if (!existsSync(file)) { res.writeHead(500); return res.end('Build failed, check the terminal.'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Serving http://localhost:${PORT}  (Ctrl+C to stop)`));
