#!/usr/bin/env python3
"""Scaffold a new ad project.

    python3 new_project.py ads/<slug> --title "Brand spring ad" --format 9:16 --duration 15 --style gritty-collage --ending loop

Creates:
  <dir>/brief.md          the answers from the intake
  <dir>/storyboard.md     concept + beat sheet
  <dir>/ad.config.json    format, fonts, film, palette, shots, assets, audio
  <dir>/scenes.js         the ad itself (you write this)
  <dir>/assets/ audio/ fonts/   drop brand files here

Style defaults (fonts, palette, film, components) come from the "## Defaults" JSON block of
references/styles/<style>.md, so a newly written pack scaffolds like the proven ones.

Inside a git repo the ads folder is added to .git/info/exclude: ad projects stay local and are
never committed, without touching the repo's .gitignore.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = os.path.join(os.path.dirname(HERE), 'references', 'styles')

FORMATS = {'9:16': (1080, 1920), '4:5': (1080, 1350), '1:1': (1080, 1080), '16:9': (1920, 1080)}
# approximate platform UI overlays (top, right, bottom, left) in px - keep key text out of these
SAFE = {'9:16': [220, 130, 400, 60], '4:5': [60, 60, 120, 60], '1:1': [60, 60, 100, 60], '16:9': [60, 80, 120, 80]}
GENERIC = {'components': ['core'], 'fonts': [], 'palette': {}, 'film': {'grain': .3, 'weave': 0, 'dust': 0, 'vignette': .25, 'leakBase': 0}, 'background': '#111111'}
# loop: the last frame flows into the first, so no fades; endcard: fade in, hold, fade out
ENDINGS = {'loop': {'fadeIn': 0, 'fadeOut': 0}, 'endcard': {'fadeIn': .12, 'fadeOut': .38}}

SCENES = r'''/* scenes.js - the ad. Every value is computed from time; see references/engine-api.md.
 * Conventions: one AD.scene per storyboard beat group; build DOM once at the top of each block,
 * animate only inside s.render(t, lt) where lt = time since the scene started.
 */
const { W, H, T, E, kf, prog, q12, boil, tf, $, place, grp, kick, clamp, lerp } = AD;

/* ===== SCENE 1 · hook (0 - 2.5) ===== */
const S1 = AD.scene(0, 2.5, AD.C.background);
{
  const s = S1;
  const title = AD.text(s.cam, 'Replace me', { x: W / 2, y: H / 2, w: W - 160, h: 200, style: { font: '140px sans-serif', color: '#f2f1ec', textAlign: 'center', lineHeight: '200px' } });
  kick(0.5, 8);
  s.render = (t, lt) => {
    const p = prog(lt, 0.3, 0.2, 'back');
    tf(title, 0, 0, 0, lerp(2, 1, p), p > 0 ? 1 : 0);
    tf(s.cam, 0, 0, 0, kf(lt, [[0, 1], [2.5, 1.08]]));
  };
}
'''

BRIEF = '''# Brief

- Brand / product:
- What's being advertised:
- Audience:
- Single takeaway (one sentence):
- Call to action / end card:
- Format / duration / platform / ending:
- Audio plan:
- Assets provided (logo, product visuals, fonts, colours):
- Claims & copy the user supplied or approved (NEVER invent claims for a real brand):
- Style pack:
- Energy / pacing:
- References they love:
- Hard no's:
- Brand rules (from ads/_brand.md):
'''

STORY = '''# Storyboard

Concept: <name> - <one-line idea>
Why this concept won over the other two:
Hook line:
Arc:

| # | Time | Beat (what we see) | Type on screen | Motion + transition out | Hero element | Sound cue |
|---|------|--------------------|----------------|-------------------------|--------------|-----------|
| 1 | 0.0-2.5 | | | | | |

Key frames for review (copy into ad.config.json "shots"):

## Runner-up concepts
'''


def style_defaults(style):
    path = os.path.join(STYLES, style + '.md')
    if not os.path.exists(path):
        return None
    m = re.search(r'^## Defaults\s*```json\s*(.*?)```', open(path).read(), re.S | re.M)
    if not m:
        return None
    return {**GENERIC, **json.loads(m.group(1))}


def exclude_from_git(d):
    """Add the ads folder (or the project itself) to .git/info/exclude. Idempotent; no-op outside git."""
    def git(*args):
        r = subprocess.run(['git', '-C', d, *args], capture_output=True, text=True)
        return r.stdout.strip() if r.returncode == 0 else None
    root = git('rev-parse', '--show-toplevel')
    if not root:
        return None
    parent = os.path.dirname(d)
    target = parent if os.path.basename(parent) == 'ads' else d
    rel = os.path.relpath(os.path.realpath(target), os.path.realpath(root))
    if rel.startswith('..'):
        return None
    line = '/' + rel.replace(os.sep, '/') + '/'
    ex = git('rev-parse', '--git-path', 'info/exclude')
    ex = ex if os.path.isabs(ex) else os.path.join(d, ex)
    os.makedirs(os.path.dirname(ex), exist_ok=True)
    have = open(ex).read().splitlines() if os.path.exists(ex) else []
    if line not in have:
        with open(ex, 'a') as f:
            f.write(('\n' if have and have[-1] else '') + f'# motion-ad projects, local only\n{line}\n')
    return line


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir')
    ap.add_argument('--title', default='Motion ad')
    ap.add_argument('--format', default='9:16', choices=FORMATS.keys())
    ap.add_argument('--duration', type=float, default=15)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--style', default='gritty-collage')
    ap.add_argument('--ending', default='loop', choices=ENDINGS.keys())
    a = ap.parse_args()
    d = os.path.abspath(a.dir)
    if os.path.exists(os.path.join(d, 'ad.config.json')):
        sys.exit(f'{d} already has an ad.config.json; not overwriting')
    for sub in ('', 'assets', 'audio', 'fonts'):
        os.makedirs(os.path.join(d, sub), exist_ok=True)
    W, H = FORMATS[a.format]
    sd = style_defaults(a.style)
    cfg = {
        'title': a.title, 'aria': f'{a.duration:g} second {a.format} ad: {a.title}',
        'style': a.style, 'format': a.format, 'width': W, 'height': H, 'duration': a.duration, 'fps': a.fps,
        'loop': True, 'ending': a.ending, 'background': (sd or GENERIC)['background'], 'safe_zone': SAFE[a.format],
        'components': (sd or GENERIC)['components'], 'fonts': (sd or GENERIC)['fonts'], 'palette': (sd or GENERIC)['palette'],
        'film': dict((sd or GENERIC)['film'], leaks=[], flashes=[], **ENDINGS[a.ending]),
        'beats': [], 'shots': [], 'assets': {}, 'audio': None,
    }
    json.dump(cfg, open(os.path.join(d, 'ad.config.json'), 'w'), indent=2)
    open(os.path.join(d, 'scenes.js'), 'w').write(SCENES)
    open(os.path.join(d, 'brief.md'), 'w').write(BRIEF)
    open(os.path.join(d, 'storyboard.md'), 'w').write(STORY)
    if sd is None:
        print(f'note: references/styles/{a.style}.md has no "## Defaults" block; fill fonts/palette/film in ad.config.json by hand')
    excluded = exclude_from_git(d)
    if excluded:
        print(f'git: {excluded} added to .git/info/exclude (local only, never committed)')
    print(f'created {d}  ({W}x{H}, {a.duration:g}s, style={a.style}, ending={a.ending})')


if __name__ == '__main__':
    main()
