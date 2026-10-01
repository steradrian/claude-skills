/* =====================================================================
   FILM STUDIO ENGINE — studio (3D looks)
   Environments, material presets, a product device, screens that stay
   sharp up close, area-light rigs, reflective floors and cycloramas.
   ===================================================================== */
let MAT = {}, LIGHTS = {}, floor = null, floorU = null, shadowBlob = null, vcam = null;
const matList = [];
function M(o, envMul = 1, Type = THREE.MeshPhysicalMaterial) { const m = new Type(o); m.userData.envMul = envMul; matList.push(m); return m; }
/** scale every studio material's environment reflections; the environment is the ambient "room" */
function setEnv(k) { for (const m of matList) m.envMapIntensity = k * m.userData.envMul; }

/* ---------------- environments ---------------- */
const ENV_PRESETS = {
  // a black studio with long softboxes: strip reflections on glass and metal
  studio: [[7, 0.9, 0, 6, 0.6, 3.2], [0.55, 8, -6, 1.5, 1.8, 2.4, 0xdfe8ff], [0.55, 8, 6, 1.0, -1.2, 2.4, 0xdfe8ff], [4.5, 1.8, 0.5, 2.2, 6, 1.1, 0xfff1e2], [9, 0.8, 0, -1.6, -6, 0.22]],
  // a bright, soft room for stylized looks: big overhead, warm key side, cool fill side, floor bounce
  soft: [[10, 10, 0, 7, 0, 1.4], [6, 6, -6, 3, 3, 1.1, 0xfff0dc], [6, 6, 6, 2, 2, 0.8, 0xdde6ff], [10, 4, 0, 2, 7, 0.9], [14, 14, 0, -5, 0, 0.35, 0xf2ecff]]
};
function useEnvironment(preset = 'studio') {
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  for (const [w, h, x, y, z, k, color = 0xffffff] of ENV_PRESETS[preset] || preset) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
  }
  scene.environment = pm.fromScene(es, 0.025, 0.1, 30).texture;
  es.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  pm.dispose();
}

