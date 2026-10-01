
/* =====================================================================
   POST — depth of field, bloom, embossed metal title, film finish
   ===================================================================== */
let W = 540, H = 960, quality = (!STILL && window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 0.72 : 1;
const RT = {};
function makeRT(w, h, o = {}) {
  return new THREE.WebGLRenderTarget(w, h, Object.assign({
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false
  }, o));
}

const fsGeo = new THREE.BufferGeometry();
fsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const FS_VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
class Pass {
  constructor(frag, uniforms) {
    this.u = uniforms;
    this.mat = new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(fsGeo, this.mat); this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.mesh);
  }
  render(target) { renderer.setRenderTarget(target); renderer.render(this.scene, fsCam); }
}

const depthMat = new THREE.ShaderMaterial({
  vertexShader: 'varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'varying float vD; void main(){ gl_FragColor = vec4(vD, 0.0, 0.0, 1.0); }'
});

const dofPass = new Pass(`
  uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform float uFocus, uAperture, uMaxCoC;
  varying vec2 vUv;
  float coc(float d){ return clamp(uAperture * (d - uFocus) / max(d, 1e-3), -1.0, 1.0) * uMaxCoC; }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb;
    if (uMaxCoC < 0.5) { gl_FragColor = vec4(c0, 1.0); return; }
    float d0 = texture2D(tDepth, vUv).r;
    float k0 = abs(coc(d0));
    vec3 acc = c0; float ws = 1.0;
    for (int i = 0; i < 64; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / 64.0) * uMaxCoC;
      float a = fi * 2.39996323;
      vec2 suv = vUv + vec2(cos(a), sin(a)) * r / uRes;
      vec3 sc = texture2D(tColor, suv).rgb;
      float sd = texture2D(tDepth, suv).r;
      float sk = abs(coc(sd));
      if (sd > d0) sk = min(sk, k0 + 1.0);
      float w = clamp(sk - r + 1.0, 0.0, 1.0);
      acc += sc * w; ws += w;
    }
    gl_FragColor = vec4(acc / ws, 1.0);
  }`, {
  tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() },
  uFocus: { value: 3 }, uAperture: { value: 0 }, uMaxCoC: { value: 0 }
});

// embossed brushed-metal title, shared by bloom prefilter and composite
const titleU = {
  tTitle: { value: null }, uTitleRect: { value: new THREE.Vector4(0.17, 0.735, 0.83, 0.859) },
  uTitleAlpha: { value: 0 }, uSweep: { value: -1 }, uTitleTexel: { value: new THREE.Vector2(1 / 1200, 1 / 400) }
};
const TITLE_GLSL = `
  uniform sampler2D tTitle; uniform vec4 uTitleRect; uniform float uTitleAlpha, uSweep; uniform vec2 uTitleTexel;
  vec4 titleColor(vec2 uv){
    if (uTitleAlpha <= 0.001) return vec4(0.0);
    vec2 t = (uv - uTitleRect.xy) / (uTitleRect.zw - uTitleRect.xy);
    if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) return vec4(0.0);
    vec4 s = texture2D(tTitle, t);
    float m = s.r;
    if (m < 0.003) return vec4(0.0);
    vec2 e = uTitleTexel * 1.5;
    float hx = texture2D(tTitle, t + vec2(e.x, 0.0)).g - texture2D(tTitle, t - vec2(e.x, 0.0)).g;
    float hy = texture2D(tTitle, t + vec2(0.0, e.y)).g - texture2D(tTitle, t - vec2(0.0, e.y)).g;
    vec3 n = normalize(vec3(-hx * 5.0, -hy * 5.0, 1.0));
    float row = floor(t.y / uTitleTexel.y);
    float streak = fract(sin(row * 12.9898) * 43758.5453);
    float streak2 = fract(sin(floor(row / 5.0) * 78.233 + 1.7) * 43758.5453);
    float brush = 0.82 + 0.12 * streak + 0.06 * streak2;
    float face = smoothstep(0.3, 0.9, t.y) * 0.3 + smoothstep(0.55, 0.05, t.y) * 0.06;
    float env = 0.07 + face + 0.3 * smoothstep(-0.2, 0.95, n.y) * (1.0 - n.z) * 4.0;
    float bx = t.x + n.x * 0.45 - n.y * 0.08 - uSweep;
    float drift = 0.5 + 0.5 * sin(t.x * 3.2 - uSweep * 1.7);
    float band = exp(-bx * bx * 260.0) * 3.2 + exp(-bx * bx * 10.0) * 0.28 + drift * 0.06;
    float edge = 1.0 - n.z;
    vec3 base = vec3(0.62, 0.615, 0.60);
    vec3 warm = vec3(1.0, 0.42, 0.14) * smoothstep(-0.1, -0.85, n.y) * edge * 1.1;
    vec3 coolRim = vec3(0.78, 0.84, 1.0) * smoothstep(0.2, 0.95, n.y) * edge * 0.9;
    vec3 c = base * (env + band) * brush + warm + coolRim * (0.4 + band);
    return vec4(c, m * uTitleAlpha);
  }`;

