#!/usr/bin/env python3
"""Build a self-contained ad page.

    python3 build.py <project_dir>

Reads <project_dir>/ad.config.json and <project_dir>/scenes.js, inlines the engine,
the components listed in config["components"], and every font in config["fonts"]
(base64 woff2, so renders are identical offline), and writes <project_dir>/dist/ad.html.

Font entries:
  {"family": "Anton", "google": "Anton"}
  {"family": "PF", "google": "Playfair Display", "axes": "ital,wght@0,400..900;1,400..900"}
  {"family": "Brand", "file": "fonts/Brand-Bold.woff2", "weight": "700", "style": "normal"}
"family" is the CSS name scenes use; it may differ from the Google family name.
"""
import base64, hashlib, json, os, re, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
KEEP_SUBSETS = ('latin', 'latin-ext')


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def google_font(entry, cache_dir):
    fam = entry['google']
    q = urllib.parse.quote_plus(fam) + (':' + entry['axes'] if entry.get('axes') else '')
    url = f'https://fonts.googleapis.com/css2?family={q}&display=block'
    key = hashlib.sha1((url + entry['family']).encode()).hexdigest()[:16]
    cached = os.path.join(cache_dir, key + '.css')
    if os.path.exists(cached):
        return open(cached).read()
    css = fetch(url)
    out = []
    for m in re.finditer(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]*})', css):
        subset, block = m.group(1), m.group(2)
        if subset not in KEEP_SUBSETS:
            continue
        def inline(mm):
            b = base64.b64encode(fetch(mm.group(1), binary=True)).decode()
            return f'url(data:font/woff2;base64,{b})'
        block = re.sub(r'url\((https://[^)]+)\)', inline, block)
        block = re.sub(r"font-family:\s*'[^']*'", f"font-family: '{entry['family']}'", block)
        out.append(block)
    if not out:  # some families have no subset comments
        for block in re.findall(r'@font-face\s*{[^}]*}', css):
            block = re.sub(r'url\((https://[^)]+)\)', lambda mm: f"url(data:font/woff2;base64,{base64.b64encode(fetch(mm.group(1), True)).decode()})", block)
            block = re.sub(r"font-family:\s*'[^']*'", f"font-family: '{entry['family']}'", block)
            out.append(block)
    res = '\n'.join(out)
    os.makedirs(cache_dir, exist_ok=True)
    open(cached, 'w').write(res)
    return res


def file_font(entry, proj):
    path = os.path.join(proj, entry['file'])
    ext = os.path.splitext(path)[1].lower().lstrip('.')
    fmt = {'woff2': 'woff2', 'woff': 'woff', 'ttf': 'truetype', 'otf': 'opentype'}[ext]
    mime = {'woff2': 'font/woff2', 'woff': 'font/woff', 'ttf': 'font/ttf', 'otf': 'font/otf'}[ext]
    b = base64.b64encode(open(path, 'rb').read()).decode()
    return (f"@font-face{{font-family:'{entry['family']}';src:url(data:{mime};base64,{b}) format('{fmt}');"
            f"font-weight:{entry.get('weight', '400')};font-style:{entry.get('style', 'normal')};font-display:block}}")


MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif'}


def data_url(path):
    """Inline a brand file (config "assets": {"logo": "assets/logo.svg"}) so the page needs nothing external."""
    ext = os.path.splitext(path)[1].lower()
    if ext not in MIME:
        sys.exit(f'asset {path}: unsupported type {ext or "(none)"}; use one of {", ".join(MIME)}')
    return f'data:{MIME[ext]};base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def script_json(value):
    # a "</script>" inside a copy string would end the inline script early
    return json.dumps(value).replace('</', '<\\/')


def build(proj):
    proj = os.path.abspath(proj)
    cfg = json.load(open(os.path.join(proj, 'ad.config.json')))
    tpl = open(os.path.join(SKILL, 'assets', 'template.html')).read()
    cache = os.path.join(proj, '.cache', 'fonts')
    fonts, warnings = [], []
    for f in cfg.get('fonts', []):
        try:
            fonts.append(file_font(f, proj) if 'file' in f else google_font(f, cache))
        except Exception as e:
            warnings.append(f"font '{f.get('family')}' failed to inline ({e}).")
            if 'google' in f:  # fall back to a live stylesheet; works when rendering online
                q = urllib.parse.quote_plus(f['google']) + (':' + f['axes'] if f.get('axes') else '')
                fonts.insert(0, f"@import url('https://fonts.googleapis.com/css2?family={q}&display=block');")
    engine = open(os.path.join(HERE, 'engine.js')).read()
    comps = []
    for c in cfg.get('components', ['core']):
        p = os.path.join(proj, c) if c.endswith('.js') else os.path.join(HERE, 'components', c + '.js')
        comps.append(f'/* ---- {os.path.basename(p)} ---- */\n' + open(p).read())
    scenes = open(os.path.join(proj, 'scenes.js')).read()
    assets = {name: data_url(os.path.join(proj, rel)) for name, rel in cfg.get('assets', {}).items()}
    public_cfg = {k: v for k, v in cfg.items() if k not in ('fonts', 'components', 'audio', 'extra_css', 'assets')}
    extra_css = cfg.get('extra_css', '')
    if os.path.exists(os.path.join(proj, 'extra.css')):
        extra_css += '\n' + open(os.path.join(proj, 'extra.css')).read()
    html = (tpl.replace('/*FONTS*/', '\n'.join(fonts))
               .replace('/*CONFIG*/', script_json(public_cfg))
               .replace('/*ASSETS*/', script_json(assets))
               .replace('/*ENGINE*/', engine)
               .replace('/*COMPONENTS*/', '\n'.join(comps))
               .replace('/*SCENES*/', scenes)
               .replace('/*EXTRA_CSS*/', extra_css)
               .replace('{{TITLE}}', cfg.get('title', 'Motion ad'))
               .replace('{{ARIA}}', cfg.get('aria', cfg.get('title', 'Motion ad'))))
    os.makedirs(os.path.join(proj, 'dist'), exist_ok=True)
    out = os.path.join(proj, 'dist', 'ad.html')
    open(out, 'w').write(html)
    for w in warnings:
        print('WARNING:', w)
    print(f'built {out} ({len(html)/1024:.0f} KB, {len(fonts)} font blocks)')
    return out


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    build(sys.argv[1])
