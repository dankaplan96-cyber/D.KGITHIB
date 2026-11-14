// VOICE-CAST-5: who talks in the same place and how far apart their voices are, without a server (the same numbers as
// tests/voices.mjs's neighbour check, printed for tuning): the synthesis's feature distance (tests/lib/voicelab.js) and
// the phrase speaker and pitch each one plays from (bankOf). Numbers only; they do not say how a voice sounds.
//   node tools/voice-render/neighbours.mjs [root dir with src/engine/voice.js]
import { openRenderer, LBA3 } from './render.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [root = LBA3] = process.argv.slice(2);
// the places and the new speakers, as the test lists them
const src = readFileSync(join(LBA3, 'tests/voices.mjs'), 'utf8');
const PLACES = (0, eval)('(' + src.match(/const PLACES = (\{[\s\S]*?\n\});/)[1] + ')');
const NEW = (0, eval)(src.match(/const NEW = (\[[\s\S]*?\]);/)[1]);
const LINE = 'Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.';
const R = await openRenderer({ roots: { game: LBA3, v: root } });
const P = await R.page.evaluate(async ({ ids, LINE }) => {
  const lab = await import('http://voice.local/game/tests/lib/voicelab.js');
  const V = await import('http://voice.local/v/src/engine/voice.js');
  V.voiceBanks('http://voice.local/v/assets/voice/');
  await new V.Babble({ ctx: null, vol: { voice: 1 } }).prepare([], { wait: true });
  const out = {};
  for (const id of ids) {
    const r = await lab.render(V, 'n_' + id, LINE), b = V.bankOf(V.voiceFor('n_' + id)), a = lab.analyse(r.data, r.sr);
    out[id] = { f: lab.features(a), f0: a.f0, bank: b ? b[0] : null, st: b ? 12 * Math.log2(b[1]) : 0, own: !!V.VOICES[id] };
  }
  return out;
}, { ids: [...new Set(Object.values(PLACES).flat())], LINE });
await R.close();
const pd = (a, b) => Math.hypot(...P[a].f.map((x, i) => x - P[b].f[i]));
let bad = 0;
for (const [where, ids] of Object.entries(PLACES)) {
  console.log('==', where);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const [a, b] = [ids[i], ids[j]], isNew = NEW.includes(a) || NEW.includes(b);
    const same = P[a].bank && P[a].bank === P[b].bank, dst = Math.abs(P[a].st - P[b].st);
    const fail = pd(a, b) < 1.5 || (same && dst < 1.5);
    if (fail && isNew) bad++;
    if (fail || (isNew && pd(a, b) < 2.2)) console.log(`  ${fail ? (isNew ? 'FAIL' : 'old ') : 'near'} ${a} / ${b}: synthesis distance ${pd(a, b).toFixed(2)}${same ? `, same speaker ${P[a].bank} ${dst.toFixed(2)} st apart` : ''}`);
  }
}
if (process.env.DUMP) for (const id of Object.keys(P)) console.log(id.padEnd(12), P[id].f.map((x) => x.toFixed(2)).join(' '), 'f0', P[id].f0);
console.log('new speakers failing:', bad);
