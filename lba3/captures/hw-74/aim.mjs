import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/campaign/base-05.save.json`, 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st })).newPage();
await page.goto(server.url + '?nocine' + (TAG === 'none' ? '&fight58=none' : ''), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
await page.waitForTimeout(2000);
for (let i = 0; i < 30 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
// in the Citadel depot's yard by the valve (the watch turns on him), the hero made unhurtable for the picture only
await page.evaluate(() => { const G = game, D = G.rooms.zeelich.depot, h = G.hero; const x = D.x - 1, z = D.z - 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = 0; G.camRig.snap?.(); });
let best = null, last = null, n = 0;
const t0 = Date.now();
while (Date.now() - t0 < 60000 && n < 2) {
  if ((Date.now() - t0) % 5000 < 60) console.log('states', JSON.stringify(await page.evaluate(() => game.enemies.filter((e) => e.alive).map((e) => [e.id, e.def?.kind, e.state, +Math.hypot(e.pos.x - game.hero.pos.x, e.pos.z - game.hero.pos.z).toFixed(1)]))));
  const s = await page.evaluate(() => { const d = game.enemies.filter((e) => /drone/.test(e.def?.kind || '') && e.alive && e.state === 'windup').map((e) => [e.id, +e.stateT.toFixed(2)]); game.hero.hp = game.hero.maxHp; return d[0] || null; });
  if (s) { await page.screenshot({ path: `${OUT}/aim-${TAG}-cur.jpg`, type: 'jpeg', quality: 90 }); last = s; }
  else if (last) { fs.renameSync(`${OUT}/aim-${TAG}-cur.jpg`, `${OUT}/aim-${TAG}-${n}.jpg`); console.log(TAG, 'windup ended after', JSON.stringify(last)); n++; last = null; }
  await page.waitForTimeout(40);
}
await browser.close(); server.close?.(); process.exit(0);
