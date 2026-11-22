// ORDER 66.2/66.4: close pictures at given world points. Twinsen stands at (hx, hz) (or out of the way), the camera at
// (cx, cy over the ground there, cz) looking at (lx, ly over the ground, lz).
// usage: node citshots.mjs <OUT> <lba3 ROOT> <shots.json>   (a list of [name, hx, hz, cx, cy, cz, lx, ly, lz])
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, LIST] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); G.step(0.5); G.testFreeze = false; });
for (const [name, hx, hz, cx, cy, cz, lx, ly, lz] of SHOTS) {
  // let the world stream in round the point for a moment with the hero there, then freeze and frame it
  await page.evaluate(({ hx, hz }) => { const G = game, h = G.hero; G.testFreeze = false; h.pos.set(hx, G.physics.groundAt(hx, hz), hz); G.camRig.snap?.(); }, { hx, hz });
  await page.waitForTimeout(1500);
  await page.evaluate(({ cx, cy, cz, lx, ly, lz }) => { const G = game; G.testFreeze = true; const g = (x, z) => G.physics.groundAt(x, z), Cm = G.camera;
    Cm.position.set(cx, g(cx, cz) + cy, cz); Cm.lookAt(lx, g(lx, lz) + ly, lz); Cm.updateMatrixWorld(); G.renderer.render(); }, { cx, cy, cz, lx, ly, lz });
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 88 });
}
console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
