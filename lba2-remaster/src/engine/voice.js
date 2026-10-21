// Gibberish voices (in the spirit of LBA2's babble): while a line types out, the speaker "talks" in a voice of
// their own. No speech synthesis and no recordings: a soft glottal-like tone (a harmonic wave with a steep
// roll-off, not a buzzing saw or square) and a little breath noise through three vowel formants, shaped into
// syllables with soft attacks and releases. The vowel comes from the letters being typed (so a line "sounds" like
// itself), consonants are a short soft hiss or tap, the pitch follows the speaker's own melody over the phrase and
// rises on a question.
//
// A voice = its race's colour (RACES) + the character's own values (VOICES): pitch f0 (Hz) and range (semitones),
// formant scale k (bigger = smaller head), source tilt (higher = darker, softer), breath, brightness, nasality,
// syllable rate, legato and swing (rhythm), an intonation contour, vibrato and a fixed seed. The same line always
// gets the same melody from the same speaker (seeded per line), like a recorded line.
//
// Cost: nothing per frame. Work happens only when a character is typed (chars(), as before). The filter chains
// are built once per audio context and pooled (two channels: one speaking, one releasing); a speaker's tone and
// noise sources are made once per utterance, kept running across its syllables and stopped after the last one.

// vowel formants F1–F3 (Hz, an adult voice; scaled by k)
const VOWELS = { a: [730, 1100, 2450], e: [530, 1840, 2480], i: [310, 2200, 2950], o: [540, 880, 2400], u: [340, 870, 2250], y: [330, 1900, 2500] };
const VOWEL_LIST = Object.values(VOWELS);
const HISS = new Set('szcxfjšžh'), STOP = new Set('tkpdbgq'), NASAL = new Set('mn');
const PUNCT = new Set('.,;:!?…'), BREAK = new Set(' \t\n.,;:!?…—-"\'()');
const PENTA = [0, 2, 4, 7, 9];
const BW = [90, 120, 170]; // formant bandwidths (Hz)

const LEVEL = 0.21;      // a syllable's peak gain into the voice bus (before the voice volume)
const LEAD = 0.03;       // schedule this far ahead of the audio clock (never in the past: no clicks)
const MAXQ = 0.22;       // the text ran ahead of the voice by more than this: drop the syllable, don't queue
const CHANNELS = 2;      // pooled filter chains

// Race colours. Fields: k formant scale, vowel [F1, F2] multipliers (rounded / closed mouths), f3 third-formant
// weight, tilt (source roll-off exponent), breath, bright (lowpass Hz), nasal (0–1: hum + anti-formant), rate
// (syllables), legato (voiced share of a syllable), swing (long-short alternation), foot (stress every n),
// contour, range (semitones), jit (melodic randomness), quant (snap the melody to a scale), vib [Hz, cents],
// trem [Hz, depth], glide (portamento s), atk / rel (s), level.
const BASE = { k: 1, vowel: [1, 1], f3: 1, tilt: 1.75, breath: 0.07, bright: 3800, nasal: 0.15, rate: 1, legato: 0.72, swing: 0.12, foot: 2,
  contour: 'arc', range: 4, jit: 0.45, quant: null, vib: [5.2, 12], trem: null, glide: 0.035, atk: 0.028, rel: 0.045, level: 1 };
