/* descent: infinite-zoom camera ("Droste" chain). Requires engine.
 * Build N full-frame layers (W×H boxes, position:absolute, left/top 0, transform-origin 0 0), innermost = index 0.
 * Each layer i (except the last) declares `rect: [x, y, w]` = where its whole frame appears inside layer i+1
 * (height follows the frame aspect). Append DOM from outermost to innermost so inner layers paint on top.
 *   const cam = AD.descent([{el: L0, rect: [...]}, {el: L1, rect: [...], extra: [L1top]}, {el: L2}]);
 *   cam.apply(z)  // z = 0 → layer 0 fills the screen, z = 1 → layer 1 fills it, ...; z > N-1 keeps pulling back.
 * Between two layers the camera is a pure zoom around the fixed point of the pair, in log-scale, so the motion
 * never drifts or spirals. Each layer gets its own transform (rendered at true on-screen size → stays crisp).
 * `extra` elements share a layer's transform (use them for overlays that must paint above the next-inner layer).
 */
(() => {
  const { W, H } = AD, CX = W / 2, CY = H / 2;
  function descent(layers, { minS = .012, maxS = 36, outRate = .72 } = {}) {
    const N = layers.length;
    const M = layers.map(l => { if (!l.rect) return null; const [x, y, w] = l.rect, k = w / W, cx = x + w / 2, cy = y + H * k / 2; return { s: k, tx: cx - k * CX, ty: cy - k * CY, k, cx, cy } });
    const comp = (a, b) => ({ s: a.s * b.s, tx: a.s * b.tx + a.tx, ty: a.s * b.ty + a.ty });
    const inv = a => ({ s: 1 / a.s, tx: -a.tx / a.s, ty: -a.ty / a.s });
    function at(z) {
      const T = new Array(N);
      if (z >= N - 1) {
        const s = Math.pow(outRate, z - (N - 1)); T[N - 1] = { s, tx: CX * (1 - s), ty: CY * (1 - s) };
        for (let j = N - 2; j >= 0; j--) T[j] = comp(T[j + 1], M[j]);
      } else {
        const n = Math.max(0, Math.floor(z)), f = Math.max(0, z - n), m = M[n], k = m.k, s = Math.pow(k, -(1 - f));
        const Fx = (m.cx - k * CX) / (1 - k), Fy = (m.cy - k * CY) / (1 - k);
        T[n + 1] = { s, tx: Fx * (1 - s), ty: Fy * (1 - s) };
        for (let j = n; j >= 0; j--) T[j] = comp(T[j + 1], M[j]);
        for (let j = n + 2; j < N; j++) T[j] = comp(T[j - 1], inv(M[j - 1]));
      }
      return T;
    }
    function apply(z) {
      const T = at(z);
      layers.forEach((l, i) => {
        const t = T[i], vis = t.s > minS && t.s < maxS, d = vis ? 'block' : 'none', tr = `translate(${t.tx.toFixed(2)}px,${t.ty.toFixed(2)}px) scale(${t.s.toFixed(5)})`;
        [l.el, ...(l.extra || [])].forEach(e => { e.style.display = d; if (vis) e.style.transform = tr });
      });
      return T;
    }
    return { at, apply, rects: M };
  }
  Object.assign(AD, { descent });
})();
