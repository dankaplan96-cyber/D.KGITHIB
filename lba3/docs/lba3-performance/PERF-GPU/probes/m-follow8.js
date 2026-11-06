// the Follow camera at Far on Citadel's street (the user's play view), Auto Medium on battery: draws, triangles and
// shaded fragments per group and per distance band
const G = game, R = G.renderer, r = R.renderer, gl = r.getContext();
const { gpuGroupOf } = await import('./src/engine/benchgpu.js');
G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.camRig.setMode('follow'); G.camRig.setFollowDistance?.('far');
G.settings.qualityAuto = true;
G.autoQ.gov.setProfile(window.__P ?? 1, 'probe', { phase: 'hold', commitNow: true, t: 0 }); G.autoQ.applyAll();
G.setBattery(true); G.autoQ.applyAll(); G.warmGraphics(); await R.precompile();
const views = [];
const { LOD_BATCHES } = await import('./src/game/kit.js');
const THREE_ = await import('three');
for (const spot of [{x:-42,z:2,a:0},{x:-42,z:2,a:Math.PI/2},{x:-42,z:2,a:Math.PI},{x:-42,z:2,a:-Math.PI/2},{x:-40,z:40,a:0},{x:-40,z:40,a:Math.PI},{x:-70,z:20,a:Math.PI/2},{x:-20,z:-10,a:-Math.PI/2}]) {

G.exitRoom({ x: spot.x, z: spot.z, a: spot.a }, true, true); G.hero.angle = spot.a;
G.camRig.snap?.();
for (let i = 0; i < 40; i++) G.step(0.05);
const frame = () => { G.shadowCull.update(G.room?.group || G.world.root, G.camera, G.hero.pos); R.render(); };
frame(); frame();
const cam = G.camera.position.clone();
const by = {}, band = (d) => (d < 30 ? '<30' : d < 60 ? '30-60' : d < 100 ? '60-100' : '100+');
const _v = new THREE_.Vector3(), _s = new THREE_.Sphere();
const orig = r.renderBufferDirect.bind(r);
r.renderBufferDirect = (camera, sc, geometry, material, object, group) => {
  const pass = sc === null ? 'shadow' : 'main', g = gpuGroupOf(G, object, material);
  const idx = geometry.index, full = idx ? idx.count : geometry.attributes.position?.count || 0;
  let n;
  if (object.isBatchedMesh) { n = 0; const K = object._multiDrawCounts; for (let i = 0; i < object._multiDrawCount; i++) n += K[i]; }
  else n = (group ? group.count : full) * (object.isInstancedMesh ? object.count : 1);
  let d = -1;
  if (!object.isBatchedMesh && !object.isInstancedMesh && geometry.boundingSphere) { _s.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld); d = _s.center.distanceTo(cam); }
  const k = `${pass} · ${g}${d >= 0 ? ' · ' + band(d) : ' · (instanced)'}`;
  const B = (by[k] ??= { draws: 0, tris: 0 }); B.draws++; B.tris += Math.round(n / 3);
  return orig(camera, sc, geometry, material, object, group);
};
r.info.reset(); frame();
r.renderBufferDirect = orig;
const tot = (pass) => Object.entries(by).filter(([k]) => k.startsWith(pass)).reduce((a, [, v]) => ({ draws: a.draws + v.draws, tris: a.tris + v.tris }), { draws: 0, tris: 0 });
// the trees' instances by distance (kit.js LodBatch: detailed within LOD near, coarse beyond)

const trees = {};
for (const L of LOD_BATCHES) { if (!L.mesh?.visible) continue; for (const I of L.inst || []) { const d = Math.hypot(I.x - cam.x, I.z - cam.z); const k = band(d) + (I.near ? ' detailed' : ' coarse'); trees[k] = (trees[k] || 0) + 1; } }
views.push({ spot, cam: cam.toArray().map((v) => +v.toFixed(1)), hero: [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(1)), fog: [G.scene.fog?.near, G.scene.fog?.far], calls: r.info.render.calls, tris: r.info.render.triangles, main: tot('main'), shadow: tot('shadow'),
  groups: Object.fromEntries(Object.entries(by).sort((a, b) => b[1].tris - a[1].tris)), treeInstances: trees, detail: G.world?.detail });

}
return views.map((v) => ({ spot: [v.spot.x, v.spot.z, +v.spot.a.toFixed(2)], calls: v.calls, tris: v.tris, main: v.main, shadow: v.shadow, top: Object.entries(v.groups).slice(0, 6).map(([k, x]) => `${k} ${x.draws}/${x.tris}`), trees: v.treeInstances }));
