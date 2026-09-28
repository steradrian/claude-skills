/* reveal components (trailer / suspense style). Requires core.js.
 * AD.maskShot(parent, fill) → shot element whose content is only visible through a moving light-edged opening.
 *   shot.set(type, {open, size, cx, cy, edge})  type: 'slitH' | 'slitV' | 'iris' | 'rect' | 'full' | 'none'
 *     open 0..1 (how far the opening is open), size = opening size in px when fully open (slit height/width, iris
 *     radius, rect width), cx/cy = centre in px (default frame centre), edge = glow strength 0..1.
 *   shot.body = the content container (put a photo in it; animate its scale for a slow push).
 * AD.letterbox(parent, bar=300) → {set(p)}: cinema bars, p=1 fully in, p=0 gone.
 * AD.lightLine(parent) → {set(p, cy)}: a glowing horizontal hairline drawing out from the centre (for cold opens).
 */
(() => {
  const { $, clamp, W, H } = AD;
  const GLOW = { background: 'rgba(255,238,210,.96)', boxShadow: '0 0 16px 5px rgba(255,196,130,.55),0 0 60px 18px rgba(255,150,70,.22)' };
  const edgeEl = (p, vertical) => $('div', 'abs', p, Object.assign({ opacity: 0, pointerEvents: 'none', [vertical ? 'width' : 'height']: '3px', [vertical ? 'top' : 'left']: 0, [vertical ? 'bottom' : 'right']: 0 }, GLOW));
  function maskShot(parent, fill) {
    const wrap = $('div', 'abs', parent, { inset: 0 });
    const sh = $('div', 'abs', wrap, { inset: 0, overflow: 'hidden', clipPath: 'inset(50% 50% 50% 50%)' });
    const body = $('div', 'abs', sh, { inset: 0 }); if (fill) fill(body);
    const h1 = edgeEl(wrap, false), h2 = edgeEl(wrap, false), v1 = edgeEl(wrap, true), v2 = edgeEl(wrap, true);
    const ring = $('div', 'abs', wrap, { borderRadius: '50%', border: '3px solid rgba(255,238,210,.92)', boxShadow: '0 0 26px 8px rgba(255,180,110,.45),inset 0 0 26px 6px rgba(255,180,110,.25)', opacity: 0, pointerEvents: 'none' });
    wrap.body = body; wrap.clip = sh;
    wrap.set = (type, o = {}) => {
      const open = clamp(o.open ?? 1), edge = o.edge ?? 1, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
      [h1, h2, v1, v2, ring].forEach(e => e.style.opacity = 0);
      if (type === 'none' || open <= 0) { sh.style.clipPath = 'inset(50% 50% 50% 50%)'; return }
      if (type === 'full') { sh.style.clipPath = 'none'; return }
      if (type === 'slitH') {
        const h = open * (o.size ?? 240), a = cy - h / 2, b = cy + h / 2;
        sh.style.clipPath = `inset(${a.toFixed(1)}px 0 ${(H - b).toFixed(1)}px 0)`;
        h1.style.top = (a - 1.5) + 'px'; h2.style.top = (b - 1.5) + 'px'; h1.style.opacity = h2.style.opacity = edge;
      } else if (type === 'slitV') {
        const w = open * (o.size ?? 300), a = cx - w / 2, b = cx + w / 2;
        sh.style.clipPath = `inset(0 ${(W - b).toFixed(1)}px 0 ${a.toFixed(1)}px)`;
        v1.style.left = (a - 1.5) + 'px'; v2.style.left = (b - 1.5) + 'px'; v1.style.opacity = v2.style.opacity = edge;
      } else if (type === 'iris') {
        const r = open * (o.size ?? 420);
        sh.style.clipPath = `circle(${r.toFixed(1)}px at ${cx}px ${cy}px)`;
        Object.assign(ring.style, { left: (cx - r) + 'px', top: (cy - r) + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: edge });
      } else if (type === 'rect') {
        const w = open * (o.size ?? 700), h = w * (o.aspect ?? 1.25);
        sh.style.clipPath = `inset(${(cy - h / 2).toFixed(1)}px ${(W - cx - w / 2).toFixed(1)}px ${(H - cy - h / 2).toFixed(1)}px ${(cx - w / 2).toFixed(1)}px round ${o.radius ?? 0}px)`;
      }
    };
    return wrap;
  }
  function letterbox(parent, bar = 300) {
    const t = $('div', 'abs', parent, { left: 0, right: 0, top: 0, height: bar + 'px', background: '#000', transformOrigin: '50% 0', zIndex: 30 });
    const b = $('div', 'abs', parent, { left: 0, right: 0, bottom: 0, height: bar + 'px', background: '#000', transformOrigin: '50% 100%', zIndex: 30 });
    return { set: p => { t.style.transform = b.style.transform = `scaleY(${clamp(p).toFixed(4)})` } };
  }
  function lightLine(parent) {
    const l = $('div', 'abs', parent, Object.assign({ left: 0, right: 0, height: '3px', transformOrigin: '50% 50%', opacity: 0 }, GLOW));
    return { set: (p, cy = H / 2) => { l.style.top = (cy - 1.5) + 'px'; l.style.transform = `scaleX(${clamp(p).toFixed(4)})`; l.style.opacity = p > 0 ? 1 : 0 } };
  }
  Object.assign(AD, { maskShot, letterbox, lightLine });
})();
