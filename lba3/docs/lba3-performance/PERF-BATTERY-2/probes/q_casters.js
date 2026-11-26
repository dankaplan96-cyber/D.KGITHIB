(async () => {
  // Which objects the live shadow pass draws (the casters not in the static cache) on a route, and whether each moved
  // over the frames: name, kind, parent chain, triangles, how many of NF frames it was drawn, and if its world matrix
  // changed between frames.
  const G = game, R = G.renderer.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; for (let i = 0; i < 45; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, i % 5 === 0); }
  const seen = new Map(), rbd = R.renderBufferDirect;
  let live = false;
  const C = G.shadowCache, lv = C.live;
  C.live = function (...a) { live = true; try { return lv.apply(this, a); } finally { live = false; } };
  R.renderBufferDirect = function (c, sc, g, m, o, grp) {
    if (live && sc === null) {
      let e = seen.get(o);
      if (!e) seen.set(o, (e = { n: 0, moved: 0, last: o.matrixWorld.clone(), tris: 0 }));
      e.n++; if (!e.last.equals(o.matrixWorld)) e.moved++; e.last.copy(o.matrixWorld);
      e.tris = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    }
    return rbd.call(this, c, sc, g, m, o, grp);
  };
  const NF = +(window.NF || 60);
  for (let i = 0; i < NF; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.perf.beginFrame(); G.frame(1 / 30, true); }
  R.renderBufferDirect = rbd; C.live = lv;
  const path = (o) => { const a = []; for (let p = o; p && p !== G.scene && a.length < 5; p = p.parent) a.push((p.name || p.type) + (p.userData?.src ? `<${p.userData.src}>` : '')); return a.join(' < '); };
  const why = (o) => { const m = o.material; return [o.isSkinnedMesh && 'skinned', o.isInstancedMesh && 'instanced', o.isBatchedMesh && 'batched', m?.alphaTest > 0 && 'alphaTest', o.customDepthMaterial && 'customDepth', m?.displacementMap && 'disp', o.userData?.keep && 'keep'].filter(Boolean).join(',') || 'plain'; };
  const rows = [...seen].sort((a, b) => b[1].n - a[1].n).map(([o, e]) => `${String(e.n).padStart(4)}× moved ${String(e.moved).padStart(3)} · ${String(Math.round(e.tris)).padStart(6)} tris · ${why(o).padEnd(12)} · ${path(o)}`);
  return `${rows.length} distinct live casters over ${NF} frames (${[...seen.values()].reduce((a, e) => a + e.n, 0) / NF} a frame)\n` + rows.join('\n');
})()
