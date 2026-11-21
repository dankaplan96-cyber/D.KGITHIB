// VOICE-CAST-5 / VOICE-FLOW (wave 5): the scenes for the new speakers and the flow measurements, shared by
// flow.mjs (numbers) and listen-cast5.mjs (listening files). Real English lines from the game's text files.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LBA3 } from './render.mjs';
import { dialog } from './scenes.mjs';
import { envelope } from './measure.mjs';

// the English strings of a few text files: key: 'string' | "string" | ['first', ...] (the first of a list); in a file
// with a Hebrew block first, the English (last) one wins
const TEXT = {};
for (const f of ['zeelife.js', 'ihomes.js', 'stands.js', 'ch1.js', 'hostel.js', 'islandlife.js']) {
  let s; try { s = readFileSync(join(LBA3, 'src/game/text', f), 'utf8'); } catch { continue; }
  for (const m of s.matchAll(/\b([a-z][a-zA-Z0-9_]*):\s*(?:\[\s*)?(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) TEXT[m[1]] = (m[2] ?? m[3]).replace(/\\(.)/g, '$1');
}
export const tx = (k) => { if (!TEXT[k]) throw new Error('no text ' + k); return TEXT[k]; };

// Zeelich's street (chapter 3, before the council): Twinsen meets the new people among the old
export const STREET = dialog([
  ['zr_fennick', tx('zr_fen_pre')], ['hero', 'Three tagged? Which ones are dark?'], ['zr_fennick', tx('zr_fen_mid')],
  ['zr_oma', tx('zr_oma_pre')], ['hero', 'Who reads the notices?'], ['zr_oma', tx('zr_oma_mid')],
  ['zr_rezz', tx('zr_rez_pre')], ['nara', 'Rezz, you said that yesterday.'], ['zr_rezz', tx('zr_rez_council')],
  ['zh_lissa', tx('zh_lissa_pre')], ['nara', 'Lissa, the flowers.'], ['zh_lissa', tx('zh_lissa_mid')],
  ['zh_wenna', tx('zh_wenna_pre')], ['oku', 'Wenna. The brakes again?'], ['zh_wenna', tx('zh_wenna_braked')],
  ['hero', 'Thank you. I will see what I can do.'],
]);
// the isle keepers, Corla and the depot guard (each with a neighbour where they talk)
export const KEEPERS = dialog([
  ['cs_corla', tx('cs_corla_well')], ['tavi', 'Coffee while you wait for nothing?'], ['cs_corla', tx('cs_corla_grounded')],
  ['ih_liwa', tx('ih_liwa_ord')], ['ot_ulla', 'Two cakes, Liwa. The plaza is cold today.'],
  ['ih_ossa', tx('ih_ossa_ord')], ['ih_dobb', tx('ih_dobb_ord')], ['ih_brem', tx('ih_brem_ord')],
  ['ih_gorrin', tx('ih_gorrin_ord')], ['kn_fisher', 'Same soup?'], ['ih_tesk', tx('ih_tesk_ord')],
  ['dw_guard', tx('dw_warn')], ['hero', tx('dw_tw_vesk')], ['dw_guard', tx('dw_warn_task')],
]);
// the same question from each new speaker (with a neighbour after a few), then one of them two ways
export const ASK = 'Is everything all right?';
export const SAMPLER = dialog([
  ...['cs_corla', 'ih_liwa', 'ot_ulla', 'ih_dobb', 'ih_brem', 'ih_ossa', 'ih_gorrin', 'kn_fisher', 'ih_tesk', 'pf_foreman',
    'zh_lissa', 'nara', 'zh_wenna', 'zr_oma', 'zr_rezz', 'xil', 'zr_fennick', 'dw_guard', 'hs_cook', 'hs_foreman', 'hs_worker4'].map((id) => [id, ASK]),
  ['cs_corla', 'Welcome! Your seat is on pad one, and the ship is on time.'],
  ['cs_corla', 'No flights... not today, not tomorrow. I am sorry.'],
], { gap: 0.6 });

// the planned pauses of a line (voiceplan clauses: 0.13 a comma, 0.2 a dash or colon, 0.3 a full stop, 0.42 dots)
export async function plannedPauses(text) {
  const P = await import(join(LBA3, 'src/engine/voiceplan.js'));
  return P.clauses(text).slice(0, -1).map((c) => c.pause);
}
// the silences inside one turn's voice (5 ms frames 35 dB under the turn's loudest, 40 ms or longer, between sound)
export function silences(seg, sr) {
  const env = envelope(seg, sr), mx = Math.max(1e-9, ...env), q = mx * Math.pow(10, -35 / 20);
  const out = []; let run = 0, started = false;
  for (const x of env) { if (x > q) { if (started && run * 0.005 >= 0.04) out.push(+(run * 0.005).toFixed(3)); run = 0; started = true; } else if (started) run++; }
  return out;
}
