// Reads a run (result.json [+ music-bus.wav]) and prints: underruns over time and their correlation with long frames;
// the tap's discontinuities per phase of the session (per minute); offline detection on the recorded music bus.
//   node analyze.mjs <label> [K] [floor]
import fs from 'node:fs';
import { RUNS } from './env.mjs';
const label = process.argv[2];
const K = +(process.argv[3] || 12), FLOOR = +(process.argv[4] || 0.004);
const R = JSON.parse(fs.readFileSync(`${RUNS}/${label}/result.json`, 'utf8'));
const sr = R.sr;
const marks = R.marks; // [name, ct, pt, mood, room]
const phaseOf = (ct) => { let p = 'pre'; for (const m of marks) if (ct >= m[1]) p = m[0]; return p; };
const phaseDur = {}; for (let i = 0; i < marks.length - 1; i++) phaseDur[marks[i][0]] = marks[i + 1][1] - marks[i][1];
const total = marks.at(-1)[1] - marks[0][1];
const out = { label, tap: R.tapMode, sr, baseLatencyMs: +(R.base * 1000).toFixed(1), sessionS: +total.toFixed(1) };

// ---- underruns (playoutStats fallback frames) per phase, and long frames near them
const S = R.stats; // [pt, ct, events, ms, total]
const under = [];
for (let i = 1; i < S.length; i++) if (S[i][2] > S[i - 1][2]) under.push({ pt: S[i][0], ct: S[i][1], n: S[i][2] - S[i - 1][2], ms: +(S[i][3] - S[i - 1][3]).toFixed(2), prevPt: S[i - 1][0] });
const inSession = under.filter((u) => u.ct >= marks[0][1] && u.ct <= marks.at(-1)[1]);
const longs = R.long; // [pt, dur, ct]
const near = inSession.filter((u) => longs.some(([pt, d]) => pt - d <= u.pt + 50 && pt >= u.prevPt - 50));
out.underruns = { events: inSession.reduce((a, u) => a + u.n, 0), ms: +inSession.reduce((a, u) => a + u.ms, 0).toFixed(1), perMin: +(inSession.reduce((a, u) => a + u.n, 0) / (total / 60)).toFixed(2),
  withLongFrameInWindow: near.length, intervals: inSession.length, byPhase: {} };
for (const u of inSession) { const p = phaseOf(u.ct); out.underruns.byPhase[p] = (out.underruns.byPhase[p] || 0) + u.n; }
out.underruns.list = inSession.slice(0, 40).map((u) => `${phaseOf(u.ct)} ct=${u.ct.toFixed(2)} n=${u.n} ${u.ms}ms longFrame=${longs.filter(([pt, d]) => pt - d <= u.pt + 50 && pt >= u.prevPt - 50).map((l) => l[1]).join(',') || '-'}`);
const fr = R.frames.slice().sort((a, b) => a - b), q = (p) => fr[Math.floor(p * (fr.length - 1))];
out.frames = { n: fr.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: fr.at(-1), over50: longs.length, over100: longs.filter((l) => l[1] > 100).length };

// ---- tap events (realtime detector) per phase
function perPhase(evs, toCt) {
  const by = {};
  for (const e of evs) { const ct = toCt(e); if (ct < marks[0][1] || ct > marks.at(-1)[1]) continue; const p = phaseOf(ct); (by[p] = by[p] || []).push(e); }
  const rows = {}; let n = 0;
  for (const m of marks.slice(0, -1)) { const k = m[0], c = (by[k] || []).length; n += c; rows[k] = `${c} (${(c / (phaseDur[k] / 60)).toFixed(1)}/min)`; }
  return { total: n, perMin: +(n / (total / 60)).toFixed(2), rows, by };
}
if (R.tapMode && R.tap.loop) { const tl = perPhase(R.tap.loop.ev, (e) => e[0] / sr); out.tapLoop = { total: tl.total, perMin: tl.perMin, phases: tl.rows, peak: R.tap.loop.peak }; }
if (R.tapMode) {
  const tm = perPhase(R.tap.music.ev, (e) => e[0] / sr), to = perPhase(R.tap.out.ev, (e) => e[0] / sr);
  out.tapMusic = { total: tm.total, perMin: tm.perMin, phases: tm.rows, peak: R.tap.music.peak, over: R.tap.music.over };
  out.tapOut = { total: to.total, perMin: to.perMin, phases: to.rows, peak: R.tap.out.peak, over: R.tap.out.over };
  out.tapMusicSample = Object.fromEntries(Object.entries(tm.by).map(([k, v]) => [k, v.slice(0, 6).map((e) => `t=${(e[0] / sr).toFixed(3)} ch${e[1]} r=${e[2]} s=${e[3]} x=${e[4]}`)]));
}

