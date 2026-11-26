// ORDER 66.2: today's Citadel (P103 FLAT-TOWN) on the real GPU: at each spot Twinsen stands, and pictures are taken in
// Follow (Far), in the Fixed view (LBA2's) and from the top. usage: node citadel66.mjs <OUT> <lba3 ROOT> [spot,spot]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, ONLY] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
// [name, x, z, facing (rad, 0 = +z), top-view height]
const SPOTS = [
  ['square', -42, -4, 3.14, 26], ['square-edge', -42, 5.6, 0, 18], ['north', -37, -20, 3.4, 24], ['west', -55.5, -15.5, 3.14, 24],
  ['stair-foot', -64.6, -4.2, -1.57, 18], ['stair-top', -72.8, -4.2, 1.57, 18], ['prom-n', -73.7, -18, 0, 22], ['prom-s', -73.7, 10, 3.14, 22],
  ['harbour', -110, 44, -1.57, 28], ['harbour-street', -60, 33, -1.57, 24],
].filter((s) => !ONLY || ONLY.split(',').includes(s[0]));
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
const info = [];
for (const [name, x, z, a, th] of SPOTS) {
  const at = await page.evaluate(({ x, z, a }) => { const G = game, h = G.hero; const y = G.physics.groundAt(x, z);
    h.pos.set(x, y, z); h.angle = a; if (h.vel) h.vel.set?.(0, 0, 0); return { y: +y.toFixed(3) }; }, { x, z, a });
  info.push({ name, x, z, ...at });
  for (const mode of ['follow', 'lba']) {
    await page.evaluate((mode) => { const C = game.camRig; C.setMode(mode); if (mode === 'follow') C.setFollowDistance?.('far'); C.idleT = 0; C.snap?.(); }, mode);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${name}-${mode === 'lba' ? 'fixed' : 'follow'}.jpg`, type: 'jpeg', quality: 85 });
  }
  await page.evaluate(({ x, z, th }) => { const G = game; G.testFreeze = true; const Cm = G.camera, y = G.hero.pos.y;
    Cm.position.set(x, y + th, z + th * 0.35); Cm.lookAt(x, y, z); Cm.updateMatrixWorld(); G.renderer.render(); }, { x, z, th });
  await page.screenshot({ path: `${OUT}/${name}-top.jpg`, type: 'jpeg', quality: 85 });
  await page.evaluate(() => { game.testFreeze = false; });
}
fs.writeFileSync(`${OUT}/spots.json`, JSON.stringify(info, null, 1));
console.log(JSON.stringify(info)); console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
