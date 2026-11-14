(async () => {
  // The draw batches' triangles on a route by the size of the piece they come from and its distance from the camera:
  // per drawn frame (every 10th of NF at 30 fps), the triangles of each batched piece whose cell's batch was drawn
  // (in the view), by bounding radius class and by distance class (camera to the piece's centre), and how many of them
  // are under Low's 7-pixel size on screen (the size below which shadowcull.js leaves an unbatched piece out on Low).
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const drawn = new Set(), rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o, grp) { if (sc !== null && o.name === 'drawBatch') drawn.add(o); return rbd.call(this, c, sc, g, m, o, grp); };
  const RC = [0.25, 0.5, 1, 2, 4, 8, Infinity], DC = [20, 40, 60, 90, 130, 190, Infinity];
  const byR = RC.map(() => 0), byD = DC.map(() => 0); let small = { 7: 0, 4: 0 }, tot = 0, frames = 0;
  const pxK = innerHeight / (2 * Math.tan((G.camera.fov * Math.PI) / 360)), _c = new THREE.Vector3();
  const NF = +(window.NF || 150); let t = 0;
  const F = new THREE.Frustum(), _pm = new THREE.Matrix4(), _v = new THREE.Vector3(), _m = new THREE.Vector3(); let inView = 0;
  const srcT = new Map(); const srcOf = (C) => { const s = new Map(); for (const M of C.list) { let src = '?'; for (let p = M.o; p; p = p.parent) if (p.userData?.src) { src = p.userData.src; break; } s.set(src, (s.get(src) || 0) + 1); } return [...s].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '?'; };
  for (let i = 0; i < NF; i++) {
    t += 1 / 30; route.drive(t, 1 / 30);
    const draw = i >= 45 && i % 10 === 0; drawn.clear();
    G.perf.beginFrame(); G.frame(1 / 30, draw);
    if (!draw) continue;
    frames++;
    G.camera.updateMatrixWorld(); F.setFromProjectionMatrix(_pm.multiplyMatrices(G.camera.projectionMatrix, G.camera.matrixWorldInverse));
    const A = G.drawBatch.areas.get(G.room?.group || G.world.root); if (!A) continue;
    for (const C of A.cells.values()) {
      if (!C.mesh || !drawn.has(C.mesh)) continue;
      for (const M of C.list) {
        const T = M.parts.get(C.id); const g = M.geo;
        const tris = T ? T.length : (g.index ? g.index.count : g.attributes.position.count) / 3;
        const r = g.boundingSphere.radius * M.o.matrixWorld.getMaxScaleOnAxis();
        _c.copy(g.boundingSphere.center).applyMatrix4(M.o.matrixWorld);
        const d = _c.distanceTo(G.camera.position), px = (r * pxK) / Math.max(0.1, d);
        byR[RC.findIndex((x) => r < x)] += tris; byD[DC.findIndex((x) => d < x)] += tris; tot += tris;
        if (px < 7) small[7] += tris; if (px < 4) small[4] += tris;
      }
      // triangles of the drawn batch in the view frustum (any vertex inside, or the triangle's centre)
      const g = C.mesh.geometry, P = g.attributes.position, I = g.index, W = C.mesh.matrixWorld, nt = I.count / 3;
      for (let k = 0; k < nt; k++) {
        let inside = false; _m.set(0, 0, 0);
        for (let j = 0; j < 3; j++) { _v.fromBufferAttribute(P, I.getX(k * 3 + j)).applyMatrix4(W); _m.add(_v); if (F.containsPoint(_v)) inside = true; }
        if (!inside && F.containsPoint(_m.multiplyScalar(1 / 3))) inside = true;
        if (inside) inView++;
        const cell = srcOf(C);
        srcT.set(cell, (srcT.get(cell) || 0) + 1);
      }
    }
  }
  R.renderBufferDirect = rbd;
  const f = (v) => `${(v / frames / 1000).toFixed(1)}k`;
  return [`${window.ROUTE || 'street'} · ${G.settings.quality} · draw batch triangles drawn per frame ${f(tot)} (${frames} frames)`,
    'by piece radius: ' + RC.map((x, i) => `<${x} m ${f(byR[i])}`).join(' · '),
    'by distance: ' + DC.map((x, i) => `<${x} m ${f(byD[i])}`).join(' · '),
    `under 7 px on screen: ${f(small[7])} · under 4 px: ${f(small[4])}`,
    `in the view frustum: ${f(inView)} of ${f(tot)}`,
    'drawn batch triangles by the main source of the cell: ' + [...srcT].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f(v)}`).join(' · ')].join('\n');
})()
