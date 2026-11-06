// VOICE-PHRASE (the user, 3.11: "the characters' voices are still not pleasant to the ear"): the phrase, not the typed
// letter, is the unit of speech. When a character takes a turn the whole line is planned at once: its clauses (split
// at punctuation, each with a pause after it), each clause's intention (telling, asking, exclaiming, refusing, worried,
// warm, or a clause that goes on), and for each clause one connected gesture of gibberish syllables: words of one to
// three syllables, a beginning, a connected middle and an ending, the speaker's own consonants and vowels, pace,
// melody and manner (Twinsen may hesitate, Baldino gathers speed and stops short of the awkward part, Vesk turns
// clipped when he refuses, Sendell takes his time).
//
// Pure planning: no audio here. The plan is played either from pre-rendered phrases (assets/voice, rendered offline
// by tools/voice-render/synth.mjs from these same gestures) or by the live synthesis in voice.js; the talking mouth
// is driven from the same syllable times.

// vowel formants F1–F3 (Hz, an adult voice; scaled by the voice's k); 'm' is a closed-mouth hum
export const VOWELS = { a: [730, 1100, 2450], e: [530, 1840, 2480], i: [310, 2200, 2950], o: [540, 880, 2400], u: [340, 870, 2250], y: [330, 1900, 2500], m: [260, 1000, 2300] };
// consonants: kind, voiced, length (s), formant targets or loci, the noise band (Hz) of a fricative or burst, lips closed
export const CONS = {
  m: { k: 'nasal', vo: 1, d: 0.065, F: [260, 1000, 2300], lips: 1 },
  n: { k: 'nasal', vo: 1, d: 0.06, F: [260, 1500, 2500] },
  l: { k: 'liquid', vo: 1, d: 0.055, F: [360, 1150, 2700] },
  r: { k: 'liquid', vo: 1, d: 0.045, F: [420, 1250, 1750] },
  w: { k: 'glide', vo: 1, d: 0.05, F: [300, 700, 2200], lips: 1 },
  y: { k: 'glide', vo: 1, d: 0.045, F: [280, 2150, 2900] },
  v: { k: 'fric', vo: 1, d: 0.06, F: [300, 1300, 2400], nz: 3200, lips: 1 },
  z: { k: 'fric', vo: 1, d: 0.065, F: [300, 1700, 2600], nz: 4400 },
  s: { k: 'fric', vo: 0, d: 0.075, F: [350, 1700, 2600], nz: 5000 },
  f: { k: 'fric', vo: 0, d: 0.065, F: [350, 1100, 2400], nz: 3600, lips: 1 },
  h: { k: 'asp', vo: 0, d: 0.055, F: null, nz: 1500 },
  b: { k: 'stop', vo: 1, d: 0.055, F: [250, 900, 2200], nz: 1200, lips: 1 },
  d: { k: 'stop', vo: 1, d: 0.05, F: [250, 1700, 2600], nz: 3200 },
  g: { k: 'stop', vo: 1, d: 0.055, F: [250, 2000, 2400], nz: 2200 },
  p: { k: 'stop', vo: 0, d: 0.065, F: [250, 900, 2200], nz: 1200, lips: 1 },
  t: { k: 'stop', vo: 0, d: 0.06, F: [250, 1750, 2600], nz: 3600 },
  k: { k: 'stop', vo: 0, d: 0.065, F: [250, 1900, 2300], nz: 2300 },
};
// the talking mouth: how far each vowel opens it (0-1) and how round it holds the lips (+ rounded o/u, - spread i/e)
export const MOUTH_OPEN = { a: 1, e: 0.72, i: 0.46, o: 0.86, u: 0.56, y: 0.46, m: 0.08 };
export const MOUTH_ROUND = { a: 0, e: -0.35, i: -0.8, o: 1, u: 0.8, y: -0.5, m: 0.2 };

export const INTENTS = ['tell', 'ask', 'excl', 'no', 'worry', 'warm', 'cont'];

