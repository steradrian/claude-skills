/* OFFCUT 01 · 15s 9:16 spec ad, gritty-collage. The canonical engine example.
 * Port of ../reference.html (the pre-engine single-file build) onto the engine API.
 * Every value is computed from time; DOM is built once per scene, motion lives in s.render(t, lt).
 * Components: core (cards, tape, typer), collage (ransom, stamp, markers, misregister, tornWipe),
 * helpers.js (the shoe SVG and the fabric swatches, OFFCUT-only).
 */
const { W, H, E, kf, prog, q12, boil, tf, $, place, grp, kick, clamp, lerp, rng, card, tape, typer, typeTo, strokeReveal, P, TX, FAB } = AD;
const INK = P.ink, PAPER = P.paper, RED = P.red;
const COPY = 'Every Friday the cutting room sweeps up what the pattern could not use: the corners of canvas, the tail of a hide, the last metre of a roll nobody reordered. For forty years it went into skips behind the building. The panels are now cut by hand from whatever arrived that week, so the colours change with the bins and no two runs look the same. Nothing about the shoe is decorative. Every seam is where one leftover meets another.';

/* ===== SCENE 1 · "They called it WASTE." (0 - 2.55) ===== */
const S1 = AD.scene(0, 2.55, TX.ink);
{
  const s = S1;
  // debris scraps drifting at the frame edges
  const d1 = card(s.cam, { x: 120, y: 1640, w: 470, h: 330, bg: TX.news, seed: 501, jit: 2.2 });
  AD.newsText(d1.face, { x: 235, y: 165, w: 420, h: 290, rot: 0, op: .5, size: 16, cols: 2, copy: COPY });
  const d2 = card(s.cam, { x: 960, y: 250, w: 300, h: 120, bg: TX.red, seed: 502, edges: 'tctc' });
  const d3 = card(s.cam, { x: 930, y: 1480, w: 210, h: 210, bg: TX.half, seed: 503 });
  // set-up line, typed with a blinking cursor
  const tw = typer($('div', 'abs tw', s.cam, { color: PAPER, fontSize: '74px', letterSpacing: '.02em', textAlign: 'center', paddingRight: '8px' }), 'They called it');
  place(tw, 540, 650, 1000, 90);
  // the hook word, ransom letters slammed on twos. Pre-measured so the row plus the 1.08 camera push
  // stays inside the safe zone (x 60..950, centre 505)
  const ORD = [0, 2, 1, 4, 5, 3]; let size = 178;
  while (AD.ransomWidth('WASTE.', size, 11, ORD) > 800) size -= 2;
  const L = AD.ransom(s.cam, 'WASTE.', { cx: 505, cy: 900, size, seed: 11, order: ORD });
  L.forEach(l => kick(.85 + l.i * .075 + .17, 5));
  // double red marker strike through it
  const k1 = AD.markerPath(s.cam, 'M80 925 C280 885 580 945 940 885', { width: 30 });
  const k2 = AD.markerPath(s.cam, 'M105 980 C350 935 650 995 925 930', { width: 22 });
  kick(1.74, 4); kick(2.5, 10);
  s.render = (t, lt) => {
    const tq = q12(lt);
    typeTo(tw, (lt - .18) / .042);
    tw.style.borderRight = `6px solid ${Math.floor(lt * 3) % 2 === 0 && lt < 1.2 ? PAPER : 'transparent'}`;
    L.forEach(l => {
      const p = clamp((tq - (.85 + l.i * .075)) / .17), e = E.back(p);
      tf(l.g, 0, (1 - e) * -40, l.rot + (1 - p) * (l.i % 2 ? -26 : 22) + boil(l.seed, lt, .8), lerp(2.5, 1, e), p > 0 ? 1 : 0);
    });
    strokeReveal(k1, prog(lt, 1.72, .2, 'out3'));
    strokeReveal(k2, prog(lt, 1.86, .18, 'out3'));
    tf(d1, lt * -14, lt * 10, 14 + boil(71, lt, .4));
    tf(d2, lt * 16, lt * -8, -11 + boil(72, lt, .4));
    tf(d3, lt * 10, lt * -12, 21 + boil(73, lt, .4));
    tf(s.cam, 0, kf(lt, [[0, 20], [2.55, -30]]), kf(lt, [[0, 0], [2.55, -1.8]]), kf(lt, [[0, 1], [2.55, 1.08]]));
  };
}

