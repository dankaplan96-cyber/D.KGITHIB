// Packs the game's code (src/main.js and every module it imports) into ONE module for the artifact, published at
// the same path src/main.js, so index.html and import.meta.url ('build-stamp.js' next to it) keep working. three.js
// stays external (index.html's import map serves vendor/three as before, and `THREE.x` keeps its spelling inside
// model functions). The sources are not touched; the desktop app and the tests still load the separate modules.
// Why: the artifact's own-file limit is 512 (v149 was at 512); bundling frees every other src/ file.
//   (once) npm i --no-save --prefix tools rollup@4
//   node tools/bundle-artifact.mjs <out.js>   → prints the served module paths the bundle replaces (JSON)
// Rollup keeps each function's source text, except that colliding top-level names get a $N suffix and internal
// namespace accesses are resolved; sculpt.js (fingerprints) and voicesynth.js (worker source) strip the suffix
// (unsuffix), and the bake check (all regions + every character, see docs) must show the same misses as the modules.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameFiles } from './game-files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { rollup } = createRequire(join(ROOT, 'tools', 'x.js'))('rollup');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/bundle-artifact.mjs <out.js>'); process.exit(2); }
const seen = new Set();
const b = await rollup({
  input: join(ROOT, 'src/main.js'), treeshake: false,
  external: (id) => id === 'three' || id.startsWith('three/addons/'),
  onwarn: (w) => { if (!['CIRCULAR_DEPENDENCY', 'EVAL'].includes(w.code)) console.error(w.code, w.message.slice(0, 200)); },
});
for (const id of b.watchFiles) seen.add(id.replace(/\\/g, '/'));
await b.write({ file: out, format: 'es', inlineDynamicImports: true });
const served = gameFiles();
const replaced = Object.keys(served).filter((k) => k.startsWith('src/') && k !== 'src/build-stamp.js' && k !== 'src/main.js' && seen.has(join(ROOT, served[k]).replace(/\\/g, '/')));
console.log(JSON.stringify(replaced));
console.error(`bundle from ${seen.size} modules; replaces ${replaced.length} served files (src/main.js itself becomes the bundle)`);
