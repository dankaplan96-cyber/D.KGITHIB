// PERF-ARRIVAL: what one frame of an area submits on the arrival route's view (the benchmark's free camera, from the
// area's spawn), grouped by the area's top-level part (and the next level), object kind and pass.
//   GAME_URL=http://localhost:8177/ QUALITY=high AREAS=zeelich,desert node areawho.mjs
import { launch, open } from '../../../tests/lib/boot.mjs';
const Q = process.env.QUALITY || 'high', AREAS = (process.env.AREAS || 'zeelich').split(','), TOP = +(process.env.TOP || 40);
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
await open(page, '?nocine');
const out = await page.evaluate(({ AREAS, TOP }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const W = G.renderer.renderer, res = {};
  const route = G.bench.routes().find((x) => x.id === 'arrival'); route.setup();   // (the benchmark's camera)
  for (const id of AREAS) {
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(id, null, true, true);
    G.state = 'play';
    for (let i = 0; i < 4; i++) G.frame(1 / 30, true);
    const root = G.room?.group || G.world.root;
    const by = new Map(), kinds = new Map(); let calls = 0, shadow = 0;
    const part = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(x); const i = p.indexOf(root); if (i < 0) return 'outside the area: ' + (p[p.length - 1]?.name || p[p.length - 1]?.type || '?') + ' / ' + (p[p.length - 2]?.name || p[p.length - 2]?.type || ''); const a = p[i - 1], b = p[i - 2]; const nm = (x) => x ? (x.name || x.userData?.src || x.type) + (x.isMesh ? '' : `[${x.children.length}]`) : ''; return nm(a) + (b ? ' / ' + nm(b) : ''); };
    const orig = W.renderBufferDirect;
    W.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
      const pass = scene ? 'main' : 'shadow'; calls++; if (!scene) shadow++;
      const kind = obj.userData.shadowProxy ? 'shadowBatch' : obj.userData.drawBatch ? 'drawBatch' : obj.isSkinnedMesh ? 'skinned' : obj.isBatchedMesh ? 'batched' : obj.isInstancedMesh ? 'instanced' : obj.isPoints ? 'points' : obj.isLine ? 'line' : obj.isSprite ? 'sprite' : mat.transparent ? 'mesh(transparent)' : 'mesh';
      const k = pass + ' | ' + part(obj);
      const e = by.get(k) || { n: 0, tris: 0, kinds: {} }; e.n++; e.kinds[kind] = (e.kinds[kind] || 0) + 1;
      e.tris += (grp ? grp.count : geo.index ? geo.index.count : geo.attributes.position?.count || 0) / 3 * (obj.isInstancedMesh ? obj.count : 1);
      by.set(k, e); kinds.set(pass + ' ' + kind, (kinds.get(pass + ' ' + kind) || 0) + 1);
      return orig.call(this, cam, scene, geo, mat, obj, grp);
    };
    G.perf.beginFrame(); G.frame(1 / 30, true);
    W.renderBufferDirect = orig;
    res[id] = { calls, shadow, info: W.info.render.calls, kinds: Object.fromEntries([...kinds].sort((a, b) => b[1] - a[1])), parts: [...by].sort((a, b) => b[1].n - a[1].n).slice(0, TOP).map(([k, e]) => `${String(e.n).padStart(4)} calls ${String(Math.round(e.tris / 1000)).padStart(5)}k tris  ${k}  ${JSON.stringify(e.kinds)}`),
      hero: { x: +G.hero.pos.x.toFixed(1), z: +G.hero.pos.z.toFixed(1) }, cam: { x: +G.camera.position.x.toFixed(1), y: +G.camera.position.y.toFixed(1), z: +G.camera.position.z.toFixed(1) } };
  }
  return res;
}, { AREAS, TOP });
for (const [id, r] of Object.entries(out)) {
  console.log(`\n=== ${id} (${Q}): ${r.calls} calls (shadow ${r.shadow}), hero ${JSON.stringify(r.hero)} camera ${JSON.stringify(r.cam)}`);
  console.log('kinds', JSON.stringify(r.kinds));
  for (const l of r.parts) console.log('  ' + l);
}
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await browser.close();