/* torn cream sheet sweeps up into scene 2 (same colour as its background, so the cut is invisible) */
AD.tornWipe({ a: 2.2, b: 2.55, bg: TX.paper, seed: 808 });

/* ===== SCENE 2 · the leftovers (2.55 - 5.3) ===== */
const S2 = AD.scene(2.55, 5.3, TX.paper);
{
  const s = S2;
  const news = AD.newsText(s.cam, { x: 540, y: 960, w: 1160, h: 2100, rot: -2, op: .2, size: 22, cols: 3, copy: COPY });
  const big = AD.outlineWord(s.cam, 'LEFTOVERS', { x: 980, y: 960, w: 2600, h: 600, size: 600 });
  // seven scraps, big and overlapping, each flying in from its own side; d = entry offset.
  // The scraps bleed off-frame but every label stays out of the platform UI zones: the bottom row
  // is lifted and its labels (ty = label y as a fraction of the scrap) are pinned onto the fabric.
  const D = [
    { x: 290, y: 360, w: 560, h: 380, r: -9, bg: FAB.stripes, t: 'Deadstock canvas', d: [-900, -600] },
    { x: 790, y: 500, w: 480, h: 440, r: 7, bg: FAB.kraft, t: 'Leather offcuts', d: [900, -500] },
    { x: 230, y: 930, w: 460, h: 540, r: 5, bg: FAB.grid, t: 'Sailcloth, 1998', d: [-1000, 100], ty: .75 },
    { x: 600, y: 820, w: 340, h: 290, r: -14, bg: FAB.cork, t: 'Cork dust', d: [0, -1400] },
    { x: 750, y: 1110, w: 540, h: 380, r: -6, bg: FAB.half, t: 'Cutting-room floor', d: [1000, 200], ty: .55 },
    { x: 300, y: 1400, w: 560, h: 400, r: -4, bg: FAB.denim, t: 'Denim ends', d: [-900, 800], ty: .17 },
    { x: 800, y: 1480, w: 420, h: 460, r: 10, bg: FAB.laces, t: 'Unsold laces', d: [900, 900], ty: .3 },
  ];
  const r = rng(44);
  const items = D.map((o, i) => {
    const g = grp(s.cam, o.x, o.y, o.w, o.h + 80);
    card(g, { x: o.w / 2, y: o.h / 2, w: o.w, h: o.h, bg: o.bg, seed: 600 + i * 5, jit: 2.4, step: 2.6, edges: ['tctt', 'ttct', 'cttt', 'tttc'][i % 4] });
    const tp = tape(g, o.w * (.3 + r() * .4), 4, 150 + r() * 50, 54, 700 + i);
    const tag = card(g, { x: o.w * .5 + (r() - .5) * 80, y: o.ty ? o.h * o.ty : o.h + 14, w: o.t.length * 22 + 60, h: 72, bg: TX.paper, seed: 650 + i, jit: 1.2, step: 6, edges: 'cccc', rim: null, sh: 'sh-lite' });
    tag.style.transform = `rotate(${((r() - .5) * 7).toFixed(2)}deg)`;
    const tt = typer($('div', 'tw', tag.face, { fontSize: '37px', color: INK }), o.t);
    return { g, tp, tt, o, i, dep: .6 + r() * .8, br: (r() - .5) * 80 };
  });
  items.forEach(it => kick(2.55 + .05 + it.i * .11 + .42, 3));
  // out-of-focus foreground scraps sell the depth
  const fg1 = card(s.cam, { x: 1010, y: 1830, w: 560, h: 420, bg: TX.half, seed: 690, jit: 2.4 }); fg1.style.filter = 'blur(9px)';
  const fg2 = card(s.cam, { x: 60, y: 120, w: 420, h: 320, bg: TX.kraft, seed: 691, jit: 2.4 }); fg2.style.filter = 'blur(8px)';
  // the punchline is scrawled across the denim, above the caption/CTA zone, arrow up into the pile
  const mk = AD.markerText(s.cam, 'all of it.', { x: 330, y: 1400, w: 460, h: 120, size: 92, rot: -8 });
  const arrow = AD.markerPath(s.cam, 'M530 1375 C590 1370 630 1345 665 1290 M665 1290 L605 1310 M665 1290 L660 1352', { width: 14 });
  s.render = (t, lt) => {
    const tq = q12(lt);
    const driftX = kf(lt, [[0, 30], [2.75, -30]]), driftY = kf(lt, [[0, 40], [2.75, -50]]);
    tf(news, driftX * .25, driftY * .25, -2);
    tf(big, driftX * .4, driftY * .2, 90);
    const fp = E.out5(clamp((tq - .3) / .4));
    tf(fg1, driftX * 2.4 + (1 - fp) * 600, driftY * 2.4 + (1 - fp) * 500, 16);
    tf(fg2, driftX * 2.2 - (1 - fp) * 500, driftY * 2.2 - (1 - fp) * 400, -12);
    items.forEach(it => {
      const st = .05 + it.i * .11, p = clamp((tq - st) / .42), e = E.out5(p);
      tf(it.g, it.o.d[0] * (1 - e) + driftX * it.dep, it.o.d[1] * (1 - e) + driftY * it.dep, it.o.r + it.br * (1 - e) + boil(it.i * 9, lt, .9), lerp(1.25, 1, e), p > 0 ? 1 : 0);
      const tp = clamp((tq - st - .42) / .09);
      tf(it.tp, 0, 0, it.i % 2 ? -6 : 5, lerp(1.6, 1, tp), tp > 0 ? 1 : 0);
      typeTo(it.tt, (lt - st - .5) / .028);
    });
    AD.clipReveal(mk, prog(lt, 1.85, .45));
    strokeReveal(arrow, prog(lt, 1.65, .25, 'out3'));
    // whip-pan out, with motion blur
    const whip = prog(lt, 2.58, .17, 'in3');
    tf(s.cam, -1500 * whip, 0, kf(lt, [[0, 1.2], [2.75, -1]]), kf(lt, [[0, 1.07], [2.6, 1.0]]));
    s.cam.style.filter = whip > 0 ? `blur(${(whip * 22).toFixed(1)}px)` : 'none';
  };
}

