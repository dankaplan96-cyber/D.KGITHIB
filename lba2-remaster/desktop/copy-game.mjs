// Copies the game into desktop/game for packaging: the same files the web version loads
// (tools/game-files.mjs follows every import), with the geometry bake under its own name. Needs only Node.
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..'), OUT = join(HERE, 'game');
const { gameFiles } = await import(new URL('../tools/game-files.mjs', import.meta.url));
const list = gameFiles();
rmSync(OUT, { recursive: true, force: true });
let n = 0;
for (const [, src] of Object.entries(list)) {
  const to = join(OUT, src);  // (published under the source name: assets/bake.bin stays bake.bin)
  mkdirSync(dirname(to), { recursive: true });
  cpSync(join(ROOT, src), to);
  n++;
}
// the page, with the web fonts replaced by the bundled copy when there is one (offline machines)
let html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
if (existsSync(join(ROOT, 'assets', 'fonts', 'rubik.css'))) {
  cpSync(join(ROOT, 'assets', 'fonts'), join(OUT, 'assets', 'fonts'), { recursive: true });
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="assets/fonts/rubik.css">');
}
writeFileSync(join(OUT, 'index.html'), html);
cpSync(join(HERE, 'build', 'icon.png'), join(OUT, 'icon.png'));
console.log(`desktop/game: ${n + 1} files`);
