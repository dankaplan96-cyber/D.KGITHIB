// VOICE-2: what an Expressive line costs the main thread before any sound: the metadata lookup and the plan (clauses,
// intentions, the classic gestures the mouth falls back on), over the game's whole English text, for a few speakers;
// and how many lines the metadata covers. Node, no audio.   node tools/voice-render/v2-plan-cost.mjs
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LBA3 } from './render.mjs';
const T = join(LBA3, 'src/game/text');
for (const f of readdirSync(T).filter((x) => x.endsWith('.js'))) await import(join(T, f));
const { STR } = await import(join(LBA3, 'src/game/i18n.js'));
const M = await import(join(T, 'voicemeta.js'));
const P = await import(join(LBA3, 'src/engine/voiceplan.js'));
const V = await import(join(LBA3, 'src/engine/voice.js'));
const texts = Object.values(STR.en).filter((s) => typeof s === 'string' && /[A-Za-z]{3}/.test(s) && s.length > 3 && !/[{}<>]/.test(s));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))].toFixed(3); };
const out = { lines: texts.length, metaKeys: Object.keys(M.VOICE_META).length, metaFound: 0, speakers: {} };
for (const t of texts) if (M.metaFor(t)) out.metaFound++;
for (const id of ['hero', 'zoe', 'vesk', 'farmer1']) {
  const v = V.voiceFor('n_' + id), ms = [], intents = {};
  for (const t of texts) {
    const t0 = performance.now();
    const meta = M.metaFor(t), p = P.planLine(v, t, { mode: 'classic', meta });
    ms.push(performance.now() - t0);
    for (const ph of p.phrases) intents[ph.intent] = (intents[ph.intent] || 0) + 1;
  }
  out.speakers[id] = { planMs: { median: q(ms, 0.5), p99: q(ms, 0.99), max: q(ms, 1) }, intents };
}
console.log(JSON.stringify(out, null, 1));
