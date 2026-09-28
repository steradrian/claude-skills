/* BearMenu · ORBIT · 12s · 9:16
 * One continuous camera: phone spins in → dish cards burst into a 3D ring → ring accelerates, gradient takes
 * each dish's colour → snaps onto one dish → camera flies into it → pulls back into the app → phone spins away.
 * Photo slots: ad.config.json → "images" (photo01..photo08). Empty slots render a marked placeholder in the dish colour.
 * Beat grid: 0.5s (120 BPM). No camera shake; springs only where objects land.
 */
const { W, H, E, kf, prog, tf, $, place, clamp, lerp, wobble, rng } = AD;
const IMG = AD.C.images || {};
const SANS = "'IT',system-ui,sans-serif", SERIF = "'IS',Georgia,serif", MONO = "'SG',ui-monospace,monospace";
const WHITE = '#fbf7f2', DARK = '#1c1512';

const DISHES = [
  { slot: 'photo01', name: 'Spritz la apus', meta: 'Terasă · 19:00', col: '#e2561d' },
  { slot: 'photo02', name: 'Ramen', meta: 'Mărăști · 20:00', col: '#b8741f' },
  { slot: 'photo03', name: 'Paste cu trufe', meta: 'Centru · 20:30', col: '#8a6436' },   // ← the hero
  { slot: 'photo04', name: 'Tiramisu matcha', meta: 'Gheorgheni · 21:00', col: '#6e8f3a' },
  { slot: 'photo05', name: 'Sushi omakase', meta: 'Centru · 20:00', col: '#d0604a' },
  { slot: 'photo06', name: 'Vin natural', meta: 'Zorilor · 21:30', col: '#7c1d33' },
  { slot: 'photo07', name: 'Smash burger', meta: 'Mănăștur · 19:30', col: '#a33a1f' },
  { slot: 'photo08', name: 'Brunch lung', meta: 'Grigorescu · 11:00', col: '#c9901a' },
];
const HERO = 2, START_COL = '#7c1d33';

/* ---------- colour ---------- */
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixA = (a, b, p) => a.map((v, i) => v + (b[i] - v) * p);
const tone = (a, k) => a.map(v => k < 0 ? v * (1 + k) : v + (255 - v) * k);
const css = (a, al = 1) => `rgba(${a.map(v => Math.round(v)).join(',')},${al})`;

/* ---------- photo slot (real image or marked placeholder) ---------- */
function slot(parent, d, { w, h, radius = 0, label = true, labelSize = 18 }) {
  const el = $('div', 'abs', parent, { left: 0, top: 0, width: w + 'px', height: h + 'px', overflow: 'hidden', borderRadius: radius + 'px' });
  const inner = $('div', 'abs', el, { inset: 0 });
  if (IMG[d.slot]) inner.style.background = `url(${IMG[d.slot]}) center/cover no-repeat`;
  else {
    const c = hx(d.col);
    inner.style.background = `radial-gradient(ellipse 70% 55% at 30% 22%,${css(tone(c, .4))},transparent 70%),radial-gradient(ellipse 60% 50% at 85% 95%,${css(tone(c, -.6))},transparent 70%),linear-gradient(160deg,${d.col},${css(tone(c, -.45))})`;
    if (label) {
      const ic = $('div', 'abs', inner, { left: '50%', top: '40%', width: labelSize * 3.4 + 'px', height: labelSize * 2.5 + 'px', marginLeft: -labelSize * 1.7 + 'px', border: `${Math.max(2, labelSize / 6)}px solid rgba(255,255,255,.4)`, borderRadius: labelSize * .6 + 'px' });
      $('div', 'abs', ic, { left: '50%', top: '50%', width: labelSize * 1.1 + 'px', height: labelSize * 1.1 + 'px', transform: 'translate(-50%,-50%)', border: `${Math.max(2, labelSize / 6)}px solid rgba(255,255,255,.4)`, borderRadius: '50%' });
      const lb = $('div', 'abs', inner, { left: labelSize + 'px', top: labelSize * .9 + 'px', font: `500 ${labelSize}px ${MONO}`, color: 'rgba(255,255,255,.62)', letterSpacing: '.14em', whiteSpace: 'nowrap' }); lb.textContent = `FOTO · ${d.slot.toUpperCase()}`;
    }
  }
  $('div', 'abs', el, { inset: 0, backgroundImage: `url(${AD.NOISE})`, opacity: .3, mixBlendMode: 'overlay' });
  el.inner = inner; return el;
}