/* ---------------- procedural textures ---------------- */
function makeBrushTex() {
  const w = 32, h = 1024, c = makeCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = 0.8 + 0.2 * rand(), streak = rand() < 0.04 ? -0.12 : 0;
    for (let x = 0; x < w; x++) { const v = clamp(row + streak + (rand() - 0.5) * 0.04) * 255, i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1.6); t.colorSpace = THREE.NoColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
function makeLensTex() {
  const s = 512, c = makeCanvas(s, s), g = c.getContext('2d'), r = s / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  for (const [k, col] of [[1.0, '#0b0c0e'], [0.95, '#1b1d22'], [0.9, '#08090b'], [0.76, '#121419'], [0.7, '#050607'], [0.55, '#0c0f15'], [0.42, '#030304'], [0.2, '#010102']]) { g.beginPath(); g.arc(r, r, r * k, 0, Math.PI * 2); g.fillStyle = col; g.fill(); }
  g.globalCompositeOperation = 'lighter';
  const sheen = g.createRadialGradient(r * 0.72, r * 0.68, 2, r * 0.8, r * 0.8, r * 0.75);
  sheen.addColorStop(0, 'rgba(70,60,130,0.35)'); sheen.addColorStop(0.5, 'rgba(20,60,70,0.18)'); sheen.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sheen; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t;
}
function makeFlashTex() {
  const s = 256, c = makeCanvas(s, s), g = c.getContext('2d'), r = s / 2, grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, '#f6eed8'); grad.addColorStop(0.8, '#d9cfb5'); grad.addColorStop(1, '#8d8674');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  for (let i = 1; i < 9; i++) { g.beginPath(); g.arc(r, r, (r * i) / 9, 0, Math.PI * 2); g.strokeStyle = 'rgba(90,80,60,0.25)'; g.lineWidth = 2; g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeShadowTex(squash = 0.42) {
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.translate(128, 64); g.scale(1, squash);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.9)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

/* ---------------- material presets ---------------- */
/** Photoreal product materials: brushed titanium, frosted back glass, coated lenses. */
function materialsPhotoreal() {
  const brush = makeBrushTex();
  return (MAT = {
    body: M({ color: 0xb3aea6, metalness: 1, roughness: 0.34, roughnessMap: brush, anisotropy: 0.65, anisotropyRotation: Math.PI / 2 }),
    polish: M({ color: 0xcfcac2, metalness: 1, roughness: 0.14 }),
    key: M({ color: 0xb3aea6, metalness: 1, roughness: 0.26, anisotropy: 0.25, anisotropyRotation: Math.PI / 2 }),
    back: M({ color: 0x131311, metalness: 0, roughness: 0.36, ior: 1.5 }, 0.6),
    screen: M({ color: 0x000000, metalness: 0, roughness: 0.03, ior: 1.52, emissive: 0xffffff, emissiveIntensity: 0 }),
    glassEdge: M({ color: 0x07080a, metalness: 0, roughness: 0.06, ior: 1.52 }),
    module: M({ color: 0x111214, metalness: 0, roughness: 0.09, ior: 1.52 }),
    lens: M({ color: 0xffffff, map: makeLensTex(), metalness: 0, roughness: 0.025, ior: 1.6, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 520] }),
    flash: M({ color: 0xffffff, map: makeFlashTex(), metalness: 0, roughness: 0.3 }),
    detail: M({ color: 0x2b2b2d, metalness: 0, roughness: 0.55 })
  });
}
/** Stylized "clay" materials: matte, soft sheen, saturated. Pass hex colours. */
function materialsClay({ body = 0x3552e0, back = null, accent = 0xffd35c, dark = 0x14172b } = {}) {
  const clay = (color, rough = 0.62) => M({ color, roughness: rough, metalness: 0, sheen: 0.5, sheenRoughness: 0.7, sheenColor: 0xffffff, clearcoat: 0.12, clearcoatRoughness: 0.55 });
  return (MAT = {
    body: clay(body), key: clay(body, 0.5), back: clay(back == null ? body : back), polish: clay(accent, 0.45),
    screen: M({ color: 0x000000, roughness: 0.18, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0, clearcoat: 1, clearcoatRoughness: 0.12 }),
    glassEdge: clay(dark, 0.4), module: clay(dark, 0.35), lens: M({ color: 0x0a0b14, roughness: 0.08, metalness: 0, clearcoat: 1 }),
    flash: clay(accent, 0.4), detail: clay(dark, 0.6)
  });
}
function clayMaterial(color, rough = 0.62) { return M({ color, roughness: rough, metalness: 0, sheen: 0.5, sheenRoughness: 0.7, sheenColor: 0xffffff, clearcoat: 0.12, clearcoatRoughness: 0.55 }); }

/* ---------------- geometry utilities ---------------- */
/** rounded rectangle with continuous (superellipse) corners — reads as designed, not as a CSS border-radius */
function superRect(w, h, r, n = 4, seg = 48) {
  const hw = w / 2, hh = h / 2, pts = [];
  for (const [cx, cy, a0] of [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, 1.5 * Math.PI]]) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2), ca = Math.cos(a), sa = Math.sin(a);
      pts.push(new THREE.Vector2(cx + r * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n), cy + r * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n)));
    }
  }
  return new THREE.Shape(pts);
}
/** ExtrudeGeometry is non-indexed, so default normals are faceted. Average by position instead. */
function smoothNormals(geo) {
  const pos = geo.attributes.position, n = pos.count, map = new Map(), keys = new Array(n), q = (v) => Math.round(v * 2e5);
  for (let i = 0; i < n; i++) { const k = q(pos.getX(i)) + ',' + q(pos.getY(i)) + ',' + q(pos.getZ(i)); keys[i] = k; if (!map.has(k)) map.set(k, [0, 0, 0]); }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cb = new THREE.Vector3(), ab = new THREE.Vector3();
  const index = geo.index, tri = index ? index.count : n;
  for (let t = 0; t < tri; t += 3) {
    const i0 = index ? index.getX(t) : t, i1 = index ? index.getX(t + 1) : t + 1, i2 = index ? index.getX(t + 2) : t + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    cb.subVectors(c, b); ab.subVectors(a, b); cb.cross(ab);
    for (const i of [i0, i1, i2]) { const acc = map.get(keys[i]); acc[0] += cb.x; acc[1] += cb.y; acc[2] += cb.z; }
  }
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const acc = map.get(keys[i]), l = Math.hypot(acc[0], acc[1], acc[2]) || 1; nor[i * 3] = acc[0] / l; nor[i * 3 + 1] = acc[1] / l; nor[i * 3 + 2] = acc[2] / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return geo;
}
/** a soft rounded slab (chat bubbles, cards, tiles): width, height, depth, corner radius, bevel */
function roundedSlab(w, h, d, r, bevel = Math.min(d * 0.45, r * 0.5)) {
  const g = new THREE.ExtrudeGeometry(superRect(w, h, r, 3, 32), { depth: Math.max(0.0001, d - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 10, steps: 1 });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return smoothNormals(g);
}

/* ---------------- the product device (a phone) ---------------- */
const PHONE = (() => {
  const PW = 0.715, PH = 1.47, PD = 0.078, PR = 0.142, BT = 0.016, BS = 0.013;
  const GW = PW - 2 * BS, GH = PH - 2 * BS, GR = PR - BS * 0.9;
  return { PW, PH, PD, PR, BT, BS, GW, GH, GR, Z_GLASS: PD / 2 + 0.0032, LENS: [0.205, 0.608, -PD / 2 + 0.0006 - 0.011 - 0.0036] };
})();
/**
 * Builds an original phone (not any real brand's design). mats: a material preset.
 * Returns { group, dims, screenMat }. Front faces +Z, top is +Y, centred on the origin.
 */
function buildPhone(mats = MAT, opts = {}) {
  const d = Object.assign({}, PHONE, opts.dims || {});
  const { PW, PH, PD, PR, BT, BS, GW, GH, GR } = d;
  const group = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(superRect(PW, PH, PR), { depth: PD - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: -BS, bevelSegments: 14, steps: 1 });
  bodyGeo.translate(0, 0, -(PD - 2 * BT) / 2); smoothNormals(bodyGeo);
  group.add(new THREE.Mesh(bodyGeo, [mats.back, mats.body]));
  const glassGeo = new THREE.ExtrudeGeometry(superRect(GW, GH, GR), { depth: 0.0008, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelOffset: -0.0012, bevelSegments: 5, steps: 1 });
  glassGeo.translate(0, 0, PD / 2 + 0.0012); smoothNormals(glassGeo);
  const gp = glassGeo.attributes.position, guv = glassGeo.attributes.uv;
  for (let i = 0; i < gp.count; i++) guv.setXY(i, (gp.getX(i) + GW / 2) / GW, (gp.getY(i) + GH / 2) / GH);
  group.add(new THREE.Mesh(glassGeo, [mats.screen, mats.glassEdge]));
  if (opts.camera !== false) {
    const MX = 0.205, MY = 0.53, MWd = 0.162, MHt = 0.33;
    const modGeo = new THREE.ExtrudeGeometry(superRect(MWd, MHt, MWd / 2, 2, 40), { depth: 0.003, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelOffset: -0.004, bevelSegments: 8, steps: 1 });
    modGeo.translate(0, 0, 0.004); modGeo.rotateY(Math.PI); smoothNormals(modGeo);
    const mod = new THREE.Mesh(modGeo, mats.module); mod.position.set(MX, MY, -PD / 2 + 0.0006); group.add(mod);
    const modFace = -PD / 2 + 0.0006 - 0.011;
    const ringGeo = new THREE.LatheGeometry([[0.049, 0], [0.049, 0.0036], [0.0505, 0.0052], [0.0525, 0.006], [0.0585, 0.006], [0.0602, 0.0048], [0.0608, 0.0025], [0.0608, 0]].map(([r, h]) => new THREE.Vector2(r, h)), 128);
    ringGeo.rotateX(-Math.PI / 2);
    const lensGeo = new THREE.CircleGeometry(0.0492, 128); lensGeo.rotateY(Math.PI);
    const barrelGeo = new THREE.CylinderGeometry(0.0492, 0.0492, 0.004, 96, 1, true); barrelGeo.rotateX(Math.PI / 2);
    for (const dy of [0.078, -0.078]) {
      const ring = new THREE.Mesh(ringGeo, mats.polish); ring.position.set(MX, MY + dy, modFace); group.add(ring);
      const lens = new THREE.Mesh(lensGeo, mats.lens); lens.position.set(MX, MY + dy, modFace - 0.0036); group.add(lens);
      const barrel = new THREE.Mesh(barrelGeo, mats.detail); barrel.position.set(MX, MY + dy, modFace - 0.002); group.add(barrel);
    }
    const flash = new THREE.Mesh(new THREE.CircleGeometry(0.018, 64).rotateY(Math.PI), mats.flash); flash.position.set(0.078, 0.655, -PD / 2 - 0.0004); group.add(flash);
    const mic = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 32).rotateY(Math.PI), mats.detail); mic.position.set(0.078, 0.6, -PD / 2 - 0.0004); group.add(mic);
  }
  const keyGeo = (len) => smoothNormals(new THREE.ExtrudeGeometry(superRect(0.026, len, 0.013, 2, 20), { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelOffset: -0.0025, bevelSegments: 6, steps: 1 }));
  const addKey = (len, y, side) => { const g = keyGeo(len); g.rotateY(side * Math.PI / 2); const m = new THREE.Mesh(g, mats.key); m.position.set(side * (PW / 2 - 0.0012), y, 0); group.add(m); };
  addKey(0.17, 0.25, 1); addKey(0.1, 0.39, -1); addKey(0.1, 0.25, -1); addKey(0.055, 0.53, -1);
  if (opts.details !== false) {
    const bandV = new THREE.BoxGeometry(0.0012, 0.0065, PD - 2 * BT + 0.002), bandH = new THREE.BoxGeometry(0.0065, 0.0012, PD - 2 * BT + 0.002);
    for (const [x, y] of [[PW / 2, 0.62], [PW / 2, -0.62], [-PW / 2, 0.66], [-PW / 2, -0.6]]) { const b = new THREE.Mesh(bandV, mats.detail); b.position.set(x, y, 0); group.add(b); }
    for (const [x, y] of [[0.22, PH / 2], [-0.22, PH / 2], [0.26, -PH / 2], [-0.26, -PH / 2]]) { const b = new THREE.Mesh(bandH, mats.detail); b.position.set(x, y, 0); group.add(b); }
    const port = new THREE.Mesh(new THREE.ExtrudeGeometry(superRect(0.09, 0.028, 0.014, 2, 16), { depth: 0.001, bevelEnabled: false }).rotateX(Math.PI / 2), mats.detail);
    port.position.set(0, -PH / 2 + 0.0006, 0); group.add(port);
    const hole = new THREE.CylinderGeometry(0.0042, 0.0042, 0.002, 16);
    for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(hole, mats.detail); h.position.set(0.1 + i * 0.016, -PH / 2 + 0.0004, 0); group.add(h); const h2 = h.clone(); h2.position.x = -h.position.x; group.add(h2); }
  }
  scene.add(group);
  return { group, dims: d, screenMat: mats.screen };
}

