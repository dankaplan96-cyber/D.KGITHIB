// Packs the game for itch.io as one HTML5 zip (the closed pilot, PILOT.md): the files the web version loads
// (tools/game-files.mjs), with all of src/ packed into one module (tools/bundle-artifact.mjs), so the zip stays far
// under itch's file-count limit. The page is index.html as it is (itch serves any file type, so the geometry bake
// keeps its own name, as in the desktop app), with the bundled Rubik font when it is there.
//   node tools/itch-build.mjs [out.zip]        (needs tools/node_modules with rollup, as for publishing; and `zip`)
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTZIP = process.argv[2] || join(ROOT, 'awakening-itch.zip');
const OUT = join(tmpdir(), 'lba3-itch-' + process.pid);
const { gameFiles } = await import(new URL('./game-files.mjs', import.meta.url));
rmSync(OUT, { recursive: true, force: true });
let n = 0, bytes = 0;
const put = (from, to) => { const d = join(OUT, to); mkdirSync(dirname(d), { recursive: true }); cpSync(from, d); n++; bytes += statSync(from).size; };
for (const [, src] of Object.entries(gameFiles())) {
  if (src.startsWith('src/') && src !== 'src/build-stamp.js') continue;   // (packed into src/main.js below)
  put(join(ROOT, src), src);
}
// the code: one module at src/main.js (three.js stays in vendor/, through the page's import map)
mkdirSync(join(OUT, 'src'), { recursive: true });
execFileSync('node', [join(ROOT, 'tools/bundle-artifact.mjs'), join(OUT, 'src/main.js')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
n++; bytes += statSync(join(OUT, 'src/main.js')).size;
let html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
if (existsSync(join(ROOT, 'assets', 'fonts', 'rubik.css'))) {
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="assets/fonts/rubik.css">');
}
writeFileSync(join(OUT, 'index.html'), html); n++;
put(join(ROOT, 'THIRD-PARTY-NOTICES.txt'), 'THIRD-PARTY-NOTICES.txt');
rmSync(OUTZIP, { force: true });
// (index.html first and no directory entries: itch.io's upload check looks for index.html at the zip's top)
execFileSync('zip', ['-q', '-X', '-D', OUTZIP, 'index.html'], { cwd: OUT });
execFileSync('zip', ['-q', '-X', '-D', '-r', OUTZIP, '.', '-x', 'index.html'], { cwd: OUT });
rmSync(OUT, { recursive: true, force: true });
console.log(`${OUTZIP}: ${n} files, ${(bytes / 1048576).toFixed(1)} MB before zip, ${(statSync(OUTZIP).size / 1048576).toFixed(1)} MB zipped`);
