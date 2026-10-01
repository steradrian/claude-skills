/* =====================================================================
   EMBER — photoreal product reveal (reference film, 52 s, 9:16)
   A phone revealed in the dark; its screen becomes the only light.
   Structure: act one glimpses → line on black → the hit → wake →
   lights out → push into the app → pull back → embossed title.
   ===================================================================== */
/* =====================================================================
   COPY — everything the viewer reads. Swap freely.
   Typing speed and answer streaming stretch to fit whatever length you
   write here; keep the question under ~110 characters and the answer
   under ~40 words so both stay readable at that pace.
   ===================================================================== */
const COPY = {
  line1: 'Every idea starts in the dark.',
  name: 'Ember',
  tagline: 'Bring your ideas to light.',
  cta: 'Coming soon',
  clock: '23:41',
  inputPlaceholder: 'Ask anything',
  question: 'I want to open a tiny bookshop that turns into a jazz bar at night. Where do I start?',
  answerTitle: 'A shop with two lives. Start here:',
  answer: [
    'Find a corner that feels right at noon and at midnight.',
    'Run three pop-up nights before you sign anything.',
    'Collect 50 regulars. They\u2019ll tell you what to stock.'
  ]
};

const { PW, PD, Z_GLASS, LENS } = PHONE;
let dev = null, scr = null, screenLight = null;