/**
 * A screen whose UI is drawn in a 1000-wide design space and re-rendered only for the part of the
 * glass the camera can see, so text stays sharp at any distance.
 * draw(ctx, state, time) is called with the transform already in design units and clipped to the display.
 */
function createScreen(device, { draw, overlay = null, resolution = 1024 } = {}) {
  const { GW, GH, GR, Z_GLASS } = device.dims;
  const DW = 1000, DH = Math.round((DW * GH) / GW), UIW = resolution, UIH = Math.round((resolution * GH) / GW);
  const cv = makeCanvas(UIW, UIH), ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = MAX_ANISO; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  device.screenMat.emissiveMap = tex; device.screenMat.needsUpdate = true;
  const inset = 20, radius = 118 * (GR / 0.1303);
  const ndc = new THREE.Vector3(), ro = new THREE.Vector3(), rd = new THREE.Vector3(), inv = new THREE.Matrix4();
  function visibleWindow() {
    inv.copy(device.group.matrixWorld).invert();
    const origin = ro.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    let u0 = 1, v0 = 1, u1 = 0, v1 = 0;
    for (const [nx, ny] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      ndc.set(nx, ny, 0.5).unproject(camera).applyMatrix4(inv); rd.subVectors(ndc, origin);
      if (Math.abs(rd.z) < 1e-6) return [0, 0, 1, 1];
      const k = (Z_GLASS - origin.z) / rd.z; if (k <= 0) return [0, 0, 1, 1];
      const u = (origin.x + rd.x * k + GW / 2) / GW, v = (origin.y + rd.y * k + GH / 2) / GH;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const m = 0.035; u0 = clamp(u0 - m); v0 = clamp(v0 - m); u1 = clamp(u1 + m); v1 = clamp(v1 + m);
    if (u1 - u0 < 0.05 || v1 - v0 < 0.05 || (u1 - u0) * (v1 - v0) > 0.62) return [0, 0, 1, 1];
    return [u0, v0, u1, v1];
  }
  let key = '';
  return {
    ctx, DW, DH, tex,
    /** state: any JSON-able object your draw() reads. Include `animated: true` (and `time`) when it changes every frame. */
    update(state) {
      const off = state.mode === 'off';
      const win = off ? [0, 0, 1, 1] : visibleWindow();
      const k = JSON.stringify(state) + win.map((v) => v.toFixed(3));
      if (k === key) return;
      key = k;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, UIW, UIH);
      if (!off) {
        const x0 = win[0] * DW, x1 = win[2] * DW, y0 = (1 - win[3]) * DH, y1 = (1 - win[1]) * DH;
        const sx = UIW / (x1 - x0), sy = UIH / (y1 - y0);
        ctx.setTransform(sx, 0, 0, sy, -x0 * sx, -y0 * sy);
        ctx.save(); rr(ctx, inset, inset, DW - 2 * inset, DH - 2 * inset, radius); ctx.clip();
        draw(ctx, state, state.time || 0, DW, DH);
        ctx.restore();
        if (overlay) overlay(ctx, state, DW, DH);
      }
      const du = win[2] - win[0], dv = win[3] - win[1];
      tex.repeat.set(1 / du, 1 / dv); tex.offset.set(-win[0] / du, -win[1] / dv); tex.needsUpdate = true;
    }
  };
}
/** a warm area light at the glass that lets the display light the scene around it */
function addScreenLight(device, color = 0xff9a55) {
  const l = new THREE.RectAreaLight(color, 0, device.dims.GW * 0.92, device.dims.GH * 0.95);
  l.position.set(0, 0, device.dims.Z_GLASS + 0.002); l.rotation.y = Math.PI; device.group.add(l);
  return l;
}