const prefilterPass = new Pass(TITLE_GLSL + `
  uniform sampler2D tSrc; uniform float uThreshold, uKnee; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tSrc, vUv).rgb;
    vec4 tc = titleColor(vUv); c = mix(c, tc.rgb, tc.a);
    float br = max(c.r, max(c.g, c.b));
    float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee); soft = soft * soft / (4.0 * uKnee + 1e-4);
    float k = max(soft, br - uThreshold) / max(br, 1e-4);
    gl_FragColor = vec4(c * k, 1.0);
  }`, Object.assign({ tSrc: { value: null }, uThreshold: { value: 0.9 }, uKnee: { value: 0.5 } }, titleU));

const downPass = new Pass(`
  uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
  void main(){
    vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
    s += texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2( 1.0, -1.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2(-1.0,  1.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2( 1.0,  1.0) * uTexel).rgb;
    gl_FragColor = vec4(s / 8.0, 1.0);
  }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });

const upPass = new Pass(`
  uniform sampler2D tSrc, tBase; uniform vec2 uTexel; varying vec2 vUv;
  void main(){
    vec3 s = vec3(0.0);
    s += texture2D(tSrc, vUv + vec2(-2.0, 0.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2( 2.0, 0.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2(0.0, -2.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2(0.0,  2.0) * uTexel).rgb;
    s += texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb * 2.0;
    s += texture2D(tSrc, vUv + vec2( 1.0, -1.0) * uTexel).rgb * 2.0;
    s += texture2D(tSrc, vUv + vec2(-1.0,  1.0) * uTexel).rgb * 2.0;
    s += texture2D(tSrc, vUv + vec2( 1.0,  1.0) * uTexel).rgb * 2.0;
    gl_FragColor = vec4(s / 12.0 + texture2D(tBase, vUv).rgb, 1.0);
  }`, { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() } });

const compositePass = new Pass(TITLE_GLSL + `
  uniform sampler2D tColor, tBloom, tLines; uniform vec2 uRes;
  uniform float uBloom, uExposure, uFade, uTime, uGrain, uVignette, uZoom, uCA, uLift;
  varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main(){
    vec2 uv = vUv, dc = uv - 0.5;
    vec3 col;
    if (uZoom > 0.0005) {
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 12; i++) { float s = 1.0 - uZoom * float(i) / 11.0; acc += texture2D(tColor, 0.5 + dc * s).rgb; }
      col = acc / 12.0;
    } else {
      float ca = uCA * dot(dc, dc);
      col = vec3(texture2D(tColor, uv - dc * ca).r, texture2D(tColor, uv).g, texture2D(tColor, uv + dc * ca).b);
    }
    vec4 tc = titleColor(uv); col = mix(col, tc.rgb, tc.a);
    col += texture2D(tBloom, uv).rgb * uBloom;
    col *= uExposure;
    col = aces(col);
    // a whisper of split toning: cool shadows, warm highlights
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col += (vec3(-0.004, 0.0, 0.008) * smoothstep(0.0, 0.12, l) * (1.0 - l) + vec3(0.01, 0.004, -0.008) * l) * uLift;
    col = toSRGB(max(col, 0.0));
    float v = smoothstep(1.0, 0.2, length(dc * vec2(1.05, 0.85)));
    col *= mix(1.0, v, uVignette);
    vec4 tl = texture2D(tLines, uv);
    col = mix(col, tl.rgb, tl.a);
    float g = hash(uv * uRes + fract(uTime * 13.37) * 571.0) - 0.5;
    col += g * uGrain * (0.25 + 0.75 * smoothstep(0.0, 0.08, l)) * (0.6 + 0.4 * (1.0 - abs(l - 0.35) * 1.4));
    col = max(col, 0.0);
    col *= uFade;
    gl_FragColor = vec4(col, 1.0);
  }`, Object.assign({
  tColor: { value: null }, tBloom: { value: null }, tLines: { value: null }, uRes: { value: new THREE.Vector2() },
  uBloom: { value: 0.5 }, uExposure: { value: 1 }, uFade: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.045 },
  uVignette: { value: 0.35 }, uZoom: { value: 0 }, uCA: { value: 0.012 }, uLift: { value: 1 }
}, titleU));

/* ---------------- metal title mask ---------------- */
function buildTitleMask() {
  const w = 1200, h = 400, c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 280; g.font = `600 ${size}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = '-6px';
  while (g.measureText(COPY.name).width > w * 0.86 && size > 60) { size -= 8; g.font = `600 ${size}px ${FONT}`; }
  g.fillText(COPY.name, w / 2, h / 2 + size * 0.04);
  const src = g.getImageData(0, 0, w, h).data;
  const mask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = src[i * 4] / 255;
  // three box passes approximate a gaussian bevel profile
  let a = Float32Array.from(mask), b = new Float32Array(w * h);
  const R = 4;
  for (let it = 0; it < 3; it++) {
    for (let y = 0; y < h; y++) { let acc = 0; for (let x = -R; x <= R; x++) acc += a[y * w + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { b[y * w + x] = acc / (2 * R + 1); acc += a[y * w + Math.min(x + R + 1, w - 1)] - a[y * w + Math.max(x - R, 0)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -R; y <= R; y++) acc += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = acc / (2 * R + 1); acc += b[Math.min(y + R + 1, h - 1) * w + x] - b[Math.max(y - R, 0) * w + x]; } }
  }
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = y * w + x, di = ((h - 1 - y) * w + x) * 4;
    data[di] = mask[si] * 255; data[di + 1] = clamp(a[si] * 1.25) * 255; data[di + 2] = 0; data[di + 3] = 255;
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  titleU.tTitle.value = t;
  titleU.uTitleTexel.value.set(1 / w, 1 / h);
}

/* ---------------- plain text layer (drawn at render resolution) ---------------- */
const linesCanvas = makeCanvas(W, H);
const lctx = linesCanvas.getContext('2d');
const linesTex = new THREE.CanvasTexture(linesCanvas);
linesTex.colorSpace = THREE.NoColorSpace; linesTex.minFilter = THREE.LinearFilter; linesTex.generateMipmaps = false;
compositePass.u.tLines.value = linesTex;
let linesKey = '';
function drawLines(items) {
  const key = JSON.stringify(items) + W;
  if (key === linesKey) return;
  linesKey = key;
  const c = lctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  c.textBaseline = 'middle'; c.textAlign = 'left';
  for (const it of items) {
    const size = it.size * H;
    c.font = `${it.weight || 400} ${size}px ${FONT}`;
    if ('letterSpacing' in c) c.letterSpacing = `${(it.track || -0.01) * size}px`;
    const words = it.text.split(' ');
    const space = c.measureText(' ').width;
    const widths = words.map((w) => c.measureText(w).width);
    const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
    let x = W / 2 - total / 2; const y = it.y * H;
    words.forEach((w, i) => {
      const a = (it.words ? it.words[i] : 1) * (it.alpha == null ? 1 : it.alpha);
      if (a > 0.002) {
        const blur = (it.words ? 1 - it.words[i] : 1 - (it.alpha == null ? 1 : it.alpha)) * (it.blur || 0) * H;
        const dy = (it.rise || 0) * H * (it.words ? 1 - E.out(it.words[i]) : 0);
        c.fillStyle = it.color || 'rgba(242,238,232,1)';
        if (blur > 0.6) {
          c.globalAlpha = a; c.shadowColor = it.color || 'rgba(242,238,232,1)'; c.shadowBlur = blur; c.shadowOffsetX = 10000;
          c.fillText(w, x - 10000, y + dy);
          c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowColor = 'transparent';
          c.globalAlpha = a * clamp(1 - blur / (0.012 * H)); c.fillText(w, x, y + dy);
        } else { c.globalAlpha = a; c.fillText(w, x, y + dy); }
      }
      x += widths[i] + space;
    });
  }
  c.globalAlpha = 1;
  linesTex.needsUpdate = true;
}

/* ---------------- targets & sizing ---------------- */
function allocTargets() {
  for (const k in RT) { const v = RT[k]; if (Array.isArray(v)) v.forEach((r) => r.dispose()); else v.dispose(); }
  RT.scene = makeRT(W, H, { depthBuffer: true, samples: 4 });
  RT.depth = makeRT(W, H, { depthBuffer: true, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
  RT.dof = makeRT(W, H);
  RT.refl = makeRT(W >> 1, H >> 1, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  RT.down = []; RT.up = [];
  let w = W >> 1, h = H >> 1;
  for (let i = 0; i < 6; i++) { RT.down.push(makeRT(Math.max(w, 2), Math.max(h, 2))); RT.up.push(makeRT(Math.max(w, 2), Math.max(h, 2))); w >>= 1; h >>= 1; }
  floorU.tRefl.value = RT.refl.texture;
  dofPass.u.uRes.value.set(W, H); compositePass.u.uRes.value.set(W, H);
  linesCanvas.width = W; linesCanvas.height = H; linesKey = '';
  linesTex.dispose();
}

function resize(force) {
  const r = frameEl.getBoundingClientRect();
  const dpr = STILL ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  let h = Math.round((r.height || 960) * dpr * quality);
  h = Math.max(360, Math.min(h, 1920)); h -= h % 16;
  const w = Math.round((h * 9) / 16);
  if (!force && w === W && h === H && RT.scene) return;
  W = w; H = h;
  renderer.setSize(W, H, false);
  allocTargets();
}

const _black = new THREE.Color(0, 0, 0), _far = new THREE.Color(100, 100, 100);
function renderFrame(st) {
  // planar reflection
  if (floor.visible && st.reflStrength > 0) {
    updateReflectionCamera();
    floor.visible = false; const sv = shadow.visible; shadow.visible = false;
    renderer.setRenderTarget(RT.refl); renderer.clear(); renderer.render(scene, vcam);
    floor.visible = true; shadow.visible = sv;
  }
  renderer.setRenderTarget(RT.scene); renderer.clear(); renderer.render(scene, camera);

  let colorTex = RT.scene.texture;
  if (st.maxCoC > 0.5) {
    scene.overrideMaterial = depthMat; renderer.setClearColor(_far, 1);
    renderer.setRenderTarget(RT.depth); renderer.clear(); renderer.render(scene, camera);
    scene.overrideMaterial = null; renderer.setClearColor(_black, 1);
    dofPass.u.tColor.value = RT.scene.texture; dofPass.u.tDepth.value = RT.depth.texture;
    dofPass.u.uFocus.value = st.focus; dofPass.u.uAperture.value = st.aperture; dofPass.u.uMaxCoC.value = st.maxCoC * H;
    dofPass.render(RT.dof); colorTex = RT.dof.texture;
  }
  // bloom
  prefilterPass.u.tSrc.value = colorTex; prefilterPass.u.uThreshold.value = st.bloomThreshold;
  prefilterPass.render(RT.down[0]);
  for (let i = 1; i < RT.down.length; i++) {
    downPass.u.tSrc.value = RT.down[i - 1].texture; downPass.u.uTexel.value.set(1 / RT.down[i - 1].width, 1 / RT.down[i - 1].height);
    downPass.render(RT.down[i]);
  }
  let src = RT.down[RT.down.length - 1];
  for (let i = RT.down.length - 2; i >= 0; i--) {
    upPass.u.tSrc.value = src.texture; upPass.u.tBase.value = RT.down[i].texture; upPass.u.uTexel.value.set(1 / src.width, 1 / src.height);
    upPass.render(RT.up[i]); src = RT.up[i];
  }
  const cu = compositePass.u;
  cu.tColor.value = colorTex; cu.tBloom.value = src.texture;
  cu.uBloom.value = st.bloom; cu.uExposure.value = st.exposure; cu.uFade.value = st.fade; cu.uTime.value = st.t;
  cu.uGrain.value = st.grain; cu.uVignette.value = st.vignette; cu.uZoom.value = st.zoom; cu.uCA.value = st.ca;
  compositePass.render(null);
}
