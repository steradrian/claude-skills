/* BearMenu · SCRAPBOOK template (collage + real photos)
 * The reel is data: ad.config.json → "reel": { "beats": [ {type, dur, bg, ...}, ... ] }.
 * Beat types: hook · ranked · tickets · note · polaroids · map · receipt · versus · chat · phone · end  (see README).
 * Photos: "images": {"photo01": "assets/photo01.jpg", ...}; empty slots show a marked placeholder.
 * Motion grammar: pieces land on twos (stop-motion), settle with a subtle boil; camera drifts and punches in.
 * No camera shake. Text auto-fits its space.
 */
const { W, H, E, kf, prog, q12, boil, tf, $, place, grp, clamp, lerp, rng, N, MOTTLE, card, tape, paper } = AD;
const P = Object.assign({ ink: '#17130f', paper: '#efe6d6', accent: '#e4472b', amber: '#ffb21e', kraft: '#c19a66', cream: '#f8f2e7', note: '#ffe07a', sage: '#a9bd95' }, AD.C.theme || {});
const IMG = AD.C.images || {};
const REEL = AD.C.reel || { beats: [] };
const FT = { anton: "'Anton',Impact,sans-serif", arch: "'ArchivoBlack',sans-serif", pf: "'PF',Georgia,serif", hand: "'Caveat',cursive", type: "'CourierP',monospace", sans: "'SG',system-ui,sans-serif" };
const BG = {
  paper: paper(P.paper), cream: paper(P.cream), ink: paper(P.ink), accent: paper(P.accent), amber: paper(P.amber), sage: paper(P.sage),
  kraft: `${N},url(${MOTTLE}),${P.kraft}`, news: paper('#e4dbc8', 'repeating-linear-gradient(0deg,rgba(23,19,15,.06) 0 3px,transparent 3px 9px)')
};
const BGCOL = { paper: P.paper, cream: P.cream, ink: P.ink, accent: P.accent, amber: P.amber, sage: P.sage, kraft: P.kraft, news: '#e4dbc8' };
const onDark = bg => bg === 'ink';
const RS = [
  { bg: BG.paper, c: P.ink, f: FT.anton, wf: .5, fs: 1 }, { bg: BG.ink, c: P.cream, f: FT.pf, it: 1, wf: .74, fs: .9 },
  { bg: BG.accent, c: P.ink, f: FT.arch, wf: .8, fs: .78 }, { bg: BG.news, c: P.ink, f: FT.type, wf: .64, fs: .95 },
  { bg: BG.kraft, c: P.ink, f: FT.anton, wf: .5, fs: 1.05 }, { bg: BG.cream, c: P.accent, f: FT.pf, it: 1, wf: .74, fs: .92 },
  { bg: BG.amber, c: P.ink, f: FT.arch, wf: .8, fs: .76 }, { bg: BG.ink, c: P.amber, f: FT.anton, wf: .5, fs: 1 },
];

