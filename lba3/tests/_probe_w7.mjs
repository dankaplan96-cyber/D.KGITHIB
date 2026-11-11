import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:8123/?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 400000 });
await page.evaluate(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await page.evaluate(() => {
  const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const out = {};
  G.enterRoom('isle_platform', null, true, true); G.step(1);
  const R = G.room, P = G.physics, W = R.wannie, ox = R.group.position.x, oz = R.group.position.z;
  const spot = (s) => s && { x: +(s.x - ox).toFixed(1), z: +(s.z - oz).toFixed(1), y: +P.groundAt(s.x, s.z, 99).toFixed(2), blk: P.blockedAt(s.x, s.z, P.groundAt(s.x, s.z, 99) + 0.5, 0.3) };
  out.h = { liftBottom: spot(W.liftBottom), mine: spot(W.mine), crates: spot(W.crates), chapelDoor: spot(W.chapelDoor) };
  out.npc = Object.fromEntries(Object.entries(W.npcSpots).map(([k, v]) => [k, spot(v)]));
  // the chapel: ground along a line from the bell's side up the z≈31 ramp to the door
  out.chapelLine = [[36.6, 28], [35, 31], [33.5, 31], [32.3, 30], [32.3, 28.5], [32.2, 27]].map(([x, z]) => [x, z, +P.groundAt(ox + x, oz + z, 99).toFixed(2), P.blockedAt(ox + x, oz + z, P.groundAt(ox + x, oz + z, 99) + 0.5, 0.3)]);
  out.lift = !!R.lift;
  if (R.lift) { const L = R.lift; out.liftLocal = L.local; L.setLevel(0); for (let i = 0; i < 30; i++) G.step(0.5); out.lv0 = +L.level.toFixed(2); L.setLevel(1); for (let i = 0; i < 30; i++) G.step(0.5); out.lv1 = +L.level.toFixed(2); L.setLever(true); out.pulled = L.pulled; }
  return out;
});
console.log(JSON.stringify(r));
await browser.close();
