// PERF-CPU: every surface under one screen pixel of a shot.mjs view (nearly coincident faces decide by draw order):
// each hit's object, material (id, type, map size), distance, and the draw it is part of (a batch: its material id).
//   PX=665,152 Q=medium ROUTE=interior [QS=&notexarray] node ray.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'interior', T = +(process.env.T || 2);
const [PX, PY] = (process.env.PX || '665,152').split(',').map(Number);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 }).catch(() => {});
await ev(async () => { window.__THREE = await import('three'); });
const r = await ev(({ id, T, PX, PY }) => {
  const G = game, THREE = window.__THREE, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  for (let t = 0; t < T; t += 1 / 30) { route.drive(t, 1 / 30); G.frame(1 / 30, false); }
  G.frame(1 / 60, true); G.frame(0, true);
  const cv = G.renderer.renderer.domElement, rect = cv.getBoundingClientRect();
  const ndc = new THREE.Vector2(((PX - rect.left) / rect.width) * 2 - 1, -((PY - rect.top) / rect.height) * 2 + 1);
  const rc = new THREE.Raycaster(); rc.layers.enableAll(); rc.setFromCamera(ndc, G.camera);
  const scene = G.renderer.scene || G.scene;
  const hits = rc.intersectObject(scene, true).filter((h) => h.object.isMesh && !h.object.isSkinnedMesh).slice(0, 12);
  // which draw holds each hit: its own (shown on layer 0) or a batch
  const batchOf = new Map();
  for (const A of G.drawBatch.areas.values()) for (const C of A.cells.values()) if (C.mesh) for (const M of C.list) batchOf.set(M.o, { mat: C.material.id, name: C.material.name, n: C.list.length, ord: M.fold?.ord });
  return hits.map((h) => {
    const o = h.object, m = Array.isArray(o.material) ? o.material[0] : o.material, b = batchOf.get(o);
    return { d: h.distance.toFixed(4), name: o.name || o.parent?.name || o.type, ud: Object.keys(o.userData).join(','), mat: m.id, type: m.type, mname: m.name, map: m.map ? `${m.map.image?.width}x${m.map.image?.height}` : '', em: m.emissive ? m.emissive.getHexString() : '', layer0: o.layers.isEnabled(0), batch: b || null, isBatch: !!o.userData.drawBatch };
  });
}, { id: ID, T, PX, PY });
for (const h of r) console.log(JSON.stringify(h));
await browser.close();
