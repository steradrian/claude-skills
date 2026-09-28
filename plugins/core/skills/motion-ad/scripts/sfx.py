#!/usr/bin/env python3
"""Synthesise a small, licence-free sound-effect kit for motion ads.

    python3 sfx.py <out_dir>

Writes 48 kHz mono WAVs: print (thermal printer burst), print_long, tear (paper rip), stamp
(rubber-stamp thud), hit (low slam for type landing), whoosh (transition swell), tick (UI tap),
flip (paper flick). Deterministic (fixed seeds), so a re-run gives the same files.
Everything is generated, so there is nothing to license or credit. Swap in recorded CC0 sounds
(e.g. Kenney, Freesound CC0) by dropping files with the same names into the folder.
"""
import os, sys, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _venv
_venv.ensure()
import numpy as np

SR = 48000


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a, d, curve=4.0):
    """attack a seconds (linear), then exponential-ish decay over the rest"""
    x = np.arange(n) / SR
    e = np.where(x < a, x / max(a, 1e-4), np.exp(-curve * (x - a) / max(d, 1e-4)))
    return e


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def norm(x, peak=0.9):
    return x / (np.abs(x).max() + 1e-9) * peak


def printer(d, seed):
    r = np.random.default_rng(seed)
    n = int(SR * d)
    # stepper motor: a buzzy 520 Hz square-ish tone with a slight wobble
    tt = t_(d)
    motor = np.sign(np.sin(2 * np.pi * (520 + 12 * np.sin(2 * np.pi * 9 * tt)) * tt)) * .25
    motor = bandpass(motor, 300, 4000)
    # print head: dense clicks, one per dot row
    clicks = np.zeros(n)
    for c in np.arange(0, d, 1 / 180):
        i = int(c * SR)
        k = min(n - i, 90)
        clicks[i:i + k] += r.normal(0, 1, k) * np.exp(-np.arange(k) / 14) * (0.5 + 0.5 * r.random())
    clicks = bandpass(clicks, 2000, 9000) * .5
    e = np.minimum(1, np.minimum(tt / .01, (d - tt) / .03))
    return norm((motor + clicks) * e, .7)


def tear(seed=5):
    r = np.random.default_rng(seed)
    d = .42
    tt = t_(d)
    n = len(tt)
    noise = r.normal(0, 1, n)
    # crackle: fibres snapping, sparse impulses riding the noise
    crack = (r.random(n) < .012) * r.normal(0, 4, n)
    x = bandpass(noise * .6 + crack, 900, 7000)
    shape = np.clip(tt / .05, 0, 1) * np.exp(-2.2 * np.clip(tt - .22, 0, None) / .2)
    am = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 34 * tt + r.random()))
    return norm(x * shape * am, .75)


def stamp(seed=7):
    r = np.random.default_rng(seed)
    d = .45
    tt = t_(d)
    n = len(tt)
    f = 95 * np.exp(-tt * 6) + 48
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .22, 3.2)
    knock = np.sin(2 * np.pi * 210 * tt) * env(n, .001, .05, 5) * .5
    click = bandpass(r.normal(0, 1, n), 1500, 8000) * env(n, .0005, .012, 6) * .6
    return norm(body + knock + click, .95)


def hit(seed=9):
    r = np.random.default_rng(seed)
    d = .6
    tt = t_(d)
    n = len(tt)
    f = 70 * np.exp(-tt * 4) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, .4, 3)
    air = bandpass(r.normal(0, 1, n), 200, 2500) * env(n, .002, .08, 5) * .35
    return norm(boom + air, .9)


def whoosh(seed=11):
    r = np.random.default_rng(seed)
    d = .7
    tt = t_(d)
    n = len(tt)
    x = r.normal(0, 1, n)
    # sweep a band from low to high across the swell
    out = np.zeros(n)
    seg = 2400
    for i in range(0, n, seg):
        p = i / n
        lo, hi = 300 + 2500 * p, 1200 + 7000 * p
        out[i:i + seg] = bandpass(x[i:i + seg], lo, hi)
    shape = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    return norm(out * shape, .6)


def tick(seed=13):
    d = .09
    tt = t_(d)
    n = len(tt)
    x = np.sin(2 * np.pi * 1800 * tt) * env(n, .0008, .025, 6) + np.sin(2 * np.pi * 3600 * tt) * env(n, .0005, .01, 6) * .4
    return norm(x, .5)


def flip(seed=15):
    r = np.random.default_rng(seed)
    d = .22
    tt = t_(d)
    n = len(tt)
    x = bandpass(r.normal(0, 1, n), 1200, 6000) * env(n, .02, .12, 4)
    return norm(x, .55)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    kit = {'print': printer(.2, 1), 'print_long': printer(.55, 2), 'tear': tear(), 'stamp': stamp(),
           'hit': hit(), 'whoosh': whoosh(), 'tick': tick(), 'flip': flip()}
    for name, x in kit.items():
        write(os.path.join(out, name + '.wav'), x)
    print(f'wrote {len(kit)} sounds to {out}: ' + ', '.join(kit))


if __name__ == '__main__':
    main()
