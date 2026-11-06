(async () => {
  // HEADING-LOAD-2: how much of an area's terrain is in view. The area entered as q_area.js does it (W_AREA, W_AT),
  // Twinsen turned to each of 8 headings and settled; for each terrain tile three draws (a quarter of the patch in the
  // regions, PERF-CALLS), its triangles, and those of its BLOCK × BLOCK-cell squares (W_BLOCK, default 25,
  // and 50) whose bounds touch the view's frustum: what a finer split would draw, the image unchanged.
  const G = game, R = G.renderer.renderer, RR = G.renderer, DT = 1 / 30;
  const THREE = await import('three');
  const AREA = String(window.AREA || 'desert'), BLOCKS = window.BLOCK ? String(window.BLOCK).split(',').map(Number) : [25, 50];
  G.bench.setCamera('follow');
  G.regions.ensure(AREA, 'probe'); G.state = 'play'; G.enterRoom(AREA, null, true, true); G.state = 'play';
  if (window.AT) { const [x, z] = String(window.AT).split(',').map(Number); G.hero.pos.set(x, G.physics.groundAt(x, z, G.hero.pos.y + 3), z); }
  G.bench.camera();
  const h = G.hero, a0 = h.angle;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const tiles = []; G.room.group.traverse((o) => { if (o.isMesh && o.name === 'terrain') tiles.push(o); });
  // per tile: its cells' bounds (the index is row by row, 6 per cell; the tile's width from the first row's run)
  const pre = tiles.map((m) => {
    const ix = m.geometry.index.array, P = m.geometry.attributes.position, nc = ix.length / 6;
    const first = ix[0]; let w = 1; while (w < nc && ix[w * 6] === first + w) w++;
    const rows = nc / w, v = new THREE.Vector3();
    const block = (B) => { const out = []; for (let bj = 0; bj < rows; bj += B) for (let bi = 0; bi < w; bi += B) {
      const box = new THREE.Box3(); let n = 0;
      for (let j = bj; j < Math.min(rows, bj + B); j++) for (let i = bi; i < Math.min(w, bi + B); i++) { const c = (j * w + i) * 6; for (const q of [0, 1, 2, 3]) box.expandByPoint(v.fromBufferAttribute(P, ix[c + q])); n += 2; }
      out.push({ box, n }); } return out; };   // (local bounds: the world matrix applied at the test)
    return { m, tris: nc * 2, blocks: Object.fromEntries(BLOCKS.map((B) => [B, block(B)])) };
  });
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), _b = new THREE.Box3();
  const out = [`${AREA}: ${tiles.length} terrain tiles (${pre.map((p) => (p.tris / 1000).toFixed(0) + 'k').join(', ')})`];
  let drawn = 0, sums = Object.fromEntries(BLOCKS.map((B) => [B, [0, 0]]));
  for (let k = 0; k < 8; k++) {
    G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / 8; h.vel.set(0, 0); };
    { const rr = RR.render; try { for (let i = 0; i < 40; i++) { RR.render = i < 34 ? () => {} : rr; step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); } } finally { RR.render = rr; } }
    G.benchTick = null; RR.render();
    const cam = G.camera; cam.updateMatrixWorld(); fr.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const vis = pre.filter((p) => p.m.visible && fr.intersectsBox(p.m.geometry.boundingBox.clone().applyMatrix4(p.m.matrixWorld)));
    const d = vis.reduce((a, p) => a + p.tris, 0); drawn += d;
    const per = BLOCKS.map((B) => { let c = 0, t = 0; for (const p of vis) for (const b of p.blocks[B]) if (fr.intersectsBox(_b.copy(b.box).applyMatrix4(p.m.matrixWorld))) { c++; t += b.n; } sums[B][0] += c; sums[B][1] += t; return `${B}-cell squares ${c} / ${(t / 1000).toFixed(0)}k`; });
    out.push(`heading ${k * 45}°: tiles drawn ${vis.length} / ${(d / 1000).toFixed(0)}k tris · in view: ${per.join(' · ')}`);
  }
  out.push(`mean: drawn ${(drawn / 8000).toFixed(1)}k · ` + BLOCKS.map((B) => `${B}-cell squares ${(sums[B][0] / 8).toFixed(1)} / ${(sums[B][1] / 8000).toFixed(1)}k`).join(' · '));
  return out.join('\n');
})()
