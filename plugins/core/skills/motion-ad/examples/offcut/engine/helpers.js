/* OFFCUT-only helpers: the hero shoe and the fabric swatches it is cut from.
 * Listed as "helpers.js" in ad.config.json components, after core + collage.
 */
(() => {
  const { grp, N, NOISE, MOTTLE, SPECK, P, TX } = AD;
  const INK = P.ink, PAPER = P.paper, RED = P.red, KRAFT = P.kraft, GRAY = P.gray, DENIM = P.denim;

  /* fabric backgrounds for the scraps (CSS); stripes/grid/cork/half/kraft come from TX */
  const FAB = {
    denim: `${N},repeating-linear-gradient(45deg,rgba(236,228,211,.17) 0 2px,transparent 2px 7px),${DENIM}`,
    laces: `${N},repeating-linear-gradient(-32deg,${PAPER} 0 7px,transparent 7px 30px),${INK}`,
    ...TX
  };

  /* the same materials as SVG patterns, for the shoe panels */
  const PATS = ['stripes', 'half', 'kraft', 'denim', 'grid', 'cork', 'cream', 'laces'];
  let SHOE_N = 0;
  function shoeSVG(notes) {
    const p = 's' + (SHOE_N++) + '_';
    // the upper is drawn short and stretched 1.42x upward from the sole line (y=400)
    const Y = y => 400 - (400 - y) * 1.42;
    const sy = d => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => a + ' ' + Y(+b).toFixed(1));
    const NI = `<image href="${NOISE}" width="256" height="256" opacity="1"/>`;
    const defs = `
  <pattern id="${p}stripes" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><rect width="46" height="46" fill="${PAPER}"/><rect x="16" width="9" height="46" fill="${INK}"/><rect x="30" width="3" height="46" fill="${RED}"/>${NI}</pattern>
  <pattern id="${p}half" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><rect width="13" height="13" fill="${RED}"/><circle cx="6.5" cy="6.5" r="3.4" fill="${INK}"/></pattern>
  <pattern id="${p}kraft" width="256" height="256" patternUnits="userSpaceOnUse"><rect width="256" height="256" fill="${KRAFT}"/><image href="${MOTTLE}" width="256" height="256"/>${NI}</pattern>
  <pattern id="${p}denim" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${DENIM}"/><rect width="2.2" height="8" fill="rgba(236,228,211,.2)"/></pattern>
  <pattern id="${p}grid" width="19" height="19" patternUnits="userSpaceOnUse"><rect width="19" height="19" fill="${GRAY}"/><path d="M0 .8H19M.8 0V19" stroke="#8d897f" stroke-width="1.6"/></pattern>
  <pattern id="${p}cork" width="140" height="140" patternUnits="userSpaceOnUse"><rect width="140" height="140" fill="#c49b6a"/><image href="${SPECK}" width="140" height="140"/></pattern>
  <pattern id="${p}cream" width="256" height="256" patternUnits="userSpaceOnUse"><rect width="256" height="256" fill="${PAPER}"/>${NI}</pattern>
  <pattern id="${p}laces" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)"><rect width="30" height="30" fill="${INK}"/><rect width="7" height="30" fill="${PAPER}"/></pattern>`;
    const up = sy('M80 398 C60 330 66 250 122 196 C170 186 220 180 262 190 C300 205 335 225 372 232 L430 150 C455 138 500 136 528 146 L560 275 C620 290 670 302 720 312 C800 338 880 350 930 368 C962 380 972 398 962 410 Z');
    const mid = 'M70 396 L964 408 C976 424 973 441 960 451 L78 447 C65 432 64 412 70 396 Z';
    const out = 'M78 447 L960 451 C969 463 959 476 940 478 L98 476 C80 474 71 461 78 447 Z';
    const tab = sy('M118 204 L106 150 C110 139 128 136 137 145 L152 194 Z');
    const tng = sy('M372 232 L430 150 C455 138 500 136 528 146 L560 275 Z');
    const O = `stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"`;
    let eyelets = '', laces = '';
    [400, 452, 504, 556, 608, 660].forEach((x, i) => {
      const y = Y(232 + (x - 372) * .23 + 9);
      eyelets += `<circle cx="${x}" cy="${y}" r="5.5" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;
      if (i < 4) laces += `<path d="M${x} ${y} L${x + 40} ${y - 80}" stroke="${INK}" stroke-width="19" stroke-linecap="round"/><path d="M${x} ${y} L${x + 40} ${y - 80}" stroke="${PAPER}" stroke-width="10" stroke-linecap="round"/>`;
    });
    const bow = sy('M470 186 C430 126 380 156 420 196 M478 186 C470 116 530 116 505 182');
    laces += `<path d="${bow}" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="${bow}" fill="none" stroke="${PAPER}" stroke-width="9" stroke-linecap="round"/>`;
    const ST = `fill="none" stroke="${PAPER}" stroke-width="3.5" stroke-dasharray="11 7" stroke-linecap="round" opacity=".95"`;
    const tread = 'M110 466' + ' l14 -9 l14 9'.repeat(29);
    const note = (x, y, word, d) => `<g class="note"><text x="${x}" y="${y}" text-anchor="middle">${word}</text><path d="${d}" fill="none" stroke="${RED}" stroke-width="8" stroke-linecap="round"/></g>`;
    const svg = `<svg viewBox="0 0 1000 520" width="100%" height="100%" style="overflow:visible;display:block">
  <defs>${defs}</defs>
  <g class="pg" data-k="sticker"><g fill="#f6f2e9" stroke="#f6f2e9" stroke-width="40" stroke-linejoin="round"><path d="${up}"/><path d="${mid}"/><path d="${out}"/><path d="${tab}"/><path d="${tng}"/></g></g>
  <g class="pg" data-k="out"><path d="${out}" fill="${INK}" ${O}/><path d="${tread}" fill="none" stroke="${PAPER}" stroke-width="2.5" opacity=".55"/></g>
  <g class="pg" data-k="mid"><path d="${mid}" fill="url(#${p}cream)" ${O}/><path d="M84 424 L956 432" stroke="${RED}" stroke-width="11"/></g>
  <g class="pg" data-k="tongue"><path d="${tng}" data-f="grid" fill="url(#${p}grid)" ${O}/></g>
  <g class="pg" data-k="heel"><path d="${sy('M80 398 C60 330 66 250 122 196 C150 190 185 184 215 182 C228 250 236 320 250 400 Z')}" data-f="kraft" fill="url(#${p}kraft)" ${O}/><path d="${sy('M204 192 C216 256 224 322 236 396')}" ${ST}/></g>
  <g class="pg" data-k="quarter"><path d="${sy('M215 182 C240 182 252 184 262 190 C300 205 335 225 372 232 L560 275 C560 310 575 350 600 404 L250 400 C236 320 228 250 215 182 Z')}" data-f="stripes" fill="url(#${p}stripes)" ${O}/><path d="${sy('M228 196 C300 214 340 240 380 246')}" ${ST}/></g>
  <g class="pg" data-k="vamp"><path d="${sy('M560 275 C620 290 670 302 720 312 C760 324 790 332 815 338 C790 360 775 385 770 406 L600 404 C575 350 560 310 560 275 Z')}" data-f="denim" fill="url(#${p}denim)" ${O}/><path d="${sy('M574 290 C574 322 587 358 612 402')}" ${ST}/></g>
  <g class="pg" data-k="toe"><path d="${sy('M815 338 C860 346 900 355 930 368 C962 380 972 398 962 410 L770 406 C775 385 790 360 815 338 Z')}" data-f="half" fill="url(#${p}half)" ${O}/><path d="${sy('M806 348 C786 366 774 386 768 402')}" ${ST}/></g>
  <g class="pg" data-k="eyestay"><path d="${sy('M372 232 L720 312 L716 332 L368 252 Z')}" fill="${INK}" ${O}/>${eyelets}</g>
  <g class="pg" data-k="laces">${laces}</g>
  <g class="pg" data-k="tab"><path d="${tab}" data-f="half" fill="url(#${p}half)" ${O}/></g>
  <g class="pg" data-k="patch"><g transform="translate(0 ${(Y(319) - 319).toFixed(1)}) rotate(-6 355 318)"><rect x="296" y="288" width="118" height="62" fill="url(#${p}cream)" stroke="${INK}" stroke-width="4"/><rect x="303" y="295" width="104" height="48" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 4"/><text x="355" y="332" text-anchor="middle" font-family="Anton" font-size="34" fill="${INK}" letter-spacing="2">OC/01</text></g></g>
  ${notes ? `<g class="notes" font-family="Marker" font-size="50" fill="${RED}">${note(660, -50, 'sailcloth', 'M610 -30 C580 0 555 25 528 62')}${note(740, 130, 'denim ends', 'M725 160 C718 195 708 225 700 258')}${note(215, -60, 'old hide', 'M205 -35 C205 20 185 80 160 150')}</g>` : ''}
  </svg>`;
    return { svg, p };
  }

  /** the OFFCUT 01 sneaker as a group of independently animatable SVG panels.
   * shoe.parts[k] for k in sticker out mid tongue heel quarter vamp toe eyestay laces tab patch;
   * shoe.notes = [{n, pa, t}] marker annotations (only with notes=true). */
  function makeShoe(parent, x, y, w, notes = false) {
    const g = grp(parent, x, y, w, w * .52); const { svg, p } = shoeSVG(notes); g.innerHTML = svg;
    const parts = {};
    g.querySelectorAll('.pg').forEach(n => { n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 50%'; parts[n.dataset.k] = n });
    g.parts = parts; g.pref = p; g.fills = [...g.querySelectorAll('[data-f]')];
    g.notes = [...g.querySelectorAll('.note')].map(n => ({ n, pa: n.querySelector('path'), t: n.querySelector('text') }));
    return g;
  }
  /** re-skin the patterned panels with a material combo, e.g. a shuffled copy of SHOE_PATS */
  function shoeSkin(shoe, combo) { shoe.fills.forEach((f, i) => f.setAttribute('fill', `url(#${shoe.pref}${combo[i % combo.length]})`)) }

  Object.assign(AD, { FAB, SHOE_PATS: PATS, makeShoe, shoeSkin });
})();
