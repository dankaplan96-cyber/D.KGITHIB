// RENDER-INV: what each situation costs, attributed to areas (see ra.js). SwiftShader: counts are exact, times are
// CPU proxies (never GPU time). One browser, 1366×768, the preset saved before loading.
//   GAME_URL=http://localhost:8176/ QUALITY=medium N=12 node audit.mjs > audit-<label>.json
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
const RA = fileURLToPath(new URL('./ra.js', import.meta.url));
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 12), ONLY = process.env.ONLY?.split(',');
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
const out = { quality, load: os.loadavg().map((x) => +x.toFixed(2)), scenes: {} };
const want = (k) => !ONLY || ONLY.includes(k);

// 1. title and the opening cinematic (a real new game, no ?nocine)
if (want('title') || want('opening')) {
  await open(page, '');
  await page.addScriptTag({ path: RA });
  out.loadTimes = await page.evaluate(() => game.loadTimes);
  if (want('title')) out.scenes.title = await page.evaluate((N) => RA.frameCost({ n: N }), N);
  if (want('opening')) {
    await page.evaluate(() => localStorage.removeItem('lba3_save_v1'));
    await page.click('[data-act="new"]');
    await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 240000 });
    await page.evaluate(() => { game.testFreeze = true; });
    for (const at of [8, 30, 60]) {
      await page.evaluate((t) => { for (let i = 0; i < 6000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); }, at);
      out.scenes['opening@' + at] = await page.evaluate((N) => ({ cineT: game.cine?.t, ...RA.frameCost({ n: N }) }), N);
    }
  }
}

// 2. play: the house, the street, the harbour, combat, regions
await open(page, '?nocine');
await page.addScriptTag({ path: RA });
out.loadTimes ??= await page.evaluate(() => game.loadTimes);
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const scene = async (key, setup, drive) => {
  if (!want(key)) return;
  out.scenes[key] = await page.evaluate(({ N, setup, drive }) => {
    const G = game; G.state = 'play';
    (0, eval)(`(${setup})`)(G);
    G.state = 'play';
    for (let i = 0; i < 20; i++) G.frame(1 / 30, i % 10 === 9);
    const d = drive ? (0, eval)(`(${drive})`)(G) : null;
    return RA.frameCost({ n: N, drive: d });
  }, { N, setup: setup.toString(), drive: drive?.toString() });
};
await scene('house', (G) => { G.enterRoom('house', null, true, true); });
if (want('inventory')) out.inventoryHouse = await page.evaluate(() => ({ byArea: RA.inventory(), byBucket: RA.sumBuckets(RA.inventory()) }));
await scene('street', (G) => { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); }, (G) => { const r = G.bench.routes().find((x) => x.id === 'street'); let t = 0; return (_, dt) => { t += dt; r.drive(t + 2, dt); }; });
if (want('inventory')) out.inventoryStreet = await page.evaluate(() => RA.sumBuckets(RA.inventory()));
await scene('harbour', (G) => { G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; G.camRig.pitch = 0.3; });
await scene('houseDoorView', (G) => { G.exitRoom({ x: -45, z: 76, a: 0 }, true, true); G.bench.camera(); });
await scene('combat', (G) => { const r = G.bench.routes().find((x) => x.id === 'combat'); r.setup(); }, (G) => { const r = G.bench.routes().find((x) => x.id === 'combat'); let t = 0; return (_, dt) => { t += dt; r.drive(t, dt); }; });
await scene('zeelich', (G) => { G.enterRoom('zeelich', null, true, true); });
await scene('desert', (G) => { G.enterRoom('desert', null, true, true); });
await scene('houseAgain', (G) => { G.enterRoom('house', null, true, true); });

// 3. resource growth: 20 door cycles house ⇄ Citadel and 5 Zeelich ⇄ Citadel, instant swaps rendered
if (want('cycles')) out.cycles = await page.evaluate(() => {
  const G = game, R = G.renderer.renderer;
  const snap = () => ({ ...R.info.memory, programs: R.info.programs.length, objects: (() => { let n = 0; G.scene.traverse(() => n++); return n; })(), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, shadowAreas: G.shadowCull.areas.size });
  const a = snap();
  for (let i = 0; i < 20; i++) { G.enterRoom('house', null, true, true); for (let k = 0; k < 4; k++) G.frame(1 / 30, k === 3); G.exitRoom({ x: -45, z: 76, a: 0 }, true, true); for (let k = 0; k < 4; k++) G.frame(1 / 30, k === 3); }
  const b = snap();
  for (let i = 0; i < 5; i++) { G.enterRoom('zeelich', null, true, true); for (let k = 0; k < 4; k++) G.frame(1 / 30, k === 3); G.exitRoom({ x: -45, z: 76, a: 0 }, true, true); for (let k = 0; k < 4; k++) G.frame(1 / 30, k === 3); }
  const c = snap();
  return { before: a, after20house: b, after5zeelich: c };
});
out.loadAfter = os.loadavg().map((x) => +x.toFixed(2));
out.errors = errs.slice(0, 8);
console.log(JSON.stringify(out, null, 1));
await browser.close();