export const RACES = {
  // Quetch (Twinsen's people): the plain, warm speaking voice everyone else is heard against
  quetch: {},
  // Grobos: big heads and chests, low formants, slow and heavy, statements that fall
  grobo: { k: 0.8, tilt: 2.1, breath: 0.05, bright: 2500, nasal: 0.35, rate: 0.8, legato: 0.86, swing: 0.22, foot: 3, contour: 'fall', range: 3, jit: 0.35, vib: [4.2, 9], glide: 0.06, level: 1.1 },
  // Rabbibunnies: small and quick, bright, a little nasal and breathy, hopping up and down
  bunny: { k: 1.22, tilt: 1.55, breath: 0.12, bright: 5000, nasal: 0.3, rate: 1.18, legato: 0.5, swing: 0.28, contour: 'bounce', range: 5, jit: 0.4, vib: [6.2, 15], glide: 0.02, level: 1.15 },
  // Spheros: round "oo"/"oh" vowels, smooth, every syllable a little upward bounce
  sphero: { k: 1.08, vowel: [0.95, 0.72], tilt: 2.0, breath: 0.03, bright: 2000, nasal: 0.2, rate: 1.25, legato: 0.5, swing: 0.3, contour: 'boing', range: 10, jit: 0.3, vib: [5, 10], glide: 0.07, level: 0.9 },
  // Esmers: airy and chiming (a strong third formant), sung rather than spoken, on a five-note scale
  esmer: { k: 1.06, f3: 1.8, tilt: 1.5, breath: 0.17, bright: 5400, nasal: 0.05, rate: 0.88, legato: 1.05, swing: 0.06, foot: 3, contour: 'sing', range: 5, quant: 'penta', jit: 0.45, vib: [5.6, 22], glide: 0.05, level: 1 },
  // Mosquibees: high and fast with a soft wing flutter (tremolo), not a square-wave buzz
  bee: { k: 1.38, tilt: 1.5, breath: 0.09, bright: 5200, nasal: 0.1, rate: 1.4, legato: 0.62, swing: 0.15, contour: 'bounce', range: 4, jit: 0.5, vib: [7, 16], trem: [26, 0.35], glide: 0.015, level: 1.15 },
  // the moles: a closed-mouth, snuffly hum, dark, a sniff at the start of a phrase
  mole: { k: 0.95, vowel: [0.8, 0.78], tilt: 2.3, breath: 0.1, bright: 1700, nasal: 0.85, rate: 0.85, legato: 0.82, swing: 0.2, foot: 3, contour: 'fall', range: 3, jit: 0.4, vib: [4.5, 12], glide: 0.05, snuffle: true, level: 0.6 },
  // elves and gnomes: small, quick, sharp up-and-down jumps
  elf: { k: 1.3, tilt: 1.6, breath: 0.08, bright: 4800, nasal: 0.25, rate: 1.25, legato: 0.55, swing: 0.2, contour: 'zigzag', range: 6, jit: 0.4, vib: [6, 14], glide: 0.02, level: 0.95 },
  // Zeelich's triangle-heads: clipped, even, stepping between whole tones
  tri: { k: 1.02, tilt: 1.8, breath: 0.05, bright: 3600, nasal: 0.1, rate: 1.1, legato: 0.45, swing: 0.05, foot: 3, contour: 'step', quant: 'whole', range: 4, jit: 0.5, vib: [5, 8], glide: 0.025, level: 1.4 },
  // machines: a pure, dark tone in exact steps, no vibrato
  robot: { k: 1, tilt: 2.6, breath: 0, bright: 3000, nasal: 0, rate: 1.3, legato: 0.45, swing: 0, foot: 4, contour: 'step', quant: 'whole', range: 5, jit: 0.6, vib: [0, 0], glide: 0.004, level: 0.8 },
  // Sendell: not quite of this world: slow, breathy, sung, long soft edges
  spirit: { k: 1.3, tilt: 2.6, breath: 0.28, bright: 4200, nasal: 0, rate: 0.6, legato: 1.3, swing: 0, foot: 4, contour: 'sing', quant: 'penta', range: 7, jit: 0.3, vib: [4.5, 25], glide: 0.12, atk: 0.06, rel: 0.12, level: 0.5 },
  // a big, sleepy creature's rumble
  beast: { k: 0.7, tilt: 2.4, breath: 0.08, bright: 1300, nasal: 0.6, rate: 0.55, legato: 0.95, swing: 0.2, contour: 'fall', range: 4, jit: 0.3, vib: [3.5, 30], glide: 0.1, level: 1.2 },
};

