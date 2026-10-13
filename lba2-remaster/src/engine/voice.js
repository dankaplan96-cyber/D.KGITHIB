// Gibberish voices: while a line types out, the speaker babbles in their own voice. No speech synthesis: short
// grains of a buzzing source through two formant filters, the vowel taken from the letters being typed (so a
// line "sounds" like itself), a little noise for hissing and stopping consonants, the pitch rising on a question.
// Each character has a voice: base pitch f0 (Hz), formant scale k (bigger = smaller head), speed, and a few
// quirks (wobble for the old, a robot's square wave, the radio's band-pass).

const VOWELS = { a: [780, 1240], e: [520, 1850], i: [330, 2250], o: [520, 900], u: [360, 820], y: [340, 2100] };
const VOWEL_LIST = Object.values(VOWELS);
const HISS = new Set('szcxfjšž'), STOP = new Set('tkpdbgq');

export const VOICES = {
  // Twinsen and Zoé after the original's English voices (median pitch measured: about 195 and 254 Hz)
  hero: { f0: 195, k: 1.0 },                       // Twinsen
  zoe: { f0: 252, k: 1.13 },
  arthur: { f0: 330, k: 1.28, rate: 1.15 },
  baldino: { f0: 128, k: 1.12, rate: 1.2 },        // fast, a bit nasal
  vesk: { f0: 102, k: 0.9, rate: 0.85 },           // low and measured
  pippa: { f0: 252, k: 1.16, rate: 1.1 },
  mira: { f0: 205, k: 1.08, rate: 1.05 },
  doran: { f0: 92, k: 0.88, rate: 0.8, wobble: 0.04 },
  sage: { f0: 112, k: 0.95, rate: 0.75, wobble: 0.07 },
  oku: { f0: 98, k: 0.92, rate: 0.75, wobble: 0.06 },
  xil: { f0: 178, k: 1.04 }, worker: { f0: 138, k: 0.98 }, guard: { f0: 118, k: 0.94, rate: 0.9 },
  gilbert: { f0: 132, k: 1.0 }, nara: { f0: 262, k: 1.18 }, lulu: { f0: 305, k: 1.26, rate: 1.15 }, tim: { f0: 318, k: 1.27, rate: 1.15 },
  hesk: { f0: 158, k: 1.02 }, ilka: { f0: 212, k: 1.1 }, keeper: { f0: 126, k: 0.96, wobble: 0.03 }, tarra: { f0: 222, k: 1.12 },
  yorna: { f0: 195, k: 1.07 }, dallan: { f0: 144, k: 1.0 }, weaver: { f0: 176, k: 1.05 }, archivist: { f0: 150, k: 1.0, rate: 0.85 },
  clerk: { f0: 168, k: 1.03, rate: 1.1 }, chair: { f0: 134, k: 0.97, rate: 0.85 }, councilB: { f0: 122, k: 0.95 }, councilC: { f0: 208, k: 1.08 },
  nilo: { f0: 282, k: 1.2 }, pim: { f0: 292, k: 1.22, rate: 1.1 }, dkid: { f0: 335, k: 1.3, rate: 1.15 }, k1: { f0: 325, k: 1.28 },
  farmer1: { f0: 128, k: 0.96 }, farmer2: { f0: 214, k: 1.1 }, farmer3: { f0: 110, k: 0.93, wobble: 0.03 },
  sendell: { f0: 410, k: 1.35, rate: 0.6, wave: 'sine', soft: true }, // not quite of this world
  drones: { f0: 300, k: 1.0, rate: 1.3, wave: 'square', robot: true },
  zbee1: { f0: 340, k: 1.3, rate: 1.4, wobble: 0.12, wave: 'square' }, zbee2: { f0: 290, k: 1.25, rate: 1.3, wobble: 0.1, wave: 'square' }, // a Mosquibee's buzz
  zmole1: { f0: 132, k: 1.08, rate: 0.95, wobble: 0.04 }, zmole2: { f0: 228, k: 1.16, rate: 1.1 }, // the moles: a snuffly hum
  joe: { f0: 300, k: 1.3, rate: 1.25, wobble: 0.04 }, // Joe the Elf: high and quick
  sphero1: { f0: 180, k: 1.1, rate: 1.15, wobble: 0.08 }, sphero2: { f0: 250, k: 1.2, rate: 1.2, wobble: 0.06 }, // the Spheros: round and bouncy
  bersimon: { f0: 150, k: 1.05, rate: 0.95, wobble: 0.06 }, magus: { f0: 125, k: 0.98, rate: 0.85 }, keraooc: { f0: 175, k: 1.1, rate: 1.05, wobble: 0.05 }, // the wizards
  ztri1: { f0: 142, k: 0.96, rate: 1.15 }, ztri2: { f0: 168, k: 1.0, rate: 1.05 },
  dinofly: { f0: 86, k: 0.74, rate: 0.55, wobble: 0.1, wave: 'triangle' }, // a big, sleepy creature's rumble
};
// names that are not people (signs, notes, places): no voice
const SILENT = new Set(['note', 'search_nothing', 'taken', 'sealed', 'idle', 'back', 'after', 'snore', 'village', 'town', 'harbour', 'quay',
  'lighthouse', 'cliffs', 'orchard', 'depot', 'station', 'fort', 'pipe', 'camp']);

