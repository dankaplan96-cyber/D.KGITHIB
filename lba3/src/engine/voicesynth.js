// VOICE-PHRASE: the offline voice synthesiser behind the pre-rendered phrases (assets/voice). It renders one planned
// gesture (src/engine/voiceplan.js) sample by sample, in the manner of a formant ("Klatt") synthesiser:
//   - a glottal source: a smooth pulse per period (open phase, closing, closed), its derivative, softened by a
//     return-phase low-pass (the speaker's spectral tilt), with a slow pitch wander and a little shimmer,
//     breath noise that pulses with the glottis;
//   - a cascade of five formant resonators whose frequencies and bandwidths glide sample by sample from sound to
//     sound (so syllables run into each other the way a mouth moves), a nasal pole and zero for m and n;
//   - fricatives and soft bursts through their own resonator, added after the cascade;
//   - voicing that carries on through the voiced consonants inside a word (m n l r w y v z b d g), and stops only
//     for the voiceless ones and between phrases.
// No samples, no recordings, no speech engine. Runs in Node (tools/voice-render/build-banks.mjs) or a page.
//
// P18-VOICES: moved here from tools/voice-render/synth.mjs (which re-exports it): the "Words" voices render each line
// with it when the line starts (Babble._words in voice.js), about a millisecond of work per second of speech. A
// syllable of a Words plan (voicewords.js) has its onset consonants (on: [[key, s] ...]), its coda (co), and may glide
// to a second vowel (vk2, a diphthong); new kinds: affricates (ch, j: a closure, a burst, a short fricative), weak
// fricatives (th, dh), a released final stop. A syllable without them (the classic plans) renders as it did.
import { VOWELS, CONS } from './voiceplan.js';

// a two-pole resonator (Klatt): unity gain at 0 Hz
function res() { return { a: 1, b: 0, c: 0, y1: 0, y2: 0 }; }
function setRes(r, f, bw, T) {
  const c = -Math.exp(-2 * Math.PI * bw * T), b = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(2 * Math.PI * f * T);
  r.a = 1 - b - c; r.b = b; r.c = c;
}
const run = (r, x) => { const y = r.a * x + r.b * r.y1 + r.c * r.y2; r.y2 = r.y1; r.y1 = y; return y; };
// an anti-resonator (a zero pair), the nasal zero
function antiRun(z, x) { const y = z.a * x + z.b * z.x1 + z.c * z.x2; z.x2 = z.x1; z.x1 = x; return y; }
function setAnti(z, f, bw, T) { setRes(z, f, bw, T); const a = 1 / z.a; z.a = a; z.b = -z.b * a; z.c = -z.c * a; }

