#!/usr/bin/env python3
"""Check everything motion-ad needs. Prints what is missing and how to install it."""
import asyncio, importlib.util, os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _venv
_venv.ensure()

SETUP = f'bash {os.path.join(os.path.dirname(os.path.abspath(__file__)), "setup.sh")}'
ok = True
def need(cond, name, fix):
    global ok
    print(('  ok   ' if cond else '  MISSING ') + name + ('' if cond else f'\n         fix: {fix}'))
    ok = ok and cond

print(f'motion-ad environment check ({sys.executable})')
need(sys.version_info >= (3, 9), f'python >= 3.9 (have {sys.version.split()[0]})', 'install a newer python3')
has_pw = importlib.util.find_spec('playwright') is not None
need(has_pw, 'playwright (python)', SETUP)
need(importlib.util.find_spec('PIL') is not None, 'Pillow (contact sheets)', SETUP)
need(shutil.which('ffmpeg') is not None, 'ffmpeg (MP4 encode)', 'macOS: brew install ffmpeg   |   Ubuntu: sudo apt install ffmpeg')
if has_pw:
    if 'PLAYWRIGHT_BROWSERS_PATH' not in os.environ and os.path.isdir('/opt/pw-browsers'):
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
    async def t():
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            b = await p.chromium.launch(); await b.close()
    try:
        asyncio.run(t()); need(True, 'chromium launches', '')
    except Exception as e:
        need(False, f'chromium launches ({str(e).splitlines()[0][:80]})', SETUP)
print('\nREADY' if ok else '\nNOT READY: fix the items above, then rerun.')
sys.exit(0 if ok else 1)
