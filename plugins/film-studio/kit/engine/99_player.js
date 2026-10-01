/* =====================================================================
   FILM STUDIO ENGINE — player
   Runs after the film's files. Turns FILM.state(t) into pixels and sound,
   and exposes the hooks the review and export tools use.
   ===================================================================== */
const FILM_OK = typeof FILM === 'object' && typeof FILM.state === 'function' && FILM.total > 0;

function baseState(t) {
  const d = Object.assign({}, LOOK_POST[LOOK], FILM.post || {});
  return {
    t, camPos: V3([0, 1, 4]), camTarget: V3([0, 1, 0]), fov: 30,
    focusPoint: null, focus: 4, aperture: 0, maxCoC: 0,
    lights: {}, env: 0, floor: false, shadow: 0, reflStrength: 0.55,
    lines: [], titleA: 0, sweep: -1,
    exposure: 1, fade: 1, zoom: 0, tonemap: d.tonemap, bloom: d.bloom, bloomThreshold: d.bloomThreshold,
    grain: d.grain, vignette: d.vignette, ca: d.ca, lift: d.lift
  };
}
function computeState(t) { const S = baseState(t); FILM.state(t, S); return S; }

const LIGHT_KEYS = () => Object.keys(LIGHTS);
function applyState(S) {
  if (LOOK !== 'motion2d') {
    camera.fov = S.fov; camera.updateProjectionMatrix();
    camera.position.copy(V3(S.camPos)); camera.lookAt(V3(S.camTarget)); camera.updateMatrixWorld(true);
    for (const n of LIGHT_KEYS()) {
      const l = LIGHTS[n], s = S.lights[n];
      if (!s || s.i <= 0.0005) { l.intensity = 0; continue; }
      l.intensity = s.i; l.position.copy(V3(s.pos)); if (s.w) l.width = s.w; if (s.h) l.height = s.h;
      if (s.color != null) l.color.set(s.color);
      l.lookAt(V3(s.look)); l.updateMatrixWorld();
    }
    if (floor) { floor.visible = S.floor; if (floorU) floorU.uReflStrength.value = S.reflStrength; }
    if (shadowBlob) { shadowBlob.visible = S.floor && S.shadow > 0.002; shadowBlob.material.opacity = S.shadow; }
    setEnv(S.env);
  }
  if (FILM.apply) FILM.apply(S);
  if (LOOK === 'motion2d' && FILM.draw2d) {
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    FILM.draw2d(pctx, S, W, H);
    plateTex.needsUpdate = true;
  }
  drawLines(S.lines);
  titleU.uTitleAlpha.value = S.titleA; titleU.uSweep.value = S.sweep;
  if (S.focusPoint) S.focus = camera.position.distanceTo(V3(S.focusPoint));
}

function renderAt(t) {
  resize();
  const S = computeState(t);
  applyState(S);
  renderFrame(S);
  return S;
}

/* ---------------- playback ---------------- */
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
async function start() {
  if (!ready) return;
  if (score) score.stop();
  score = null;
  try { score = new Score(); if (score.ctx.state !== 'running') await score.ctx.resume(); } catch (e) { score = null; }
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
  else if (paused) perfPausedAt = performance.now(); else perfBase += performance.now() - perfPausedAt;
  pausedEl.classList.toggle('on', paused);
}
function loop(now) {
  requestAnimationFrame(loop);
  if (!running || paused) return;
  let t = clock();
  if (t >= FILM.total) {
    t = FILM.total;
    if (!ended) { ended = true; endOverlay.classList.remove('hidden'); againBtn.focus({ preventScroll: true }); }
    if (renderedEnd) return;
    renderedEnd = true;
  }
  renderAt(Math.max(0, t));
  if (lastFrame) {
    frameTimes.push(now - lastFrame);
    if (frameTimes.length >= 90 && adaptChecks < 4) {
      frameTimes.sort((a, b) => a - b);
      if (frameTimes[45] > 26 && quality > 0.5) { quality = Math.max(0.5, quality - 0.15); resize(true); }
      frameTimes = []; adaptChecks++;
    }
  }
  lastFrame = now;
}

