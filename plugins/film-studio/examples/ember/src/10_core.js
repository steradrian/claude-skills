/* ===================================================================== */
const P = new URLSearchParams(location.search);
const CAPTURE = P.has('capture');
const STILL = P.has('still') || CAPTURE;
const T_START = Math.max(0, parseFloat(P.get('t')) || 0);
const TOTAL = 52;
const FONT = '"Instrument Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  quint: (x) => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
  expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  outQuint: (x) => 1 - Math.pow(1 - x, 5)
};
const sm = (t, a, b, f = E.inOut) => f(seg(t, a, b));
const bump = (t, t0, rise = 30, decay = 3.2) => (t < t0 ? 0 : (1 - Math.exp(-(t - t0) * rise)) * Math.exp(-(t - t0) * decay));
const rand = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

const frameEl = document.getElementById('frame');
const canvas = document.getElementById('c');

function showError() {
  document.getElementById('err').classList.add('on');
  document.getElementById('startOverlay').classList.add('hidden');
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: STILL });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
} catch (e) {
  showError();
  return;
}
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(1);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 9 / 16, 0.01, 60);
RectAreaLightUniformsLib.init();

/* ---------------- environment: a black studio with softboxes ---------------- */
const pmrem = new THREE.PMREMGenerator(renderer);
function buildEnv() {
  const es = new THREE.Scene();
  const panel = (w, h, x, y, z, k, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
  };
  panel(7, 0.9, 0, 6, 0.6, 3.2);
  panel(0.55, 8, -6, 1.5, 1.8, 2.4, 0xdfe8ff);
  panel(0.55, 8, 6, 1.0, -1.2, 2.4, 0xdfe8ff);
  panel(4.5, 1.8, 0.5, 2.2, 6, 1.1, 0xfff1e2);
  panel(9, 0.8, 0, -1.6, -6, 0.22);
  const tex = pmrem.fromScene(es, 0.025, 0.1, 30).texture;
  es.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}
scene.environment = buildEnv();

