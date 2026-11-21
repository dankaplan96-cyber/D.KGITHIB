// How sensitive is the offline detector (analyze.mjs) on this music? Defects are injected into a recorded music bus at
// 200 random places each and counted: a dropout of one render quantum (128 zero frames: an underrun-like gap), a
// held block (128 frames repeating the last sample: a missed automation/parameter block), a gain step of 3 %, 10 %
// and 30 % (an unramped gain change), and a polarity flip of 1 sample.
import fs from 'node:fs';
import { RUNS } from './env.mjs';
const label = process.argv[2] || 'before-tap';
const K = +(process.argv[3] || 12), FLOOR = +(process.argv[4] || 0.004);
const b = fs.readFileSync(`${RUNS}/${label}/music-bus.wav`);
const pcm16 = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) / 2);
const N = pcm16.length / 2;
const L0 = new Float32Array(N); for (let i = 0; i < N; i++) L0[i] = pcm16[2 * i] / 32767;
function detect(x, W = 512) {
  const r = new Float32Array(x.length), cs = new Float64Array(x.length + 1);
  for (let i = 2; i < x.length; i++) r[i] = x[i] - 2 * x[i - 1] + x[i - 2];
  for (let i = 0; i < x.length; i++) cs[i + 1] = cs[i] + r[i] * r[i];
  const hits = []; let last = -1e9;
  for (let i = W; i < x.length - W; i++) {
    const a = Math.abs(r[i]); if (a < FLOOR) continue;
    const e = (cs[i + W] - cs[i - W] - (cs[i + 4] - cs[i - 3])) / (2 * W - 7);
    if (a > K * Math.sqrt(e) && i - last > 64) { last = i; hits.push(i); }
  }
  return hits;
}
let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// only where the music is sounding (|x| rms over 4096 above -50 dBFS)
const loud = []; for (let i = 8192; i < N - 8192; i += 4096) { let s = 0; for (let k = 0; k < 4096; k++) s += L0[i + k] ** 2; if (Math.sqrt(s / 4096) > 0.003) loud.push(i); }
const base = detect(L0).length;
const defects = {
  'dropout 128 frames': (x, p) => { for (let k = 0; k < 128; k++) x[p + k] = 0; },
  'held block 128': (x, p) => { const v = x[p]; for (let k = 1; k < 128; k++) x[p + k] = v; },
  'gain step 3%': (x, p) => { for (let k = p; k < p + 2048; k++) x[k] *= 1.03; },
  'gain step 10%': (x, p) => { for (let k = p; k < p + 2048; k++) x[k] *= 1.10; },
  'gain step 30%': (x, p) => { for (let k = p; k < p + 2048; k++) x[k] *= 1.30; },
};
const out = { label, K, FLOOR, baselineEvents: base, loudBlocks: loud.length };
for (const [name, f] of Object.entries(defects)) {
  let found = 0, tried = 0;
  for (let j = 0; j < 200; j++) {
    const p = loud[Math.floor(rnd() * loud.length)] + Math.floor(rnd() * 2048);
    const seg = L0.slice(p - 4096, p + 6144); const x = seg.slice();
    f(x, 4096);
    const h = detect(x).filter((i) => Math.abs(i - 4096) < 140 || (name.startsWith('gain') && Math.abs(i - 4096 - 2048) < 4) );
    tried++; if (h.length) found++;
  }
  out[name] = `${found}/${tried} detected`;
}
console.log(JSON.stringify(out, null, 1));
