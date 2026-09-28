/* receipt-thermal components: printer, feeding paper roll, receipt lines, perforation, barcode,
 * ink stamp, marker highlight. Requires core.js. Palette from AD.C.palette:
 * {paper, ink, stamp, perforation, barcode, housing}.
 *
 * The paper model is a real thermal printer standing at the BOTTOM of the frame: paper feeds UP
 * out of the slot, the first printed line (the header) leads and ends up on top, the newest line
 * is always at the slot, and the receipt reads the right way up. A roll exposes feed(L): L is the
 * length of paper out of the slot in px; a line added at paper position s (px from the leading
 * edge) appears once L > s and sits L - s px above the slot.
 */
(() => {
  const { rng, $, place, paper, mask, clamp, N } = AD;
  const P = Object.assign({ paper: '#f3efe6', ink: '#3a332c', stamp: '#c81d25', perforation: '#cfc8b8', barcode: '#17140f', housing: '#1b1613' }, AD.C.palette || {});

  $('style', '', document.head).textContent = `
.rc-roll{position:absolute;overflow:hidden;transform-origin:50% 0}
.rc-paper{position:absolute;left:0;right:0;top:0}
.rc-line{position:absolute;left:0;right:0;display:flex;align-items:baseline;gap:.4em;white-space:nowrap;font-variant-numeric:tabular-nums;color:${P.ink}}
.rc-line .l{flex:0 1 auto;overflow:hidden;text-overflow:clip}
.rc-line .d{flex:1 1 auto;border-bottom:.12em dotted currentColor;opacity:.55;transform:translateY(-.3em)}
.rc-line .v{flex:0 0 auto}
.rc-stamp{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:10px solid currentColor;border-radius:14px;line-height:1.02;transform-origin:50% 50%;mix-blend-mode:multiply}
.rc-hl{position:relative;white-space:nowrap}
.rc-hl>i{position:absolute;left:-.12em;right:-.12em;top:.12em;bottom:.02em;transform-origin:0 50%;z-index:-1;font-style:normal}`;

  /** tear edge as clip-path points: zig-zag along the top (the leading edge, torn off the last
   * receipt), straight sides and bottom */
  function serrated(w, h, tooth = 16, seed = 1) {
    const r = rng(seed), pts = [];
    for (let x = 0; x < w; x += tooth) pts.push([x, (r() * .35 + .65) * tooth * .55], [Math.min(w, x + tooth / 2), 0]);
    pts.push([w, tooth * .3], [w, h], [0, h]);
    return pts;
  }

  /** paper roll feeding UP out of a slot whose centre is (x, y). Returns
   * {el, paper, add(node, s, h), feed(L), tail(len)}. Drive el with tf for tear-offs; the
   * transform origin is the slot. opts: w, maxLen (paper length px), seed, size, font, pad */
  function roll(parent, { x, y, w = 640, maxLen = 2400, seed = 1, size = 44, font = "'JetBrains Mono',ui-monospace,monospace", pad = 44 }) {
    const el = $('div', 'rc-roll', parent); el.style.left = (x - w / 2) + 'px'; el.style.width = w + 'px'; el.style.transformOrigin = '50% 100%';
    el.style.filter = 'drop-shadow(0 26px 24px rgba(0,0,0,.5)) drop-shadow(0 3px 3px rgba(0,0,0,.35))';
    const pp = $('div', 'rc-paper', el, { height: maxLen + 'px', background: paper(P.paper, 'linear-gradient(90deg,rgba(60,40,20,.10),transparent 7%,transparent 93%,rgba(60,40,20,.12))'), fontFamily: font, fontSize: size + 'px' });
    pp.style.clipPath = `polygon(${serrated(w, maxLen, 16, seed).map(([a, b]) => a.toFixed(1) + 'px ' + b.toFixed(1) + 'px').join(',')})`;
    const o = { el, paper: pp, lines: [], w, pad, maxLen, L: 0, y };
    /** place a node at paper position s (px from the leading edge, which is the top) */
    o.add = (node, s, h, { inset = pad } = {}) => {
      Object.assign(node.style, { position: 'absolute', left: inset + 'px', right: inset + 'px', top: s + 'px', height: h + 'px' });
      pp.appendChild(node); o.lines.push({ node, s, h }); return node;
    };
    /** L px of paper are out of the slot; the leading edge sits L px above it */
    o.feed = L => { o.L = Math.max(0, L); el.style.top = (y - o.L) + 'px'; el.style.height = o.L + 'px' };
    return o;
  }

  /** feed length for a list of print times: each entry [t, L] jumps to L over `step` seconds in
   * stepper-motor ticks (24/s), so the paper moves like a printer, not like a tween */
  function feedAt(t, marks, step = .16) {
    let L = 0;
    for (const [t0, l] of marks) {
      if (t < t0) break;
      const prev = L, p = AD.clamp((AD.qn(t, 24) - t0) / step);
      L = prev + (l - prev) * p;
      if (p < 1) break;
    }
    return L;
  }

  /** a receipt line: label, dotted leader, value. value may be '' for a plain line. */
  function line({ label = '', value = '', size, weight = 400, align = 'left', color, font, spacing }) {
    const d = $('div', 'rc-line');
    if (size) d.style.fontSize = size + 'px'; if (color) d.style.color = color; if (font) d.style.fontFamily = font;
    if (spacing) d.style.letterSpacing = spacing; d.style.fontWeight = weight;
    if (align === 'center') d.style.justifyContent = 'center';
    const l = $('span', 'l', d); l.innerHTML = label;
    if (value !== '') { $('span', 'd', d); const v = $('span', 'v', d); v.innerHTML = value }
    return d;
  }

  /** dashed tear line; dash spacing scales with width so it reads as perforation, not a scan line */
  function perforation(w, color = P.ink) {
    const d = $('div', ''); const dash = Math.max(10, w / 36);
    d.style.background = `repeating-linear-gradient(90deg,${color} 0 ${dash * .55}px,transparent ${dash * .55}px ${dash}px)`;
    d.style.opacity = '.55'; d.style.top = '50%'; return d;
  }

  /** barcode of deterministic bar widths */
  function barcode(w, h, seed = 3, color = P.barcode) {
    const r = rng(seed); let x = 0; const bars = [];
    while (x < w) { const bw = 2 + Math.floor(r() * 4) * 2; if (r() > .42) bars.push(`<rect x="${x}" y="0" width="${bw}" height="${h}"/>`); x += bw + 2 }
    const d = $('div', ''); d.innerHTML = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" fill="${color}">${bars.join('')}</svg>`; return d;
  }

  /** rubber ink stamp: bordered, distressed, multiplied. Slam it with tf scale 2.4 -> 1, 'in3', ~.12s + kick.
   * Outline stamps disappear over printed text; pass solid: true (ink block, paper-coloured
   * knock-out letters) whenever the stamp lands on lines, so it stays legible at phone size. */
  function inkStamp(parent, html, { x, y, w, h, color = P.stamp, size = 64, font = "'JetBrains Mono',monospace", weight = 800, solid = false }) {
    const s = $('div', 'rc-stamp', parent, { color, fontSize: size + 'px', fontFamily: font, fontWeight: weight, letterSpacing: '.02em', padding: '10px 18px' });
    if (solid) Object.assign(s.style, { background: color, color: P.paper, borderColor: color, mixBlendMode: 'normal', boxShadow: '0 0 0 6px ' + P.paper + ', 0 0 0 16px ' + color });
    // solid blocks show every hole of the distress mask, so they get it at a coarser scale
    s.innerHTML = html; mask(s, AD.DISTRESS, solid ? '1800px' : '900px'); place(s, x, y, w, h); return s;
  }

  /** camera that keeps a paper point framed: maps stage point (fx, fy) to screen (px, py) at scale k.
   * Returns the tf args [x, y] for a .cam whose transform origin is the stage centre. */
  const frameOn = (fx, fy, px, py, k) => [px - AD.W / 2 - (fx - AD.W / 2) * k, py - AD.H / 2 - (fy - AD.H / 2) * k];

  /** marker highlight behind a word; wrap the word with hl('ragù', color) inside a line's html,
   * then drive highlight(el, p) to wipe it in left to right */
  const hl = (word, color = P.stamp) => `<span class="rc-hl"><i style="background:${color};opacity:.9"></i>${word}</span>`;
  const highlight = (el, p) => el.querySelectorAll('.rc-hl>i').forEach(i => { i.style.transform = `scaleX(${clamp(p).toFixed(3)})` });

  /** printer housing below the paper: its top face carries the slot at (x, slotY). Add it AFTER
   * the roll so the paper disappears into the slot. Returns {g, body, slot, led} */
  function printer(parent, { x, slotY, w = 800, h = 330, color = P.housing }) {
    const g = $('div', 'abs', parent); place(g, x, slotY - 22 + h / 2, w, h);
    const body = $('div', 'abs', g, { inset: 0, borderRadius: '38px 38px 26px 26px', background: `${N},linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02) 14%,rgba(0,0,0,.28)),${color}`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.12),0 40px 60px rgba(0,0,0,.6)' });
    const slot = $('div', 'abs', g, { left: '50px', right: '50px', top: '14px', height: '16px', borderRadius: '8px', background: '#050302', boxShadow: 'inset 0 4px 7px rgba(0,0,0,.95),0 1px 0 rgba(255,255,255,.08)' });
    const led = $('div', 'abs', g, { right: '74px', top: '74px', width: '16px', height: '16px', borderRadius: '50%', background: '#6fe08a', boxShadow: '0 0 14px #6fe08a' });
    return { g, body, slot, led };
  }

  Object.assign(AD, { RP: P, roll, feedAt, line, perforation, barcode, inkStamp, hl, highlight, printer, serrated, frameOn });
})();
