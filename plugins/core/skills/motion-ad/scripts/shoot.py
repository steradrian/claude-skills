#!/usr/bin/env python3
"""Render stills from a built ad for critique.

    python3 shoot.py <project_dir> [--times 0.5,2.1,4] [--shots] [--every 0.5] [--sheet] [--scale 0.3]

--times   comma-separated seconds
--shots   use config["shots"] (list of {t, label}); the storyboard's key frames. Default if no --times.
--every   sample every N seconds across the whole ad
--sheet   also write shots/contact.png: a labelled grid of all stills (look at THIS first)

Also runs automatic checks on every still and prints them:
  OVERFLOW   visible text whose glyphs run outside the frame (add data-bleed="1" to an element to allow it)
  (both checks measure real glyph boxes; a hit mid-animation, e.g. a stamp still slamming, can be fine: judge it)
  SAFE-ZONE  visible text inside the platform UI zones from config["safe_zone"] (top,right,bottom,left px)
  JS-ERROR   any page error
Exit code 0 even with warnings; read the output.
"""
import argparse, asyncio, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import _venv
_venv.ensure()

CHECK_JS = r"""
(sz) => {
  const st = document.getElementById('stage').getBoundingClientRect();
  const out = [], W = st.width, H = st.height;
  const walker = document.createTreeWalker(document.getElementById('shake'), NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('[data-bleed]') || seen.has(el)) continue;
    seen.add(el);
    const rg = document.createRange(); rg.selectNodeContents(n);
    const g = rg.getBoundingClientRect();           // actual glyph extents, transforms included
    let L = g.left, T = g.top, R = g.right, B = g.bottom;
    // walk up: hidden ancestors skip the text; overflow-clipping ancestors (other than the scene,
    // whose clip is the stage) cut the box down to what can actually be seen
    let v = el, visible = true;
    while (v && v.id !== 'shake') {
      const cs = getComputedStyle(v);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) { visible = false; break }
      if (v !== el && !v.classList.contains('scene') && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
        const c = v.getBoundingClientRect(); L = Math.max(L, c.left); T = Math.max(T, c.top); R = Math.min(R, c.right); B = Math.min(B, c.bottom);
      }
      v = v.parentElement;
    }
    if (!visible || R - L < 2 || B - T < 2) continue;
    const x0 = L - st.left, y0 = T - st.top, x1 = R - st.left, y1 = B - st.top;
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue;   // fully off-frame = flying in/out
    const txt = n.textContent.trim().slice(0, 40), box = [x0, y0, x1, y1].map(Math.round);
    if (x0 < -6 || y0 < -6 || x1 > W + 6 || y1 > H + 6) out.push(['OVERFLOW', txt, box]);
    else if (sz && (y0 < sz[0] || x1 > W - sz[1] || y1 > H - sz[2] || x0 < sz[3])) out.push(['SAFE-ZONE', txt, box]);
  }
  return out;
}
"""


async def shoot(proj, times, labels, sheet, scale):
    from playwright.async_api import async_playwright
    cfg = json.load(open(os.path.join(proj, 'ad.config.json')))
    W, H = cfg.get('width', 1080), cfg.get('height', 1920)
    sz = cfg.get('safe_zone')
    outdir = os.path.join(proj, 'shots'); os.makedirs(outdir, exist_ok=True)
    html = os.path.join(proj, 'dist', 'ad.html')
    if not os.path.exists(html):
        sys.exit('dist/ad.html missing: run build.py first')
    files, report = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W + 40, 'height': H + 40})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('file://' + html + '?t=0')
        await pg.wait_for_function('window.__ready === true', timeout=30000)
        await pg.evaluate('window.__prepareCapture()')
        loc = pg.locator('#stage')
        for t, lab in zip(times, labels):
            await pg.evaluate(f'window.__render({t})')
            await pg.wait_for_timeout(40)
            await pg.evaluate(f'window.__render({t})')
            f = os.path.join(outdir, f'shot_{t:06.2f}.png')
            await loc.screenshot(path=f)
            files.append((f, t, lab))
            for kind, txt, box in await pg.evaluate(CHECK_JS, sz):
                report.append(f'{kind:9s} t={t:5.2f}s  "{txt}"  box={box}')
        await b.close()
    for e in errs:
        report.insert(0, f'JS-ERROR  {e}')
    if sheet:
        from PIL import Image, ImageDraw
        tw, th = int(W * scale), int(H * scale)
        cols = min(4, len(files)) if H > W else min(3, len(files))
        rows = (len(files) + cols - 1) // cols
        pad, lab_h = 10, 34
        m = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + lab_h + pad) + pad), (30, 28, 26))
        d = ImageDraw.Draw(m)
        for i, (f, t, lab) in enumerate(files):
            im = Image.open(f).convert('RGB').resize((tw, th))
            x = pad + (i % cols) * (tw + pad); y = pad + (i // cols) * (th + lab_h + pad)
            m.paste(im, (x, y + lab_h))
            d.text((x + 2, y + 8), f'{t:.2f}s  {lab}'[:60], fill=(235, 228, 214))
        sp = os.path.join(outdir, 'contact.png'); m.save(sp)
        print('contact sheet:', sp)
    for f, t, lab in files:
        print('still:', f)
    print('\n'.join(report) if report else 'checks: no overflow / safe-zone / JS problems found')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project')
    ap.add_argument('--times')
    ap.add_argument('--shots', action='store_true')
    ap.add_argument('--every', type=float)
    ap.add_argument('--sheet', action='store_true')
    ap.add_argument('--scale', type=float, default=0.28)
    a = ap.parse_args()
    proj = os.path.abspath(a.project)
    cfg = json.load(open(os.path.join(proj, 'ad.config.json')))
    T = cfg.get('duration', 15)
    if a.times:
        times = [float(x) for x in a.times.split(',')]; labels = [''] * len(times)
    elif a.every:
        n = int(T / a.every); times = [round(i * a.every + a.every / 2, 3) for i in range(n)]; labels = [''] * len(times)
    else:
        shots = cfg.get('shots') or [{'t': round(T * i / 8 + T / 16, 2), 'label': ''} for i in range(8)]
        times = [s['t'] for s in shots]; labels = [s.get('label', '') for s in shots]
    if 'PLAYWRIGHT_BROWSERS_PATH' not in os.environ and os.path.isdir('/opt/pw-browsers'):
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
    asyncio.run(shoot(proj, times, labels, a.sheet, a.scale))


if __name__ == '__main__':
    main()
