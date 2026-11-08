// VOICE-FLOW (wave 5): how the voice flows inside a turn, before and after: the silences between clauses against the
// pauses the plan asks for (a comma 0.13 s, a full stop 0.3 s), how long each turn's voice runs, the dips between
// syllables, clicks. Through the game's own playback (tools/voice-render/scene.js) with the phrase banks.
//   node tools/voice-render/flow.mjs <old lba3 root> [out.json]
// Numbers only; they do not say how a voice sounds.
import { writeFileSync } from 'node:fs';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN } from './scenes.mjs';
import { STREET, KEEPERS, plannedPauses, silences } from './cast5.mjs';
import { measure, slice, envelope } from './measure.mjs';

const [OLD, outFile] = process.argv.slice(2);
if (!OLD) { console.error('usage: flow.mjs <old lba3 root> [out.json]'); process.exit(2); }
const R = await openRenderer({ roots: { game: LBA3, old: OLD } });
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const res = {};
for (const root of ['old', 'game']) {
  const all = { byPause: {}, silences: [], voiceS: 0, typingS: 0, clickCrest: 0, maxJump: 0, dips: [], deep: [], turns: 0, paired: 0 };
  for (const [name, scene] of Object.entries({ HOME, WELL, DORAN, STREET, KEEPERS })) {
    const r = await R.render({ root, scene, opts: { presFromStyle: true } });
    const turns = scene.turns.filter((t) => t.key);
    for (const t of turns) {
      const nx = scene.turns[scene.turns.indexOf(t) + 1];
      const seg = slice(r.voice, r.sr, t.at, nx ? nx.at : scene.len);
      const env = envelope(seg, r.sr), mx = Math.max(1e-9, ...env); let first = -1, last = 0;
      env.forEach((x, k) => { if (x > mx * 0.01) { last = k; if (first < 0) first = k; } });
      const m = measure(seg, r.sr), sil = silences(seg, r.sr), plan = await plannedPauses(t.text);
      all.turns++; all.silences.push(...sil); all.voiceS += ((last - first) * 5) / 1000; all.typingS += t.text.length / 50;
      all.clickCrest = Math.max(all.clickCrest, m.clickCrest ?? 0); all.maxJump = Math.max(all.maxJump, m.maxJump ?? 0);
      if (m.joins) { all.dips.push(m.dipMedianDb); all.deep.push(m.deepJoins); }
      // a turn whose silences are as many as its planned pauses: pair them in order
      if (plan.length && sil.length === plan.length) { all.paired++; plan.forEach((p, i) => (all.byPause[p] ||= []).push(sil[i])); }
    }
  }
  res[root === 'game' ? 'after' : 'before'] = {
    turns: all.turns, pairedTurns: all.paired,
    silenceByPlannedPause: Object.fromEntries(Object.entries(all.byPause).sort((a, b) => a[0] - b[0]).map(([p, v]) => [p, { n: v.length, medianMs: Math.round(med(v) * 1000), maxMs: Math.round(Math.max(...v) * 1000) }])),
    silencesInTurns: { n: all.silences.length, medianMs: Math.round(med(all.silences) * 1000), over400ms: all.silences.filter((x) => x > 0.4).length },
    voiceSeconds: +all.voiceS.toFixed(1), typingSeconds: +all.typingS.toFixed(1),
    dipMedianDb: med(all.dips), deepJoinShare: med(all.deep), clickCrestMax: all.clickCrest, maxJump: +all.maxJump.toFixed(3),
  };
}
await R.close();
console.log(JSON.stringify(res, null, 1));
if (outFile) writeFileSync(outFile, JSON.stringify(res, null, 1));
