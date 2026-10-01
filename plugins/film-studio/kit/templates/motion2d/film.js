/* =====================================================================
   ONE PLACE — 2D motion UI explainer (starter film, 15 s, 9:16)
   Kinetic type sets up a problem, a circle wipe turns it, flat product
   UI proves it in three beats, and a lockup lands the name.
   Craft notes: a real type scale, masks instead of fades, springs for
   anything physical, expo curves for anything graphic, depth from
   shadow and lift, one colour for the brand, one for the idea.
   ===================================================================== */
const COPY = {
  problem: ['Too many', 'tabs?'],
  turn: 'One place to think.',
  captions: ['Ask anything', 'Get a plan', 'Share it'],
  user: 'Plan a tiny book launch',
  planTitle: 'Here\u2019s your plan',
  plan: ['Venue shortlist', 'Guest list', 'Invite draft'],
  friends: ['M', 'A', 'J'],
  name: 'Ember',
  tagline: 'One place to think.',
  cta: 'Coming soon'
};
const C = { blue: '#2231d8', deep: '#10198c', orange: '#ff7a2e', cream: '#fff4e6', yellow: '#ffd35c', ink: '#161a4a', paper: '#fff8ef', line: 'rgba(22,26,74,0.12)' };
const TABS = Array.from({ length: 11 }, (_, i) => ({ x: 120 + hash1(i + 1) * 760, y: 260 + hash1(i + 11) * 1250, r: (hash1(i + 21) - 0.5) * 0.7, w: 150 + hash1(i + 31) * 120, s: 0.6 + hash1(i + 41) * 0.8 }));