/* ===== SCENE 3 · assembly + "We called it OFFCUT 01" (5.3 - 8.55) ===== */
const S3 = AD.scene(5.3, 8.55, TX.red);
{
  const s = S3;
  const vign = 'radial-gradient(ellipse 70% 60% at 50% 50%,transparent 40%,#000 100%)';
  $('div', 'abs', s.bg, { inset: 0, background: 'radial-gradient(circle,rgba(80,10,0,.55) 0 3.6px,transparent 4.2px) 0 0/15px 15px', WebkitMaskImage: vign, maskImage: vign });
  const n01 = AD.text(s.cam, '01', { x: 560, y: 1000, w: 1400, h: 1300, cls: 'anton', style: { fontSize: '1250px', color: '#b3230f', textAlign: 'center', whiteSpace: 'nowrap' } });
  n01.dataset.bleed = '1';
  const sheet = card(s.cam, { x: 540, y: 1040, w: 980, h: 1180, bg: TX.paper, seed: 901, jit: 1.5, step: 1.8 });
  AD.newsText(sheet.face, { x: 490, y: 590, w: 900, h: 1100, rot: 0, op: .09, size: 20, cols: 3, copy: COPY });
  const tA = tape(s.cam, 170, 470, 240, 60, 911), tB = tape(s.cam, 920, 1600, 260, 60, 912);
  const lab = grp(s.cam, 540, 560, 600, 104);
  const lt1 = tape(lab, 300, 52, 600, 104, 913, 'rgba(236,226,190,.95)');
  const lbt = typer($('div', 'abs tw', lt1, { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '70px', color: INK }), 'We called it');
  // the hero: every panel flies in from off-frame on twos, sticker border first
  const shoe = AD.makeShoe(s.cam, 520, 990, 940, true);
  const order = ['sticker', 'out', 'mid', 'heel', 'quarter', 'vamp', 'toe', 'tongue', 'eyestay', 'laces', 'tab', 'patch'];
  const r = rng(333);
  const parts = order.map((k, i) => ({ k, st: .22 + i * .08, dx: (r() - .5) * 1500, dy: (r() < .5 ? -1 : 1) * (700 + r() * 500), dr: (r() - .5) * 220 }));
  parts.forEach(o => kick(5.3 + o.st + .34, o.k === 'sticker' ? 0 : 2.5));
  const stamp = AD.stamp(s.cam, 'OFFCUT 01', { x: 530, y: 1300, w: 740, h: 185, color: INK, size: 130 });
  stamp.style.padding = '10px 30px 4px';
  kick(5.3 + 2.42, 16);
  s.render = (t, lt) => {
    const tq = q12(lt);
    parts.forEach(o => {
      const p = clamp((tq - o.st) / .34), e = E.out5(p), n = shoe.parts[o.k];
      n.style.transform = `translate(${(o.dx * (1 - e)).toFixed(1)}px,${(o.dy * (1 - e)).toFixed(1)}px) rotate(${(o.dr * (1 - e) + (p < 1 ? boil(o.st * 100, lt, 3) : 0)).toFixed(2)}deg) scale(${lerp(1.3, 1, e).toFixed(3)})`;
      n.style.opacity = p > 0 ? 1 : 0;
    });
    const bob = lt > 1.45 ? Math.sin((lt - 1.45) * 2.4) * 7 : 0;
    tf(shoe, 0, bob, -6 + boil(5, lt, .35));
    shoe.notes.forEach((n, i) => { const st = 1.5 + i * .11; strokeReveal(n.pa, prog(lt, st, .14, 'out3')); n.t.style.opacity = tq >= st + .08 ? 1 : 0 });
    tf(sheet, 0, 0, -3);
    tf(n01, kf(lt, [[0, 60], [3.25, -60]]), 0, 0, kf(lt, [[0, 1.05], [3.25, 1]]));
    tf(tA, 0, 0, -24); tf(tB, 0, 0, 18);
    const lp = clamp((tq - 1.78) / .1);
    tf(lab, 0, 0, -2, lerp(1.5, 1, lp), lp > 0 ? 1 : 0);
    typeTo(lbt, (lt - 1.86) / .03);
    const sp = prog(lt, 2.3, .12, 'in3');
    tf(stamp, 0, 0, -8 + (sp < 1 ? (1 - sp) * -10 : 0), lerp(2.8, 1, sp) + (lt > 2.42 ? .04 * Math.exp(-(lt - 2.42) * 14) : 0), sp > 0 ? .92 : 0);
    // whip-pan in (continues scene 2's whip-out), then a punch-in on the stamp
    const whipIn = 1 - prog(lt, 0, .16, 'out3');
    const punch = lt > 2.42 ? .045 * Math.exp(-(lt - 2.42) * 7) : 0;
    tf(s.cam, 1500 * whipIn, 0, kf(lt, [[0, 1], [3.25, -1.2]]), kf(lt, [[.16, 1], [3.25, 1.1]]) + punch);
    s.cam.style.filter = whipIn > .01 ? `blur(${(whipIn * 22).toFixed(1)}px)` : 'none';
  };
}