// the voice for a speaker's name key ('n_zoe', 'n_zoeradio', ''), or null
export function voiceFor(nameKey) {
  if (!nameKey || !nameKey.startsWith('n_')) return null;
  let id = nameKey.slice(2);
  const radio = id.endsWith('radio') && id !== 'radio';
  if (radio) id = id.slice(0, -5);
  if (SILENT.has(id)) return null;
  let v = VOICES[id];
  if (!v) { // someone without a voice of their own: one from the name, stable
    let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    v = { f0: 105 + (h % 200), k: 0.92 + ((h >> 8) % 30) / 100 };
  }
  return { rate: 1, wobble: 0, wave: 'sawtooth', ...v, radio: radio || id === 'radio' };
}

export class Babble {
  constructor(audio) { this.audio = audio; this.v = null; this.acc = 0; this.count = 0; }
  start(nameKey) { this.v = voiceFor(nameKey); this.acc = 0; }
  stop() { this.v = null; }
  // the line `text` has typed out from `from` to `to` characters: babble the syllables in between.
  // Returns true when this speaker has a voice (the plain typing blip is then not needed).
  chars(text, from, to) {
    const v = this.v;
    if (!v) return false;
    for (let i = from; i < to; i++) {
      const c = text[i] || ' ';
      if (/[\s.,;:!?…—-]/.test(c)) { if (/[.,;:!?…]/.test(c)) this.acc = -1.2; continue; } // a pause at punctuation
      this.acc += v.rate;
      if (this.acc < 4) continue; // ≈ 10 syllables a second at the normal text speed
      this.acc = 0;
      this.syllable(text, i);
    }
    return true;
  }
  syllable(text, i) {
    const A = this.audio, ctx = A.ctx, v = this.v;
    if (!ctx || ctx.state !== 'running' || !(A.vol.voice > 0)) return;
    this.count++;
    // the vowel: the next vowel letter in the text; for scripts without written vowels, one from the letters
    let vow = null;
    for (let k = i; k < Math.min(text.length, i + 4); k++) { const l = text[k].toLowerCase(); if (VOWELS[l]) { vow = VOWELS[l]; break; } }
    if (!vow) vow = VOWEL_LIST[(text.charCodeAt(i) + i) % VOWEL_LIST.length];
    const c0 = (text[i] || '').toLowerCase();
    // intonation: a question rises at the end, an exclamation is higher and louder, a statement falls a little
    const end = text.slice(i).search(/[.!?]/), tail = end >= 0 && end < 8 ? text[i + end] : '';
    const contour = tail === '?' ? 1.18 : tail === '!' ? 1.08 : tail === '.' ? 0.93 : 1;
    // (the originals' pitch moves about ±25 % within a line)
    const f0 = v.f0 * contour * (1 + (Math.random() - 0.5) * 0.3);
    const dur = (0.062 + Math.random() * 0.03) / Math.sqrt(v.rate);
    const t = ctx.currentTime + 0.005, vol = (tail === '!' ? 0.16 : 0.12) * (v.soft ? 0.7 : 1);
    const out = ctx.createGain(); out.gain.value = 1;
    let dest = A.voiceBus;
    if (v.radio) { // a small speaker: band-limited and a little crushed
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
      out.connect(bp); bp.connect(dest); dest = null;
    }
    if (dest) out.connect(dest);
    const o = ctx.createOscillator(); o.type = v.wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (v.robot ? 1 : 0.94), t + dur);
    if (v.wobble) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = f0 * v.wobble; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.02); }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + 0.012); env.gain.setValueAtTime(vol, t + dur * 0.6); env.gain.linearRampToValueAtTime(0, t + dur);
    for (const [F, q, g] of [[vow[0] * v.k, 5, 1], [vow[1] * v.k, 9, 0.55]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = q;
      const gg = ctx.createGain(); gg.gain.value = g * 2.2;
      o.connect(bp).connect(gg).connect(env);
    }
    env.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
    // a consonant onset: hiss or a click of noise before the vowel
    if (!v.soft && (HISS.has(c0) || STOP.has(c0)) && A.noiseBuf) {
      const n = ctx.createBufferSource(); n.buffer = A.noiseBuf;
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = HISS.has(c0) ? 5200 * v.k : 2400 * v.k; hp.Q.value = 1.2;
      const ng = ctx.createGain(), nd = HISS.has(c0) ? 0.05 : 0.012;
      ng.gain.setValueAtTime(vol * 0.5, t); ng.gain.linearRampToValueAtTime(0, t + nd);
      n.connect(hp).connect(ng).connect(out);
      n.start(t, Math.random() * 1.5); n.stop(t + nd + 0.01);
    }
  }
}