/* ---------------- procedural textures ---------------- */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function makeBrushTex() {
  const w = 32, h = 1024, c = makeCanvas(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = 0.8 + 0.2 * rand();
    const streak = rand() < 0.04 ? -0.12 : 0;
    for (let x = 0; x < w; x++) {
      const v = clamp(row + streak + (rand() - 0.5) * 0.04) * 255;
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1.6); t.colorSpace = THREE.NoColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeLensTex() {
  const s = 512, c = makeCanvas(s, s), g = c.getContext('2d'), r = s / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  const rings = [[1.0, '#0b0c0e'], [0.95, '#1b1d22'], [0.9, '#08090b'], [0.76, '#121419'], [0.7, '#050607'], [0.55, '#0c0f15'], [0.42, '#030304'], [0.2, '#010102']];
  for (const [k, col] of rings) { g.beginPath(); g.arc(r, r, r * k, 0, Math.PI * 2); g.fillStyle = col; g.fill(); }
  g.globalCompositeOperation = 'lighter';
  const sheen = g.createRadialGradient(r * 0.72, r * 0.68, 2, r * 0.8, r * 0.8, r * 0.75);
  sheen.addColorStop(0, 'rgba(70,60,130,0.35)'); sheen.addColorStop(0.5, 'rgba(20,60,70,0.18)'); sheen.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sheen; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r, r, r * (0.46 + i * 0.07), 0, Math.PI * 2); g.strokeStyle = 'rgba(120,130,150,0.05)'; g.lineWidth = 1.5; g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t;
}

function makeFlashTex() {
  const s = 256, c = makeCanvas(s, s), g = c.getContext('2d'), r = s / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, '#f6eed8'); grad.addColorStop(0.8, '#d9cfb5'); grad.addColorStop(1, '#8d8674');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  for (let i = 1; i < 9; i++) { g.beginPath(); g.arc(r, r, (r * i) / 9, 0, Math.PI * 2); g.strokeStyle = 'rgba(90,80,60,0.25)'; g.lineWidth = 2; g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeShadowTex() {
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.translate(128, 64); g.scale(1, 0.42);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.9)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

/* ---------------- screen UI canvas ---------------- */
const UIW = 1024, UIH = 2148, DW = 1000, DH = 2096;
const uiCanvas = makeCanvas(UIW, UIH);
const uictx = uiCanvas.getContext('2d');
const uiTex = new THREE.CanvasTexture(uiCanvas);
uiTex.colorSpace = THREE.SRGBColorSpace;
uiTex.anisotropy = MAX_ANISO;
uiTex.wrapS = uiTex.wrapT = THREE.ClampToEdgeWrapping;
uiTex.minFilter = THREE.LinearMipmapLinearFilter;
uiTex.generateMipmaps = true;

/* ---------------- materials ---------------- */
const matList = [];
const M = (o, envMul = 1) => { const m = new THREE.MeshPhysicalMaterial(o); m.userData.envMul = envMul; matList.push(m); return m; };
const brushTex = makeBrushTex();
const MAT = {
  titanium: M({ color: 0xb3aea6, metalness: 1, roughness: 0.34, roughnessMap: brushTex, anisotropy: 0.65, anisotropyRotation: Math.PI / 2 }),
  polish: M({ color: 0xcfcac2, metalness: 1, roughness: 0.14 }),
  key: M({ color: 0xb3aea6, metalness: 1, roughness: 0.26, anisotropy: 0.25, anisotropyRotation: Math.PI / 2 }),
  backGlass: M({ color: 0x131311, metalness: 0, roughness: 0.36, ior: 1.5 }, 0.6),
  screen: M({ color: 0x000000, metalness: 0, roughness: 0.03, ior: 1.52, emissive: 0xffffff, emissiveMap: uiTex, emissiveIntensity: 0 }),
  glassEdge: M({ color: 0x07080a, metalness: 0, roughness: 0.06, ior: 1.52 }),
  module: M({ color: 0x111214, metalness: 0, roughness: 0.09, ior: 1.52 }),
  lens: M({ color: 0xffffff, map: makeLensTex(), metalness: 0, roughness: 0.025, ior: 1.6, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 520] }),
  flash: M({ color: 0xffffff, map: makeFlashTex(), metalness: 0, roughness: 0.3 }),
  antenna: M({ color: 0x2b2b2d, metalness: 0, roughness: 0.55 }),
  floor: M({ color: 0x030303, metalness: 0, roughness: 0.4 }, 0.2)
};
function setEnv(k) { for (const m of matList) m.envMapIntensity = k * m.userData.envMul; }

/* ---------------- phone geometry ---------------- */
function superRect(w, h, r, n = 4, seg = 48) {
  const hw = w / 2, hh = h / 2, pts = [];
  const corners = [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, 1.5 * Math.PI]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2), ca = Math.cos(a), sa = Math.sin(a);
      pts.push(new THREE.Vector2(cx + r * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n), cy + r * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n)));
    }
  }
  return new THREE.Shape(pts);
}

// ExtrudeGeometry is non-indexed, so its default normals are faceted. Average by position instead.
function smoothNormals(geo) {
  const pos = geo.attributes.position, n = pos.count, map = new Map(), keys = new Array(n);
  const q = (v) => Math.round(v * 2e5);
  for (let i = 0; i < n; i++) {
    const k = q(pos.getX(i)) + ',' + q(pos.getY(i)) + ',' + q(pos.getZ(i));
    keys[i] = k; if (!map.has(k)) map.set(k, [0, 0, 0]);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cb = new THREE.Vector3(), ab = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
    cb.subVectors(c, b); ab.subVectors(a, b); cb.cross(ab);
    for (let j = 0; j < 3; j++) { const acc = map.get(keys[t + j]); acc[0] += cb.x; acc[1] += cb.y; acc[2] += cb.z; }
  }
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const acc = map.get(keys[i]), l = Math.hypot(acc[0], acc[1], acc[2]) || 1;
    nor[i * 3] = acc[0] / l; nor[i * 3 + 1] = acc[1] / l; nor[i * 3 + 2] = acc[2] / l;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return geo;
}

const PW = 0.715, PH = 1.47, PD = 0.078, PR = 0.142, BT = 0.016, BS = 0.013;
const GW = PW - 2 * BS, GH = PH - 2 * BS, GR = PR - BS * 0.9;
const Z_GLASS = PD / 2 + 0.0032;

const phone = new THREE.Group();
scene.add(phone);

