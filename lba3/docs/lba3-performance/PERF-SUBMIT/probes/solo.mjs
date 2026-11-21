// PERF-SUBMIT: the live shadow pass's draws on a route (the casters drawn every frame besides the static cache): per
// object, frames drawn, whether it moved (world matrix) during the run, its radius, why shadowcull left it on its own
// (kept by a builder, not batchable, left its batch), its path.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street FRAMES=120 node solo.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 120);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, FR }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  let t = 0;
  for (let i = 0; i < 240; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  const SC = G.shadowCache, live = SC.live; let inLive = false;
  SC.live = function (...a) { inLive = true; try { return live.apply(this, a); } finally { inLive = false; } };
  const seen = new Map(), rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o) {
    if (sc === null && inLive) { let E = seen.get(o); if (!E) seen.set(o, (E = { n: 0, m0: o.matrixWorld.clone(), moved: false })); E.n++; if (!o.matrixWorld.equals(E.m0)) E.moved = true; }
    return rbd.apply(this, arguments);
  };
  for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.perf.beginFrame(); G.frame(1 / 60, true); }
  R.renderBufferDirect = rbd; SC.live = live;
  const A = G.shadowCull.area, solo = new Map((A?.solo || []).map((C) => [C.o, C]));
  const keep = (o) => { for (let p = o; p; p = p.parent) if (p.userData?.keep) return true; return false; };
  const path = (o) => { const p = []; for (let x = o; x && !x.isScene && p.length < 4; x = x.parent) p.push(x.name || x.type); return p.reverse().join('/'); };
  return [...seen].sort((a, b) => b[1].n - a[1].n).map(([o, E]) => { const C = solo.get(o); const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const r = g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
    return `${(E.n / FR).toFixed(2)} a frame · ${E.moved ? 'MOVED' : 'still'} · r ${r.toFixed(1)} m · ${o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : o.isBatchedMesh ? 'batched' : C ? (C.left || C.solo ? 'left its batch' : keep(o) ? 'kept (builder)' : 'not batchable') : 'not in shadowcull'} · ${path(o)} [${o.material?.type}${o.material?.alphaTest ? ' alphaTest' : ''}]`; });
}, { id: ID, FR });
console.log(`PERF-SUBMIT live shadow casters · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · ${FR} frames`);
for (const l of r) console.log('  ' + l);
await browser.close();
