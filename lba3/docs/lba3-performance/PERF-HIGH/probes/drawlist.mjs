// every draw of one frame (the route's heaviest sampled frame): pass, kind, nearest names, distance, tris, px radius
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, cam, n }) => {
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  const kind = (o) => o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'inst' : o.isBatchedMesh ? 'batched' : o.userData?.shadowProxy ? 'shadowbatch' : o.userData?.drawBatch ? 'drawbatch' : o.isMesh ? 'mesh' : o.type;
  const names = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) if (x.name) p.push(x.name); return p.slice(0, 3).join('<') || o.type; };
  let cur = null; const rbd = R.renderBufferDirect, cp = new G.camera.position.constructor(), v = new G.camera.position.constructor();
  R.renderBufferDirect = function (c, sc, geometry, material, object, group) {
    if (cur) {
      const g = geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      v.copy(g.boundingSphere?.center || v.set(0, 0, 0)).applyMatrix4(object.matrixWorld);
      const d = v.distanceTo(cp), rad = (g.boundingSphere?.radius || 0) * object.matrixWorld.getMaxScaleOnAxis();
      const tris = group ? group.count / 3 : (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
      cur.push({ p: sc === null ? 'S' : 'M', k: kind(object), n: names(object), m: material.type + (material.name ? '/' + material.name : ''), d: +d.toFixed(0), r: +rad.toFixed(1), px: +(rad * 768 / 2 / Math.tan(0.48) / Math.max(1, d)).toFixed(1), tris: (tris * (object.isInstancedMesh ? object.count : 1)) | 0, inst: object.isInstancedMesh ? object.count : 0 });
    }
    return rbd.apply(this, arguments);
  };
  let best = null, t = 0;
  for (let i = 0; i < n; i++) {
    t += 1 / 30; route.drive(t, 1 / 30);
    const draw = i > 20 && i % 10 === 0;
    cur = draw ? [] : null; cp.copy(G.camera.position);
    G.frame(1 / 30, draw);
    if (draw) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); if (!best || cur.length > best.length) best = cur; }
  }
  R.renderBufferDirect = rbd; cur = null;
  return best;
}, { id: ID, cam: process.env.CAM || '', n: +(process.env.N || 400) });
const agg = new Map();
for (const x of r) { const k = `${x.p} ${x.k.padEnd(11)} ${x.n}`; const a = agg.get(k) || { c: 0, tris: 0, dmin: 1e9, dmax: 0, pxmin: 1e9 }; a.c++; a.tris += x.tris; a.dmin = Math.min(a.dmin, x.d); a.dmax = Math.max(a.dmax, x.d); a.pxmin = Math.min(a.pxmin, x.px); agg.set(k, a); }
console.log(`draws ${r.length} (M ${r.filter((x) => x.p === 'M').length}, S ${r.filter((x) => x.p === 'S').length}) tris ${(r.reduce((s, x) => s + x.tris, 0) / 1000).toFixed(0)}k`);
for (const [k, a] of [...agg].sort((x, y) => y[1].c - x[1].c)) console.log(String(a.c).padStart(4), k, `tris ${(a.tris / 1000).toFixed(1)}k d ${a.dmin}-${a.dmax} m minpx ${a.pxmin}`);
if (process.env.ALL) for (const x of r) console.log(JSON.stringify(x));
await browser.close();
