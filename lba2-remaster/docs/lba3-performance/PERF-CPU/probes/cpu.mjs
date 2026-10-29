// PERF-CPU: the main thread's work per drawn frame on a benchmark route, split by section (inclusive ms, median and
// p90 over the frames). SwiftShader's GL work runs in the GPU process and is drained (readPixels) before each timed
// frame, so the numbers are the renderer process's JavaScript + command submission only. Relative (before/after on the
// same machine), never a laptop figure.
//   GAME_URL=http://localhost:8213/ Q=low BATTERY=1 ROUTE=street FRAMES=120 CAM=follow node cpu.mjs
//   OPT='js' runs that code in the page before measuring (async; the A/B switches of PERF-CPU), e.g.
//   OPT="(await import('/src/engine/drawcull.js')).MW.cached = false"
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 120), W = +(process.env.W || 1366), H = +(process.env.H || 768);
const { browser, page } = await launch({ width: W, height: H });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(({ id, cam }) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  window.__route = route; window.__t = 0;
  // warm: 4 s of simulation, drawn every 6th step (first builds, map, programs)
  for (let i = 0; i < 240; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 6 === 0); }
  // timing wrappers (inclusive ms per frame, keyed)
  const T = (window.__T = {}), add = (k, v) => { T[k] = (T[k] || 0) + v; };
  const wrap = (obj, name, key) => { if (!obj || typeof obj[name] !== 'function') return; const f = obj[name]; obj[name] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { add(key, performance.now() - t0); } }; };
  wrap(G, 'updatePlay', 'sim.updatePlay');
  wrap(G.hero, 'update', 'sim.hero');
  const rigP = Object.getPrototypeOf(G.hero.rig); wrap(rigP, 'update', 'anim.rig.update');
  wrap(G.gadgets, 'updateEnemies', 'sim.enemies');
  wrap(G.camRig, 'update', 'sim.camera');
  wrap(G.world, 'update', 'sim.world.update');
  wrap(G.env, 'update', 'sim.env');
  wrap(G.lightPool, 'update', 'sim.lightPool');
  wrap(G.shadowCull, 'update', 'cull.shadowCull');
  wrap(G.hud, 'mapTick', 'sim.mapTick');
  wrap(G.particles, 'update', 'sim.particles');
  wrap(G, 'occluders', 'sim.occluders');
  wrap(G.world, 'updateLod', 'sim.updateLod');
  wrap(G.renderer, 'render', 'render.total');
  wrap(G.renderer, 'pre', 'render.pre(farCull+blobs)');
  wrap(G.renderer, 'mid', 'render.mid(drawBatch+boxCull)');
  wrap(G.renderer, 'post', 'render.post(restore)');
  wrap(G.drawBatch, 'update', 'render.mid.drawBatch');
  wrap(G.boxCull, 'hide', 'render.mid.boxCull');
  wrap(G.farCull, 'restore', 'render.post.farCull.restore');
  wrap(G.renderer.composer, 'render', 'render.composer');
  wrap(G.renderer.renderer.shadowMap, 'render', 'render.composer.shadowMap');
  // (the scene's own updateMatrixWorld is not wrapped: a wrapper would send drawcull.js's cached update down three's path)
  for (const n of G.npcs) wrap(n, 'update', 'sim.npcs');
}, { id: ID, cam: process.env.CAM || '' });
// AB_A / AB_B: code run in the page before alternate frames (A on even, B on odd): an interleaved A/B on one machine
// state, e.g. AB_A="window.__mw.cached = false; game.drawBatch.fast = false" AB_B="window.__mw.cached = true; game.drawBatch.fast = true"
// AB_BLOCK=n: A for n frames, then B for n (the first 2 of each block not counted): for switches that need a few frames
const AB = process.env.AB_A ? [process.env.AB_A, process.env.AB_B || ''] : null, BLK = +(process.env.AB_BLOCK || 1);
if (AB) await ev(async (ab) => { window.__mw = (await import('/src/engine/drawcull.js')).MW; window.__ab = ab.map((c) => new Function(c)); }, AB);
const rows = [];
for (let k = 0; k < FR; k++) {
  const r = await ev(({ k, BLK }) => {
    const G = game, R = G.renderer.renderer, gl = R.getContext();
    if (window.__ab && k % BLK === 0) window.__ab[Math.floor(k / BLK) & 1]();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
    for (const k in window.__T) window.__T[k] = 0;
    G.perf.beginFrame(); G._renderMs = 0;
    const t0 = performance.now(); G.frame(1 / 60, true); const all = performance.now() - t0;
    const T = window.__T; T['render.matrixWorld(derived)'] = (T['render.total'] || 0) - (T['render.composer'] || 0) - (T['render.pre(farCull+blobs)'] || 0) - (T['render.mid(drawBatch+boxCull)'] || 0) - (T['render.post(restore)'] || 0);
    return { all, T: { ...T }, up: G.perf.up ?? null, upKB: G.perf.upB != null ? G.perf.upB / 1024 : null, calls: R.info.render.calls, tris: R.info.render.triangles, room: G.room?.id || 'citadel' };
  }, { k, BLK });
  r.side = Math.floor(k / BLK) & 1; r.skip = BLK > 1 && k % BLK < 2;
  rows.push(r);
}
const stats = await ev(() => {
  const G = game; let n = 0, shown = 0, auto = 0;
  const walk = (o, vis) => { n++; if (vis) { shown++; if (o.matrixAutoUpdate) auto++; } for (const c of o.children) walk(c, vis && c.visible); };
  walk(G.scene, true);
  return { objects: n, shown, shownAuto: auto, npcs: G.npcs.length, enemies: G.enemies.length, cpuOpt: G.cpuOpt || null, mw: G.renderer._mw?.stats || null };
});
const keys = [...new Set(rows.flatMap((r) => Object.keys(r.T)))].sort();
const show = (rows, tag) => {
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
console.log(`PERF-CPU probe · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} · ${rows.length} frames · ${W}x${H}${process.env.OPT ? ' · opt ' + process.env.OPT : ''}${tag ? ' · ' + tag : ''}`);
console.log(`frame work: p50 ${pct(rows.map((r) => r.all), 0.5).toFixed(2)} · p90 ${pct(rows.map((r) => r.all), 0.9).toFixed(2)} · mean ${(rows.reduce((s, r) => s + r.all, 0) / rows.length).toFixed(2)} ms · calls p50 ${pct(rows.map((r) => r.calls), 0.5)} · tris ${(pct(rows.map((r) => r.tris), 0.5) / 1000).toFixed(0)}k${rows[0].up != null ? ` · uploads p50 ${pct(rows.map((r) => r.up), 0.5)} (${pct(rows.map((r) => r.upKB), 0.5).toFixed(1)} KB, p90 ${pct(rows.map((r) => r.upKB), 0.9).toFixed(1)} KB)` : ''}`);
for (const k of keys) { const v = rows.map((r) => r.T[k] || 0); console.log(`  ${k.padEnd(34)} p50 ${pct(v, 0.5).toFixed(3).padStart(7)} · p90 ${pct(v, 0.9).toFixed(3).padStart(7)} · mean ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3).padStart(7)}`); }
};
if (AB) { show(rows.filter((r) => r.side === 0 && !r.skip), 'A: ' + AB[0]); show(rows.filter((r) => r.side === 1 && !r.skip), 'B: ' + AB[1]); } else show(rows, '');
console.log('  scene', JSON.stringify(stats));
await browser.close();
