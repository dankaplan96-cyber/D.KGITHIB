// Every file the game loads, as { published path: source path } (for publishing and for the desktop app).
//   node tools/game-files.mjs > files.json
//
// Follows the ES-module imports from src/main.js (relative paths, 'three' and 'three/addons/...', including
// three's own relative imports such as build/three.core.min.js), then adds what is fetched at run time:
// the stylesheet, the character models, LBA1's room layouts, the music and the geometry bake (published as assets/bake.wasm,
// because artifact hosting serves only web media types; the published page sets window.LBA_BAKE_URL).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"\n]+)['"]/g;

function resolve(spec, here) {
  if (spec === 'three') return 'vendor/three/build/three.module.min.js';
  if (spec.startsWith('three/addons/')) return 'vendor/three/addons/' + spec.slice('three/addons/'.length);
  if (spec.startsWith('./') || spec.startsWith('../')) return posix.normalize(posix.join(posix.dirname(here), spec));
  return null;
}
const list = (dir, re) => existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => re.test(f)).sort().map((f) => `${dir}/${f}`) : [];

export function gameFiles() {
  const files = {}, todo = ['src/main.js'], seen = new Set();
  while (todo.length) {
    const p = todo.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    if (!existsSync(join(ROOT, p))) throw new Error('missing module: ' + p);
    files[p] = p;
    for (const m of readFileSync(join(ROOT, p), 'utf-8').matchAll(SPEC)) { const r = resolve(m[1], p); if (r) todo.push(r); }
  }
  for (const p of [...list('css', /\.css$/), ...list('assets/poly', /\.json$/), ...list('assets/lba1', /\.json$/), ...list('assets/lba2/islands', /\.json$/), ...list('assets/music', /\.mp3$/), 'assets/music/manifest.json']) files[p] = p;
  files['assets/bake.wasm'] = 'assets/bake.bin';
  return Object.fromEntries(Object.entries(files).sort());
}

if (process.argv[1] && normalize(process.argv[1]) === normalize(fileURLToPath(import.meta.url))) {
  const f = gameFiles();
  process.stdout.write(JSON.stringify(f, null, 0) + '\n');
  const mb = Object.values(f).reduce((a, p) => a + statSync(join(ROOT, p)).size, 0) / 1e6;
  process.stderr.write(`${Object.keys(f).length} files, ${mb.toFixed(1)} MB\n`);
}
