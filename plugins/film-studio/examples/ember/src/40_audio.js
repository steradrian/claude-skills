
/* =====================================================================
   SCORE — every sound is synthesized and scheduled against the picture
   ===================================================================== */
const NOTE = { A1: 55, B1: 61.74, D2: 73.42, E2: 82.41, Fs2: 92.5, G1: 49, G2: 98, A2: 110, B2: 123.47, D3: 146.83, E3: 164.81, Fs3: 185, A3: 220, B3: 246.94, Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440, D5: 587.33, Fs5: 739.99, A5: 880, D6: 1174.66, E6: 1318.51, Fs6: 1479.98, A6: 1760, B5: 987.77, E5: 659.25 };

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

  schedule(base, from) {
    const at = (e) => base + e;
    const ok = (e) => e >= from - 0.01;
    const c = this.ctx;
    // act one: darkness
    if (ok(0)) this.drone(at(0), at(16.95));
    if (ok(1.1)) this.whoosh(at(1.1), 3.0, 1400, 6200, 0.05, -0.6, 0.6);
    for (const e of [4.6, 7.4, 10.2, 13.0]) if (ok(e)) this.tick(at(e));
    if (ok(4.8)) this.whoosh(at(4.8), 2.3, 900, 4200, 0.045, 0.5, -0.2);
    if (ok(7.7)) this.whoosh(at(7.7), 2.2, 2000, 7000, 0.035, -0.3, 0.4);
    if (ok(8.7)) this.bell(at(8.7), NOTE.E6 * 2, 0.018, 2.2, 0.3, 0.8, 2.0, 0.8);
    if (ok(10.4)) this.whoosh(at(10.4), 2.4, 500, 2600, 0.05, 0, 0);
    for (const [e, pk] of [[11.6, 0.22], [11.95, 0.14]]) if (ok(e)) {
      this.tone(at(e), { f: 98, peak: pk, a: 0.06, dur: 1.1, lp: 400, send: 0.5 });
      this.tone(at(e), { f: 196, peak: pk * 0.35, a: 0.06, dur: 0.9, send: 0.5 });
    }
    if (ok(15.2)) this.riser(at(15.2), at(17.16), 0.3);
    // act two: light
    if (ok(17.2)) this.hit(at(17.2));
    if (ok(17.5)) this.pad(at(17.5), [NOTE.D2, NOTE.A2, NOTE.Fs3, NOTE.Cs4, NOTE.E4], 4.6, { peak: 0.13, cut: 400, cut2: 1900 });
    if (ok(21.4)) this.pad(at(21.4), [NOTE.B1, NOTE.Fs2, NOTE.D3, NOTE.A3, NOTE.Cs4], 4.4, { peak: 0.13, a: 1.6, cut: 800, cut2: 2000 });
    if (ok(25.3)) {
      const p = this.pad(at(25.3), [NOTE.G1, NOTE.D2, NOTE.B2, NOTE.Fs3, NOTE.A3], 5.2, { peak: 0.13, a: 1.4, rel: 1.8, cut: 1400, cut2: 1600 });
      for (const [e, v] of [[26.3, 1100], [27.0, 800], [27.7, 480]]) { p.filter.frequency.cancelScheduledValues(at(e)); p.filter.frequency.setValueAtTime(v, at(e)); }
    }
    const beat = 60 / 84;
    for (let e = 19.0, i = 0; e < 26.25; e += beat, i++) {
      if (!ok(e)) continue;
      this.kick(at(e), 0.3 + 0.25 * Math.min(1, i / 6));
      if (e > 21.8) this.shaker(at(e + beat / 2), 0.045, i % 2 ? 0.3 : -0.3);
    }
    if (ok(24.8)) {
      [NOTE.D5, NOTE.Fs5, NOTE.A5].forEach((f, i) => this.bell(at(24.8 + i * 0.09), f, 0.035, 3.4, (i - 1) * 0.35, 0.6, 2.0, 1.0));
      this.hum(at(24.9), at(31.5));
    }
    for (const e of [26.3, 27.0, 27.7]) if (ok(e)) this.relay(at(e));
    // act three: the idea is the only light
    if (ok(30.2)) this.pad(at(30.2), [NOTE.A1, NOTE.E2, NOTE.B2, NOTE.E3, NOTE.A3], 12.8, { peak: 0.075, a: 2.5, rel: 1.4, cut: 500, cut2: 900 });
    if (ok(30.5)) this.whoosh(at(30.5), 2.5, 180, 2400, 0.16, -0.2, 0.2);
    for (let e = 33.0, i = 0; e < 42.4; e += beat, i++) {
      if (!ok(e)) continue;
      this.kick(at(e), 0.2);
      this.shaker(at(e + beat / 2), 0.03, i % 2 ? 0.25 : -0.25);
    }
    const q = COPY.question.length, t0 = 33.3, t1 = 36.0;
    for (let i = 0; i < q; i++) {
      const e = t0 + (i / q) * (t1 - t0);
      if (!ok(e) || COPY.question[i] === ' ' && i % 2) continue;
      this.tone(at(e), { f: 2800 + Math.random() * 900, peak: 0.018 + Math.random() * 0.01, dur: 0.016, send: 0.1, pan: (Math.random() - 0.5) * 0.3 });
      this.noiseHit(at(e), { type: 'highpass', f: 6000, dur: 0.01, peak: 0.03, send: 0.1 });
    }
    if (ok(36.25)) this.tone(at(36.25), { f: 380, f2: 980, fT: 0.14, peak: 0.08, dur: 0.3, send: 0.4 });
    [NOTE.A5, NOTE.Cs4 * 4, NOTE.E6].forEach((f, i) => { const e = 36.6 + i * 0.26; if (ok(e)) this.bell(at(e), f, 0.022, 1.8, (i - 1) * 0.4, 0.7, 2.0, 0.9); });
    const penta = [NOTE.D5, NOTE.E5, NOTE.Fs5, NOTE.A5, NOTE.B5, NOTE.D6];
    for (let e = 37.45, i = 0; e < 41.6; e += 0.24, i++) if (ok(e)) this.bell(at(e), penta[(i * 3 + (i >> 2)) % penta.length], 0.012, 1.6, Math.sin(i) * 0.5, 0.75, 2.0, 0.7);
    // resolve
    if (ok(42.3)) this.riser(at(42.3), at(46.35), 0.1);
    if (ok(42.6)) this.pad(at(42.6), [NOTE.D2, NOTE.A2, NOTE.E3, NOTE.Fs3, NOTE.Cs4, NOTE.A4], 9.2, { peak: 0.13, a: 3.2, rel: 3.0, cut: 380, cut2: 2600 });
    if (ok(46.4)) {
      this.tone(at(46.4), { f: 73.42, f2: 36.7, fT: 0.6, peak: 0.55, dur: 3.2, send: 0.4 });
      [NOTE.D5, NOTE.A5, NOTE.Fs6].forEach((f, i) => this.bell(at(46.4 + i * 0.012), f, [0.07, 0.05, 0.025][i], 5.5, (i - 1) * 0.3, 0.7, 3.5, 1.6));
    }
    const endT = at(TOTAL - 1.2);
    this.master.gain.setValueAtTime(0.9, Math.max(c.currentTime, endT));
    this.master.gain.linearRampToValueAtTime(0.0001, at(TOTAL));
  }
  stop() { try { this.ctx.close(); } catch (e) { /* already closed */ } }
}
