(async () => {
  // Draw batches on a route: per drawn frame, the batches and triangles three's sphere test lets through against
  // a box test (the batch's axis-aligned box), and the triangles really in the view frustum. window.DCELL rebuilds the
  // batches with another cell size first; window.SPLIT_TRIS / SPLIT_R the cut thresholds (drawbatch.js).
  const THREE = await import('three');
  const G = game;
  if (window.DCELL) { G.drawBatch.cell = +window.DCELL; G.drawBatch.reset(); }
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const F = new THREE.Frustum(), _pm = new THREE.Matrix4(), _v = new THREE.Vector3(), _m = new THREE.Vector3(), _b = new THREE.Box3(), _s = new THREE.Sphere();
  const S = { frames: 0, sphere: { n: 0, tris: 0 }, box: { n: 0, tris: 0 }, inView: 0, cells: 0 };
  const NF = +(window.NF || 150); let t = 0;
  for (let i = 0; i < NF; i++) {
    t += 1 / 30; route.drive(t, 1 / 30);
    const draw = i >= 45 && i % 10 === 0;
    G.perf.beginFrame(); G.frame(1 / 30, draw);
    if (!draw) continue;
    S.frames++;
    G.camera.updateMatrixWorld(); F.setFromProjectionMatrix(_pm.multiplyMatrices(G.camera.projectionMatrix, G.camera.matrixWorldInverse));
    const A = G.drawBatch.areas.get(G.room?.group || G.world.root); if (!A) continue;
    for (const C of A.cells.values()) {
      const M = C.mesh; if (!M) continue;
      S.cells++;
      const g = M.geometry, nt = g.index.count / 3;
      if (!g.boundingBox) g.computeBoundingBox();
      _s.copy(g.boundingSphere).applyMatrix4(M.matrixWorld);
      const sp = F.intersectsSphere(_s), bx = F.intersectsBox(_b.copy(g.boundingBox).applyMatrix4(M.matrixWorld));
      if (sp) { S.sphere.n++; S.sphere.tris += nt; }
      if (bx && sp) { S.box.n++; S.box.tris += nt; }
      if (!sp || !window.EXACT) continue;
      const P = g.attributes.position, I = g.index, W = M.matrixWorld;
      for (let k = 0; k < nt; k++) {
        let inside = false; _m.set(0, 0, 0);
        for (let j = 0; j < 3; j++) { _v.fromBufferAttribute(P, I.getX(k * 3 + j)).applyMatrix4(W); _m.add(_v); if (F.containsPoint(_v)) inside = true; }
        if (!inside && F.containsPoint(_m.multiplyScalar(1 / 3))) inside = true;
        if (inside) S.inView++;
      }
    }
  }
  const f = (v) => (v / S.frames / 1000).toFixed(1) + 'k';
  return `${window.ROUTE || 'street'} · ${G.settings.quality} · cell ${G.drawBatch.cell} m · batches ${(S.cells / S.frames).toFixed(0)} · sphere test: ${(S.sphere.n / S.frames).toFixed(1)} batches ${f(S.sphere.tris)} tris · + box test: ${(S.box.n / S.frames).toFixed(1)} batches ${f(S.box.tris)} tris · triangles in view ${window.EXACT ? f(S.inView) : '(EXACT=1)'}`;
})()
