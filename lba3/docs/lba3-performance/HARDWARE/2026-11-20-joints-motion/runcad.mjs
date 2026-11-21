// JOINTS-BLENDER: Twinsen's sword combo, a jump's landing, walk-to-stop and a pickup at 60 Hz: close 3/4 shots at set
// moments, and each sole's slide while it is down (horizontal drift of the foot bone while within 3 cm of the ground).
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true }); if (G.room) G.exitRoom({ x: -56, z: -30, a: 0 }, true); G.step(0.5);
  window.__home = () => { const h = G.hero; h.pos.set(0, G.physics.groundAt(0, 30, 50), 30); h.angle = 0; h.vel.set(0, 0, 0); for (let i = 0; i < 40; i++) G.step(1 / 60); };
  window.__home();
  // per frame: each foot's world position and the ground under it; a sole is down while within 3 cm
  window.__trace = []; const _v = new (G.hero.pos.constructor)();
  window.__rec = (tag) => { const h = G.hero, j = h.rig.j; const F = h.rig._feet; const r = { tag, a: h.rig.anim, g: h.onGround, sp: +Math.hypot(h.vel.x, h.vel.y).toFixed(2), land: +(h.rig.landT || 0).toFixed(3), fw: F ? +F.w.toFixed(2) : null, on: F ? [F.L.on ? +F.L.w.toFixed(2) : -1, F.R.on ? +F.R.w.toFixed(2) : -1] : null };
    for (const s of ['L', 'R']) { j['leg' + s].foot.getWorldPosition(_v); const gy = G.physics.groundAt(_v.x, _v.z, _v.y + 1); r[s] = [+_v.x.toFixed(4), +_v.y.toFixed(4), +_v.z.toFixed(4), +(gy ?? 0).toFixed(4)]; }
    window.__trace.push(r); };
  window.__run = (n, tag, keys = []) => { for (let i = 0; i < n; i++) { for (const k of keys) G.input.keys.add(k); G.step(1 / 60); window.__rec(tag); } for (const k of keys) G.input.keys.delete(k); };
});
const run = (n, tag, keys) => page.evaluate(([n, tag, keys]) => window.__run(n, tag, keys), [n, tag, keys || []]);
const VALS = (process.env.VALS || '1').split(',');
const res = [];
for (const val of VALS) {
  await page.evaluate((val) => { game.hero.rig.robeRunCyc = +val; window.__home(); game.hero.behaviour = 'athletic'; window.__trace = []; }, val);
  await run(170, 'run', ['ArrowUp']);
  const tr = await page.evaluate(() => window.__trace);
  let sum = 0, n = 0, low = 1; const prev = {}; const rr = tr.slice(80).filter((x) => x.a === 'run');
  for (const x of rr) for (const s of ['L', 'R']) { const [X, Y, Z, G] = x[s]; const y = Y - G;
    if (y < 0.105 && prev[s] && prev[s].y < 0.105) { sum += Math.hypot(X - prev[s].X, Z - prev[s].Z) * 60; n++; low = Math.min(low, y); }
    prev[s] = { X, Z, y }; }
  const ph = await page.evaluate(() => game.hero.rig._cycHz);
  res.push({ val, frames: rr.length, speed: rr.length ? rr[rr.length - 1].sp : 0, footSpeedDown: +(sum / Math.max(1, n)).toFixed(2), framesDown: n, lowestAnkle: +low.toFixed(3) });
  await run(60, 'rest');
}
console.log(JSON.stringify(res));
await browser.close(); server.close?.(); process.exit(0);
