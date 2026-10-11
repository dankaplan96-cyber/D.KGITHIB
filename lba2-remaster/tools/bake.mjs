// Bake every sculpted model (characters, hands, shoes, trees, rocks, props, enemies) into
// assets/bake.bin so the game starts without sculpting. Run after changing designs:
//   cd lba2-remaster && python3 -m http.server 8123 &   node tools/bake.mjs [port]
// Needs Playwright with a Chromium (PLAYWRIGHT_BROWSERS_PATH); models whose design changed after the
// bake are detected by fingerprint and sculpted at load, so a stale bake is never wrong, only slower.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const port = process.argv[2] || '8123';
let chromium;
for (const p of ['playwright', '/opt/node-tools/node_modules/playwright/index.mjs']) { try { ({ chromium } = await import(p)); break; } catch { /* try next */ } }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(`http://localhost:${port}/?nobake`, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 600000 });
const b64 = await page.evaluate(async () => {
  window.game.testFreeze = true;
  const CH = await import('./src/game/characters.js');
  const E = await import('./src/game/enemies.js');
  for (const name of Object.keys(CH.LOOKS)) CH.createCharacter(name); // every design, used or not yet
  void E;
  const S = await import('./src/engine/sculpt.js');
  const bytes = S.serializeBake();
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
});
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'bake.bin');
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
await browser.close();
