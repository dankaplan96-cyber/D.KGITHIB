// P79 (REVIEW-TASKS-19-11 task 7, FULL-TEST): frame pacing on the revised scenes at Frame Rate 60 and 30, matched —
// the yard (the opening's tutorial), the busy Citadel street (the benchmark's own street route), Zeelich at its arrival
// point, Ballastra's Float Harbor, the finale's core (c3core). The game's own loop and requestAnimationFrame run (not
// the tests' fixed stepping); each run goes through the in-game Frame Rates benchmark (src/engine/bench.js runPacing:
// the same warm-up, the same measure window, the limit applied as in play, the same report), with three routes added
// for the scenes it has no route for (yard, ballastra, finale) and one for Zeelich alone. Then first vs repeat visits
// (bench.visits: a cold phase per route, then repeat cycles) for the street and a Citadel ⇄ Zeelich arrival, at 60 and 30.
// The camera: the benchmark's free orbit, the same heading, pitch and turn rate everywhere; Quality fixed by hand
// (QUALITY, default medium), automatic resolution off; window 1280×720 (W, H).
//   GAME_URL=http://127.0.0.1:8177/ OUT=captures/full-test/perf node tests/p79-perf.mjs
// Automated runtime only (SwiftShader): every number is CPU-drawn by a software renderer on a shared machine. They show
// the pacing logic, stalls and relative costs; they are never GTX 1050 numbers (CLOUD_ORDERS 55/56 are the user's runs).
import { launch, open } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = process.env.OUT || 'captures/full-test/perf';
fs.mkdirSync(OUT, { recursive: true });
const Q = process.env.QUALITY || 'medium', W = +(process.env.W || 1280), H = +(process.env.H || 720);
const MEASURE = +(process.env.MEASURE || 10), CYCLES = +(process.env.CYCLES || 2);
const ROUTES = (process.env.ROUTES || 'yard,street,zeelich,ballastra,finale').split(',');
const { browser, page, errs } = await launch({ width: W, height: H });
page.on('console', (m) => { if (/^LBA3: The Awakening benchmark/.test(m.text())) fs.appendFileSync(path.join(OUT, 'reports.txt'), m.text() + '\n\n'); });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
const t0 = Date.now();
await open(page, '?nocine', { freeze: false });
const boot = await page.evaluate(() => ({ gpu: game.perf.gpu, quality: game.settings.quality, auto: !!game.settings.qualityAuto, version: game.version, programs: game.renderer.renderer.info.programs.length }));
console.log('boot', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(boot));
// a new game, as a player: the title's New Game; then out to the yard (the opening's house → yard by the harness, a few steps)
await page.click('[data-act="new"]');
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house' && !game.trans, null, { timeout: 600000 });
await page.evaluate((q) => { game.settings.qualityAuto = false; game.settings.quality = q; game.applySettings?.(); }, Q);
// the extra areas built under the loading card first (as a door or a load would), so no route measures a first build
await page.evaluate(() => game.buildAreas(['ballastra', 'c3core', 'zeelich'], 'Preparing…'));
await page.waitForFunction(() => !game.gfxHold && !game.trans && !game.preparing, null, { timeout: 600000 });
// the routes: the benchmark's own walk (a loop at walking speed, facing the way it goes) and camera turn (0.35 rad/s)
await page.evaluate(() => {
  const G = game, B = G.bench, orig = B.routes.bind(B);
  const loop = (pts, speed = 1.4) => {
    const seg = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length].x - p.x, pts[(i + 1) % pts.length].z - p.z)), total = seg.reduce((a, b) => a + b, 0);
    return (t) => { const h = G.hero; let d = (t * speed) % total, i = 0; while (d > seg[i]) { d -= seg[i]; i++; }
      const a = pts[i], b = pts[(i + 1) % pts.length], k = d / seg[i];
      h.pos.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k); h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, (a.y ?? h.pos.y) + 2);
      h.angle = Math.atan2(b.x - a.x, b.z - a.z); h.vel.set(0, 0); };
  };
  const around = (x, z, r, y) => loop([{ x: x - r, z: z - r, y }, { x: x + r, z: z - r, y }, { x: x + r, z: z + r, y }, { x: x - r, z: z + r, y }], 1.2);
  const inRoom = (id, label) => { let w = null; return { id: label, label: `${label}: ${id} from its arrival point, walking, camera turning`,
    setup: () => { G.enterRoom(id, null, true, true); B.camera(); G.camRig.yaw = Math.PI / 4; w = null; },
    drive: (t, dt) => { G.doorCool = Math.max(G.doorCool || 0, 0.5); const p = G.hero.pos; w ??= around(p.x, p.z, 1.5, p.y); w(t); G.camRig.yaw += dt * 0.35; } }; };
  const Y = G.story.chapters[0].home.parts.yard;
  const yard = (() => { const w = around(Y.x + 2.5, Y.z + 1.5, 2.0); return { id: 'yard', label: 'The yard (the opening tutorial: Zoé, the tap, the barrels), walking, camera turning',
    setup: () => { G.exitRoom({ x: Y.x + 2.5, z: Y.z + 1.5, a: 0 }, true, true); B.camera(); G.camRig.yaw = Math.PI / 4; },
    drive: (t, dt) => { G.doorCool = Math.max(G.doorCool || 0, 0.5); w(t); G.camRig.yaw += dt * 0.35; } }; })();
  // Citadel ⇄ Zeelich: every 4 s the other one (the arrival's preparation behind the black each time)
  const zarr = { id: 'zarrival', label: 'Arriving at Zeelich from Citadel and back, every 4 s',
    setup: () => { G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); B.camera(); },
    drive: (() => { let next = 0, k = 0; return (t) => { if (t < 0.05) { next = 0; k = 0; } if (t < next || G.trans) return; next = t + 4;
      if (k++ % 2 === 0) { G.hud?._bases?.delete('zeelich'); G.enterRoom('zeelich', null, false, true); } else { G.hud?._bases?.delete('citadel'); G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); } }; })() };
  const extra = [yard, inRoom('zeelich', 'zeelich'), inRoom('ballastra', 'ballastra'), inRoom('c3core', 'finale'), zarr];
  B.routes = () => [...orig(), ...extra];
});
const res = { boot, quality: Q, window: [W, H], pacing: null, visits: {} };
console.log('pacing: routes', ROUTES.join(','), 'at 60 and 30, measure', MEASURE, 's each');
res.pacing = await page.evaluate(({ ROUTES, MEASURE }) => game.bench.runPacing({ routes: ROUTES, limits: [60, 30], measure: MEASURE }), { ROUTES, MEASURE });
console.log(res.pacing);
for (const L of [60, 30]) {
  console.log(`visits at ${L}: street, zarrival — cold then ${CYCLES} cycles`);
  const txt = await page.evaluate(async ({ L, CYCLES }) => { game.benchCapMs = 1000 / L; game._due = 0; const r = await game.bench.visits({ routes: ['street', 'zarrival'], cycles: CYCLES, sustainS: 0, coldS: 8, repeatS: 12 }); game.benchCapMs = 0; return r; }, { L, CYCLES });
  res.visits[L] = typeof txt === 'string' ? txt : JSON.stringify(txt);
  console.log(res.visits[L]);
}
res.errors = errs.slice(0, 20);
fs.writeFileSync(path.join(OUT, 'p79-perf.json'), JSON.stringify(res, null, 1));
console.log('errors', JSON.stringify(res.errors));
await browser.close();
