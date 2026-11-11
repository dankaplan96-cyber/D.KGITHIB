// Null test: the game's music bus (run's music-bus.wav) against the source file decoded the same way (runs/src/*.wav),
// aligned to the sample (and the sub-sample start Chromium uses), passed through the voice's 20 kHz low-pass as Chromium
// computes it, with one gain fitted per 128-frame render quantum. What remains is what the game's graph added: a click,
// a held or dropped block, an unramped gain step shows as a residual spike in its quantum and as a gain jump.
//   node nulltest.mjs <label> <track> <ct0> <ct1> <srcPosAtCt0 guess> [search s]
import fs from 'node:fs';
import { RUNS } from './env.mjs';
const [label, track, a0, a1, g0, srch] = process.argv.slice(2);
const ct0 = +a0, ct1 = +a1, guess = +g0, SEARCH = +(srch || 2);
const readWav = (f) => { const b = fs.readFileSync(f); const s = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) / 2); const n = s.length / 2, L = new Float32Array(n), R = new Float32Array(n); for (let i = 0; i < n; i++) { L[i] = s[2 * i] / 32767; R[i] = s[2 * i + 1] / 32767; } return { L, R, n, sr: b.readUInt32LE(24) }; };
const cap = readWav(`${RUNS}/${label}/music-bus.wav`);
const meta = JSON.parse(fs.readFileSync(`${RUNS}/${label}/music-bus.json`, 'utf8'));
const src = readWav(`${RUNS}/src/${track}.wav`);
const sr = cap.sr;
// Chromium's lowpass (Biquad::SetLowpassParams): cutoff normalised to Nyquist, resonance in dB
function lowpass(x, f = 20000, qdb = 0.5) {
  const c = f / (sr / 2); if (c >= 1) return x;
  const res = Math.pow(10, qdb / 20), th = Math.PI * c, al = Math.sin(th) / (2 * res), cw = Math.cos(th), be = (1 - cw) / 2;
  const a0 = 1 + al, b0 = be / a0, b1 = 2 * be / a0, b2 = be / a0, A1 = -2 * cw / a0, A2 = (1 - al) / a0;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const SL0 = lowpass(src.L), SR0 = lowpass(src.R);
// a looping track (LOOP=loopStartSample,loopEndSample): the source read wraps at loopEnd as the source node does
const [LS, LE] = (process.env.LOOP || '0,0').split(',').map(Number);
const wrap = (A) => (LE ? new Proxy(A, { get: (t, k) => (typeof k === 'string' && /^\d+$/.test(k) ? t[+k >= LE ? +k - (LE - LS) : +k] : t[k]) }) : A);
const SL = wrap(SL0), SR = wrap(SR0);
const ci0 = Math.round(ct0 * sr) - meta.firstFrame, ci1 = Math.round(ct1 * sr) - meta.firstFrame;
// coarse: decimated mono correlation over guess ± SEARCH
const D = 4, M = Math.round(1.5 * sr / D);
const dec = (L, R, i0, n) => { const o = new Float32Array(n); for (let k = 0; k < n; k++) { let s = 0; for (let j = 0; j < D; j++) s += L[i0 + k * D + j] + R[i0 + k * D + j]; o[k] = s; } return o; };
const cm = dec(cap.L, cap.R, ci0, M);
const g = Math.round(guess * sr), lo = Math.max(0, g - SEARCH * sr), hi = Math.min(src.n - (M + 2) * D, g + SEARCH * sr);
const sm = dec(SL, SR, lo, Math.floor((hi - lo) / D) + M + 1);
let best = -2, bl = 0; let ec = 0; for (const v of cm) ec += v * v;
for (let l = 0; l + M < sm.length; l++) { let s = 0, es = 0; for (let k = 0; k < M; k++) { s += cm[k] * sm[l + k]; es += sm[l + k] ** 2; } const r = s / Math.sqrt(ec * es + 1e-20); if (r > best) { best = r; bl = l; } }
let off = lo + bl * D; // source index aligned with capture index ci0
// fine (± 8 samples) and fractional (linear interpolation, as Chromium plays a sub-sample start)
const N1 = sr;
const fit = (o, f) => { let sc = 0, ss = 0, cc = 0; for (let k = 0; k < N1; k++) for (const [C, S] of [[cap.L, SL], [cap.R, SR]]) { const s = S[o + k] * (1 - f) + S[o + k + 1] * f, c = C[ci0 + k]; sc += s * c; ss += s * s; cc += c * c; } const gg = sc / ss; return (cc - gg * sc) / cc; };
let bo = off, bf = 0, be = 1e9;
for (let o = off - 8; o <= off + 8; o++) for (let f = 0; f < 1; f += 0.05) { const e = fit(o, f); if (e < be) { be = e; bo = o; bf = f; } }
for (let f = Math.max(0, bf - 0.05); f <= bf + 0.05; f += 0.005) { const e = fit(bo, f); if (e < be) { be = e; bf = f; } }
off = bo;
// per render quantum (blocks on the context's 128-frame grid)
const Q = 128; let q0 = ci0 + ((Q - ((meta.firstFrame + ci0) % Q)) % Q);
const rows = []; let prevG = null;
for (let i = q0; i + Q <= ci1 && off + (i - ci0) + Q + 1 < src.n * (LE ? 2 : 1); i += Q) {
  let sc = 0, ss = 0, cc = 0;
  for (let k = 0; k < Q; k++) for (const [C, S] of [[cap.L, SL], [cap.R, SR]]) { const j = off + (i - ci0) + k; const s = S[j] * (1 - bf) + S[j + 1] * bf, c = C[i + k]; sc += s * c; ss += s * s; cc += c * c; }
  const gg = ss > 1e-12 ? sc / ss : 0, res = Math.max(0, cc - gg * sc);
  rows.push({ ct: (meta.firstFrame + i) / sr, g: gg, p: cc / (2 * Q), r: cc > 0 ? res / cc : 0, dg: prevG === null ? 0 : gg - prevG });
  prevG = gg;
}
const live = rows.filter((r) => r.p > 1e-6); // above -60 dBFS
const db = (x) => +(10 * Math.log10(x + 1e-20)).toFixed(1);
const sorted = live.map((r) => r.r).sort((a, b) => a - b), pct = (p) => sorted[Math.floor(p * (sorted.length - 1))];
const spikes = live.filter((r) => r.r > 10 ** -2.5); // residual above -25 dB of the signal in one quantum
// a step, not a ramp: the gain's change from one quantum to the next differs from its neighbours' (a ramp has a steady change)
const jumps = live.filter((r, k) => k > 0 && k < live.length - 1 && Math.abs(r.dg - (live[k - 1].dg + live[k + 1].dg) / 2) > 0.006);
console.log(JSON.stringify({ label, track, window: [ct0, ct1], srcPosAtCt0: +(off / sr).toFixed(4), frac: +bf.toFixed(3), coarseCorr: +best.toFixed(4), fitResidualDb: db(be),
  quanta: rows.length, liveQuanta: live.length, residualDb: { median: db(pct(0.5)), p99: db(pct(0.99)), p999: db(pct(0.999)), max: db(sorted.at(-1)) },
  spikesOver25dB: spikes.length, maxGainChangePerQuantum: +Math.max(...live.map((r) => Math.abs(r.dg))).toFixed(4), gainStepsOver0_006: jumps.length, gain: { first: +rows[0]?.g.toFixed(4), last: +rows.at(-1)?.g.toFixed(4) },
  worst: live.slice().sort((a, b) => b.r - a.r).slice(0, 6).map((r) => `ct=${r.ct.toFixed(3)} res=${db(r.r)}dB g=${r.g.toFixed(4)} dg=${r.dg.toFixed(5)} lvl=${db(r.p)}dB`),
  jumpList: jumps.slice(0, 6).map((r) => `ct=${r.ct.toFixed(3)} g=${r.g.toFixed(4)} dg=${r.dg.toFixed(5)}`) }, null, 1));
