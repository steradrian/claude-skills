
/* =====================================================================
   FILM STUDIO ENGINE — score
   Every sound is synthesized and scheduled against the picture's clock.
   Films add cues in FILM.score(sc, at, ok, NOTE).
   ===================================================================== */
const NOTE = { A1: 55, B1: 61.74, D2: 73.42, E2: 82.41, Fs2: 92.5, G1: 49, G2: 98, A2: 110, B2: 123.47, D3: 146.83, E3: 164.81, Fs3: 185, A3: 220, B3: 246.94, Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440, D5: 587.33, Fs5: 739.99, A5: 880, D6: 1174.66, E6: 1318.51, Fs6: 1479.98, A6: 1760, B5: 987.77, E5: 659.25, C4: 261.63, G4: 392, C5: 523.25, G5: 783.99, E4b: 311.13, C6: 1046.5, G3: 196, C3: 130.81, F3: 174.61, F4: 349.23, A3b: 207.65, B4: 493.88 };

class Score {
  constructor(ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = ctx || new AC({ latencyHint: 'playback' });
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -15; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.28;
    this.master.connect(comp); comp.connect(c.destination);
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(4.6, 2.4);
    this.revIn = c.createGain(); this.revIn.connect(this.rev);
    const revOut = c.createGain(); revOut.gain.value = 0.6; this.rev.connect(revOut); revOut.connect(this.master);
    this.noiseBuf = this.noise(4);
    this.sources = [];
  }
  impulse(sec, decay) {
    const c = this.ctx, rate = c.sampleRate, len = Math.floor(rate * sec), b = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len, pre = i < rate * 0.018 ? 0 : 1;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * pre * (1 - 0.5 * Math.exp(-t * 40));
      }
    }
    return b;
  }
  noise(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.7 + last * 3; }
    return b;
  }
  route(node, pan = 0, send = 0.2, dry = 1) {
    const c = this.ctx;
    const p = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    if (p.pan) p.pan.value = pan;
    node.connect(p);
    const d = c.createGain(); d.gain.value = dry; p.connect(d); d.connect(this.master);
    const s = c.createGain(); s.gain.value = send; p.connect(s); s.connect(this.revIn);
    return p;
  }
  track(src, t0, t1) { src.start(Math.max(t0, this.ctx.currentTime)); src.stop(t1 + 0.1); this.sources.push(src); }
  env(g, t, a, peak, dur, rel = null) {
    g.gain.setValueAtTime(0.00001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (rel == null) g.gain.exponentialRampToValueAtTime(0.00001, t + dur);
    else { g.gain.setValueAtTime(peak, t + dur - rel); g.gain.exponentialRampToValueAtTime(0.00001, t + dur); }
  }
  tone(t, { f, f2 = null, fT = null, type = 'sine', a = 0.004, peak = 0.2, dur = 0.5, rel = null, pan = 0, send = 0.2, lp = null, shape = null }) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (fT || dur));
    let head = o;
    if (shape) { const ws = c.createWaveShaper(); ws.curve = shape; head.connect(ws); head = ws; }
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; head.connect(fl); head = fl; }
    head.connect(g); this.env(g, t, a, peak, dur, rel); this.route(g, pan, send);
    this.track(o, t, t + dur);
  }
  noiseHit(t, { dur = 0.2, a = 0.002, peak = 0.2, type = 'bandpass', f = 2000, f2 = null, q = 1, pan = 0, pan2 = null, send = 0.2, rel = null }) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; s.loopStart = Math.random() * 2;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    s.connect(fl); fl.connect(g); this.env(g, t, a, peak, dur, rel);
    const p = this.route(g, pan, send);
    if (pan2 != null && p.pan) { p.pan.setValueAtTime(pan, t); p.pan.linearRampToValueAtTime(pan2, t + dur); }
    this.track(s, t, t + dur);
  }
  bell(t, f, peak = 0.06, dur = 3, pan = 0, send = 0.5, ratio = 3.5, index = 2.2) {
    const c = this.ctx, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    this.env(g, t, 0.003, peak, dur); this.route(g, pan, send);
    this.track(car, t, t + dur); this.track(mod, t, t + dur);
  }
  pad(t, notes, dur, { peak = 0.05, a = 2.2, rel = 2.2, cut = 600, cut2 = 1800, send = 0.45 } = {}) {
    const c = this.ctx, fl = c.createBiquadFilter(), g = c.createGain();
    fl.type = 'lowpass'; fl.Q.value = 0.6; fl.frequency.setValueAtTime(cut, t); fl.frequency.linearRampToValueAtTime(cut2, t + dur * 0.7);
    fl.connect(g); g.gain.setValueAtTime(0.00001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + dur - rel); g.gain.linearRampToValueAtTime(0.00001, t + dur);
    this.route(g, 0, send);
    for (const n of notes) for (const det of [-7, 6]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = n; o.detune.value = det;
      const og = c.createGain(); og.gain.value = 1 / Math.sqrt(notes.length * 2); o.connect(og); og.connect(fl);
      this.track(o, t, t + dur);
    }
    return { filter: fl, gain: g };
  }
  kick(t, peak = 0.5) { this.tone(t, { f: 95, f2: 40, fT: 0.12, peak, dur: 0.42, send: 0.08 }); }
  shaker(t, peak = 0.05, pan = 0.2) { this.noiseHit(t, { type: 'highpass', f: 7200, dur: 0.07, peak, pan, send: 0.15 }); }
  tick(t) {
    this.tone(t, { f: 2350, peak: 0.12, dur: 0.035, send: 0.5 });
    this.noiseHit(t, { type: 'highpass', f: 5200, dur: 0.014, peak: 0.22, send: 0.5 });
  }
  relay(t) {
    this.noiseHit(t, { type: 'bandpass', f: 2600, q: 3, dur: 0.025, peak: 0.55, send: 0.4 });
    this.tone(t + 0.002, { f: 110, f2: 55, fT: 0.1, peak: 0.42, dur: 0.18, send: 0.35 });
    this.noiseHit(t + 0.034, { type: 'bandpass', f: 3100, q: 4, dur: 0.012, peak: 0.18, send: 0.4 });
  }
  whoosh(t, dur, f1, f2, peak, pan1 = 0, pan2 = 0) {
    this.noiseHit(t, { type: 'bandpass', f: f1, f2, q: 1.6, dur, a: dur * 0.62, peak, pan: pan1, pan2, send: 0.35, rel: dur * 0.35 });
  }
  riser(t0, t1, peak = 0.3) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    fl.type = 'bandpass'; fl.Q.value = 2.2; fl.frequency.setValueAtTime(300, t0); fl.frequency.exponentialRampToValueAtTime(7000, t1);
    g.gain.setValueAtTime(0.00001, t0); g.gain.exponentialRampToValueAtTime(peak, t1 - 0.02); g.gain.setValueAtTime(0, t1);
    s.connect(fl); fl.connect(g); this.route(g, 0, 0.25);
    this.track(s, t0, t1);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(420, t1);
    og.gain.setValueAtTime(0.00001, t0); og.gain.exponentialRampToValueAtTime(peak * 0.25, t1 - 0.02); og.gain.setValueAtTime(0, t1);
    o.connect(og); this.route(og, 0, 0.2); this.track(o, t0, t1);
  }
  hit(t) {
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3); }
    this.tone(t, { f: 130, f2: 31, fT: 0.9, peak: 0.95, dur: 4.2, send: 0.35 });
    this.tone(t, { f: 55, type: 'triangle', peak: 0.3, dur: 3.2, shape: curve, lp: 900, send: 0.45 });
    this.noiseHit(t, { type: 'lowpass', f: 1400, f2: 120, dur: 2.2, peak: 0.5, send: 0.6 });
    [NOTE.D6, NOTE.A5 * 2, NOTE.Fs6].forEach((f, i) => this.bell(t + 0.01 * i, f, 0.022, 2.6, (i - 1) * 0.5, 0.7, 2.01, 1.2));
  }
  drone(t0, t1) {
    const c = this.ctx, g = c.createGain(), fl = c.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 260; fl.connect(g); this.route(g, 0, 0.3);
    g.gain.setValueAtTime(0.00001, t0); g.gain.linearRampToValueAtTime(0.13, t0 + 3.5);
    g.gain.setValueAtTime(0.13, t0 + 12.4); g.gain.linearRampToValueAtTime(0.08, t0 + 15.2);
    g.gain.setValueAtTime(0.08, t1 - 0.06); g.gain.linearRampToValueAtTime(0.00001, t1);
    for (const [f, type, det] of [[36.71, 'sine', 0], [55, 'sine', 3], [73.42, 'triangle', -4], [110, 'sawtooth', 5]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det;
      og.gain.value = type === 'sawtooth' ? 0.09 : type === 'triangle' ? 0.35 : (f < 40 ? 0.35 : 0.5); o.connect(og); og.connect(fl); this.track(o, t0, t1);
    }
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 70; lfo.connect(lg); lg.connect(fl.frequency); this.track(lfo, t0, t1);
    // air
    const s = c.createBufferSource(), af = c.createBiquadFilter(), ag = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; af.type = 'bandpass'; af.frequency.value = 6500; af.Q.value = 0.7;
    ag.gain.setValueAtTime(0.00001, t0); ag.gain.linearRampToValueAtTime(0.022, t0 + 4); ag.gain.setValueAtTime(0.022, t1 - 0.06); ag.gain.linearRampToValueAtTime(0.00001, t1);
    s.connect(af); af.connect(ag); this.route(ag, 0, 0.5); this.track(s, t0, t1);
  }
  hum(t0, t1) {
    const c = this.ctx, g = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
    g.gain.setValueAtTime(0.00001, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 1.2); g.gain.setValueAtTime(0.06, t1 - 1.2); g.gain.linearRampToValueAtTime(0.00001, t1);
    trem.frequency.value = 0.6; tg.gain.value = 0.012; trem.connect(tg); tg.connect(g.gain); this.track(trem, t0, t1);
    this.route(g, 0, 0.4);
    for (const f of [NOTE.D3, NOTE.A3, NOTE.D4]) { const o = c.createOscillator(); o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8; o.connect(g); this.track(o, t0, t1); }
  }

  /* ---- playful instruments for stylized and 2D films ---- */
  /** mallet / marimba-ish pluck */
  pluck(t, f, { peak = 0.12, dur = 0.9, pan = 0, send = 0.3, bright = 1 } = {}) {
    this.bell(t, f, peak, dur, pan, send, 4.0, 1.4 * bright);
    this.tone(t, { f: f * 0.5, type: 'triangle', peak: peak * 0.35, dur: dur * 0.5, send: send * 0.5, pan });
  }
  /** bubble pop: quick pitch drop plus a tiny click */
  pop(t, { f = 900, peak = 0.16, pan = 0 } = {}) {
    this.tone(t, { f, f2: f * 0.28, fT: 0.07, peak, dur: 0.12, send: 0.2, pan });
    this.noiseHit(t, { type: 'bandpass', f: 3200, q: 2, dur: 0.012, peak: peak * 0.5, pan, send: 0.1 });
  }
  /** springy "boing" for bounces */
  boing(t, { f = 180, peak = 0.14, pan = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f * 0.7, t); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.08); o.frequency.exponentialRampToValueAtTime(f, t + 0.4);
    lfo.frequency.value = 18; lg.gain.setValueAtTime(f * 0.25, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.45); lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); this.env(g, t, 0.004, peak, 0.5); this.route(g, pan, 0.2);
    this.track(o, t, t + 0.5); this.track(lfo, t, t + 0.5);
  }
  /** tight UI click / snap */
  snap(t, { peak = 0.12, pan = 0, f = 4200 } = {}) { this.noiseHit(t, { type: 'bandpass', f, q: 1.4, dur: 0.02, peak, pan, send: 0.15 }); this.tone(t, { f: f * 0.4, peak: peak * 0.4, dur: 0.03, send: 0.1, pan }); }
  /** round bass note */
  bass(t, f, { dur = 0.5, peak = 0.22 } = {}) { this.tone(t, { f, type: 'sine', peak, dur, a: 0.006, send: 0.05 }); this.tone(t, { f: f * 2, type: 'triangle', peak: peak * 0.25, dur: dur * 0.6, lp: 900, send: 0.05 }); }

  /** Schedules the film's cues. `at(e)` maps film seconds to audio time; `ok(e)` skips cues before a seek point. */
  schedule(base, from) {
    const at = (e) => base + e, ok = (e) => e >= from - 0.01;
    if (FILM.score) FILM.score(this, at, ok, NOTE);
    const total = FILM.total, fadeFrom = Math.max(this.ctx.currentTime, at(total - 1.2));
    this.master.gain.setValueAtTime(0.9, fadeFrom);
    this.master.gain.linearRampToValueAtTime(0.0001, at(total));
  }
  stop() { try { this.ctx.close(); } catch (e) { /* already closed */ } }
}
