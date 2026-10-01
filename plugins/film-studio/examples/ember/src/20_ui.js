
/* =====================================================================
   SCREEN UI — drawn in a 1000 x 2096 design space, rendered only for
   the part of the glass the camera can see so text stays sharp up close.
   ===================================================================== */
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
  const c = uictx; c.setTransform(1, 0, 0, 1, 0, 0);
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

function drawUI(s, win) {
  const c = uictx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, UIW, UIH);
  const x0 = win[0] * DW, x1 = win[2] * DW, y0 = (1 - win[3]) * DH, y1 = (1 - win[1]) * DH;
  const sx = UIW / (x1 - x0), sy = UIH / (y1 - y0);
  c.setTransform(sx, 0, 0, sy, -x0 * sx, -y0 * sy);

  c.save();
  rr(c, 20, 20, 960, 2056, 118); c.clip();
  c.fillStyle = '#040302'; c.fillRect(0, 0, DW, DH);
  const time = s.time;

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
  c.restore();
  // punch-hole camera under the glass
  c.beginPath(); c.arc(500, 76, 17, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = 'rgba(40,44,52,0.9)'; c.lineWidth = 2; c.stroke();
}

// which part of the glass is on camera, in glass uv (u0, v0, u1, v1)
const _ndc = new THREE.Vector3(), _ro = new THREE.Vector3(), _rd = new THREE.Vector3(), _inv = new THREE.Matrix4();
function visibleGlassWindow() {
  _inv.copy(phone.matrixWorld).invert();
  const origin = _ro.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_inv);
  let u0 = 1, v0 = 1, u1 = 0, v1 = 0;
  for (const [nx, ny] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    _ndc.set(nx, ny, 0.5).unproject(camera).applyMatrix4(_inv);
    _rd.subVectors(_ndc, origin);
    if (Math.abs(_rd.z) < 1e-6) return [0, 0, 1, 1];
    const k = (Z_GLASS - origin.z) / _rd.z;
    if (k <= 0) return [0, 0, 1, 1];
    const x = origin.x + _rd.x * k, y = origin.y + _rd.y * k;
    const u = (x + GW / 2) / GW, v = (y + GH / 2) / GH;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const m = 0.035;
  u0 = clamp(u0 - m); v0 = clamp(v0 - m); u1 = clamp(u1 + m); v1 = clamp(v1 + m);
  if (u1 - u0 < 0.05 || v1 - v0 < 0.05 || (u1 - u0) * (v1 - v0) > 0.62) return [0, 0, 1, 1];
  return [u0, v0, u1, v1];
}

let uiKey = '';
function updateUI(s) {
  const win = s.mode === 'off' ? [0, 0, 1, 1] : visibleGlassWindow();
  const key = JSON.stringify([s.mode, s.pulse && s.pulse.toFixed(3), s.tr && s.tr.toFixed(3), s.status, s.orbR | 0, s.orbE && s.orbE.toFixed(3), s.word && s.word.toFixed(2),
    s.typed, s.caret, s.sent && s.sent.toFixed(3), s.think && s.think.toFixed(3), s.stream && s.stream.toFixed(3),
    s.animated ? s.time.toFixed(2) : 0, win.map((v) => v.toFixed(3))]);
  if (key === uiKey) return;
  uiKey = key;
  drawUI(s, win);
  const du = win[2] - win[0], dv = win[3] - win[1];
  uiTex.repeat.set(1 / du, 1 / dv);
  uiTex.offset.set(-win[0] / du, -win[1] / dv);
  uiTex.needsUpdate = true;
}
