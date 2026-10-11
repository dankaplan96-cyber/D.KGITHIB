// Fully procedural audio: every sound effect and the adaptive score are
// synthesised with WebAudio, so the remaster ships without any of the
// original (copyrighted) sound or music files.

import { Music } from './music.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.storm = 1;
    this.mood = 'storm';
    this.combat = 0;
    this.vol = { master: 0.8, music: 0.55, sfx: 0.8 };
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.35;
    this.reverb.connect(revGain).connect(this.master);
    for (const b of [this.musicBus, this.sfxBus, this.ambBus]) b.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus.connect(this.reverb);
    // ping-pong-ish delay for the arpeggio
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(this.musicBus);
    this.noiseBuf = this._noise(2);
    this.applyVolumes();
    this._ambient();
    this.music = new Music(this);
    this.music.setTheme(this.mood);
    this.music.start();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.musicBus.gain.value = this.vol.music * 0.5;
    this.sfxBus.gain.value = this.vol.sfx;
    this.ambBus.gain.value = this.vol.sfx * 0.6;
  }

  _noise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _impulse(sec) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }

  _ambient() {
    const ctx = this.ctx;
    // rain: high-passed noise
    const rain = ctx.createBufferSource();
    rain.buffer = this.noiseBuf; rain.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rain.connect(hp).connect(this.rainGain).connect(this.ambBus);
    rain.start();
    // surf: low-passed noise with slow swell
    const surf = ctx.createBufferSource();
    surf.buffer = this.noiseBuf; surf.loop = true; surf.playbackRate.value = 0.7;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    this.surfGain = ctx.createGain(); this.surfGain.gain.value = 0.15;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.1;
    lfo.connect(lfoG).connect(this.surfGain.gain);
    lfo.start();
    surf.connect(lp).connect(this.surfGain).connect(this.ambBus);
    surf.start();
    // wind
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf; wind.loop = true; wind.playbackRate.value = 0.4;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.8;
    const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.07;
    const wlfoG = ctx.createGain(); wlfoG.gain.value = 250;
    wlfo.connect(wlfoG).connect(bp.frequency); wlfo.start();
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wind.connect(bp).connect(this.windGain).connect(this.ambBus);
    wind.start();
    this.setStorm(this.storm);
  }

  setStorm(f) {
    this.storm = f;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(0.22 * f, t, 0.5);
    this.windGain.gain.setTargetAtTime(0.25 * f + 0.03, t, 0.5);
  }

  setMood(m) { this.mood = m; this.music?.setTheme(m); }
  setCombat(c) { this.combat = c; }

  // ---- music: generative, mood-driven (storm = minor, clear = major) ----
  _startMusic() {
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.2;
    setInterval(() => this._schedule(), 30);
  }

  _schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const storm = this.mood === 'storm';
    const bpm = storm ? 84 : 100;
    const eighth = 60 / bpm / 2;
    // A minor-ish (i - VI - III - VII) vs C major (I - V - vi - IV)
    const prog = storm
      ? [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
      : [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const scale = storm ? [57, 60, 62, 64, 67, 69, 72, 74, 76] : [60, 62, 64, 67, 69, 72, 74, 76, 79];
    while (this.nextTime < ctx.currentTime + 0.15) {
      const t = this.nextTime;
      const bar = Math.floor(this.step / 8) % 4;
      const chord = prog[bar];
      const s = this.step % 8;
      if (s === 0) {
        for (const n of chord) this._pad(NOTE(n), t, eighth * 8);
        this._bass(NOTE(chord[0] - 24), t, eighth * 3);
      }
      if (s === 4 && !storm) this._bass(NOTE(chord[0] - 24 + 7), t, eighth * 2);
      // arpeggio with gentle variation
      const pattern = [0, 2, 1, 2, 0, 2, 1, 3];
      const idx = (pattern[s] + bar) % scale.length;
      let note = s % 2 === 0 ? chord[pattern[s] % 3] + 12 : scale[(idx + 3) % scale.length];
      if (Math.random() < 0.15) note += 12;
      if (Math.random() > 0.12) this._pluck(NOTE(note), t, eighth * 1.6, storm ? 0.06 : 0.08);
      if (this.combat > 0.01) {
        if (s % 2 === 0) this._kick(t, this.combat);
        if (s % 4 === 2) this._hat(t, this.combat);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }

  _pad(freq, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = this.mood === 'storm' ? 700 : 1400;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
    f.connect(g).connect(this.musicBus);
  }

  _pluck(freq, t, dur, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.musicBus); g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _bass(freq, t, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + dur + 0.05);
  }

  _kick(t, v) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.25);
  }

  _hat(t, v) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(f).connect(g).connect(this.musicBus); n.start(t, Math.random()); n.stop(t + 0.06);
  }

  // ---- sound effects ----
  _tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, at = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _burst({ dur = 0.1, vol = 0.3, type = 'lowpass', f = 1000, f1 = f, q = 1, at = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(fl).connect(g).connect(this.sfxBus);
    n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'step': this._burst({ dur: 0.06, vol: 0.08, f: 900, f1: 300 }); break;
      case 'jump': this._tone({ type: 'square', f0: 220, f1: 520, dur: 0.14, vol: 0.06 }); break;
      case 'land': this._burst({ dur: 0.12, vol: 0.2, f: 600, f1: 120 }); break;
      case 'punch': this._burst({ dur: 0.09, vol: 0.25, f: 2000, f1: 300, type: 'bandpass', q: 2 }); break;
      case 'hit': this._tone({ type: 'square', f0: 300, f1: 90, dur: 0.12, vol: 0.12 }); this._burst({ dur: 0.08, vol: 0.25, f: 1500, f1: 200 }); break;
      case 'throw': this._burst({ dur: 0.25, vol: 0.15, f: 600, f1: 2500, type: 'bandpass', q: 3 }); break;
      case 'bounce': this._tone({ f0: 780, f1: 1200, dur: 0.08, vol: 0.15 }); break;
      case 'catch': this._tone({ f0: 900, f1: 1800, dur: 0.1, vol: 0.12 }); break;
      case 'coin': this._tone({ type: 'square', f0: 988, dur: 0.07, vol: 0.06 }); this._tone({ type: 'square', f0: 1319, dur: 0.18, vol: 0.06, at: 0.07 }); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.12, at: i * 0.07 })); break;
      case 'hurt': this._tone({ type: 'sawtooth', f0: 400, f1: 120, dur: 0.25, vol: 0.12 }); break;
      case 'zap': this._tone({ type: 'sawtooth', f0: 1400, f1: 200, dur: 0.18, vol: 0.06 }); break;
      case 'alert': this._tone({ type: 'square', f0: 660, dur: 0.08, vol: 0.08 }); this._tone({ type: 'square', f0: 990, dur: 0.12, vol: 0.08, at: 0.09 }); break;
      case 'die': this._tone({ type: 'sawtooth', f0: 300, f1: 40, dur: 0.6, vol: 0.12 }); this._burst({ dur: 0.5, vol: 0.2, f: 800, f1: 60 }); break;
      case 'break': this._burst({ dur: 0.3, vol: 0.3, f: 3000, f1: 200 }); this._tone({ f0: 120, f1: 50, dur: 0.2, vol: 0.2 }); break;
      case 'chest': [392, 494, 587, 784].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.12, at: i * 0.09 })); break;
      case 'shard': [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.6, vol: 0.12, at: i * 0.1 })); break;
      case 'blip': this._tone({ type: 'square', f0: 520 + Math.random() * 80, dur: 0.03, vol: 0.025 }); break;
      case 'select': this._tone({ type: 'triangle', f0: 660, f1: 880, dur: 0.08, vol: 0.1 }); break;
      case 'mode': this._tone({ type: 'triangle', f0: 440, f1: 880, dur: 0.12, vol: 0.1 }); break;
      case 'door': this._burst({ dur: 1.2, vol: 0.25, f: 300, f1: 80 }); this._tone({ type: 'sawtooth', f0: 70, f1: 50, dur: 1.2, vol: 0.06 }); break;
      case 'rumble': this._burst({ dur: 1.5, vol: 0.3, f: 200, f1: 60 }); break;
      case 'thunder': this._burst({ dur: 2.8, vol: 0.5, f: 400, f1: 40 }); this._burst({ dur: 0.3, vol: 0.3, f: 3000, f1: 300 }); break;
      case 'horn': this._tone({ type: 'sawtooth', f0: 147, f1: 140, dur: 1.4, vol: 0.12 }); this._tone({ type: 'sawtooth', f0: 220, f1: 210, dur: 1.4, vol: 0.08 }); break;
      case 'deny': this._tone({ type: 'square', f0: 200, f1: 150, dur: 0.15, vol: 0.08 }); break;
      case 'victory': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.12, at: i * 0.14 })); break;
    }
  }
}
