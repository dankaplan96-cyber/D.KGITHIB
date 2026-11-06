// The conversations the voice renders use: real lines from the game's English text, with the game's own timing
// (a cinematic's subtitle times, or a dialogue box the player reads and presses on).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LBA3 } from './render.mjs';

// the English strings, read from the text files (key: 'string' or key: ['a', 'b'])
const TEXT = {};
for (const f of ['src/game/i18n.js', 'src/game/text/opening.js', 'src/game/text/well.js', 'src/game/text/ch1.js']) {
  const s = readFileSync(join(LBA3, f), 'utf8');
  for (const m of s.matchAll(/\b([a-z][a-zA-Z0-9_]*):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) TEXT[m[1]] ??= (m[2] ?? m[3]).replace(/\\(.)/g, '$1');
}
// (the Hebrew c1_ lines come first in ch1.js: take the English one, the last)
for (const m of readFileSync(join(LBA3, 'src/game/text/ch1.js'), 'utf8').matchAll(/\b(c1_[a-zA-Z0-9_]*):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) TEXT[m[1]] = (m[2] ?? m[3]).replace(/\\(.)/g, '$1');
export const text = (k) => { if (!TEXT[k]) throw new Error('no text ' + k); return TEXT[k]; };

// a dialogue box: each line types out at 50 characters a second; the player reads it and presses on
// (reading: 0.7 s + 16 characters a second, never before it has typed out)
export function dialog(lines, { gap = 0.5, start = 0.4 } = {}) {
  const turns = []; let t = start, prev = null;
  for (const [who, key] of lines) {
    const s = typeof key === 'string' && TEXT[key] ? text(key) : key;
    const say = who !== prev;
    if (say && prev) t += gap; // (one box closes, the next speaker's opens)
    turns.push({ key: 'n_' + who, text: s, at: +t.toFixed(3), say, mode: 'dialog' });
    t += Math.max(s.length / 50 + 0.3, 0.7 + s.length / 16);
    prev = who;
  }
  turns.push({ key: '', text: '', at: +t.toFixed(3), say: true, mode: 'dialog', end: t + 0.01 }); // (the box closes)
  return { len: +(t + 1.2).toFixed(2), turns };
}

// a cinematic: subtitles at their own times and durations (opening.js), the long silences between them shortened
export function cine(lines, { start = 0.4, maxGap = 0.9 } = {}) {
  const turns = []; let t = start, last = null;
  for (const [who, key, at, d] of lines) {
    if (last) t += Math.min(maxGap, at - last.at - last.d) + last.d;
    turns.push({ key: 'n_' + who, text: text(key), at: +t.toFixed(3), d, mode: 'cine' });
    last = { at, d };
  }
  return { len: +(t + last.d + 1.0).toFixed(2), turns };
}

// chapter 1, at home: Twinsen and Zoé (opening.js's own subtitle times and durations)
export const HOME = cine([
  ['zoe', 'op_zoe_1', 45.4, 2.5], ['hero', 'op_tw_1', 48.3, 2.0], ['zoe', 'op_zoe_2', 51.0, 1.8],
  ['zoe', 'op_zoe_3', 60.6, 1.8], ['hero', 'op_tw_2', 67.9, 1.7], ['zoe', 'op_zoe_4', 69.6, 1.7],
]);
// chapter 1, at the well: Mira and Gilbert's row (dialogue boxes)
export const WELL = dialog([
  ['mira', 'pr_mira_no'], ['gilbert', 'pr_gil_no'], ['hero', 'pr_tw_kettle2'], ['mira', 'pr_mira_kettle'], ['mira', 'pr_mira_2b'],
  ['gilbert', 'pr_gil_kick'], ['mira', 'pr_mira_kick'],
]);
// a longer NPC line: Doran at the harbour
export const DORAN = dialog([['doran', 'c1_doran_drones'], ['doran', 'c1_doran_ferry1']]);
