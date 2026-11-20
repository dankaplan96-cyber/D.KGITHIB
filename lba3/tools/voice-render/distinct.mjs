// The voices test's offline measurements (tests/voices.mjs, part 1) without a server: renders each voice's test line
// through tests/lib/voicelab.js (the synthesis alone) and prints the closest pairs, levels and clicks. For tuning.
//   node tools/voice-render/distinct.mjs [root dir with src/engine/voice.js] [style]
import { openRenderer, LBA3 } from './render.mjs';
const [root = LBA3, style = null] = process.argv.slice(2);
const R = await openRenderer({ roots: { game: LBA3, v: root } });
const MAIN = ['hero', 'zoe', 'arthur', 'baldino', 'vesk'];
const OTHERS = ['farmer1', 'doran', 'guard', 'pippa', 'mira', 'sphero1', 'nara', 'oku', 'zbee1', 'zmole1', 'zmole2', 'joe', 'ztri1', 'sendell'];
const LINE = 'Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.';
const M = await R.page.evaluate(async ({ MAIN, OTHERS, LINE, style }) => {
  const lab = await import('http://voice.local/game/tests/lib/voicelab.js');
  const V = await import('http://voice.local/v/src/engine/voice.js');
  V.voiceBanks?.(null);
  if (style) V.setVoiceStyle(style);
  const m = {};
  for (const id of [...MAIN, ...OTHERS]) { const r = await lab.render(V, 'n_' + id, LINE); const a = lab.analyse(r.data, r.sr); m[id] = { ...a, syl: r.syllables, f: lab.features(a) }; }
  return m;
}, { MAIN, OTHERS, LINE, style });
await R.close();
const ALL = [...MAIN, ...OTHERS];
const dist = (a, b) => Math.hypot(...M[a].f.map((x, i) => x - M[b].f[i]));
const axes = (a, b) => M[a].f.filter((x, i) => Math.abs(x - M[b].f[i]) >= 1).length;
const pairs = [];
for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) pairs.push([ALL[i], ALL[j], +dist(ALL[i], ALL[j]).toFixed(2), axes(ALL[i], ALL[j])]);
pairs.sort((a, b) => a[2] - b[2]);
console.log('closest pairs (need >= 1.5; a main voice >= 2 and >= 2 axes):');
for (const p of pairs.slice(0, 10)) console.log(' ', p.join(' '), MAIN.includes(p[0]) || MAIN.includes(p[1]) ? '(main)' : '');
const bad = pairs.filter((p) => p[2] < 1.5 || ((MAIN.includes(p[0]) || MAIN.includes(p[1])) && (p[2] < 2 || p[3] < 2)));
console.log('failing:', bad.length, JSON.stringify(bad));
for (const id of ALL) { const a = M[id]; console.log(id.padEnd(8), 'f', a.f.map((x) => x.toFixed(2)).join(' '), '| pk', a.peakDb, 'rms', a.rmsDb, 'crest', a.clickCrest, 'jmp', a.maxJump, 'syl', a.syl, 'f0', a.f0); }
