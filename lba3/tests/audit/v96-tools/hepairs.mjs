// print English / Hebrew pairs for the keys of one text file: node hepairs.mjs <file.js> [every-n] [max]
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../../src/game/', import.meta.url).href;
const f = process.argv[2], every = +(process.argv[3] || 1), max = +(process.argv[4] || 9999);
const { STR } = await import(ROOT + 'i18n.js');
const before = new Set(Object.keys(STR.en));
await import(ROOT + 'text/' + f);
const src = readFileSync(new URL('text/' + f, ROOT), 'utf8');
const keys = [...src.matchAll(/^\s+([a-z0-9_]+):/gm)].map((m) => m[1]).filter((k) => STR.en[k] != null);
let n = 0;
keys.forEach((k, i) => {
  if (i % every || n >= max) return; n++;
  const fmt = (v) => (Array.isArray(v) ? v.join(' | ') : String(v));
  console.log(`${k}\n  EN: ${fmt(STR.en[k])}\n  HE: ${fmt(STR.he?.[k] ?? '(none)')}`);
});
console.log('keys', keys.length, 'shown', n);
