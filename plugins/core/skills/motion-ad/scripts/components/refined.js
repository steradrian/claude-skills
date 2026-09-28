/* refined components (elegant / premium styles): masked line reveals, hairlines, blurIn, photo placeholder. Requires core.js. No shake, no bounce: pair with io/io2/out5/expo easings. */
(() => {
  const { $, place, clamp, lerp, E, rng } = AD;
  /** lines: [{text, style}] ; each line is a mask (overflow hidden) with an inner that slides up */
  function maskLines(parent, lines, { x, y, w = 960, lh, align = 'left' }) {
    return lines.map((l, i) => {
      const wrap = $('div', 'abs', parent, { overflow: 'hidden', left: (align === 'center' ? x - w / 2 : x) + 'px', top: (y + i * lh) + 'px', width: w + 'px', height: ((l.h || lh) * 1.28) + 'px', textAlign: align });  // taller than the line so descenders aren't clipped
      const inner = $('div', '', wrap, Object.assign({ whiteSpace: 'nowrap', lineHeight: (l.h || lh) + 'px', willChange: 'transform' }, l.style)); inner.textContent = l.text;
      return { wrap, inner };
    });
  }
  const reveal = (it, p, out = 0) => { it.inner.style.transform = `translate3d(0,${((1 - p) * 132 - out * 132).toFixed(2)}%,0)` };
  function hairline(parent, { x, y, w, color, thick = 2, origin = 'left' }) { const d = $('div', 'abs', parent, { left: x + 'px', top: y + 'px', width: w + 'px', height: thick + 'px', background: color, transformOrigin: origin + ' center', transform: 'scaleX(0)' }); d.draw = p => d.style.transform = `scaleX(${clamp(p).toFixed(4)})`; return d }
  /** opacity + blur + rise, for UI elements */
  function blurIn(el, p, { dist = 60, blur = 18, scale = 1 } = {}) { el.style.opacity = clamp(p); el.style.filter = p < .999 ? `blur(${((1 - p) * blur).toFixed(1)}px)` : 'none'; el.style.transform = `translate3d(0,${((1 - p) * dist).toFixed(1)}px,0) scale(${lerp(scale, 1, p).toFixed(4)})` }
  /** abstract "photo" placeholder: warm light + bokeh. tone: 'warm' | 'sand' | 'blue' */
  function photo(parent, { w, h, tone = 'warm', seed = 3 }) {
    const T = {
      warm: { base: 'linear-gradient(160deg,#2a1c14,#120c09)', light: 'rgba(255,176,90,.75)', b: ['rgba(255,190,110,.9)', 'rgba(255,140,60,.8)', 'rgba(255,230,180,.8)', 'rgba(180,90,40,.7)'] },
      sand: { base: 'linear-gradient(160deg,#6b4a38,#2e211b)', light: 'rgba(255,200,150,.7)', b: ['rgba(255,214,170,.9)', 'rgba(220,140,100,.8)', 'rgba(255,240,215,.8)', 'rgba(150,110,80,.7)'] },
      blue: { base: 'linear-gradient(160deg,#10142a,#06070d)', light: 'rgba(77,107,255,.7)', b: ['rgba(120,150,255,.9)', 'rgba(77,107,255,.85)', 'rgba(235,238,255,.85)', 'rgba(40,60,160,.7)'] }
    }[tone];
    const d = $('div', 'abs', parent, { left: 0, top: 0, width: w + 'px', height: h + 'px', overflow: 'hidden', background: T.base });
    const inner = $('div', 'abs', d, { inset: '-6%' });
    $('div', 'abs', inner, { inset: 0, background: `radial-gradient(ellipse 55% 45% at 65% 35%,${T.light},transparent 70%),radial-gradient(ellipse 40% 30% at 20% 80%,${T.b[3]},transparent 70%)` });
    const r = rng(seed);
    for (let i = 0; i < 16; i++) { const s = 20 + r() * 90; $('div', 'abs', inner, { left: (r() * 100) + '%', top: (r() * 70) + '%', width: s + 'px', height: s + 'px', borderRadius: '50%', background: T.b[i % 4], filter: `blur(${4 + r() * 10}px)`, opacity: .35 + r() * .5 }) }
    $('div', 'abs', d, { inset: 0, background: 'linear-gradient(180deg,transparent 55%,rgba(0,0,0,.45))' });
    $('div', 'abs', d, { inset: 0, backgroundImage: `url(${AD.NOISE})`, opacity: .6, mixBlendMode: 'overlay' });
    d.zoom = p => inner.style.transform = `scale(${lerp(1.1, 1, p).toFixed(4)})`;
    return d;
  }
  Object.assign(AD, { maskLines, reveal, hairline, blurIn, photo });
})();