/* ---------------- lights ---------------- */
let _ltc = false;
function useAreaLights() { if (!_ltc) { RectAreaLightUniformsLib.init(); _ltc = true; } }
/** an area light driven through state.lights[name] = { i, pos, look, w, h }. Keep the count fixed: adding lights mid-film recompiles shaders. */
function addAreaLight(name, color = 0xffffff, w = 1, h = 1) { useAreaLights(); const l = new THREE.RectAreaLight(color, 0, w, h); scene.add(l); LIGHTS[name] = l; return l; }
/** the photoreal studio rig from the reference film: key softbox, two rim strips, a sweep strip, a glint */
function addStudioRig() {
  addAreaLight('key', 0xfff3e8, 0.45, 2.2); addAreaLight('rimL', 0xdce7ff, 0.085, 2.8); addAreaLight('rimR', 0xdce7ff, 0.085, 2.8);
  addAreaLight('strip', 0xffffff, 0.04, 2.0); addAreaLight('glint', 0xffffff, 0.07, 0.07);
}
/** a shadow-casting soft key for stylized looks (VSM gives the wide, soft shadows clay needs) */
function addSoftKey({ color = 0xfff2e2, intensity = 2.6, position = [-2.2, 4.2, 2.6], target = [0, 0.8, 0], size = 3, radius = 14 } = {}) {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...position); l.target.position.set(...target); scene.add(l, l.target);
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.radius = radius; l.shadow.blurSamples = 20; l.shadow.bias = -0.0005;
  const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 16;
  return l;
}
function castShadows(obj, cast = true, receive = false) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); }