/* ---------- drawing helpers (design space: 1000 wide) ---------- */
function orb(c, x, y, r, glow = 1) {
  if (r <= 0.5) return;
  const h = c.createRadialGradient(x, y, 0, x, y, r * 3);
  h.addColorStop(0, `rgba(255,140,60,${0.45 * glow})`); h.addColorStop(1, 'rgba(255,140,60,0)');
  c.fillStyle = h; c.beginPath(); c.arc(x, y, r * 3, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
  g.addColorStop(0, '#fff1d6'); g.addColorStop(0.45, '#ffb15a'); g.addColorStop(1, C.orange);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
/** a word that rises through an invisible slot: the classic mask reveal. p: 0 hidden, 1 settled; out: 0..1 exit upward */
function slotText(c, text, x, y, size, p, { weight = 600, color = C.cream, align = 'center', out = 0, track = -0.02 } = {}) {
  if (p <= 0 || out >= 1) return;
  c.save();
  c.font = `${weight} ${size}px ${FONT}`; if ('letterSpacing' in c) c.letterSpacing = `${track * size}px`;
  c.textAlign = align; c.textBaseline = 'alphabetic';
  const w = c.measureText(text).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.beginPath(); c.rect(x0 - size, y - size * 0.95, w + size * 2, size * 1.25); c.clip();
  c.fillStyle = color; c.fillText(text, x, y + (1 - E.expo(p)) * size * 1.1 - E.inExpo(out) * size * 1.2);
  c.restore();
}
function shadowed(c, blur, dy, alpha, fn) { c.save(); c.shadowColor = `rgba(8,12,70,${alpha})`; c.shadowBlur = blur; c.shadowOffsetY = dy; fn(); c.restore(); }
function check(c, x, y, p) {
  c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fillStyle = p > 0 ? C.blue : 'rgba(34,49,216,0.12)'; c.fill();
  if (p <= 0) return;
  c.strokeStyle = C.cream; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  const pts = [[x - 9, y + 1], [x - 2, y + 8], [x + 10, y - 7]], L1 = Math.hypot(7, 7), L2 = Math.hypot(12, 15), d = E.out(p) * (L1 + L2);
  c.beginPath(); c.moveTo(...pts[0]);
  if (d <= L1) c.lineTo(pts[0][0] + 7 * (d / L1), pts[0][1] + 7 * (d / L1));
  else { c.lineTo(...pts[1]); const k = (d - L1) / L2; c.lineTo(pts[1][0] + 12 * k, pts[1][1] - 15 * k); }
  c.stroke();
}
function planCard(c, x, y, w, t) {
  const h = 330;
  rr(c, x, y, w, h, 34); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = C.line; c.lineWidth = 2; c.stroke();
  c.fillStyle = C.ink; c.font = `600 34px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(COPY.planTitle, x + 36, y + 58);
  COPY.plan.forEach((item, i) => {
    const ry = y + 128 + i * 70, a = sm(t, 6.55 + i * 0.3, 6.85 + i * 0.3, E.out);
    c.globalAlpha = 0.35 + 0.65 * a; check(c, x + 56, ry, sm(t, 6.8 + i * 0.3, 7.15 + i * 0.3));
    c.fillStyle = C.ink; c.font = `500 30px ${FONT}`; c.fillText(item, x + 96, ry + 1); c.globalAlpha = 1;
  });
}

function draw2d(c, S, Wpx, Hpx) {
  const t = S.t, k = Wpx / 1000, DH = Hpx / k, cx = 500;
  c.setTransform(k, 0, 0, k, 0, 0);
  // ground: a lit blue field, never flat
  const bg = c.createRadialGradient(260, 280, 0, 420, 700, DH * 1.1);
  bg.addColorStop(0, '#3342ea'); bg.addColorStop(0.55, C.blue); bg.addColorStop(1, C.deep);
  c.fillStyle = bg; c.fillRect(0, 0, 1000, DH);
  c.fillStyle = 'rgba(255,244,230,0.05)';
  for (let gy = -60; gy < DH + 60; gy += 64) for (let gx = 32; gx < 1000; gx += 64) { const yy = gy + ((t * 14) % 64); c.beginPath(); c.arc(gx, yy, 2, 0, Math.PI * 2); c.fill(); }

  const orbY = DH * 0.44;
  /* ---- beat 1: the problem (0 – 2.8) ---- */
  if (t < 3.0) {
    const suck = sm(t, 2.15, 2.75, E.inExpo);
    TABS.forEach((tb, i) => {
      const a = sm(t, 0.1 + i * 0.05, 0.5 + i * 0.05, E.out) * (1 - suck);
      if (a <= 0.01) return;
      const drift = Math.sin(t * tb.s + i) * 14, x = lerp(tb.x + drift, cx, suck), y = lerp(tb.y + Math.cos(t * tb.s * 0.8 + i) * 12, orbY, suck);
      c.save(); c.translate(x, y); c.rotate(tb.r * (1 - suck) + Math.sin(t * 0.7 + i) * 0.05); c.scale(1 - suck * 0.9, 1 - suck * 0.9);
      c.globalAlpha = a * 0.9;
      shadowed(c, 30, 14, 0.35, () => { rr(c, -tb.w / 2, -34, tb.w, 68, 18); c.fillStyle = 'rgba(255,244,230,0.16)'; c.fill(); });
      rr(c, -tb.w / 2 + 16, -6, tb.w * 0.5, 12, 6); c.fillStyle = 'rgba(255,244,230,0.45)'; c.fill();
      c.restore();
    });
    const r = 60 * spring(t, 0.25, 1.8, 0.45) * (1 + 0.25 * suck);
    orb(c, cx, orbY, r, 1);
    const out = sm(t, 2.1, 2.5);
    slotText(c, COPY.problem[0], cx, DH * 0.24, 132, sm(t, 0.6, 1.2), { out });
    slotText(c, COPY.problem[1], cx, DH * 0.24 + 150, 132, sm(t, 0.8, 1.4), { out, color: C.yellow });
  }
  /* ---- beat 2: the turn (2.7 – 4.8) ---- */
  if (t >= 2.7 && t < 5.0) {
    const R = lerp(78, Math.hypot(520, DH) * 1.05, sm(t, 2.75, 3.35, E.inOutExpo));
    orb(c, cx, orbY, R, sm(t, 2.75, 3.1) < 1 ? 1 : 0);
    c.fillStyle = C.orange; c.beginPath(); c.arc(cx, orbY, R, 0, Math.PI * 2); c.fill();
    const words = COPY.turn.split(' '), half = Math.ceil(words.length / 2);
    const out = sm(t, 4.2, 4.55);
    slotText(c, words.slice(0, half).join(' '), cx, DH * 0.42, 104, sm(t, 3.25, 3.8), { color: C.ink, out });
    slotText(c, words.slice(half).join(' '), cx, DH * 0.42 + 118, 104, sm(t, 3.4, 3.95), { color: C.ink, out });
    const wipe = sm(t, 4.3, 4.85, E.inOutExpo);
    if (wipe > 0) { c.fillStyle = C.blue; c.fillRect(0, DH - wipe * DH * 1.05, 1000, DH * 1.05); }
  }
  /* ---- beat 3: the proof (4.3 – 11.4) ---- */
  if (t >= 4.3 && t < 11.8) {
    const enter = spring(t, 4.35, 1.3, 0.62), exit = sm(t, 10.9, 11.6, E.inOutBack);
    const pw = 600, ph = 1120, px = cx - pw / 2, py = lerp(DH + 60, DH * 0.33, enter) + exit * (DH * 0.8);
    // captions above the phone
    COPY.captions.forEach((cap, i) => {
      const s0 = [4.9, 6.35, 8.45][i], s1 = [6.25, 8.35, 10.8][i];
      slotText(c, cap, cx, py - 70, 76, sm(t, s0, s0 + 0.5), { out: sm(t, s1, s1 + 0.3) });
    });
    shadowed(c, 90, 46, 0.5, () => { rr(c, px, py, pw, ph, 84); c.fillStyle = C.ink; c.fill(); });
    c.save(); rr(c, px + 16, py + 16, pw - 32, ph - 32, 70); c.clip();
    c.fillStyle = C.paper; c.fillRect(px, py, pw, ph);
    orb(c, px + 74, py + 92, 16, 0.6);
    c.fillStyle = C.ink; c.font = `600 32px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(COPY.name, px + 104, py + 93);
    c.fillStyle = C.line; c.fillRect(px + 16, py + 150, pw - 32, 2);
    // user message
    const ub = spring(t, 5.0, 2.0, 0.5);
    if (ub > 0) {
      c.font = `500 30px ${FONT}`; const tw = c.measureText(COPY.user).width, bw = tw + 60, bx = px + pw - 44 - bw, by = py + 200 + (1 - ub) * 40;
      c.globalAlpha = clamp(ub * 1.5); rr(c, bx, by, bw, 76, 38); c.fillStyle = C.blue; c.fill();
      c.fillStyle = C.cream; c.fillText(COPY.user, bx + 30, by + 39); c.globalAlpha = 1;
    }
    // typing dots
    if (t > 5.55 && t < 6.4) for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(22,26,74,${0.25 + 0.5 * Math.max(0, Math.sin(t * 9 - i * 0.8))})`; c.beginPath(); c.arc(px + 70 + i * 26, py + 330, 8, 0, Math.PI * 2); c.fill(); }
    // plan card (inside the phone until it lifts)
    const cardIn = spring(t, 6.3, 1.9, 0.55), lift = sm(t, 8.55, 9.2, E.inOutBack);
    if (cardIn > 0 && lift <= 0) { c.globalAlpha = clamp(cardIn * 1.4); planCard(c, px + 44, py + 300 + (1 - cardIn) * 50, pw - 88, t); c.globalAlpha = 1; }
    // input field
    rr(c, px + 44, py + ph - 150, pw - 88, 84, 42); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = C.line; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(22,26,74,0.45)'; c.font = `500 28px ${FONT}`; c.fillText('Ask anything', px + 84, py + ph - 107);
    c.restore();
    // share: the card lifts off the glass and fans out to three friends
    if (lift > 0) {
      const fan = sm(t, 9.1, 9.8, E.out), gone = sm(t, 10.8, 11.4, E.inExpo);
      const baseX = px + 44, baseY = py + 300, w = pw - 88;
      for (const i of [0, 2, 1]) {
        const dir = i - 1, rot = dir * 0.16 * fan, dx = dir * 250 * fan, dy = -150 * lift + Math.abs(dir) * 46 * fan - gone * 900;
        const sc = 1 + 0.06 * lift - 0.34 * fan;
        if (i !== 1 && fan <= 0) continue;
        c.save(); c.translate(baseX + w / 2 + dx, baseY + 165 + dy); c.rotate(rot); c.scale(sc, sc);
        shadowed(c, 36 + 30 * lift, 14 + 22 * lift, 0.28, () => { rr(c, -w / 2, -165, w, 330, 34); c.fillStyle = '#ffffff'; c.fill(); });
        planCard(c, -w / 2, -165, w, t);
        const av = spring(t, 9.5 + i * 0.12, 2.2, 0.45);
        if (av > 0) {
          c.beginPath(); c.arc(w / 2 - 20, -150, 34 * av, 0, Math.PI * 2); c.fillStyle = [C.yellow, C.orange, C.blue][i]; c.fill();
          c.fillStyle = i === 2 ? C.cream : C.ink; c.font = `600 ${30 * av}px ${FONT}`; c.textAlign = 'center'; c.fillText(COPY.friends[i], w / 2 - 20, -149);
        }
        c.restore();
      }
    }
  }
  /* ---- beat 4: the lockup (11.3 – 15) ---- */
  if (t >= 11.3) {
    const oy = DH * 0.4, r = 64 * spring(t, 11.4, 1.8, 0.45);
    orb(c, cx, oy, r, 1);
    const wm = sm(t, 11.8, 12.4);
    slotText(c, COPY.name, cx, oy + 230, 170, wm, { track: -0.035 });
    // a light sweep across the wordmark
    const sw = lerp(-300, 1300, sm(t, 12.6, 13.6, E.inOut));
    if (wm >= 1 && sw > -300 && sw < 1300) {
      c.save(); c.font = `600 170px ${FONT}`; if ('letterSpacing' in c) c.letterSpacing = `${-0.035 * 170}px`; c.textAlign = 'center';
      const band = c.createLinearGradient(sw - 120, 0, sw + 120, 0);
      band.addColorStop(0, 'rgba(255,211,92,0)'); band.addColorStop(0.5, 'rgba(255,211,92,1)'); band.addColorStop(1, 'rgba(255,211,92,0)');
      c.fillStyle = band; c.fillText(COPY.name, cx, oy + 230); c.restore();
    }
    slotText(c, COPY.tagline, cx, oy + 318, 46, sm(t, 12.5, 13.0), { weight: 500, track: -0.01 });
    slotText(c, COPY.cta, cx, DH * 0.9, 30, sm(t, 13.4, 13.9), { weight: 500, color: 'rgba(255,244,230,0.7)', track: 0.01 });
  }
}

const FILM = {
  title: 'Ember, motion',
  total: 15,
  format: '9:16',
  look: 'motion2d',
  shots: [
    { name: 'Problem: kinetic type', start: 0, end: 2.75 }, { name: 'Turn: circle wipe', start: 2.75, end: 4.4 },
    { name: 'Ask anything', start: 4.4, end: 6.3 }, { name: 'Get a plan', start: 6.3, end: 8.45 },
    { name: 'Share it', start: 8.45, end: 11.2 }, { name: 'Lockup', start: 11.2, end: 15 }
  ],
  state(t, S) { S.fade = 1 - sm(t, 14.55, 15); },
  draw2d,

  score(sc, at, ok, N) {
    const hit = (e, f = 60) => { if (ok(e)) { sc.kick(at(e), 0.45); sc.bass(at(e), f, { dur: 0.5, peak: 0.16 }); } };
    if (ok(0.25)) sc.pop(at(0.25), { f: 520, peak: 0.16 });
    TABS.forEach((_, i) => { const e = 0.1 + i * 0.05; if (ok(e) && i % 2 === 0) sc.snap(at(e), { peak: 0.05, pan: (hash1(i) - 0.5) * 1.2, f: 3000 + i * 200 }); });
    [0.6, 0.8].forEach((e, i) => { if (ok(e)) { sc.snap(at(e), { peak: 0.1 }); sc.pluck(at(e), [N.E4, N.G4][i], { peak: 0.08 }); } });
    if (ok(2.15)) sc.riser(at(2.15), at(2.74), 0.12);
    hit(2.75, N.C3);
    if (ok(2.75)) sc.whoosh(at(2.72), 0.7, 200, 2600, 0.12, 0, 0);
    [N.C5, N.E5, N.G5].forEach((f, i) => { const e = 3.25 + i * 0.12; if (ok(e)) sc.pluck(at(e), f, { peak: 0.08 }); });
    if (ok(4.3)) sc.whoosh(at(4.3), 0.6, 300, 1800, 0.1, 0, 0);
    const beat = 60 / 116;
    for (let e = 4.9, i = 0; e < 10.9; e += beat, i++) {
      if (!ok(e)) continue;
      if (i % 2 === 0) sc.kick(at(e), 0.26);
      sc.shaker(at(e + beat / 2), 0.028, i % 2 ? 0.25 : -0.25);
      sc.bass(at(e), [N.C3, N.A2, N.F3 / 2 * 2, N.G3][(i >> 1) % 4], { dur: beat * 0.9, peak: 0.11 });
    }
    if (ok(5.0)) sc.pop(at(5.0), { f: 780, peak: 0.14 });
    if (ok(6.3)) sc.pop(at(6.3), { f: 620, peak: 0.14 });
    [0, 1, 2].forEach((i) => { const e = 6.8 + i * 0.3; if (ok(e)) { sc.snap(at(e), { peak: 0.07, f: 5200 }); sc.pluck(at(e), [N.G5, N.A5, N.C6][i], { peak: 0.06 }); } });
    if (ok(8.55)) sc.whoosh(at(8.5), 0.7, 500, 3000, 0.09, 0, 0);
    [0, 1, 2].forEach((i) => { const e = 9.5 + i * 0.12; if (ok(e)) sc.pop(at(e), { f: 900 + i * 160, peak: 0.12, pan: (i - 1) * 0.5 }); });
    if (ok(10.9)) sc.whoosh(at(10.9), 0.6, 2400, 400, 0.08, 0, 0);
    hit(11.4, N.C3);
    if (ok(11.4)) { [N.C4, N.G4, N.C5, N.E5, N.G5].forEach((f, i) => sc.pluck(at(11.4 + i * 0.06), f, { peak: 0.07, dur: 2.4 })); sc.bell(at(12.6), N.C6, 0.05, 3.2, 0, 0.6, 2, 1); }
  }
};
