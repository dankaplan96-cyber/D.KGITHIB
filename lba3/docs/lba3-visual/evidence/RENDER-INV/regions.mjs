// RENDER-INV: every region's steady frame, before/after the draw batches and the lamp skip, at one preset, in one
// page (the same frozen frame each way). Per view: draw calls (main + shadow), the render submission CPU (GPU queue
// drained first; median of N) with the draw batches off and on, and SwiftShader's raster time (wall time to finish the
// frame minus the submission: a PROXY for GPU pixel/vertex work, not the laptop's) with the lamp skip off and on.
//   GAME_URL=http://localhost:8176/ QUALITY=medium N=7 [VIEWS=...] node regions.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 7);
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, camera: 'free', res: 'full' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.renderer.setAutoRes(false); });
const all = [
  { id: 'citadel street', x: -42, z: 2, yaw: 2.2 }, { id: 'citadel harbour', x: -70, z: -4, yaw: 1.6 }, { id: 'citadel house door', x: -45, z: 76, yaw: 0.8 },
  { id: 'house', room: 'house', yaw: 0.8 }, { id: 'workshop', room: 'workshop', yaw: 0.8 }, { id: 'well', room: 'well', yaw: 0.8 }, { id: 'office', room: 'office', yaw: 0.8 },
  { id: 'zeelich', room: 'zeelich', yaw: 2.0 }, { id: 'desert', room: 'desert', yaw: 1.0 }, { id: 'hamalayi', room: 'hamalayi', yaw: 3.5 },
  { id: 'isle otringal', room: 'isle_otringal', yaw: 0.5 }, { id: 'isle tralu', room: 'isle_tralu', yaw: 0.5 }, { id: 'isle liftdock', room: 'isle_liftdock', yaw: 0.5 },
  { id: 'underground c3deep', room: 'c3deep', yaw: 0.8 },
];
const want = process.env.VIEWS?.split(',');
const out = { quality, N, load: os.loadavg()[0], rows: {} };
for (const v of all.filter((x) => !want || want.includes(x.id))) {
  out.rows[v.id] = await page.evaluate(async ({ v, N }) => {
    const G = game, R = G.renderer, W = R.renderer, gl = W.getContext(), px = new Uint8Array(4);
    if (v.room) { if (!G.rooms[v.room]) return { skipped: 'no such room' }; G.enterRoom(v.room, null, true, true); } else G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true);
    G.state = 'play';
    G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
    for (let i = 0; i < 30; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, i % 10 === 9); }
    const drawn = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); G.perf.beginFrame(); const t0 = performance.now(); R.render(); const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return { sub: t1 - t0, all: performance.now() - t0, calls: W.info.render.calls, shadow: G.perf.shadow }; };
    const med = (a, k) => { const s = a.map((x) => x[k]).sort((x, y) => x - y); return +s[s.length >> 1].toFixed(1); };
    const run = () => { drawn(); drawn(); const a = []; for (let i = 0; i < N; i++) a.push(drawn()); return { calls: med(a, 'calls'), shadow: med(a, 'shadow'), submitMs: med(a, 'sub'), rasterMs: +(med(a, 'all') - med(a, 'sub')).toFixed(1) }; };
    const res = {};
    G.drawBatch.enabled = false; res.batchesOff = run();
    G.drawBatch.enabled = true; res.batchesOn = run();
    res.batchStats = G.drawBatch.areas.get(G.room?.group || G.world.root)?.stats();
    // the lamp skip off (three's own lights chunk), every material recompiled, then back on
    const C = (await import(new URL('vendor/three/build/three.module.min.js', location.href).href)).ShaderChunk;
    const on = C.lights_fragment_begin, off = on.replace(/\t\t#ifndef TOON\n\t\tif \( directLight\.visible \)\n\t\t#endif\n/g, '');
    const recompile = () => G.scene.traverse((o) => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; });
    C.lights_fragment_begin = off; recompile(); res.lampSkipOff = run();
    C.lights_fragment_begin = on; recompile(); res.lampSkipOn = run();
    let lit = 0; for (const l of G.lightPool.lights) if (l.intensity > 0) lit++; res.lampsLit = `${lit} of ${G.lightPool.lights.length}`;
    return res;
  }, { v, N });
  console.error('done', v.id);
}
out.loadAfter = os.loadavg()[0]; out.errors = errs.slice(0, 5);
console.log(JSON.stringify(out, null, 1));
await browser.close();