// P18-VOICES: a band-pass of 0 dB peak (RBJ), for the Words consonants' noise, and each fricative's strength
function setBP(f, fc, q, sr) { const w = 2 * Math.PI * fc / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al; f.b0 = al / a0; f.b2 = -al / a0; f.a1 = -2 * Math.cos(w) / a0; f.a2 = (1 - al) / a0; }
function runBP(f, x) { const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2; f.x2 = f.x1; f.x1 = x; f.y2 = f.y1; f.y1 = y; return y; }
const NZ = { s: 1, z: 0.55, sh: 1.1, zh: 0.6, f: 0.32, v: 0.2, th: 0.3, dh: 0.16, ch: 0.9, j: 0.5 };
// render a gesture (or a planned line: { syl }) for voice v. Returns Float32Array at sr.
// o: { sr, seed, tail (s of silence after), lead (s before), cons (the consonant noise's level; else the style's) }
export function renderGesture(v, g, o = {}) {
  const sr = o.sr || 32000, T = 1 / sr, lead = o.lead ?? 0.03, tail = o.tail ?? 0.18;
  const syl = g.syl;
  const L = syl[syl.length - 1];
  const end = syl.length ? L.t + L.cd + L.vd + (L.co ? L.cod || 0 : L.coda ? 0.05 : 0) : 0;
  const N = Math.ceil((lead + end + tail) * sr);
  const out = new Float32Array(N);
  // (P18-VOICES, o.words: the consonants' noise is kept apart and joins after the voice's brightness low-pass, through
  //  a gentle one of its own: under a 2.5-3.4 kHz ceiling an s or an sh was gone and left a hole in the line)
  const W = !!o.words, nzOut = W ? new Float32Array(N) : out;
  //  The noise is made at a fixed scale (a 0 dB band-pass, NZ: each fricative's own strength, an s the strongest) and
  //  is then set against the line's own voiced level (o.nzDb under it: VOICE-SOFT's consonants stay well under natural
  //  speech's, whose s sits about 15 dB under the vowels)
  // ---- control tracks, one value per millisecond: targets now, smoothed below
  const M = Math.ceil(N / sr * 1000) + 2;
  const tF = [new Float32Array(M), new Float32Array(M), new Float32Array(M)], tAV = new Float32Array(M), tAF = new Float32Array(M), tNZ = new Float32Array(M), tAH = new Float32Array(M);
  const tFn = new Float32Array(M), tNas = new Float32Array(M), tST = new Float32Array(M).fill(NaN), tB = new Float32Array(M);
  const k = v.k, vs = v.vowel || [1, 1];
  const vowelF = (vk) => { const F = VOWELS[vk] || VOWELS.a; return [F[0] * k * vs[0], F[1] * k * vs[1], F[2] * k]; };
  const ms = (t) => Math.max(0, Math.min(M - 1, Math.round((t + lead) * 1000)));
  const fill = (a, b, fn) => { for (let i = ms(a); i < ms(b); i++) fn(i); };
  const bursts = [];
  // between syllables nothing is voiced unless a segment says so
  let prevF = vowelF(syl[0]?.vk || 'a');
  for (let i = 0; i < M; i++) { tF[0][i] = prevF[0]; tF[1][i] = prevF[1]; tF[2][i] = prevF[2]; }
  for (let s = 0; s < syl.length; s++) {
    const S = syl[s], vF = vowelF(S.vk), vF2 = S.vk2 ? vowelF(S.vk2) : null;
    const t0 = S.t, tv = S.t + S.cd, te = tv + S.vd;
    const dip = Math.min(1.25, 0.35 + 0.8 * (g.leg ?? 0.8));   // (a legato voice keeps more of its voicing through a consonant)
    // (P18-VOICES, Words: inside a phrase a voiceless consonant keeps a low murmur of the voice, o.lenis, as quick
    //  connected speech does; a silent closure was the deepest dip in a line. Not at a phrase's edges.)
    const pv = syl[s - 1], pEnd = pv ? pv.t + pv.cd + pv.vd + (pv.co ? pv.cod || 0 : pv.coda ? 0.05 : 0) : -1;
    const nxs = syl[s + 1], sEnd = te + (S.co ? S.cod || 0 : 0);
    const inBefore = W && s > 0 && S.t - pEnd < 0.02, inAfter = W && !!nxs && nxs.t - sEnd < 0.02;
    const len = W ? (o.lenis ?? 0.15) * dip * S.amp : 0;
    // a consonant from a to b (coda: after the vowel, its voice leaning on the vowel's)
    const cons = (key, a, b, coda) => {
      const C = CONS[key]; if (!C) return;
      const mur = (coda ? inAfter : inBefore) ? len : 0;
      const cF = C.F ? [C.F[0] * Math.sqrt(k), C.F[1] * k, C.F[2] * k] : (coda && vF2 ? vF2 : vF);
      const st = coda ? S.b : S.a, cl = coda ? 1.3 : 1;
      const mid = C.k === 'affr' ? a + (b - a) * 0.45 : b;
      fill(a, b, (i) => {
        tF[0][i] = cF[0]; tF[1][i] = cF[1]; tF[2][i] = cF[2];
        tST[i] = st;
        if (C.k === 'nasal') { tAV[i] = 0.22 * dip * S.amp * (coda ? 1.8 : 1); tNas[i] = 1; }
        else if (C.k === 'liquid' || C.k === 'glide') tAV[i] = (C.k === 'glide' ? 0.34 : 0.28) * dip * S.amp * cl;
        else if (C.k === 'fric') { tAV[i] = C.vo ? 0.15 * dip * S.amp * cl : mur; tAF[i] = W ? (NZ[key] ?? 0.5) * S.amp : (C.vo ? 0.5 : 0.9) * S.amp * (C.weak ? 0.45 : 1); tFn[i] = C.nz * Math.sqrt(k); }
        else if (C.k === 'asp') { tAV[i] = 0; tAH[i] = 0.9 * S.amp; }
        else if (C.k === 'stop') tAV[i] = C.vo ? Math.max(0.06 * S.amp, mur) : mur;
        else if (C.k === 'affr') {
          const fr = i >= ms(mid);
          tAV[i] = C.vo ? (fr ? 0.12 : 0.06) * dip * S.amp : mur;
          if (fr) { tAF[i] = W ? (NZ[key] ?? 0.5) * S.amp : (C.vo ? 0.5 : 0.85) * S.amp; tFn[i] = C.nz * Math.sqrt(k); }
        }
      });
      if (C.k === 'stop') bursts.push({ t: b - 0.004, f: C.nz * Math.sqrt(k), amp: S.amp * (C.vo ? 0.35 : 0.55) * (coda ? 0.5 : 1), asp: C.vo ? 0 : coda ? 0.01 : 0.018 });
      if (C.k === 'affr') bursts.push({ t: mid - 0.004, f: C.nz * Math.sqrt(k), amp: S.amp * (C.vo ? 0.3 : 0.45), asp: 0 });
    };
    // the onset (one consonant in a classic plan, a cluster in a Words plan)
    if (S.on) { let a = t0; for (const [key, d] of S.on) { cons(key, a, a + d, false); a += d; } }
    else if (S.c && CONS[S.c]) {
      const C = CONS[S.c];
      const cF = C.F ? [C.F[0] * Math.sqrt(k), C.F[1] * k, C.F[2] * k] : vF;
      fill(t0, tv, (i) => {
        tF[0][i] = cF[0]; tF[1][i] = cF[1]; tF[2][i] = cF[2];
        tST[i] = S.a;
        if (C.k === 'nasal') { tAV[i] = 0.22 * dip * S.amp; tNas[i] = 1; }
        else if (C.k === 'liquid' || C.k === 'glide') tAV[i] = (C.k === 'glide' ? 0.34 : 0.28) * dip * S.amp;
        else if (C.k === 'fric') { tAV[i] = C.vo ? 0.15 * dip * S.amp : 0; tAF[i] = (C.vo ? 0.5 : 0.9) * S.amp; tFn[i] = C.nz * Math.sqrt(k); }
        else if (C.k === 'asp') { tAV[i] = 0; tAH[i] = 0.9 * S.amp; }
        else if (C.k === 'stop') tAV[i] = C.vo ? 0.06 * S.amp : 0;
      });
      if (C.k === 'stop') bursts.push({ t: tv - 0.004, f: C.nz * Math.sqrt(k), amp: S.amp * (C.vo ? 0.35 : 0.55), asp: C.vo ? 0 : 0.018 });
      // (a voiceless consonant's voicing stops: the pitch track keeps its line through it)
    }
    if (!(S.on ? S.on.length : S.c) && s > 0) fill(t0 - 0.015, t0 + 0.018, (i) => { tAV[i] = 0.3 * dip * S.amp; });   // (a vowel after a vowel: a light break)
    // the vowel (gliding to its second one, a diphthong), and a nasal coda
    fill(tv, te, (i) => {
      const u = (i - ms(tv)) / Math.max(1, ms(te) - ms(tv));
      if (vF2) { const q = Math.max(0, Math.min(1, (u - 0.3) / 0.6)), e2 = q * q * (3 - 2 * q); for (let j = 0; j < 3; j++) tF[j][i] = vF[j] + (vF2[j] - vF[j]) * e2; }
      else { tF[0][i] = vF[0]; tF[1][i] = vF[1]; tF[2][i] = vF[2]; }
      tAV[i] = S.amp * (1 - 0.12 * u);
      // the pitch glides from a to b over the vowel (eased)
      const e = u * u * (3 - 2 * u);
      tST[i] = S.a + (S.b - S.a) * e;
      if (S.hum) { tNas[i] = 1; }
    });
    const codaEnd = te + (S.co ? S.cod || 0 : S.coda ? 0.05 : 0);
    if (S.co) { let a = te; for (const [key, d] of S.co) { cons(key, a, a + d, true); a += d; } }
    else if (S.coda) {
      const cF = CONS[S.coda].F;
      fill(te, te + 0.05, (i) => { tF[0][i] = cF[0]; tF[1][i] = cF[1] * k; tF[2][i] = cF[2] * k; tAV[i] = 0.45 * S.amp; tNas[i] = 1; tST[i] = S.b; });
    }
    // a voiced join to the next syllable inside a word keeps the voice going; a word end lets it dip a little
    const nx = syl[s + 1];
    if (nx && nx.t > codaEnd + 0.0005) {
      // a gap (a pause in the line, a hesitation): the pitch holds, the voice stops
      fill(codaEnd, nx.t, (i) => { tST[i] = S.b; });
    }
    if (S.last || !nx) tB[ms(te)] = 1; // a phrase end: a soft release
  }
  // the pitch is held through the gaps (first value before, last after)
  let lastSt = syl[0]?.a ?? 0;
  for (let i = 0; i < M; i++) { if (Number.isNaN(tST[i])) tST[i] = lastSt; else lastSt = tST[i]; }

  // ---- smoothing the tracks (ms steps): formants 16 ms, the voice's loudness 7 ms (soft edges at the phrase's
  //      start and end), pitch 30 ms (a glide), noise 5 ms
  const smooth = (a, tauMs) => { const al = 1 - Math.exp(-1 / tauMs); let y = a[0]; for (let i = 0; i < a.length; i++) { y += (a[i] - y) * al; a[i] = y; } };
  for (const f of tF) smooth(f, 16);
  smooth(tST, (v.glide || 0.04) * 1000 / 2.2);
  smooth(tNas, 10); smooth(tAF, 5); smooth(tAH, 6); smooth(tFn, 3);
  { // loudness: rises softly at a phrase's start (atk), falls slowly at its end (rel), follows consonants quickly
    const atk = Math.max(0.012, v.atk || 0.03) * 1000 / 2.5, rel = Math.max(0.04, (v.rel || 0.05) * 1.3) * 1000 / 2.5;
    let y = 0;
    // (Words: the voice eases into a consonant rather than dropping: a 50 ms fall, with the murmur above, kept the
    //  median join at -7 dB (13 ms and no murmur: -14 dB, half the joins deeper than 15 dB; the phrases: -1 to -9 dB))
    const fall = W ? (o.fall ?? 50) : 7;
    for (let i = 0; i < M; i++) { const x = tAV[i]; const tau = x > y ? (y < 0.05 ? atk : 7) : (x < 0.02 ? rel : fall); y += (x - y) * (1 - Math.exp(-1 / tau)); tAV[i] = y; }
  }

  // ---- the voice values
  const f0 = v.f0, vib = v.vib || [5, 10], breath = Math.min(0.35, (v.breath || 0.07) * (g.breath || 1));
  const bw = 1.75 * (v.bwScale || 1);                          // (VOICE-STYLE soft: wide formants, round rather than whistly)
  const B = [70 * bw, 95 * bw, 150 * bw, 250 * bw, 320 * bw];
  const F4 = 3300 * k, F5 = 3900 * k;
  const nasal = v.nasal || 0;
  const tiltHz = Math.max(250, 2600 * Math.pow(2, -(v.tilt - 1.5) * 1.7)); // the return-phase low-pass: higher tilt, softer
  const brightHz = Math.min(sr * 0.45, v.bright || 3000);
  // ---- the source and filters
  const R1 = res(), R2 = res(), R3 = res(), R4 = res(), R5 = res(), RNP = res(), Z = { a: 1, b: 0, c: 0, x1: 0, x2: 0 }, RF = res();
  setRes(R4, F4, B[3], T); setRes(R5, F5, B[4], T); setRes(RNP, 270, 100, T);
  const LP1 = res(), LP2 = res(); setRes(LP1, brightHz, brightHz * 0.9, T); setRes(LP2, brightHz * 1.25, brightHz * 1.3, T);
  let ph = 0, tiltY = 0, prevU = 0, dc = 0, dcy = 0;
  let wander = 0, wv = 0, nseed = (o.seed || 1) >>> 0;
  const noise = () => { nseed = (Math.imul(nseed, 1664525) + 1013904223) >>> 0; return nseed / 2147483648 - 1; };
  const tiltA = 1 - Math.exp(-2 * Math.PI * tiltHz * T);
  let shimmer = 1;
  const BPF = { b0: 0, b2: 0, a1: 0, a2: 0, x1: 0, x2: 0, y1: 0, y2: 0 };
  const OQ = 0.62 + breath * 0.4;                               // open quotient: breathier voices open longer
  const tp = OQ * 0.72;
  // (P18-VOICES: the game renders a line when it starts, so this loop is kept lean: the controls are read once per
  //  block of 16 samples and stepped linearly inside it, the pitch and vibrato once per block, the glottal pulse from a
  //  table: 2.4-3x quicker than reading every control at every sample. Measured against that version on the same
  //  classic lines: the same RMS, spectral centroid and pitch within 1 Hz, joins within 1.2 dB; not the same samples,
  //  the breath, shimmer and pitch wander draw their random numbers in another order)
  const TB = 2048, PT = new Float32Array(TB + 2);
  for (let i = 0; i <= TB + 1; i++) { const p = Math.min(1, i / TB); PT[i] = p < tp ? 0.5 * (1 - Math.cos((Math.PI * p) / tp)) : p < OQ ? Math.cos((0.5 * Math.PI * (p - tp)) / (OQ - tp)) : 0; }
  const CL = 0.11 * (o.cons ?? v.consLvl ?? 0.35), BRE = breath * 0.55;
  let vibAmt = 0, vibPh = 0;
  const BL = 16;
  for (let n0 = 0; n0 < N; n0 += BL) {
    const at = (n) => { const tm = n * T * 1000, mi = Math.min(M - 1, Math.floor(tm)), mj = Math.min(M - 1, mi + 1), fr = tm - mi; return [mi, mj, fr]; };
    const [mi, mj, fr] = at(n0), [ni, nj, nf] = at(Math.min(N - 1, n0 + BL));
    const L = (a) => a[mi] + (a[mj] - a[mi]) * fr, Ln = (a) => a[ni] + (a[nj] - a[ni]) * nf;
    if ((n0 & 31) === 0) {
      const nas = L(tNas);
      setRes(R1, L(tF[0]), B[0] * (1 + nas * 0.8), T);
      setRes(R2, L(tF[1]), B[1] * (1 + nas * 0.6), T);
      setRes(R3, L(tF[2]), B[2], T);
      setAnti(Z, 270 + nas * 250 + (1 - nas) * nasal * 120, 110, T);   // (the zero cancels the nasal pole in an oral vowel)
      const fn = L(tFn) || 3000;
      if (W) setBP(BPF, Math.min(sr * 0.42, fn), 1.4, sr); else setRes(RF, Math.min(sr * 0.42, fn), fn * 0.6, T);
    }
    // the pitch: the planned line, a slow wander (about 0.3 %), vibrato blooming on held voicing
    let av = L(tAV), ah = L(tAH), af = L(tAF);
    const dav = (Ln(tAV) - av) / BL, dah = (Ln(tAH) - ah) / BL, daf = (Ln(tAF) - af) / BL;
    wv += (noise() * 0.5 - wv) * 0.0006 * BL; wander += (wv - wander) * 0.002 * BL;
    vibAmt += ((av > 0.3 ? 1 : 0.25) - vibAmt) * 0.0004 * BL;
    vibPh += vib[0] * T * BL;
    const cents = Math.sin(2 * Math.PI * vibPh) * vib[1] * vibAmt + wander * 25;
    const f = f0 * Math.pow(2, L(tST) / 12 + cents / 1200), inc = f * T, k2 = sr / f;
    const end = Math.min(N, n0 + BL);
    for (let n = n0; n < end; n++, av += dav, ah += dah, af += daf) {
      ph += inc;
      if (ph >= 1) { ph -= 1; shimmer = 1 + noise() * 0.04; }
      // the glottal pulse (Rosenberg): opening, closing, closed; its derivative excites the tract
      const q = ph * TB, qi = q | 0, u = PT[qi] + (PT[qi + 1] - PT[qi]) * (q - qi);
      let src = (u - prevU) * k2; prevU = u;              // (per period: the same strength at any pitch)
      tiltY += (src - tiltY) * tiltA; src = tiltY;
      // breath: noise that pulses with the open glottis, plus the h and the aspiration after a voiceless stop
      const asp = noise() * (BRE * (ph < OQ ? 1 : 0.35) * av + ah * 0.5);
      let x = src * av * shimmer * 0.9 + asp;
      // the nasal pole and zero (m, n, a nasal voice's vowels), then the five formants
      x = antiRun(Z, run(RNP, x));
      x = run(R1, x); x = run(R2, x); x = run(R3, x); x = run(R4, x); x = run(R5, x);
      // fricatives (their own band, after the tract), soft
      if (af > 0.001) { if (W) nzOut[n] = runBP(BPF, noise()) * af; else x += run(RF, noise()) * af * CL; }
      else if (W) runBP(BPF, 0);
      out[n] = x;
    }
  }
  // stop bursts: a few ms of noise through a band, then (voiceless) a little aspiration
  for (const b of bursts) {
    // (Words: a softer, rounder release, 14 ms, its band wider: a burst after a silent closure measured as a click)
    const s0 = Math.floor((b.t + lead - (W ? 0.003 : 0)) * sr), len = Math.floor((W ? 0.014 : 0.009) * sr), R = res(); setRes(R, Math.min(sr * 0.42, b.f), b.f * (W ? 1.2 : 0.8), T);
    const BB = { b0: 0, b2: 0, a1: 0, a2: 0, x1: 0, x2: 0, y1: 0, y2: 0 }; if (W) setBP(BB, Math.min(sr * 0.42, b.f), 0.9, sr);
    for (let i = 0; i < len + b.asp * sr && s0 + i < N; i++) {
      const e = i < len ? Math.sin((Math.PI * i) / len) : 0.25 * Math.exp(-(i - len) / (0.006 * sr));
      if (s0 + i >= 0) nzOut[s0 + i] += W ? runBP(BB, noise()) * e * b.amp * 1.6 : run(R, noise()) * e * b.amp * 0.07 * (o.cons ?? v.consLvl ?? 0.35);
    }
  }
  // the output: DC blocked, a gentle low-pass at the voice's brightness ceiling
  for (let n = 0; n < N; n++) {
    let x = out[n];
    dcy = x - dc + 0.995 * dcy; dc = x; x = dcy;
    x = run(LP2, run(LP1, x));
    out[n] = x;
  }
  if (W) {
    // the voiced level: the RMS of the 10 ms frames within 30 dB of the loudest
    const h = Math.round(sr * 0.01); let mx = 0, sum = 0, nf = 0; const fe2 = [];
    for (let s0 = 0; s0 + h <= N; s0 += h) { let e = 0; for (let i = 0; i < h; i++) e += out[s0 + i] * out[s0 + i]; e /= h; fe2.push(e); if (e > mx) mx = e; }
    for (const e of fe2) if (e > mx * 1e-3) { sum += e; nf++; }
    // (a full-strength s through its band: about 0.36 RMS; set nzDb under the voice)
    const gN = (nf ? Math.sqrt(sum / nf) : 0) * Math.pow(10, (o.nzDb ?? -22) / 20) / 0.36;
    const N1 = res(), N2 = res(), fc = Math.min(6500, sr * 0.4); setRes(N1, fc, fc * 0.9, T); setRes(N2, fc * 1.2, fc * 1.3, T);
    let hp = 0, hx = 0;
    for (let n = 0; n < N; n++) { const x = nzOut[n]; hp = x - hx + 0.97 * hp; hx = x; out[n] += run(N2, run(N1, hp)) * gN; }
  }
  // fades at the very ends (no edge in the file)
  const fe = Math.floor(0.004 * sr);
  for (let i = 0; i < fe; i++) { out[i] *= i / fe; out[N - 1 - i] *= i / fe; }
  return out;
}