// Every named speaker: race, a fixed seed and what sets them apart inside the race.
export const VOICES = {
  // --- the family and the friends who must be unmistakable
  // Twinsen and Zoé keep the original's median pitch (measured from the English voices: about 195 and 254 Hz)
  hero: { race: 'quetch', seed: 101, f0: 195 },                                  // clear and warm, an easy arc
  zoe: { race: 'quetch', seed: 102, f0: 252, k: 1.14, contour: 'sing', range: 7, rate: 1.08, legato: 0.86, breath: 0.13, tilt: 1.55, bright: 4800, vib: [5.8, 18], swing: 0.08, level: 0.8 }, // light, sing-song
  arthur: { race: 'quetch', seed: 103, kid: true, f0: 350, k: 1.35, contour: 'bounce', range: 7, rate: 1.15, legato: 0.62, swing: 0.3, tilt: 1.5, bright: 6000, vib: [6.5, 14], level: 1.2 }, // a bouncy boy
  baldino: { race: 'grobo', seed: 104, f0: 132, k: 0.9, nasal: 0.95, contour: 'zigzag', range: 8, rate: 1.3, legato: 0.42, swing: 0.08, foot: 2, tilt: 1.6, bright: 3200, vib: [6.8, 32], glide: 0.02, level: 0.85 }, // nasal, fast, wobbly, excitable
  vesk: { race: 'quetch', seed: 105, f0: 98, k: 0.86, contour: 'flat', range: 2, rate: 0.62, legato: 0.95, swing: 0.02, foot: 4, tilt: 2.25, breath: 0.16, bright: 2100, nasal: 0.1, vib: [3.8, 5], glide: 0.09, jit: 0.2, level: 1.5 }, // low, smooth, level
  // --- Quetch villagers
  gilbert: { race: 'quetch', seed: 106, f0: 132, k: 0.97, contour: 'fall', rate: 0.95 },
  tim: { race: 'quetch', seed: 107, kid: true, f0: 318, k: 1.27, rate: 1.15, contour: 'zigzag', range: 6, legato: 0.6 },
  lulu: { race: 'quetch', seed: 108, kid: true, f0: 305, k: 1.26, rate: 1.15, contour: 'sing', range: 7, breath: 0.12 },
  nilo: { race: 'quetch', seed: 109, kid: true, f0: 282, k: 1.2, rate: 1.1, contour: 'bounce' },
  dkid: { race: 'quetch', seed: 110, kid: true, f0: 335, k: 1.3, rate: 1.15, contour: 'bounce', range: 6 },          // Sani
  worker: { race: 'quetch', seed: 111, f0: 138, k: 0.98, rate: 1.05, legato: 0.6, contour: 'fall' },
  archivist: { race: 'quetch', seed: 112, f0: 150, rate: 0.82, legato: 0.85, contour: 'flat', range: 3, tilt: 1.9 },
  councilB: { race: 'quetch', seed: 113, f0: 205, k: 1.08, contour: 'arc', rate: 0.9 },                           // Councillor Sela
  farmer1: { race: 'quetch', seed: 114, f0: 128, k: 0.96, rate: 0.92, contour: 'fall', swing: 0.2 },             // Farmer Joss
  lhar1: { race: 'quetch', seed: 115, f0: 152, k: 1.0, rate: 1.0, contour: 'sing', range: 4 },                    // Tashi
  lhar2: { race: 'quetch', seed: 116, f0: 215, k: 1.1, contour: 'sing', range: 5, breath: 0.1 },                  // Dawa
  tarra: { race: 'quetch', seed: 117, f0: 222, k: 1.12, rate: 0.95, contour: 'arc', range: 5 },
  dallan: { race: 'quetch', seed: 118, f0: 144, k: 1.0, rate: 1.05, contour: 'arc' },
  nell: { race: 'quetch', seed: 119, f0: 210, k: 1.1, rate: 1.1, legato: 0.6, contour: 'bounce', range: 5 },
  sage: { race: 'quetch', seed: 120, f0: 112, k: 0.95, rate: 0.75, vib: [5.5, 28], contour: 'fall', tilt: 2.0 },
  radio: { race: 'quetch', seed: 121, f0: 160 },
  resident: { race: 'quetch', seed: 122, f0: 172, k: 1.04, rate: 1.1, legato: 0.6, contour: 'bounce', range: 5, swing: 0.2 }, // the opening's harbour-row resident (OPEN-2)
  // --- Grobos
  doran: { race: 'grobo', seed: 201, f0: 92, k: 0.78, rate: 0.75, vib: [4.8, 26], legato: 0.7, range: 6 },                                 // old harbour master
  guard: { race: 'grobo', seed: 202, f0: 118, k: 0.84, rate: 0.95, legato: 0.55, contour: 'flat', range: 2, swing: 0.05, foot: 2 }, // clipped orders
  councilC: { race: 'grobo', seed: 203, f0: 122, k: 0.82, rate: 0.82 },                                             // Councillor Brum
  farmer3: { race: 'grobo', seed: 204, f0: 110, k: 0.8, vib: [4.6, 18] },                                            // Grull
  yorna: { race: 'grobo', seed: 205, f0: 190, k: 0.9, rate: 0.9, contour: 'arc', range: 4 },
  pim: { race: 'grobo', seed: 206, kid: true, f0: 285, k: 1.05, rate: 1.05, contour: 'bounce', range: 5 },
  hesk: { race: 'grobo', seed: 207, f0: 150, k: 0.86, rate: 0.95, legato: 0.75 },
  dtrader: { race: 'grobo', seed: 208, f0: 115, k: 0.8, rate: 1.0, contour: 'arc' },                                // Brosk
  bram: { race: 'grobo', seed: 209, f0: 104, k: 0.79, rate: 0.85 },
  // --- Rabbibunnies
  mira: { race: 'bunny', seed: 301, f0: 205, k: 1.25, rate: 0.92, contour: 'bounce', legato: 0.6, bright: 5600 },
  pippa: { race: 'bunny', seed: 302, f0: 230, k: 1.22, rate: 1.2, contour: 'zigzag', range: 5, legato: 0.45 },                     // the merchant: quick patter
  bersimon: { race: 'bunny', seed: 303, f0: 150, k: 1.1, rate: 0.95, vib: [5.8, 26], contour: 'sing' },
  magus: { race: 'bunny', seed: 304, f0: 125, k: 1.06, rate: 0.85, legato: 0.75, contour: 'fall' },                 // Rector Hougo
  farmer2: { race: 'bunny', seed: 305, f0: 214, k: 1.16, rate: 1.05 },                                               // Mother Bryn
  lhar3: { race: 'bunny', seed: 306, f0: 128, k: 1.08, rate: 0.85, vib: [5.2, 24], contour: 'fall' },               // Old Norbu
  ilka: { race: 'bunny', seed: 307, f0: 205, k: 1.15, rate: 1.0, legato: 0.65, contour: 'arc' },
  weaver: { race: 'bunny', seed: 308, f0: 180, k: 1.14, rate: 0.95, contour: 'sing' },                              // Lumi
  odile: { race: 'bunny', seed: 309, f0: 198, k: 1.16, rate: 1.1, legato: 0.45, contour: 'flat', range: 3 },         // the officer
  // --- Spheros
  sphero1: { race: 'sphero', seed: 401, f0: 200, rate: 1.15 },                                                       // Pom
  sphero2: { race: 'sphero', seed: 402, f0: 250, k: 1.18, rate: 1.0, range: 7 },                                     // Madam Rondo
  // --- Esmers
  nara: { race: 'esmer', seed: 501, f0: 262, k: 1.16 },
  oku: { race: 'esmer', seed: 502, f0: 128, k: 0.92, rate: 0.75, vib: [5, 26], level: 1.4 },
  xil: { race: 'esmer', seed: 503, f0: 178, k: 1.04, rate: 1.0 },
  chair: { race: 'esmer', seed: 504, f0: 134, k: 0.98, rate: 0.8 },                                                 // Councillor Amaru
  clerk: { race: 'esmer', seed: 505, f0: 168, k: 1.03, rate: 1.1, legato: 0.75 },                                  // Clerk Ottavo
  keeper: { race: 'esmer', seed: 506, f0: 126, k: 0.96, rate: 0.85, vib: [5, 20] },                               // Sefa
  // --- Mosquibees
  zbee1: { race: 'bee', seed: 601, f0: 380, rate: 1.45 },                                                            // Bzizz
  zbee2: { race: 'bee', seed: 602, f0: 280, k: 1.3, rate: 1.25, contour: 'arc' },                                   // Madam Zuzzara
  // --- the moles
  zmole1: { race: 'mole', seed: 701, f0: 128, k: 0.9, rate: 0.8, vib: [4.5, 18] },                                  // Old Grumm
  zmole2: { race: 'mole', seed: 702, f0: 220, k: 1.05, rate: 0.95, contour: 'arc' },                               // Mother Snuff
  // --- elves, gnomes and wizards
  joe: { race: 'elf', seed: 801, f0: 185, rate: 1.25, vib: [6, 20], legato: 0.4, range: 7, nasal: 0.5 },
  keraooc: { race: 'elf', seed: 802, f0: 175, k: 1.15, rate: 1.05, contour: 'sing', vib: [5.5, 22] },
  // --- Zeelich's triangle-heads
  ztri1: { race: 'tri', seed: 901, f0: 142, rate: 1.15 },                                                           // Mr Pelleck
  ztri2: { race: 'tri', seed: 902, f0: 170, k: 1.06, rate: 1.0, contour: 'arc', quant: null },                      // Tavo
  // --- others
  sendell: { race: 'spirit', seed: 1001, f0: 410 },
  drones: { race: 'robot', seed: 1002, f0: 300 },
  dinofly: { race: 'beast', seed: 1003, f0: 86 },
};
// other spellings of the same speaker (n_balradio is Baldino on the radio)
const ALIAS = { bal: 'baldino' };
// names that are not people (signs, notes, places): no voice
const SILENT = new Set(['note', 'search_nothing', 'taken', 'sealed', 'idle', 'back', 'after', 'snore', 'village', 'town', 'harbour', 'quay',
  'lighthouse', 'cliffs', 'orchard', 'depot', 'station', 'fort', 'pipe', 'camp']);

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// a small seeded generator (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// the voice for a speaker's name key ('n_zoe', 'n_zoeradio', ''), or null
export function voiceFor(nameKey) {
  if (!nameKey || !nameKey.startsWith('n_')) return null;
  let id = nameKey.slice(2);
  const radio = id.endsWith('radio') && id !== 'radio';
  if (radio) id = id.slice(0, -5);
  id = ALIAS[id] || id;
  if (SILENT.has(id)) return null;
  let own = VOICES[id];
  if (!own) { // someone without a voice of their own: a Quetch voice from the name, stable
    const h = hashStr(id);
    own = { race: 'quetch', seed: h, f0: 110 + (h % 170), k: 0.92 + ((h >>> 8) % 26) / 100, rate: 0.9 + ((h >>> 16) % 25) / 100,
      contour: ['arc', 'fall', 'sing', 'bounce'][(h >>> 20) % 4] };
  }
  const v = { ...BASE, ...RACES[own.race || 'quetch'], ...own, id, radio: radio || id === 'radio' };
  if (v.radio) v.level *= 0.9;
  return v;
}