/* ===== SCENE 4 · proof cuts, four x 0.75s (8.55 - 11.55) ===== */
const S4 = AD.scene(8.55, 11.55, TX.paper);
{
  const s = S4, sub = [];
  // each cut is a full-frame container with its own background, bleeding past the camera punch
  const mkSub = bg => { const d = $('div', 'abs', s.cam, { inset: '-60px' }); $('div', 'abs', d, { inset: 0, background: bg }); sub.push(d); return $('div', 'abs', d, { left: '60px', top: '60px', width: W + 'px', height: H + 'px' }) };

  // a · 83%
  const A = mkSub(TX.paper);
  AD.newsText(A, { x: 540, y: 960, w: 1160, h: 2100, rot: 3, op: .14, size: 22, copy: COPY });
  const num = AD.halftoneText(A, '83%', { x: 500, y: 820, w: 1000, h: 640, size: 390, offset: [22, 20] });
  const capA = grp(A, 540, 1330, 900, 270);
  const ca = card(capA, { x: 450, y: 135, w: 900, h: 270, bg: TX.ink, seed: 1201, jit: 2, edges: 'tctc' });
  $('div', 'pfi', ca.face, { fontSize: '84px', color: PAPER, textAlign: 'center' }).innerHTML = 'of every pair is<br>rescued material.';

  // b · 0 new leather
  const B = mkSub(TX.ink);
  const zero = AD.text(B, '0', { x: 540, y: 740, w: 1000, h: 1000, cls: 'anton', style: { fontSize: '1000px', color: PAPER, textAlign: 'center' } });
  zero.dataset.bleed = '1';   // the line box is taller than the frame; the glyph itself sits well inside
  const ring = AD.markerPath(B, 'M560 250 C250 220 170 620 220 920 C270 1210 760 1280 880 960 C990 660 870 280 520 280 C460 282 420 300 400 320', { width: 26 });
  const capB = AD.text(B, 'new leather.', { x: 540, y: 1330, w: 1000, h: 140, cls: 'pfi', style: { fontSize: '124px', color: PAPER, textAlign: 'center' } });
  const twB = typer($('div', 'abs tw', B, { fontSize: '44px', color: 'rgba(236,228,211,.75)', textAlign: 'center' }), 'not one hide. not one.');
  place(twB, 540, 1450, 1000, 60);

  // c · no two pairs alike: the panels reshuffle materials every 0.1s
  const Cc = mkSub(TX.kraft);
  const capC = $('div', 'abs pfi', Cc, { fontSize: '128px', color: INK, textAlign: 'left' });
  capC.innerHTML = 'No two pairs<br>are alike.'; place(capC, 540, 470, 940, 300);
  const shoeC = AD.makeShoe(Cc, 540, 1050, 1060);
  const cr = rng(91), combos = [];
  for (let i = 0; i < 12; i++) combos.push([...AD.SHOE_PATS].sort(() => cr() - .5));
  const tagC = card(Cc, { x: 720, y: 1430, w: 420, h: 90, bg: TX.paper, seed: 1301, rim: null, edges: 'cccc', sh: 'sh-lite' });
  const tagCt = $('div', 'tw', tagC.face, { fontSize: '38px', color: INK });

  // d · 2.7x macro pan across the shoe
  const Dd = mkSub(TX.red);
  const shoeD = AD.makeShoe(Dd, 540, 900, 1000);
  const capD = grp(Dd, 520, 1390, 820, 190);
  const cd = card(capD, { x: 410, y: 95, w: 820, h: 190, bg: TX.ink, seed: 1401, jit: 2, edges: 'ctct' });
  $('div', 'pfi', cd.face, { fontSize: '80px', color: PAPER, whiteSpace: 'nowrap' }).textContent = 'Hand-cut in Porto.';

  const cuts = [0, .75, 1.5, 2.25, 3];
  [.75, 1.5, 2.25].forEach(c => kick(8.55 + c, 9)); kick(8.55 + .02, 7);
  s.render = (t, lt) => {
    let k = 0; while (k < 3 && lt >= cuts[k + 1]) k++;
    sub.forEach((d, i) => d.style.display = i === k ? 'block' : 'none');
    const ls = lt - cuts[k];
    if (k === 0) {
      tf(num.g, 0, 0, -2, lerp(1.3, 1, prog(ls, 0, .4, 'out5')) + ls * .04);
      const c = clamp((q12(ls) - .17) / .17);
      tf(capA, lerp(-1200, 0, E.out5(c)), 0, -3 + boil(3, ls, .6), 1, c > 0 ? 1 : 0);
    }
    if (k === 1) {
      tf(zero, 0, 0, 0, 1 + ls * .06);
      strokeReveal(ring, prog(ls, .05, .32, 'out3'));
      const c = clamp((q12(ls) - .12) / .1);
      tf(capB, 0, 0, -2, lerp(1.4, 1, c), c > 0 ? 1 : 0);
      typeTo(twB, (ls - .3) / .02);
    }
    if (k === 2) {
      const idx = Math.floor(ls / .1) % combos.length;
      AD.shoeSkin(shoeC, combos[idx]);
      tf(shoeC, boil(idx, idx, 8), boil(idx + 50, idx, 6), -4 + boil(idx + 9, idx, 2.5), 1 + ls * .05);
      tagCt.textContent = 'pair ' + String(1 + (idx * 37) % 412).padStart(3, '0') + ' / 412';
      tf(tagC, 0, 0, 5);
    }
    if (k === 3) {
      tf(shoeD, kf(ls, [[0, 520], [.75, 220]]), kf(ls, [[0, 330], [.75, 290]]), -3, 2.7);
      const c = clamp((q12(ls) - .15) / .1);
      tf(capD, 0, 0, -3, lerp(1.5, 1, c), c > 0 ? 1 : 0);
    }
    tf(s.cam, 0, 0, 0, 1 + .07 * Math.exp(-ls * 9));   // punch on every cut
  };
}

