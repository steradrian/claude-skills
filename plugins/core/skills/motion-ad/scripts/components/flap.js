/* flap: real split-flap display (Solari board) mechanics. Requires engine.
 * AD.flapTile(parent, {x, y, w, h, size, font, color, r}) → tile; tile.set(prev, next, p, color)
 *   Two static halves + two moving flaps: the old top half falls forward around the hinge (p 0→.5), the new bottom
 *   half drops down onto the old one (p .5→1). Shading darkens the falling flap. p ≤ 0 or ≥ 1 → static.
 * AD.flapRow(tiles, hist, t, {seed, start, dur, stagger, cycle}) drives a row of tiles from a history
 *   [[t0, 'TEXT', colour], ...]; every changed character cycles through a few random flips before settling.
 */
(() => {
  const { $, hash, clamp } = AD;
  const CHARS = 'ABCDEFGHIJKLMNOPRSTUVZ0123456789';
  function flapTile(parent, { x = 0, y = 0, w = 32, h = 54, size, font = "'JB',ui-monospace,monospace", color = '#f4efe6', r = 5, weight = 750 } = {}) {
    size = size || Math.round(h * .7);
    const T = $('div', 'abs', parent, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', perspective: (h * 5) + 'px' });
    const face = (top, z) => {
      const d = $('div', 'abs', T, { left: 0, right: 0, [top ? 'top' : 'bottom']: 0, height: (h / 2) + 'px', overflow: 'hidden', zIndex: z,
        background: top ? 'linear-gradient(180deg,#2c2c31 0%,#222226 100%)' : 'linear-gradient(180deg,#1a1a1d 0%,#141417 100%)',
        borderRadius: top ? `${r}px ${r}px 0 0` : `0 0 ${r}px ${r}px`, transformOrigin: top ? '50% 100%' : '50% 0', backfaceVisibility: 'hidden' });
      const c = $('div', 'abs', d, { left: 0, right: 0, height: h + 'px', [top ? 'top' : 'bottom']: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `${weight} ${size}px ${font}`, color, lineHeight: 1 });
      const sh = $('div', 'abs', d, { inset: 0, background: top ? 'linear-gradient(180deg,transparent,rgba(0,0,0,.9))' : 'linear-gradient(0deg,transparent,rgba(0,0,0,.9))', opacity: 0 });
      d.c = c; d.sh = sh; d._t = null; d._col = null; return d;
    };
    const top = face(true, 1), bot = face(false, 1), fa = face(true, 3), fb = face(false, 3);
    $('div', 'abs', T, { left: 0, right: 0, top: (h / 2 - 1) + 'px', height: '2px', background: '#040405', zIndex: 5 });
    $('div', 'abs', T, { left: '-1px', top: (h / 2 - 3) + 'px', width: '3px', height: '6px', borderRadius: '1px', background: '#3a3a40', zIndex: 6 });
    $('div', 'abs', T, { right: '-1px', top: (h / 2 - 3) + 'px', width: '3px', height: '6px', borderRadius: '1px', background: '#3a3a40', zIndex: 6 });
    $('div', 'abs', T, { inset: 0, borderRadius: r + 'px', pointerEvents: 'none', zIndex: 7, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.09),inset 0 -1px 0 rgba(0,0,0,.6),0 3px 6px rgba(0,0,0,.55)' });
    const put = (d, ch, col) => { if (d._t !== ch) { d._t = ch; d.c.textContent = ch } if (d._col !== col) { d._col = col; d.c.style.color = col } };
    T.set = (prev, next, p, col = color) => {
      if (p <= 0 || p >= 1 || prev === next) { const ch = p <= 0 ? prev : next; put(top, ch, col); put(bot, ch, col); fa.style.display = fb.style.display = 'none'; return }
      put(top, next, col); put(bot, prev, col);
      if (p < .5) { const q = p / .5; fa.style.display = 'block'; fb.style.display = 'none'; put(fa, prev, col); fa.style.transform = `rotateX(${(-90 * q).toFixed(1)}deg)`; fa.sh.style.opacity = q * .85 }
      else { const q = (p - .5) / .5; fb.style.display = 'block'; fa.style.display = 'none'; put(fb, next, col); fb.style.transform = `rotateX(${(90 * (1 - q)).toFixed(1)}deg)`; fb.sh.style.opacity = (1 - q) * .7 }
    };
    T.set(' ', ' ', 1);
    return T;
  }
  function flapRow(tiles, hist, t, { seed = 1, start = 0, dur = .055, stagger = .028, cycle = [3, 7] } = {}) {
    let k = -1; for (let i = 0; i < hist.length; i++) if (t >= hist[i][0] + (i === 0 ? start : 0)) k = i;
    const n = tiles.length;
    if (k < 0) { tiles.forEach(tl => tl.set(' ', ' ', 1)); return null }
    const cur = hist[k], t0 = cur[0] + (k === 0 ? start : 0), next = cur[1].padEnd(n, ' '), prev = (k ? hist[k - 1][1] : '').padEnd(n, ' ');
    tiles.forEach((tl, j) => {
      const a = prev[j], b = next[j];
      if (a === b) { tl.set(b, b, 1, cur[2]); return }
      const K = cycle[0] + Math.floor(hash(seed * 7 + k, j) * (cycle[1] - cycle[0] + 1));
      const st = t0 + stagger * j + hash(seed, j * 3 + k) * .05, s = (t - st) / dur;
      if (s < 0) { tl.set(a, a, 1, k ? hist[k - 1][2] : cur[2]); return }
      if (s >= K + 1) { tl.set(b, b, 1, cur[2]); return }
      const i = Math.floor(s), seq = x => x === 0 ? a : x >= K + 1 ? b : CHARS[Math.floor(hash(seed * 13 + j, x + k * 17) * CHARS.length)];
      tl.set(seq(i), seq(i + 1), s - i, cur[2]);
    });
    return cur;
  }
  Object.assign(AD, { flapTile, flapRow });
})();