(function buildPhone() {
  const bodyGeo = new THREE.ExtrudeGeometry(superRect(PW, PH, PR), {
    depth: PD - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: -BS, bevelSegments: 14, steps: 1
  });
  bodyGeo.translate(0, 0, -(PD - 2 * BT) / 2);
  smoothNormals(bodyGeo);
  phone.add(new THREE.Mesh(bodyGeo, [MAT.backGlass, MAT.titanium]));

  const glassGeo = new THREE.ExtrudeGeometry(superRect(GW, GH, GR), {
    depth: 0.0008, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelOffset: -0.0012, bevelSegments: 5, steps: 1
  });
  glassGeo.translate(0, 0, PD / 2 + 0.0012);
  smoothNormals(glassGeo);
  const gp = glassGeo.attributes.position, uv = glassGeo.attributes.uv;
  for (let i = 0; i < gp.count; i++) uv.setXY(i, (gp.getX(i) + GW / 2) / GW, (gp.getY(i) + GH / 2) / GH);
  const glass = new THREE.Mesh(glassGeo, [MAT.screen, MAT.glassEdge]);
  phone.add(glass);

  // camera module: a vertical pill with two lenses
  const MX = 0.205, MY = 0.53, MWd = 0.162, MHt = 0.33;
  const modGeo = new THREE.ExtrudeGeometry(superRect(MWd, MHt, MWd / 2, 2, 40), {
    depth: 0.003, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelOffset: -0.004, bevelSegments: 8, steps: 1
  });
  modGeo.translate(0, 0, 0.004); modGeo.rotateY(Math.PI); smoothNormals(modGeo);
  const mod = new THREE.Mesh(modGeo, MAT.module);
  mod.position.set(MX, MY, -PD / 2 + 0.0006);
  phone.add(mod);
  const modFace = -PD / 2 + 0.0006 - 0.011;

  const ringProfile = [[0.049, 0], [0.049, 0.0036], [0.0505, 0.0052], [0.0525, 0.006], [0.0585, 0.006], [0.0602, 0.0048], [0.0608, 0.0025], [0.0608, 0]]
    .map(([r, h]) => new THREE.Vector2(r, h));
  const ringGeo = new THREE.LatheGeometry(ringProfile, 128); ringGeo.rotateX(-Math.PI / 2);
  const lensGeo = new THREE.CircleGeometry(0.0492, 128); lensGeo.rotateY(Math.PI);
  const barrelGeo = new THREE.CylinderGeometry(0.0492, 0.0492, 0.004, 96, 1, true); barrelGeo.rotateX(Math.PI / 2);
  for (const dy of [0.078, -0.078]) {
    const ring = new THREE.Mesh(ringGeo, MAT.polish); ring.position.set(MX, MY + dy, modFace); phone.add(ring);
    const lens = new THREE.Mesh(lensGeo, MAT.lens); lens.position.set(MX, MY + dy, modFace - 0.0036); phone.add(lens);
    const barrel = new THREE.Mesh(barrelGeo, MAT.antenna); barrel.position.set(MX, MY + dy, modFace - 0.002); phone.add(barrel);
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.018, 64).rotateY(Math.PI), MAT.flash);
  flash.position.set(0.078, 0.655, -PD / 2 - 0.0004); phone.add(flash);
  const mic = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 32).rotateY(Math.PI), MAT.antenna);
  mic.position.set(0.078, 0.6, -PD / 2 - 0.0004); phone.add(mic);

  // side keys
  const keyGeo = (len) => {
    const g = new THREE.ExtrudeGeometry(superRect(0.026, len, 0.013, 2, 20), {
      depth: 0.003, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelOffset: -0.0025, bevelSegments: 6, steps: 1
    });
    return smoothNormals(g);
  };
  const addKey = (len, y, side) => {
    const g = keyGeo(len); g.rotateY(side * Math.PI / 2);
    const m = new THREE.Mesh(g, MAT.key); m.position.set(side * (PW / 2 - 0.0012), y, 0); phone.add(m);
  };
  addKey(0.17, 0.25, 1);
  addKey(0.1, 0.39, -1); addKey(0.1, 0.25, -1); addKey(0.055, 0.53, -1);

  // antenna breaks
  const bandV = new THREE.BoxGeometry(0.0012, 0.0065, PD - 2 * BT + 0.002);
  const bandH = new THREE.BoxGeometry(0.0065, 0.0012, PD - 2 * BT + 0.002);
  for (const [x, y] of [[PW / 2, 0.62], [PW / 2, -0.62], [-PW / 2, 0.66], [-PW / 2, -0.6]]) { const b = new THREE.Mesh(bandV, MAT.antenna); b.position.set(x, y, 0); phone.add(b); }
  for (const [x, y] of [[0.22, PH / 2], [-0.22, PH / 2], [0.26, -PH / 2], [-0.26, -PH / 2]]) { const b = new THREE.Mesh(bandH, MAT.antenna); b.position.set(x, y, 0); phone.add(b); }

  // bottom port and speaker grille
  const port = new THREE.Mesh(new THREE.ExtrudeGeometry(superRect(0.09, 0.028, 0.014, 2, 16), { depth: 0.001, bevelEnabled: false }).rotateX(Math.PI / 2), MAT.antenna);
  port.position.set(0, -PH / 2 + 0.0006, 0); phone.add(port);
  const hole = new THREE.CylinderGeometry(0.0042, 0.0042, 0.002, 16);
  for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(hole, MAT.antenna); h.position.set(0.1 + i * 0.016, -PH / 2 + 0.0004, 0); phone.add(h); const h2 = h.clone(); h2.position.x = -h.position.x; phone.add(h2); }
})();

