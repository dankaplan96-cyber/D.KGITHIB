// Twinsen's house: walking (real key presses, classic controls) down the hall's stairs reaches the cellar, and
// walking up the cellar stairs comes back to the hall; the stairs carry him up and down step by step.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(info)); };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await page.evaluate(() => { const G = window.game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
const r = await page.evaluate(() => {
  const G = window.game, h = G.hero; G.testFreeze = true;
  G.settings.controls = 'classic'; G.applySettings();
  if (G.room?.id !== 'house') G.enterRoom('house', null, true);
  const R = G.room, ex = R.exits.find((e) => e.room === 'cellar');
  // stand north of the stairwell, facing down the stairs (+z), and walk
  h.pos.set(ex.x, G.physics.groundAt(ex.x, ex.z - 2.2), ex.z - 2.2); h.angle = 0; h.vel.set(0, 0); G.step(0.3);
  const ys = []; G.input.keys.add('ArrowUp');
  for (let i = 0; i < 60 && G.room?.id === 'house'; i++) { G.step(0.05); ys.push(+h.pos.y.toFixed(2)); }
  G.input.keys.delete('ArrowUp'); G.step(1.5);
  const down = { room: G.room?.id, minY: Math.min(...ys), ys: ys.filter((_, i) => i % 6 === 0) };
  // in the cellar: walk west up the stairs
  const C = G.room; const sp = { x: h.pos.x, z: h.pos.z };
  h.angle = -Math.PI / 2; G.step(0.2);
  const ys2 = []; G.input.keys.add('ArrowUp');
  for (let i = 0; i < 80 && G.room?.id === 'cellar'; i++) { G.step(0.05); ys2.push(+h.pos.y.toFixed(2)); }
  G.input.keys.delete('ArrowUp'); G.step(1.5);
  const up = { room: G.room?.id, maxY: Math.max(...ys2), ys: ys2.filter((_, i) => i % 6 === 0), from: sp, cellar: C?.id };
  return { down, up };
});
check('walking down the hall stairs reaches the cellar, going down step by step', r.down.room === 'cellar' && r.down.minY < -0.25, r.down);
check('walking up the cellar stairs climbs them and reaches the hall', r.up.room === 'house' && r.up.maxY > 0.6, r.up);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
