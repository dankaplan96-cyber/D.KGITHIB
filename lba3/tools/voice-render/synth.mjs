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
import { VOWELS, CONS } from '../../src/engine/voiceplan.js';

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

// render a gesture (or a planned line: { syl }) for voice v. Returns Float32Array at sr.
// o: { sr, seed, tail (s of silence after), lead (s before) }
export function renderGesture(v, g, o = {}) {
  const sr = o.sr || 32000, T = 1 / sr, lead = o.lead ?? 0.03, tail = o.tail ?? 0.18;
  const syl = g.syl;
  const end = syl.length ? syl[syl.length - 1].t + syl[syl.length - 1].cd + syl[syl.length - 1].vd + (syl[syl.length - 1].coda ? 0.05 : 0) : 0;
  const N = Math.ceil((lead + end + tail) * sr);
  const out = new Float32Array(N);
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
    const S = syl[s], C = S.c ? CONS[S.c] : null, vF = vowelF(S.vk);
    const t0 = S.t, tv = S.t + S.cd, te = tv + S.vd;
    const dip = Math.min(1.25, 0.35 + 0.8 * (g.leg ?? 0.8));   // (a legato voice keeps more of its voicing through a consonant)
    // the consonant
    if (C) {
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
    else if (s > 0) fill(t0 - 0.015, t0 + 0.018, (i) => { tAV[i] = 0.3 * dip * S.amp; });   // (a vowel after a vowel: a light break)
    // the vowel (and a nasal coda)
    fill(tv, te, (i) => {
      const u = (i - ms(tv)) / Math.max(1, ms(te) - ms(tv));
      tF[0][i] = vF[0]; tF[1][i] = vF[1]; tF[2][i] = vF[2];
      tAV[i] = S.amp * (1 - 0.12 * u);
      // the pitch glides from a to b over the vowel (eased)
      const e = u * u * (3 - 2 * u);
      tST[i] = S.a + (S.b - S.a) * e;
      if (S.hum) { tNas[i] = 1; }
    });
    if (S.coda) {
      const cF = CONS[S.coda].F;
      fill(te, te + 0.05, (i) => { tF[0][i] = cF[0]; tF[1][i] = cF[1] * k; tF[2][i] = cF[2] * k; tAV[i] = 0.45 * S.amp; tNas[i] = 1; tST[i] = S.b; });
    }
    // a voiced join to the next syllable inside a word keeps the voice going; a word end lets it dip a little
    const nx = syl[s + 1];
    if (nx && nx.t > te + (S.coda ? 0.05 : 0) + 0.0005) {
      // a gap (a pause in the line, a hesitation): the pitch holds, the voice stops
      fill(te + (S.coda ? 0.05 : 0), nx.t, (i) => { tST[i] = S.b; });
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
    for (let i = 0; i < M; i++) { const x = tAV[i]; const tau = x > y ? (y < 0.05 ? atk : 7) : (x < 0.02 ? rel : 7); y += (x - y) * (1 - Math.exp(-1 / tau)); tAV[i] = y; }
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
  let shimmer = 1, lastPh = 0;
  const OQ = 0.62 + breath * 0.4;                               // open quotient: breathier voices open longer
  let nzF = 270, vibAmt = 0, vibPh = 0;
  for (let n = 0; n < N; n++) {
    const mi = Math.min(M - 1, Math.floor(n * T * 1000)), fr = n * T * 1000 - mi, mj = Math.min(M - 1, mi + 1);
    const lerp = (a) => a[mi] + (a[mj] - a[mi]) * fr;
    if ((n & 31) === 0) {
      setRes(R1, lerp(tF[0]), B[0] * (1 + lerp(tNas) * 0.8), T);
      setRes(R2, lerp(tF[1]), B[1] * (1 + lerp(tNas) * 0.6), T);
      setRes(R3, lerp(tF[2]), B[2], T);
      nzF = 270 + lerp(tNas) * 250 + (1 - lerp(tNas)) * nasal * 120;   // (the zero cancels the nasal pole in an oral vowel)
      setAnti(Z, nzF, 110, T);
      const fn = lerp(tFn) || 3000; setRes(RF, Math.min(sr * 0.42, fn), fn * 0.6, T);
    }
    // the pitch: the planned line, a slow wander (about 0.3 %), vibrato blooming on held voicing
    wv += (noise() * 0.5 - wv) * 0.0006; wander += (wv - wander) * 0.002;
    const av = lerp(tAV);
    vibAmt += ((av > 0.3 ? 1 : 0.25) - vibAmt) * 0.0004;
    vibPh += vib[0] * T;
    const cents = Math.sin(2 * Math.PI * vibPh) * vib[1] * vibAmt + wander * 25;
    const f = f0 * Math.pow(2, lerp(tST) / 12 + cents / 1200);
    ph += f * T;
    if (ph >= 1) { ph -= 1; shimmer = 1 + noise() * 0.04; }
    // the glottal pulse (Rosenberg): opening, closing, closed; its derivative excites the tract
    const p = ph;
    let u;
    const tp = OQ * 0.72;
    if (p < tp) u = 0.5 * (1 - Math.cos((Math.PI * p) / tp));
    else if (p < OQ) u = Math.cos((0.5 * Math.PI * (p - tp)) / (OQ - tp));
    else u = 0;
    let src = (u - prevU) * sr / f; prevU = u;              // (per period: the same strength at any pitch)
    tiltY += (src - tiltY) * tiltA; src = tiltY;
    // breath: noise that pulses with the open glottis, plus the h and the aspiration after a voiceless stop
    const open = p < OQ ? 1 : 0.35;
    const asp = noise() * (breath * 0.55 * open * av + lerp(tAH) * 0.5);
    let x = src * av * shimmer * 0.9 + asp;
    // the nasal pole and zero (m, n, a nasal voice's vowels), then the five formants
    x = antiRun(Z, run(RNP, x));
    x = run(R1, x); x = run(R2, x); x = run(R3, x); x = run(R4, x); x = run(R5, x);
    // fricatives (their own band, after the tract), soft
    const af = lerp(tAF);
    if (af > 0.001) x += run(RF, noise()) * af * 0.11 * (v.consLvl ?? 0.35);
    out[n] = x;
  }
  // stop bursts: a few ms of noise through a band, then (voiceless) a little aspiration
  for (const b of bursts) {
    const s0 = Math.floor((b.t + lead) * sr), len = Math.floor(0.009 * sr), R = res(); setRes(R, Math.min(sr * 0.42, b.f), b.f * 0.8, T);
    for (let i = 0; i < len + b.asp * sr && s0 + i < N; i++) {
      const e = i < len ? Math.sin((Math.PI * i) / len) : 0.25 * Math.exp(-(i - len) / (0.006 * sr));
      if (s0 + i >= 0) out[s0 + i] += run(R, noise()) * e * b.amp * 0.07 * (v.consLvl ?? 0.35);
    }
  }
  // the output: DC blocked, a gentle low-pass at the voice's brightness ceiling
  for (let n = 0; n < N; n++) {
    let x = out[n];
    dcy = x - dc + 0.995 * dcy; dc = x; x = dcy;
    x = run(LP2, run(LP1, x));
    out[n] = x;
  }
  // fades at the very ends (no edge in the file)
  const fe = Math.floor(0.004 * sr);
  for (let i = 0; i < fe; i++) { out[i] *= i / fe; out[N - 1 - i] *= i / fe; }
  return out;
}
