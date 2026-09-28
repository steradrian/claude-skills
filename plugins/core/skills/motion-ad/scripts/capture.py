#!/usr/bin/env python3
"""Capture a web app's real screens, state by state, for app ads: full frames plus element-level
cut-outs with exact boxes, at the phone's notch-safe viewport.

    python3 capture.py <project_dir>            # reads <project_dir>/capture.json
    python3 capture.py <project_dir> --only pizza-panned,search-typed

capture.json:
{
  "origin": "http://localhost:3210",            # the app, running against a FICTIONAL data layer
  "viewport": {"width": 390, "height": 751},    # 844 - 59 status bar - 34 home indicator
  "dpr": 3,
  "user_agent": "Mozilla/5.0 (iPhone; ...)",     # optional; defaults to iPhone Safari
  "color_scheme": "light",
  "local_storage": {"theme": "light"},          # seeded before every page load
  "cookies": [{"name": "NEXT_LOCALE", "value": "en"}],
  "block": ["googletagmanager\\\\.com"],        # request URL regexes to abort
  "css": "nextjs-portal{display:none!important}",
  "out": "assets/captures",
  "states": [
    {"name": "pizza-panned", "url": "/en/cluj-napoca/places/x?preview=dish:1",
     "actions": [{"click": "role=tab[name=/Panned/]"}, {"wait": 600}, {"scroll_to": "text=What reviewers said", "offset": -120}],
     "elements": [
       {"name": "tabs-row", "selector": "[role=tablist]"},
       {"name": "pill-panned", "selector": "role=tab[name=/Panned/]"},
       {"name": "card-1", "selector": "article >> nth=0"},
       {"name": "highlight", "selector": "mark >> nth=0", "lines": true}
     ]}
  ]
}

Actions: click, fill {"fill": selector, "text": ...}, type {"type": selector, "text": ...},
press {"press": "Enter"}, wait (ms), wait_for (selector), scroll_to (selector, offset px),
scroll_by (px), eval (JS string).

Output: <out>/<state>.png (full frame), <out>/elements/<state>__<name>.png (clipped from the SAME
frame, rounded corners masked transparent), per-line crops <state>__<name>-line-N.png for inline
elements that wrap ("lines": true), and <out>/boxes.json with CSS-px boxes relative to the viewport:
exactly what device.js lift(ph, src, box) expects.

The data layer must be fictional (a mock API the app points at); never capture real customers'
data or real businesses the brand hasn't cleared.
"""
import argparse, io, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _venv
_venv.ensure()
from PIL import Image, ImageDraw

IPHONE_UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 '
             '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1')

BOX_JS = r"""
(el) => {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const rad = parseFloat(cs.borderTopLeftRadius) || 0;
  const lines = [...el.getClientRects()].map(q => ({x: q.left, y: q.top, w: q.width, h: q.height}));
  return {x: r.left, y: r.top, w: r.width, h: r.height, radius: rad, lines};
}
"""


def rounded(img, radius_px):
    """mask the corners of an element crop to transparent, using its own CSS radius"""
    if radius_px <= 0:
        return img
    img = img.convert('RGBA')
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius_px, fill=255)
    img.putalpha(m)
    return img