/* ---------------- building blocks ---------------- */
const WARM = ['#b8743a', '#8f4a2e', '#c99a4a', '#6f7f45', '#a3523a', '#7a5a3a', '#c07a52', '#5f6b4a'];
function photo(parent, key, { w, h, radius = 0, label = true }) {
  const el = $('div', 'abs', parent, { left: 0, top: 0, width: w + 'px', height: h + 'px', overflow: 'hidden', borderRadius: radius + 'px' });
  const inner = $('div', 'abs', el, { inset: 0 });
  if (IMG[key]) inner.style.background = `url(${IMG[key]}) center/cover no-repeat`;
  else {
    const c = WARM[(parseInt((key || '0').replace(/\D/g, '')) || 0) % WARM.length];
    inner.style.background = `radial-gradient(ellipse 70% 55% at 30% 25%,rgba(255,235,205,.55),transparent 70%),radial-gradient(ellipse 60% 50% at 80% 90%,rgba(0,0,0,.35),transparent 70%),linear-gradient(160deg,${c},#3a2518)`;
    if (label) { const s = Math.max(14, Math.min(26, w / 22)); const l = $('div', 'abs', inner, { left: s + 'px', top: s * .8 + 'px', font: `500 ${s}px ${FT.sans}`, color: 'rgba(255,255,255,.65)', letterSpacing: '.14em' }); l.textContent = `FOTO · ${(key || '').toUpperCase()}` }
  }
  $('div', 'abs', el, { inset: 0, backgroundImage: `url(${N})`, opacity: .35, mixBlendMode: 'overlay' });
  el.inner = inner; return el;
}
/** polaroid: cream frame, photo, caption area (returns group; g.cap = caption element) */
function polaroid(parent, key, { x, y, w = 560, h = 660, caption = '', seed = 1, capSize }) {
  const g = grp(parent, x, y, w, h);
  const c = card(g, { x: w / 2, y: h / 2, w, h, bg: BG.cream, seed, jit: .4, step: 8, edges: 'cccc', rim: null });
  c.face.style.display = 'block';
  const pad = w * .045, ph = h - pad - w * .2;
  const pw = $('div', 'abs', c.face, { left: pad + 'px', top: pad + 'px', width: (w - 2 * pad) + 'px', height: ph + 'px', overflow: 'hidden' });
  photo(pw, key, { w: w - 2 * pad, h: ph });
  $('div', 'abs', pw, { inset: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' });
  const cap = $('div', 'abs', c.face, { left: pad + 'px', right: pad + 'px', top: (pad + ph + w * .02) + 'px', height: (w * .16) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 ${capSize || w * .105}px ${FT.hand}`, color: P.ink, whiteSpace: 'nowrap' });
  cap.textContent = caption; fitText(cap, w - 2 * pad);
  g.cap = cap; return g;
}
const fitText = AD.fitText;   // core.js: measures true text width after fonts load
/** sticky note with tape and handwriting */
function sticky(parent, html, { x, y, w = 340, color = P.note, size = 52, seed = 3 }) {
  const g = grp(parent, x, y, w, w);
  const n = $('div', 'abs', g, { inset: 0, background: `linear-gradient(170deg,${color} 0%,${color} 80%,rgba(0,0,0,.08) 100%)`, boxShadow: '0 18px 24px -10px rgba(0,0,0,.4),0 3px 5px rgba(0,0,0,.18)', clipPath: 'polygon(0 0,100% 0,100% 92%,93% 100%,0 100%)' });
  $('div', 'abs', n, { inset: 0, backgroundImage: `url(${N})`, opacity: .5 });
  const t = $('div', 'abs', g, { left: w * .1 + 'px', right: w * .1 + 'px', top: w * .16 + 'px', bottom: w * .1 + 'px', font: `700 ${size}px ${FT.hand}`, color: P.ink, lineHeight: 1.02 }); t.innerHTML = html;
  tape(g, w / 2, 2, w * .5, 48, seed);
  g.text = t; return g;
}
const hand = (parent, str, { x, y, w = 800, h = 120, size = 84, color = P.accent, align = 'center' }) => { const d = $('div', 'abs', parent, { font: `700 ${size}px ${FT.hand}`, color, whiteSpace: 'nowrap', textAlign: align, lineHeight: h + 'px' }); d.textContent = str; place(d, x, y, w, h); AD.fitText(d, w); return d };
const typed = (parent, str, { x, y, w = 960, size = 60, color = P.ink, align = 'center' }) => { const d = AD.typer($('div', 'abs', parent, { font: `${size}px ${FT.type}`, color, whiteSpace: 'nowrap', textAlign: align, lineHeight: 1.1 }), str); place(d, x, y, w, size * 1.3); return d };
function fitRansom(word, maxW, maxSize, seed, order) { const n = [...word].length, g = 8 * (n - 1); const w100 = AD.ransomWidth(word, 100, seed, order, RS); return Math.min(maxSize, 100 * (maxW - g) / (w100 - g)) }
function roundSticker(parent, html, { x, y, r = 130, color = P.accent, text = P.ink, size = 58 }) {
  const g = grp(parent, x, y, r * 2, r * 2);
  $('div', 'abs', g, { inset: 0, borderRadius: '50%', background: paper(color), boxShadow: '0 12px 20px -6px rgba(0,0,0,.4),inset 0 0 0 6px rgba(255,255,255,.18)' });
  const t = $('div', 'abs', g, { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', font: `${size}px ${FT.anton}`, color: text, lineHeight: .95 }); t.innerHTML = html;
  return g;
}
/** event ticket stub */
function ticket(parent, it, { x, y, w = 800, h = 290, seed = 1 }) {
  const g = grp(parent, x, y, w, h), stub = w * .27, col = it.color || P.accent;
  const m = `radial-gradient(circle 20px at ${stub}px 0,transparent 19px,#000 20px) top/100% 51% no-repeat,radial-gradient(circle 20px at ${stub}px 100%,transparent 19px,#000 20px) bottom/100% 51% no-repeat`;
  const body = $('div', 'abs', g, { inset: 0, background: paper(P.cream), borderRadius: '14px', WebkitMask: m, mask: m, filter: 'drop-shadow(0 14px 16px rgba(0,0,0,.35))' });
  const s = $('div', 'abs', body, { left: 0, top: 0, width: stub + 'px', bottom: 0, background: paper(col) });
  const dd = $('div', 'abs', s, { left: 0, right: 0, top: h * .18 + 'px', textAlign: 'center', font: `600 ${h * .1}px ${FT.type}`, color: P.ink, letterSpacing: '.12em' }); dd.textContent = it.day;
  const dn = $('div', 'abs', s, { left: 0, right: 0, top: h * .3 + 'px', textAlign: 'center', font: `${h * .42}px ${FT.anton}`, color: P.ink, lineHeight: 1 }); dn.textContent = it.date;
  $('div', 'abs', body, { left: stub + 'px', top: '24px', bottom: '24px', borderLeft: `4px dashed rgba(23,19,15,.25)` });
  const tt = $('div', 'abs', body, { left: stub + 36 + 'px', top: h * .16 + 'px', font: `${h * .27}px ${FT.anton}`, color: P.ink, whiteSpace: 'nowrap', lineHeight: 1 }); tt.textContent = it.title; fitText(tt, w - stub - 36 - (it.photo ? 190 : 36));  // right corner reserved for the taped thumbnail
  const mt = $('div', 'abs', body, { left: stub + 38 + 'px', right: '36px', top: h * .53 + 'px', font: `${h * .095}px ${FT.type}`, color: P.ink, whiteSpace: 'nowrap' }); mt.textContent = it.meta;
  $('div', 'abs', body, { left: stub + 38 + 'px', width: w * .42 + 'px', bottom: h * .12 + 'px', height: h * .14 + 'px', background: `repeating-linear-gradient(90deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 10px,transparent 10px 12px,${P.ink} 12px 13px,transparent 13px 17px)`, opacity: .75 });
  $('div', 'abs', body, { inset: 0, backgroundImage: `url(${N})`, opacity: .4, pointerEvents: 'none' });
  return g;
}
function marker(parent, d, width = 22, color = P.accent) { return AD.markerPath(parent, d, { color, width }) }

/* torn-paper wipe into the next beat's colour (last `dur` seconds of a beat) */
function tornWipe(s, nextBg, a, d, dur = .32) {
  const wp = $('div', 'abs', s.el, { left: '-170px', top: 0, width: '1420px', height: '2700px', zIndex: 5, display: 'none' });
  const c = card(wp, { x: 710, y: 1350, w: 1420, h: 2700, bg: BG[nextBg] || BG.paper, seed: 808, jit: 1.2, step: 1.4, edges: 'tccc' }); c.style.left = '0'; c.style.top = '0';
  return lt => { const on = lt > d - dur; wp.style.display = on ? 'block' : 'none'; if (on) wp.style.transform = `translateY(${kf(lt, [[d - dur, 2000], [d, -170, 'io']])}px) rotate(-4deg)` };
}
/* shared camera: slow drift + punch-in at beat start */
const camera = (s, lt, d, seed, punch = .05) => tf(s.cam, Math.sin(lt * .8 + seed) * 10, kf(lt, [[0, 14], [d, -14]], 'lin'), kf(lt, [[0, (seed % 2 ? .8 : -.8)], [d, (seed % 2 ? -.6 : .6)]]), 1 + punch * Math.exp(-lt * 9) + lt * .02);
const slap = (tq, st, dur = .14) => clamp((tq - st) / dur);

/* ---------------- beats ---------------- */
const BEATS = {
  hook(s, b, d, ctx) {
    const dark = onDark(b.bg);
    (b.decor || []).slice(0, 2).forEach((k, i) => { const pg = polaroid(s.cam, k, { x: i ? 120 : 960, y: i ? 1700 : 250, w: 420, h: 500, seed: 40 + i, caption: '' }); pg.dataset.bleed = 1; pg.style.transform = `rotate(${i ? 11 : -9}deg)`; ctx.statics.push([pg, i ? 11 : -9, 60 + i]) });
    const ln = typed(s.cam, b.line || '', { x: W / 2, y: 640, size: 62, color: dark ? P.cream : P.ink });
    const size = fitRansom(b.word, 900, 230, b.seed || 11, b.order), L = AD.ransom(s.cam, b.word, { cx: W / 2, cy: 880, size, seed: b.seed || 11, order: b.order, styles: RS });
    const rw = L.reduce((m, l) => Math.max(m, l.X + l.w / 2), 0) - L.reduce((m, l) => Math.min(m, l.X - l.w / 2), W), x0 = W / 2 - rw / 2, x1 = W / 2 + rw / 2;
    let mk = null, wr = null;
    if (b.mark === 'strike') mk = marker(s.cam, `M${x0 - 20} 900 C${x0 + rw * .3} 860 ${x0 + rw * .7} 930 ${x1 + 20} 870`, 28);
    if (b.mark === 'underline') mk = marker(s.cam, `M${x0} 1030 C${x0 + rw * .35} 1010 ${x0 + rw * .7} 1045 ${x1} 1015`, 20);
    if (b.mark === 'circle') mk = marker(s.cam, `M${W / 2 + 40} ${880 - size * .95} C${x0 - 120} ${880 - size} ${x0 - 110} ${880 + size * .9} ${W / 2} ${880 + size * .85} C${x1 + 130} ${880 + size * .8} ${x1 + 110} ${880 - size} ${W / 2 - 60} ${880 - size * .8}`, 16);
    if (b.write) wr = hand(s.cam, b.write, { x: W / 2 + 60, y: 1100, size: 110, color: P.accent });
    const st = b.sticker ? roundSticker(s.cam, b.sticker, { x: 820, y: 1260, r: 130, color: dark ? P.amber : P.accent, size: 64 }) : null;
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      AD.typeTo(ln, (lt - .12) / .038);
      L.forEach(l => { const p = slap(tq, .72 + l.i * .07, .16), e = E.out3(p); tf(l.g, 0, (1 - e) * -30, l.rot + (1 - p) * (l.i % 2 ? -18 : 16) + boil(l.seed, lt, .7), lerp(2.2, 1, e), p > 0 ? 1 : 0) });
      if (mk) AD.strokeReveal(mk, prog(lt, 1.35, .28, 'out3'));
      if (wr) AD.clipReveal(wr, prog(lt, 1.6, .35));
      if (st) { const p = slap(tq, 1.75, .12); tf(st, 0, 0, 12 + lt * 8, lerp(1.8, 1, E.out3(p)), p > 0 ? 1 : 0) }
      ctx.statics.forEach(([el, r, sd]) => tf(el, 0, 0, r + boil(sd, lt, .3)));
      if (wipe) wipe(lt);
      camera(s, lt, d, 3, 0);
    };
  },
  ranked(s, b, d, ctx) {
    const dark = onDark(b.bg), ink = dark ? P.cream : P.ink;
    const num = $('div', 'abs', s.cam, { font: `980px ${FT.anton}`, color: 'transparent', WebkitTextStroke: `7px ${dark ? 'rgba(248,242,231,.22)' : 'rgba(23,19,15,.2)'}`, lineHeight: 1, whiteSpace: 'nowrap' }); num.textContent = b.n; place(num, 250, 1150, 800, 1000); num.dataset.bleed = 1;
    const meta = tape(s.cam, 540, 330, 620, 78, 70 + b.n, 'rgba(236,226,190,.95)');
    const mt = AD.typer($('div', 'abs', meta, { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `40px ${FT.type}`, color: P.ink, whiteSpace: 'nowrap' }), b.meta || '');
    const pol = polaroid(s.cam, b.photo, { x: 560, y: 890, w: 640, h: 760, caption: b.name, seed: 90 + b.n });
    const rot = b.n % 2 ? -4 : 4;
    const note = b.tip ? sticky(s.cam, b.tip, { x: b.n % 2 ? 810 : 270, y: 1460, w: 330, size: 50, color: b.n % 2 ? P.note : '#ffc4a8', seed: 30 + b.n }) : null;
    const badge = roundSticker(s.cam, `#${b.n}`, { x: b.n % 2 ? 250 : 830, y: 560, r: 92, color: b.n === 1 ? P.accent : P.ink, text: b.n === 1 ? P.ink : P.cream, size: 84 });
    const winner = b.n === 1 ? AD.stamp(s.cam, 'NR. 1', { x: 740, y: 700, w: 380, h: 150, color: P.accent, size: 104 }) : null;
    return lt => {
      const tq = q12(lt);
      tf(num, kf(lt, [[0, -40], [d, 20]], 'lin'), 0, 0, 1);
      const pm = slap(tq, .04, .14); tf(meta, 0, 0, -2, lerp(1.5, 1, pm), pm > 0 ? 1 : 0); AD.typeTo(mt, (lt - .12) / .025);
      const pp = slap(tq, 0, .16); tf(pol, (1 - E.out3(pp)) * (b.n % 2 ? 60 : -60), (1 - E.out3(pp)) * -40, rot + (1 - pp) * rot * 3 + (pp >= 1 ? boil(b.n, lt, .35) : 0), lerp(1.3, 1, E.out3(pp)));
      AD.clipReveal(pol.cap, prog(lt, .28, .4));
      const bp = slap(tq, .18, .12); tf(badge, 0, 0, -8 + lt * 6, lerp(1.7, 1, E.out3(bp)), bp > 0 ? 1 : 0);
      if (note) { const np = slap(tq, .5, .14); tf(note, 0, 0, (b.n % 2 ? 6 : -6) + (1 - np) * 10 + (np >= 1 ? boil(b.n + 7, lt, .4) : 0), lerp(1.4, 1, E.out3(np)), np > 0 ? 1 : 0) }
      if (winner) { const wp = prog(lt, .8, .12, 'in3'); tf(winner, 0, 0, -9, lerp(2.4, 1, wp), wp > 0 ? .92 : 0) }
      tf(s.cam, 0, 0, 0, 1 + .07 * Math.exp(-lt * 8) + lt * .015);
    };
  },
  tickets(s, b, d, ctx) {
    const items = b.items || [];
    const title = b.title ? typed(s.cam, b.title, { x: W / 2, y: 300, size: 54, color: P.ink }) : null;
    const T = items.map((it, i) => { const t = ticket(s.cam, it, { x: 540 + (i % 2 ? 40 : -40), y: 560 + i * 390, w: 800, h: 290, seed: i }); const ph = it.photo ? polaroid(s.cam, it.photo, { x: 905 + (i % 2 ? 40 : -40), y: 420 + i * 390, w: 230, h: 275, caption: '', seed: 50 + i }) : null; return { t, ph, i, r: i % 2 ? 3 : -3 } });
    const note = b.note ? hand(s.cam, b.note, { x: 560, y: 520 + items.length * 390 - 40, size: 96 }) : null;
    const circ = items.length ? marker(s.cam, `M${120 + 190} ${480 + (items.length - 1) * 390} C120 ${450 + (items.length - 1) * 390} 110 ${680 + (items.length - 1) * 390} 290 ${690 + (items.length - 1) * 390} C420 ${690 + (items.length - 1) * 390} 400 ${470 + (items.length - 1) * 390} 250 ${470 + (items.length - 1) * 390}`, 14) : null;
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      if (title) AD.typeTo(title, (lt - .05) / .03);
      T.forEach(o => {
        const st = .15 + o.i * .6, p = slap(tq, st, .16); tf(o.t, (1 - E.out3(p)) * (o.i % 2 ? 900 : -900), 0, o.r + (1 - p) * o.r * 5 + (p >= 1 ? boil(o.i + 3, lt, .3) : 0), 1, p > 0 ? 1 : 0);
        if (o.ph) { const q = slap(tq, st + .22, .12); tf(o.ph, 0, 0, (o.i % 2 ? -8 : 8) + (q >= 1 ? boil(o.i + 9, lt, .4) : 0), lerp(1.5, 1, E.out3(q)), q > 0 ? 1 : 0) }
      });
      if (circ) AD.strokeReveal(circ, prog(lt, .25 + items.length * .6, .3, 'out3'));
      if (note) AD.clipReveal(note, prog(lt, .45 + items.length * .6, .4));
      if (wipe) wipe(lt);
      tf(s.cam, 0, kf(lt, [[0, 60], [d, -90]], 'io2'), -.5, 1 + lt * .01);
    };
  },
  note(s, b, d, ctx) {
    const big = polaroid(s.cam, b.photo, { x: 520, y: 880, w: 860, h: 1000, caption: b.caption || '', seed: 21 });
    const n = sticky(s.cam, `<span style="font-size:.62em;opacity:.7">${b.from || 'o prietenă'}:</span><br>${b.text}`, { x: 815, y: 1560, w: 420, size: 56, seed: 22 });
    const arrow = marker(s.cam, 'M640 1500 C560 1460 500 1380 470 1250 M470 1250 L440 1320 M470 1250 L525 1305', 14);
    const lab = b.line ? typed(s.cam, b.line, { x: W / 2, y: 290, size: 50, color: P.ink }) : null;
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      if (lab) AD.typeTo(lab, (lt - .05) / .03);
      const bp = slap(tq, .05, .16); tf(big, 0, (1 - E.out3(bp)) * 80, -3 + (1 - bp) * -8 + (bp >= 1 ? boil(2, lt, .3) : 0), lerp(1.2, 1, E.out3(bp)), bp > 0 ? 1 : 0);
      if (big.cap) AD.clipReveal(big.cap, prog(lt, .3, .4));
      const np = slap(tq, .55, .14); tf(n, 0, 0, 5 + (1 - np) * 12 + (np >= 1 ? boil(5, lt, .4) : 0), lerp(1.5, 1, E.out3(np)), np > 0 ? 1 : 0);
      n.text.style.clipPath = `inset(-10% ${(100 - prog(lt, .75, .8) * 100).toFixed(1)}% -10% -10%)`;
      AD.strokeReveal(arrow, prog(lt, 1.6, .3, 'out3'));
      if (wipe) wipe(lt);
      camera(s, lt, d, 5, .04);
    };
  },
  polaroids(s, b, d, ctx) {
    const pos = [[300, 700, -7], [790, 960, 6], [380, 1330, 4], [800, 1480, -5]];
    const items = (b.items || []).slice(0, 4);
    const lab = b.line ? typed(s.cam, b.line, { x: W / 2, y: 300, size: 54, color: onDark(b.bg) ? P.cream : P.ink }) : null;
    const G = items.map((it, i) => { const [x, y, r] = pos[i]; const g = polaroid(s.cam, it.photo, { x, y, w: 470, h: 560, caption: it.caption, seed: 60 + i }); const tp = tape(g, 235, 6, 160, 50, 80 + i); return { g, r, i } });
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      if (lab) AD.typeTo(lab, (lt - .05) / .03);
      G.forEach(o => { const st = .1 + o.i * .32, p = slap(tq, st, .18), e = E.out3(p); tf(o.g, (1 - e) * (o.i % 2 ? 700 : -700), (1 - e) * 200, o.r + (1 - p) * o.r * 6 + (p >= 1 ? boil(o.i + 20, lt, .35) : 0), lerp(1.25, 1, e), p > 0 ? 1 : 0); AD.clipReveal(o.g.cap, prog(lt, st + .3, .4)) });
      if (wipe) wipe(lt);
      tf(s.cam, kf(lt, [[0, 30], [d, -30]], 'lin'), kf(lt, [[0, 40], [d, -60]], 'io2'), kf(lt, [[0, .6], [d, -.6]]), 1.02 + lt * .015);
    };
  },
  phone(s, b, d, ctx) {
    const ph = grp(s.cam, 560, 1030, 480, 980);
    $('div', 'abs', ph, { inset: 0, borderRadius: '78px', background: '#0e0d0f', boxShadow: '0 40px 60px -20px rgba(0,0,0,.55),inset 0 0 0 3px #38363c' });
    const sc = $('div', 'abs', ph, { left: '14px', top: '14px', right: '14px', bottom: '14px', borderRadius: '64px', overflow: 'hidden', background: '#fbf7f2' });
    $('div', 'abs', sc, { left: '50%', top: '16px', width: '130px', height: '36px', marginLeft: '-65px', borderRadius: '18px', background: '#0e0d0f' });
    const hd = $('div', 'abs', sc, { left: '32px', top: '78px', font: `italic 900 48px ${FT.pf}`, color: P.ink }); hd.textContent = b.title || 'Seara ta';
    const sub = $('div', 'abs', sc, { left: '34px', top: '140px', font: `18px ${FT.type}`, color: 'rgba(23,19,15,.55)', letterSpacing: '.1em' }); sub.textContent = b.subtitle || `${(b.items || []).length} LOCURI SALVATE`;
    const rows = (b.items || []).slice(0, 5).map((it, i) => {
      const r = $('div', 'abs', sc, { left: '22px', right: '22px', top: (190 + i * 142) + 'px', height: '126px', borderRadius: '24px', background: '#fff', boxShadow: '0 4px 12px rgba(23,19,15,.07)' });
      const th = $('div', 'abs', r, { left: '12px', top: '12px', width: '102px', height: '102px', borderRadius: '18px', overflow: 'hidden' }); photo(th, it.photo, { w: 102, h: 102, label: false });
      const n = $('div', 'abs', r, { left: '130px', top: '26px', right: '60px', font: `700 28px ${FT.sans}`, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden' }); n.textContent = it.name;
      const m = $('div', 'abs', r, { left: '130px', top: '66px', font: `18px ${FT.type}`, color: 'rgba(23,19,15,.55)', whiteSpace: 'nowrap' }); m.textContent = it.meta || '';
      const bm = $('div', 'abs', r, { right: '18px', top: '38px' }); bm.innerHTML = `<svg width="30" height="36" viewBox="0 0 24 28"><path d="M5 3h14v22l-7-5-7 5z" fill="${P.accent}"/></svg>`;
      return r;
    });
    [[330, 560, 190, -30], [790, 1500, 190, 25]].forEach(([x, y, w, r], i) => { const t = tape(s.cam, x, y, w, 60, 90 + i); t.style.transform = `rotate(${r}deg)`; ctx.statics.push([t, r, 95 + i]) });
    const stk = roundSticker(s.cam, b.sticker || 'SALVAT!', { x: 860, y: 640, r: 118, color: P.accent, size: 56 });
    const mk = b.marker ? hand(s.cam, b.marker, { x: 360, y: 1620, w: 640, size: 84, color: P.accent }) : null;
    const arrow = marker(s.cam, 'M420 1560 C470 1500 480 1450 470 1400 M470 1400 L430 1455 M470 1400 L515 1450', 12);
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      const pp = slap(tq, .05, .2); tf(ph, 0, lerp(1400, 0, E.out3(pp)), -4 + (1 - pp) * 12 + (pp >= 1 ? boil(1, lt, .3) : 0), 1);
      rows.forEach((r, i) => { const q = prog(lt, .3 + i * .08, .3, 'out5'); r.style.opacity = q; r.style.transform = `translateY(${(1 - q) * 30}px)` });
      ctx.statics.forEach(([el, r, sd]) => tf(el, 0, 0, r + boil(sd, lt, .3), 1, prog(lt, .25, .05)));
      const sp = slap(tq, .9, .12); tf(stk, 0, 0, -10 + lt * 10, lerp(1.8, 1, E.out3(sp)), sp > 0 ? 1 : 0);
      if (mk) AD.clipReveal(mk, prog(lt, 1.15, .4)); AD.strokeReveal(arrow, prog(lt, 1.5, .25, 'out3'));
      if (wipe) wipe(lt);
      camera(s, lt, d, 7, .03);
    };
  },
  /* hand-drawn city map with photo pins and a marker route. items: [{photo, label, x, y}] in sheet coords (980×1320) */
  map(s, b, d, ctx) {
    const SX = 50, SY = 360, sheet = card(s.cam, { x: 540, y: SY + 660, w: 980, h: 1320, bg: BG.cream, seed: 201, jit: 1.3, step: 1.8 }); sheet.face.style.display = 'block';
    const m = $('div', 'abs', sheet.face, { inset: 0 });
    m.innerHTML = `<svg width="980" height="1320" style="position:absolute;inset:0">
      <g fill="${P.sage}" opacity=".55"><path d="M600 120 C700 90 820 130 830 220 C840 300 740 330 660 300 C590 280 560 170 600 120 Z"/><path d="M90 900 C180 860 290 900 280 980 C270 1060 150 1080 100 1030 C60 990 50 930 90 900 Z"/></g>
      <path filter="url(#rough)" d="M-40 560 C160 520 300 640 480 600 S760 480 1020 540" fill="none" stroke="#8fb3c2" stroke-width="54" stroke-linecap="round" opacity=".75"/>
      <g stroke="rgba(23,19,15,.2)" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M60 300 L940 260"/><path d="M40 780 L960 820"/><path d="M80 1120 L920 1080"/><path d="M300 60 L360 1260"/><path d="M640 40 L600 1280"/>
        <path d="M120 420 C300 400 420 460 560 430"/><path d="M500 700 C520 820 480 940 520 1060"/><path d="M760 640 C820 760 880 860 930 900"/></g>
      <g stroke="rgba(23,19,15,.12)" stroke-width="2.5" fill="none"><path d="M160 160 L200 1200"/><path d="M800 80 L760 1240"/><path d="M40 660 L940 700"/><path d="M60 980 L940 950"/></g>
    </svg>`;
    [['CENTRU', 380, 700], ['GHEORGHENI', 720, 640], ['MĂRĂȘTI', 690, 380], ['ZORILOR', 360, 1000], ['MĂNĂȘTUR', 90, 470], ['GRIGORESCU', 70, 250]].forEach(([n, x, y]) => { const l = $('div', 'abs', m, { left: x + 'px', top: y + 'px', font: `22px ${FT.type}`, color: 'rgba(23,19,15,.45)', letterSpacing: '.18em' }); l.textContent = n });
    const tt = tape(s.cam, 540, 330, 560, 84, 202, 'rgba(236,226,190,.95)');
    const title = AD.typer($('div', 'abs', tt, { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `44px ${FT.type}`, color: P.ink, whiteSpace: 'nowrap' }), b.title || 'harta serii');
    const items = (b.items || []).slice(0, 5);
    const route = items.length > 1 ? marker(s.cam, 'M' + items.map(it => `${SX + it.x} ${SY + it.y}`).join(' L'), 10) : null;
    const pins = items.map((it, i) => {
      const g = grp(s.cam, SX + it.x, SY + it.y, 190, 190);
      const ring = $('div', 'abs', g, { inset: 0, borderRadius: '50%', background: P.cream, boxShadow: '0 16px 22px -8px rgba(0,0,0,.45),0 2px 4px rgba(0,0,0,.2)' });
      const ph = $('div', 'abs', g, { left: '12px', top: '12px', width: '166px', height: '166px', borderRadius: '50%', overflow: 'hidden' }); photo(ph, it.photo, { w: 166, h: 166, label: false });
      const nb = $('div', 'abs', g, { right: '-6px', top: '-6px', width: '62px', height: '62px', borderRadius: '50%', background: paper(P.accent), display: 'grid', placeItems: 'center', font: `40px ${FT.anton}`, color: P.ink, boxShadow: '0 6px 10px rgba(0,0,0,.3)' }); nb.textContent = i + 1;
      const lb = $('div', 'abs', g, { left: '50%', top: '196px', transform: 'translateX(-50%) rotate(-3deg)', font: `700 54px ${FT.hand}`, color: P.ink, whiteSpace: 'nowrap', background: 'rgba(248,242,231,.85)', padding: '0 14px', borderRadius: '8px' }); lb.textContent = it.label;
      return { g, lb, i };
    });
    const note = b.note ? hand(s.cam, b.note, { x: 540, y: 1650, size: 92 }) : null;
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      const sp = slap(tq, 0, .16); tf(sheet, 0, (1 - E.out3(sp)) * 120, -1.5 + (1 - sp) * -5, lerp(1.1, 1, E.out3(sp)));
      const tp = slap(tq, .08, .1); tf(tt, 0, 0, -2, lerp(1.5, 1, tp), tp > 0 ? 1 : 0); AD.typeTo(title, (lt - .15) / .035);
      pins.forEach(p => { const st = .4 + p.i * .42, q = slap(tq, st, .16), e = E.out3(q); tf(p.g, 0, (1 - e) * -220, (p.i % 2 ? 4 : -4) + (1 - q) * 20 + (q >= 1 ? boil(p.i + 40, lt, .6) : 0), lerp(1.5, 1, e), q > 0 ? 1 : 0); AD.clipReveal(p.lb, prog(lt, st + .2, .3)) });
      if (route) AD.strokeReveal(route, prog(lt, .55, Math.max(.3, (items.length - 1) * .42), 'lin'));
      if (note) AD.clipReveal(note, prog(lt, .6 + items.length * .42, .4));
      if (wipe) wipe(lt);
      tf(s.cam, 0, kf(lt, [[0, 20], [d, -30]], 'io2'), kf(lt, [[0, .5], [d, -.5]]), 1 + lt * .025);
    };
  },
  /* thermal receipt printing line by line; total circled. items: [{name, price}] */
  receipt(s, b, d, ctx) {
    const items = (b.items || []).slice(0, 6), cur = b.currency || 'lei', RW = 620, RH = 360 + items.length * 66 + 250;
    const g = grp(s.cam, 540, 300 + RH / 2, RW, RH); g.style.filter = 'drop-shadow(0 26px 22px rgba(0,0,0,.35)) drop-shadow(0 3px 3px rgba(0,0,0,.2))';
    let zz = ''; const teeth = 22; for (let i = 0; i <= teeth; i++) zz += `${(RW * i / teeth).toFixed(1)}px ${i % 2 ? RH - 16 : RH}px,`;
    const pp = $('div', 'abs', g, { inset: 0, background: paper('#f8f5ef'), clipPath: `polygon(0 0,${RW}px 0,${zz.slice(0, -1).split(',').reverse().join(',')})` });
    const row = (y, l, r, size = 34, font = FT.type, col = P.ink) => { const a = $('div', 'abs', pp, { left: '48px', right: '48px', top: y + 'px', display: 'flex', justifyContent: 'space-between', font: `${size}px ${font}`, color: col, whiteSpace: 'nowrap' }); a.innerHTML = `<span>${l}</span><span>${r}</span>`; return a };
    const center = (y, t, size, font = FT.type, ls = '.08em') => { const a = $('div', 'abs', pp, { left: 0, right: 0, top: y + 'px', textAlign: 'center', font: `${size}px ${font}`, color: P.ink, letterSpacing: ls, whiteSpace: 'nowrap' }); a.textContent = t; return a };
    const dash = y => $('div', 'abs', pp, { left: '48px', right: '48px', top: y + 'px', borderTop: `3px dashed rgba(23,19,15,.35)` });
    center(56, 'BEARMENU', 48, FT.arch, '.04em'); center(120, b.title || 'BON', 28); center(160, b.date || 'VIN 02.10 · 20:47', 24);
    dash(214); items.forEach((it, i) => row(250 + i * 66, it.name, `${it.price} ${cur}`)); const ty = 250 + items.length * 66 + 20; dash(ty);
    const tot = row(ty + 34, 'TOTAL', `${b.total} ${cur}`, 50);
    center(ty + 120, b.footer || 'mulțumim & poftă bună!', 24);
    $('div', 'abs', pp, { left: '160px', right: '160px', top: (ty + 170) + 'px', height: '44px', background: `repeating-linear-gradient(90deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 10px,transparent 10px 12px,${P.ink} 12px 13px,transparent 13px 17px)`, opacity: .7 });
    const SC = 1.16, gy = 300 + RH / 2, totY = gy + (300 + ty + 34 + 26 - gy) * SC, RX = 540;
    const k = SC, circ = marker(s.cam, `M${RX + 250 * k} ${totY - 44 * k} C${RX + 330 * k} ${totY - 10 * k} ${RX + 300 * k} ${totY + 50 * k} ${RX + 60 * k} ${totY + 52 * k} C${RX - 280 * k} ${totY + 56 * k} ${RX - 320 * k} ${totY - 50 * k} ${RX - 60 * k} ${totY - 58 * k} C${RX + 120 * k} ${totY - 64 * k} ${RX + 230 * k} ${totY - 50 * k} ${RX + 280 * k} ${totY - 20 * k}`, 12);
    const wr = b.write ? hand(s.cam, b.write, { x: 600, y: Math.min(gy + RH * SC / 2 + 90, 1560), size: 118 }) : null;
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt), pr = clamp((tq - .05) / 1.25);          // printing progress, on twos
      pp.style.clipPath = `polygon(0 0,${RW}px 0,${zz.slice(0, -1).split(',').reverse().join(',')})`;
      g.style.clipPath = `inset(0 -60px ${((1 - pr) * 100).toFixed(2)}% -60px)`;
      tf(g, 0, (1 - pr) * -RH * .35, -2.5 + boil(3, lt, .25), SC);
      AD.strokeReveal(circ, prog(lt, 1.45, .3, 'out3'));
      if (wr) AD.clipReveal(wr, prog(lt, 1.75, .4));
      if (wipe) wipe(lt);
      tf(s.cam, 0, kf(lt, [[0, -20], [d, 20]], 'io2'), .4, 1.02 + lt * .015);
    };
  },
  /* this-or-that: two polaroids, VS sticker, handwritten 1 / 2. a/b: {photo, caption}; pick: 'a'|'b' (optional) */
  versus(s, b, d, ctx) {
    const q = typed(s.cam, b.q || '', { x: W / 2, y: 330, size: 58, color: onDark(b.bg) ? P.cream : P.ink }); fitText(q, 960);
    const A = polaroid(s.cam, b.a.photo, { x: 300, y: 880, w: 470, h: 560, caption: b.a.caption, seed: 301 }), B = polaroid(s.cam, b.b.photo, { x: 790, y: 1010, w: 470, h: 560, caption: b.b.caption, seed: 302 });
    const vs = roundSticker(s.cam, 'VS', { x: 540, y: 1330, r: 105, color: P.ink, text: P.amber, size: 96 });
    const n1 = hand(s.cam, '1', { x: 110, y: 560, w: 140, h: 170, size: 170 }), n2 = hand(s.cam, '2', { x: 985, y: 700, w: 140, h: 170, size: 170 });
    const tick = b.pick ? marker(s.cam, b.pick === 'a' ? 'M200 880 L270 960 L420 760' : 'M690 1010 L760 1090 L910 890', 22) : null;
    return lt => {
      const tq = q12(lt);
      AD.typeTo(q, (lt - .02) / .03);
      const pa = slap(tq, .08, .16), pb = slap(tq, .32, .16);
      tf(A, (1 - E.out3(pa)) * -700, 0, -6 + (1 - pa) * -20 + (pa >= 1 ? boil(31, lt, .4) : 0), lerp(1.2, 1, E.out3(pa)), pa > 0 ? 1 : 0);
      tf(B, (1 - E.out3(pb)) * 700, 0, 5 + (1 - pb) * 20 + (pb >= 1 ? boil(32, lt, .4) : 0), lerp(1.2, 1, E.out3(pb)), pb > 0 ? 1 : 0);
      AD.clipReveal(A.cap, prog(lt, .35, .3)); AD.clipReveal(B.cap, prog(lt, .6, .3));
      const pv = slap(tq, .62, .12); tf(vs, 0, 0, -10 + lt * 14, lerp(2, 1, E.out3(pv)), pv > 0 ? 1 : 0);
      AD.clipReveal(n1, prog(lt, .85, .15)); AD.clipReveal(n2, prog(lt, 1.0, .15));
      if (tick) AD.strokeReveal(tick, prog(lt, 1.3, .25, 'out3'));
      tf(s.cam, 0, 0, 0, 1 + .06 * Math.exp(-lt * 8) + lt * .02);
    };
  },
  /* group chat as paper cut-outs, resolved by a BearMenu link card. messages: [{text, me}], answer: {photo, name, meta} */
  chat(s, b, d, ctx) {
    const hd = tape(s.cam, 540, 300, 640, 84, 401, 'rgba(236,226,190,.95)');
    const ht = AD.typer($('div', 'abs', hd, { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `40px ${FT.type}`, color: P.ink, whiteSpace: 'nowrap' }), b.title || 'grup · vineri seara · 6');
    const msgs = (b.messages || []).slice(0, 6); let y = 440;
    const B = msgs.map((m, i) => {
      const w = Math.min(820, m.text.length * 25 + 110), h = 116, x = m.me ? 990 - w / 2 : 90 + w / 2, yy = y + h / 2; y += h + 30;
      const c = card(s.cam, { x, y: yy, w, h, bg: m.me ? BG.amber : BG.cream, seed: 410 + i, jit: 1.8, step: 5, edges: m.me ? 'ctcc' : 'ccct', rim: '#fbf7ef' });
      const t = $('div', '', c.face, { font: `600 44px ${FT.sans}`, color: P.ink, whiteSpace: 'nowrap', letterSpacing: '-.01em' }); t.textContent = m.text; fitText(t, w - 60);
      return { c, i, r: m.me ? 2 : -2 };
    });
    let ans = null, circ = null, wr = null;
    if (b.answer) {
      const ay = y + 200; ans = grp(s.cam, 700, ay, 560, 380);
      const cc = card(ans, { x: 280, y: 190, w: 560, h: 380, bg: BG.cream, seed: 430, jit: .6, step: 8, edges: 'cccc', rim: null }); cc.face.style.display = 'block';
      const pw = $('div', 'abs', cc.face, { left: '18px', top: '18px', right: '18px', height: '220px', overflow: 'hidden', borderRadius: '10px' }); photo(pw, b.answer.photo, { w: 524, h: 220 });
      const n = $('div', 'abs', cc.face, { left: '24px', top: '254px', right: '24px', font: `${46}px ${FT.anton}`, color: P.ink, whiteSpace: 'nowrap' }); n.textContent = b.answer.name; fitText(n, 510);
      const mm = $('div', 'abs', cc.face, { left: '26px', top: '318px', font: `24px ${FT.type}`, color: 'rgba(23,19,15,.6)', letterSpacing: '.08em', whiteSpace: 'nowrap' }); mm.textContent = (b.answer.meta || '') + '  ·  BEARMENU';
      tape(ans, 280, 4, 180, 52, 431);
      circ = marker(s.cam, `M${700 + 250} ${ay - 230} C${700 + 360} ${ay - 120} ${700 + 330} ${ay + 230} ${700 - 20} ${ay + 235} C${700 - 380} ${ay + 240} ${700 - 360} ${ay - 230} ${700 + 40} ${ay - 240}`, 12);
      wr = hand(s.cam, b.write || 'asta!', { x: 250, y: ay - 60, w: 400, size: 120 });
    }
    const wipe = ctx.next ? tornWipe(s, ctx.next.bg, 0, d) : null;
    return lt => {
      const tq = q12(lt);
      const hp = slap(tq, 0, .1); tf(hd, 0, 0, -2, lerp(1.4, 1, hp), hp > 0 ? 1 : 0); AD.typeTo(ht, (lt - .05) / .025);
      B.forEach(o => { const p = slap(tq, .2 + o.i * .3, .12), e = E.out3(p); tf(o.c, 0, (1 - e) * 30, o.r + (1 - p) * o.r * 4 + (p >= 1 ? boil(o.i + 50, lt, .3) : 0), lerp(1.35, 1, e), p > 0 ? 1 : 0) });
      if (ans) { const st = .25 + msgs.length * .3, p = slap(tq, st, .16); tf(ans, (1 - E.out3(p)) * 600, 0, 3 + (1 - p) * 10 + (p >= 1 ? boil(60, lt, .35) : 0), lerp(1.2, 1, E.out3(p)), p > 0 ? 1 : 0); AD.strokeReveal(circ, prog(lt, st + .35, .3, 'out3')); AD.clipReveal(wr, prog(lt, st + .6, .35)) }
      if (wipe) wipe(lt);
      tf(s.cam, 0, kf(lt, [[0, 40], [d, -60]], 'io2'), 0, 1 + lt * .012);
    };
  },
  end(s, b, d, ctx) {
    const sheet = card(s.cam, { x: 540, y: 1000, w: 960, h: 1400, bg: BG.cream, seed: 150, jit: 1.4, step: 1.8 });
    tape(s.cam, 540, 310, 300, 62, 151);
    const word = (b.word || 'BearMenu').toUpperCase(), size = fitRansom(word, 880, 170, 77, [1, 4, 2, 0, 5, 3, 6, 7]);
    const R = AD.ransom(s.cam, word, { cx: W / 2, cy: 760, size, seed: 77, order: [1, 4, 2, 0, 5, 3, 6, 7], styles: RS });
    const rr = rng(9); R.forEach(l => { l.dx = (rr() - .5) * 1500; l.dy = (rr() < .5 ? -1 : 1) * (900 + rr() * 400); l.dr = (rr() - .5) * 160 });
    const logo = AD.misregister(s.cam, b.word || 'BearMenu', { x: W / 2, y: 760, w: 1000, h: 220, size: 168, font: FT.arch, top: P.ink, under: P.accent, off: [7, 5] });
    const tag = AD.typer($('div', 'abs', s.cam, { font: `italic 900 94px ${FT.pf}`, color: P.ink, textAlign: 'center', whiteSpace: 'nowrap' }), b.tagline || 'Găsește-ți seara.'); place(tag, W / 2, 960, 1000, 120);
    const st = AD.stamp(s.cam, b.stamp || 'CLUJ-NAPOCA', { x: 560, y: 1220, w: 600, h: 140, color: P.accent, size: 84 });
    const cta = b.cta ? typed(s.cam, b.cta, { x: W / 2, y: 1420, size: 44, color: P.ink }) : null; if (cta) AD.fitText(cta, 860);
    return lt => {
      const tq = q12(lt), clean = lt >= .9;
      R.forEach(l => { const p = slap(tq, .08 + l.i * .06, .3), e = E.out5(p); tf(l.g, l.dx * (1 - e), l.dy * (1 - e), l.rot + l.dr * (1 - e) + boil(l.seed, lt, .8), 1, p > 0 && !clean ? 1 : 0) });
      tf(logo, 0, 0, -2, clean ? 1 + .05 * Math.exp(-(lt - .9) * 10) : 1, clean ? 1 : 0);
      AD.typeTo(tag, (lt - 1.15) / .035);
      const sp = prog(lt, 1.75, .12, 'in3'); tf(st, 0, 0, -6, lerp(2.4, 1, sp), sp > 0 ? .92 : 0);
      if (cta) AD.typeTo(cta, (lt - 1.85) / .02);
      tf(sheet, 0, 0, 1.2);
      tf(s.cam, 0, kf(lt, [[0, -16], [d, 16]]), kf(lt, [[0, .5], [d, -.3]]), kf(lt, [[0, 1.06], [.9, 1.0, 'out3'], [d, 1.03]]));
    };
  },
};

/* ---------------- scheduler ---------------- */
{
  let t0 = 0; const beats = REEL.beats || [];
  beats.forEach((b, i) => {
    const d = b.dur, s = AD.scene(t0, t0 + d, BG[b.bg] || BG.paper);
    const ctx = { next: beats[i + 1] || null, statics: [], index: i };
    const r = (BEATS[b.type] || (() => () => { }))(s, b, d, ctx);
    s.render = (t, lt) => r(lt);
    if (i > 0 && (b.type === 'ranked' || beats[i - 1].type === 'ranked')) AD.F.flashes.push(t0 + .001);
    t0 += d;
  });
  if (Math.abs(t0 - AD.T) > .05) console.warn(`reel beats sum to ${t0.toFixed(2)}s but duration is ${AD.T}s`);
}
