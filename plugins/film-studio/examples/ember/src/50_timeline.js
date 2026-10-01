
/* =====================================================================
   TIMELINE — the shot list, expressed as a pure function of time
   ===================================================================== */
const V3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1);
function phoneMatrix(pos, yaw, pitch = 0, roll = 0) {
  _e.set(pitch, yaw, roll, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(V3(pos), _q, _one);
}
const W3 = (m, p) => V3(p).applyMatrix4(m);
const vlerp = (a, b, t) => a.clone().lerp(b, t);
const offK = (t, t0) => (t < t0 ? 1 : Math.exp(-(t - t0) * 22));

const LENS = [0.205, 0.608, -PD / 2 + 0.0006 - 0.011 - 0.0036];
const Q_LEN = COPY.question.length;

function phonePosAt(t) { return [0, 0.95 + 0.006 * Math.sin(t * 0.8), 0]; }
function phoneYawAt(t) {
  if (t < 25.5) return lerp(2.65, 0.3, E.inOut(seg(t, 17.2, 25.5)));
  if (t < 30.5) return lerp(0.3, 0.12, E.sine(seg(t, 25.5, 30.5)));
  if (t < 33.0) return lerp(0.12, 0.0, E.inOut(seg(t, 30.5, 33.0)));
  if (t < 42.5) return 0;
  return lerp(0, -0.34, E.inOut(seg(t, 42.5, 47.8))) - 0.06 * seg(t, 47.8, 52);
}
function revealCam(t) {
  const p = E.sine(seg(t, 17.2, 30.5));
  return { pos: vlerp(V3([0.42, 0.52, 5.0]), V3([0.12, 0.74, 3.85]), p), tgt: vlerp(V3([0, 0.82, 0]), V3([0, 0.86, 0]), p) };
}
function chatCam(t, m) {
  const y = lerp(-0.26, 0.154, E.inOut(seg(t, 36.3, 37.4)));
  const d = lerp(2.3, 2.2, seg(t, 33, 42.5));
  const x = 0.016 * Math.sin((t - 33) * 0.5);
  return { pos: W3(m, [x, y + 0.01, Z_GLASS + d]), tgt: W3(m, [x * 0.3, y, Z_GLASS]) };
}
const END_POS = V3([0.26, 1.12, 5.3]), END_TGT = V3([0, 1.34, 0]);

function computeState(t) {
  const S = {
    t, phoneVisible: true, phonePos: phonePosAt(t), yaw: 0, pitch: 0, roll: 0,
    camPos: V3([0, 0.95, 4]), camTarget: V3([0, 0.95, 0]), fov: 30,
    focusPoint: null, focus: 4, aperture: 0, maxCoC: 0,
    lights: {}, env: 0, floor: false, shadow: 0, reflStrength: 0.55,
    screenI: 0, screenLight: 0, ui: { mode: 'off', time: t },
    lines: [], titleA: 0, sweep: -1,
    exposure: 1, fade: 1, zoom: 0, bloom: 0.4, bloomThreshold: 0.9, grain: 0.05, vignette: 0.45, ca: 0.012
  };

  if (t < 13.0) {
    // ---------- ACT ONE: glimpses in the dark ----------
    const m = phoneMatrix(S.phonePos, 0);
    S.phonePos = [0, 0.95, 0];
    if (t < 4.6) {
      const p = seg(t, 0, 4.6);
      S.camPos = W3(m, mix3([0.52, 0.93, 0.3], [0.47, 0.885, 0.255], E.sine(p)));
      S.camTarget = W3(m, [0.3, 0.69, 0.035]); S.fov = 26;
      S.focusPoint = S.camTarget; S.aperture = 6; S.maxCoC = 0.02;
      const sx = lerp(-0.7, 1.7, E.inOut(seg(t, 0.6, 4.5)));
      S.lights.strip = { i: 26 * sm(t, 0.5, 1.6), pos: W3(m, [sx, 1.25, 0.95]), look: W3(m, [0.3, 0.68, 0]), w: 0.035, h: 2.2 };
      S.env = 0.02;
    } else if (t < 7.4) {
      const p = seg(t, 4.6, 7.4);
      S.camPos = W3(m, mix3([0.5, 0.0, 0.2], [0.49, 0.05, 0.175], E.sine(p)));
      S.camTarget = W3(m, [0.36, 0.26, 0]); S.fov = 24;
      S.focusPoint = W3(m, [PW / 2 + 0.004, 0.25, 0]); S.aperture = 6; S.maxCoC = 0.02;
      S.lights.strip = { i: 7, pos: W3(m, [1.1, lerp(1.2, -0.6, E.inOut(seg(t, 4.7, 7.3))), 0.4]), look: W3(m, [0.36, 0.25, 0]), w: 2.4, h: 0.03 };
      S.env = 0.025;
    } else if (t < 10.2) {
      const p = seg(t, 7.4, 10.2);
      S.camPos = W3(m, mix3([0.37, 0.33, -0.98], [0.31, 0.42, -0.8], E.sine(p)));
      S.camTarget = W3(m, [0.205, 0.555, -0.05]); S.fov = 22;
      S.focusPoint = W3(m, LENS); S.aperture = 7; S.maxCoC = 0.022;
      S.lights.strip = { i: 3, pos: W3(m, [1.0, lerp(1.1, 0.1, E.inOut(p)), -0.35]), look: W3(m, LENS), w: 1.2, h: 0.03 };
      S.lights.glint = { i: 90, pos: W3(m, [lerp(-0.3, 0.42, E.inOut(seg(t, 7.6, 10.1))), 0.86, -1.0]), look: W3(m, LENS) };
      S.env = 0.3;
    } else {
      const p = seg(t, 10.2, 13.0);
      S.camPos = W3(m, mix3([-0.1, -0.99, 0.105], [-0.07, -0.92, 0.088], E.sine(p)));
      S.camTarget = W3(m, [0.02, 0.1, Z_GLASS]); S.fov = 28;
      S.focusPoint = W3(m, [0, -0.42, Z_GLASS]); S.aperture = 5; S.maxCoC = 0.02;
      S.lights.strip = { i: 4, pos: W3(m, [0, 1.7, lerp(0.55, 0.08, E.inOut(seg(t, 10.3, 12.9)))]), look: W3(m, [0, 0, Z_GLASS]), w: 1.1, h: 0.03 };
      const pulse = bump(t, 11.6, 26, 3.4) + 0.7 * bump(t, 11.95, 26, 3.4);
      S.ui = { mode: 'pulse', pulse: 1, time: 0 };
      S.screenI = 1.5 * pulse; S.screenLight = 0.6 * pulse;
      S.env = 0.03;
    }
    S.bloom = 0.35; S.bloomThreshold = 1.0;
    return S;
  }

  if (t < 17.2) {
    // ---------- the line, over black ----------
    S.phoneVisible = false;
    const words = COPY.line1.split(' ');
    const w = words.map((_, i) => sm(t, 13.5 + i * 0.2, 14.3 + i * 0.2, E.out));
    const out = 1 - sm(t, 16.15, 16.75);
    S.lines.push({ text: COPY.line1, y: 0.5, size: 0.036, weight: 500, words: w, alpha: out, blur: 0.012, rise: 0.006, track: -0.012 });
    return S;
  }

  // ---------- ACT TWO + THREE: continuous camera from the hit to the end card ----------
  S.floor = true;
  S.yaw = phoneYawAt(t);
  const m = phoneMatrix(S.phonePos, S.yaw);
  const phoneC = V3(S.phonePos);

  // camera path
  if (t < 30.5) {
    const c = revealCam(t); S.camPos = c.pos; S.camTarget = c.tgt;
  } else if (t < 33.0) {
    const a = revealCam(30.5), b = chatCam(33.0, m), p = E.inOut(seg(t, 30.5, 33.0));
    S.camPos = vlerp(a.pos, b.pos, p); S.camTarget = vlerp(a.tgt, b.tgt, p);
    S.zoom = 0.07 * Math.pow(Math.sin(Math.PI * seg(t, 30.8, 32.8)), 2);
  } else if (t < 42.5) {
    const c = chatCam(t, m); S.camPos = c.pos; S.camTarget = c.tgt;
  } else {
    const a = chatCam(42.5, phoneMatrix(phonePosAt(42.5), 0)), p = E.inOut(seg(t, 42.5, 48.2));
    S.camPos = vlerp(a.pos, END_POS, p).add(V3([0, 0, 0.24 * seg(t, 48.2, 52)]));
    S.camTarget = vlerp(a.tgt, END_TGT, p);
  }
  S.focusPoint = t >= 33 && t < 42.5 ? S.camTarget : W3(m, [0, 0.05, Z_GLASS]);
  S.aperture = t >= 33 && t < 42.5 ? 1.2 : 1.8; S.maxCoC = 0.008;

  // studio lights: on with the hit, off one relay at a time
  const oR = offK(t, 26.3), oL = offK(t, 27.0), oK = offK(t, 27.7);
  const look = phoneC;
  const sweepX = lerp(-2.4, 2.4, E.inOut(seg(t, 17.2, 18.4)));
  S.lights.strip = { i: 70 * (1 - sm(t, 18.2, 18.7)), pos: V3([sweepX, 1.25, 1.9]), look, w: 0.09, h: 2.8 };
  S.lights.rimL = { i: 30 * sm(t, 17.3, 18.8) * oL, pos: V3([-1.5, 1.35, -1.2]), look, w: 0.085, h: 2.8 };
  S.lights.rimR = { i: 30 * sm(t, 17.6, 19.2) * oR, pos: V3([1.5, 1.1, -1.1]), look, w: 0.085, h: 2.8 };
  const keyI = 9 * sm(t, 18.4, 21.2) * oK;
  S.lights.key = { i: keyI, pos: V3([0.9, 2.3, 2.3]), look, w: 0.45, h: 2.2 };
  const envStep = 1 - 0.38 * (1 - oR) - 0.28 * (1 - oL) - 0.28 * (1 - oK);
  S.env = 0.55 * sm(t, 17.3, 20.5) * envStep + 0.035 * sm(t, 17.2, 19);
  S.shadow = 0.45 * (keyI / 9);

  // the screen wakes and becomes the light
  if (t >= 24.8) {
    const tr = sm(t, 31.2, 32.6);
    const nWords = chatLayout ? chatLayout.words.length : 1;
    S.ui = {
      mode: 'app', time: t, animated: true,
      orbR: lerp(30, 150, E.outQuint(seg(t, 24.8, 26.2))), orbE: sm(t, 24.8, 25.3, E.out),
      word: sm(t, 25.6, 26.4), status: +sm(t, 25.1, 25.8).toFixed(2), tr,
      typed: Math.floor(seg(t, 33.3, 36.0) * Q_LEN), typing: t > 33.3 && t < 36.0, caret: t > 32.6 && t < 36.25,
      sent: seg(t, 36.25, 36.95), think: t > 36.55 && t < 37.6 ? Math.sin(Math.PI * seg(t, 36.55, 37.6)) : 0,
      stream: seg(t, 37.4, 41.6) * nWords
    };
    S.screenI = sm(t, 24.8, 25.2, E.out) * lerp(1.6, 1.12, tr);
    S.screenLight = S.screenI * lerp(2.6, 1.8, tr);
  }

  S.bloom = t < 24.8 ? 0.45 : 0.55; S.bloomThreshold = t < 24.8 ? 0.95 : lerp(1.0, 1.25, seg(t, 31, 33)); S.ca = 0.005;
  S.grain = 0.045; S.vignette = t > 42.5 ? 0.5 : 0.4;

  // end card
  if (t >= 46.0) {
    S.titleA = sm(t, 46.4, 47.4);
    S.sweep = lerp(-0.35, 1.35, E.inOut(seg(t, 46.5, 48.5)));
    const tw = COPY.tagline.split(' ').map((_, i) => sm(t, 47.6 + i * 0.09, 48.4 + i * 0.09, E.out));
    S.lines.push({ text: COPY.tagline, y: 0.3, size: 0.024, weight: 500, words: tw, blur: 0.008, rise: 0.004, track: -0.008 });
    S.lines.push({ text: COPY.cta, y: 0.343, size: 0.0165, weight: 400, alpha: sm(t, 49.0, 49.8), color: 'rgba(242,238,232,0.62)', track: 0.01 });
    S.fade = 1 - sm(t, 50.8, 52.0);
  }
  return S;
}

const LIGHT_NAMES = Object.keys(LIGHTS);
function applyState(S) {
  phone.visible = S.phoneVisible;
  phone.position.set(S.phonePos[0], S.phonePos[1], S.phonePos[2]);
  phone.rotation.set(S.pitch, S.yaw, S.roll, 'YXZ');
  phone.updateMatrixWorld(true);
  camera.fov = S.fov; camera.updateProjectionMatrix();
  camera.position.copy(S.camPos); camera.lookAt(S.camTarget); camera.updateMatrixWorld(true);
  for (const n of LIGHT_NAMES) {
    const l = LIGHTS[n], s = S.lights[n];
    if (!s || s.i <= 0.0005) { l.intensity = 0; continue; }
    l.intensity = s.i; l.position.copy(s.pos); if (s.w) l.width = s.w; if (s.h) l.height = s.h;
    l.lookAt(s.look); l.updateMatrixWorld();
  }
  floor.visible = S.floor; shadow.visible = S.floor && S.shadow > 0.002;
  shadow.material.opacity = S.shadow; shadow.position.x = S.phonePos[0]; shadow.position.z = S.phonePos[2];
  floorU.uReflStrength.value = S.reflStrength; floorU.uFocusXZ.value.set(S.phonePos[0], S.phonePos[2]);
  setEnv(S.env);
  MAT.screen.emissiveIntensity = S.screenI;
  screenLight.intensity = S.screenLight;
  if (S.phoneVisible) updateUI(S.ui);
  drawLines(S.lines);
  titleU.uTitleAlpha.value = S.titleA; titleU.uSweep.value = S.sweep;
  if (S.focusPoint) S.focus = camera.position.distanceTo(S.focusPoint);
}

/* =====================================================================
   PLAYBACK
   ===================================================================== */
const startOverlay = document.getElementById('startOverlay');
const endOverlay = document.getElementById('endOverlay');
const playBtn = document.getElementById('playBtn');
const againBtn = document.getElementById('againBtn');
const hint = document.getElementById('hint');
const pausedEl = document.getElementById('paused');

let score = null, base = 0, perfBase = 0, perfPausedAt = 0;
let running = false, paused = false, ended = false, ready = false, renderedEnd = false;
let frameTimes = [], adaptChecks = 0, lastFrame = 0;

function clock() {
  if (score && score.ctx.state !== 'closed') return score.ctx.currentTime - base;
  return (performance.now() - perfBase) / 1000;
}

function renderAt(t) {
  resize();
  const S = computeState(t);
  applyState(S);
  renderFrame(S);
}


/* ---------------- capture mode (?capture): used by tools/export.mjs ---------------- */
function exposeCapture() {
  const acc = makeCanvas(W, H), actx = acc.getContext('2d');
  // Renders one output frame. `sub` sub-frames spread across `shutter` of the frame interval are averaged,
  // which is how a film camera's 180-degree shutter produces motion blur.
  window.__captureFrame = (t, fps = 30, sub = 1, shutter = 0.5) => {
    actx.globalCompositeOperation = 'source-over'; actx.globalAlpha = 1; actx.fillStyle = '#000'; actx.fillRect(0, 0, W, H);
    for (let k = 0; k < sub; k++) {
      const tk = sub === 1 ? t : t + ((k + 0.5) / sub - 0.5) * (shutter / fps);
      renderAt(Math.max(0, Math.min(TOTAL, tk)));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(canvas, 0, 0, W, H);
    }
    actx.globalAlpha = 1;
    return acc.toDataURL('image/png');
  };
  window.__renderAudioWav = async () => {
    const rate = 48000, oc = new OfflineAudioContext(2, Math.ceil(rate * TOTAL), rate);
    new Score(oc).schedule(0, 0);
    const buf = await oc.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
    const out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, rate, true);
    out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++, o += 4) {
      out.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
    }
    const bytes = new Uint8Array(out.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  window.__filmInfo = { total: TOTAL, width: W, height: H };
}

async function prepare() {
  const fontLoads = ['400', '500', '600'].map((w) => document.fonts ? document.fonts.load(`${w} 40px "Instrument Sans"`) : Promise.resolve());
  await Promise.race([Promise.all(fontLoads), new Promise((r) => setTimeout(r, 3500))]);
  chatLayout = buildChatLayout();
  buildTitleMask();
  resize(true);
  // compile every shader variant up front by visiting each act once
  for (const t of STILL ? [T_START] : [2, 11.7, 18.5, 26, 35, 48]) renderAt(t);
  renderAt(STILL ? T_START : 0);
  ready = true;
  if (STILL) { startOverlay.style.display = 'none'; if (CAPTURE) exposeCapture(); window.__done = true; return; }
  hint.innerHTML = 'Play with sound<small>Best in the dark</small>';
  playBtn.focus({ preventScroll: true });
}

async function start() {
  if (!ready) return;
  if (score) score.stop();
  score = null;
  try {
    score = new Score();
    if (score.ctx.state !== 'running') await score.ctx.resume();
  } catch (e) { score = null; }
  const lead = 0.3;
  if (score) { base = score.ctx.currentTime + lead - T_START; score.schedule(base, T_START); }
  else perfBase = performance.now() + (lead - T_START) * 1000;
  running = true; paused = false; ended = false; renderedEnd = false; frameTimes = [];
  startOverlay.classList.add('hidden'); endOverlay.classList.add('hidden'); pausedEl.classList.remove('on');
}

function togglePause() {
  if (!running || ended) return;
  paused = !paused;
  if (score) { if (paused) score.ctx.suspend(); else score.ctx.resume(); }
  else if (paused) perfPausedAt = performance.now();
  else perfBase += performance.now() - perfPausedAt;
  pausedEl.classList.toggle('on', paused);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!running || paused) return;
  let t = clock();
  if (t >= TOTAL) {
    t = TOTAL;
    if (!ended) { ended = true; endOverlay.classList.remove('hidden'); againBtn.focus({ preventScroll: true }); }
    if (renderedEnd) return;
    renderedEnd = true;
  }
  renderAt(Math.max(0, t));
  // adaptive resolution: step down if frames run long
  if (lastFrame) {
    frameTimes.push(now - lastFrame);
    if (frameTimes.length >= 90 && adaptChecks < 4) {
      frameTimes.sort((a, b) => a - b);
      const median = frameTimes[45];
      if (median > 26 && quality > 0.5) { quality = Math.max(0.5, quality - 0.15); resize(true); }
      frameTimes = []; adaptChecks++;
    }
  }
  lastFrame = now;
}

playBtn.addEventListener('click', start);
againBtn.addEventListener('click', start);
canvas.addEventListener('click', togglePause);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && running) { e.preventDefault(); togglePause(); }
  if ((e.key === 'r' || e.key === 'R') && ready) start();
});

prepare().then(() => { if (!STILL) requestAnimationFrame(loop); }).catch((e) => { console.error(e); showError(); });