/* ---------------- capture and review hooks (used by tools/) ---------------- */
function exposeHooks() {
  const acc = makeCanvas(W, H), actx = acc.getContext('2d');
  const probe = makeCanvas(160, Math.round((160 * H) / W)), pctx2 = probe.getContext('2d', { willReadFrequently: true });
  const shots = FILM.shots || [];
  const shotAt = (t) => { const s = shots.find((x) => t >= x.start && t < x.end); return s ? s.name : ''; };
  /** one output frame; `sub` sub-frames across `shutter` of the frame interval give film-style motion blur */
  window.__captureFrame = (t, fps = 30, sub = 1, shutter = 0.5) => {
    actx.globalCompositeOperation = 'source-over'; actx.globalAlpha = 1; actx.fillStyle = '#000'; actx.fillRect(0, 0, W, H);
    for (let k = 0; k < sub; k++) {
      const tk = sub === 1 ? t : t + ((k + 0.5) / sub - 0.5) * (shutter / fps);
      renderAt(clamp(tk, 0, FILM.total));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(canvas, 0, 0, W, H);
    }
    actx.globalAlpha = 1;
    return acc.toDataURL('image/png');
  };
  /** renders t, measures it, and returns the frame plus objective numbers for the report */
  window.__analyze = (t) => {
    const t0 = performance.now();
    renderAt(clamp(t, 0, FILM.total));
    pctx2.drawImage(canvas, 0, 0, probe.width, probe.height);
    const ms = performance.now() - t0; // after the readback, so it includes GPU work
    const d = pctx2.getImageData(0, 0, probe.width, probe.height).data, n = d.length / 4, lum = new Float32Array(n);
    let sum = 0, clipped = 0;
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lum[i] = l; sum += l;
      if (r >= 250 && g >= 250 && b >= 250) clipped++;
    }
    const sorted = Array.from(lum).sort((a, b) => a - b);
    const post = Object.assign({}, LOOK_POST[LOOK], FILM.post || {}), chk = Object.assign({ safeX: 0.05, safeY: 0.04 }, FILM.checks || {});
    const res = {
      t, shot: shotAt(t), ms: Math.round(ms), mean: +(sum / n).toFixed(4), p1: +sorted[Math.floor(n * 0.01)].toFixed(4),
      p99: +sorted[Math.floor(n * 0.99)].toFixed(4), clipped: +(clipped / n).toFixed(4), text: lastTextBoxes.map((b) => ({ ...b })), flags: []
    };
    const clipMax = chk.clipMax != null ? chk.clipMax : post.clipMax;
    if (res.clipped > clipMax) res.flags.push(`${Math.round(res.clipped * 100)}% of the frame is pure white (limit ${Math.round(clipMax * 100)}%). Find the light, emissive or reflection blowing out.`);
    if ((chk.expectBlack != null ? chk.expectBlack : post.expectBlack) && res.p1 > 0.03 && res.mean < 0.35) res.flags.push(`Darkest pixels sit at ${Math.round(res.p1 * 255)}/255: blacks look lifted. Check grain, grade, vignette, background.`);
    const blackOK = (chk.blackOK || []).some(([a, b]) => t >= a && t <= b);
    if (res.mean < 0.004 && !blackOK) res.flags.push('The frame is essentially black. Intended? If so, list the range in FILM.checks.blackOK.');
    for (const b of res.text) if (b.x0 < chk.safeX || b.x1 > 1 - chk.safeX || b.y0 < chk.safeY || b.y1 > 1 - chk.safeY) res.flags.push(`Text "${b.text}" runs outside the safe area.`);
    res.thumb = (() => { const c = makeCanvas(270, Math.round((270 * H) / W)); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.9); })();
    res.frame = canvas.toDataURL('image/png');
    return res;
  };
  /** tiles thumbnails with labels into one contact sheet */
  window.__contactSheet = async (items, cols = 5) => {
    const imgs = await Promise.all(items.map((it) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = it.thumb; })));
    const cw = imgs[0].width, ch = imgs[0].height, gap = 8, label = 34, rows = Math.ceil(imgs.length / cols);
    const sheet = makeCanvas(cols * cw + (cols + 1) * gap, rows * (ch + label) + (rows + 1) * gap), g = sheet.getContext('2d');
    g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, sheet.width, sheet.height);
    imgs.forEach((im, i) => {
      const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + label + gap);
      g.drawImage(im, x, y + label);
      g.fillStyle = items[i].flags.length ? '#ffb020' : '#e8e6e1'; g.font = '600 15px system-ui, sans-serif'; g.textBaseline = 'middle';
      g.fillText(`${items[i].t.toFixed(2)}s${items[i].flags.length ? '  !' + items[i].flags.length : ''}`, x + 4, y + 11);
      g.fillStyle = '#9d9a94'; g.font = '13px system-ui, sans-serif'; g.fillText((items[i].shot || '').slice(0, 30), x + 4, y + 27);
    });
    return sheet.toDataURL('image/png');
  };
  /** renders the score offline and returns WAV (base64) plus per-second loudness */
  window.__renderAudio = async () => {
    const rate = 48000, oc = new OfflineAudioContext(2, Math.ceil(rate * FILM.total), rate);
    new Score(oc).schedule(0, 0);
    const buf = await oc.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
    const seconds = [];
    for (let s = 0; s < Math.ceil(FILM.total); s++) {
      let pk = 0, ss = 0; const a = s * rate, b = Math.min(n, (s + 1) * rate);
      for (let i = a; i < b; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > pk) pk = v; ss += (L[i] * L[i] + R[i] * R[i]) / 2; }
      seconds.push({ s, peak: +pk.toFixed(3), rms: +(20 * Math.log10(Math.sqrt(ss / Math.max(1, b - a)) + 1e-9)).toFixed(1) });
    }
    const out = new DataView(new ArrayBuffer(44 + n * 4)), str = (o, v) => { for (let i = 0; i < v.length; i++) out.setUint8(o + i, v.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++, o += 4) { out.setInt16(o, clamp(L[i], -1, 1) * 32767, true); out.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); }
    const bytes = new Uint8Array(out.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { wav: btoa(bin), seconds };
  };
  window.__filmInfo = { total: FILM.total, width: W, height: H, look: LOOK, format: `${FMT.w}:${FMT.h}`, shots, title: FILM.title || document.title };
}

