/* uikit components: consistent icon set, glass surfaces, and designed "floating" UI cards for app-ad reels.
 * Theme via ad.config.json → "ui": {ink, paper, accent, muted, sans, mono, serif, you} (all optional).
 * Every builder returns an element with a fixed width and no position; wrap/position it yourself.
 *   AD.icon(name, size, color, stroke)            → SVG string. names: clock pin walk flame bookmark heart check star calendar arrow users signal battery wifi
 *   AD.glass('light'|'dark', {blur})               → style object (layered highlight + two-level shadow)
 *   AD.ui.dateTile / mapCard / availability / social / toast / chip / iconButton
 */
(() => {
  const { $ } = AD;
  const U = Object.assign({ ink: '#1c1512', paper: '#fbf7f2', accent: '#8a6436', muted: 'rgba(28,21,18,.52)', you: '#2f7cf6',
    sans: "'IT',system-ui,sans-serif", mono: "'SG',ui-monospace,monospace", serif: "'IS',Georgia,serif" }, AD.C.ui || {});
  const I = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.8-6-6.8-11.3a6.8 6.8 0 0 1 13.6 0C18.8 15 12 21 12 21z"/><circle cx="12" cy="9.7" r="2.4"/>',
    walk: '<circle cx="13.2" cy="4.4" r="1.7"/><path d="M9.6 21l2.3-6.6 3 2.6V21M7.8 12.2l2.6-4.3 3.4 1.1 2.4 3.4M11.9 14.4 10.9 8.8"/>',
    flame: '<path d="M12 21c3.9 0 6.4-2.6 6.4-6.2 0-3.4-2.3-5.4-3.8-7.3-.3 2-1.2 3-2.3 3.6.4-3-1-5.8-3.5-7.6.2 3.2-1.4 5-2.8 6.7-1.3 1.6-2.4 3.1-2.4 4.6C5.6 18.4 8.1 21 12 21z"/>',
    bookmark: '<path d="M6.8 3.8h10.4v16.6L12 16.6l-5.2 3.8z"/>',
    heart: '<path d="M12 19.6s-7.3-4.4-7.3-9.7A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.3 2.6c0 5.3-7.3 9.7-7.3 9.7z"/>',
    check: '<path d="M5.5 12.6l4.2 4.2 8.8-9.3"/>',
    star: '<path d="M12 3.8l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.8l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z"/>',
    calendar: '<rect x="3.8" y="5.2" width="16.4" height="15" rx="3"/><path d="M3.8 9.8h16.4M8.2 3.2v4M15.8 3.2v4"/>',
    arrow: '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.6a3.1 3.1 0 0 1 0 6M17.5 14.4a5.4 5.4 0 0 1 3 5.1"/>',
    signal: '<path d="M4 18h1.5M8.5 18v-3M12.5 18v-6.5M16.5 18V8M20.5 18V4.5" stroke-width="2.6"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.8 12.5a9.2 9.2 0 0 1 12.4 0M9.2 16a4.4 4.4 0 0 1 5.6 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="3"/><rect x="4.6" y="9.1" width="11.5" height="5.8" rx="1.4" fill="currentColor" stroke="none"/><path d="M21.5 10.5v3" stroke-width="2.4"/>'
  };
  const icon = (n, s = 28, c = 'currentColor', w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" color="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:0 0 auto">${I[n] || ''}</svg>`;
  const glass = (tone = 'light', { blur = 0 } = {}) => {
    const g = tone === 'light'
      ? { background: 'linear-gradient(180deg,rgba(255,253,250,.94),rgba(248,243,236,.88))', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.95),inset 0 0 0 1px rgba(255,255,255,.6),inset 0 -1.5px 0 rgba(28,21,18,.05),0 36px 60px -14px rgba(30,14,6,.42),0 12px 22px -8px rgba(30,14,6,.22)' }
      : { background: 'linear-gradient(180deg,rgba(44,36,31,.92),rgba(24,19,16,.94))', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.07),0 30px 60px -14px rgba(0,0,0,.55),0 10px 18px -8px rgba(0,0,0,.35)' };
    if (blur) Object.assign(g, { backdropFilter: `blur(${blur}px) saturate(1.4)`, WebkitBackdropFilter: `blur(${blur}px) saturate(1.4)` });
    return g;
  };
  const el = (tag, parent, style, html) => { const e = $(tag, '', parent, style); if (html != null) e.innerHTML = html; return e };
  const shade = (hex, k) => { const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)); return `rgb(${a.join(',')})` };

  const ui = {
    /** calendar block + title + time */
    dateTile({ day = 'VIN', num = '02', title = 'Diseară', sub = '20:30 – 23:30', accent = U.accent, width = 390 } = {}) {
      const c = el('div', null, Object.assign({ width: width + 'px', padding: '18px', borderRadius: '32px', display: 'flex', alignItems: 'center', gap: '20px', boxSizing: 'border-box' }, glass()));
      const b = el('div', c, { width: '96px', height: '100px', borderRadius: '24px', background: `linear-gradient(160deg,${shade(accent, .12)},${shade(accent, -.25)})`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)', flex: '0 0 auto' });
      el('div', b, { font: `600 17px ${U.mono}`, letterSpacing: '.16em', opacity: .85 }, day);
      el('div', b, { font: `700 48px ${U.sans}`, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }, num);
      const r = el('div', c, { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 });
      el('div', r, { font: `650 34px ${U.sans}`, color: U.ink, letterSpacing: '-.025em', whiteSpace: 'nowrap' }, title);
      el('div', r, { display: 'flex', alignItems: 'center', gap: '8px', font: `500 21px ${U.mono}`, color: U.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }, icon('clock', 22, U.muted) + `<span>${sub}</span>`);
      return c;
    },
    /** stylised map snippet with walking route */
    mapCard({ eta = '8 min pe jos', area = 'Centru', accent = U.accent, width = 350 } = {}) {
      const h = 190;
      const c = el('div', null, Object.assign({ width: width + 'px', borderRadius: '34px', overflow: 'hidden', boxSizing: 'border-box' }, glass()));
      const m = el('div', c, { position: 'relative', height: h + 'px', margin: '10px 10px 0', borderRadius: '26px', overflow: 'hidden', background: '#efe8dd' });
      const W = width - 20;
      m.innerHTML = `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" style="position:absolute;inset:0">
        <path d="M-10 ${h * .72} C ${W * .25} ${h * .55} ${W * .45} ${h * .95} ${W * .7} ${h * .7} S ${W + 20} ${h * .45} ${W + 20} ${h * .5}" fill="none" stroke="#bcd5e0" stroke-width="18" stroke-linecap="round"/>
        <rect x="${W * .62}" y="${h * .08}" width="${W * .3}" height="${h * .34}" rx="22" fill="#d7e3c6"/>
        <g stroke="#fff" stroke-linecap="round" fill="none"><path d="M-10 ${h * .3} L ${W + 10} ${h * .18}" stroke-width="11"/><path d="M${W * .3} -10 L ${W * .38} ${h + 10}" stroke-width="11"/><path d="M-10 ${h * .9} L ${W + 10} ${h * .98}" stroke-width="7"/><path d="M${W * .72} -10 L ${W * .6} ${h + 10}" stroke-width="7"/><path d="M${W * .05} ${h * .55} L ${W * .95} ${h * .4}" stroke-width="5"/></g>
        <path d="M${W * .18} ${h * .78} C ${W * .3} ${h * .6} ${W * .36} ${h * .42} ${W * .5} ${h * .38} S ${W * .7} ${h * .3} ${W * .76} ${h * .26}" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 12"/>
      </svg>`;
      el('div', m, { position: 'absolute', left: (W * .18 - 22) + 'px', top: (h * .78 - 22) + 'px', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(47,124,246,.22)' });
      el('div', m, { position: 'absolute', left: (W * .18 - 10) + 'px', top: (h * .78 - 10) + 'px', width: '20px', height: '20px', borderRadius: '50%', background: U.you, boxShadow: '0 0 0 4px #fff,0 4px 8px rgba(0,0,0,.25)' });
      const pinEl = el('div', m, { position: 'absolute', left: (W * .76 - 24) + 'px', top: (h * .26 - 50) + 'px', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.25))' });
      pinEl.innerHTML = `<svg width="48" height="56" viewBox="0 0 24 28"><path d="M12 27s-9.5-8.3-9.5-15.6a9.5 9.5 0 0 1 19 0C21.5 18.7 12 27 12 27z" fill="${accent}" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="11.5" r="3.6" fill="#fff"/></svg>`;
      const r = el('div', c, { display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px 20px' });
      el('div', r, { width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(28,21,18,.06)', display: 'grid', placeItems: 'center' }, icon('walk', 26, U.ink));
      const t = el('div', r, { display: 'flex', flexDirection: 'column', gap: '3px' });
      el('div', t, { font: `650 28px ${U.sans}`, color: U.ink, letterSpacing: '-.02em', whiteSpace: 'nowrap' }, eta);
      el('div', t, { font: `500 18px ${U.mono}`, color: U.muted, letterSpacing: '.12em', whiteSpace: 'nowrap' }, area.toUpperCase());
      return c;
    },
    /** scarcity: title + segmented bar */
    availability({ title = 'Mai sunt 3 mese', sub = 'PENTRU 20:30', filled = 7, total = 10, accent = U.accent, width = 380 } = {}) {
      const c = el('div', null, Object.assign({ width: width + 'px', padding: '22px 24px', borderRadius: '32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '14px' }, glass()));
      const r = el('div', c, { display: 'flex', alignItems: 'center', gap: '12px' });
      el('div', r, { width: '46px', height: '46px', borderRadius: '50%', background: shade(accent, .82), display: 'grid', placeItems: 'center' }, icon('flame', 26, shade(accent, -.15)));
      el('div', r, { font: `650 30px ${U.sans}`, color: U.ink, letterSpacing: '-.025em', whiteSpace: 'nowrap' }, title);
      const bar = el('div', c, { display: 'flex', gap: '6px' });
      const segs = []; for (let i = 0; i < total; i++) segs.push(el('div', bar, { flex: '1', height: '10px', borderRadius: '5px', background: i < filled ? accent : 'rgba(28,21,18,.1)' }));
      el('div', c, { font: `500 18px ${U.mono}`, color: U.muted, letterSpacing: '.12em' }, sub);
      c.segs = segs; return c;
    },
    /** social proof: avatar stack + line */
    social({ lead = 'Ana și încă 12', line = 'au salvat asta azi', initials = ['A', 'M', 'I', 'R'], width = 400 } = {}) {
      const c = el('div', null, Object.assign({ width: width + 'px', padding: '18px 24px 18px 18px', borderRadius: '36px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '16px' }, glass()));
      const st = el('div', c, { display: 'flex', flex: '0 0 auto' });
      const tones = [['#e9b48a', '#b76e45'], ['#c7a0d8', '#7d5a99'], ['#9cc6b0', '#4f8a6e'], ['#f0c86a', '#b48222']];
      initials.forEach((n, i) => el('div', st, { width: '54px', height: '54px', borderRadius: '50%', marginLeft: i ? '-16px' : 0, background: `linear-gradient(145deg,${tones[i % 4][0]},${tones[i % 4][1]})`, boxShadow: '0 0 0 3.5px #fbf7f2', display: 'grid', placeItems: 'center', font: `650 22px ${U.sans}`, color: 'rgba(255,255,255,.95)' }, n));
      const t = el('div', c, { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 });
      el('div', t, { font: `650 26px ${U.sans}`, color: U.ink, letterSpacing: '-.02em', whiteSpace: 'nowrap' }, lead);
      el('div', t, { font: `500 21px ${U.sans}`, color: U.muted, whiteSpace: 'nowrap' }, line);
      return c;
    },
    /** dark confirmation toast */
    toast({ title = 'Salvat în <i>Seara ta</i>', action = 'VEZI LISTA', accent = U.accent, width = 460 } = {}) {
      const c = el('div', null, Object.assign({ width: width + 'px', padding: '16px 22px 16px 16px', borderRadius: '30px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '16px' }, glass('dark')));
      el('div', c, { width: '52px', height: '52px', borderRadius: '18px', background: `linear-gradient(160deg,${shade(accent, .15)},${shade(accent, -.2)})`, display: 'grid', placeItems: 'center', flex: '0 0 auto', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)' }, icon('bookmark', 26, '#fff', 2.2));
      const t = el('div', c, { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 });
      el('div', t, { font: `600 25px ${U.sans}`, color: '#fbf7f2', whiteSpace: 'nowrap' }, title.replace('<i>', `<i style="font:italic 400 29px ${U.serif}">`));
      el('div', t, { display: 'flex', alignItems: 'center', gap: '6px', font: `500 16px ${U.mono}`, color: 'rgba(251,247,242,.6)', letterSpacing: '.14em' }, `<span>${action}</span>` + icon('arrow', 16, 'rgba(251,247,242,.6)'));
      return c;
    },
    /** small glass chip with icon (on photos) */
    chip(text, { ic = 'pin', tone = 'light', size = 22, blur = 14 } = {}) {
      const light = tone === 'light';
      return el('div', null, { display: 'inline-flex', alignItems: 'center', gap: size * .35 + 'px', padding: `${size * .5}px ${size * .75}px`, borderRadius: '100px', font: `600 ${size}px ${U.sans}`, color: light ? U.ink : '#fbf7f2', whiteSpace: 'nowrap', background: light ? 'rgba(255,252,248,.82)' : 'rgba(20,15,12,.42)', backdropFilter: `blur(${blur}px) saturate(1.4)`, WebkitBackdropFilter: `blur(${blur}px) saturate(1.4)`, boxShadow: light ? 'inset 0 1px 0 rgba(255,255,255,.9),0 6px 14px rgba(0,0,0,.14)' : 'inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.12)' }, (ic ? icon(ic, size * 1.05, light ? U.ink : '#fbf7f2') : '') + `<span>${text}</span>`);
    },
    /** round glass icon button (on photos) */
    iconButton(ic, { size = 60, tone = 'dark' } = {}) {
      const light = tone === 'light';
      return el('div', null, { width: size + 'px', height: size + 'px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: light ? 'rgba(255,252,248,.85)' : 'rgba(20,15,12,.38)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: light ? '0 6px 14px rgba(0,0,0,.14)' : 'inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px rgba(255,255,255,.14)' }, icon(ic, size * .44, light ? U.ink : '#fbf7f2', 2.1));
    },
    /** iOS-like status bar row (time left, icons right) */
    statusBar(parent, { time = '20:14', color = U.ink } = {}) {
      const s = el('div', parent, { position: 'absolute', left: '40px', right: '34px', top: '26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, color });
      el('div', s, { font: `650 24px ${U.sans}`, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }, time);
      el('div', s, { display: 'flex', gap: '8px', alignItems: 'center' }, icon('signal', 24, color, 2) + icon('wifi', 24, color, 2) + icon('battery', 30, color, 1.8));
      return s;
    }
  };
  Object.assign(AD, { icon, glass, ui, UI: U });
})();
