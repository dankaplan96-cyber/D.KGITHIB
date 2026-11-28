(async () => {
  // HEADING-LOAD: what the street's draw batches draw at a heading (q_hl.js's setup), piece by piece: for every batched
  // piece in a cell drawn this frame, its triangles there, its distance from the camera and its size on screen (the
  // bounding sphere's diameter in pixels); histograms by size and distance, and the biggest far pieces by name.
  //   W_ONLY=5 (headings of 8)
  const G = game, R = G.renderer.renderer, RR = G.renderer, DT = 1 / 30, N = 8;
  const THREE = await import('three');
  const only = String(window.ONLY ?? '5').split(',').map(Number);
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, a0 = h.angle;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const path = (o) => { const L = []; for (let q = o; q && q !== G.scene && L.length < 5; q = q.parent) if (q.name) L.push(q.name); return L.join('<') || '?'; };
  const out = [];
  const _c = new THREE.Vector3(), cam = G.camera;
  for (const k of only) {
    G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / N; h.vel.set(0, 0); };
    for (let i = 0; i < 40; i++) { step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
    G.benchTick = null;
    const drawn = new Set(), rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (c, s, g, m, o) { if (s === G.scene) drawn.add(o); return rbd.apply(this, arguments); };
    RR.render(); R.renderBufferDirect = rbd;
    const A = G.drawBatch.areas.get(G.world.root);
    const H = R.getContext().drawingBufferHeight, K = H / (2 * Math.tan((cam.fov * Math.PI) / 360));
    const cp = cam.getWorldPosition(new THREE.Vector3());
    const PX = [2, 4, 8, 16, 32, 64, Infinity], DIST = [30, 60, 100, Infinity];
    const bySz = PX.map(() => DIST.map(() => 0)), names = new Map();
    let cells = 0, tot = 0;
    for (const C of A.cells.values()) {
      if (!C.mesh || !drawn.has(C.mesh)) continue;
      cells++;
      for (const M of C.list) {
        const T = M.parts.get(C.id), g = M.geo, nt = T === undefined ? 0 : T === null ? (g.index ? g.index.count : g.attributes.position.count) / 3 : T.length;
        if (!nt) continue;
        if (!g.boundingSphere) g.computeBoundingSphere();
        _c.copy(g.boundingSphere.center).applyMatrix4(M.o.matrixWorld);
        const r = g.boundingSphere.radius * M.o.matrixWorld.getMaxScaleOnAxis(), d = Math.max(0.1, _c.distanceTo(cp));
        const px = (2 * r * K) / d;
        let i = 0; while (px > PX[i]) i++;
        let j = 0; while (d > DIST[j]) j++;
        bySz[i][j] += nt; tot += nt;
        if (d > 60 || px < 16) { const key = path(M.o) + (T ? ' (cut)' : ''); const e = names.get(key) ?? { n: 0, t: 0, px: 0, d: 0, r: 0 }; e.n++; e.t += nt; e.px = Math.max(e.px, px); e.d = Math.max(e.d, d); e.r = Math.max(e.r, r); names.set(key, e); }
      }
    }
    out.push(`heading ${k}: ${cells} draw-batch cells drawn, ${(tot / 1000).toFixed(0)}k triangles of batched pieces`);
    out.push('  triangles (k) by size on screen (rows: bounding-sphere diameter ≤ px) × distance from the camera (≤30 / ≤60 / ≤100 / >100 m):');
    PX.forEach((p, i) => out.push(`   ≤${p === Infinity ? '∞' : p} px: ${bySz[i].map((x) => (x / 1000).toFixed(1)).join(' / ')}`));
    out.push('  biggest pieces beyond 60 m or under 16 px (path: pieces, triangles, max px, max distance, radius):');
    for (const [key, e] of [...names].sort((a, b) => b[1].t - a[1].t).slice(0, +(window.TOP || 30))) out.push(`   ${key}: ${e.n} pcs ${(e.t / 1000).toFixed(1)}k tris, ≤${e.px.toFixed(0)} px, ≤${e.d.toFixed(0)} m, r ${e.r.toFixed(1)} m`);
  }
  return out.join('\n');
})()
