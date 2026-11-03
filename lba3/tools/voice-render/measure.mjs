// Measurements of rendered voice audio (Node): loudness, peaks, spectral balance, syllable rhythm, the depth of the
// dips between syllables, pauses, pitch jumps, sample-level discontinuities. Numbers only: none of them says how a
// voice sounds to a listener.
import { analyse } from '../../tests/lib/voicelab.js';
export { analyse };

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200);
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// a 5 ms RMS envelope, lightly smoothed
export function envelope(data, sr, ms = 5) {
  const h = Math.round((sr * ms) / 1000), env = [];
  for (let s = 0; s + h <= data.length; s += h) { let e = 0; for (let i = 0; i < h; i++) e += data[s + i] * data[s + i]; env.push(Math.sqrt(e / h)); }
  return env.map((_, i) => (env[i - 1] ?? env[i]) * 0.25 + env[i] * 0.5 + (env[i + 1] ?? env[i]) * 0.25);
}

// rhythm and continuity: the syllable peaks (local maxima of the envelope within 25 dB of the loudest, 60 ms apart),
// the dip between each two neighbours that are not separated by a pause, the pauses (runs 35 dB under the loudest,
// 60 ms or longer) and how even the syllable spacing is (coefficient of variation of the peak-to-peak intervals)
export function rhythm(data, sr) {
  const env = envelope(data, sr), step = 0.005;
  const mx = Math.max(1e-9, ...env), floor = mx * Math.pow(10, -25 / 20), quiet = mx * Math.pow(10, -35 / 20);
  const peaks = [];
  const W = 6; // ±30 ms
  for (let i = W; i < env.length - W; i++) {
    if (env[i] < floor) continue;
    let ok = true; for (let k = i - W; k <= i + W; k++) if (env[k] > env[i]) { ok = false; break; }
    if (ok && (!peaks.length || i - peaks[peaks.length - 1] >= 12)) peaks.push(i);
  }
  const pauses = [];
  let run = 0, started = false;
  for (let i = 0; i < env.length; i++) {
    if (env[i] > quiet) { if (started && run * step >= 0.06) pauses.push(+(run * step).toFixed(3)); run = 0; started = true; }
    else if (started) run++;
  }
  const dips = [], iois = [];
  for (let j = 1; j < peaks.length; j++) {
    const a = peaks[j - 1], b = peaks[j];
    let m = Infinity; for (let k = a; k <= b; k++) m = Math.min(m, env[k]);
    if (m < quiet) continue; // (a pause, not a join)
    dips.push(db(m) - db(Math.min(env[a], env[b])));
    iois.push((b - a) * step);
  }
  const mean = iois.reduce((s, x) => s + x, 0) / Math.max(1, iois.length);
  const sd = Math.sqrt(iois.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, iois.length));
  // the syllabic modulation: how far the envelope moves while someone speaks (frames within 35 dB of the loudest,
  // pauses left out): the spread between its 85th and 15th percentiles, in dB
  const act = env.filter((x) => x > quiet).map(db).sort((x, y) => x - y);
  const modDb = act.length ? act[Math.floor(act.length * 0.85)] - act[Math.floor(act.length * 0.15)] : 0;
  return {
    modDb: +modDb.toFixed(1), peaks: peaks.length, joins: dips.length, dipMedianDb: +median(dips).toFixed(1),
    deepJoins: +(dips.filter((x) => x < -15).length / Math.max(1, dips.length)).toFixed(2),  // share of joins that drop > 15 dB (a chopped transition)
    ioiMs: Math.round(mean * 1000), ioiCv: +(sd / Math.max(1e-9, mean)).toFixed(2), pauses: pauses.length, pauseMedianMs: Math.round(median(pauses) * 1000),
  };
}

// spectral balance: the share of the energy above 3 kHz and above 5 kHz (harshness), the centroid
export function spectrum(data, sr) {
  const N = 2048; const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  let e3 = 0, e5 = 0, et = 0, cn = 0;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = 0; s + N <= data.length; s += N) {
    let fe = 0; for (let i = 0; i < N; i++) fe += data[s + i] * data[s + i];
    if (fe / N < 1e-7) continue;
    for (let i = 0; i < N; i++) { re[i] = data[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const p = re[k] * re[k] + im[k] * im[k], f = (k * sr) / N;
      et += p; cn += p * f; if (f > 3000) e3 += p; if (f > 5000) e5 += p;
    }
  }
  return { above3k: +(e3 / Math.max(1e-12, et)).toFixed(3), above5k: +(e5 / Math.max(1e-12, et)).toFixed(4), centroidHz: Math.round(cn / Math.max(1e-12, et)) };
}

// pitch jumps: frame-to-frame (32 ms hop) median-pitch changes over 2 semitones while voiced, per second of voicing
export function pitchJumps(data, sr) {
  const hop = Math.round(sr * 0.016), W = Math.round(sr * 0.032), lmin = Math.floor(sr / 700), lmax = Math.ceil(sr / 70);
  const f = [];
  const dd = new Float32Array(lmax + 2);
  for (let s = 0; s + W + lmax + 1 < data.length; s += hop) {
    let e = 0; for (let i = 0; i < W; i++) e += data[s + i] * data[s + i];
    if (e / W < 1e-6) { f.push(0); continue; }
    let run = 0; dd[0] = 1;
    for (let L = 1; L <= lmax + 1; L++) { let d = 0; for (let i = 0; i < W; i += 2) { const x = data[s + i] - data[s + i + L]; d += x * x; } run += d; dd[L] = run > 0 ? (d * L) / run : 1; }
    let bl = 0; for (let L = lmin; L <= lmax; L++) if (dd[L] < 0.2) { while (L + 1 <= lmax && dd[L + 1] < dd[L]) L++; bl = L; break; }
    f.push(bl ? sr / bl : 0);
  }
  let jumps = 0, voiced = 0; const steps = [];
  for (let i = 1; i < f.length; i++) if (f[i] && f[i - 1]) { voiced++; const st = Math.abs(12 * Math.log2(f[i] / f[i - 1])); if (st > 2 && st < 9) jumps++; }
  // the melodic step: the pitch change over about one syllable (96 ms), both ends voiced
  for (let i = 6; i < f.length; i++) if (f[i] && f[i - 6]) steps.push(Math.abs(12 * Math.log2(f[i] / f[i - 6])));
  const secs = (voiced * hop) / sr;
  return { voicedSec: +secs.toFixed(2), jumpsPerSec: +(jumps / Math.max(0.1, secs)).toFixed(2), stepSt: +median(steps).toFixed(2) };
}

// the whole set for one rendered voice track
export function measure(data, sr) {
  const a = analyse(data, sr);
  return { peakDb: a.peakDb, rmsDb: a.rmsDb, f0: a.f0, rangeSt: a.rangeSt, clickCrest: a.clickCrest, maxJump: a.maxJump, ...spectrum(data, sr), ...rhythm(data, sr), ...pitchJumps(data, sr) };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// the slice of a track between two times
export const slice = (data, sr, a, b) => data.subarray(Math.floor(a * sr), Math.min(data.length, Math.floor(b * sr)));