// P18-VOICES: a Words line as the game plays it: rendered, then brought to `rms` over its voiced part (the RMS of its
// 10 ms frames within 30 dB of the loudest), its rare peaks rounded by a soft knee above 0.5 (never clipped)
export function renderLine(v, g, o, rms) {
  const pcm = renderGesture(v, g, o), sr = o.sr, h = Math.round(sr * 0.01), fr = [];
  let mx = 0;
  for (let s = 0; s + h <= pcm.length; s += h) { let e = 0; for (let i = 0; i < h; i++) e += pcm[s + i] * pcm[s + i]; e /= h; fr.push(e); if (e > mx) mx = e; }
  let sum = 0, nf = 0;
  for (const e of fr) if (e > mx * 1e-3) { sum += e; nf++; }
  const k = nf ? rms / Math.sqrt(sum / nf) : 1;
  for (let i = 0; i < pcm.length; i++) { const x = pcm[i] * k, a = Math.abs(x); pcm[i] = a <= 0.5 ? x : Math.sign(x) * (0.5 + 0.35 * Math.tanh((a - 0.5) / 0.35)); }
  return pcm;
}
// the source of a worker that renders lines off the main thread: this file's own functions and the voice tables
// (a blob, as main.js's thumbnail worker: no separate file to serve or bundle). Message { id, v, g, o, rms } -> { id, pcm, ms }
export function workerSource() {
  return [`const VOWELS = ${JSON.stringify(VOWELS)}, CONS = ${JSON.stringify(CONS)}, NZ = ${JSON.stringify(NZ)};`, res, setRes, `const run = ${run};`, antiRun, setAnti, setBP, runBP, renderGesture, renderLine,
    'onmessage = (e) => { const d = e.data, t0 = performance.now(); const pcm = renderLine(d.v, d.g, d.o, d.rms); postMessage({ id: d.id, pcm, ms: performance.now() - t0 }, [pcm.buffer]); };']
    .map((x) => (typeof x === 'function' ? x.toString() : x)).join('\n');
}
