(async () => {
  // The main pass's draws on a route that are not draw batches, grouped by why drawbatch.js left them out (its own
  // eligibility rules, re-checked here) and by source: calls per frame and triangles.
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; for (let i = 0; i < 45; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, i % 5 === 0); }
  const BASE_OBR = THREE.Object3D.prototype.onBeforeRender;
  const root = G.room?.group || G.world.root;
  const under = (o) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  const why = (o) => {
    if (o.name === 'drawBatch') return null;
    if (o.isSkinnedMesh) return 'skinned';
    if (o.isInstancedMesh) return 'instanced';
    if (o.isBatchedMesh) return 'batchedMesh';
    if (!o.isMesh) return o.type;
    if (!under(o)) return 'not under the area root';
    if (o.castShadow) return 'casts its own shadow';
    if (!o.frustumCulled) return 'not frustum-culled';
    if (o.onBeforeRender !== BASE_OBR) return 'onBeforeRender';
    if (Array.isArray(o.material)) return 'material array';
    const m = o.material, g = o.geometry;
    if (m.transparent) return 'transparent';
    if (m.depthWrite === false) return 'no depth write';
    if (m.userData?.noBatch) return 'noBatch';
    if (m.isShaderMaterial) return 'shader material';
    if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile && !m.userData?.twin) return 'onBeforeCompile';
    if (g.attributes.tangent) return 'tangents';
    if (g.drawRange.count !== Infinity) return 'drawRange';
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return 'keep';
    if (o.userData.drawBatched) return 'batched (drawn anyway?)';
    return 'eligible but alone in its cell / left its batch';
  };
  const src = (o) => { for (let p = o; p && p !== G.scene; p = p.parent) if (p.userData?.src) return p.userData.src; let top = o; while (top.parent && top.parent !== G.scene) top = top.parent; return top.name || top.type; };
  const acc = new Map(), rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o, grp) {
    if (sc !== null) { const w = why(o); if (w) { const k = `${w} · ${src(o)}${o.name ? ' · ' + o.name : ''}`; let e = acc.get(k); if (!e) acc.set(k, (e = { n: 0, tris: 0, objs: new Set() })); e.n++; e.objs.add(o); e.tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } }
    return rbd.call(this, c, sc, g, m, o, grp);
  };
  const NF = +(window.NF || 30);
  for (let i = 0; i < NF; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.perf.beginFrame(); G.frame(1 / 30, true); }
  R.renderBufferDirect = rbd;
  return [...acc].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => `${(e.n / NF).toFixed(1).padStart(6)} calls ${String(Math.round(e.tris / NF)).padStart(7)} tris  (${e.objs.size} objects)  ${k}`).join('\n');
})()
