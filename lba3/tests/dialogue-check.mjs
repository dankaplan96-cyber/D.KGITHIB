// DIALOGUE-EDIT: a static check of the player-facing text (no browser). Run: node tests/dialogue-check.mjs [--list]
// It loads every module in src/game/text (as the game does, through i18n.js) and reads the code under src/ for the
// keys it names. Errors (exit 1):
//   - a key in a conversation ([speaker, key] pairs given to chain()) or in t('key') / say(…, 'key') that has no text;
//   - a conversation speaker with no name string (n_<id>), except hero / narrator;
//   - a t('key', {vars}) call whose placeholders and vars disagree ({n} in the text but no n given, or the reverse);
//   - night words (night, evening, tonight, sunset, dawn, dusk) in any English string: two suns, no time of day;
//   - a key binding spoken in a conversation line (<kbd>, "press", a key's name).
//   - an item's name or description (it_/itd_) defined twice with different texts (two items sharing an id).
// Warnings (printed, not failing): spoken lines over three sentences or over 230 characters, and other keys defined twice.
// Mechanical only: it cannot say whether a line reads well in its scene.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GAME = join(ROOT, 'src/game');
const list = process.argv.includes('--list');

const { STR } = await import(pathToFileURL(join(GAME, 'i18n.js')));
const owner = {};
for (const k of Object.keys(STR.en)) owner[k] = 'i18n.js';
const dup = [];
for (const f of readdirSync(join(GAME, 'text')).sort()) {
  if (!f.endsWith('.js')) continue;
  const src = readFileSync(join(GAME, 'text', f), 'utf8');
  // keys defined twice inside Object.assign(STR.en, …) across files (a later file silently wins)
  const pre = { ...STR.en };
  await import(pathToFileURL(join(GAME, 'text', f)));
  for (const k of Object.keys(STR.en)) {
    if (!(k in owner)) owner[k] = f;
    else if (pre[k] !== undefined && pre[k] !== STR.en[k] && new RegExp(`(^|[\\s,{])${k}\\s*:`).test(src)) dup.push(`${k} (${owner[k]} → ${f})`);
  }
}
const EN = STR.en;

// ---------------------------------------------------------------- the code's references
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js') && !p.includes('/text/') && !n.startsWith('i18n')) files.push(p); } })(join(ROOT, 'src'));
const spoken = new Map();   // key -> Set(speaker)
const used = new Map();     // key -> file
const errors = [], warns = [];
const rel = (p) => p.slice(ROOT.length);
// strings defined outside src/game/text (dinofly.js keeps its own) and names that are not text keys (flags, ids)
const allSrc = files.map((p) => readFileSync(p, 'utf8')).join('\n');
const definedElsewhere = (k) => new RegExp(`(^|[\\s,{])${k}\\s*:\\s*['"\\[\`]`, 'm').test(allSrc);
const notKey = (k) => k.endsWith('_') || definedElsewhere(k) || new RegExp(`\\b(f|flags|this\\.f)\\.${k}\\b|kind: '${k}'|id: '${k}'`).test(allSrc);
for (const p of files) {
  const src = readFileSync(p, 'utf8');
  // conversations: ['speaker', 'key'] (also with a ternary key: ['hero', a ? 'k1' : 'k2'])
  for (const m of src.matchAll(/\[\s*'([a-z][a-z0-9_]*)'\s*,\s*((?:[^\]\[]|\[[^\]]*\])*?)\]/g)) {
    const spk = m[1];
    const keys = [...m[2].matchAll(/'([a-z][a-z0-9_]*)'/g)].map((x) => x[1]);
    if (!keys.length) continue;
    // a pair is a conversation line only if one of its quoted names is a text key, or names one by its shape
    const isLine = keys.some((k) => k in EN) && (spk === 'hero' || spk === 'narrator' || ('n_' + spk) in EN);
    if (!isLine) continue;
    for (const k of keys) {
      if (!(k in EN)) { if (/_/.test(k) && !notKey(k)) errors.push(`missing text: ${k} (spoken by ${spk}, ${rel(p)})`); continue; }
      if (!spoken.has(k)) spoken.set(k, new Set()); spoken.get(k).add(spk); used.set(k, rel(p));
    }
  }
  // t('key'), t("key"), tr('key'), say(name, 'key'), toast('key')
  for (const m of src.matchAll(/\b(?:t|tr|toast|say|sayKey)\(\s*'([a-z][a-z0-9_]*)'\s*(?:,\s*(\{[^}]*\}))?/g)) {
    const k = m[1];
    if (!(k in EN)) { if (/_/.test(k) && !notKey(k)) errors.push(`missing text: ${k} (${rel(p)})`); continue; }
    used.set(k, rel(p));
    if (m[2]) {
      const given = new Set([...m[2].matchAll(/([A-Za-z_$][\w$]*)\s*(?=[:,}])/g)].map((x) => x[1]));
      const vals = Array.isArray(EN[k]) ? EN[k] : [EN[k]];
      const need = new Set(vals.flatMap((v) => [...String(v).matchAll(/\{([a-z][a-z0-9]*)\}/gi)].map((x) => x[1])));
      for (const n of need) if (!given.has(n)) errors.push(`placeholder {${n}} of ${k} not given (${rel(p)})`);
    }
  }
}
// speakers
for (const [k, sps] of spoken) for (const s of sps) if (s !== 'hero' && s !== 'narrator' && !(('n_' + s) in EN)) errors.push(`speaker without a name: ${s} (${k})`);

