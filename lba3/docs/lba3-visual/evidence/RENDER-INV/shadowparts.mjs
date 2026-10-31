// RENDER-INV: the shadow pass's draws by kind and size (cost E), per situation: which casters are characters'
// small rigid parts (eyes, buttons, buckles: one draw each, smaller than a shadow-map texel), which are skinned
// bodies, which the area's static batches. Also the sun shadow's texel size.
//   GAME_URL=http://localhost:8176/ QUALITY=medium node shadowparts.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const RA = fileURLToPath(new URL('./ra.js', import.meta.url));
const quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.addScriptTag({ path: RA });
const out = await page.evaluate(() => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const R = G.renderer.renderer, res = {};
  const sun = G.env.sun, cam = sun.shadow.camera;
  const scenes = {
    street: () => { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); r.drive(2, 1 / 30); },
    combat: () => { const r = G.bench.routes().find((x) => x.id === 'combat'); r.setup(); },
    harbour: () => { G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; },
    zeelich: () => G.enterRoom('zeelich', null, true, true),
    house: () => G.enterRoom('house', null, true, true),
  };
  for (const [k, f] of Object.entries(scenes)) {
    G.state = 'play'; f(); G.state = 'play';
    for (let i = 0; i < 10; i++) G.frame(1 / 30, i % 5 === 4);
    const rows = new Map(); const add = (key, tris) => { const r = rows.get(key) || { n: 0, tris: 0 }; r.n++; r.tris += tris; rows.set(key, r); };
    const orig = R.renderBufferDirect;
    R.renderBufferDirect = function (c, scene, geo, mat, obj, grp) {
      if (scene === null) {
        const area = RA.areaOf(obj), actor = area.startsWith('actor');
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        const r = (geo.boundingSphere?.radius || 0) * obj.matrixWorld.getMaxScaleOnAxis();
        const kind = obj.userData.shadowProxy ? 'static batch' : obj.isSkinnedMesh ? 'skinned body' : obj.isInstancedMesh ? 'instanced' : obj.isBatchedMesh ? 'batched' : actor ? (r < 0.1 ? 'actor part < 10 cm' : r < 0.25 ? 'actor part 10–25 cm' : 'actor part ≥ 25 cm') : (r < 0.25 ? 'static piece < 25 cm' : 'static piece');
        add(kind, (grp ? grp.count : geo.index ? geo.index.count : geo.attributes.position.count) / 3);
      }
      return orig.call(this, c, scene, geo, mat, obj, grp);
    };
    G.frame(1 / 30, true);
    R.renderBufferDirect = orig;
    const w = cam.right - cam.left, texel = w / sun.shadow.mapSize.x;
    res[k] = { shadowCalls: [...rows.values()].reduce((s, r) => s + r.n, 0), texelCm: +(texel * 100).toFixed(1), rows: Object.fromEntries([...rows].sort((a, b) => b[1].n - a[1].n).map(([k2, v]) => [k2, { n: v.n, tris: Math.round(v.tris) }])) };
  }
  return res;
});
console.log(JSON.stringify({ quality, out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
