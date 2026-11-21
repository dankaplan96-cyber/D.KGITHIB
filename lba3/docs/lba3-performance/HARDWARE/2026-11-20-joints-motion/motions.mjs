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
const look = async (name) => {
  await page.evaluate(() => { const G = game, h = G.hero; const a = h.angle + 1.1, C = G.camera; C.position.set(h.pos.x + Math.sin(a) * 2.9, h.pos.y + 1.25, h.pos.z + Math.cos(a) * 2.9); C.lookAt(h.pos.x, h.pos.y + 0.75, h.pos.z); C.updateMatrixWorld(); G.renderer.render(); });
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82, clip: { x: 340, y: 60, width: 600, height: 640 } });
};
const run = (n, tag, keys) => page.evaluate(([n, tag, keys]) => window.__run(n, tag, keys), [n, tag, keys || []]);
// 1. the sword combo: slash1, slash2, slash3, each from the last one's end
await page.evaluate(() => { const h = game.hero; h.hasSword = true; h.combat.weapon = 'sword'; h.syncSword?.(); window.__home(); });
for (const k of ['slash1', 'slash2', 'slash3']) {
  await page.evaluate((k) => { const h = game.hero; h.combat.startMove(k, { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' }); }, k);
  let t = 0;
  for (const at of [0.08, 0.16, 0.24, 0.36, 0.5]) { await run(Math.round((at - t) * 60), 'sword'); t = at; await look(`sword-${k}-${String(Math.round(at * 100)).padStart(2, '0')}`); }
  await run(30, 'sword');
}
await page.evaluate(() => { const h = game.hero; h.combat.weapon = 'ball'; h.syncSword?.(); window.__home(); });
// 2. jumps: standing, from a short walk, from a long run-up; the take-off and the landing
// (the Normal mode's action first: LBA2's hop on the spot, Space)
await page.evaluate(() => { window.__beh0 = game.hero.behaviour; window.__home(); game.hero.hop(); });
for (const [n, nm] of [[10, '16'], [10, '32'], [7, '44'], [5, '52'], [6, '62']]) { await run(n, 'hop'); await look('hop-' + nm); }
await run(30, 'hop');
for (const [tag, pre] of [['jumpS', 0], ['jumpW', 30], ['jumpR', 150]]) {
  await page.evaluate(() => { window.__home(); game.hero.behaviour = 'athletic'; });
  const keys = pre ? ['ArrowUp'] : [];
  if (pre) await run(pre, tag + '-up', keys);
  await page.evaluate(() => { game.input.taps.add('Space'); });
  let air = false, land = -1;
  for (let i = 0; i < 150 && land < 0; i++) { await run(1, tag, keys); const g = await page.evaluate(() => game.hero.onGround); if (g === false) air = true; if (air && g) land = i; }
  await look(tag + '-land-00');
  for (const [n, nm] of [[5, '08'], [5, '17'], [8, '30']]) { await run(n, tag + '-land', keys); await look(`${tag}-land-${nm}`); }
  await run(30, tag + '-land', keys);
}
await page.evaluate(() => { game.hero.behaviour = window.__beh0; });
// 3. walk, then stop
await page.evaluate(() => window.__home());
await run(90, 'walk', ['ArrowUp']);
await look('stop-00');
for (const [n, nm] of [[6, 'stop-10'], [6, 'stop-20'], [9, 'stop-35'], [15, 'stop-60']]) { await run(n, 'stop'); await look(nm); }
await run(40, 'stop');
// 4. a pickup (0.9 s, as the game's)
await page.evaluate(() => { window.__home(); game.hero.act('pickup', 0.9); });
let t = 0;
for (const at of [0.15, 0.3, 0.45, 0.6, 0.8]) { await run(Math.round((at - t) * 60), 'pickup'); t = at; await look(`pickup-${String(Math.round(at * 100)).padStart(2, '0')}`); }
await run(30, 'pickup');
const tr = await page.evaluate(() => window.__trace);
fs.writeFileSync(`${OUT}/trace.json`, JSON.stringify(tr));
// slides: for each tag and foot, contacts (runs of frames down) and the horizontal drift within each
const sum = {};
for (const tag of [...new Set(tr.map((r) => r.tag))]) for (const s of ['L', 'R']) {
  const rows = tr.filter((r) => r.tag === tag); let c0 = null, worst = 0, n = 0, sink = 0;
  for (const r of rows) { const [x, y, z, gy] = r[s]; const down = y - gy < 0.13; // (the foot bone sits ~6 cm over the sole)
    sink = Math.min(sink, y - gy);
    if (down) { if (!c0) { c0 = [x, z]; n++; } else worst = Math.max(worst, Math.hypot(x - c0[0], z - c0[1])); } else c0 = null; }
  sum[`${tag}.${s}`] = { contacts: n, maxSlideCm: +(worst * 100).toFixed(1), lowestOverGroundCm: +(sink * 100).toFixed(1) };
}
console.log(JSON.stringify(sum, null, 0));
fs.writeFileSync(`${OUT}/slides.json`, JSON.stringify(sum, null, 1));
console.log('errors', JSON.stringify(errs.slice(0, 3)));
await browser.close(); server.close?.(); process.exit(0);
