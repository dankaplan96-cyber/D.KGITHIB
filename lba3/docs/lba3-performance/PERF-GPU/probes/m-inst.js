// instanced / batched / big draws in a heavy Follow view: what they are, tris per instance, instances by distance
const G = game, R = G.renderer, r = R.renderer;
const { gpuGroupOf } = await import('./src/engine/benchgpu.js');
const THREE_ = await import('three');
G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.camRig.setMode('follow'); G.camRig.setFollowDistance?.('far');
G.settings.qualityAuto = true;
G.autoQ.gov.setProfile(1, 'probe', { phase: 'hold', commitNow: true, t: 0 }); G.autoQ.applyAll();
G.setBattery(true); G.autoQ.applyAll(); G.warmGraphics(); await R.precompile();
const spot = { x: -70, z: 20, a: Math.PI / 2 };
G.exitRoom({ x: spot.x, z: spot.z, a: spot.a }, true, true); G.hero.angle = spot.a; G.camRig.snap?.();
for (let i = 0; i < 40; i++) G.step(0.05);
const frame = () => { G.shadowCull.update(G.room?.group || G.world.root, G.camera, G.hero.pos); R.render(); };
frame(); frame();
const cam = G.camera.position.clone(), m4 = new THREE_.Matrix4(), v = new THREE_.Vector3();
const path = (o) => { const p = []; for (let q = o; q && p.length < 4; q = q.parent) p.push(q.name || q.type); return p.reverse().join('/'); };
const rows = [];
const orig = r.renderBufferDirect.bind(r);
r.renderBufferDirect = (camera, sc, geometry, material, object, group) => {
  if (sc !== null) {
    const idx = geometry.index, per = (group ? group.count : idx ? idx.count : geometry.attributes.position.count) / 3;
    if (object.isInstancedMesh) {
      const d = []; for (let i = 0; i < object.count; i++) { object.getMatrixAt(i, m4); v.setFromMatrixPosition(m4).applyMatrix4(object.matrixWorld); d.push(v.distanceTo(cam)); }
      d.sort((a, b) => a - b);
      rows.push({ k: 'inst', name: path(object), g: gpuGroupOf(G, object, material), per: Math.round(per), n: object.count, tris: Math.round(per * object.count), dist: [d[0], d[d.length >> 1], d[d.length - 1]].map((x) => +x?.toFixed(0)), beyond30: d.filter((x) => x > 30).length, beyond45: d.filter((x) => x > 45).length });
    } else if (object.isBatchedMesh) {
      let n = 0; const K = object._multiDrawCounts; for (let i = 0; i < object._multiDrawCount; i++) n += K[i];
      rows.push({ k: 'batched', name: path(object), g: gpuGroupOf(G, object, material), draws: object._multiDrawCount, tris: Math.round(n / 3) });
    } else if (per > 4000) {
      geometry.computeBoundingSphere?.(); const s = geometry.boundingSphere.clone().applyMatrix4(object.matrixWorld);
      rows.push({ k: 'mesh', name: path(object), g: gpuGroupOf(G, object, material), tris: Math.round(per), dist: +s.center.distanceTo(cam).toFixed(0), r: +s.radius.toFixed(0) });
    }
  }
  return orig(camera, sc, geometry, material, object, group);
};
frame();
r.renderBufferDirect = orig;
// tree batches: triangles of a detailed and a coarse sculpt
const { LOD_BATCHES } = await import('./src/game/kit.js');
const tb = LOD_BATCHES.filter((L) => L.mesh?.visible).map((L) => { const bm = L.mesh; const geo = new Set(); const sizes = {}; for (const I of L.inst) { for (const id of [I.hi, I.lo]) if (id >= 0 && !geo.has(id)) { geo.add(id); const info = bm._geometryInfo?.[id]; if (info) sizes[id] = Math.round((info.indexCount ?? info.vertexCount) / 3); } } return { inst: L.inst.length, sizes }; });
return { rows: rows.sort((a, b) => b.tris - a.tris).slice(0, 30), treeBatches: tb };