// ---------------------------------------------------------------- the text itself
const NIGHT = /\b(night|nights|nightly|evening|evenings|tonight|sunset|sunsets|dawn|dusk)\b/i;
const KEYS = /<kbd>|\bpress\b|\b(?:Ctrl|Alt|Shift|Space ?bar|Enter key|F[1-4])\b/;
const lines = (v) => (Array.isArray(v) ? v : [v]).filter((x) => typeof x === 'string');
const sentences = (s) => s.replace(/\([^)]*\)/g, (x) => x).split(/(?<=[.!?])\s+(?=["'(A-Z])/).filter((x) => x.trim()).length;
// settings/system keys allowed to name keys (the tips, the controls list, the rebinding UI)
const SYSTEM = /^(tut_|controls_html|rebind|kb_|set_h_|ctl_|ctrl_|tips_|hint_key|help_)/;
for (const [k, v] of Object.entries(EN)) {
  for (const s of lines(v)) {
    if (NIGHT.test(s) && !/^set_|^vis_|_html$/.test(k)) errors.push(`night word in ${k} (${owner[k]}): ${s.match(NIGHT)[0]} — "${s.slice(0, 80)}"`);
    if (spoken.has(k)) {
      if (KEYS.test(s) && !SYSTEM.test(k)) errors.push(`key binding spoken in ${k} (${owner[k]}): "${s.slice(0, 80)}"`);
      const n = sentences(s);
      if (n > 3 || s.length > 230) warns.push(`${k} (${owner[k]}): ${n} sentences, ${s.length} chars`);
    }
  }
}
// the voices' metadata (voicemeta.js, looked up by the line's text): its key must still have text, and an accented word
// must still be in the line (a rewritten line keeps its delivery consistent)
const { VOICE_META } = await import(pathToFileURL(join(GAME, 'text/voicemeta.js')));
for (const [k, m] of Object.entries(VOICE_META)) {
  if (!(k in EN)) { warns.push(`voicemeta for a key with no text: ${k}`); continue; }
  const text = lines(EN[k]).join(' ');
  const E = m && typeof m === 'object' && !Array.isArray(m) && m.e ? [].concat(m.e).filter(Boolean) : [];
  for (const w of E) if (!new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)) errors.push(`voicemeta ${k}: accented word "${w}" not in the line`);
  const I = m && (Array.isArray(m) ? m : Array.isArray(m.i) ? m.i : null);
  if (I && typeof EN[k] === 'string' && I.length > sentences(EN[k]) + 1) warns.push(`voicemeta ${k}: ${I.length} intentions for ${sentences(EN[k])} sentence(s)`);
}
// (an item's name or description defined twice is an error: two items sharing one id show the later file's text for
//  both — the prologue's Rope Ladder read "Rope … for Hesk" until chapter 4's coil got its own id, ropecoil)
for (const d of dup) (/^itd?_/.test(d) ? errors : warns).push(`defined twice, the later file wins: ${d}`);

// --unused [regex]: keys no code names literally (dead text, or text reached by a built key: check by hand)
const ui = process.argv.indexOf('--unused');
if (ui > 0) {
  const want = new RegExp(process.argv[ui + 1] && !process.argv[ui + 1].startsWith('--') ? process.argv[ui + 1] : '.');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const out = Object.keys(EN).filter((k) => want.test(k) && !allSrc.includes(k) && !html.includes(k));
  for (const k of out) console.log(`  unused  ${k} [${owner[k]}]`);
  console.log(`  ${out.length} unreferenced key(s)`);
}
console.log(`dialogue-check: ${Object.keys(EN).length} keys, ${spoken.size} spoken in conversations, ${used.size} named by code`);
if (list || warns.length < 40) for (const w of warns) console.log('  warn  ' + w);
else console.log(`  ${warns.length} warnings (long lines, duplicates): run with --list to see them`);
for (const e of errors) console.log('  FAIL  ' + e);
console.log(errors.length ? `dialogue-check: ${errors.length} error(s)` : 'dialogue-check: PASS');
process.exit(errors.length ? 1 : 0);
