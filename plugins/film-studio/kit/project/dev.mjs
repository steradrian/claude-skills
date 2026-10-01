// Rebuilds on every save and serves http://localhost:5173. Reload the tab to see changes.
// ?t=35 starts at 35 s; ?still&t=35 freezes one frame.
import { createServer } from 'node:http';
import { readFileSync, watch, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = dirname(fileURLToPath(import.meta.url)), PORT = Number(process.env.PORT || 5173);
const rebuild = () => { try { const r = build(); console.log(`[${new Date().toLocaleTimeString()}] rebuilt (${r.kb} KB)`); } catch (e) { console.error('Build failed:', e.message); } };
rebuild();
let timer;
for (const d of ['src', 'engine']) watch(join(root, d), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 80); });
createServer((req, res) => {
  const file = join(root, 'dist', 'film.html');
  if (!existsSync(file)) { res.writeHead(500); return res.end('Build failed, check the terminal.'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Serving http://localhost:${PORT}  (Ctrl+C to stop)`));