/* ===== SCENE 5 · brand end card (11.55 - 15) ===== */
const S5 = AD.scene(11.55, 15, `${AD.N},repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 3px,transparent 3px 14px),url(${AD.MOTTLE}),${P.kraft}`);
{
  const s = S5;
  const sheet = card(s.cam, { x: 540, y: 1000, w: 980, h: 1580, bg: TX.paper, seed: 1501, jit: 1.4, step: 1.8 });
  const tA = tape(s.cam, 540, 232, 300, 62, 1511);
  // chaos: ransom letters fly in ...
  // everything is centred on x 505 (the middle of the safe zone) and sized for the 1.08 push-out
  const ORD = [1, 4, 2, 0, 5, 3]; let size = 150;
  while (AD.ransomWidth('OFFCUT', size, 77, ORD) > 780) size -= 2;
  const R = AD.ransom(s.cam, 'OFFCUT', { cx: 505, cy: 600, size, seed: 77, order: ORD });
  const rr = rng(9);
  R.forEach(l => { l.dx = (rr() - .5) * 1600; l.dy = (rr() < .5 ? -1 : 1) * (900 + rr() * 400); l.dr = (rr() - .5) * 200 });
  // ... order: they snap into the clean misregistered logo at 0.85s
  const logo = AD.misregister(s.cam, 'OFFCUT', { x: 505, y: 600, w: 1000, h: 340, size: 270 });
  const shoe = AD.makeShoe(s.cam, 520, 960, 880);
  const tag = typer($('div', 'abs pfi', s.cam, { fontSize: '80px', color: INK, textAlign: 'center', whiteSpace: 'nowrap' }), 'Made from what’s left.');
  place(tag, 505, 1262, 1000, 100);
  const stamp = AD.stamp(s.cam, 'DROP 10.10', { x: 690, y: 1415, w: 460, h: 120, color: RED, size: 78 });
  const url = typer($('div', 'abs tw', s.cam, { fontSize: '42px', color: INK }), 'offcut.studio');
  place(url, 260, 1425, 380, 60);
  R.forEach(l => kick(11.55 + .1 + l.i * .06 + .3, 3));
  kick(11.55 + .85, 18); kick(11.55 + 1.28, 8); kick(11.55 + 2.28, 12);
  s.render = (t, lt) => {
    const tq = q12(lt), clean = lt >= .85;
    R.forEach(l => {
      const p = clamp((tq - (.1 + l.i * .06)) / .3), e = E.out5(p);
      tf(l.g, l.dx * (1 - e), l.dy * (1 - e), l.rot + l.dr * (1 - e) + boil(l.seed, lt, 1), 1, p > 0 && !clean ? 1 : 0);
    });
    tf(logo, 0, 0, -2, clean ? 1 + .05 * Math.exp(-(lt - .85) * 10) : 1, clean ? 1 : 0);
    const sp = clamp((tq - .95) / .33);
    tf(shoe, 0, lerp(-1500, 0, E.back(sp)), -7 + boil(4, lt, .4), 1, sp > 0 ? 1 : 0);
    typeTo(tag, (lt - 1.45) / .04);
    const st = prog(lt, 2.16, .12, 'in3');
    tf(stamp, 0, 0, 6, lerp(2.6, 1, st), st > 0 ? .9 : 0);
    typeTo(url, (lt - 2.2) / .025);
    tf(sheet, 0, 0, 1.5); tf(tA, 0, 0, -3);
    tf(s.cam, 0, kf(lt, [[0, -20], [3.45, 20]]), kf(lt, [[0, .6], [3.45, -.4]]), kf(lt, [[0, 1.08], [3.45, 1.0]]));
  };
}
