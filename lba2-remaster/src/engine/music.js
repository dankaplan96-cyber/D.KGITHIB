// Composed, melodic score (original music written for this project) played by
// small WebAudio instruments. Each theme has a melody, a chord per bar and an
// accompaniment style; themes change on the next bar with a crossfade.
//
//   citadel  – G major, a warm folk tune (flute over harp and bass)
//   home     – the same tune on a music box, slower
//   station  – D minor, mechanical ostinato (marimba) under a horn line
//   stealth  – C minor, pizzicato walking bass and a sly clarinet
//   cave     – A minor/phrygian, sparse bells over a drone
//   zeelich  – F lydian, celesta over airy pads
//   underworld – deep drone, slow bell motif
//   boss     – E minor, driving strings, brass and drums
//   ending   – the Citadel tune in a broad, bright arrangement

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// chord qualities → intervals
const Q = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], d: [0, 3, 6], s4: [0, 5, 7], '7': [0, 4, 7, 10] };
const ch = (root, q = 'M') => ({ root, q });

// melodies: [midi | null(rest), beats]
const CITADEL_MEL = [
  [74, 1], [71, 0.5], [67, 0.5], [69, 1], [71, 1], [69, 1.5], [66, 0.5], [62, 2], [64, 1], [67, 1], [71, 1], [76, 1], [74, 1], [72, 0.5], [71, 0.5], [69, 2],
  [71, 1], [74, 1], [79, 1.5], [78, 0.5], [76, 1], [72, 1], [67, 2], [69, 1], [71, 0.5], [72, 0.5], [74, 1], [78, 1], [76, 1], [74, 1], [69, 2],
  [79, 1.5], [78, 0.5], [76, 1], [71, 1], [72, 1], [76, 1], [79, 2], [74, 1.5], [71, 0.5], [67, 1], [71, 1], [69, 3], [null, 1],
  [76, 1], [74, 0.5], [72, 0.5], [71, 1], [69, 1], [66, 1], [69, 1], [74, 1], [72, 1], [71, 1], [69, 0.5], [67, 0.5], [69, 1], [71, 1], [67, 3], [null, 1],
];
const CITADEL_CH = [ch(55), ch(50), ch(52, 'm'), ch(48), ch(55), ch(48), ch(50), ch(50, '7'), ch(52, 'm'), ch(48), ch(55), ch(50), ch(48), ch(50, '7'), ch(55), ch(55)];

const STATION_MEL = [
  [62, 1.5], [65, 0.5], [69, 1], [67, 1], [65, 1], [64, 1], [62, 2], [62, 1], [65, 1], [70, 2], [69, 1], [67, 1], [64, 2],
  [74, 1.5], [72, 0.5], [69, 1], [65, 1], [67, 1], [70, 1], [74, 2], [73, 1], [70, 1], [69, 1], [67, 1], [69, 3], [null, 1],
];
const STATION_CH = [ch(50, 'm'), ch(50, 'm'), ch(46), ch(48), ch(50, 'm'), ch(55, 'm'), ch(45, '7'), ch(45, '7')];

const STEALTH_MEL = [
  [null, 1], [67, 0.5], [68, 0.5], [67, 1], [63, 1], [60, 1], [null, 1], [63, 1], [65, 1], [68, 1.5], [67, 0.5], [65, 1], [72, 1], [71, 2], [67, 2],
  [null, 1], [72, 0.5], [71, 0.5], [68, 1], [67, 1], [65, 1], [63, 1], [62, 1], [63, 1], [65, 1.5], [63, 0.5], [62, 1], [59, 1], [60, 3], [null, 1],
];
const STEALTH_CH = [ch(48, 'm'), ch(44), ch(41, 'm'), ch(43, '7'), ch(48, 'm'), ch(44), ch(43, '7'), ch(48, 'm')];

const CAVE_MEL = [
  [76, 2], [null, 1], [69, 1], [72, 3], [null, 1], [70, 2], [69, 1], [67, 1], [69, 4],
  [null, 1], [76, 1], [77, 1], [76, 1], [72, 2], [69, 2], [70, 1], [72, 1], [74, 1], [70, 1], [69, 4],
];
const CAVE_CH = [ch(45, 'm'), ch(41), ch(46), ch(45, 'm'), ch(45, 'm'), ch(41), ch(46), ch(45, 'm')];

