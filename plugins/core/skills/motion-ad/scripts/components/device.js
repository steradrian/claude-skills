/* device components: a generic modern phone drawn in CSS (no vendor trade dress), sharp at any
 * zoom, with real edge thickness under 3D rotation, a glass reflection that moves with the angle,
 * and a screen that shows captured app pages (static, scrolled, or swapped state by state).
 * Requires core.js. Coordinates are stage px; the phone is placed by its centre.
 *
 *   const ph = AD.phone(s.cam, { x: 540, y: 960, w: 620, finish: 'silver' })
 *   const pg = AD.screenPage(ph, AD.assets.placeFull)      // a full-page capture, scrollable
 *   s.render = (t, lt) => { pg.scrollTo(prog(lt, 1, 1.4, 'io') * 1200); ph.pose({ ry: 12, rx: -4, s: 1 }) }
 *
 * Screen content is in capture px (the capture viewport width, 390 by default), scaled to fit.
 */
(() => {
  const { $, place, clamp } = AD;
  const FINISH = {
    silver: { frame: 'linear-gradient(135deg,#f3f3f5 0%,#c9cbd0 22%,#eef0f2 46%,#a9acb2 70%,#e4e5e8 100%)', edge: '#9a9da3', rim: 'rgba(255,255,255,.9)' },
    graphite: { frame: 'linear-gradient(135deg,#5b5d62 0%,#2c2d31 24%,#55575c 48%,#1f2023 72%,#46484d 100%)', edge: '#1a1b1e', rim: 'rgba(255,255,255,.28)' },
    sand: { frame: 'linear-gradient(135deg,#efe6da 0%,#cdbfae 24%,#eadfd1 48%,#b7a794 72%,#e2d7c9 100%)', edge: '#a39380', rim: 'rgba(255,255,255,.8)' },
  };

  $('style', '', document.head).textContent = `
.dv-rig{position:absolute;transform-style:preserve-3d;transform-origin:50% 50%}
.dv-layer{position:absolute;inset:0}
.dv-screen{position:absolute;overflow:hidden;background:#fff;transform:translateZ(1px)}
.dv-page{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.dv-page img{display:block;width:100%;height:auto}
.dv-glass{position:absolute;pointer-events:none;mix-blend-mode:screen;transform:translateZ(2px)}`;

  /** a phone. opts: x, y (centre), w (body width px), finish ('silver'|'graphite'|'sand'),
   * capW/capH (whole screen in capture px, default 390x844), depth (edge px), shadow,
   * safeTop/safeBottom (status bar and home indicator, capture px; default 59 / 34 like a notched
   * iPhone). Pages are captured at the SAFE viewport (390 x 751) and shown in ph.view below the
   * status bar, so nothing the app draws sits under the camera pill.
   * Returns {g, rig, screen, content, view, w, h, sw, sh, k, pose(), status({bg, fg}), glassAt()} */
  function phone(parent, { x = 540, y = 960, w = 620, finish = 'silver', capW = 390, capH = 844, depth = 16, shadow = true, safeTop = 59, safeBottom = 34 } = {}) {
    const F = FINISH[finish] || FINISH.silver;
    const bez = w * .034, gap = w * .012;                       // metal band, then black bezel
    const sw = w - 2 * (bez + gap), sh = sw * capH / capW, h = sh + 2 * (bez + gap);
    const R = w * .155, rS = R - bez - gap * .6, k = sw / capW;
    const g = $('div', 'abs', parent, { perspective: '2400px' }); place(g, x, y, w, h);
    if (shadow) {
      const sd = $('div', 'abs', g, { left: '6%', right: '6%', bottom: `${-h * .05}px`, height: `${h * .08}px`, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(30,25,20,.35),transparent)', filter: 'blur(18px)' });
      g._shadow = sd;
    }
    const rig = $('div', 'dv-rig', g, { inset: 0 });
    // edge thickness: stacked slices behind the face, darkening toward the back
    for (let i = depth; i >= 1; i--) {
      const sl = $('div', 'dv-layer', rig, { borderRadius: R + 'px', background: F.edge, transform: `translateZ(${-i}px)`, filter: `brightness(${(.55 + .45 * (1 - i / depth)).toFixed(2)})` });
      sl.style.boxShadow = i === depth ? '0 40px 80px rgba(20,16,12,.28),0 12px 24px rgba(20,16,12,.2)' : 'none';
    }
    const body = $('div', 'dv-layer', rig, { borderRadius: R + 'px', background: F.frame, boxShadow: `inset 0 0 0 1.5px ${F.rim},inset 0 2px 3px rgba(255,255,255,.6),inset 0 -2px 4px rgba(0,0,0,.25)` });
    // side buttons, drawn on the band
    const btn = (side, top, len) => $('div', 'abs', rig, { [side]: `${-w * .006}px`, top: `${h * top}px`, width: `${w * .012}px`, height: `${h * len}px`, borderRadius: '3px', background: F.frame, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.18)' });
    btn('left', .19, .045); btn('left', .26, .075); btn('left', .35, .075); btn('right', .28, .11);
    const bezel = $('div', 'dv-layer', rig, { inset: `${bez}px`, borderRadius: (R - bez) + 'px', background: '#050505', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' });
    const screen = $('div', 'dv-screen', rig, { left: `${bez + gap}px`, top: `${bez + gap}px`, width: `${sw}px`, height: `${sh}px`, borderRadius: `${rS}px` });
    const content = $('div', 'abs', screen, { left: 0, top: 0, width: `${capW}px`, height: `${capH}px`, transformOrigin: '0 0', transform: `scale(${k})`, background: '#fff' });
    // status bar (time left, signal / wifi / battery right, the pill sits between) and the safe view
    const bar = $('div', 'abs', content, { left: 0, right: 0, top: 0, height: safeTop + 'px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 30px 0 44px', boxSizing: 'border-box', fontFamily: "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif", fontWeight: 600, fontSize: '17px', letterSpacing: '-.01em', zIndex: 30 });
    const clock = $('span', '', bar); clock.textContent = '9:41';
    const icons = $('span', '', bar, { display: 'flex', alignItems: 'center', gap: '6px' });
    icons.innerHTML = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`
      + `<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 11.5l2.3-2.6a3.2 3.2 0 00-4.6 0zM3.6 6.9l1.5 1.6a4.2 4.2 0 015.8 0l1.5-1.6a6.3 6.3 0 00-8.8 0zM.5 3.8L2 5.4a8.6 8.6 0 0112 0l1.5-1.6a10.8 10.8 0 00-15 0z"/></svg>`
      + `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 000-4z" fill="currentColor" opacity=".45"/></svg>`;
    const view = $('div', 'abs', content, { left: 0, top: safeTop + 'px', width: capW + 'px', height: (capH - safeTop - safeBottom) + 'px', overflow: 'hidden' });
    const home = $('div', 'abs', content, { left: 0, right: 0, bottom: 0, height: safeBottom + 'px', zIndex: 30 });
    const homeBar = $('div', 'abs', home, { left: '50%', bottom: '8px', width: '134px', height: '5px', marginLeft: '-67px', borderRadius: '3px', background: '#111' });
    // camera pill (generic), above the content
    const pill = $('div', 'abs', rig, { left: '50%', top: `${bez + gap + sh * .014}px`, width: `${sw * .3}px`, height: `${sw * .085}px`, marginLeft: `${-sw * .15}px`, borderRadius: '999px', background: '#000', transform: 'translateZ(3px)' });
    $('div', 'abs', pill, { right: '18%', top: '28%', width: '0', height: '0', padding: `${sw * .016}px`, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#2a3550,#05070b 60%)' });
    const glass = $('div', 'dv-glass', rig, { left: `${bez + gap}px`, top: `${bez + gap}px`, width: `${sw}px`, height: `${sh}px`, borderRadius: `${rS}px` });
    const o = { g, rig, body, bezel, screen, content, view, pill, glass, w, h, sw, sh, k, capW, capH, safeTop, safeBottom, viewH: capH - safeTop - safeBottom };
    /** status bar and home-area colours: match them to the page top / bottom of the current screen */
    o.status = ({ bg = '#fff', fg = '#111', bottom = bg, indicator = fg } = {}) => {
      bar.style.background = bg; bar.style.color = fg; home.style.background = bottom; homeBar.style.background = indicator;
    };
    o.status();
    /** glare: a soft diagonal band whose position follows the rotation */
    o.glassAt = (ry = 0, rx = 0) => {
      const p = 50 + ry * 2.4 - rx * 1.2;
      glass.style.background = `linear-gradient(115deg,transparent ${p - 28}%,rgba(255,255,255,.16) ${p - 8}%,rgba(255,255,255,.05) ${p + 6}%,transparent ${p + 22}%)`;
    };
    /** pose the phone: rotations in degrees, scale, and an offset from its placed centre */
    o.pose = ({ rx = 0, ry = 0, rz = 0, s = 1, x: dx = 0, y: dy = 0, z = 0 } = {}) => {
      rig.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      o.glassAt(ry, rx);
      if (g._shadow) g._shadow.style.transform = `translateX(${(dx - ry * 3).toFixed(1)}px) scaleX(${(1 - Math.abs(ry) / 140).toFixed(3)})`;
    };
    o.pose();
    return o;
  }

  /* All page-level helpers work in the SAFE VIEW: capture px of a 390 x 751 capture, origin at the
   * top-left of the area under the status bar. */

  /** a captured page inside the safe view. src = data URL of a capture (capture px wide).
   * Returns {el, img, scrollTo(px), setSrc(url)}. scrollTo is in capture px. */
  function screenPage(ph, src, { top = 0 } = {}) {
    const el = $('div', 'dv-page', ph.view, { width: ph.capW + 'px', top: top + 'px' });
    const img = $('img', '', el); img.src = src; img.alt = '';
    // never scroll past the end of the capture (a blank screen reads as a broken page)
    const max = () => img.naturalWidth ? Math.max(0, img.naturalHeight * ph.capW / img.naturalWidth - ph.viewH + top) : Infinity;
    return { el, img, max, scrollTo: px => { el.style.transform = `translate3d(0,${(-Math.min(px, max())).toFixed(2)}px,0)` }, setSrc: u => { if (img.src !== u) img.src = u } };
  }

  /** a sheet that slides up over the screen content (a drawer capture). p 0..1 */
  function screenSheet(ph, src, { radius = 28, dim = .35 } = {}) {
    const scrim = $('div', 'abs', ph.view, { inset: 0, background: '#000', opacity: 0 });
    const el = $('div', 'dv-page', ph.view, { width: ph.capW + 'px', borderRadius: `${radius}px ${radius}px 0 0`, overflow: 'hidden', boxShadow: '0 -10px 40px rgba(0,0,0,.25)' });
    const img = $('img', '', el); img.src = src; img.alt = '';
    return {
      el, img, scrim,
      set: (p, scroll = 0) => {
        const y = ph.viewH * (1 - clamp(p)) - scroll;
        el.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`; el.style.visibility = p > 0 ? 'visible' : 'hidden';
        scrim.style.opacity = (clamp(p) * dim).toFixed(3);
      },
    };
  }

  /** a finger tap at screen point (capture px): a soft ripple that grows and fades. p 0..1 */
  function tapAt(ph, cx, cy) {
    const d = $('div', 'abs', ph.view, { zIndex: 40, left: `${cx - 40}px`, top: `${cy - 40}px`, width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(40,30,20,.28),rgba(40,30,20,.12) 60%,transparent)', opacity: 0, pointerEvents: 'none' });
    return p => { const q = clamp(p); d.style.opacity = q > 0 && q < 1 ? ((1 - q) * .9).toFixed(3) : 0; d.style.transform = `scale(${(.4 + q * 1.1).toFixed(3)})` };
  }

  /** lift a UI element out of the screen. src = an element-level capture (same 3x scale as the page),
   * box = its {x, y, w, h} in capture px on the page. The layer sits exactly over its spot, inside the
   * phone's 3D rig, so it inherits the phone's rotation and can pop toward the camera with translateZ.
   * opts.hole: page colour to fill the gap it leaves (null = no gap), opts.radius: corner radius.
   * Returns {el, set({z, s, x, y, rx, ry, rz, o, lift})}; lift 0..1 drives the shadow and the hole. */
  function lift(ph, src, box, { hole = '#ffffff', radius = 0, scroll = () => 0 } = {}) {
    const inset = (ph.w - ph.sw) / 2;
    const gap = hole ? $('div', 'abs', ph.view, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px', background: hole, borderRadius: radius + 'px', opacity: 0, zIndex: 20 }) : null;
    const el = $('div', 'abs', ph.rig, { left: `${inset + box.x * ph.k}px`, top: `${inset + (ph.safeTop + box.y) * ph.k}px`, width: `${box.w * ph.k}px`, height: `${box.h * ph.k}px`, transformOrigin: '50% 50%', borderRadius: `${radius * ph.k}px`, overflow: 'hidden', opacity: 0 });
    const img = $('img', '', el, { width: '100%', height: '100%', display: 'block' }); img.src = src; img.alt = '';
    return {
      el, gap,
      set: ({ z = 0, s = 1, x = 0, y = 0, rx = 0, ry = 0, rz = 0, o = 1, lift = 0 } = {}) => {
        const dy = -scroll() * ph.k;
        el.style.transform = `translate3d(${x.toFixed(2)}px,${(y + dy).toFixed(2)}px,${(4 + z).toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
        el.style.opacity = clamp(o).toFixed(3);
        const L = clamp(lift);
        el.style.boxShadow = L > 0 ? `0 ${(8 + 50 * L).toFixed(0)}px ${(16 + 90 * L).toFixed(0)}px rgba(30,22,16,${(.12 + .22 * L).toFixed(3)}),0 2px 6px rgba(30,22,16,${(.1 * L).toFixed(3)})` : 'none';
        if (gap) { gap.style.opacity = (L > .02 ? Math.min(1, L * 3) : 0).toFixed(3); gap.style.transform = `translateY(${(-scroll()).toFixed(2)}px)` }
      },
    };
  }

  /** a stage point for a point in the safe view (capture px), given the phone's current pose is flat.
   * Use it to aim the camera (AD.frameOn) at a UI element when diving into the screen. */
  const screenPoint = (ph, px, py, cx, cy) => [cx - ph.sw / 2 + px * ph.k, cy - ph.sh / 2 + (ph.safeTop + py) * ph.k];

  Object.assign(AD, { phone, screenPage, screenSheet, tapAt, lift, screenPoint, PHONE_FINISH: FINISH });
})();