// the glottal-like source: harmonics falling off as 1/n^tilt (a sawtooth is 1/n: buzzy; 2+ is soft and round)
const WAVES = new WeakMap();
function waveFor(ctx, tilt) {
  let m = WAVES.get(ctx);
  if (!m) WAVES.set(ctx, (m = new Map()));
  const key = Math.round(tilt * 10);
  let w = m.get(key);
  if (!w) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = Math.pow(n, -key / 10);
    w = ctx.createPeriodicWave(re, im);
    m.set(key, w);
  }
  return w;
}

// a melody value (semitones) snapped to a scale
function quantize(st, mode) {
  if (mode === 'whole') return Math.round(st / 2) * 2;
  if (mode !== 'penta') return st;
  const o = Math.floor(st / 12), r = st - o * 12;
  let best = 0, bd = 99;
  for (const p of [...PENTA, 12]) { const d = Math.abs(p - r); if (d < bd) { bd = d; best = p; } }
  return o * 12 + best;
}

export class Babble {
  constructor(audio) {
    this.audio = audio;
    this.v = null; this.acc = 0; this.count = 0;
    this.ctx = null; this.chans = null; this.ci = 0; this.cur = null;
    this.text = null; this.lineHash = 0; this.syl = 0; this.tNext = 0;
  }

