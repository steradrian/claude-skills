/* core components: procedural textures, paper cards, tape, typewriter, split text.
 * Loaded after engine.js; extends window.AD. Style-specific components live in
 * sibling files (collage.js, ...). Build includes the ones listed in ad.config.json.
 */
(() => {
  const { rng, clamp, $, place } = AD;

  /* ---------- procedural textures (data URLs, generated once) ---------- */
  function tex(w, fn, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; fn(c.getContext('2d'), w, h || w); return c.toDataURL() }
  const R0 = rng(7);
  /** fine paper noise + fibres, transparent: layer it OVER a colour */
  const NOISE = tex(256, (x, s) => {
    const d = x.createImageData(s, s); for (let i = 0; i < s * s; i++) { const v = R0(), w = v > .5 ? 255 : 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = w; d.data[i * 4 + 3] = Math.abs(v - .5) * 2 * 38 } x.putImageData(d, 0, 0);
    x.lineWidth = .7; for (let k = 0; k < 70; k++) { x.globalAlpha = .05 + R0() * .07; x.strokeStyle = R0() < .5 ? '#000' : '#fff'; x.beginPath(); const a = R0() * s, b = R0() * s; x.moveTo(a, b); x.quadraticCurveTo(a + R0() * 40 - 20, b + R0() * 40 - 20, a + R0() * 60 - 30, b + R0() * 60 - 30); x.stroke() }
  });
  /** soft blotches (leather, cardboard, skin of old paper) */
  const MOTTLE = tex(256, (x, s) => { for (let k = 0; k < 120; k++) { const a = R0() * s, b = R0() * s, r = 6 + R0() * 30; const g = x.createRadialGradient(a, b, 0, a, b, r); const dark = R0() < .6; g.addColorStop(0, dark ? 'rgba(60,30,10,.16)' : 'rgba(255,240,210,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2) } });
  /** dark speckles (cork, recycled paper) */
  const SPECK = tex(140, (x, s) => { for (let k = 0; k < 90; k++) { x.fillStyle = `rgba(${50 + R0() * 40 | 0},${28 + R0() * 20 | 0},12,${.35 + R0() * .5})`; x.beginPath(); x.ellipse(R0() * s, R0() * s, .6 + R0() * 2.4, .5 + R0() * 1.8, R0() * 3, 0, 7); x.fill() } });
  /** mask for rubber-stamp / worn-print text: opaque with holes and scrapes. Use as mask-image. */
  const DISTRESS = tex(512, (x, s, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, s, h); x.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 650; k++) { x.globalAlpha = .35 + R0() * .6; x.beginPath(); x.arc(R0() * s, R0() * h, .4 + Math.pow(R0(), 3) * 4, 0, 7); x.fill() }
    for (let k = 0; k < 10; k++) { x.globalAlpha = .2 + R0() * .5; x.lineWidth = .8 + R0() * 2.6; x.beginPath(); const y = R0() * h; x.moveTo(R0() * s * .3, y); x.lineTo(s * (.5 + R0() * .5), y + R0() * 14 - 7); x.stroke() }
    x.globalAlpha = .55; for (let k = 0; k < 5; k++) { const a = R0() * s, b = R0() * h, r = 20 + R0() * 40; const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(a - r, b - r, 2 * r, 2 * r) }
  }, 256);
  const N = `url(${NOISE})`;
  /** CSS background: colour with paper noise on top */
  const paper = (color, extra = '') => `${N},${extra ? extra + ',' : ''}${color}`;
  const halftone = (dot, bg, size = 13, r = 3.3) => `${N},radial-gradient(circle,${dot} 0 ${r}px,transparent ${r + .6}px) 0 0/${size}px ${size}px,${bg}`;
  const mask = (el, url = DISTRESS, size = 'cover') => { Object.assign(el.style, { WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: size, maskSize: size }); return el };

  /* ---------- torn / cut paper ---------- */
  /** clip-path polygon. edges: 4 chars top,right,bottom,left; 't' torn, 'c' cleanly cut. */
  function torn(seed, { jit = 1.6, step = 2.2, ins = 0, edges = 'tttt' } = {}) {
    const r = rng(seed), P = []; const J = k => edges[k] === 't' ? r() * jit : r() * .2; const st = () => step * (.35 + r() * 1.3);
    for (let x = ins; x <= 100 - ins; x += st()) P.push([x, ins + J(0)]);
    for (let y = ins; y <= 100 - ins; y += st()) P.push([100 - ins - J(1), y]);
    for (let x = 100 - ins; x >= ins; x -= st()) P.push([x, 100 - ins - J(2)]);
    for (let y = 100 - ins; y >= ins; y -= st()) P.push([ins + J(3), y]);
    return `polygon(${P.map(p => p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%').join(',')})`;
  }
  /** paper card with white fibre rim + drop shadow. Content goes in card.face (flex-centred). */
  function card(parent, { x, y, w, h, bg, seed = 1, edges = 'tttt', jit = 1.8, step = 2.2, rim = '#f6f2e9', sh = 'sh' }) {
    const el = $('div', 'card ' + (sh || ''), parent); place(el, x, y, w, h);
    if (rim) { const rm = $('div', 'fill', el); rm.style.background = paper(rim); rm.style.clipPath = torn(seed, { jit: jit * 1.15, step, edges }) }
    const f = $('div', 'fill face', el); f.style.background = bg; f.style.clipPath = torn(seed + 97, { jit, step, edges, ins: rim ? .8 : 0 }); el.face = f; return el;
  }
  /** strip of masking tape */
  function tape(parent, x, y, w, h = 58, seed = 3, color = 'rgba(228,216,178,.82)') { const t = $('div', 'tape sh-lite', parent); place(t, x, y, w, h); t.style.background = paper(color); t.style.clipPath = torn(seed, { jit: 4.5, step: 7, edges: 'ctct' }); return t }

  /* ---------- text ---------- */
  /** typewriter: el shows the first n chars. Call AD.typeTo(el, n) each frame. */
  function typer(el, text) { el._t = text; el._n = -1; return el }
  function typeTo(el, n) { n = clamp(Math.floor(n), 0, el._t.length); if (n !== el._n) { el.textContent = el._t.slice(0, n) || '\u200b'; el._n = n } }
  /** split text into per-letter (or per-word) spans for kinetic type. Returns array of spans. */
  function split(el, text, by = 'char') {
    el.textContent = ''; const parts = by === 'word' ? text.split(/(\s+)/) : [...text];
    return parts.map(p => { const s = $('span', 'sp', el); s.textContent = p; if (/^\s+$/.test(p)) s.style.whiteSpace = 'pre'; return s }).filter(s => !/^\s+$/.test(s.textContent));
  }
  /** text block helper: absolutely placed div with style */
  function text(parent, str, { x, y, w, h, cls = '', style = {} }) { const d = $('div', 'abs ' + cls, parent, style); d.textContent = str; place(d, x, y, w, h); return d }

  Object.assign(AD, { tex, NOISE, MOTTLE, SPECK, DISTRESS, N, paper, halftone, mask, torn, card, tape, typer, typeTo, split, text });
})();