const UI_COL = { ink: '#f3eee7', inkDim: 'rgba(243,238,231,0.46)', bubble: '#2a2521', field: '#171412', ember: '#ff9a4d' };
let chatLayout = null;

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function wrapWords(c, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function buildChatLayout() {
  const c = scr.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  const L = {};
  c.font = `400 40px ${FONT}`;
  L.bubbleLines = wrapWords(c, COPY.question, 580);
  L.bubbleW = Math.max(...L.bubbleLines.map((l) => c.measureText(l).width)) + 72;
  L.bubbleH = L.bubbleLines.length * 56 + 52;
  L.bubbleX = 910 - L.bubbleW; L.bubbleY = 300;
  // answer words with absolute positions
  const words = []; let y = L.bubbleY + L.bubbleH + 92;
  L.orbY = y + 22;
  const place = (text, x0, maxW, font, lh, kind) => {
    c.font = font; const lines = wrapWords(c, text, maxW);
    for (const line of lines) {
      let x = x0;
      for (const w of line.split(' ')) { words.push({ w, x, y, font, kind }); x += c.measureText(w + ' ').width; }
      y += lh;
    }
  };
  place(COPY.answerTitle, 136, 740, `600 42px ${FONT}`, 60, 'h');
  y += 30;
  L.numbers = [];
  COPY.answer.forEach((item, i) => {
    L.numbers.push({ n: (i + 1) + '.', y, first: words.length });
    place(item, 190, 690, `400 40px ${FONT}`, 58, 'p');
    y += 26;
  });
  L.words = words; L.answerEnd = y;
  return L;
}

function drawOrb(c, x, y, r, e, time) {
  if (e <= 0.001 || r <= 0.5) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  let g = c.createRadialGradient(x, y, 0, x, y, r * 3.4);
  g.addColorStop(0, `rgba(255,112,36,${0.3 * e})`); g.addColorStop(0.3, `rgba(255,84,24,${0.12 * e})`); g.addColorStop(1, 'rgba(200,50,10,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.4, 0, Math.PI * 2); c.fill();
  g = c.createRadialGradient(x, y, 0, x, y, r * 1.25);
  g.addColorStop(0, `rgba(255,196,128,${0.95 * e})`); g.addColorStop(0.45, `rgba(255,128,48,${0.75 * e})`); g.addColorStop(1, 'rgba(200,50,10,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.25, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 3; i++) {
    const a = time * (0.7 + i * 0.37) + i * 2.1, d = r * (0.22 + 0.08 * Math.sin(time * 1.3 + i));
    const bx = x + Math.cos(a) * d, by = y + Math.sin(a * 1.1) * d, br = r * (0.55 - i * 0.08);
    g = c.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, `rgba(255,226,170,${0.42 * e})`); g.addColorStop(1, 'rgba(255,150,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill();
  }
  g = c.createRadialGradient(x, y, 0, x, y, r * 0.52);
  g.addColorStop(0, `rgba(255,250,242,${e})`); g.addColorStop(0.55, `rgba(255,214,160,${0.85 * e})`); g.addColorStop(1, 'rgba(255,160,80,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 0.52, 0, Math.PI * 2); c.fill();
  c.restore();
}

function drawScreen(c, s, time) {
  const DW = 1000, DH = scr.DH;
  c.fillStyle = '#040302'; c.fillRect(0, 0, DW, DH);

  if (s.mode === 'pulse') {
    drawOrb(c, 500, 1000, 120, s.pulse, time);
  }

  if (s.mode === 'app') {
    const tr = s.tr;
    // ambient warmth rising from the input area
    if (tr > 0) {
      const g = c.createRadialGradient(500, 2150, 0, 500, 2150, 1100);
      g.addColorStop(0, `rgba(255,110,40,${0.1 * tr})`); g.addColorStop(1, 'rgba(255,110,40,0)');
      c.fillStyle = g; c.fillRect(0, 0, DW, DH);
    }
    // status bar
    if (s.status > 0) {
      c.globalAlpha = s.status; c.fillStyle = UI_COL.ink;
      c.font = `600 34px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(COPY.clock, 96, 78);
      for (let i = 0; i < 4; i++) { const h = 10 + i * 6; rr(c, 792 + i * 13, 90 - h, 8, h, 2.5); c.fill(); }
      c.strokeStyle = 'rgba(243,238,231,0.55)'; c.lineWidth = 2.5; rr(c, 862, 65, 56, 26, 8); c.stroke();
      rr(c, 866.5, 69.5, 38, 17, 5); c.fill(); rr(c, 921, 72, 4, 12, 2); c.fill();
      c.globalAlpha = 1;
    }
    // orb travels from center stage to the header
    const et = E.inOut(tr);
    const ox = lerp(500, 110, et), oy = lerp(960, 196, et), orad = lerp(s.orbR, 21, et);
    const think = s.think || 0;
    drawOrb(c, ox, oy, orad * (1 + 0.04 * Math.sin(time * 2.2) + 0.25 * think), s.orbE * (1 + 0.5 * think), time);
    if (s.word > 0 && tr < 1) {
      c.globalAlpha = s.word * (1 - clamp(tr * 2.2)); c.fillStyle = UI_COL.ink;
      c.font = `600 76px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(COPY.name, 500, 1250); c.globalAlpha = 1;
    }
    if (tr > 0) {
      const L = chatLayout;
      // header
      c.globalAlpha = clamp(tr * 1.6 - 0.6); c.fillStyle = UI_COL.ink; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = `600 40px ${FONT}`; c.fillText(COPY.name, 150, 198);
      c.strokeStyle = 'rgba(243,238,231,0.5)'; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(852, 186); c.lineTo(902, 186); c.moveTo(852, 210); c.lineTo(888, 210); c.stroke();
      c.globalAlpha = 1;

      // input field
      const inA = clamp(tr * 2 - 1), inY = (1 - E.out(clamp(tr * 2 - 1))) * 90;
      const typedText = COPY.question.slice(0, s.typed);
      const showTyped = s.sent < 0.02 ? typedText : '';
      c.font = `400 40px ${FONT}`;
      const inLines = showTyped ? wrapWords(c, showTyped, 650) : [''];
      const fieldH = Math.max(112, inLines.length * 56 + 56), bottom = 1986 + inY, top = bottom - fieldH;
      c.globalAlpha = inA;
      rr(c, 72, top, 856, fieldH, 56); c.fillStyle = UI_COL.field; c.fill();
      c.strokeStyle = 'rgba(243,238,231,0.08)'; c.lineWidth = 2; c.stroke();
      c.textBaseline = 'top'; c.textAlign = 'left';
      if (showTyped) {
        c.fillStyle = UI_COL.ink;
        inLines.forEach((l, i) => c.fillText(l, 122, top + 30 + i * 56));
      } else {
        c.fillStyle = UI_COL.inkDim; c.fillText(COPY.inputPlaceholder, 122, top + 30);
      }
      // caret
      const caretOn = s.caret && (s.typing || Math.floor(time * 1.8) % 2 === 0);
      if (caretOn && s.sent < 0.02) {
        const last = inLines[inLines.length - 1];
        const cx = 122 + (showTyped ? c.measureText(last).width + 4 : 0), cy = top + 28 + (inLines.length - 1) * 56;
        c.fillStyle = UI_COL.ember; rr(c, cx, cy, 3.5, 48, 1.5); c.fill();
      }
      // send / mic button
      const bx = 862, by = bottom - 56, active = s.typed > 0 && s.sent < 0.02;
      c.beginPath(); c.arc(bx, by, 38, 0, Math.PI * 2);
      c.fillStyle = active ? UI_COL.ink : 'rgba(243,238,231,0.1)'; c.fill();
      c.lineWidth = 4.5; c.lineCap = 'round'; c.lineJoin = 'round';
      if (active) {
        c.strokeStyle = '#0b0908'; c.beginPath(); c.moveTo(bx, by + 16); c.lineTo(bx, by - 16); c.moveTo(bx - 13, by - 3); c.lineTo(bx, by - 16); c.lineTo(bx + 13, by - 3); c.stroke();
      } else {
        c.strokeStyle = 'rgba(243,238,231,0.75)'; rr(c, bx - 8, by - 20, 16, 28, 8); c.stroke();
        c.beginPath(); c.arc(bx, by - 2, 16, 0.15 * Math.PI, 0.85 * Math.PI); c.moveTo(bx, by + 14); c.lineTo(bx, by + 21); c.stroke();
      }
      c.globalAlpha = 1;

      // home indicator
      c.globalAlpha = inA; c.fillStyle = 'rgba(243,238,231,0.5)'; rr(c, 360, 2040, 280, 10, 5); c.fill(); c.globalAlpha = 1;

      // user bubble flies from the field to the thread
      if (s.sent > 0) {
        const p = E.out(s.sent);
        const bxp = lerp(100, L.bubbleX, p), byp = lerp(top, L.bubbleY, p);
        c.globalAlpha = clamp(s.sent * 3);
        rr(c, bxp, byp, L.bubbleW, L.bubbleH, 44); c.fillStyle = UI_COL.bubble; c.fill();
        c.fillStyle = UI_COL.ink; c.font = `400 40px ${FONT}`; c.textBaseline = 'top';
        L.bubbleLines.forEach((l, i) => c.fillText(l, bxp + 36, byp + 26 + i * 56));
        c.globalAlpha = 1;
      }
      // answer
      if (s.stream > 0 || think > 0) {
        drawOrb(c, 100, L.orbY, 13 * (1 + 0.35 * think), 0.9 * clamp(s.stream + think * 2), time * 1.6);
      }
      if (s.stream > 0) {
        c.textBaseline = 'top'; c.textAlign = 'left';
        for (const nb of L.numbers) {
          const a = clamp(s.stream - nb.first);
          if (a > 0) { c.globalAlpha = a; c.fillStyle = UI_COL.inkDim; c.font = `500 40px ${FONT}`; c.fillText(nb.n, 136, nb.y); }
        }
        L.words.forEach((wd, i) => {
          const a = clamp(s.stream - i);
          if (a <= 0) return;
          c.globalAlpha = a; c.font = wd.font; c.fillStyle = UI_COL.ink;
          if (a < 1) { c.shadowColor = 'rgba(255,150,70,0.9)'; c.shadowBlur = 22 * (1 - a) + 4; }
          c.fillText(wd.w, wd.x, wd.y);
          c.shadowBlur = 0; c.shadowColor = 'transparent';
        });
        c.globalAlpha = 1;
      }
    }
  }
}
function drawPunchHole(c) {
  c.beginPath(); c.arc(500, 76, 17, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = 'rgba(40,44,52,0.9)'; c.lineWidth = 2; c.stroke();
}

const offK = (t, t0) => (t < t0 ? 1 : Math.exp(-(t - t0) * 22));

const Q_LEN = COPY.question.length;

function phonePosAt(t) { return [0, 0.95 + 0.006 * Math.sin(t * 0.8), 0]; }
function phoneYawAt(t) {
  if (t < 25.5) return lerp(2.65, 0.3, E.inOut(seg(t, 17.2, 25.5)));
  if (t < 30.5) return lerp(0.3, 0.12, E.sine(seg(t, 25.5, 30.5)));
  if (t < 33.0) return lerp(0.12, 0.0, E.inOut(seg(t, 30.5, 33.0)));
  if (t < 42.5) return 0;
  return lerp(0, -0.34, E.inOut(seg(t, 42.5, 47.8))) - 0.06 * seg(t, 47.8, 52);
}
function revealCam(t) {
  const p = E.sine(seg(t, 17.2, 30.5));
  return { pos: vlerp(V3([0.42, 0.52, 5.0]), V3([0.12, 0.74, 3.85]), p), tgt: vlerp(V3([0, 0.82, 0]), V3([0, 0.86, 0]), p) };
}
function chatCam(t, m) {
  const y = lerp(-0.26, 0.154, E.inOut(seg(t, 36.3, 37.4)));
  const d = lerp(2.3, 2.2, seg(t, 33, 42.5));
  const x = 0.016 * Math.sin((t - 33) * 0.5);
  return { pos: W3(m, [x, y + 0.01, Z_GLASS + d]), tgt: W3(m, [x * 0.3, y, Z_GLASS]) };
}
const END_POS = V3([0.26, 1.12, 5.3]), END_TGT = V3([0, 1.34, 0]);

function filmState(t, S) {
  Object.assign(S, { phoneVisible: true, phonePos: phonePosAt(t), yaw: 0, pitch: 0, roll: 0, screenI: 0, screenLight: 0, ui: { mode: 'off', time: t }, bloom: 0.4, bloomThreshold: 0.9, grain: 0.05, vignette: 0.45, ca: 0.012 });

  if (t < 13.0) {
    // ---------- ACT ONE: glimpses in the dark ----------
    const m = poseMatrix(S.phonePos, 0);
    S.phonePos = [0, 0.95, 0];
    if (t < 4.6) {
      const p = seg(t, 0, 4.6);
      S.camPos = W3(m, mix3([0.52, 0.93, 0.3], [0.47, 0.885, 0.255], E.sine(p)));
      S.camTarget = W3(m, [0.3, 0.69, 0.035]); S.fov = 26;
      S.focusPoint = S.camTarget; S.aperture = 6; S.maxCoC = 0.02;
      const sx = lerp(-0.7, 1.7, E.inOut(seg(t, 0.6, 4.5)));
      S.lights.strip = { i: 26 * sm(t, 0.5, 1.6), pos: W3(m, [sx, 1.25, 0.95]), look: W3(m, [0.3, 0.68, 0]), w: 0.035, h: 2.2 };
      S.env = 0.02;
    } else if (t < 7.4) {
      const p = seg(t, 4.6, 7.4);
      S.camPos = W3(m, mix3([0.5, 0.0, 0.2], [0.49, 0.05, 0.175], E.sine(p)));
      S.camTarget = W3(m, [0.36, 0.26, 0]); S.fov = 24;
      S.focusPoint = W3(m, [PW / 2 + 0.004, 0.25, 0]); S.aperture = 6; S.maxCoC = 0.02;
      S.lights.strip = { i: 7, pos: W3(m, [1.1, lerp(1.2, -0.6, E.inOut(seg(t, 4.7, 7.3))), 0.4]), look: W3(m, [0.36, 0.25, 0]), w: 2.4, h: 0.03 };
      S.env = 0.025;
    } else if (t < 10.2) {
      const p = seg(t, 7.4, 10.2);
      S.camPos = W3(m, mix3([0.37, 0.33, -0.98], [0.31, 0.42, -0.8], E.sine(p)));
      S.camTarget = W3(m, [0.205, 0.555, -0.05]); S.fov = 22;
      S.focusPoint = W3(m, LENS); S.aperture = 7; S.maxCoC = 0.022;
      S.lights.strip = { i: 3, pos: W3(m, [1.0, lerp(1.1, 0.1, E.inOut(p)), -0.35]), look: W3(m, LENS), w: 1.2, h: 0.03 };
      S.lights.glint = { i: 90, pos: W3(m, [lerp(-0.3, 0.42, E.inOut(seg(t, 7.6, 10.1))), 0.86, -1.0]), look: W3(m, LENS) };
      S.env = 0.3;
    } else {
      const p = seg(t, 10.2, 13.0);
      S.camPos = W3(m, mix3([-0.1, -0.99, 0.105], [-0.07, -0.92, 0.088], E.sine(p)));
      S.camTarget = W3(m, [0.02, 0.1, Z_GLASS]); S.fov = 28;
      S.focusPoint = W3(m, [0, -0.42, Z_GLASS]); S.aperture = 5; S.maxCoC = 0.02;
      S.lights.strip = { i: 4, pos: W3(m, [0, 1.7, lerp(0.55, 0.08, E.inOut(seg(t, 10.3, 12.9)))]), look: W3(m, [0, 0, Z_GLASS]), w: 1.1, h: 0.03 };
      const pulse = bump(t, 11.6, 26, 3.4) + 0.7 * bump(t, 11.95, 26, 3.4);
      S.ui = { mode: 'pulse', pulse: 1 };
      S.screenI = 1.5 * pulse; S.screenLight = 0.6 * pulse;
      S.env = 0.03;
    }
    S.bloom = 0.35; S.bloomThreshold = 1.0;
    return S;
  }

  if (t < 17.2) {
    // ---------- the line, over black ----------
    S.phoneVisible = false;
    const words = COPY.line1.split(' ');
    const w = words.map((_, i) => sm(t, 13.5 + i * 0.2, 14.3 + i * 0.2, E.out));
    const out = 1 - sm(t, 16.15, 16.75);
    S.lines.push({ text: COPY.line1, y: 0.5, size: 0.036, weight: 500, words: w, alpha: out, blur: 0.012, rise: 0.006, track: -0.012 });
    return S;
  }

  // ---------- ACT TWO + THREE: continuous camera from the hit to the end card ----------
  S.floor = true;
  S.yaw = phoneYawAt(t);
  const m = poseMatrix(S.phonePos, S.yaw);
  const phoneC = V3(S.phonePos);

  // camera path
  if (t < 30.5) {
    const c = revealCam(t); S.camPos = c.pos; S.camTarget = c.tgt;
  } else if (t < 33.0) {
    const a = revealCam(30.5), b = chatCam(33.0, m), p = E.inOut(seg(t, 30.5, 33.0));
    S.camPos = vlerp(a.pos, b.pos, p); S.camTarget = vlerp(a.tgt, b.tgt, p);
    S.zoom = 0.07 * Math.pow(Math.sin(Math.PI * seg(t, 30.8, 32.8)), 2);
  } else if (t < 42.5) {
    const c = chatCam(t, m); S.camPos = c.pos; S.camTarget = c.tgt;
  } else {
    const a = chatCam(42.5, poseMatrix(phonePosAt(42.5), 0)), p = E.inOut(seg(t, 42.5, 48.2));
    S.camPos = vlerp(a.pos, END_POS, p).add(V3([0, 0, 0.24 * seg(t, 48.2, 52)]));
    S.camTarget = vlerp(a.tgt, END_TGT, p);
  }
  S.focusPoint = t >= 33 && t < 42.5 ? S.camTarget : W3(m, [0, 0.05, Z_GLASS]);
  S.aperture = t >= 33 && t < 42.5 ? 1.2 : 1.8; S.maxCoC = 0.008;

  // studio lights: on with the hit, off one relay at a time
  const oR = offK(t, 26.3), oL = offK(t, 27.0), oK = offK(t, 27.7);
  const look = phoneC;
  const sweepX = lerp(-2.4, 2.4, E.inOut(seg(t, 17.2, 18.4)));
  S.lights.strip = { i: 70 * (1 - sm(t, 18.2, 18.7)), pos: V3([sweepX, 1.25, 1.9]), look, w: 0.09, h: 2.8 };
  S.lights.rimL = { i: 30 * sm(t, 17.3, 18.8) * oL, pos: V3([-1.5, 1.35, -1.2]), look, w: 0.085, h: 2.8 };
  S.lights.rimR = { i: 30 * sm(t, 17.6, 19.2) * oR, pos: V3([1.5, 1.1, -1.1]), look, w: 0.085, h: 2.8 };
  const keyI = 9 * sm(t, 18.4, 21.2) * oK;
  S.lights.key = { i: keyI, pos: V3([0.9, 2.3, 2.3]), look, w: 0.45, h: 2.2 };
  const envStep = 1 - 0.38 * (1 - oR) - 0.28 * (1 - oL) - 0.28 * (1 - oK);
  S.env = 0.55 * sm(t, 17.3, 20.5) * envStep + 0.035 * sm(t, 17.2, 19);
  S.shadow = 0.45 * (keyI / 9);

  // the screen wakes and becomes the light
  if (t >= 24.8) {
    const tr = sm(t, 31.2, 32.6);
    const nWords = chatLayout ? chatLayout.words.length : 1;
    S.ui = {
      mode: 'app', time: t, animated: true,
      orbR: lerp(30, 150, E.outQuint(seg(t, 24.8, 26.2))), orbE: sm(t, 24.8, 25.3, E.out),
      word: sm(t, 25.6, 26.4), status: +sm(t, 25.1, 25.8).toFixed(2), tr,
      typed: Math.floor(seg(t, 33.3, 36.0) * Q_LEN), typing: t > 33.3 && t < 36.0, caret: t > 32.6 && t < 36.25,
      sent: seg(t, 36.25, 36.95), think: t > 36.55 && t < 37.6 ? Math.sin(Math.PI * seg(t, 36.55, 37.6)) : 0,
      stream: seg(t, 37.4, 41.6) * nWords
    };
    S.screenI = sm(t, 24.8, 25.2, E.out) * lerp(1.6, 1.12, tr);
    S.screenLight = S.screenI * lerp(2.6, 1.8, tr);
  }

  S.bloom = t < 24.8 ? 0.45 : 0.55; S.bloomThreshold = t < 24.8 ? 0.95 : lerp(1.0, 1.25, seg(t, 31, 33)); S.ca = 0.005;
  S.grain = 0.045; S.vignette = t > 42.5 ? 0.5 : 0.4;

  // end card
  if (t >= 46.0) {
    S.titleA = sm(t, 46.4, 47.4);
    S.sweep = lerp(-0.35, 1.35, E.inOut(seg(t, 46.5, 48.5)));
    const tw = COPY.tagline.split(' ').map((_, i) => sm(t, 47.6 + i * 0.09, 48.4 + i * 0.09, E.out));
    S.lines.push({ text: COPY.tagline, y: 0.3, size: 0.024, weight: 500, words: tw, blur: 0.008, rise: 0.004, track: -0.008 });
    S.lines.push({ text: COPY.cta, y: 0.343, size: 0.0165, weight: 400, alpha: sm(t, 49.0, 49.8), color: 'rgba(242,238,232,0.62)', track: 0.01 });
    S.fade = 1 - sm(t, 50.8, 52.0);
  }
  return S;
}

const FILM = {
  title: 'Ember',
  total: 52,
  format: '9:16',
  look: 'photoreal',
  shots: [
    { name: 'Edge macro', start: 0, end: 4.6 }, { name: 'Side key macro', start: 4.6, end: 7.4 },
    { name: 'Lens macro', start: 7.4, end: 10.2 }, { name: 'Glass, ember pulse', start: 10.2, end: 13 },
    { name: 'Line on black', start: 13, end: 17.2 }, { name: 'The hit, reveal', start: 17.2, end: 24.8 },
    { name: 'Wake, lights out', start: 24.8, end: 30.5 }, { name: 'Push into the screen', start: 30.5, end: 33 },
    { name: 'Chat', start: 33, end: 42.5 }, { name: 'Pull back', start: 42.5, end: 46 }, { name: 'End card', start: 46, end: 52 }
  ],
  checks: { blackOK: [[13, 13.6], [16.7, 17.25], [51.5, 52]] },

  setup() {
    useEnvironment('studio');
    materialsPhotoreal();
    dev = buildPhone(MAT);
    scr = createScreen(dev, { draw: drawScreen, overlay: drawPunchHole });
    screenLight = addScreenLight(dev);
    addReflectiveFloor();
    addStudioRig();
    chatLayout = buildChatLayout();
    buildTitleMask(COPY.name);
  },

  state: filmState,

  apply(S) {
    const g = dev.group;
    g.visible = S.phoneVisible;
    g.position.set(S.phonePos[0], S.phonePos[1], S.phonePos[2]);
    g.rotation.set(S.pitch, S.yaw, S.roll, 'YXZ');
    g.updateMatrixWorld(true);
    shadowBlob.position.x = S.phonePos[0]; shadowBlob.position.z = S.phonePos[2];
    floorU.uFocusXZ.value.set(S.phonePos[0], S.phonePos[2]);
    MAT.screen.emissiveIntensity = S.screenI;
    screenLight.intensity = S.screenLight;
    if (S.phoneVisible) scr.update(S.ui);
  },

  score(sc, at, ok, NOTE) {
  // act one: darkness
  if (ok(0)) sc.drone(at(0), at(16.95));
  if (ok(1.1)) sc.whoosh(at(1.1), 3.0, 1400, 6200, 0.05, -0.6, 0.6);
  for (const e of [4.6, 7.4, 10.2, 13.0]) if (ok(e)) sc.tick(at(e));
  if (ok(4.8)) sc.whoosh(at(4.8), 2.3, 900, 4200, 0.045, 0.5, -0.2);
  if (ok(7.7)) sc.whoosh(at(7.7), 2.2, 2000, 7000, 0.035, -0.3, 0.4);
  if (ok(8.7)) sc.bell(at(8.7), NOTE.E6 * 2, 0.018, 2.2, 0.3, 0.8, 2.0, 0.8);
  if (ok(10.4)) sc.whoosh(at(10.4), 2.4, 500, 2600, 0.05, 0, 0);
  for (const [e, pk] of [[11.6, 0.22], [11.95, 0.14]]) if (ok(e)) {
    sc.tone(at(e), { f: 98, peak: pk, a: 0.06, dur: 1.1, lp: 400, send: 0.5 });
    sc.tone(at(e), { f: 196, peak: pk * 0.35, a: 0.06, dur: 0.9, send: 0.5 });
  }
  if (ok(15.2)) sc.riser(at(15.2), at(17.16), 0.3);
  // act two: light
  if (ok(17.2)) sc.hit(at(17.2));
  if (ok(17.5)) sc.pad(at(17.5), [NOTE.D2, NOTE.A2, NOTE.Fs3, NOTE.Cs4, NOTE.E4], 4.6, { peak: 0.13, cut: 400, cut2: 1900 });
  if (ok(21.4)) sc.pad(at(21.4), [NOTE.B1, NOTE.Fs2, NOTE.D3, NOTE.A3, NOTE.Cs4], 4.4, { peak: 0.13, a: 1.6, cut: 800, cut2: 2000 });
  if (ok(25.3)) {
    const p = sc.pad(at(25.3), [NOTE.G1, NOTE.D2, NOTE.B2, NOTE.Fs3, NOTE.A3], 5.2, { peak: 0.13, a: 1.4, rel: 1.8, cut: 1400, cut2: 1600 });
    for (const [e, v] of [[26.3, 1100], [27.0, 800], [27.7, 480]]) { p.filter.frequency.cancelScheduledValues(at(e)); p.filter.frequency.setValueAtTime(v, at(e)); }
  }
  const beat = 60 / 84;
  for (let e = 19.0, i = 0; e < 26.25; e += beat, i++) {
    if (!ok(e)) continue;
    sc.kick(at(e), 0.3 + 0.25 * Math.min(1, i / 6));
    if (e > 21.8) sc.shaker(at(e + beat / 2), 0.045, i % 2 ? 0.3 : -0.3);
  }
  if (ok(24.8)) {
    [NOTE.D5, NOTE.Fs5, NOTE.A5].forEach((f, i) => sc.bell(at(24.8 + i * 0.09), f, 0.035, 3.4, (i - 1) * 0.35, 0.6, 2.0, 1.0));
    sc.hum(at(24.9), at(31.5));
  }
  for (const e of [26.3, 27.0, 27.7]) if (ok(e)) sc.relay(at(e));
  // act three: the idea is the only light
  if (ok(30.2)) sc.pad(at(30.2), [NOTE.A1, NOTE.E2, NOTE.B2, NOTE.E3, NOTE.A3], 12.8, { peak: 0.075, a: 2.5, rel: 1.4, cut: 500, cut2: 900 });
  if (ok(30.5)) sc.whoosh(at(30.5), 2.5, 180, 2400, 0.16, -0.2, 0.2);
  for (let e = 33.0, i = 0; e < 42.4; e += beat, i++) {
    if (!ok(e)) continue;
    sc.kick(at(e), 0.2);
    sc.shaker(at(e + beat / 2), 0.03, i % 2 ? 0.25 : -0.25);
  }
  const q = COPY.question.length, t0 = 33.3, t1 = 36.0;
  for (let i = 0; i < q; i++) {
    const e = t0 + (i / q) * (t1 - t0);
    if (!ok(e) || COPY.question[i] === ' ' && i % 2) continue;
    sc.tone(at(e), { f: 2800 + Math.random() * 900, peak: 0.018 + Math.random() * 0.01, dur: 0.016, send: 0.1, pan: (Math.random() - 0.5) * 0.3 });
    sc.noiseHit(at(e), { type: 'highpass', f: 6000, dur: 0.01, peak: 0.03, send: 0.1 });
  }
  if (ok(36.25)) sc.tone(at(36.25), { f: 380, f2: 980, fT: 0.14, peak: 0.08, dur: 0.3, send: 0.4 });
  [NOTE.A5, NOTE.Cs4 * 4, NOTE.E6].forEach((f, i) => { const e = 36.6 + i * 0.26; if (ok(e)) sc.bell(at(e), f, 0.022, 1.8, (i - 1) * 0.4, 0.7, 2.0, 0.9); });
  const penta = [NOTE.D5, NOTE.E5, NOTE.Fs5, NOTE.A5, NOTE.B5, NOTE.D6];
  for (let e = 37.45, i = 0; e < 41.6; e += 0.24, i++) if (ok(e)) sc.bell(at(e), penta[(i * 3 + (i >> 2)) % penta.length], 0.012, 1.6, Math.sin(i) * 0.5, 0.75, 2.0, 0.7);
  // resolve
  if (ok(42.3)) sc.riser(at(42.3), at(46.35), 0.1);
  if (ok(42.6)) sc.pad(at(42.6), [NOTE.D2, NOTE.A2, NOTE.E3, NOTE.Fs3, NOTE.Cs4, NOTE.A4], 9.2, { peak: 0.13, a: 3.2, rel: 3.0, cut: 380, cut2: 2600 });
  if (ok(46.4)) {
    sc.tone(at(46.4), { f: 73.42, f2: 36.7, fT: 0.6, peak: 0.55, dur: 3.2, send: 0.4 });
    [NOTE.D5, NOTE.A5, NOTE.Fs6].forEach((f, i) => sc.bell(at(46.4 + i * 0.012), f, [0.07, 0.05, 0.025][i], 5.5, (i - 1) * 0.3, 0.7, 3.5, 1.6));
  }
  }
};
