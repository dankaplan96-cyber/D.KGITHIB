// ORDER 67: the walls in motion — Twinsen walks past a wall with real keys (Follow, Far), a frame every 150 ms, off and
// on, to look for shimmer/sparkle of the normal map. usage: node wnmotion.mjs <OUT> <lba3 ROOT> "<query>" <tag>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, Q = '', TAG = 'off'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const WALKS = [['nbrwest', -39.6, 69.5, 0], ['seawall', -73.7, -12, 0], ['house', -44.0, 74.5, 0]];
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.goto(server.url + (Q ? Q + '&' : '?') + 'weather=1&nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(900);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 120 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.flags.pr_tut2 = false; if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); G.step(0.5); G.testFreeze = false;
  const C = G.camRig; C.setMode('follow'); C.setFollowDistance?.('far');
  const W = G.weather; for (const k in W.P) { W.P[k].phase = 0.79; W.P[k].pinned = true; } try { W.force?.('clear'); } catch {} });
for (const [name, x, z, a] of WALKS) {
  await page.evaluate(({ x, z, a }) => { const G = game, h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; G.camRig.snap?.(); }, { x, z, a });
  await page.waitForTimeout(2000); await page.mouse.click(683, 384);
  await page.keyboard.down('ArrowUp');
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(150); await page.screenshot({ path: `${OUT}/${name}-${TAG}-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  await page.keyboard.up('ArrowUp');
}
await browser.close(); server.close?.(); process.exit(0);
