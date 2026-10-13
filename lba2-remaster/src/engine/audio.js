// Audio: procedural sound effects and ambience (WebAudio synthesis, no original LBA sounds) plus the
// rendered orchestral soundtrack (files in assets/music, played by ./music.js).
//
// Buses: master ─┬─ music (file playback, ducked under dialogue)
//                ├─ sfx (+ a little room reverb)
//                ├─ ambience (rain, surf, wind; follows the effects volume)
//                └─ voice (the characters' gibberish voices, voice.js)

import { Music } from './music.js';
import { Babble } from './voice.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.storm = 1;
    this.mood = 'title';
    this.combat = 0;
    this.vol = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8 };
    this.babble = new Babble(this); // the characters' gibberish voices (voice.js)
    this.music = new Music(this);
    // browsers only start audio after a user gesture: the first click / key / touch anywhere starts it
    if (typeof addEventListener === 'function') {
      const unlock = () => { this.init(); if (this.ctx?.state === 'running') for (const e of ['pointerdown', 'keydown', 'touchstart']) removeEventListener(e, unlock, true); };
      for (const e of ['pointerdown', 'keydown', 'touchstart']) addEventListener(e, unlock, true);
    }
  }

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.voiceBus = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.35;
    this.reverb.connect(revGain).connect(this.master);
    for (const b of [this.musicBus, this.sfxBus, this.ambBus, this.voiceBus]) b.connect(this.master);
    this.sfxBus.connect(this.reverb); // the music files carry their own room
    this.noiseBuf = this._noise(2);
    this.applyVolumes();
    this._ambient();
    this.music.start();
    this.music.setMood(this.mood);
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.musicBus.gain.value = this.vol.music;
    this.sfxBus.gain.value = this.vol.sfx;
    this.ambBus.gain.value = this.vol.sfx * 0.6;
    this.voiceBus.gain.value = this.vol.voice ?? 0.8;
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
    this.surfPlace = ctx.createGain(); // 1 by the sea, 0 indoors / above the clouds
    surf.connect(lp).connect(this.surfGain).connect(this.surfPlace).connect(this.ambBus);
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
    // positional loops: running water and machinery, faded by distance (see setSources / updateSources)
    this.loops = {};
    {
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; n.playbackRate.value = 1.3;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.4;
      const wob = ctx.createOscillator(); wob.frequency.value = 5.5; const wobG = ctx.createGain(); wobG.gain.value = 500;
      wob.connect(wobG).connect(f.frequency); wob.start();
      const g = ctx.createGain(); g.gain.value = 0;
      n.connect(f).connect(g).connect(this.ambBus); n.start();
      this.loops.water = g;
    }
    {
      const g = ctx.createGain(); g.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      for (const [fq, v] of [[55, 0.5], [110.6, 0.3], [165, 0.12]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; const og = ctx.createGain(); og.gain.value = v; o.connect(og).connect(lp); o.start(); }
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; n.playbackRate.value = 0.5;
      const ng = ctx.createGain(); ng.gain.value = 0.35; n.connect(ng).connect(lp); n.start();
      const thr = ctx.createOscillator(); thr.frequency.value = 1.6; const thrG = ctx.createGain(); thrG.gain.value = 0.25;
      const amp = ctx.createGain(); amp.gain.value = 0.75; thr.connect(thrG).connect(amp.gain); thr.start();
      lp.connect(amp).connect(g).connect(this.ambBus);
      this.loops.machine = g;
    }
    this.setPlace(this.place || 'island');
  }

  // where the listener is: 'island' (sea surf), 'sky' (Zeelich: wind, no surf), 'interior', 'under'
  setPlace(kind) {
    this.place = kind;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.surfPlace.gain.setTargetAtTime(kind === 'island' ? 1 : 0, t, 0.6);
    this.placeWind = kind === 'sky' ? 0.12 : 0;
    this.windGain.gain.setTargetAtTime(0.25 * this.storm + 0.03 + this.placeWind, t, 0.6);
  }
  // sources: [{kind: 'water'|'machine', x, z, r, vol}] near the listener; louder as it gets closer
  updateSources(sources, pos) {
    if (!this.ctx || !this.loops) return;
    const t = this.ctx.currentTime, lvl = { water: 0, machine: 0 };
    for (const s of sources) {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      if (d < s.r) lvl[s.kind] = Math.max(lvl[s.kind], (1 - d / s.r) ** 2 * (s.vol ?? 1));
    }
    this.loops.water.gain.setTargetAtTime(lvl.water * 0.16, t, 0.3);
    this.loops.machine.gain.setTargetAtTime(lvl.machine * 0.22, t, 0.3);
  }

  setStorm(f) {
    this.storm = f;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(0.22 * f, t, 0.5);
    this.windGain.gain.setTargetAtTime(0.25 * f + 0.03 + (this.placeWind || 0), t, 0.5);
  }

  // ---- music (see music.js) ----
  setMood(m) { this.mood = m; if (this.ctx) this.music.setMood(m); }
  cue(name) { if (this.ctx) this.music.cue(name); }
  endCue() { if (this.ctx) this.music.endCue(); }
  setCombat(c) { this.combat = c; if (this.ctx) this.music.setCombat(c); }
  duck(on) { this.music.duck(on); }
  // outdoors on Citadel island the music follows the area (village / open island / project station)
  setOutdoorArea(pos, POI) { this.setMood(this.music.outdoorMood(pos, POI)); }

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

  // A sound that runs until stopped (story scenes): returns { name, stop(fade) }. Synthesised like the rest.
  loop(name, opts = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;
    const out = ctx.createGain(); out.gain.value = 0; out.connect(this.sfxBus);
    const nodes = [], timers = [];
    const noise = (type, f, q) => { const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; n.connect(fl); n.start(0, Math.random()); nodes.push(n); return fl; };
    const lfo = (param, rate, depth) => { const o = ctx.createOscillator(); o.frequency.value = rate; const gg = ctx.createGain(); gg.gain.value = depth; o.connect(gg).connect(param); o.start(); nodes.push(o); };
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); nodes.push(o); return o; };
    let level = 0.2;
    switch (name) {
      case 'lap': { // water lapping against piles and a hull
        const f = noise('lowpass', 420, 0.7), g1 = ctx.createGain(); g1.gain.value = 0.55;
        f.connect(g1).connect(out); lfo(g1.gain, 0.37, 0.45); lfo(f.frequency, 0.21, 170);
        const f2 = noise('bandpass', 1400, 1.2), g2 = ctx.createGain(); g2.gain.value = 0.12;
        f2.connect(g2).connect(out); lfo(g2.gain, 0.53, 0.12);
        level = 0.32; break;
      }
      case 'motor': case 'winch': { // the lift's electric motor (the winch: the same, idling)
        const o = osc('sawtooth', name === 'motor' ? 62 : 84), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        o.connect(f).connect(out); lfo(o.frequency, 5.5, 1.2);
        const w = noise('bandpass', 1300, 4), gw = ctx.createGain(); gw.gain.value = 0.25; w.connect(gw).connect(out);
        level = name === 'motor' ? 0.075 : 0.03; break;
      }
      case 'trickle': { // a thin stream into a stone basin
        const f = noise('bandpass', 2600, 1.8), g1 = ctx.createGain(); g1.gain.value = 0.6;
        f.connect(g1).connect(out); lfo(g1.gain, 7, 0.35); lfo(f.frequency, 3.1, 500);
        level = 0.11; break;
      }
      case 'room': { // a quiet room: the stove ticking and crackling, a low hum of the house
        const f = noise('lowpass', 180, 0.5), g1 = ctx.createGain(); g1.gain.value = 0.5; f.connect(g1).connect(out);
        timers.push(setInterval(() => { if (Math.random() < 0.45 && ctx.state === 'running') this._burst({ dur: 0.025, vol: 0.025, f: 2600, f1: 1200, type: 'bandpass', q: 4 }); }, 230));
        level = 0.05; break;
      }
      default: out.disconnect(); return null;
    }
    const t = ctx.currentTime, lv = opts.quiet ? level * 0.5 : level;
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(lv, t + (opts.fade ?? 0.6));
    const h = {
      name,
      stop: (fade = 0.6) => {
        if (h.stopped) return;
        h.stopped = true;
        const t2 = ctx.currentTime;
        out.gain.cancelScheduledValues(t2); out.gain.setValueAtTime(out.gain.value, t2); out.gain.linearRampToValueAtTime(0, t2 + fade);
        timers.forEach(clearInterval);
        setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* */ } }); out.disconnect(); }, (fade + 0.15) * 1000);
      },
    };
    return h;
  }

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      // story scenes (the opening): rope, lift, tap, small household sounds
      case 'ropeCreak': this._tone({ type: 'triangle', f0: 340, f1: 270, dur: 0.38, vol: 0.035 }); this._burst({ dur: 0.3, vol: 0.05, f: 900, f1: 700, type: 'bandpass', q: 7 }); break;
      case 'bark': [0, 0.17].forEach((at) => { this._tone({ type: 'sawtooth', f0: 430, f1: 230, dur: 0.1, vol: 0.06, at }); this._burst({ dur: 0.08, vol: 0.1, f: 1100, f1: 450, type: 'bandpass', q: 2.5, at }); }); break;
      case 'yap': [0, 0.12, 0.24].forEach((at) => { this._tone({ type: 'square', f0: 980, f1: 640, dur: 0.06, vol: 0.035, at }); this._burst({ dur: 0.05, vol: 0.06, f: 2200, f1: 1200, type: 'bandpass', q: 3, at }); }); break;
      case 'yelp': this._tone({ type: 'triangle', f0: 1300, f1: 700, dur: 0.16, vol: 0.06 }); this._burst({ dur: 0.1, vol: 0.06, f: 2400, f1: 1200, type: 'bandpass', q: 3 }); break;
      case 'growl': this._tone({ type: 'sawtooth', f0: 95, f1: 110, dur: 0.5, vol: 0.07 }); this._burst({ dur: 0.5, vol: 0.06, f: 420, f1: 300, type: 'bandpass', q: 4 }); break;
      case 'clunk': this._tone({ f0: 150, f1: 90, dur: 0.12, vol: 0.12 }); this._burst({ dur: 0.08, vol: 0.12, f: 1800, f1: 400 }); break;
      case 'thump': this._burst({ dur: 0.25, vol: 0.3, f: 320, f1: 60 }); this._tone({ f0: 85, f1: 45, dur: 0.22, vol: 0.14 }); break;
      case 'hum': {
        const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), gg = ctx.createGain();
        o.frequency.setValueAtTime(44, t); o.frequency.linearRampToValueAtTime(41, t + 2.2);
        gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.09, t + 0.7); gg.gain.linearRampToValueAtTime(0, t + 2.4);
        o.connect(gg).connect(this.sfxBus); o.start(t); o.stop(t + 2.5);
        break;
      }
      case 'rattle': for (let i = 0; i < 8; i++) this._tone({ type: 'square', f0: 2200 + Math.random() * 600, dur: 0.02, vol: 0.012, at: i * 0.07 + Math.random() * 0.02 }); break;
      case 'tapSqueak': this._tone({ type: 'triangle', f0: 880, f1: 1240, dur: 0.22, vol: 0.035 }); this._tone({ type: 'triangle', f0: 1180, f1: 820, dur: 0.18, vol: 0.03, at: 0.12 }); break;
      case 'pipeKnock': this._tone({ f0: 115, f1: 70, dur: 0.14, vol: 0.18 }); this._burst({ dur: 0.1, vol: 0.14, f: 650, f1: 160 }); break;
      case 'waterRun': this._burst({ dur: 0.7, vol: 0.16, f: 2300, f1: 1700, type: 'bandpass', q: 1.2 }); break;
      case 'gurgle': [320, 410, 360, 520, 450].forEach((f, i) => this._tone({ f0: f, f1: f * 1.3, dur: 0.05, vol: 0.04, at: i * 0.06 })); this._burst({ dur: 0.3, vol: 0.06, f: 500, f1: 200 }); break;
      case 'tick': this._tone({ type: 'triangle', f0: 1600, dur: 0.03, vol: 0.04 }); break;
      case 'put': this._tone({ type: 'triangle', f0: 300, f1: 200, dur: 0.06, vol: 0.09 }); this._burst({ dur: 0.05, vol: 0.07, f: 1500, f1: 500 }); break;
      case 'step': this._burst({ dur: 0.06, vol: 0.08, f: 900, f1: 300 }); break;
      case 'step-stone': this._burst({ dur: 0.05, vol: 0.09, f: 2600, f1: 900, type: 'bandpass', q: 1.5 }); break;
      case 'step-grass': this._burst({ dur: 0.09, vol: 0.06, f: 3200, f1: 1600, type: 'highpass' }); break;
      case 'step-dirt': this._burst({ dur: 0.07, vol: 0.08, f: 700, f1: 250 }); break;
      case 'step-wood': this._tone({ type: 'triangle', f0: 190, f1: 120, dur: 0.07, vol: 0.09 }); this._burst({ dur: 0.04, vol: 0.05, f: 1200, f1: 500 }); break;
      case 'step-metal': this._tone({ type: 'square', f0: 420, f1: 380, dur: 0.05, vol: 0.03 }); this._tone({ type: 'triangle', f0: 1250, f1: 1180, dur: 0.12, vol: 0.03 }); this._burst({ dur: 0.04, vol: 0.06, f: 3000, f1: 1500, type: 'bandpass', q: 3 }); break;
      case 'jump': this._tone({ type: 'square', f0: 220, f1: 520, dur: 0.14, vol: 0.06 }); break;
      case 'land': this._burst({ dur: 0.12, vol: 0.2, f: 600, f1: 120 }); break;
      case 'punch': this._burst({ dur: 0.09, vol: 0.25, f: 2000, f1: 300, type: 'bandpass', q: 2 }); break;
      case 'hit': this._tone({ type: 'square', f0: 300, f1: 90, dur: 0.12, vol: 0.12 }); this._burst({ dur: 0.08, vol: 0.25, f: 1500, f1: 200 }); break;
      case 'throw': this._burst({ dur: 0.25, vol: 0.15, f: 600, f1: 2500, type: 'bandpass', q: 3 }); break;
      case 'bounce': this._tone({ f0: 780, f1: 1200, dur: 0.08, vol: 0.15 }); break;
      case 'catch': this._tone({ f0: 900, f1: 1800, dur: 0.1, vol: 0.12 }); break;
      // a bonus pops out of a giver: a short rising 'boing'
      case 'bonus': this._tone({ type: 'triangle', f0: 420, f1: 880, dur: 0.16, vol: 0.07 }); this._tone({ type: 'sine', f0: 1180, f1: 1240, dur: 0.12, vol: 0.04, at: 0.1 }); break;
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
      // combat: distinct materials, readable timing cues
      case 'swing': this._burst({ dur: 0.14, vol: 0.18, f: 900, f1: 3200, type: 'bandpass', q: 2.5 }); break;
      case 'swingHeavy': this._burst({ dur: 0.22, vol: 0.24, f: 500, f1: 2400, type: 'bandpass', q: 2 }); this._tone({ type: 'sine', f0: 140, f1: 90, dur: 0.18, vol: 0.06 }); break;
      case 'hitFlesh': this._burst({ dur: 0.1, vol: 0.28, f: 900, f1: 180 }); this._tone({ type: 'sine', f0: 160, f1: 70, dur: 0.1, vol: 0.12 }); break;
      case 'hitCrystal': this._tone({ type: 'triangle', f0: 2400, f1: 1800, dur: 0.16, vol: 0.08 }); this._tone({ type: 'triangle', f0: 3600, f1: 3100, dur: 0.12, vol: 0.05 }); this._burst({ dur: 0.08, vol: 0.18, f: 4000, f1: 1500, type: 'highpass' }); break;
      case 'hitMachine': this._tone({ type: 'square', f0: 520, f1: 300, dur: 0.1, vol: 0.06 }); this._burst({ dur: 0.12, vol: 0.22, f: 2600, f1: 600, type: 'bandpass', q: 3 }); break;
      case 'clang': this._tone({ type: 'triangle', f0: 1450, f1: 1380, dur: 0.35, vol: 0.09 }); this._tone({ type: 'triangle', f0: 2170, f1: 2100, dur: 0.25, vol: 0.05 }); this._burst({ dur: 0.05, vol: 0.25, f: 5000, f1: 2500, type: 'highpass' }); break;
      case 'hitStone': this._burst({ dur: 0.14, vol: 0.3, f: 600, f1: 120 }); break;
      case 'hitWood': this._tone({ type: 'triangle', f0: 260, f1: 160, dur: 0.09, vol: 0.12 }); this._burst({ dur: 0.08, vol: 0.18, f: 1400, f1: 400 }); break;
      case 'whoosh': this._burst({ dur: 0.2, vol: 0.14, f: 400, f1: 1600, type: 'bandpass', q: 1.5 }); break;
      case 'dodged': this._tone({ type: 'sine', f0: 1200, f1: 1700, dur: 0.12, vol: 0.06 }); break;
      case 'charge': this._tone({ type: 'sine', f0: 300, f1: 760, dur: 0.75, vol: 0.06 }); break;
      case 'chargeFull': this._tone({ type: 'triangle', f0: 1568, dur: 0.12, vol: 0.08 }); this._tone({ type: 'triangle', f0: 2093, dur: 0.18, vol: 0.06, at: 0.06 }); break;
      case 'throwHeavy': this._burst({ dur: 0.3, vol: 0.2, f: 500, f1: 3000, type: 'bandpass', q: 3 }); this._tone({ f0: 600, f1: 1400, dur: 0.2, vol: 0.06 }); break;
      case 'notReady': this._tone({ type: 'square', f0: 240, dur: 0.04, vol: 0.05 }); this._tone({ type: 'square', f0: 200, dur: 0.05, vol: 0.05, at: 0.06 }); break;
      case 'recall': this._tone({ f0: 1400, f1: 700, dur: 0.18, vol: 0.08 }); break;
      case 'lockOn': this._tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.07, vol: 0.06 }); break;
      case 'equip': this._burst({ dur: 0.06, vol: 0.12, f: 3000, f1: 1500, type: 'bandpass', q: 4 }); this._tone({ type: 'triangle', f0: 700, dur: 0.05, vol: 0.06 }); break;
      case 'pulse': this._tone({ type: 'sawtooth', f0: 90, f1: 60, dur: 0.35, vol: 0.1 }); this._tone({ type: 'sine', f0: 1800, f1: 300, dur: 0.3, vol: 0.06 }); this._burst({ dur: 0.25, vol: 0.18, f: 3000, f1: 400, type: 'bandpass', q: 2 }); break;
      case 'slam': this._burst({ dur: 0.5, vol: 0.4, f: 300, f1: 50 }); this._tone({ type: 'sine', f0: 90, f1: 40, dur: 0.4, vol: 0.2 }); break;
      case 'deny': this._tone({ type: 'square', f0: 200, f1: 150, dur: 0.15, vol: 0.08 }); break;
      case 'victory': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.12, at: i * 0.14 })); break;
    }
  }
}
