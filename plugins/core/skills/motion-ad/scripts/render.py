#!/usr/bin/env python3
"""Render a built ad to MP4, frame by frame (deterministic, no dropped frames).

    python3 render.py <project_dir> [--fps 30] [--workers 3] [--crf 24] [--max-frames N] [--encode-only] [--clean]

- Frames go to <project>/frames/ and are RESUMABLE: rerun and it continues where it stopped.
  Use --max-frames to render in chunks if your shell has a timeout (e.g. --max-frames 200),
  or run the command in the background and poll.
- Encodes <project>/dist/<slug>-<W>x<H>.mp4 (H.264, yuv420p, faststart).
- Audio: config["audio"] = {"file": "audio/track.mp3", "offset": 0.0, "fade_out": 0.6, "volume": 1.0}
  offset = seconds into the track where the ad starts.
- Sound effects: config["sfx"] = [{"file": "audio/sfx/stamp.wav", "t": 9.71, "volume": 0.8}, ...],
  mixed under the music at their times. `scripts/sfx.py <project>/audio/sfx` makes a licence-free kit.
- --mix full,sfx,silent writes one MP4 per mix: music + sfx, sfx only (for a track added later in
  an editor or the platform), and silent. Default: full.
"""
import argparse, asyncio, glob, json, os, re, shutil, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _venv
_venv.ensure()


async def render_frames(proj, cfg, fps, workers, max_frames):
    from playwright.async_api import async_playwright
    W, H, T = cfg.get('width', 1080), cfg.get('height', 1920), cfg.get('duration', 15)
    n = int(round(T * fps))
    fdir = os.path.join(proj, 'frames'); os.makedirs(fdir, exist_ok=True)
    import hashlib
    h = hashlib.sha1(open(os.path.join(proj, 'dist', 'ad.html'), 'rb').read()).hexdigest() + f'@{fps}'
    hp = os.path.join(fdir, '.buildhash')
    if os.path.exists(hp) and open(hp).read() != h:
        print('build changed since last render: discarding old frames')
        for f in glob.glob(os.path.join(fdir, '*.jpg')): os.remove(f)
    open(hp, 'w').write(h)
    todo = [i for i in range(n) if not os.path.exists(os.path.join(fdir, f'{i:05d}.jpg'))]
    if max_frames:
        todo = todo[:max_frames]
    if not todo:
        return n, 0
    html = 'file://' + os.path.join(proj, 'dist', 'ad.html') + '?t=0'
    async with async_playwright() as p:
        b = await p.chromium.launch()

        async def worker(idx):
            pg = await b.new_page(viewport={'width': W + 40, 'height': H + 40})
            await pg.goto(html)
            await pg.wait_for_function('window.__ready === true', timeout=30000)
            await pg.evaluate('window.__prepareCapture()')
            loc = pg.locator('#stage')
            mine = todo[idx::workers]
            for k, i in enumerate(mine):
                await pg.evaluate(f'window.__render({i / fps})')
                await loc.screenshot(path=os.path.join(fdir, f'{i:05d}.jpg'), type='jpeg', quality=93)
                if idx == 0 and k % 30 == 0:
                    done = n - len([j for j in range(n) if not os.path.exists(os.path.join(fdir, f'{j:05d}.jpg'))])
                    print(f'  frames {done}/{n}', flush=True)
            await pg.close()
        await asyncio.gather(*[worker(i) for i in range(workers)])
        await b.close()
    return n, len(todo)


MIXES = ('full', 'sfx', 'silent')


def encode(proj, cfg, fps, crf, mix='full'):
    """mix: full = music + sfx, sfx = effects only (for a licensed track added later), silent."""
    W, H = cfg.get('width', 1080), cfg.get('height', 1920)
    slug = re.sub(r'[^a-z0-9]+', '-', cfg.get('title', 'ad').lower()).strip('-') or 'ad'
    out = os.path.join(proj, 'dist', f'{slug}-{W}x{H}' + ('' if mix == 'full' else f'-{mix}') + '.mp4')
    ew, eh = W - W % 2, H - H % 2
    T = cfg.get('duration', 15)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(proj, 'frames', '%05d.jpg')]
    au = cfg.get('audio') if mix == 'full' else None
    sfx = cfg.get('sfx', []) if mix != 'silent' else []
    chains, labels, idx = [], [], 1
    if au and au.get('file'):
        cmd += ['-ss', str(au.get('offset', 0)), '-i', os.path.join(proj, au['file'])]
        chains.append(f"[{idx}:a]volume={au.get('volume', 1.0)},aresample=48000,aformat=channel_layouts=stereo[m]")
        labels.append('[m]'); idx += 1
    # sfx: [{"file": "audio/sfx/stamp.wav", "t": 9.71, "volume": 0.8}], each delayed to its time
    for k, s in enumerate(sfx):
        cmd += ['-i', os.path.join(proj, s['file'])]
        ms = max(0, int(round(s['t'] * 1000)))
        chains.append(f"[{idx}:a]volume={s.get('volume', 1.0)},aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[s{k}]")
        labels.append(f'[s{k}]'); idx += 1
    cmd += ['-vf', f'crop={ew}:{eh}:0:0', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p']
    if labels:
        fo = (au or {}).get('fade_out', .6)
        # amix without normalising so levels stay as set; apad so short audio never cuts the video;
        # a limiter keeps stacked hits from clipping; -t trims everything to the ad length
        chains.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,"
                      f"alimiter=limit=0.95,afade=t=out:st={max(0, T - fo)}:d={fo},apad[a]")
        cmd += ['-filter_complex', ';'.join(chains), '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-t', str(T), '-movflags', '+faststart', out]
    subprocess.run(cmd, check=True)
    print(f'encoded {out} ({os.path.getsize(out) / 1e6:.1f} MB)')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project')
    ap.add_argument('--fps', type=int)
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--crf', type=int, default=24, help='lower = bigger + sharper. Grainy styles compress badly; 24-26 is a good range')
    ap.add_argument('--max-frames', type=int)
    ap.add_argument('--encode-only', action='store_true')
    ap.add_argument('--clean', action='store_true', help='delete old frames first (stale frames are also discarded automatically when dist/ad.html changes)')
    ap.add_argument('--mix', default='full', help=f'comma list of {", ".join(MIXES)}; e.g. full,sfx,silent writes three MP4s')
    a = ap.parse_args()
    proj = os.path.abspath(a.project)
    cfg = json.load(open(os.path.join(proj, 'ad.config.json')))
    fps = a.fps or cfg.get('fps', 30)
    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg not found (macOS: brew install ffmpeg)')
    if 'PLAYWRIGHT_BROWSERS_PATH' not in os.environ and os.path.isdir('/opt/pw-browsers'):
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
    if a.clean:
        shutil.rmtree(os.path.join(proj, 'frames'), ignore_errors=True)
    if not a.encode_only:
        n, did = asyncio.run(render_frames(proj, cfg, fps, a.workers, a.max_frames))
        have = len(glob.glob(os.path.join(proj, 'frames', '*.jpg')))
        print(f'rendered {did} frames this run; {have}/{n} total')
        if have < n:
            print('NOT FINISHED: rerun the same command to continue.')
            return
    for m in a.mix.split(','):
        if m not in MIXES:
            sys.exit(f'--mix {m}: use {", ".join(MIXES)}')
        encode(proj, cfg, fps, a.crf, m)


if __name__ == '__main__':
    main()