/* ---------- a phone with real thickness (stacked slices) ---------- */
const PW = 520, PH = 1080, PR = 92, THICK = 30;
function phone(parent, fill) {
  const g = $('div', 'abs', parent, { left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
  const face = (z, st, extra = '') => $('div', 'abs', g, Object.assign({ left: -PW / 2 + 'px', top: -PH / 2 + 'px', width: PW + 'px', height: PH + 'px', borderRadius: PR + 'px', transform: `translateZ(${z}px)${extra}` }, st));
  for (let i = 0; i < 10; i++) face(-1.5 - i * 2.9, { background: i < 2 ? '#3b3b42' : '#17171b' });
  const back = face(-THICK, { background: 'linear-gradient(155deg,#2b2b31,#0e0e11 60%)', backfaceVisibility: 'hidden', border: '2px solid #3b3b42' }, ' rotateY(180deg)');
  const bl = $('div', 'abs', back, { left: '50%', top: '46%', width: '120px', height: '120px', marginLeft: '-60px', borderRadius: '36px', background: 'linear-gradient(145deg,#3a3a42,#1a1a1f)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.08)' });
  $('div', 'abs', back, { left: '44px', top: '44px', width: '150px', height: '150px', borderRadius: '44px', background: '#0a0a0c', boxShadow: 'inset 0 0 0 3px #2c2c33' });
  const front = face(0, { background: '#0b0b0d', backfaceVisibility: 'hidden', boxShadow: 'inset 0 0 0 3px #3b3b42' });
  const screen = $('div', 'abs', front, { left: '14px', top: '14px', right: '14px', bottom: '14px', borderRadius: (PR - 14) + 'px', overflow: 'hidden', background: '#fbf7f2' });
  fill(screen);
  const hi = $('div', 'abs', screen, { left: '50%', bottom: '10px', width: '150px', height: '6px', marginLeft: '-75px', borderRadius: '3px', background: 'rgba(28,21,18,.85)', zIndex: 9 }); g.homeInd = hi;
  $('div', 'abs', screen, { left: '50%', top: '18px', width: '150px', height: '42px', marginLeft: '-75px', borderRadius: '22px', background: '#0b0b0d', zIndex: 9 });
  const glare = $('div', 'abs', front, { inset: 0, borderRadius: PR + 'px', background: 'linear-gradient(120deg,rgba(255,255,255,.18),transparent 30%,transparent 70%,rgba(255,255,255,.06))', pointerEvents: 'none' });
  g.front = front; g.screen = screen; g.glare = glare; return g;
}
const SW = PW - 28;
function homeScreen(sc) {
  AD.ui.statusBar(sc, { time: '20:14' });
  const t = $('div', 'abs', sc, { left: '34px', top: '86px', font: `italic 56px ${SERIF}`, color: DARK }); t.textContent = 'Diseară în Cluj';
  const m = $('div', 'abs', sc, { left: '36px', top: '156px', font: `500 20px ${MONO}`, color: 'rgba(28,21,18,.5)', letterSpacing: '.12em' }); m.textContent = 'VINERI · LÂNGĂ TINE';
  const chips = $('div', 'abs', sc, { left: '34px', top: '200px', display: 'flex', gap: '10px' });
  ['Toate', 'Cină', 'Drinks', 'Evenimente'].forEach((c, i) => { const d = $('div', '', chips, { font: `600 21px ${SANS}`, padding: '11px 18px', borderRadius: '30px', background: i === 0 ? DARK : 'rgba(28,21,18,.07)', color: i === 0 ? WHITE : DARK, whiteSpace: 'nowrap' }); d.textContent = c });
  const gw = (SW - 34 * 2 - 16) / 2;
  DISHES.slice(0, 6).forEach((d, i) => {
    const x = 34 + (i % 2) * (gw + 16), y = 272 + Math.floor(i / 2) * 250;
    const tile = $('div', 'abs', sc, { left: x + 'px', top: y + 'px', width: gw + 'px', height: '232px' });
    const ph = $('div', 'abs', tile, { left: 0, top: 0, width: gw + 'px', height: '170px', borderRadius: '22px', overflow: 'hidden' }); slot(ph, d, { w: gw, h: 170, label: false });
    const n = $('div', 'abs', tile, { left: '4px', top: '180px', font: `700 22px ${SANS}`, color: DARK, whiteSpace: 'nowrap' }); n.textContent = d.name;
    const mm = $('div', 'abs', tile, { left: '4px', top: '208px', font: `500 16px ${MONO}`, color: 'rgba(28,21,18,.5)', whiteSpace: 'nowrap' }); mm.textContent = d.meta;
  });
  const nav = $('div', 'abs', sc, { left: 0, right: 0, bottom: 0, height: '96px', background: 'rgba(251,247,242,.96)', borderTop: '1px solid rgba(28,21,18,.08)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' });
  for (let i = 0; i < 4; i++) $('div', '', nav, { width: '38px', height: '38px', borderRadius: i === 0 ? '12px' : '50%', background: i === 0 ? DARK : 'rgba(28,21,18,.15)' });
}
const HERO_H = 640;
let detail = {};
function detailScreen(sc) {
  const d = DISHES[HERO];
  const ph = $('div', 'abs', sc, { left: 0, top: 0, width: SW + 'px', height: HERO_H + 'px' }); detail.photo = slot(ph, d, { w: SW, h: HERO_H, label: true, labelSize: 16 });
  $('div', 'abs', ph, { inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.25),transparent 25%,transparent 70%,rgba(0,0,0,.35))' });
  AD.ui.statusBar(sc, { time: '20:14', color: '#fbf7f2' });
  const bb = AD.ui.iconButton('arrow', { size: 62 }); ph.appendChild(bb); Object.assign(bb.style, { position: 'absolute', left: '26px', top: '82px', transform: 'scaleX(-1)' });
  const hb = AD.ui.iconButton('heart', { size: 62 }); ph.appendChild(hb); Object.assign(hb.style, { position: 'absolute', right: '26px', top: '82px' });
  const sheet = $('div', 'abs', sc, { left: 0, right: 0, top: (HERO_H - 40) + 'px', bottom: 0, borderRadius: '40px 40px 0 0', background: '#fbf7f2' });
  const t = $('div', 'abs', sheet, { left: '34px', top: '40px', font: `700 46px ${SANS}`, color: DARK, letterSpacing: '-.03em', whiteSpace: 'nowrap' }); t.textContent = d.name;
  const m = $('div', 'abs', sheet, { left: '34px', top: '104px', display: 'flex', alignItems: 'center', gap: '8px', font: `500 20px ${MONO}`, color: 'rgba(28,21,18,.55)', letterSpacing: '.06em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' });
  m.innerHTML = AD.icon('pin', 20, 'rgba(28,21,18,.55)') + '<span>Centru</span><span style="opacity:.4;margin:0 4px">·</span>' + AD.icon('clock', 20, 'rgba(28,21,18,.55)') + '<span>Diseară 20:30</span>';
  const tagRow = $('div', 'abs', sheet, { left: '34px', top: '150px', display: 'flex', gap: '10px' });
  [['star', '4,8'], ['walk', '12 min'], [null, 'Italian']].forEach(([ic, tx]) => { const c = AD.ui.chip(tx, { ic, size: 19, blur: 0 }); c.style.background = 'rgba(28,21,18,.06)'; c.style.boxShadow = 'none'; tagRow.appendChild(c) });
  [0, 1].forEach(i => $('div', 'abs', sheet, { left: '36px', top: (222 + i * 28) + 'px', width: [400, 300][i] + 'px', height: '11px', borderRadius: '6px', background: 'rgba(28,21,18,.07)' }));
  const btn = $('div', 'abs', sheet, { left: '34px', right: '34px', bottom: '40px', height: '92px', borderRadius: '46px', background: DARK, color: WHITE, display: 'grid', placeItems: 'center', font: `600 30px ${SANS}`, overflow: 'hidden' });
  const bt = $('div', '', btn, { display: 'flex', alignItems: 'center', gap: '12px' }); bt.innerHTML = AD.icon('bookmark', 28, WHITE, 2.1) + '<span>Salvează pentru diseară</span>';
  const rip = $('div', 'abs', btn, { left: '50%', top: '50%', width: '40px', height: '40px', marginLeft: '-20px', marginTop: '-20px', borderRadius: '50%', background: 'rgba(255,255,255,.35)', transform: 'scale(0)' });
  const toast = AD.ui.toast({ accent: d.col, width: SW - 32 }); sc.appendChild(toast); Object.assign(toast.style, { position: 'absolute', left: '16px', top: '72px', zIndex: 12, transform: 'translateY(-180px)' });
  Object.assign(detail, { btn, bt, rip, toast });
}

/* ================= the shot ================= */
const S = AD.scene(0, 12, '#1a0509');
const s = S;
/* background: morphing mesh gradient (4 blobs change position, size and colour) + drifting particles */
const base = $('div', 'abs', s.bg, { inset: 0 });
const blobs = [0, 1, 2, 3].map(() => $('div', 'abs', s.bg, { width: '1500px', height: '1500px', left: '-150px', top: '250px', borderRadius: '50%' }));
const LAY = []; { const r = rng(21); for (let k = 0; k < 12; k++) LAY.push([0, 1, 2, 3].map(() => ({ x: (r() - .5) * 900, y: (r() - .5) * 1500, s: .55 + r() * .9 }))) }
$('div', 'abs', s.bg, { inset: 0, backgroundImage: `url(${AD.NOISE})`, opacity: .45 });
const parts = []; { const r = rng(8); for (let i = 0; i < 22; i++) { const z = .3 + r() * .9; parts.push({ el: $('div', 'abs', s.bg, { width: 6 + z * 10 + 'px', height: 6 + z * 10 + 'px', borderRadius: '50%', background: 'rgba(255,240,225,.5)', filter: `blur(${(1.2 - z) * 4}px)` }), x: r() * W, y: r() * H, z }) } }

/* 3D stage */
const view = $('div', 'abs', s.cam, { inset: 0, perspective: '2400px', perspectiveOrigin: '50% 45%' });
const world = $('div', 'abs', view, { left: W / 2 + 'px', top: '860px', width: 0, height: 0, transformStyle: 'preserve-3d' });
const ph1 = phone(world, homeScreen);
const ring = $('div', 'abs', world, { left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
const CW = 330, CH = 450, RR = 640;
const cards = DISHES.map((d, i) => {
  const holder = $('div', 'abs', ring, { left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
  const f = $('div', 'abs', holder, { left: -CW / 2 + 'px', top: -CH / 2 + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '36px', overflow: 'hidden', backfaceVisibility: 'hidden', boxShadow: '0 40px 70px rgba(0,0,0,.35)' });
  slot(f, d, { w: CW, h: CH, labelSize: 15 });
  $('div', 'abs', f, { inset: 0, background: 'linear-gradient(180deg,transparent 52%,rgba(10,6,4,.72))' });
  const n = $('div', 'abs', f, { left: '24px', bottom: '64px', font: `700 31px ${SANS}`, color: WHITE, letterSpacing: '-.025em', whiteSpace: 'nowrap' }); n.textContent = d.name;
  const [area, time] = d.meta.split(' · ');
  const m = $('div', 'abs', f, { left: '24px', bottom: '28px', display: 'flex', alignItems: 'center', gap: '7px', font: `500 18px ${MONO}`, color: 'rgba(251,247,242,.8)', letterSpacing: '.06em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' });
  m.innerHTML = AD.icon('clock', 18, 'rgba(251,247,242,.8)') + `<span>${time}</span><span style="opacity:.5;margin:0 4px">·</span>` + AD.icon('pin', 18, 'rgba(251,247,242,.8)') + `<span>${area}</span>`;
  const dist = AD.ui.chip(['1,2 km', '2,4 km', '0,8 km', '1,6 km', '0,5 km', '3,1 km', '2,0 km', '1,1 km'][i], { ic: 'walk', size: 17, tone: 'dark', blur: 0 }); f.appendChild(dist); Object.assign(dist.style, { position: 'absolute', left: '18px', top: '18px', background: 'rgba(20,15,12,.5)' });
  const bm = AD.ui.iconButton('bookmark', { size: 50, tone: 'dark' }); f.appendChild(bm); Object.assign(bm.style, { position: 'absolute', right: '18px', top: '16px', backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(20,15,12,.5)' });
  $('div', 'abs', f, { inset: 0, borderRadius: '36px', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.22)' });
  const b = $('div', 'abs', holder, { left: -CW / 2 + 'px', top: -CH / 2 + 'px', width: CW + 'px', height: CH + 'px', borderRadius: '36px', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.16)' });
  return { holder, f, b, a: i * 45 };
});

/* type */
const head = AD.maskLines(s.cam, [
  { text: 'Ce mănânci', style: { font: `700 138px ${SANS}`, color: WHITE, letterSpacing: '-.055em' } },
  { text: 'diseară?', style: { font: `italic 168px ${SERIF}`, color: WHITE, letterSpacing: '-.01em' } },
], { x: 84, y: 250, w: 960, lh: 140 });
const tick = $('div', 'abs', s.cam, { left: '84px', top: '262px', width: '920px' });
const tickN = $('div', '', tick, { font: `italic 132px ${SERIF}`, color: WHITE, whiteSpace: 'nowrap', lineHeight: 1 });
const tickM = $('div', '', tick, { font: `500 28px ${MONO}`, color: 'rgba(251,247,242,.7)', letterSpacing: '.16em', marginTop: '18px', whiteSpace: 'nowrap' });

/* full-screen hero (after the fly-through) */
const fs = $('div', 'abs', s.cam, { inset: 0, overflow: 'hidden', opacity: 0 });
const fsPh = slot(fs, DISHES[HERO], { w: W, h: H, labelSize: 30 });
$('div', 'abs', fs, { inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.35),transparent 30%,transparent 55%,rgba(0,0,0,.55))' });
const fsT = AD.maskLines(fs, [
  { text: 'Asta.', style: { font: `700 190px ${SANS}`, color: WHITE, letterSpacing: '-.06em' } },
  { text: 'Diseară.', style: { font: `italic 220px ${SERIF}`, color: WHITE } },
], { x: 80, y: 250, w: 980, lh: 190 });
const fsChip = $('div', 'abs', fs, { left: '84px', top: '720px', display: 'flex', gap: '14px' });
[[null, DISHES[HERO].name], ['clock', '20:30'], ['pin', 'Centru']].forEach(([ic, tx]) => fsChip.appendChild(AD.ui.chip(tx, { ic, size: 30, tone: 'dark', blur: 18 })));

/* the app (pull-back) */
const view2 = $('div', 'abs', s.cam, { inset: 0, perspective: '2600px', perspectiveOrigin: '50% 48%' });
const world2 = $('div', 'abs', view2, { left: W / 2 + 'px', top: '0px', width: 0, height: 0, transformStyle: 'preserve-3d' });
const ph2 = phone(world2, detailScreen);
const HC = DISHES[HERO].col;
const floaters = [
  { c: AD.ui.dateTile({ day: 'VIN', num: '02', title: 'Diseară', sub: '20:30 – 23:30', accent: HC }), from: [-40, 150], x: -262, y: 255, z: 160 },
  { c: AD.ui.mapCard({ eta: '8 min pe jos', area: 'Centru', accent: HC }), from: [40, 150], x: 272, y: -150, z: 190 },
  { c: AD.ui.availability({ title: 'Mai sunt 3 mese', sub: 'PENTRU DISEARĂ, 20:30', accent: HC }), from: [0, 380], x: -265, y: -45, z: 150 },
  { c: AD.ui.social({ lead: 'Ana și încă 12', line: 'au salvat asta azi' }), from: [150, -360], x: 262, y: 318, z: 110 },
].map((f, i) => { const e = $('div', 'abs', world2, { left: 0, top: 0, transformStyle: 'preserve-3d' }); e.appendChild(f.c); Object.assign(f.c.style, { position: 'absolute', transform: 'translate(-50%,-50%)' }); return Object.assign(f, { e, i }) });

/* lockup */
const lock = AD.maskLines(s.cam, [{ text: 'BearMenu', style: { font: `800 176px ${SANS}`, color: WHITE, letterSpacing: '-.065em' } }], { x: W / 2, y: 760, w: 1040, lh: 180, align: 'center' });
const lockT = AD.maskLines(s.cam, [{ text: 'Găsește-ți seara.', style: { font: `italic 96px ${SERIF}`, color: WHITE } }], { x: W / 2, y: 960, w: 1040, lh: 110, align: 'center' });

/* ---------- timing helpers ---------- */
const spring = (p, k = 6.5, f = 10) => p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-k * p) * Math.cos(f * p);
const backSoft = x => { const c = 1.25; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) };
const RHO_END = -(HERO * 45) - 1080;          // lands HERO at the front after 3 full turns
function rho(t) {
  if (t < 2.0) return 0;
  if (t < 6.1) return lerp(0, -900, E.in3((t - 2.0) / 4.1));
  return lerp(-900, RHO_END, backSoft(clamp((t - 6.1) / .7)));
}
function frontF(t) { const f = ((-rho(t) / 45) % 8 + 8) % 8; return f }

s.render = (t, lt) => {
  /* ---- colour world ---- */
  let col;
  const burg = hx(START_COL), heroC = hx(DISHES[HERO].col);
  if (t < 1.9) col = burg;
  else if (t < 6.8) { const f = frontF(t), i = Math.floor(f), p = E.io2(f - i); col = mixA(hx(DISHES[i % 8].col), hx(DISHES[(i + 1) % 8].col), p); col = mixA(burg, col, prog(t, 1.9, .5, 'io2')) }
  else if (t < 10.3) col = mixA(mixA(hx(DISHES[Math.floor(frontF(6.79)) % 8].col), heroC, 0), heroC, prog(t, 6.8, .3));
  else col = mixA(heroC, burg, prog(t, 10.3, 1.2, 'io2'));
  base.style.background = `linear-gradient(170deg,${css(tone(col, -.55))},${css(tone(col, -.82))})`;
  const shapeF = t < 2 ? t * .5 : t < 6.8 ? 1 + frontF(t) * .9 + (t - 2) * .2 : 6 + (t - 6.8) * .35;
  const k0 = Math.floor(shapeF) % LAY.length, k1 = (k0 + 1) % LAY.length, sp = E.io2(shapeF - Math.floor(shapeF));
  const bc = [tone(col, .25), col, tone(col, -.4), tone(col, .55)], ba = [.85, .9, .8, .45];
  blobs.forEach((b, i) => { const A = LAY[k0][i], B = LAY[k1][i]; b.style.background = `radial-gradient(circle,${css(bc[i], ba[i])},transparent 66%)`; b.style.transform = `translate(${lerp(A.x, B.x, sp) + wobble(i * 2, t, 60, .6)}px,${lerp(A.y, B.y, sp) + wobble(i * 3 + 1, t, 60, .5)}px) scale(${lerp(A.s, B.s, sp)})` });
  parts.forEach(p => { const y = ((p.y - t * 60 * p.z) % H + H) % H; p.el.style.transform = `translate(${p.x + Math.sin(t * .7 + p.y) * 20}px,${y}px)`; p.el.style.opacity = .6 * p.z });

  /* ---- phone 1: spin in, idle, then recede behind the hero ---- */
  const inP = prog(t, 0, 1.15, 'out5');
  const idle = t > 1.1 ? wobble(3, t, 7, .8) : 0;
  const p1z = lerp(-2600, 0, inP), p1ry = lerp(900, 0, inP) + idle, p1s = kf(t, [[0, .82], [1.3, .82], [2.0, .64, 'io2']]);
  ph1.style.transform = `translate3d(0,${kf(t, [[0, 190], [1.3, 190], [2.0, 10, 'io2']])}px,${p1z}px) rotateY(${p1ry}deg) rotateX(${lerp(18, 0, inP) + wobble(5, t, 3, .6)}deg) scale(${p1s})`;
  const spinV = Math.abs(900 * 5 * Math.pow(1 - clamp(t / 1.15), 4) / 1.15);   // deg/s from out5 derivative
  ph1.front.style.filter = spinV > 120 ? `blur(${Math.min(10, spinV / 260).toFixed(1)}px)` : 'none';
  ph1.glare.style.opacity = .6 + .4 * Math.cos((p1ry % 360) * Math.PI / 180);

  /* ---- ring ---- */
  const tilt = kf(t, [[1.3, 0], [2.0, -15, 'io2'], [6.4, -12], [7.0, 0, 'io2']]);
  const ringY = kf(t, [[1.3, 0], [2.0, 250, 'io2'], [6.4, 250], [7.0, 0, 'io2']]);
  const camZ = kf(t, [[0, 0], [2.0, -120, 'io2'], [6.4, 60, 'io2'], [7.0, 120, 'io2'], [7.45, 1260, 'in3']]);
  const wy = kf(t, [[6.4, 0], [7.0, 30, 'io2']]);
  world.style.transform = `translate3d(0,${wy}px,${camZ}px) rotateX(${tilt}deg) rotateY(${wobble(9, t, 4, .5) * (t < 6.4 ? 1 : 0)}deg)`;
  const r = rho(t);
  ring.style.transform = `translateY(${ringY}px) rotateY(${r}deg)`;
  const snapDim = prog(t, 6.55, .35, 'io2');
  cards.forEach((c, i) => {
    const st = 1.45 + i * .045; const p = spring(clamp((t - st) / .7));
    const rad = RR * p;
    c.holder.style.transform = `rotateY(${c.a}deg) translateZ(${rad}px) scale(${lerp(.25, 1, p)})`;
    const eff = ((c.a + r) % 360 + 360) % 360; const depth = Math.cos(eff * Math.PI / 180);   // 1 = front
    const vis = t >= st ? 1 : 0;
    const isHero = i === HERO;
    const dim = isHero ? 0 : snapDim;
    c.f.style.opacity = vis * (1 - dim * .75);
    const speedBlur = t > 4.8 && t < 6.5 ? Math.min(5, (t - 4.8) * 4) * (1 - prog(t, 6.2, .3)) : 0;
    const dof = (1 - depth) * 2.2 + dim * 8 + speedBlur;
    c.f.style.filter = dof > .3 ? `blur(${dof.toFixed(1)}px) brightness(${(.75 + .25 * depth).toFixed(2)})` : 'none';
    c.b.style.opacity = vis * .9 * (1 - dim);
  });
  ph1.front.style.opacity = 1 - snapDim * .6;

  /* ---- type ---- */
  head.forEach((it, i) => AD.reveal(it, prog(t, .35 + i * .12, .8, 'out5'), prog(t, 2.2 + i * .06, .35, 'in3')));
  const tOn = t > 2.5 && t < 7.0;
  tick.style.opacity = tOn ? 1 - prog(t, 6.75, .2) : 0;
  if (tOn) {
    const fi = Math.round(frontF(t)) % 8; const d = DISHES[fi];
    if (tickN.textContent !== d.name) { tickN.textContent = d.name; tickM.textContent = d.meta.toUpperCase() }
    tick.style.transform = `translateY(${(1 - prog(t, 2.5, .35, 'out5')) * 40}px)`;
  }

  /* ---- fly-through → full-screen hero ---- */
  const fsOn = prog(t, 7.3, .12);
  fs.style.opacity = t < 8.65 ? fsOn : 1 - prog(t, 8.65, .15);
  view.style.opacity = t < 7.45 ? 1 : 0;
  fsPh.inner.style.transform = `scale(${lerp(1.12, 1.0, prog(t, 7.3, 1.4, 'out3'))})`;
  fsT.forEach((it, i) => AD.reveal(it, prog(t, 7.5 + i * .25, .6, 'out5'), prog(t, 8.45, .25, 'in3')));
  AD.blurIn(fsChip, prog(t, 7.95, .5, 'out5'), { dist: 30, blur: 10 }); if (t > 8.45) fsChip.style.opacity = 1 - prog(t, 8.45, .2);

  /* ---- pull back into the app ---- */
  const pb = prog(t, 8.55, 1.15, 'io');
  const heroOff = -PH / 2 + 14 + HERO_H / 2;                 // hero-image centre relative to phone centre
  const sc2 = lerp(3.1, .86, pb);
  const cy2 = lerp(960 - heroOff * 3.1, 960, pb);
  const away = prog(t, 10.2, .9, 'in3');
  const ry2 = lerp(0, -14, pb) + wobble(4, t, 4, .7) * pb + lerp(0, 200, prog(t, 10.25, 1.3, 'io'));
  world2.style.transform = `translate3d(0,${cy2 - 260 * away}px,${lerp(0, -5200, away)}px)`;
  ph2.style.transform = `rotateY(${ry2}deg) rotateX(${lerp(0, 6, pb)}deg) scale(${sc2})`;
  view2.style.opacity = t >= 8.55 && t < 12 ? 1 - prog(t, 10.5, .3) : 0;
  ph2.front.style.boxShadow = 'inset 0 0 0 3px #3b3b42';
  detail.photo.inner.style.transform = `scale(${lerp(1.0, 1.06, pb)})`;
  floaters.forEach(f => {
    const q = clamp((t - 9.15 - f.i * .11) / .75), p = spring(q, 6, 9), out = prog(t, 10.12, .3, 'in3');
    const x = lerp(f.from[0], f.x, p) + wobble(f.i, t, 9, .8), y = lerp(f.from[1], f.y, p) + wobble(f.i + 4, t, 9, .7) - out * 40;
    f.e.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${(f.z * p).toFixed(1)}px) rotateY(${(-ry2 * .5).toFixed(2)}deg) scale(${lerp(.3, 1, Math.min(1, p)) * (1 - out * .1)})`;
    f.c.style.opacity = q > 0 ? clamp(q * 3) * (1 - out) : 0;
    if (f.c.segs) f.c.segs.forEach((sg, k) => sg.style.background = k < 7 && q > .25 + k * .07 ? HC : 'rgba(28,21,18,.1)');
  });
  const tap = prog(t, 9.75, .35, 'out3');
  detail.rip.style.transform = `scale(${tap * 16})`; detail.rip.style.opacity = 1 - tap;
  const saved = t > 9.85;
  detail.btn.style.background = saved ? DISHES[HERO].col : DARK; if (detail._saved !== saved) { detail._saved = saved; detail.bt.innerHTML = AD.icon(saved ? 'check' : 'bookmark', 28, WHITE, 2.3) + `<span>${saved ? 'Salvat pentru diseară' : 'Salvează pentru diseară'}</span>` }
  detail.btn.style.transform = `scale(${t > 9.72 && t < 9.9 ? .96 : 1})`;
  detail.toast.style.transform = `translateY(${lerp(-180, 0, E.out5(prog(t, 9.95, .45))) - 220 * prog(t, 10.6, .3, 'in3')}px)`;

  /* ---- lockup ---- */
  lock.forEach(it => AD.reveal(it, prog(t, 10.75, .7, 'out5')));
  lockT.forEach(it => AD.reveal(it, prog(t, 11.0, .7, 'out5')));
  const fadeL = 1 - prog(t, 11.82, .18); lock[0].wrap.style.opacity = lockT[0].wrap.style.opacity = t > 10.5 ? fadeL : 0;

  tf(s.cam, 0, 0, 0, 1);
};
