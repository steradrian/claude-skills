/* motion-ad engine
 * Every frame is a pure function of time t (seconds). Nothing animates on its own:
 * scenes compute every property from t inside their render(t, lt) function.
 * That makes scrubbing, looping and frame-exact MP4 rendering deterministic.
 * Exposed as window.AD. See references/engine-api.md for the full API.
 */
window.AD = (() => {
  const C = Object.assign({
    width: 1080, height: 1920, duration: 15, fps: 30, loop: true, background: '#111',
    film: {}, beats: [], title: 'Motion ad'
  }, window.AD_CONFIG || {});
  const F = Object.assign({
    grain: .6,          // 0..1 film grain strength
    grainScale: 3,      // grain canvas is W/grainScale; bigger = chunkier grain
    weave: 1,           // gate weave amount (0 = locked off)
    dust: 1,            // scratches, dust, hairs (0 = clean)
    flicker: .05,       // random exposure flicker per frame
    vignette: .4,       // 0..1
    leakBase: .06,      // ambient light-leak opacity
    leakColors: ['rgba(255,150,40,.85)', 'rgba(255,60,10,.7)', 'rgba(255,236,190,.9)'],
    leaks: [],          // [[time, amount, width]] light-leak burns (transitions)
    flashes: [],        // [time] single-frame flash frames (hard cuts)
    flashAmount: .55,   // flash opacity; dark ads need ~.9 or the flash reads as a grey wash
    flashColor: '#fff4e2',
    fadeIn: .12,        // seconds from black at start
    fadeOut: .38,       // seconds to black at end
    radius: 18          // stage corner radius in the preview page
  }, C.film || {});
  const W = C.width, H = C.height, T = C.duration;

  /* ---------- math & timing ---------- */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263 | 0, 1274126177); h = (h ^ h >>> 13) * 1274126177; return ((h ^ h >>> 16) >>> 0) / 4294967296 };
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    lin: x => x, out2: x => 1 - (1 - x) * (1 - x), out3: x => 1 - Math.pow(1 - x, 3), out5: x => 1 - Math.pow(1 - x, 5),
    in2: x => x * x, in3: x => x * x * x, io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    io2: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
    back: x => { const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) },
    expo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
    elastic: x => x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI / 3)) + 1
  };
  /** keyframes: kf(t, [[time, value, easeToNext], ...]) */
  function kf(t, k) { if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) { const [t0, v0, e] = k[i], [t1, v1] = k[i + 1]; if (t < t1) return v0 + (v1 - v0) * E[e || 'io']((t - t0) / (t1 - t0)); } return k[k.length - 1][1]; }
  /** eased 0..1 progress of a window starting at a lasting d */
  const prog = (t, a, d, e = 'lin') => E[e](clamp((t - a) / d));
  /** quantize time: qn(t, 12) animates "on twos" like stop-motion */
  const qn = (t, fps) => Math.floor(t * fps) / fps;
  const q12 = t => qn(t, 12);
  /** boil: per-element jitter that changes 8x/s (hand-made wobble) */
  const boil = (seed, t, amt = .7, rate = 8) => (hash(seed, Math.floor(t * rate)) - .5) * 2 * amt;
  /** smooth pseudo-noise, for drifts */
  const wobble = (seed, t, amt = 1, speed = 1) => (Math.sin(t * 1.3 * speed + seed) * .6 + Math.sin(t * 2.7 * speed + seed * 2.1) * .4) * amt;

  /* ---------- DOM helpers ---------- */
  function $(tag, cls, parent, style) { const e = document.createElement(tag); if (cls) e.className = cls; if (style) Object.assign(e.style, style); if (parent) parent.appendChild(e); return e }
  /** place an absolutely positioned element by its CENTER (x,y) */
  function place(el, x, y, w, h) { el.style.left = (x - w / 2) + 'px'; el.style.top = (y - h / 2) + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; el._w = w; el._h = h; return el }
  /** set transform + opacity. x,y are offsets from the placed position */
  function tf(el, x = 0, y = 0, r = 0, s = 1, o = 1, sx = 1) { el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${(s * sx).toFixed(4)},${s.toFixed(4)})`; el.style.opacity = o }
  function grp(parent, x, y, w, h) { const g = $('div', 'grp', parent); place(g, x, y, w, h); return g }
  /** full-stage SVG overlay; returns the <svg> element. Filter #rough is available globally. */
  function svg(parent, inner) { const d = $('div', '', parent); d.innerHTML = `<svg class="over" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`; return d.firstChild }
  /** stroke-draw a path: call with p in 0..1 each frame */
  function strokeReveal(path, p) { if (!path._L) { path._L = path.getTotalLength(); path.style.strokeDasharray = path._L } path.style.strokeDashoffset = path._L * (1 - clamp(p)) }

  /* ---------- scenes & camera shake ---------- */
  const stage = document.getElementById('stage');
  const root = document.getElementById('shake');
  const SC = [], IMP = [];
  /** camera-shake impulse at absolute time t with magnitude m (px). ~3 small hit, ~10 slam, ~18 huge */
  const kick = (t, m) => IMP.push([t, m]);
  /** scene visible from a to b (absolute seconds). bg is any CSS background. */
  function scene(a, b, bg) {
    const el = $('div', 'scene', root); const bgl = $('div', 'bg', el); bgl.style.background = bg || 'transparent';
    const cam = $('div', 'cam', el); const s = { el, cam, bg: bgl, a, b, on: false, render: () => { } }; SC.push(s); return s
  }
  /** overlay layer above all scenes (for wipes / transitions spanning scenes) */
  const overlays = [];
  function overlay(render) { const el = $('div', 'overlay', stage.querySelector('#weave')); overlays.push({ el, render }); return el }

  /* ---------- film layer ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gW = Math.round(W / F.grainScale), gH = Math.round(H / F.grainScale);
  const grain = document.getElementById('grain'); grain.width = gW; grain.height = gH; const gx = grain.getContext('2d');
  const GF = []; if (F.grain > 0) { const r = rng(123); for (let f = 0; f < 8; f++) { const d = gx.createImageData(gW, gH); for (let i = 0; i < gW * gH; i++) { const v = r(); const w = v > .5 ? 255 : 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = w; d.data[i * 4 + 3] = Math.pow(Math.abs(v - .5) * 2, 1.4) * 100 * F.grain } GF.push(d) } }
  const scr = document.getElementById('scratch'); const sW = W / 2, sH = H / 2; scr.width = sW; scr.height = sH; const sx = scr.getContext('2d');
  const leak = document.getElementById('leak'), flick = document.getElementById('flick'), flash = document.getElementById('flash'), blackout = document.getElementById('blackout');
  flash.style.background = F.flashColor;
  document.getElementById('vig').style.background = `radial-gradient(ellipse 75% 60% at 50% 48%,transparent 58%,rgba(10,6,2,${F.vignette}) 100%)`;
  const weave = document.getElementById('weave');
  const bump = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  let lastF = -1;
  function film(t) {
    const f = Math.floor(t * 24);
    if (f !== lastF) {
      lastF = f;
      if (GF.length) gx.putImageData(GF[f % GF.length], 0, 0);
      sx.clearRect(0, 0, sW, sH);
      if (F.dust > 0) {
        const r = rng(f * 7 + 1);
        const nl = r() < .45 * F.dust ? 1 + (r() < .3 ? 1 : 0) : 0;
        for (let i = 0; i < nl; i++) { const x = hash(Math.floor(f / 5), i) * sW; sx.strokeStyle = `rgba(${r() < .6 ? '255,248,230' : '20,14,8'},${.18 + r() * .25})`; sx.lineWidth = .6 + r() * .9; sx.beginPath(); sx.moveTo(x, 0); sx.bezierCurveTo(x + r() * 6 - 3, sH / 3, x + r() * 6 - 3, sH * 2 / 3, x + r() * 4 - 2, sH); sx.stroke() }
        const nd = Math.floor(r() * 4 * F.dust); for (let i = 0; i < nd; i++) { sx.fillStyle = r() < .7 ? `rgba(20,14,8,${.5 + r() * .4})` : `rgba(255,248,230,${.5 + r() * .4})`; sx.beginPath(); sx.ellipse(r() * sW, r() * sH, .8 + r() * 2.6, .6 + r() * 1.8, r() * 3, 0, 7); sx.fill() }
        if (r() < .05 * F.dust) { sx.strokeStyle = 'rgba(20,14,8,.55)'; sx.lineWidth = 1.1; sx.beginPath(); const a = r() * sW, b = r() * sH; sx.moveTo(a, b); sx.bezierCurveTo(a + r() * 80 - 40, b + r() * 80 - 40, a + r() * 80 - 40, b + r() * 80 - 40, a + r() * 90 - 45, b + r() * 90 - 45); sx.stroke() }
      }
      const wv = reduce ? 0 : F.weave;
      weave.style.transform = `translate(${((hash(f, 1) - .5) * 3.2 * wv).toFixed(2)}px,${((hash(f, 2) - .5) * 2.4 * wv).toFixed(2)}px) rotate(${((hash(f, 3) - .5) * .12 * wv).toFixed(3)}deg)`;
      flick.style.opacity = reduce ? 0 : hash(f, 4) * F.flicker;
    }
    // a flash is exactly one output frame, so it runs on the render clock, not the 24fps film clock
    const vf = Math.floor(t * C.fps + 1e-6);
    flash.style.opacity = F.flashes.some(c => vf === Math.floor(c * C.fps + 1e-6)) ? F.flashAmount : 0;
    let lk = F.leakBase + F.leakBase * .6 * Math.sin(t * 1.7);
    F.leaks.forEach(([c, a, w]) => { lk = Math.max(lk, a * bump(t, c, w || .14)) });
    const lx = 30 + Math.sin(t * .9) * 40, ly = 20 + Math.cos(t * .7) * 30, L = F.leakColors;
    leak.style.background = `radial-gradient(ellipse 60% 40% at ${lx}% ${ly}%,${L[0]},transparent 70%),radial-gradient(ellipse 45% 35% at ${100 - lx}% ${90 - ly * .5}%,${L[1]},transparent 70%),radial-gradient(ellipse 30% 22% at ${lx + 20}% ${ly + 10}%,${L[2]},transparent 70%)`;
    leak.style.opacity = clamp(lk);
    const fi = F.fadeIn > 0 ? kf(t, [[0, 1], [F.fadeIn, 0, 'out3']]) : 0;
    const fo = F.fadeOut > 0 ? kf(t, [[T - F.fadeOut, 0, 'in2'], [T, 1]]) : 0;
    blackout.style.opacity = Math.max(fi, fo);
  }
  function shake(t) {
    let x = 0, y = 0, r = 0; const f = Math.floor(t * 30);
    if (!reduce) for (const [ti, m] of IMP) { const d = t - ti; if (d < 0 || d > .6) continue; const a = m * Math.exp(-d * 12); const k = ti * 100 | 0; x += (hash(f, k) - .5) * 2 * a; y += (hash(f + 9, k) - .5) * 2 * a; r += (hash(f + 3, k) - .5) * .35 * a / 10 }
    root.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
  }
  function render(t) {
    for (const s of SC) { const on = t >= s.a && t < s.b; if (on !== s.on) { s.el.style.display = on ? 'block' : 'none'; s.on = on } if (on) s.render(t, t - s.a) }
    for (const o of overlays) o.render(t, o.el);
    shake(t); film(t);
  }

  /* ---------- playback, fit, controls ---------- */
  function start() {
    const vp = document.getElementById('viewport'), ctr = document.getElementById('controls');
    stage.style.width = W + 'px'; stage.style.height = H + 'px'; stage.style.background = C.background;
    const cs = getComputedStyle(document.documentElement);
    function fit() {
      const aw = innerWidth - 24, ah = innerHeight - 24 - 54 - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
      const sc = Math.max(.05, Math.min(aw / W, ah / H)); stage.style.transform = `scale(${sc})`; vp.style.width = W * sc + 'px'; vp.style.height = H * sc + 'px';
      stage.style.borderRadius = (F.radius / sc) + 'px'; document.documentElement.style.setProperty('--cw', Math.max(260, W * sc) + 'px')
    }
    addEventListener('resize', fit); fit();
    const btn = document.getElementById('play'), icon = document.getElementById('icon'), scrub = document.getElementById('scrub'), time = document.getElementById('time');
    scrub.max = T;
    let playing = true, cur = 0, base = 0, scrubbing = false;
    function setPlaying(p) {
      playing = p; base = performance.now() - cur * 1000; btn.setAttribute('aria-label', p ? 'Pause' : 'Play');
      icon.innerHTML = p ? '<rect x="3" y="2" width="3.5" height="12" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor"/>' : '<path d="M4 2 L14 8 L4 14 Z" fill="currentColor"/>'
    }
    btn.onclick = () => setPlaying(!playing);
    addEventListener('keydown', e => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); setPlaying(!playing) } });
    scrub.addEventListener('input', () => { scrubbing = true; cur = +scrub.value; base = performance.now() - cur * 1000; render(cur) });
    scrub.addEventListener('change', () => { scrubbing = false });
    function loop(now) {
      if (playing && !scrubbing) { const e = (now - base) / 1000; cur = C.loop ? e % T : Math.min(e, T - 1e-3) }
      render(cur); scrub.value = cur; time.textContent = cur.toFixed(1) + 's'; requestAnimationFrame(loop)
    }
    // render hooks used by scripts/shoot.py and scripts/render.py
    window.__render = t => { playing = false; cur = t; render(t) };
    window.__prepareCapture = () => { stage.style.transform = 'scale(1)'; stage.style.borderRadius = '0'; document.getElementById('app').classList.add('capture') };
    window.__ready = false;
    const qs = new URLSearchParams(location.search);
    document.fonts.ready.then(() => {
      if (qs.has('t')) { setPlaying(false); cur = +qs.get('t') } else setPlaying(true);
      render(cur); window.__ready = true; requestAnimationFrame(loop)
    });
  }

  /** brand files inlined by build.py from config "assets": AD.assets.logo is a data URL */
  const assets = window.AD_ASSETS || {};

  return { C, F, W, H, T, assets, rng, hash, clamp, lerp, E, kf, prog, qn, q12, boil, wobble, $, place, tf, grp, svg, strokeReveal, scene, overlay, kick, beats: C.beats || [], render, start, stage };
})();