  // a new speaker: the previous one (if any) is released softly
  start(nameKey) {
    this.hush();
    this.v = voiceFor(nameKey);
    this.cur = null; this.acc = 0; this.text = null; this.tNext = 0;
    this.audio.duck?.(!!this.v);
  }
  // the speaker is done (dialogue closed, scene over): silence now, softly
  stop() { this.hush(); this.v = null; this.cur = null; this.audio.duck?.(false); }
  // stop the sound but keep the speaker (the text was skipped to its end, the game paused)
  hush() {
    const ctx = this.ctx;
    if (!ctx || !this.chans) return;
    const now = ctx.currentTime;
    for (const ch of this.chans) this._release(ch, now);
    this.cur = null; this.tNext = 0;
  }
  // number of tone sources alive (for tests: 0 a moment after stop / hush)
  get live() { return this.chans ? this.chans.filter((c) => c.src).length : 0; }

  // the line `text` has typed out from `from` to `to` characters: babble the syllables in between.
  // Returns true when this speaker has a voice (the plain typing blip is then not needed).
  chars(text, from, to) {
    const v = this.v;
    if (!v) return false;
    if (text !== this.text) { this.text = text; this.lineHash = hashStr(text); this.syl = 0; this.acc = 4 - v.rate; }
    for (let i = from; i < to; i++) {
      const c = text[i] || ' ';
      if (BREAK.has(c)) { if (PUNCT.has(c)) this.acc = -1.2; continue; } // a pause at punctuation
      this.acc += v.rate;
      if (this.acc < 4) continue; // ≈ 10 syllables a second at the normal text speed, scaled by the voice's rate
      this.acc = 0;
      this.syllable(text, i);
    }
    return true;
  }

