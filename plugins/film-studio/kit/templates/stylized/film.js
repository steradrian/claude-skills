/* =====================================================================
   POCKET — stylized 3D promo (starter film, 16 s, 9:16)
   A clay phone drops into a soft studio, lands with squash and stretch,
   and its ideas pop out as 3D bubbles. Playful, tactile, warm.
   Craft notes: soft shadows from one big key, colour does the talking,
   every move is a spring, and nothing moves without a reason.
   ===================================================================== */
const COPY = {
  name: 'Ember',
  tagline: 'Your ideas, sorted.',
  cta: 'Coming soon',
  greeting: 'Hi! What\u2019s the plan?',
  clock: '10:08',
  bubbles: ['Plan my week', 'Find a jazz bar', 'Draft the invite']
};
const PAL = { cyc: 0xaeb3f0, body: 0x3552e0, accent: 0xffd35c, dark: 0x14172b, ink: '#171a38', bubble: [0xffffff, 0xffd35c, 0x8fa2ff] };
const CHUNKY = { PW: 0.715, PH: 1.47, PD: 0.12, PR: 0.2, BT: 0.034, BS: 0.03 };
Object.assign(CHUNKY, { GW: CHUNKY.PW - 2 * CHUNKY.BS, GH: CHUNKY.PH - 2 * CHUNKY.BS, GR: CHUNKY.PR - CHUNKY.BS * 0.9, Z_GLASS: CHUNKY.PD / 2 + 0.0032 });

let dev = null, scr = null, bubbles = [];
const LAND = 1.2;                 // the phone hits the floor
const POPS = [3.6, 4.35, 5.1];    // bubbles leave the screen
const HOP = 8.2;                  // the little spin hop
const RETURN = 10.6;              // bubbles fly home
const BUBBLE_HOME = [[-0.3, 1.64, 0.5], [0.28, 1.22, 0.64], [-0.26, 0.8, 0.78]];

function bubbleTexture(text, bg) {
  const c = makeCanvas(1024, 330), g = c.getContext('2d');
  g.fillStyle = '#' + bg.toString(16).padStart(6, '0'); g.fillRect(0, 0, 1024, 330);
  g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 118; g.font = `600 ${size}px ${FONT}`;
  while (g.measureText(text).width > 860) { size -= 4; g.font = `600 ${size}px ${FONT}`; }
  g.fillText(text, 512, 172);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t;
}

