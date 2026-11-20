// The source files alone (no game): each music MP3 decoded the way the game decodes it (decodeAudioData in an
// AudioContext at the device rate, Electron's Chromium), then the same discontinuity detector as analyze.mjs (K, floor)
// over the whole file, the loop seam as an AudioBufferSourceNode plays it (loopEnd -> loopStart), and the decode's
// length against the manifest (encoder padding trimmed or not).
import { electron, HERE, RUNS, ELECTRON, GAME } from './env.mjs';
import fs from 'node:fs';
const H = HERE;
fs.mkdirSync(RUNS, { recursive: true });
const prof = `${RUNS}/profile-src-${Date.now()}`;
const app = await electron.launch({ executablePath: ELECTRON,
  args: [H + '/main.cjs', '--user-data-dir=' + prof], env: { ...process.env, LBA_URL: GAME + 'assets/music/manifest.json' }, timeout: 180000 });
const page = await app.firstWindow();
await page.waitForLoadState('load');
const K = +(process.argv[2] || 12), FLOOR = +(process.argv[3] || 0.004), GAIN = +(process.argv[4] || 0.55);
const res = await page.evaluate(async ({ K, FLOOR, GAIN }) => {
  const man = await (await fetch('/assets/music/manifest.json')).json();
  const ctx = new AudioContext({ latencyHint: 0.08 });
  const out = { sr: ctx.sampleRate, tracks: {} };
  const detect = (d, W = 512) => {
    const N = d.length, r = new Float32Array(N), cs = new Float64Array(N + 1);
    for (let i = 2; i < N; i++) r[i] = (d[i] - 2 * d[i - 1] + d[i - 2]) * GAIN;
    for (let i = 0; i < N; i++) cs[i + 1] = cs[i] + r[i] * r[i];
    let n = 0, last = -1e9; const at = [];
    for (let i = W; i < N - W; i++) {
      const a = Math.abs(r[i]); if (a < FLOOR) continue;
      const e = (cs[i + W] - cs[i - W] - (cs[i + 4] - cs[i - 3])) / (2 * W - 7);
      if (a > K * Math.sqrt(e) && i - last > 64) { last = i; n++; if (at.length < 5) at.push(+(i / ctx.sampleRate).toFixed(3)); }
    }
    return { n, at };
  };
  for (const [name, t] of Object.entries(man.tracks)) {
    const ab = await (await fetch('/assets/music/' + t.file)).arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    const sr = buf.sampleRate, ch = [0, 1].map((c) => buf.getChannelData(Math.min(c, buf.numberOfChannels - 1)));
    let peak = 0, over = 0; for (const d of ch) for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 0.999) over++; }
    const det = ch.map((d) => detect(d));
    const row = { dur: +buf.duration.toFixed(4), manDur: t.duration, peak: +peak.toFixed(4), over, events: det[0].n + det[1].n, perMin: +((det[0].n + det[1].n) / (buf.duration / 60)).toFixed(2), at: det[0].at, loop: !!t.loop };
    // the first non-silent sample (decoder delay / encoder padding left in the decode)
    let first = 0; while (first < ch[0].length && Math.abs(ch[0][first]) < 1e-4 && Math.abs(ch[1][first]) < 1e-4) first++;
    row.firstSound = +(first / sr).toFixed(4);
    if (t.loop) {
      // what the source node plays across the seam: ... loopEnd-1, then loopStart ... (Chromium: frame = time * sr, linear interpolation)
      const ls = t.loopStart * sr, le = t.loopEnd * sr;
      row.loopFrames = { ls: +ls.toFixed(3), le: +le.toFixed(3), lenFrac: +((le - ls) % 1).toFixed(4) };
      const seam = ch.map((d) => {
        const L = 2048, s = new Float32Array(2 * L);
        const at = (x) => { const i = Math.floor(x), f = x - i; return d[i] * (1 - f) + d[i + 1] * f; };
        for (let i = 0; i < L; i++) s[i] = at(le - L + i);
        for (let i = 0; i < L; i++) s[L + i] = at(ls + i);
        // the jump at the joint against the local second-difference level
        const r = (k) => s[k] - 2 * s[k - 1] + s[k - 2];
        let e = 0; for (let k = 2; k < 2 * L; k++) if (Math.abs(k - L) > 3) e += r(k) ** 2; e = Math.sqrt(e / (2 * L - 9));
        const j = Math.max(Math.abs(r(L)), Math.abs(r(L + 1)));
        // and against the same positions one loop length earlier/later in the file (pass 1 vs pass 2 identical?)
        let diff = 0; for (let i = -256; i < 256; i++) diff = Math.max(diff, Math.abs(at(le + i) - at(ls + i)));
        return { jumpRatio: +(j / e).toFixed(2), passDiff: +diff.toFixed(5) };
      });
      row.seam = seam;
    }
    out.tracks[name] = row;
  }
  return out;
}, { K, FLOOR, GAIN });
console.log(JSON.stringify(res, null, 1));
fs.writeFileSync(`${RUNS}/source.json`, JSON.stringify(res, null, 1));
await app.close();
fs.rmSync(prof, { recursive: true, force: true });