  // ---------------------------------------------------------------- the pooled chains
  _build(ctx) {
    this.ctx = ctx;
    this.chans = [];
    for (let c = 0; c < CHANNELS; c++) {
      const ch = { src: null, v: null };
      ch.in = ctx.createGain();                                   // tone + breath
      ch.breath = ctx.createGain(); ch.breath.gain.value = 0; ch.breath.connect(ch.in);
      ch.env = ctx.createGain(); ch.env.gain.value = 0;           // the syllables
      ch.F = [0, 1, 2].map(() => {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass';
        const g = ctx.createGain(); ch.in.connect(f); f.connect(g); g.connect(ch.env);
        return { f, g };
      });
      ch.mur = ctx.createBiquadFilter(); ch.mur.type = 'lowpass'; ch.mur.frequency.value = 320; ch.mur.Q.value = 0.6; // the nasal hum
      ch.murG = ctx.createGain(); ch.in.connect(ch.mur); ch.mur.connect(ch.murG); ch.murG.connect(ch.env);
      ch.trem = ctx.createGain(); ch.trem.gain.value = 1; ch.env.connect(ch.trem);
      ch.anti = ctx.createBiquadFilter(); ch.anti.type = 'peaking'; ch.anti.frequency.value = 1000; ch.anti.Q.value = 1.4; ch.trem.connect(ch.anti);
      ch.tone = ctx.createBiquadFilter(); ch.tone.type = 'lowpass'; ch.tone.Q.value = 0.5; ch.anti.connect(ch.tone);
      ch.cons = ctx.createBiquadFilter(); ch.cons.type = 'bandpass'; ch.cons.Q.value = 1.2;   // consonant noise
      ch.consG = ctx.createGain(); ch.consG.gain.value = 0; ch.cons.connect(ch.consG); ch.consG.connect(ch.tone);
      ch.out = ctx.createGain(); ch.tone.connect(ch.out);
      ch.out.connect(this.audio.voiceBus);
      this.chans.push(ch);
    }
  }

  // set a channel to a voice (the channel is silent: its envelope is at 0)
  _configure(ch, v, now) {
    ch.v = v;
    const s = (p, x) => p.setTargetAtTime(x, now, 0.005);
    s(ch.F[0].g.gain, 1); s(ch.F[1].g.gain, 0.6); s(ch.F[2].g.gain, 0.22 * v.f3);
    s(ch.murG.gain, 0.06 + v.nasal * 0.3);
    s(ch.breath.gain, v.breath * 2.2);
    ch.anti.frequency.value = 1050 * v.k; s(ch.anti.gain, -v.nasal * 10);
    if (v.radio) { ch.tone.type = 'bandpass'; ch.tone.frequency.value = 1700; ch.tone.Q.value = 0.9; }
    else { ch.tone.type = 'lowpass'; ch.tone.frequency.value = v.bright; ch.tone.Q.value = 0.5; }
    s(ch.out.gain, v.level * (v.radio ? 1.6 : 1));
  }

  // fade a channel out and let its sources end
  _release(ch, now) {
    for (const p of [ch.env.gain, ch.consG.gain]) { p.cancelScheduledValues(now); p.setTargetAtTime(0, now, 0.015); }
    const s = ch.src;
    if (s && s.until > now + 0.15) { s.until = now + 0.15; for (const n of s.nodes) n.stop(s.until); } // (never revive an ended one)
  }