function drawScreen(c, s, time, DW, DH) {
  const g = c.createLinearGradient(0, 0, 0, DH);
  g.addColorStop(0, '#2c3fd1'); g.addColorStop(1, '#6b4fe3');
  c.fillStyle = g; c.fillRect(0, 0, DW, DH);
  if (s.on <= 0) return;
  c.globalAlpha = s.on;
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = `600 40px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  c.fillText(COPY.clock, 96, 84);
  rr(c, 842, 70, 60, 28, 10); c.fill();
  // the orb: a warm, soft sun
  const r = 150 * s.orb * (1 + 0.03 * Math.sin(time * 3)), ox = 500, oy = 900 - s.lift * 120;
  if (r > 1) {
    const halo = c.createRadialGradient(ox, oy, 0, ox, oy, r * 2.4);
    halo.addColorStop(0, 'rgba(255,200,90,0.55)'); halo.addColorStop(1, 'rgba(255,200,90,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(ox, oy, r * 2.4, 0, Math.PI * 2); c.fill();
    const core = c.createRadialGradient(ox - r * 0.3, oy - r * 0.3, r * 0.1, ox, oy, r);
    core.addColorStop(0, '#fff6d8'); core.addColorStop(0.5, '#ffd35c'); core.addColorStop(1, '#ff9a3c');
    c.fillStyle = core; c.beginPath(); c.arc(ox, oy, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = s.on * s.hello; c.fillStyle = '#ffffff'; c.textAlign = 'center';
  c.font = `600 70px ${FONT}`; c.fillText(COPY.greeting, 500, 1260 - s.lift * 120);
  c.globalAlpha = s.on * 0.9;
  rr(c, 80, DH - 250, 840, 120, 60); c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `500 42px ${FONT}`; c.textAlign = 'left'; c.fillText('Ask me anything', 140, DH - 190);
  c.globalAlpha = 1;
}

const FILM = {
  title: 'Ember, stylized',
  total: 16,
  format: '9:16',
  look: 'stylized',
  background: 0xaeb3f0,
  shots: [
    { name: 'Empty studio, falling shadow', start: 0, end: LAND }, { name: 'Landing, squash and stretch', start: LAND, end: 2.2 },
    { name: 'Screen wakes', start: 2.2, end: 3.5 }, { name: 'Bubbles pop out', start: 3.5, end: 6.2 },
    { name: 'Orbit and hop', start: 6.2, end: RETURN }, { name: 'Bubbles return', start: RETURN, end: 12 }, { name: 'Title', start: 12, end: 16 }
  ],

  setup() {
    useEnvironment('soft');
    materialsClay({ body: PAL.body, accent: PAL.accent, dark: PAL.dark });
    addCyc({ color: PAL.cyc, back: -3.2 });
    addSoftKey({ position: [-2.4, 4.8, 3.2], target: [0, 0.8, 0], intensity: 2.3 });
    const fill = new THREE.DirectionalLight(0xc9d2ff, 0.55); fill.position.set(3, 2, 2); scene.add(fill);
    dev = buildPhone(MAT, { dims: CHUNKY, details: false });
    castShadows(dev.group, true, false);
    scr = createScreen(dev, { draw: drawScreen });
    const side = clayMaterial(0xffffff, 0.55);
    bubbles = COPY.bubbles.map((text, i) => {
      const face = clayMaterial(0xffffff, 0.5); face.map = bubbleTexture(text, PAL.bubble[i]);
      const edge = i === 0 ? side : clayMaterial(PAL.bubble[i], 0.55);
      const m = new THREE.Mesh(roundedSlab(0.56, 0.18, 0.075, 0.09), [face, edge]);
      castShadows(m, true, false); m.visible = false; scene.add(m);
      return m;
    });
  },

  state(t, S) {
    // camera: keyframed, every segment eased; one continuous move, no cuts
    const cam = track([[0, [0, 1.55, 6.6]], [2.6, [0.25, 1.25, 5.6]], [6.2, [0.55, 1.35, 5.4]], [10.4, [-0.85, 1.55, 5.3], E.sine], [12.6, [0, 1.62, 6.0]], [16, [0, 1.66, 6.25], E.linear]], t);
    const tgt = track([[0, [0, 1.1, 0]], [2.6, [0, 1.0, 0]], [10.4, [0, 1.08, 0]], [12.6, [0, 1.42, 0]]], t);
    S.camPos = cam; S.camTarget = tgt; S.fov = 28;
    S.focusPoint = [0, 0.95, 0.1]; S.aperture = 1.1; S.maxCoC = 0.006;
    S.env = 0.95; S.exposure = 1.0;

    // phone: gravity drop, squash on impact, springy recovery, a hop with a spin later
    let y = 0, sx = 1, sy = 1, spin = 0, tilt = 0;
    if (t < LAND) { const k = seg(t, 0, LAND); y = lerp(3.4, 0, k * k); sy = 1 + 0.06 * k; sx = 1 - 0.03 * k; }
    else {
      const sq = 1 - spring(t, LAND, 3.1, 0.32);
      sy = 1 - 0.16 * sq; sx = 1 + 0.09 * sq;
      tilt = 0.06 * Math.sin((t - LAND) * 9) * Math.exp(-(t - LAND) * 3.5);
    }
    if (t > HOP && t < HOP + 1.1) {
      const k = seg(t, HOP, HOP + 0.8);
      y = 0.32 * Math.sin(Math.PI * k); spin = E.inOut(k) * Math.PI * 2;
      if (t < HOP + 0.12) { const a = seg(t, HOP, HOP + 0.12); sy = 1 - 0.1 * Math.sin(Math.PI * a); sx = 1 + 0.05 * Math.sin(Math.PI * a); }
      if (t > HOP + 0.8) { const sq = 1 - spring(t, HOP + 0.8, 3.4, 0.35); sy = 1 - 0.12 * sq; sx = 1 + 0.07 * sq; }
    }
    const yaw = track([[0, 0.25], [2.2, 0.18], [6.2, -0.12], [10.4, 0.3], [12.6, 0]], t) + spin;
    S.phone = { y, sx, sy, yaw, tilt };

    // screen
    const on = sm(t, 2.2, 2.6, E.out);
    S.screen = { on: +on.toFixed(3), orb: +spring(t, 2.35, 2.2, 0.45).toFixed(3), hello: +sm(t, 2.8, 3.3).toFixed(3), lift: +sm(t, 3.4, 4.0).toFixed(3), time: +t.toFixed(2), animated: true };
    S.screenI = 0.95 * on;

    // bubbles: spring out of the screen to their homes, float, then fly back in
    S.bubbles = POPS.map((p0, i) => {
      if (t < p0) return null;
      const back = sm(t, RETURN + i * 0.12, RETURN + 0.55 + i * 0.12, E.inOutBack);
      if (back >= 1) return null;
      const k = spring(t, p0, 1.7, 0.42), home = BUBBLE_HOME[i];
      const from = [0, 1.02, 0.12];
      const pos = mix3(from, home, k * (1 - back)).map((v, j) => (j === 1 ? v + 0.025 * Math.sin(t * 1.7 + i * 2) * (1 - back) : v));
      const sc = clamp(spring(t, p0, 2.4, 0.38), 0, 1.3) * (1 - back);
      return { pos, sc, rz: (i % 2 ? -0.1 : 0.12) * k + 0.03 * Math.sin(t * 1.3 + i), ry: 0.25 * (i % 2 ? -1 : 1) * (1 - k) };
    });

    // title
    if (t > 12.2) {
      const w = COPY.name.split(' ').map((_, i) => spring(t, 12.4 + i * 0.1, 1.9, 0.5));
      S.lines.push({ text: COPY.name, y: 0.18, size: 0.08, weight: 600, words: w.map((v) => clamp(v)), rise: 0.02, color: PAL.ink, track: -0.03 });
      const tw = COPY.tagline.split(' ').map((_, i) => sm(t, 13.0 + i * 0.08, 13.6 + i * 0.08, E.out));
      S.lines.push({ text: COPY.tagline, y: 0.255, size: 0.03, weight: 500, words: tw, rise: 0.008, color: PAL.ink, track: -0.01 });
      S.lines.push({ text: COPY.cta, y: 0.305, size: 0.02, weight: 500, alpha: sm(t, 14.0, 14.6), color: 'rgba(23,26,56,0.7)', track: 0.01 });
    }
    S.fade = 1 - sm(t, 15.5, 16);
  },

  apply(S) {
    const g = dev.group, p = S.phone;
    g.position.set(0, CHUNKY.PH / 2 * p.sy + p.y, 0);
    g.scale.set(p.sx, p.sy, p.sx);
    g.rotation.set(0, p.yaw, p.tilt, 'YXZ');
    g.updateMatrixWorld(true);
    MAT.screen.emissiveIntensity = S.screenI;
    scr.update(S.screen);
    bubbles.forEach((m, i) => {
      const b = S.bubbles[i];
      m.visible = !!b && b.sc > 0.01;
      if (!m.visible) return;
      m.position.set(...b.pos); m.scale.setScalar(b.sc); m.rotation.set(0, b.ry, b.rz);
    });
  },

  score(sc, at, ok, N) {
    const beat = 60 / 108;
    if (ok(0)) sc.whoosh(at(0.3), 0.9, 300, 1800, 0.06, 0, 0);
    if (ok(LAND)) { sc.boing(at(LAND), { f: 150, peak: 0.2 }); sc.kick(at(LAND), 0.5); sc.pluck(at(LAND + 0.02), N.C4, { peak: 0.1 }); sc.pluck(at(LAND + 0.02), N.G4, { peak: 0.08 }); }
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => { const e = 2.3 + i * 0.09; if (ok(e)) sc.pluck(at(e), f, { peak: 0.07, pan: (i - 1.5) * 0.3 }); });
    POPS.forEach((e, i) => { if (ok(e)) { sc.pop(at(e), { f: 700 + i * 180, peak: 0.18, pan: [-0.4, 0.4, -0.2][i] }); sc.pluck(at(e + 0.03), [N.E5, N.G5, N.A5][i], { peak: 0.08 }); } });
    // a light groove under the middle section
    const bassline = [N.C3, N.C3, N.A2 * 2 / 2, N.F3, N.G3, N.G3, N.E3, N.G3];
    for (let e = 3.6, i = 0; e < RETURN; e += beat, i++) {
      if (!ok(e)) continue;
      if (i % 2 === 0) sc.kick(at(e), 0.28);
      sc.shaker(at(e + beat / 2), 0.03, i % 2 ? 0.3 : -0.3);
      sc.bass(at(e), bassline[i % bassline.length], { dur: beat * 0.9, peak: 0.14 });
      if (i % 4 === 2) sc.pluck(at(e), [N.E5, N.G5, N.A5, N.C6][(i / 4 | 0) % 4], { peak: 0.05, pan: 0.3 });
    }
    if (ok(HOP)) { sc.whoosh(at(HOP), 0.7, 400, 2600, 0.08, -0.3, 0.3); sc.boing(at(HOP + 0.8), { f: 200, peak: 0.16 }); }
    [0, 1, 2].forEach((i) => { const e = RETURN + 0.4 + i * 0.12; if (ok(e)) sc.pop(at(e), { f: 1200 - i * 150, peak: 0.12 }); });
    if (ok(12.4)) { [N.C4, N.E4, N.G4, N.C5, N.E5].forEach((f, i) => sc.pluck(at(12.4 + i * 0.05), f, { peak: 0.08, dur: 2.2 })); sc.bass(at(12.4), N.C3, { dur: 2.5, peak: 0.2 }); sc.bell(at(12.4), N.C6, 0.04, 3, 0, 0.6, 2, 1); }
  }
};
