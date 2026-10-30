// triangles and draws per group and pass in one frame (battery Medium); shadow cache live
const G = game, R = G.renderer, r = R.renderer;
G.settings.qualityAuto = false; G.settings.quality = 'medium'; G.applySettings();
G.setBattery(window.__BAT !== false);
G.warmGraphics(); await R.precompile();
const scene = window.__SCENE || 'street';
if (scene === 'street') { G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }
else if (scene === 'interior') G.enterRoom('house', null, true, true);
else if (scene === 'hamalayi') { G.enterRoom('hamalayi', null, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }
G.testFreeze = false;
for (let i = 0; i < 4; i++) { G.step(0.05); R.render(); }
const charRoots = new Set();
for (const a of [G.hero, ...(G.npcs || []), ...(G.enemies || [])]) { const root = a?.rig?.root || a?.group || a?.mesh; if (root) charRoots.add(root); }
const under = (o, S) => { for (let p = o; p; p = p.parent) if (S.has(p)) return true; return false; };
const E = G.env;
const groupOf = (o, m) => {
  if (o.name === 'terrain') return 'terrain';
  if (o === E.water) return 'water';
  if (o === E.clouds || o === E.rain) return 'sky';
  if (o.isSkinnedMesh || under(o, charRoots)) return 'characters';
  if (o.name === 'lodBatch') return 'trees/bushes/rocks';
  if (o.name === 'smallPool') return 'grass/flowers';
  if (o.name === 'softParticles' || o.name === 'blobBatch' || o.isPoints) return 'particles/blobs';
  if (m.transparent) return 'other transparent';
  if (o.name === 'drawBatch' || o.name === 'merged') return 'static scenery (batched/merged)';
  return 'other opaque';
};
const by = {};
const orig = r.renderBufferDirect.bind(r);
r.renderBufferDirect = (camera, sc, geometry, material, object, group) => {
  const pass = sc === null ? 'shadow' : 'main', g = groupOf(object, material);
  const idx = geometry.index, full = idx ? idx.count : geometry.attributes.position?.count || 0;
  let n;
  if (object.isBatchedMesh) { n = 0; const C = object._multiDrawCounts; for (let i = 0; i < object._multiDrawCount; i++) n += C[i]; }
  else n = (group ? group.count : full) * (object.isInstancedMesh ? object.count : 1);
  const B = (by[pass + ' · ' + g] ??= { draws: 0, tris: 0, skinned: 0, vs: new Set() }); B.draws++; B.tris += n / 3; if (object.isSkinnedMesh) B.skinned++;
  return orig(camera, sc, geometry, material, object, group);
};
r.shadowMap.needsUpdate = true;
G.step(0.05); R.render();
r.renderBufferDirect = orig;
for (const B of Object.values(by)) { B.tris = Math.round(B.tris); delete B.vs; }
return { scene, cache: G.shadowCache?.stats, groups: by };
