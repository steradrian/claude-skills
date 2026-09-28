/* collage components (gritty editorial / cut-paper styles). Requires core.js.
 * Palette defaults come from AD.C.palette if present: {ink, paper, red, kraft, gray}
 */
(() => {
  const { rng, $, place, grp, card, paper, mask, DISTRESS, MOTTLE, SPECK, N } = AD;
  // the collage type classes live with the collage fonts, not in the shared template
  $('style', '', document.head).textContent = `
.tw{font-family:'SpecialElite',ui-monospace,monospace;white-space:pre;line-height:1}
.pfi{font-family:'PF',Georgia,serif;font-style:italic;font-weight:900;line-height:1.02;letter-spacing:-.01em}
.anton{font-family:'Anton',Impact,sans-serif;line-height:.9}
.marker{font-family:'Marker',cursive;line-height:1}
.stamp{position:absolute;font-family:'Anton',Impact,sans-serif;border:12px solid currentColor;display:flex;align-items:center;justify-content:center;letter-spacing:.06em;line-height:1;transform-origin:50% 50%}`;
  const P = Object.assign({ ink: '#161310', paper: '#ece4d3', red: '#d7301c', kraft: '#b88d5a', gray: '#b3afa5' }, AD.C.palette || {});
  const TX = {
    paper: paper(P.paper), ink: paper(P.ink), red: paper(P.red), gray: paper(P.gray),
    kraft: `${N},url(${MOTTLE}),${P.kraft}`,
    news: paper('#d9d2c1', 'repeating-linear-gradient(0deg,rgba(22,19,16,.07) 0 3px,transparent 3px 9px)'),
    half: AD.halftone(P.ink, P.red),
    grid: `${N},linear-gradient(#8d897f 1.6px,transparent 1.6px) 0 0/19px 19px,linear-gradient(90deg,#8d897f 1.6px,transparent 1.6px) 0 0/19px 19px,${P.gray}`,
    cork: `${N},url(${SPECK}),#c49b6a`,
    stripes: `${N},repeating-linear-gradient(90deg,${P.paper} 0 16px,${P.ink} 16px 25px,${P.paper} 25px 30px,${P.red} 30px 33px,${P.paper} 33px 46px)`
  };

  /** ransom-note lettering. styles: array of {bg,c,f,it,wf,fs}; wf = glyph width factor, fs = size factor.
   * Returns [{g, X, Y, rot, i, seed}] - animate each g yourself (usually on twos with AD.q12). */
  const RS = [
    { bg: TX.paper, c: P.ink, f: "'Anton'", wf: .5, fs: 1 },
    { bg: TX.ink, c: P.paper, f: "'PF'", it: 1, wf: .74, fs: .9 },
    { bg: TX.red, c: P.ink, f: "'ArchivoBlack'", wf: .8, fs: .78 },
    { bg: TX.news, c: P.ink, f: "'SpecialElite'", wf: .64, fs: .95 },
    { bg: TX.kraft, c: P.ink, f: "'Anton'", wf: .5, fs: 1.05 },
    { bg: TX.paper, c: P.red, f: "'PF'", it: 1, wf: .74, fs: .92 },
    { bg: TX.gray, c: P.ink, f: "'ArchivoBlack'", wf: .8, fs: .76 },
    { bg: TX.ink, c: P.red, f: "'Anton'", wf: .5, fs: 1 },
  ];
  function ransom(parent, word, { cx, cy, size, seed = 1, gap = 8, order, styles = RS }) {
    const r = rng(seed), L = []; let last = -1, total = 0;
    [...word].forEach((ch, i) => {
      let si = order ? order[i % order.length] : Math.floor(r() * styles.length); if (!order && si === last) si = (si + 3) % styles.length; last = si; const st = styles[si];
      const sc = .9 + r() * .22; const w = ch === '.' || ch === ',' ? size * .42 : ch === ' ' ? size * .3 : size * st.wf * st.fs * sc + size * .34; const h = size * 1.22 * (.92 + r() * .16); L.push({ ch, st, sc, w, h }); total += w + gap
    });
    total -= gap; let x = cx - total / 2;
    return L.map((l, i) => {
      const X = x + l.w / 2; x += l.w + gap; const Y = cy + (r() - .5) * size * .16; const rot = (r() - .5) * 14;
      const g = grp(parent, X, Y, l.w, l.h);
      if (l.ch !== ' ') {
        const c = card(g, { x: l.w / 2, y: l.h / 2, w: l.w, h: l.h, bg: l.st.bg, seed: seed * 31 + i * 7, jit: 2.6, step: 4, edges: ['tctc', 'cttt', 'tttc', 'cctt'][i % 4] });
        const gl = $('span', 'glyph', c.face); gl.textContent = l.ch; Object.assign(gl.style, { fontFamily: l.st.f, fontSize: (size * l.st.fs * l.sc) + 'px', color: l.st.c, fontStyle: l.st.it ? 'italic' : 'normal', fontWeight: l.st.it ? 900 : 400 });
      }
      return { g, X, Y, rot, i, seed: seed * 13 + i, w: l.w };
    });
  }
  /** measure a ransom row's total width before placing it (to keep it inside safe zones) */
  function ransomWidth(word, size, seed = 1, order, styles = RS, gap = 8) { const r = rng(seed); let last = -1, t = 0;[...word].forEach((ch, i) => { let si = order ? order[i % order.length] : Math.floor(r() * styles.length); if (!order && si === last) si = (si + 3) % styles.length; last = si; const st = styles[si]; const sc = .9 + r() * .22; r(); t += (ch === '.' || ch === ',' ? size * .42 : ch === ' ' ? size * .3 : size * st.wf * st.fs * sc + size * .34) + gap }); return t - gap }

  /** rubber stamp: bordered, distressed, multiply-blended. Animate with AD.tf (slam: scale 2.6 -> 1 over ~0.12s, 'in3'). */
  function stamp(parent, str, { x, y, w, h, color = P.ink, size = 120, rot = 0 }) {
    const s = $('div', 'stamp', parent, { color, fontSize: size + 'px', padding: '8px 26px 2px', mixBlendMode: 'multiply', whiteSpace: 'nowrap' });
    mask(s); s.textContent = str; place(s, x, y, w, h); s._rot = rot; return s;
  }
  /** faint justified editorial body copy, for newsprint texture */
  function newsText(parent, { x, y, w, h, rot = -2, op = .22, size = 21, cols = 3, copy, color = '22,19,16' }) {
    const d = $('div', 'abs', parent); place(d, x, y, w, h); d.dataset.bleed = '1';
    Object.assign(d.style, { columnCount: cols, columnGap: '34px', fontFamily: "'PF',Georgia,serif", fontSize: size + 'px', lineHeight: 1.38, color: `rgba(${color},${op})`, textAlign: 'justify', hyphens: 'auto', overflow: 'hidden', transform: `rotate(${rot}deg)` });
    const para = (copy || 'Write two or three plausible sentences about the brand here; it only reads as texture but should never be lorem ipsum. ') + ' ';
    d.textContent = para.repeat(Math.ceil(9000 / para.length)); return d;
  }
  /** big number/word with an offset halftone shadow. Returns group {g, front, back} */
  function halftoneText(parent, str, { x, y, w, h, size, color = P.ink, dot = P.red, font = "'Anton'", offset = [24, 22], distress = true }) {
    const g = grp(parent, x, y, w, h);
    const back = $('div', 'abs', g, { inset: 0, fontFamily: font, fontSize: size + 'px', lineHeight: .9, textAlign: 'center', color: 'transparent', background: `radial-gradient(circle,${dot} 0 4.4px,transparent 5px) 0 0/13px 13px`, WebkitBackgroundClip: 'text', backgroundClip: 'text', transform: `translate(${offset[0]}px,${offset[1]}px)`, whiteSpace: 'nowrap' }); back.textContent = str;
    const front = $('div', 'abs', g, { inset: 0, fontFamily: font, fontSize: size + 'px', lineHeight: .9, textAlign: 'center', color, whiteSpace: 'nowrap' }); front.textContent = str;
    if (distress) mask(front, DISTRESS, '1000px');
    return { g, front, back };
  }
  /** misregistered two-colour print (logo lockups). Returns group */
  function misregister(parent, str, { x, y, w, h, size, font = "'Anton'", top = P.ink, under = P.red, off = [9, 6] }) {
    const g = grp(parent, x, y, w, h);
    const b = $('div', 'abs', g, { inset: 0, fontFamily: font, fontSize: size + 'px', lineHeight: 1, color: under, textAlign: 'center', transform: `translate(${off[0]}px,${off[1]}px)`, whiteSpace: 'nowrap' }); b.textContent = str;
    const f = $('div', 'abs', g, { inset: 0, fontFamily: font, fontSize: size + 'px', lineHeight: 1, color: top, textAlign: 'center', mixBlendMode: 'multiply', whiteSpace: 'nowrap' }); f.textContent = str; mask(f, DISTRESS, '1100px');
    return g;
  }
  /** hand-drawn marker path (uses global #rough filter). Reveal with AD.strokeReveal(path, p). */
  function markerPath(parent, d, { color = P.red, width = 22 } = {}) {
    const s = AD.svg(parent, `<path filter="url(#rough)" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity=".93"/>`);
    return s.querySelector('path');
  }
  /** handwritten marker words; reveal left-to-right with clipReveal(el, p) */
  function markerText(parent, str, { x, y, w, h, size = 96, color = P.red, rot = -6 }) { const d = $('div', 'abs marker', parent, { fontSize: size + 'px', color, whiteSpace: 'nowrap', transform: `rotate(${rot}deg)` }); d.textContent = str; place(d, x, y, w, h); return d }
  const clipReveal = (el, p) => { el.style.clipPath = `inset(-20% ${(100 - AD.clamp(p) * 100).toFixed(1)}% -20% -5%)` };
  /** giant outlined background word (texture, allowed to bleed). Drive it with AD.tf. */
  function outlineWord(parent, str, { x, y, w, h, size = 600, stroke = 6, color = 'rgba(22,19,16,.24)', font = "'Anton'" }) {
    const d = $('div', 'abs', parent, { fontFamily: font, fontSize: size + 'px', lineHeight: .9, color: 'transparent', WebkitTextStroke: `${stroke}px ${color}`, whiteSpace: 'nowrap', textAlign: 'center' });
    d.textContent = str; d.dataset.bleed = '1'; place(d, x, y, w, h); return d;
  }
  /** torn paper sheet that sweeps up over the cut from a to b (absolute seconds). Give it the NEXT
   * scene's background so the swap underneath is invisible. Returns the overlay element. */
  function tornWipe({ a, b, bg = TX.paper, seed = 808, rot = -4, ease = 'io' }) {
    const { W, H } = AD, sw = Math.round(W * 1.32), sh = Math.round(H * 1.41);
    const from = H + 80, to = -Math.round((sh - H) * .22);
    let sheet;
    const el = AD.overlay((t, o) => {
      const on = t >= a && t < b; o.style.display = on ? 'block' : 'none';
      if (on) sheet.style.transform = `translate(0,${AD.kf(t, [[a, from, ease], [b, to]]).toFixed(1)}px) rotate(${rot}deg)`;
    });
    sheet = $('div', 'abs', el, { left: -Math.round((sw - W) / 2) + 'px', top: 0, width: sw + 'px', height: sh + 'px' });
    card(sheet, { x: sw / 2, y: sh / 2, w: sw, h: sh, bg, seed, jit: 1.2, step: 1.4, edges: 'tccc' });
    return el;
  }

  Object.assign(AD, { P, TX, RS, ransom, ransomWidth, stamp, newsText, halftoneText, misregister, markerPath, markerText, clipReveal, outlineWord, tornWipe });
})();