// a warm light that stands in for the display's own glow
const screenLight = new THREE.RectAreaLight(0xff9a55, 0, GW * 0.92, GH * 0.95);
screenLight.position.set(0, 0, Z_GLASS + 0.002);
screenLight.rotation.y = Math.PI;
phone.add(screenLight);

/* ---------------- floor, soft shadow, planar reflection ---------------- */
const floorU = {
  tRefl: { value: null }, uTexMat: { value: new THREE.Matrix4() }, uReflStrength: { value: 0.6 },
  uReflLod: { value: 1.6 }, uFocusXZ: { value: new THREE.Vector2(0, 0) }, uFadeK: { value: 0.35 }
};
MAT.floor.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, floorU);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform mat4 uTexMat; varying vec4 vReflUv; varying vec3 vWPos;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvReflUv = uTexMat * vec4(transformed, 1.0);\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflStrength, uReflLod, uFadeK; uniform vec2 uFocusXZ; varying vec4 vReflUv; varying vec3 vWPos;')
    .replace('#include <opaque_fragment>', `
      {
        vec2 ruv = vReflUv.xy / vReflUv.w;
        float ndv = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        float fres = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);
        vec2 dxz = vWPos.xz - uFocusXZ;
        float fade = exp(-dot(dxz, dxz) * uFadeK);
        vec3 refl = textureLod(tRefl, ruv, uReflLod).rgb;
        outgoingLight += refl * (0.35 + fres) * fade * uReflStrength;
      }
      #include <opaque_fragment>`);
};
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), MAT.floor);
scene.add(floor);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.55).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: makeShadowTex(), transparent: true, opacity: 0, depthWrite: false }));
shadow.position.y = 0.002; shadow.renderOrder = 2;
scene.add(shadow);

const vcam = new THREE.PerspectiveCamera();
function updateReflectionCamera() {
  const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
  const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos);
  const up = new THREE.Vector3(0, 1, 0).applyMatrix4(rot);
  camPos.y = -camPos.y; look.y = -look.y; up.y = -up.y;
  vcam.position.copy(camPos); vcam.up.copy(up); vcam.lookAt(look);
  vcam.near = camera.near; vcam.far = camera.far;
  vcam.updateMatrixWorld();
  vcam.projectionMatrix.copy(camera.projectionMatrix);
  vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  floorU.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    .multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse).multiply(floor.matrixWorld);
}

/* ---------------- studio lights ---------------- */
const LIGHTS = {};
for (const [name, color, w, h] of [
  ['key', 0xfff3e8, 2.4, 1.2], ['rimL', 0xdce7ff, 0.26, 2.8], ['rimR', 0xdce7ff, 0.26, 2.8],
  ['strip', 0xffffff, 0.04, 2.0], ['glint', 0xffffff, 0.07, 0.07]
]) {
  const l = new THREE.RectAreaLight(color, 0, w, h); scene.add(l); LIGHTS[name] = l;
}