// the sounds a race's speakers favour (consonants, then vowels, most used first) and how often a word ends on a hum
const PHON = {
  quetch: ['mnldbvtsr', 'aeoiu', 0.12], grobo: ['bmgdnhlr', 'oauoe', 0.2], bunny: ['pbtlnmkv', 'ieaoy', 0.08],
  esmer: ['lnmvzhy', 'eiaou', 0.15], sphero: ['bmwnl', 'ouoa', 0.2], bee: ['zbdmnv', 'ieya', 0.1], mole: ['mnhfbw', 'uoa', 0.3],
  elf: ['pkltnd', 'ieao', 0.05], tri: ['tkdpn', 'aoe', 0.05], robot: ['tdkbn', 'oae', 0], spirit: ['lnmhy', 'aeou', 0.2], beast: ['mbgh', 'ou', 0.4],
};

// ---------------------------------------------------------------- a small seeded generator (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ---------------------------------------------------------------- the line: clauses and their intentions
const NO_WORDS = /^(no|not|never|nope|don'?t|won'?t|can'?t|isn'?t|i don'?t|i won'?t|i can'?t|nothing|nobody|stop)\b/i;
const WARM_WORDS = /^(hello|hi|hey|morning|good (morning|evening|day)|evening|welcome|thank|thanks|phew|there\b|at last|well done|good|fine|yes|oh good|ah)/i;
const WORRY_WORDS = /\b(careful|wrong|stopped|broken|afraid|worried|danger|hurt|trouble|strange|missing|lost|sick|warm\b|never warm)\b/i;

// how many syllables a piece of written text has (vowel groups per word, a silent final e dropped)
export function writtenSyllables(s) {
  let n = 0;
  for (const w of s.toLowerCase().match(/[a-zà-ÿ']+/g) || []) {
    const g = w.replace(/'/g, '').replace(/e$/, '').match(/[aeiouyà-ÿ]+/g);
    n += Math.max(1, g ? g.length : 0);
  }
  return n;
}

// the line's clauses: [{ n (syllables to speak), intent, pause (s after it), quiet (an aside in parentheses) }]
export function clauses(text) {
  const out = [];
  const re = /([^.,;:!?…—]+)(\.\.\.|…|[.,;:!?—]+|$)/g;
  let m, sentence = [];
  const flush = (endPunct) => {
    // the sentence's last clause carries its intention; the ones before it go on
    const whole = sentence.map((c) => c.s).join(' ').trim();
    let intent = 'tell';
    if (endPunct.includes('?')) intent = 'ask';
    else if (NO_WORDS.test(whole)) intent = 'no';
    else if (endPunct.includes('!')) intent = WARM_WORDS.test(whole) ? 'warm' : 'excl';
    else if (endPunct === '...' || endPunct === '…' || WORRY_WORDS.test(whole)) intent = 'worry';
    else if (WARM_WORDS.test(whole)) intent = 'warm';
    sentence.forEach((c, i) => { c.intent = i === sentence.length - 1 ? intent : 'cont'; out.push(c); });
    sentence = [];
  };
  while ((m = re.exec(text)) && m[0]) {
    const s = m[1].replace(/[()"“”]/g, ' ').trim(), p = m[2] || '';
    if (!s) { if (sentence.length && /[.!?…]/.test(p)) flush(p); continue; }
    const quiet = /^\s*\(/.test(text);   // (a thought in parentheses: said under the breath)
    const pause = p.includes('...') || p.includes('…') ? 0.42 : /[.!?]/.test(p) ? 0.3 : /[;:—]/.test(p) ? 0.2 : p.includes(',') ? 0.13 : 0;
    sentence.push({ s, w: writtenSyllables(s), pause, quiet });
    if (/[.!?…]/.test(p) || !p) flush(p || '.');
  }
  if (sentence.length) flush('.');
  // spoken syllables: most of the written ones in a short line, fewer in a long one, never more than 26 in all
  const W = out.reduce((a, c) => a + c.w, 0);
  const ratio = W <= 12 ? 0.85 : Math.max(0.5, 0.85 - (W - 12) * 0.012);
  let total = 0;
  for (const c of out) { c.n = Math.max(1, Math.round(c.w * ratio)); total += c.n; }
  while (total > 26) { const c = out.reduce((a, b) => (b.n > a.n ? b : a)); c.n--; total--; }
  if (out.length) out[out.length - 1].pause = 0;
  return out.map(({ n, intent, pause, quiet }) => ({ n, intent, pause, quiet }));
}

// ---------------------------------------------------------------- the speaker's speech values
// (from voice.js's voice: f0, range, rate, legato, contour, race, the VOICE-STYLE already applied)
export function speech(v) {
  const P = PHON[v.race] || PHON.quetch;
  return {
    cons: v.cons || P[0], vow: v.vow || P[1], coda: v.coda ?? P[2],
    pace: 6.6 * Math.pow(v.rate, 1.0),                      // syllables a second
    range: Math.max(1.5, Math.min(10, v.range * 1.3)),      // semitones
    manner: v.manner || null,                               // 'hesitate' | 'momentum' | 'clipped' | 'spacious'
    ask: v.ask || 'mix',                                    // how a question goes: 'rise', 'high' (a high start, level end), 'mix'
    legato: Math.min(1.1, v.legato),                        // how joined: the depth of the dips between syllables, air between words
  };
}

const pick = (r, s) => s[Math.min(s.length - 1, Math.floor(Math.pow(r(), 1.35) * s.length))]; // (the first ones more often)

// one connected gesture: n syllables with one intention.
// Returns { syl: [{ t, c, cd, vk, vd, coda, a, b (semitones at the vowel's start and end, round f0), amp, stress,
//   wEnd, last }], dur, breath (scale) }; t is the syllable's start (its consonant), times in seconds from 0.
export function gesture(v, n, intent, seed, o = {}) {
  const r = rng(seed), S = speech(v), R0 = S.range;
  const mod = [...({ tell: [1, 0, 1, 1], ask: [1, 0.05, 1, 1], excl: [1.35, 0.18, 0.95, 1.1], no: [0.65, -0.12, 0.92, 1], worry: [0.5, 0.12, 1.08, 0.85], warm: [1, 0.05, 1.06, 0.92], cont: [1, 0, 0.98, 1] }[intent] || [1, 0, 1, 1])];
  // (Zoé's concern sharpens her delivery: quicker and more defined, a little higher, not louder or shriller)
  if (intent === 'worry' && v.manner === 'sharp') { mod[0] = 0.7; mod[1] = 0.08; mod[2] = 0.94; mod[3] = 0.95; }
  const R = R0 * mod[0], off = mod[1] * R0, dScale = mod[2] / (o.speed || 1), ampI = mod[3] * (o.quiet ? 0.72 : 1);
  const clipped = (S.manner === 'clipped' && (intent === 'no' || intent === 'excl')) || (S.manner === 'sharp' && intent === 'worry');
  const syl = [];
  // words: one to three syllables
  const words = []; let left = n;
  while (left > 0) { let w = [1, 2, 2, 3, 2][Math.floor(r() * 5)]; if (w > left) w = left; if (left - w === 1 && w === 3) w = 2; words.push(w); left -= w; }
  let t = 0, k = 0, prevC = '', prevV = '';
  // Twinsen's hesitation: a short closed-mouth "hm" before he answers (o.hesitate, the caller decides when)
  if (o.hesitate) { syl.push({ t: 0, c: '', cd: 0, vk: 'm', vd: 0.2, coda: '', a: -0.25 * R0, b: -0.4 * R0, amp: 0.45, stress: false, wEnd: true, last: false, hum: true }); t = 0.32; }
  const ask = S.ask === 'mix' ? (r() < 0.6 ? 'rise' : 'high') : S.ask;
  for (let wi = 0; wi < words.length; wi++) {
    const wl = words[wi], lastWord = wi === words.length - 1;
    const stressAt = wl === 3 && r() < 0.3 ? 1 : 0;
    // Baldino: a beat before the last word (the awkward part)
    if (S.manner === 'momentum' && lastWord && n >= 5) t += 0.17;
    if (S.manner === 'spacious' && wi > 0) t += 0.05;
    // the speaker's articulation: a less legato voice leaves a little air between its words
    if (wi > 0) t += Math.max(0, 1.05 - S.legato) * 0.2 / dScale;
    for (let j = 0; j < wl; j++, k++) {
      const p = n > 1 ? k / (n - 1) : 1, last = k === n - 1, stress = j === stressAt, nuclear = lastWord && stress;
      // the sounds: an onset consonant most of the time (not the same twice running), a vowel of the speaker's
      let c = r() < (j === 0 ? 0.8 : 0.88) ? pick(r, S.cons) : '';
      if (c && c === prevC) c = S.cons[(S.cons.indexOf(c) + 1) % S.cons.length];
      let vk = pick(r, S.vow); if (vk === prevV && r() < 0.6) vk = S.vow[(S.vow.indexOf(vk) + 1) % S.vow.length];
      if (!VOWELS[vk]) vk = 'a';
      prevC = c; prevV = vk;
      const coda = j === wl - 1 && r() < S.coda ? (r() < 0.5 ? 'n' : 'm') : '';
      // the length: the speaker's pace, longer when stressed, at the end of a word and (most) at the end of the gesture
      let base = 1 / S.pace;
      if (S.manner === 'momentum') base *= 1.15 - 0.32 * Math.min(1, p / 0.7) + (lastWord ? 0.3 : 0);
      if (S.manner === 'spacious') base *= 1.2;
      if (clipped) base *= 0.86;
      const cd = c ? CONS[c].d * (clipped ? 0.85 : 1) : 0;
      let vd = Math.max(0.05, base * (stress ? 1.2 : 0.86) - cd * 0.6);
      if (j === wl - 1) vd *= 1.08;
      if (last) vd *= clipped ? 1.1 : intent === 'cont' ? 1.2 : intent === 'warm' ? 1.7 : 1.55;
      if (k === 0 && o.hesitate) vd *= 1.25;
      vd *= dScale * (0.93 + r() * 0.14);
      // the melody (semitones): the phrase's declination, the speaker's own contour, accents, the intention's ending
      let st = R * (0.3 - 0.6 * p) * ({ fall: 1.3, flat: 0.4, step: 0.8 }[v.contour] ?? 1) + off;
      switch (v.contour) {
        case 'arc': st += 0.35 * R * Math.sin(Math.PI * Math.min(1, p * 1.1)); break;
        case 'sing': st += 0.3 * R * Math.sin(2 * Math.PI * (p * 1.1 + (v.seed % 7) / 7)); break;
        case 'bounce': st += (k % 2 ? 0.16 : -0.1) * R; break;
        case 'zigzag': st += [0.24, -0.16, 0.12, -0.08][k % 4] * R; break;
        case 'boing': st += 0.2 * R * Math.sin(Math.PI * p); break;
      }
      if (stress) st += (nuclear ? 0.38 : 0.22) * R * (intent === 'excl' ? 1.3 : intent === 'no' ? 0.5 : 1);
      st += (r() - 0.5) * 0.24 * R * Math.min(1, v.jit / 0.45);
      let a = st, b = st - 0.06 * R;
      if (last) {
        if (intent === 'ask' && ask === 'rise') { b = a + Math.max(3, 0.6 * R0); }
        else if (intent === 'ask') { a += 0.45 * R0; b = a + 0.1 * R0; }
        else if (intent === 'cont') b = a + 0.15 * R0;
        else if (intent === 'warm') { a += 0.15 * R0; b = a - 0.55 * R0; }
        else if (intent === 'worry') b = a - 0.15 * R0;
        else if (intent === 'excl') b = a - 0.5 * R0;
        else b = a - (intent === 'no' ? 0.45 : 0.35) * R0;
      } else if (intent === 'ask' && ask === 'high' && nuclear) { a += 0.45 * R0; b = a; }
      if (v.quant === 'penta' || v.quant === 'whole') { a = quantize(a, v.quant); b = last ? b : a; }
      a = Math.max(-1.2 * R0 - 2, Math.min(1.4 * R0 + 3, a)); b = Math.max(-1.2 * R0 - 3, Math.min(1.4 * R0 + 5, b));
      // the loudness: a little on stress, a gentle fall over the phrase
      const amp = ampI * (stress ? 1.12 : 1) * (nuclear ? 1.06 : 1) * (1 - 0.2 * p) * (last ? 0.9 : 1) * (0.95 + r() * 0.1);
      syl.push({ t, c, cd, vk, vd, coda, a: +a.toFixed(3), b: +b.toFixed(3), amp: +amp.toFixed(3), stress, wEnd: j === wl - 1, last });
      t += cd + vd + (coda ? 0.05 : 0);
    }
  }
  // the melody centred on the speaker's own pitch (accents and endings lift it; the voice's median stays at f0)
  const mid = syl.filter((x) => !x.hum).map((x) => (x.a + x.b) / 2).sort((x, y) => x - y)[Math.floor(syl.length / 2)] || 0;
  for (const x of syl) { x.a = +(x.a - mid * 0.85).toFixed(3); x.b = +(x.b - mid * 0.85).toFixed(3); }
  return { syl, dur: t, leg: S.legato, breath: intent === 'worry' ? 1.3 : intent === 'warm' ? 1.2 : 1 };
}

const PENTA = [0, 2, 4, 7, 9, 12];
function quantize(st, mode) {
  if (mode === 'whole') return Math.round(st / 2) * 2;
  const o = Math.floor(st / 12), rr = st - o * 12;
  let best = 0, bd = 99;
  for (const p of PENTA) { const d = Math.abs(p - rr); if (d < bd) { bd = d; best = p; } }
  return o * 12 + best;
}

// the whole line, laid out for the live synthesis: { phrases: [{ t0, g (gesture), intent, n }], dur, syl (every
// syllable with its time from the start of the line) }. o: { maxDur, seed, hesitate }
export function planLine(v, text, o = {}) {
  const cl = clauses(text);
  const h = (o.seed ?? 0) ^ hashStr(text) ^ v.seed;
  const build = (speed, fewer = 1) => {
    const phrases = []; let t = 0;
    cl.forEach((c, i) => {
      const g = gesture(v, Math.max(1, Math.round(c.n * fewer)), c.intent, h + i * 7919, { quiet: c.quiet, speed, hesitate: i === 0 && o.hesitate });
      phrases.push({ t0: t, g, intent: c.intent, n: g.syl.filter((x) => !x.hum).length, quiet: c.quiet });
      t += g.dur + c.pause * (speech(v).manner === 'spacious' ? 1.4 : 1) / speed;
    });
    return { phrases, dur: t };
  };
  let p = build(1);
  // never much longer than the line takes to read (a long line: fewer, quicker syllables, not a minute of babble), and a
  // cinematic's line fits its subtitle's time (up to a quarter faster, then the last clauses are left out)
  // (fewer syllables first, each speaker keeping their own pace; then a little quicker; then the last clauses go)
  const maxDur = Math.min(o.maxDur || 99, 0.8 + 0.4 * Math.sqrt(text.length));
  for (let f = 0.9; p.dur > maxDur && f >= 0.6; f -= 0.1) p = build(1, f);
  for (let sp = 1.06; p.dur > maxDur && sp <= 1.19; sp += 0.06) p = build(sp, 0.6);
  while (p.dur > maxDur && p.phrases.length > 1) { p.phrases.pop(); const l = p.phrases[p.phrases.length - 1]; p.dur = l.t0 + l.g.dur; }
  p.syl = [];
  for (const ph of p.phrases) for (const s of ph.g.syl) p.syl.push({ ...s, t: s.t + ph.t0 });
  return p;
}
