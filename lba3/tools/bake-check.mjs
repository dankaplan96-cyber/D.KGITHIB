// The bake-vs-runtime fingerprint check: how many sculpted models the game takes from assets/bake.bin (hit) and how
// many it has to sculpt again at load because their design changed after the bake (miss: a stale entry, slower start,
// never wrong). Covers what tools/bake.mjs bakes: every area built (?allregions) and every character design created.
//   cd lba3 && python3 -m http.server 8123 &   node tools/bake-check.mjs [port]
// A miss after a fresh `node tools/bake.mjs` means a design that sculpts differently from run to run. Exit 1 on a miss.
// (TALK-ORDER task 3, 24.11; the first run of this check, on v150's bundle and modules, read 81 hits / 43 misses.)
let chromium;
for (const p of ['playwright', '/opt/node-tools/node_modules/playwright/index.mjs']) { try { ({ chromium } = await import(p)); break; } catch { /* try next */ } }
const port = process.argv[2] || '8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(`http://localhost:${port}/?allregions`, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  window.game.testFreeze = true;
  const CH = await import('./src/game/characters.js');
  for (const name of Object.keys(CH.LOOKS)) CH.createCharacter(name);   // (as tools/bake.mjs: every design, used or not yet)
  const S = await import('./src/engine/sculpt.js');
  return { hit: S.bakeStats.hit, miss: S.bakeStats.miss, missed: [...new Set(S.bakeStats.missed)] };
});
await browser.close();
console.log(`bake check: ${r.hit} hits / ${r.miss} misses`);
if (r.missed.length) console.log('missed:', r.missed.join(' '));
process.exitCode = r.miss ? 1 : 0;
