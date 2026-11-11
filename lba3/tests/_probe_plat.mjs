import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto('http://127.0.0.1:8123/?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await page.evaluate(async () => {
  const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.enterRoom('isle_platform', null, true, true); G.step(1);
  const R = G.room, o = R.group.position;
  const { FIT } = await import('/src/game/worldfit.js');
  const houses = FIT.filter((b) => b.region === 'isle_platform').map((b) => [b.name, +(b.x - o.x).toFixed(1), +(b.z - o.z).toFixed(1), +b.ry.toFixed(2), +b.w.toFixed(1), +b.d.toFixed(1), +b.oy.toFixed(1), b.door]);
  const s = (R.sample || []).map((p) => [+(p.x - o.x).toFixed(0), +(p.z - o.z).toFixed(0)]);
  const xs = s.map((p) => p[0]), zs = s.map((p) => p[1]);
  return { origin: { x: o.x, z: o.z }, size: R.size, spawn: R.spawn && [+(R.spawn.x - o.x).toFixed(1), +(R.spawn.z - o.z).toFixed(1)], pad: R.pad && [+(R.pad.x - o.x).toFixed(1), +(R.pad.z - o.z).toFixed(1), R.pad.y], houses, nsample: s.length, sx: [Math.min(...xs), Math.max(...xs)], sz: [Math.min(...zs), Math.max(...zs)], sample: s.filter((_, i) => i % 3 === 0) };
});
console.log(JSON.stringify(r));
await browser.close();