  // the tone, vibrato, noise (and flutter) of one utterance, feeding a channel; ended and disconnected by themselves
  _sources(ch, v, f, t) {
    const ctx = this.ctx;
    if (ch.src) { for (const n of ch.src.nodes) n.stop(t); } // (an old one still tailing off: it ends as this begins)
    const o = ctx.createOscillator(); o.setPeriodicWave(waveFor(ctx, v.tilt)); o.frequency.setValueAtTime(f, t);
    o.connect(ch.in);
    const vib = ctx.createOscillator(); vib.frequency.value = v.vib[0] || 5;
    const vg = ctx.createGain(); vg.gain.value = 0; vib.connect(vg); vg.connect(o.detune);
    const nodes = [o, vib], all = [o, vib, vg];
    let n = null;
    if (this.audio.noiseBuf) {
      n = ctx.createBufferSource(); n.buffer = this.audio.noiseBuf; n.loop = true;
      n.connect(ch.breath); n.connect(ch.cons); nodes.push(n); all.push(n);
    }
    if (v.trem) {
      const tl = ctx.createOscillator(); tl.frequency.value = v.trem[0];
      const tg = ctx.createGain(); tg.gain.value = v.trem[1] / 2; tl.connect(tg); tg.connect(ch.trem.gain);
      ch.trem.gain.setValueAtTime(1 - v.trem[1] / 2, t);
      nodes.push(tl); all.push(tl, tg);
    } else ch.trem.gain.setValueAtTime(1, t);
    const s = { o, vg, vib, nodes, until: t + 0.5 };
    for (const x of nodes) x === n ? x.start(t, (this.lineHash % 997) / 997) : x.start(t);
    o.onended = () => { for (const x of all) x.disconnect(); if (ch.src === s) ch.src = null; };
    ch.src = s;
    return s;
  }

