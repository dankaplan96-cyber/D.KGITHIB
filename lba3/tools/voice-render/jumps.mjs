// VOICES-PIPER diagnosis: where in a rendered two-speaker exchange (tests/voice-phrase.mjs (c)) the largest
// sample-to-sample steps and click-like spikes are, and which phrase was playing there.
//   node tools/voice-render/jumps.mjs [lba3 root with other banks]
import { openRenderer, LBA3 } from './render.mjs';

const R = await openRenderer({ roots: { game: process.argv[2] || LBA3 } });
const ex = [['n_zoe', "Twinsen. The tap's stopped again."], ['n_hero', 'I fixed that yesterday.'], ['n_zoe', 'It worked yesterday.'], ['n_hero', "I'll check the well."]];
const turns = []; let t = 0.2;
for (const [k, s] of ex) { turns.push({ key: k, text: s, at: t, say: true, mode: 'dialog' }); t += 1.1; }
turns.push({ key: '', text: '', at: t, say: true, mode: 'dialog', end: t + 0.01 });
const r = await R.render({ scene: { len: t + 1, turns }, opts: {} });
const x = r.voice, sr = r.sr, top = [];
for (let i = 1; i < x.length; i++) { const j = Math.abs(x[i] - x[i - 1]); if (j > 0.15) top.push([+(i / sr).toFixed(4), +j.toFixed(3), +x[i - 1].toFixed(3), +x[i].toFixed(3)]); }
top.sort((a, b) => b[1] - a[1]);
let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
console.log(JSON.stringify({ peak: +pk.toFixed(3), steps: top.length, biggest: top.slice(0, 8), played: r.played, turns: turns.map((u) => u.at) }));
await R.close();