const ZEELICH_MEL = [
  [72, 1], [76, 1], [77, 1], [79, 1], [71, 2], [69, 1], [67, 1], [76, 1.5], [74, 0.5], [71, 2], [72, 1], [69, 1], [64, 2],
  [77, 1], [76, 0.5], [72, 0.5], [69, 1], [72, 1], [74, 1], [71, 1], [67, 2], [69, 1], [72, 1], [76, 1], [81, 1], [79, 4],
];
const ZEELICH_CH = [ch(53, 'M7'), ch(55), ch(52, 'm7'), ch(57, 'm'), ch(53, 'M7'), ch(55), ch(57, 'm'), ch(48)];

const UNDER_MEL = [
  [69, 3], [72, 1], [71, 4], [68, 2], [69, 2], [64, 4],
  [null, 2], [76, 1], [74, 1], [72, 3], [71, 1], [69, 2], [68, 2], [69, 4],
];
const UNDER_CH = [ch(45, 'm'), ch(44, 'M'), ch(45, 'm'), ch(40, '7'), ch(45, 'm'), ch(41), ch(40, '7'), ch(45, 'm')];

const BOSS_MEL = [
  [76, 0.5], [76, 0.5], [71, 0.5], [76, 0.5], [79, 1], [78, 1], [76, 1], [74, 0.5], [71, 0.5], [69, 1], [71, 1],
  [72, 0.5], [72, 0.5], [76, 0.5], [79, 0.5], [81, 1], [79, 1], [78, 1], [74, 1], [69, 2],
  [76, 0.5], [76, 0.5], [71, 0.5], [76, 0.5], [79, 1], [78, 1], [76, 1], [79, 1], [83, 2],
  [81, 1], [79, 1], [76, 1], [72, 1], [75, 2], [71, 2],
];
const BOSS_CH = [ch(52, 'm'), ch(52, 'm'), ch(48), ch(50), ch(52, 'm'), ch(52, 'm'), ch(48), ch(47, '7')];

export const THEMES = {
  citadel: { bpm: 96, mel: CITADEL_MEL, chords: CITADEL_CH, lead: 'flute', acc: 'harp', bass: 'root5', vol: 1 },
  home: { bpm: 76, mel: CITADEL_MEL, chords: CITADEL_CH, lead: 'musicbox', acc: 'pad', bass: 'soft', vol: 0.8, oct: 12 },
  station: { bpm: 104, mel: STATION_MEL, chords: STATION_CH, lead: 'horn', acc: 'marimba', bass: 'pulse', vol: 0.9, perc: 'clank' },
  stealth: { bpm: 92, mel: STEALTH_MEL, chords: STEALTH_CH, lead: 'clarinet', acc: 'none', bass: 'walk', vol: 0.9 },
  cave: { bpm: 70, mel: CAVE_MEL, chords: CAVE_CH, lead: 'bell', acc: 'drone', bass: 'drone', vol: 0.9 },
  zeelich: { bpm: 80, mel: ZEELICH_MEL, chords: ZEELICH_CH, lead: 'celesta', acc: 'airpad', bass: 'soft', vol: 0.9 },
  underworld: { bpm: 60, mel: UNDER_MEL, chords: UNDER_CH, lead: 'bell', acc: 'drone', bass: 'drone', vol: 0.9, oct: -12 },
  boss: { bpm: 132, mel: BOSS_MEL, chords: BOSS_CH, lead: 'brass', acc: 'strings', bass: 'pulse', vol: 1, perc: 'drums' },
  ending: { bpm: 84, mel: CITADEL_MEL, chords: CITADEL_CH, lead: 'brass', acc: 'strings', bass: 'root5', vol: 1 },
};
// old mood names used around the code
const ALIAS = { calm: 'citadel', storm: 'cave', clear: 'citadel' };

