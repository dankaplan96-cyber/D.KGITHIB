// what a full static-shadow-cache build draws (street, Medium battery), against the live pass
const G = game, R = G.renderer, r = R.renderer, C = G.shadowCache;
G.settings.qualityAuto = false; G.settings.quality = 'medium'; G.applySettings(); G.setBattery(true);
G.warmGraphics(); await R.precompile();
G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; G.step(1.5);
const frame = () => { G.shadowCull.update(G.room?.group || G.world.root, G.camera, G.hero.pos); R.render(); };
frame(); frame();
let cnt = null;
const orig = r.renderBufferDirect.bind(r);
r.renderBufferDirect = (camera, sc, geometry, material, object, group) => {
  if (cnt && sc === null) {
    const idx = geometry.index, full = idx ? idx.count : geometry.attributes.position?.count || 0;
    let n; if (object.isBatchedMesh) { n = 0; const K = object._multiDrawCounts; for (let i = 0; i < object._multiDrawCount; i++) n += K[i]; } else n = (group ? group.count : full) * (object.isInstancedMesh ? object.count : 1);
    const k = (object.name || object.type) + (object.isBatchedMesh ? '[b]' : object.isInstancedMesh ? '[i]' : '');
    const B = (cnt[k] ??= { draws: 0, tris: 0 }); B.draws++; B.tris += Math.round(n / 3);
  }
  return orig(camera, sc, geometry, material, object, group);
};
const d0 = C.draw.bind(C);
const builds = [];
C.draw = function (...a) { const prev = cnt; cnt = {}; const t = performance.now(); const x = d0(...a); builds.push({ ms: +(performance.now() - t).toFixed(1), byObj: cnt }); cnt = prev; return x; };
const live = {}; cnt = live; C.drop(); frame(); cnt = null;
C.draw = d0; r.renderBufferDirect = orig;
const sum = (o) => Object.values(o).reduce((a, b) => ({ draws: a.draws + b.draws, tris: a.tris + b.tris }), { draws: 0, tris: 0 });
const top = (o) => Object.entries(o).sort((a, b) => b[1].tris - a[1].tris).slice(0, 10).map(([k, v]) => `${k} ${v.draws}/${v.tris}`);
return { stats: C.stats, statics: C.statics(C.area()).length, cacheN: C.cache?.n, builds: builds.map((b) => ({ ms: b.ms, total: sum(b.byObj), top: top(b.byObj) })), live: { total: sum(live), top: top(live) } };
