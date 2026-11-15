// P28 (the user, 15.11: "the dog inside Twinsen", a picture of the poodle's cream puffs showing through his tunic):
// walking (real key presses) straight at Citadel's poodle from four sides, while it comes up to greet him and turns to
// him, no part of its body (its circles along its length: hips, chest, the head on its neck; dogs.js Dog.circles)
// comes into his. Measured every frame; the snout's tip (1.0 m in front of the dog's centre) is reported too.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watch(page);
const { check, done } = checker({ info: 'always' });
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await page.evaluate(() => { const G = window.game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
const r = await page.evaluate(() => {
  const G = window.game, h = G.hero; G.testFreeze = true;
  G.settings.controls = 'classic'; G.applySettings();
  const d = G.world?.dogs?.[0];
  if (!d) return { err: 'no poodle' };
  if (G.room) G.exitRoom({ x: d.pos.x + 3, z: d.pos.z }, true);
  G.step(0.5);
  const out = [];
  for (const side of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    // the dog in the middle of its yard, facing +z; he 3.2 m off on this side, facing it
    const A = d.area, cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2;
    d.pos.x = cx; d.pos.z = cz; d.a = 0; d.state = 'idle'; d.timer = 9; d.barkCool = 0;
    const sx = cx + Math.sin(side) * 3.2, sz = cz + Math.cos(side) * 3.2;
    h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 2), sz); h.vel.set(0, 0);
    h.angle = Math.atan2(cx - sx, cz - sz); G.step(0.1);
    let minGap = 9, minSnout = 9;
    G.input.keys.add('ArrowUp');
    for (let i = 0; i < 70; i++) {
      // keep walking at it: steer at the dog's centre each frame (a player pressing on)
      h.angle = Math.atan2(d.pos.x - h.pos.x, d.pos.z - h.pos.z);
      G.step(0.05);
      minGap = Math.min(minGap, d.gap(h));
      const tx = d.pos.x + Math.sin(d.a) * 1.0, tz = d.pos.z + Math.cos(d.a) * 1.0;
      minSnout = Math.min(minSnout, Math.hypot(tx - h.pos.x, tz - h.pos.z));
    }
    G.input.keys.delete('ArrowUp'); G.step(0.3);
    out.push({ side: +side.toFixed(2), minGap: +minGap.toFixed(3), snoutToHisCentre: +minSnout.toFixed(2), dist: +Math.hypot(d.pos.x - h.pos.x, d.pos.z - h.pos.z).toFixed(2) });
  }
  return { out, circles: d.circles().length };
});
check('the poodle is found, its body as more than one circle', !r.err && r.circles >= 2, r);
for (const o of r.out || []) check(`walking at it from side ${o.side}: no part of it inside him (gap ≥ −3 cm)`, o.minGap >= -0.03, o);
check('no page errors', errs.length === 0, errs.slice(0, 3));
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