async function boot() {
  if (!FILM_OK) { showError('No film found: define FILM with state(t, S) and total in src/.'); return; }
  if (FILM.font) FONT = FILM.font;
  try { initStage(FILM); } catch (e) { console.error(e); showError(); return; }
  const fams = FILM.fontLoads || ['400', '500', '600'].map((w) => `${w} 40px "Instrument Sans"`);
  await Promise.race([Promise.all(fams.map((f) => (document.fonts ? document.fonts.load(f) : null))), new Promise((r) => setTimeout(r, 3500))]);
  resize(true);
  if (FILM.setup) await FILM.setup();
  const warm = STILL ? [T_START] : (FILM.shots && FILM.shots.length ? FILM.shots.map((s) => (s.start + s.end) / 2) : [0.25, 0.5, 0.75].map((k) => k * FILM.total));
  for (const t of warm) renderAt(t);
  renderAt(STILL ? T_START : 0);
  ready = true;
  if (STILL) { startOverlay.style.display = 'none'; if (CAPTURE) exposeHooks(); window.__done = true; return; }
  hint.innerHTML = 'Play with sound<small>Best in the dark</small>';
  playBtn.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}

playBtn.addEventListener('click', start);
againBtn.addEventListener('click', start);
canvas.addEventListener('click', togglePause);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && running) { e.preventDefault(); togglePause(); }
  if ((e.key === 'r' || e.key === 'R') && ready) start();
});
boot().catch((e) => { console.error(e); showError(); });
