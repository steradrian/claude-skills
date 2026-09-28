/* vhs components (retro-vhs style). Requires core.js.
 * AD.crt({...})        CRT/VCR overlay: scanlines, glass, OSD (PLAY/FF/REW/STOP), timecode, static,
 *                      tracking bands, FF/REW picture distortion, CRT power-off. Drive it with a mode list.
 * AD.chromeText(...)   90s chrome lettering with outline, offset shadow and a moving glint (g.glint(p)).
 * AD.starburst(...)    infomercial starburst sticker.
 * AD.retroSun(...), AD.gridFloor(...)   sunset sun with stripe cuts, scrolling perspective grid.
 * AD.chroma(el, px)    red/cyan colour fringing on text.
 */
(() => {
  const { $, clamp, hash, lerp, E, N, W, H } = AD;
  const P = Object.assign({ osd: '#5cff7a', ink: '#1a1030', cream: '#f3ead8', magenta: '#e0407a', teal: '#2fbfa8', yellow: '#ffd23d', orange: '#ff8a3d' }, AD.C.palette || {});
  const SPEED = { PLAY: 1, FF: 8, REW: -12, STATIC: 1, STOP: 0, PAUSE: 0 };
  const modeAt = (modes, t) => { let m = modes[0]; for (const x of modes) { if (t >= x[0]) m = x; else break } return m };
  function tcAt(modes, t) { let tc = 0; for (let i = 0; i < modes.length; i++) { const [a, n] = modes[i]; const b = i + 1 < modes.length ? modes[i + 1][0] : Infinity; if (t <= a) break; tc += (Math.min(t, b) - a) * (SPEED[n] ?? 1) } return Math.max(0, tc) }
  /** opaque snowy static texture, generated once */
  const STATIC = AD.tex(160, (x, w, h) => { const d = x.createImageData(w, h); const r = AD.rng(99); for (let i = 0; i < w * h; i++) { const v = Math.pow(r(), .8) * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255 } x.putImageData(d, 0, 0) });
  const fmt = s => { s = Math.floor(s); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` };
  const tri = (dir, s, c) => dir === 'sq'
    ? `<span style="display:inline-block;width:${s * .62}px;height:${s * .62}px;background:${c};margin-right:${s * .22}px;box-shadow:0 0 10px ${c}"></span>`
    : `<span style="display:inline-block;width:0;height:0;border-top:${s * .36}px solid transparent;border-bottom:${s * .36}px solid transparent;${dir === 'r' ? 'border-left' : 'border-right'}:${s * .56}px solid ${c};margin-right:${s * .06}px;filter:drop-shadow(0 0 6px ${c})"></span>`;
  function modeHTML(n, s, c) {
    if (n === 'PLAY') return tri('r', s, c) + '&nbsp;PLAY';
    if (n === 'FF') return tri('r', s, c) + tri('r', s, c) + '&nbsp;FF';
    if (n === 'REW') return tri('l', s, c) + tri('l', s, c) + '&nbsp;REW';
    if (n === 'STOP') return tri('sq', s, c) + 'STOP';
    if (n === 'PAUSE') return `<span style="display:inline-block;width:${s * .18}px;height:${s * .62}px;background:${c};margin-right:${s * .14}px"></span><span style="display:inline-block;width:${s * .18}px;height:${s * .62}px;background:${c};margin-right:${s * .22}px"></span>PAUSE`;
    return '';
  }

  /** modes: [[t, 'PLAY'|'FF'|'REW'|'STATIC'|'STOP'|'PAUSE'], ...] sorted by t.
   *  tracking: [[t, dur]] rolling tracking-error bands during PLAY.
   *  powerOff: [t, dur] CRT collapse to a line then a dot. osd: {left, top, size}; tc: {right, bottom, size} */
  function crt({ modes = [[0, 'PLAY']], tracking = [], channel = 'CH 03', osdHide = 1.6, powerOff = null, osd: osdPos = {}, tc: tcPos = {}, scan = .2 } = {}) {
    const op = Object.assign({ left: 80, top: 250, size: 72 }, osdPos), tp = Object.assign({ right: 150, top: op.top + 8, size: 54 }, tcPos);
    let sceneEls = null, lastHTML = '';
    const el = AD.overlay(t => update(t));
    const stat = $('div', 'abs', el, { inset: 0, backgroundImage: `url(${STATIC}),url(${STATIC})`, backgroundSize: '320px,480px', backgroundBlendMode: 'difference', imageRendering: 'pixelated', opacity: 0 });
    const bands = [0, 1, 2, 3].map(() => $('div', 'abs', el, { left: 0, right: 0, height: '80px', backgroundImage: `url(${N}),linear-gradient(transparent,rgba(255,255,255,.4) 45%,rgba(255,255,255,.1) 60%,transparent)`, backgroundSize: '160px,100% 100%', filter: 'grayscale(1) contrast(4) brightness(1.6)', mixBlendMode: 'screen', opacity: 0 }));
    $('div', 'abs', el, { inset: 0, background: `repeating-linear-gradient(0deg,rgba(0,0,0,${scan}) 0 2px,transparent 2px 5px)` });
    $('div', 'abs', el, { inset: 0, background: 'radial-gradient(ellipse 85% 72% at 50% 50%,transparent 62%,rgba(0,0,0,.55) 100%),linear-gradient(160deg,rgba(255,255,255,.07),transparent 35%)', boxShadow: 'inset 0 0 140px rgba(0,0,0,.55)' });
    const glow = `0 0 12px ${P.osd},0 0 2px ${P.osd}`;
    const osd = $('div', 'abs', el, { left: op.left + 'px', top: op.top + 'px', font: `${op.size}px 'VT',monospace`, color: P.osd, textShadow: glow, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', letterSpacing: '.04em' });
    const chn = $('div', 'abs', el, { right: tp.right + 'px', top: (op.top + 120) + 'px', font: `${op.size * 1.3}px 'VT',monospace`, color: P.osd, textShadow: glow, opacity: 0 }); chn.textContent = channel;
    const tc = $('div', 'abs', el, { right: tp.right + 'px', [tp.bottom != null ? 'bottom' : 'top']: (tp.bottom != null ? tp.bottom : tp.top) + 'px', font: `${tp.size}px 'VT',monospace`, color: P.cream, textShadow: '0 0 8px rgba(243,234,216,.7)', letterSpacing: '.04em', opacity: .9 });
    const line = $('div', 'abs', el, { left: 0, right: 0, top: (H / 2 - 4) + 'px', height: '8px', background: '#fff', boxShadow: '0 0 30px 10px rgba(200,230,255,.9)', opacity: 0 });
    function update(t) {
      if (!sceneEls) sceneEls = [...document.querySelectorAll('#shake > .scene')];
      const [m0, m] = modeAt(modes, t); const f = Math.floor(t * 24); const since = t - m0;
      const html = modeHTML(m, op.size, P.osd); if (html !== lastHTML) { osd.innerHTML = html; lastHTML = html }
      const persist = m === 'FF' || m === 'REW' || m === 'STOP' || m === 'PAUSE';
      osd.style.opacity = m === 'STATIC' ? 0 : (persist || since < osdHide) ? (m === 'PAUSE' ? (Math.floor(t * 2) % 2 ? 1 : .2) : 1) : 0;
      chn.style.opacity = m === 'STATIC' ? 1 : 0;
      tc.textContent = 'SP ' + fmt(tcAt(modes, t)); tc.style.opacity = m === 'STATIC' ? 0 : .9;
      stat.style.opacity = m === 'STATIC' ? 1 : 0;
      if (m === 'STATIC') stat.style.backgroundPosition = `${hash(f, 1) * 300}px ${hash(f, 2) * 300}px,${hash(f, 3) * 300}px ${hash(f, 4) * 300}px`;
      const heavy = m === 'FF' || m === 'REW';
      const tr = tracking.find(([a, d]) => t >= a && t < a + d);
      bands.forEach((b, i) => {
        let on = false, y = 0, h = 80;
        if (heavy) { on = i < 3; y = hash(f, 10 + i) * H; h = 18 + hash(f, 20 + i) * 90 }
        else if (tr && i === 0) { on = true; y = -150 + (t - tr[0]) / tr[1] * (H + 300); h = 120 }
        b.style.opacity = on ? (heavy ? .8 : .6) : 0; b.style.top = y + 'px'; b.style.height = h + 'px';
        b.style.backgroundPosition = `${hash(f, 30 + i) * 400}px 0,0 0`;
      });
      let ty = 0, tx = 0, sk = 0, sy = 1, sx = 1;
      if (m === 'FF') { ty = (hash(f, 40) - .5) * 70; sk = (hash(f, 41) - .5) * 3; tx = (hash(f, 42) - .5) * 24 }
      if (m === 'REW') { ty = -((since * 1400) % 260) + (hash(f, 43) - .5) * 60; sk = (hash(f, 44) - .5) * 4; tx = (hash(f, 45) - .5) * 30 }
      if (tr && !heavy) { const p = (t - tr[0]) / tr[1]; tx = Math.sin(p * 40) * 8 * (1 - p); sk = Math.sin(p * 25) * 1.4 }
      let lineOp = 0;
      if (powerOff && t >= powerOff[0]) {
        const p = clamp((t - powerOff[0]) / powerOff[1]);
        sy = p < .55 ? lerp(1, .004, E.in3(p / .55)) : .004; sx = p < .55 ? 1 : lerp(1, .002, E.in2((p - .55) / .45));
        lineOp = p > .35 ? 1 - clamp((p - .9) / .1) : 0; line.style.transform = `scaleX(${sx})`;
      }
      line.style.opacity = lineOp;
      const tfm = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) skewX(${sk.toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      sceneEls.forEach(e => e.style.transform = tfm);
    }
    return el;
  }

  const chroma = (el, amt = 3) => { el.style.textShadow = `${-amt}px 0 rgba(255,40,100,.8),${amt}px 0 rgba(40,230,255,.8)`; return el };

  /** single-line chrome lettering. Returns group; call g.glint(p 0..1) to sweep the highlight. */
  function chromeText(parent, str, { x, y, w, h, size, font = "'Bungee'", align = 'center', stroke = 14, shadow = P.magenta, gradient }) {
    const g = AD.grp(parent, x, y, w, h);
    const base = { position: 'absolute', inset: 0, font: `${size}px ${font}`, lineHeight: h + 'px', textAlign: align, whiteSpace: 'pre' };
    const sh = $('div', '', g, Object.assign({}, base, { color: shadow, WebkitTextStroke: `${stroke}px ${shadow}`, transform: `translate(${size * .06}px,${size * .07}px)` })); sh.textContent = str; sh.dataset.bleed = 1;
    const ol = $('div', '', g, Object.assign({}, base, { color: P.ink, WebkitTextStroke: `${stroke}px ${P.ink}` })); ol.textContent = str; ol.dataset.bleed = 1;
    const fill = $('div', '', g, Object.assign({}, base, { backgroundImage: gradient || 'linear-gradient(180deg,#ffffff 0%,#d8ecff 34%,#7d8cb5 49%,#2b2350 51%,#b58cff 68%,#ffe3f6 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' })); fill.textContent = str;
    const gl = $('div', '', g, Object.assign({}, base, { backgroundImage: 'linear-gradient(105deg,transparent 42%,rgba(255,255,255,.95) 50%,transparent 58%)', backgroundRepeat: 'no-repeat', backgroundSize: '260% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' })); gl.textContent = str; gl.dataset.bleed = 1;
    g.glint = p => { gl.style.backgroundPosition = `${lerp(130, -30, clamp(p))}% 0` }; g.glint(0);
    return g;
  }

  function starburst(parent, html, { x, y, r = 150, points = 18, fill = P.yellow, color = P.ink, size = 42 }) {
    const S = r * 2.2, g = AD.grp(parent, x, y, S, S); let d = '';
    for (let i = 0; i < points * 2; i++) { const a = i / (points * 2) * Math.PI * 2, rr = i % 2 ? r * .8 : r; d += (i ? 'L' : 'M') + (S / 2 + Math.cos(a) * rr).toFixed(1) + ' ' + (S / 2 + Math.sin(a) * rr).toFixed(1) }
    g.innerHTML = `<svg viewBox="0 0 ${S} ${S}" width="100%" height="100%" style="overflow:visible;position:absolute;inset:0"><path d="${d}Z" fill="${P.ink}" transform="translate(9 11)"/><path d="${d}Z" fill="${fill}" stroke="${P.ink}" stroke-width="7" stroke-linejoin="round"/></svg>`;
    const t = $('div', 'abs', g, { inset: r * .42 + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', font: `${size}px 'Bungee'`, color, lineHeight: 1.05 }); t.innerHTML = html;
    return g;
  }

  function retroSun(parent, { x, y, r = 330, from = P.yellow, to = P.magenta }) {
    const s = $('div', 'abs', parent, { borderRadius: '50%', background: `linear-gradient(180deg,${from},${P.orange} 45%,${to})`, boxShadow: `0 0 120px ${to}` });
    const m = 'linear-gradient(#000 52%,transparent 52% 55%,#000 55% 63%,transparent 63% 67%,#000 67% 74%,transparent 74% 79%,#000 79% 85%,transparent 85% 91%,#000 91% 95%,transparent 95%)';
    Object.assign(s.style, { WebkitMaskImage: m, maskImage: m }); AD.place(s, x, y, r * 2, r * 2); return s;
  }

  /** perspective grid; call g.update(t) each frame to scroll it toward the viewer */
  function gridFloor(parent, { horizon = 1250, color = P.magenta, bottom = H + 80, lines = 14, glow = true }) {
    const d = $('div', 'abs', parent, { left: 0, top: horizon + 'px', width: W + 'px', height: (bottom - horizon) + 'px', overflow: 'hidden', background: `linear-gradient(${P.ink},rgba(26,16,48,.6))` });
    const hh = bottom - horizon, vx = W / 2;
    let v = ''; for (let i = -lines; i <= lines; i++) v += `<line x1="${vx + i * 18}" y1="0" x2="${vx + i * 260}" y2="${hh}"/>`;
    d.innerHTML = `<svg width="${W}" height="${hh}" style="position:absolute;inset:0;${glow ? `filter:drop-shadow(0 0 6px ${color})` : ''}"><g stroke="${color}" stroke-width="3">${v}</g><g class="hz" stroke="${color}" stroke-width="3"></g></svg>`;
    const hz = d.querySelector('.hz');
    d.update = t => { let s = ''; const ph = (t * .9) % 1; for (let k = 0; k < 12; k++) { const z = (k + ph) / 12; const yy = Math.pow(z, 2.2) * hh; s += `<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}"/>` } hz.innerHTML = s };
    d.update(0); return d;
  }

  Object.assign(AD, { crt, chroma, chromeText, starburst, retroSun, gridFloor, vhsTimecode: tcAt });
})();