export class Music {
  constructor(audio) {
    this.a = audio;
    this.theme = null;
    this.want = 'citadel';
  }
  get ctx() { return this.a.ctx; }
  setTheme(name) { this.want = ALIAS[name] || name; }
  start() {
    this.nextTime = this.ctx.currentTime + 0.3;
    this.beat = 0; this.mi = 0; this.mBeat = 0;
    this.bus = this.ctx.createGain(); this.bus.connect(this.a.musicBus);
    setInterval(() => this.schedule(), 25);
  }
  // switch themes on a bar line with a short fade
  schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    while (this.nextTime < ctx.currentTime + 0.2) {
      if (this.theme !== this.want && this.beat % 4 === 0) this.switchTo(this.want, this.nextTime);
      const T = THEMES[this.theme];
      const beatDur = 60 / T.bpm;
      const t = this.nextTime;
      const bar = Math.floor(this.beat / 4) % T.chords.length;
      const c = T.chords[bar];
      const b = this.beat % 4;
      this.accomp(T, c, b, t, beatDur);
      this.bassLine(T, c, b, t, beatDur, bar);
      this.percussion(T, b, t, beatDur);
      // melody notes starting inside this beat
      while (this.mBeat < this.beat + 1 - 1e-6) {
        const [n, d] = T.mel[this.mi];
        const nt = t + (this.mBeat - this.beat) * beatDur;
        if (n != null) this.lead(T.lead, n + (T.oct || 0), Math.max(ctx.currentTime, nt), d * beatDur);
        this.mBeat += d;
        this.mi = (this.mi + 1) % T.mel.length;
        if (this.mi === 0) this.mBeat = Math.ceil(this.mBeat / (T.chords.length * 4)) * T.chords.length * 4;
      }
      this.beat++;
      this.nextTime += beatDur;
      // combat layer on top of whatever plays
      if (this.a.combat > 0.02 && this.theme !== 'boss') { this.a._kick(t, this.a.combat); this.a._hat(t + beatDur / 2, this.a.combat); }
    }
  }
  switchTo(name, t) {
    const old = this.bus;
    old.gain.setTargetAtTime(0, t, 0.25);
    setTimeout(() => old.disconnect(), 3000);
    this.bus = this.ctx.createGain();
    this.bus.gain.setValueAtTime(0, t);
    this.bus.gain.linearRampToValueAtTime(THEMES[name].vol, t + 0.6);
    this.bus.connect(this.a.musicBus);
    this.theme = name;
    this.beat = 0; this.mi = 0; this.mBeat = 0;
  }

  // ---- parts
  chordNotes(c, base = 60) { const r = c.root; return Q[c.q].map((i) => { let n = r + i; while (n < base - 6) n += 12; return n; }); }
  accomp(T, c, b, t, bd) {
    const notes = this.chordNotes(c);
    switch (T.acc) {
      case 'harp': { // broken chord in eighths
        const seq = [0, 1, 2, 1];
        for (let k = 0; k < 2; k++) this.harp(notes[seq[(b * 2 + k) % 4] % notes.length] + (k && b === 3 ? 12 : 0), t + k * bd / 2, bd * 1.2, 0.05);
        break;
      }
      case 'pad': if (b === 0) for (const n of notes) this.pad(n, t, bd * 4, 0.025, 900); break;
      case 'airpad': if (b === 0) for (const n of notes) this.pad(n + 12, t, bd * 4, 0.02, 2200); if (b % 2 === 1) this.harp(notes[(b + 1) % notes.length] + 12, t, bd * 2, 0.03); break;
      case 'marimba': for (let k = 0; k < 2; k++) this.marimba(notes[(b * 2 + k) % notes.length] + (k ? 0 : -12), t + k * bd / 2, 0.07); break;
      case 'drone': if (b === 0) { this.pad(notes[0] - 12, t, bd * 4.2, 0.035, 500); this.pad(notes[2] - 12, t, bd * 4.2, 0.02, 500); } break;
      case 'strings': if (b === 0 || b === 2) for (const n of notes) this.strings(n, t, bd * 2, 0.022); break;
    }
  }
  bassLine(T, c, b, t, bd, bar) {
    const r = c.root - 12;
    switch (T.bass) {
      case 'root5': if (b === 0) this.bass(r, t, bd * 1.8); if (b === 2) this.bass(r + 7, t, bd * 1.6); break;
      case 'soft': if (b === 0) this.bass(r, t, bd * 3.5, 0.12); break;
      case 'pulse': this.bass(r, t, bd * 0.45, 0.14); this.bass(r, t + bd / 2, bd * 0.4, 0.1); break;
      case 'walk': { const w = [0, 3, 5, 7][b] + (bar % 2 ? 0 : 0); this.pizz(r + w, t, bd * 0.6); break; }
      case 'drone': if (b === 0) this.bass(r - 12 + 12, t, bd * 4, 0.12); break;
    }
  }
  percussion(T, b, t, bd) {
    if (T.perc === 'drums') {
      this.a._kick(t, 0.9); if (b === 2) this.a._kick(t + bd / 2, 0.6);
      if (b === 1 || b === 3) this.snare(t, 0.5);
      this.a._hat(t + bd / 2, 0.6); this.a._hat(t, 0.4);
    } else if (T.perc === 'clank' && (b === 1 || b === 3)) this.clank(t);
  }

  // ---- instruments (all very small: a couple of oscillators and envelopes)
  env(g, t, a, peak, dur, rel = 0.12) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.gain.linearRampToValueAtTime(0, t + dur + rel);
  }
  osc(type, freq, t, dur, dest, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur + 0.3);
    return o;
  }
  lead(kind, n, t, dur) {
    const ctx = this.ctx, f = N(n);
    const g = ctx.createGain(); g.connect(this.bus); g.connect(this.a.delay);
    switch (kind) {
      case 'flute': {
        this.env(g, t, 0.06, 0.09, dur * 0.95);
        const o = this.osc('sine', f, t, dur, g);
        const o2 = this.osc('triangle', f, t, dur, g); o2.detune.value = 3;
        // gentle vibrato after the attack
        const l = ctx.createOscillator(); l.frequency.value = 5.2; const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.35, dur));
        l.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); l.start(t); l.stop(t + dur + 0.3);
        break;
      }
      case 'musicbox': case 'celesta': case 'bell': {
        const peak = kind === 'bell' ? 0.07 : 0.06;
        g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(0.6, dur * (kind === 'bell' ? 2.2 : 1.4)));
        this.osc('sine', f, t, dur * 2.2, g);
        const h = ctx.createGain(); h.gain.value = kind === 'musicbox' ? 0.5 : 0.3; h.connect(g);
        this.osc('sine', f * (kind === 'bell' ? 2.76 : 4), t, dur, h);
        break;
      }
      case 'horn': case 'clarinet': {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'horn' ? 1100 : 1800; lp.connect(g);
        this.env(g, t, kind === 'horn' ? 0.08 : 0.03, 0.07, dur * 0.92);
        this.osc(kind === 'horn' ? 'sawtooth' : 'square', f, t, dur, lp);
        if (kind === 'horn') this.osc('sawtooth', f, t, dur, lp, 6);
        break;
      }
      case 'brass': {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.08); lp.frequency.linearRampToValueAtTime(1500, t + dur);
        lp.connect(g);
        this.env(g, t, 0.05, 0.075, dur * 0.9);
        this.osc('sawtooth', f, t, dur, lp, -5); this.osc('sawtooth', f, t, dur, lp, 5);
        break;
      }
    }
  }
  harp(n, t, dur, vol) {
    const g = this.ctx.createGain(); g.connect(this.bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    this.osc('triangle', N(n), t, dur, g);
  }
  marimba(n, t, vol) {
    const g = this.ctx.createGain(); g.connect(this.bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.35);
    this.osc('sine', N(n), t, 0.4, g);
    const h = this.ctx.createGain(); h.gain.value = 0.25; h.connect(g); this.osc('sine', N(n) * 4, t, 0.1, h);
  }
  pad(n, t, dur, vol, cut) {
    const ctx = this.ctx;
    const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    lp.connect(g); g.connect(this.bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    this.osc('sawtooth', N(n), t, dur, lp, -8); this.osc('sawtooth', N(n), t, dur, lp, 8);
  }
  strings(n, t, dur, vol) { this.pad(n, t, dur, vol, 1800); }
  bass(n, t, dur, vol = 0.16) {
    const g = this.ctx.createGain(); g.connect(this.bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    this.osc('sine', N(n), t, dur, g);
    const h = this.ctx.createGain(); h.gain.value = 0.25; h.connect(g); this.osc('triangle', N(n) * 2, t, dur, h);
  }
  pizz(n, t, dur) {
    const g = this.ctx.createGain(); g.connect(this.bus);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    this.osc('triangle', N(n), t, dur, g);
  }
  snare(t, v) {
    const ctx = this.ctx, a = this.a;
    const n = ctx.createBufferSource(); n.buffer = a.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(f).connect(g).connect(this.bus); n.start(t, Math.random()); n.stop(t + 0.2);
  }
  clank(t) {
    const g = this.ctx.createGain(); g.connect(this.bus);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
    this.osc('square', 1180, t, 0.25, g); this.osc('square', 1630, t, 0.25, g);
  }
}
