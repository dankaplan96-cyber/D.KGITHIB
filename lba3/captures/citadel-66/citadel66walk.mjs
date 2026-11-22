// ORDER 66.2: walk Twinsen with real keys (Playwright keyboard → the game's input): up and down the promenade's flight of
// steps and along the sea wall, Follow (Far). Pictures every `every` s and his position each 0.25 s.
// usage: node citadel66walk.mjs <OUT> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
// [name, start x, z, facing, key, seconds, picture every]
const WALKS = [
  ['stair-up', -63.5, -4.3, -1.5708, 'ArrowUp', 6, 0.75],
  ['stair-down', -73.2, -4.3, 1.5708, 'ArrowUp', 6, 0.75],
  ['wall-south', -73.7, -27, 0, 'ArrowUp', 14, 1.5],
  ['wall-north', -73.7, 17.5, 3.1416, 'ArrowUp', 14, 1.5],
  ['wall-seaedge', -74.8, -10, 0, 'ArrowUp', 8, 1.0],
];
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
  if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); G.step(0.5); G.testFreeze = false; const C = G.camRig; C.setMode('follow'); C.setFollowDistance?.('far'); });
const log = {};
for (const [name, x, z, a, key, secs, every] of WALKS) {
  await page.evaluate(({ x, z, a }) => { const G = game, h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; G.camRig.snap?.(); }, { x, z, a });
  await page.waitForTimeout(1500);
  await page.mouse.click(640, 360);   // (focus the page; a click on the ground does nothing in play)
  const track = []; let shot = 0;
  await page.keyboard.down(key);
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    const t = (Date.now() - t0) / 1000;
    track.push(await page.evaluate((t) => { const p = game.hero.pos; return [+t.toFixed(2), +p.x.toFixed(2), +p.y.toFixed(3), +p.z.toFixed(2), +(game.physics.groundAt(p.x, p.z) - p.y).toFixed(3)]; }, t));
    if (t >= shot * every) { await page.screenshot({ path: `${OUT}/${name}-${String(shot).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 80 }); shot++; }
    await page.waitForTimeout(250);
  }
  await page.keyboard.up(key);
  log[name] = track;
  const last = track[track.length - 1], first = track[0];
  console.log(name, 'from', first.slice(1, 4).join(','), 'to', last.slice(1, 4).join(','), 'max |ground-y|', Math.max(...track.map((r) => Math.abs(r[4]))).toFixed(3));
}
fs.writeFileSync(`${OUT}/tracks.json`, JSON.stringify(log));
console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