  syllable(text, i) {
    const A = this.audio, ctx = A.ctx, v = this.v;
    if (!ctx || ctx.state !== 'running' || !(A.vol.voice > 0) || !A.voiceBus) return;
    if (ctx !== this.ctx) this._build(ctx);
    const now = ctx.currentTime;
    const ts = Math.max(now + LEAD, this.tNext);
    if (ts > now + MAXQ) return;
    this.count++;
    const n = this.syl++;
    const r = rng(v.seed ^ this.lineHash ^ Math.imul(i + 1, 0x9e3779b1));

    // ---- where in the phrase (between punctuation) this syllable sits, and how the phrase ends
    let s0 = i, e = i;
    while (s0 > 0 && !PUNCT.has(text[s0 - 1])) s0--;
    while (e < text.length && !PUNCT.has(text[e])) e++;
    const p = (i - s0) / Math.max(1, e - s0), tail = text[e] || '.';
    const stress = n % v.foot === 0;

    // ---- melody (semitones around f0): the speaker's contour over the phrase, a little seeded freedom
    let st;
    switch (v.contour) {
      case 'sing': st = 0.75 * Math.sin(2 * Math.PI * (p * 1.3 + (v.seed % 7) / 7)); break;
      case 'bounce': st = (n % 2 ? 0.45 : -0.45) + 0.25 * (0.5 - p); break;
      case 'zigzag': st = [0.9, -0.55, 0.3, -0.2][n % 4]; break;
      case 'flat': st = 0.1 - 0.3 * p; break;
      case 'fall': st = 0.55 - 1.0 * p; break;
      case 'boing': st = 0.35 * Math.sin(Math.PI * p) + (n % 3 === 0 ? 0.3 : 0); break;
      case 'step': st = 0.2 - 0.4 * p; break;
      default: st = 0.9 * Math.sin(Math.PI * Math.min(1, p * 1.15)) - 0.4 * p - 0.35; // 'arc'
    }
    st = st * v.range + (r() - 0.5) * 2 * v.jit * v.range * 0.5;
    if (tail === '?') st += Math.min(5, v.range * 0.8) * Math.max(0, (p - 0.55) / 0.45); // a question rises at the end
    else if (tail === '.' || tail === '…') st -= v.range * 0.4 * p * p;              // a statement settles
    if (tail === '!') st += 1.5;
    if (stress) st += 0.5;
    st = quantize(st, v.quant);
    const f = v.f0 * Math.pow(2, st / 12);

    // ---- rhythm: syllable length from the voice's rate, swing (long-short) and stress
    const swing = 1 + v.swing * (n % 2 ? -1 : 1);
    const dur = Math.min(0.24, Math.max(0.055, (0.088 / Math.pow(v.rate, 0.7)) * swing * (stress ? 1.15 : 1) * (0.92 + r() * 0.16)));
    // the next syllable waits for this one's release (a clear dip between syllables), at most for its length
    this.tNext = ts + Math.min(dur, dur * v.legato + v.rel * 0.8);

    // ---- the channel and its sources for this utterance
    let ch = this.cur;
    if (!ch) { this.ci = (this.ci + 1) % CHANNELS; ch = this.cur = this.chans[this.ci]; this._configure(ch, v, now); }
    let src = ch.src;
    if (!src || src.until < ts + 0.04) src = this._sources(ch, v, f, ts);
    src.until = ts + dur + 0.4;
    for (const x of src.nodes) x.stop(src.until);

    // ---- consonant onset: a short, soft hiss or tap, then the vowel
    const c0 = (text[i] || '').toLowerCase();
    const hiss = HISS.has(c0), tap = STOP.has(c0), nas = NASAL.has(c0);
    const snuff = v.snuffle && (i === s0 || n === 0);
    const cd = hiss ? 0.045 : tap ? 0.016 : snuff ? 0.07 : 0;
    const peak = LEVEL * (stress ? 1.18 : 1) * (tail === '!' ? 1.15 : 1);
    if (cd && v.breath > 0) {
      const cg = ch.consG.gain, ca = peak * (hiss ? 0.18 : snuff ? 0.3 : 0.3);
      ch.cons.frequency.setValueAtTime(snuff ? 900 : hiss ? 4600 * Math.sqrt(v.k) : 2300 * v.k, ts);
      cg.cancelScheduledValues(ts);
      cg.setTargetAtTime(ca, ts, 0.004);
      cg.setTargetAtTime(0, ts + cd * 0.6, cd * 0.3);
    }
    const tv = ts + cd * 0.55;   // the vowel starts as the consonant ends

    // ---- pitch: glide to the note, then the syllable's own small fall (or a Sphero's bounce up)
    const fr = src.o.frequency;
    fr.cancelScheduledValues(tv);
    if (v.contour === 'boing') { fr.setTargetAtTime(f * 0.88, tv, 0.008); fr.setTargetAtTime(f * 1.06, tv + 0.012, dur * 0.35); }
    else { fr.setTargetAtTime(f, tv, v.glide / 3); fr.setTargetAtTime(f * (stress ? 0.97 : 0.985), tv + dur * 0.45, dur * 0.4); }
    // vibrato: little at the onset, blooming on the held part
    const vg = src.vg.gain;
    vg.cancelScheduledValues(tv);
    vg.setTargetAtTime(v.vib[1] * 0.3, tv, 0.01);
    vg.setTargetAtTime(v.vib[1], tv + Math.min(0.05, dur * 0.4), 0.04);

    // ---- the vowel: formants glide (coarticulation), from the next vowel letter in the text
    let vow = null;
    for (let k = i; k < Math.min(text.length, i + 4); k++) { const l = text[k].normalize('NFD')[0].toLowerCase(); if (VOWELS[l]) { vow = VOWELS[l]; break; } }
    if (!vow) vow = VOWEL_LIST[(text.charCodeAt(i) + i) % VOWEL_LIST.length]; // (scripts without written vowels)
    for (let j = 0; j < 3; j++) {
      const F = vow[j] * v.k * (j < 2 ? v.vowel[j] : 1) * (nas && j === 0 ? 0.85 : 1);
      const fp = ch.F[j].f.frequency, q = ch.F[j].f.Q;
      fp.cancelScheduledValues(tv); q.cancelScheduledValues(tv);
      fp.setTargetAtTime(F, tv, 0.018);
      q.setTargetAtTime(F / (BW[j] * Math.sqrt(v.k)), tv, 0.018); // (bandwidths about constant in Hz)
    }

    // ---- loudness: soft attack, a gentle droop, a soft release (exponential approaches only: no clicks)
    const g = ch.env.gain;
    g.cancelScheduledValues(tv);
    g.setTargetAtTime(peak, tv, v.atk / 3);
    g.setTargetAtTime(peak * 0.78, tv + v.atk, dur * 0.5);
    g.setTargetAtTime(0, tv + Math.max(v.atk, dur * v.legato), v.rel / 3);
  }
}