def crop(frame, box, dpr, vw, vh):
    x0, y0 = max(0, box['x']), max(0, box['y'])
    x1, y1 = min(vw, box['x'] + box['w']), min(vh, box['y'] + box['h'])
    if x1 <= x0 or y1 <= y0:
        return None, None
    c = frame.crop((round(x0 * dpr), round(y0 * dpr), round(x1 * dpr), round(y1 * dpr)))
    return c, {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'clipped': (x0, y0, x1, y1) != (box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h'])}


def run_actions(page, actions):
    for a in actions or []:
        if 'click' in a:
            page.locator(a['click']).first.click()
        elif 'fill' in a:
            page.locator(a['fill']).first.fill(a['text'])
        elif 'type' in a:
            page.locator(a['type']).first.type(a['text'], delay=a.get('delay', 20))
        elif 'press' in a:
            page.keyboard.press(a['press'])
        elif 'wait' in a:
            page.wait_for_timeout(a['wait'])
        elif 'wait_for' in a:
            page.locator(a['wait_for']).first.wait_for(timeout=a.get('timeout', 15000))
        elif 'scroll_to' in a:
            page.locator(a['scroll_to']).first.evaluate('(el, off) => { const s = (n => { while (n && n !== document.body) { const o = getComputedStyle(n).overflowY; if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n; n = n.parentElement } return document.scrollingElement })(el.parentElement); s.scrollTop += el.getBoundingClientRect().top + off - (s === document.scrollingElement ? 0 : s.getBoundingClientRect().top) }', a.get('offset', 0))
            page.wait_for_timeout(300)
        elif 'scroll_by' in a:
            page.mouse.wheel(0, a['scroll_by']); page.wait_for_timeout(300)
        elif 'eval' in a:
            page.evaluate(a['eval'])


def settle(page, css, ms=700):
    if css:
        page.add_style_tag(content=css)
    try:
        page.wait_for_load_state('networkidle', timeout=20000)
    except Exception:
        pass
    page.evaluate("""async () => { await document.fonts?.ready;
      await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 5000) }))) }""")
    page.wait_for_timeout(ms)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project')
    ap.add_argument('--only')
    a = ap.parse_args()
    proj = os.path.abspath(a.project)
    cfg = json.load(open(os.path.join(proj, 'capture.json')))
    vp, dpr = cfg.get('viewport', {'width': 390, 'height': 751}), cfg.get('dpr', 3)
    out = os.path.join(proj, cfg.get('out', 'assets/captures')); el_dir = os.path.join(out, 'elements')
    os.makedirs(el_dir, exist_ok=True)
    bpath = os.path.join(out, 'boxes.json')
    boxes = json.load(open(bpath)) if os.path.exists(bpath) else {'viewport_css': vp, 'dpr': dpr, 'elements': {}}
    only = set(a.only.split(',')) if a.only else None
    origin = cfg['origin'].rstrip('/')
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=vp, device_scale_factor=dpr, is_mobile=True, has_touch=True,
                            user_agent=cfg.get('user_agent', IPHONE_UA), color_scheme=cfg.get('color_scheme', 'light'),
                            locale=cfg.get('locale', 'en-US'), timezone_id=cfg.get('timezone'), bypass_csp=True)
        if cfg.get('local_storage'):
            ctx.add_init_script('(() => { const s = %s; try { for (const k in s) localStorage.setItem(k, typeof s[k] === "string" ? s[k] : JSON.stringify(s[k])) } catch (e) {} })()' % json.dumps(cfg['local_storage']))
        if cfg.get('cookies'):
            ctx.add_cookies([dict(c, url=c.get('url', origin)) for c in cfg['cookies']])
        for rx in cfg.get('block', []):
            ctx.route(re.compile(rx), lambda route: route.abort())
        page = ctx.new_page()
        for st in cfg['states']:
            if only and st['name'] not in only:
                continue
            page.goto(origin + st['url']); settle(page, cfg.get('css'))
            run_actions(page, st.get('actions')); settle(page, cfg.get('css'), st.get('settle', 500))
            png = page.screenshot()
            frame = Image.open(io.BytesIO(png)).convert('RGB')
            frame.save(os.path.join(out, st['name'] + '.png'))
            for e in st.get('elements', []):
                loc = page.locator(e['selector']).first
                if not loc.count():
                    print(f"  MISSING {st['name']}__{e['name']} ({e['selector']})"); continue
                bx = loc.evaluate(BOX_JS)
                img, box = crop(frame, bx, dpr, vp['width'], vp['height'])
                if img is None:
                    print(f"  OFFSCREEN {st['name']}__{e['name']}"); continue
                rad = e.get('radius', bx['radius'])
                fn = f"{st['name']}__{e['name']}.png"
                rounded(img, rad * dpr).save(os.path.join(el_dir, fn))
                boxes['elements'][fn] = dict(box, frame=st['name'] + '.png', radius=rad)
                if e.get('lines') and len(bx['lines']) > 1:
                    for i, ln in enumerate(bx['lines'], 1):
                        li, lb = crop(frame, ln, dpr, vp['width'], vp['height'])
                        if li is None:
                            continue
                        lfn = f"{st['name']}__{e['name']}-line-{i}.png"
                        rounded(li, rad * dpr).save(os.path.join(el_dir, lfn))
                        boxes['elements'][lfn] = dict(lb, frame=st['name'] + '.png', radius=rad)
            print(f"captured {st['name']} ({len(st.get('elements', []))} elements)")
        b.close()
    json.dump(boxes, open(bpath, 'w'), indent=1)
    print('boxes:', bpath)


if __name__ == '__main__':
    main()
