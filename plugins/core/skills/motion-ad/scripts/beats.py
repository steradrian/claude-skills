#!/usr/bin/env python3
"""Tempo, beat grid and a good start point for a music track.

    python3 beats.py <audio file> [--duration 15] [--from 90] [--to 190]

Prints JSON: bpm, the suggested offset (seconds into the track), beats relative to that offset
(paste into ad.config.json "beats"), the drops (downbeats where the low end jumps back in after a
breakdown) and energy per 15s. The offset is the first drop inside [--from, --to] that leaves
--duration seconds of full-energy track; failing that, the loudest window starting on a downbeat.
For long / extended mixes pass --from and --to around the middle so the ad never starts on the
intro. Onset detection is approximate: say so, and let the user nudge the offset by ear.
"""
import argparse, json, os, subprocess, sys, tempfile, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _venv
_venv.ensure()
import numpy as np


def load(path):
    tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', '22050', tmp], check=True)
    w = wave.open(tmp)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, w.getframerate()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('audio')
    ap.add_argument('--duration', type=float, default=15)
    ap.add_argument('--from', dest='lo', type=float, default=20)
    ap.add_argument('--to', dest='hi', type=float, default=1e9)
    a = ap.parse_args()
    x, sr = load(a.audio)
    total = len(x) / sr
    hop, n = 512, 2048
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    spec = np.abs(np.fft.rfft(frames, axis=1))
    fps = sr / hop
    freqs = np.fft.rfftfreq(n, 1 / sr)
    low = spec[:, freqs < 150].sum(1)
    rms = np.sqrt((frames ** 2).mean(1))
    flux = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(1)])
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)

    # tempo from the onset autocorrelation, 90-160 BPM, parabolic refinement
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    lags = np.arange(len(ac))
    bpm_of = 60 * fps / np.maximum(lags, 1)
    mask = (bpm_of >= 90) & (bpm_of <= 160)
    lag = lags[mask][np.argmax(ac[mask])]
    p, q, r = ac[lag - 1], ac[lag], ac[lag + 1]
    period = (lag + 0.5 * (p - r) / (p - 2 * q + r)) / fps

    # phase that puts the most onset energy on the grid; downbeat = position with the most low end
    best, phase = -1e9, 0.0
    for ph in np.linspace(0, period, 200, endpoint=False):
        idx = (np.arange(ph, total, period) * fps).astype(int)
        s = flux[idx[idx < len(flux)]].sum()
        if s > best:
            best, phase = s, ph
    beats = np.arange(phase, total, period)
    bi = (beats * fps).astype(int)
    bi = bi[bi < len(low)]
    pos = max(range(4), key=lambda k: low[bi[k::4]].mean())
    downbeats = beats[pos::4]

    bar_low = [(float(d), float(low[int(d * fps):int((d + 4 * period) * fps)].mean())) for d in downbeats if d + 4 * period < total]
    drops = [bar_low[i][0] for i in range(1, len(bar_low)) if bar_low[i][1] > 1.8 * bar_low[i - 1][1]]
    ok = lambda d: a.lo <= d and d + a.duration <= min(a.hi, total - 2)
    level = np.median([v for _, v in bar_low])
    offset = next((d for d in drops if ok(d) and min(v for t, v in bar_low if d <= t < d + a.duration) > .6 * level), None)
    if offset is None:
        cand = [d for d in downbeats if ok(d)]
        offset = max(cand, key=lambda d: rms[int(d * fps):int((d + a.duration) * fps)].mean()) if cand else float(downbeats[0])
    rel = [round(float(t - offset), 3) for t in beats if offset - 1e-6 <= t < offset + a.duration]
    print(json.dumps({
        'bpm': round(float(60 / period), 2), 'beat': round(float(period), 4), 'bar': round(float(4 * period), 4),
        'offset': round(float(offset), 3), 'beats': rel,
        'drops': [round(d, 2) for d in drops],
        'energy_by_15s': [[m * 15, round(float(rms[int(m * 15 * fps):int((m + 1) * 15 * fps)].mean()), 4)] for m in range(int(total / 15))],
    }))


if __name__ == '__main__':
    main()