// ---- offline detection on each recording (centered window, both sides of the sample excluded); dropouts: runs of
// >= 16 exact-zero frames inside sounding audio (what a late buffer leaves when the output fills silence)
for (const [name, file] of [['offlineMusic', 'music-bus'], ['offlineOut', 'out'], ['offlineLoop', 'loop']]) {
  const wav = `${RUNS}/${label}/${file}.wav`;
  if (!fs.existsSync(wav)) continue;
  const meta = JSON.parse(fs.readFileSync(`${RUNS}/${label}/${file}.json`, 'utf8'));
  const b = fs.readFileSync(wav); const pcm = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) / 2);
  const N = pcm.length / 2, W = 512;
  const evs = [];
  for (let c = 0; c < 2; c++) {
    const r = new Float32Array(N);
    for (let i = 2; i < N; i++) r[i] = (pcm[2 * i + c] - 2 * pcm[2 * (i - 1) + c] + pcm[2 * (i - 2) + c]) / 32767;
    const cs = new Float64Array(N + 1); for (let i = 0; i < N; i++) cs[i + 1] = cs[i] + r[i] * r[i];
    let last = -1e9;
    for (let i = W; i < N - W; i++) {
      const a = Math.abs(r[i]); if (a < FLOOR) continue;
      const e = (cs[i + W] - cs[i - W] - (cs[i + 4] - cs[i - 3])) / (2 * W - 7);
      if (a > K * Math.sqrt(e) && i - last > 64) { last = i; evs.push([meta.firstFrame + i, c, +r[i].toFixed(4), +Math.sqrt(e).toFixed(5)]); }
    }
  }
  evs.sort((x, y) => x[0] - y[0]);
  const drops = [];
  for (let i = 256, run = 0; i < N - 256; i++) {
    if (pcm[2 * i] === 0 && pcm[2 * i + 1] === 0) { run++; continue; }
    if (run >= 16) { let pre = 0, post = 0; for (let k = 1; k <= 256; k++) { pre = Math.max(pre, Math.abs(pcm[2 * (i - run - k)])); post = Math.max(post, Math.abs(pcm[2 * (i + k - 1)])); } if (pre > 33 && post > 33) drops.push([meta.firstFrame + i - run, run]); }
    run = 0;
  }
  // the loopback runs on the device clock: its frames are placed on the context's time by its first frame (approximate)
  const off = perPhase(evs, (e) => e[0] / sr);
  const dp = perPhase(drops, (d) => d[0] / sr);
  out[name] = { K, floor: FLOOR, total: off.total, perMin: off.perMin, phases: off.rows, dropouts: dp.total, dropoutPhases: dp.rows, sample: Object.fromEntries(Object.entries(off.by).map(([k, v]) => [k, v.slice(0, 5).map((e) => `t=${(e[0] / sr).toFixed(3)} ch${e[1]} r=${e[2]} s=${e[3]}`)])), dropSample: drops.slice(0, 8).map((d) => `t=${(d[0] / sr).toFixed(3)} ${d[1]} frames`) };
}
out.marks = marks.map((m) => `${m[0]} ct=${m[1]} mood=${m[3]} room=${m[4]}`);
out.musicLog = R.log.slice(-40);
out.maxVoices = R.maxVoices;
out.logs = R.logs.slice(0, 20);
console.log(JSON.stringify(out, null, 1));
