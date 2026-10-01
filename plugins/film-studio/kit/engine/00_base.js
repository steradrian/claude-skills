/* =====================================================================
   FILM STUDIO ENGINE — base
   Pure helpers only. Nothing here touches WebGL, so films can use these
   at the top level of their own files.
   ===================================================================== */
const P = new URLSearchParams(location.search);
const CAPTURE = P.has('capture');
const STILL = P.has('still') || CAPTURE;
const T_START = Math.max(0, parseFloat(P.get('t')) || 0);
let FONT = '"Instrument Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  quint: (x) => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
  expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  outBack: (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  inOutBack: (x) => { const c = 1.70158 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2 : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2; }
};
/** eased 0..1 progress of t through [a, b] */
const sm = (t, a, b, f = E.inOut) => f(seg(t, a, b));
/** a pulse that rises fast and decays: heartbeats, flashes, impacts */
const bump = (t, t0, rise = 30, decay = 3.2) => (t < t0 ? 0 : (1 - Math.exp(-(t - t0) * rise)) * Math.exp(-(t - t0) * decay));
/** damped spring from 0 to 1 starting at t0: overshoot and settle. freq in Hz, damp 0..1 */
const spring = (t, t0, freq = 2.2, damp = 0.42) => {
  if (t <= t0) return 0;
  const x = t - t0, w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * x) * (Math.cos(wd * x) + ((damp * w) / wd) * Math.sin(wd * x));
};
/** deterministic pseudo-random stream (textures, jitter). Never use Math.random for anything visible. */
const rand = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const hash1 = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const mixV = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], t)) : lerp(a, b, t));
/** keyframes: track([[0, 0], [1.2, 1, E.outBack], [3, [1,2,3]]], t). Ease on a key shapes the segment arriving at it. */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1, ease] = keys[i + 1];
    if (t < t1) return mixV(v0, v1, (ease || E.inOut)((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}

/* ---------- 3D pose helpers (THREE is loaded before the engine) ---------- */
const V3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));
const vlerp = (a, b, t) => V3(a).lerp(V3(b), t);
const _pe = new THREE.Euler(), _pq = new THREE.Quaternion(), _pone = new THREE.Vector3(1, 1, 1);
/** world matrix for an object at pos with yaw/pitch/roll, without touching the object */
function poseMatrix(pos, yaw = 0, pitch = 0, roll = 0, scale = null) {
  _pe.set(pitch, yaw, roll, 'YXZ'); _pq.setFromEuler(_pe);
  return new THREE.Matrix4().compose(V3(pos), _pq, scale ? V3(scale) : _pone);
}
/** transform a point from an object's local space into world space */
const W3 = (m, p) => V3(p).applyMatrix4(m);

/* ---------- canvas utilities ---------- */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function wrapWords(c, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

const frameEl = document.getElementById('frame');
const canvas = document.getElementById('c');
function showError(msg) {
  const el = document.getElementById('err');
  if (msg) el.textContent = msg;
  el.classList.add('on');
  document.getElementById('startOverlay').classList.add('hidden');
}
