// PERF-HIGH measurement: counts per route at one quality, with the shadow pass's casters broken down by kind.
// GAME_URL=http://localhost:8205/ Q=high ROUTES=street,arrival node measure.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'high';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
if (process.env.CELL) await ev((c) => { game.shadowCull.reset(); game.drawBatch.reset(); game.shadowCull.cell = c; }, +process.env.CELL);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
for (const id of (process.env.ROUTES || 'street,arrival').split(',')) {
  const r = await ev(async ({ id, cam }) => {
    const G = game, R = G.renderer.renderer;
    const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.state = 'play';
    if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
    const kind = (o) => o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : o.isBatchedMesh ? 'batched' : o.userData?.shadowProxy ? 'shadowbatch' : o.userData?.drawBatch ? 'drawbatch' : o.isMesh ? 'mesh' : (o.type || '?');
    const owner = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); return p.slice(-3).join('<'); };
    let cur = null;
    const rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (c, sc, geometry, material, object, ...a) {
      if (cur) { const pass = sc === null ? 'S' : 'M'; const k = pass + ':' + kind(object); cur.k[k] = (cur.k[k] || 0) + 1; { const ow = pass + ' ' + owner(object); cur.o[ow] = (cur.o[ow] || 0) + 1; } }
      return rbd.call(this, c, sc, geometry, material, object, ...a);
    };
    const rows = [];
    let t = 0, first = true;
    for (let i = 0; i < 225; i++) {
      const dt = 1 / 30; t += dt;
      route.drive(t, dt);
      const draw = first || (t >= 1.5 && i % 8 === 0); first = false;
      if (draw) { const gl = R.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
      G.perf.beginFrame(); G._renderMs = 0;
      cur = draw ? { k: {}, o: {} } : null;
      const s0 = performance.now();
      G.frame(dt, draw);
      const simAll = performance.now() - s0;
      if (!draw) continue;
      if (G._renderMs > 0) rows.push({ ms: G._renderMs, sim: simAll - G._renderMs, calls: R.info.render.calls, tris: R.info.render.triangles, draws: R.info.render.calls + G.perf.sub, shadow: G.perf.shadow, k: cur.k, o: cur.o, sc: G.shadowCache ? { ...G.shadowCache.stats } : null });
    }
    R.renderBufferDirect = rbd; cur = null;
    const body = rows.slice(1);
    const med = (f) => { const v = body.map(f).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const keys = new Set(body.flatMap((x) => Object.keys(x.k)));
    const kinds = Object.fromEntries([...keys].sort().map((k) => [k, med((x) => x.k[k] || 0)]));
    const okeys = new Set(body.flatMap((x) => Object.keys(x.o)));
    const owners = Object.fromEntries([...okeys].map((k) => [k, med((x) => x.o[k] || 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 40));
    const sh = G.env.sun.shadow;
    return { calls: med((x) => x.calls), draws: med((x) => x.draws), shadow: med((x) => x.shadow), tris: med((x) => x.tris), submitMs: +med((x) => x.ms).toFixed(1), simMs: +med((x) => x.sim).toFixed(1), frames: body.length, kinds, owners,
      map: sh.mapSize.x, cache: G.shadowCache ? { enabled: G.shadowCache.enabled, stats: G.shadowCache.stats } : null, lamps: G.lightPool.lights.length,
      walkers: G.walkers ? (G.walkers.list?.length ?? Object.keys(G.walkers).length) : null };
  }, { id, cam: process.env.CAM || '' });
  console.log(`${Q}${process.env.BATTERY?' battery':''}${process.env.CAM?' cam '+process.env.CAM:''} ${id}: calls ${r.calls} · shadow ${r.shadow} · GPU draws ${r.draws} · tris ${(r.tris / 1000).toFixed(0)}k · submit ${r.submitMs} ms · sim ${r.simMs} ms · frames ${r.frames} · map ${r.map} · lamps ${r.lamps}`);
  console.log('  kinds', JSON.stringify(r.kinds));
  console.log('  shadow owners', JSON.stringify(r.owners));
  console.log('  cache', JSON.stringify(r.cache));
}
await browser.close();
