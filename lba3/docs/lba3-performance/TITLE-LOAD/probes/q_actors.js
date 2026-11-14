(async () => {
  // TITLE-LOAD: the people drawn in the title's view (main pass): per actor root, its draws and triangles, its distance
  // from the camera and its view depth, its height on screen in pixels; and the characters' draws that belong to no
  // actor root (W_T: title seconds, default 73.3)
  const G = game, R = G.renderer.renderer, RR = G.renderer, W = G.world;
  const THREE = await import('three');
  const { gpuGroupOf } = await import('/src/engine/benchgpu.js');
  const s = +(window.T || 73.3);
  G.time = s; G.titleCamera(0); G.camera.position.copy(G.camRig.override.pos); G.camera.lookAt(G.camRig.override.look); G.camera.updateMatrixWorld();
  W.updateLod(G.camera.position); G.lightPool.update(G.camera.position, G.time); G.shadowCull.update(G.world.root, G.camera, G.hero.pos);
  const roots = new Map();
  for (const [kind, L] of [['hero', [G.hero]], ['npc', G.npcs], ['enemy', G.enemies], ['pet', G.pets || []], ['dog', G.dogs || []]]) for (const a of L || []) { const r = a?.rig?.root || a?.group || a?.mesh; if (r) roots.set(r, { kind, id: a.id || a.def?.id || a.name || '?', a }); }
  const per = new Map(), loose = new Map();
  const cp = G.camera.position, pxK = innerHeight / (2 * Math.tan((G.camera.fov * Math.PI) / 360));
  const rbd = R.renderBufferDirect; let on = false;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (on && scene === G.scene && gpuGroupOf(G, obj, mat) === 'characters') {
      const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0, t = (Math.min(c, geo.drawRange.count) / 3) * (obj.isInstancedMesh ? obj.count : 1);
      let r = null; for (let p = obj; p; p = p.parent) if (roots.has(p)) { r = p; break; }
      if (r) { const e = per.get(r) || { calls: 0, tris: 0, skinned: 0 }; e.calls++; e.tris += t; if (obj.isSkinnedMesh) e.skinned += t; per.set(r, e); }
      else { let n = []; for (let p = obj; p && n.length < 4; p = p.parent) n.push(p.name || p.type); const k = n.join('<'); const e = loose.get(k) || [0, 0]; e[0]++; e[1] += t; loose.set(k, e); }
    }
    return rbd.apply(this, arguments);
  };
  RR.render(); on = true; RR.render(); on = false; R.renderBufferDirect = rbd;
  const _v = new THREE.Vector3(), out = [];
  const rows = [...per].map(([r, e]) => { const I = roots.get(r); r.getWorldPosition(_v); const d = _v.distanceTo(cp); const vd = -_v.clone().applyMatrix4(G.camera.matrixWorldInverse).z; return { ...I, ...e, d, vd, px: (1.8 * pxK) / d }; }).sort((a, b) => b.tris - a.tris);
  out.push(`title t ${s} s: ${rows.length} actors drawn, ${rows.reduce((a, r) => a + r.calls, 0)} calls, ${(rows.reduce((a, r) => a + r.tris, 0) / 1000).toFixed(1)}k triangles; loose character draws ${[...loose.values()].reduce((a, e) => a + e[0], 0)} calls ${([...loose.values()].reduce((a, e) => a + e[1], 0) / 1000).toFixed(1)}k`);
  for (const r of rows) out.push(`  ${r.kind} ${r.id}: ${r.calls} calls ${(r.tris / 1000).toFixed(1)}k (skinned ${(r.skinned / 1000).toFixed(1)}k) · ${r.d.toFixed(0)} m away, view depth ${r.vd.toFixed(0)} m · ~${r.px.toFixed(1)} px tall`);
  for (const [k, e] of [...loose].sort((a, b) => b[1][1] - a[1][1])) out.push(`  loose: ${k} ${e[0]} calls ${(e[1] / 1000).toFixed(1)}k`);
  return out.join('\n');
})()