/* ---------------- floors and backdrops ---------------- */
/** a black glossy floor with a true planar reflection (photoreal). */
function addReflectiveFloor({ color = 0x030303, roughness = 0.4 } = {}) {
  floorU = { tRefl: { value: RT.refl ? RT.refl.texture : null }, uTexMat: { value: new THREE.Matrix4() }, uReflStrength: { value: 0.55 }, uReflLod: { value: 1.6 }, uFocusXZ: { value: new THREE.Vector2(0, 0) }, uFadeK: { value: 0.35 } };
  const mat = M({ color, metalness: 0, roughness }, 0.2);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, floorU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uTexMat; varying vec4 vReflUv; varying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvReflUv = uTexMat * vec4(transformed, 1.0);\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflStrength, uReflLod, uFadeK; uniform vec2 uFocusXZ; varying vec4 vReflUv; varying vec3 vWPos;')
      .replace('#include <opaque_fragment>', `{
        vec2 ruv = vReflUv.xy / vReflUv.w;
        float ndv = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        float fres = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);
        vec2 dxz = vWPos.xz - uFocusXZ;
        float fade = exp(-dot(dxz, dxz) * uFadeK);
        outgoingLight += textureLod(tRefl, ruv, uReflLod).rgb * (0.35 + fres) * fade * uReflStrength;
      }
      #include <opaque_fragment>`);
  };
  floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), mat);
  floor.userData.reflective = true; scene.add(floor);
  shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.55).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: makeShadowTex(), transparent: true, opacity: 0, depthWrite: false }));
  shadowBlob.position.y = 0.002; shadowBlob.renderOrder = 2; scene.add(shadowBlob);
  vcam = new THREE.PerspectiveCamera();
  return floor;
}
function updateReflectionCamera() {
  const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld), rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
  const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos), up = new THREE.Vector3(0, 1, 0).applyMatrix4(rot);
  camPos.y = -camPos.y; look.y = -look.y; up.y = -up.y;
  vcam.position.copy(camPos); vcam.up.copy(up); vcam.lookAt(look); vcam.near = camera.near; vcam.far = camera.far; vcam.updateMatrixWorld();
  vcam.projectionMatrix.copy(camera.projectionMatrix); vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  floorU.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse).multiply(floor.matrixWorld);
}
/** an infinite-looking studio sweep (floor curving into a wall) that catches soft shadows (stylized). */
function addCyc({ color = 0xb4b8f0, width = 30, depth = 12, radius = 4, height = 14, back = -3.5 } = {}) {
  const segs = 96, total = depth + (Math.PI / 2) * radius + height;
  const g = new THREE.PlaneGeometry(width, total, 1, segs), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const s = (p.getY(i) + total / 2);
    let y, z;
    if (s < depth) { y = 0; z = back + radius + depth - s; }
    else if (s < depth + (Math.PI / 2) * radius) { const a = (s - depth) / radius; y = radius - Math.cos(a) * radius; z = back + radius - Math.sin(a) * radius; }
    else { y = radius + (s - depth - (Math.PI / 2) * radius); z = back; }
    p.setXYZ(i, p.getX(i), y, z);
  }
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
  mat.userData.envMul = 0.6; matList.push(mat);
  const cyc = new THREE.Mesh(g, mat); cyc.receiveShadow = true; scene.add(cyc);
  return cyc;
}
/** a thin outline around a mesh (toon looks): grows the surface along its normals and draws the back faces */
function addOutline(mesh, color = 0x14172b, thickness = 0.008) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(normal) * ${thickness.toFixed(5)};`); };
  const o = new THREE.Mesh(mesh.geometry, mat); mesh.add(o); return o;
}
