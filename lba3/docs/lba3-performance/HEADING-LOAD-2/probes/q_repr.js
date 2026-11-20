(async () => {
  // HEADING-LOAD-2: the same frame drawn two ways. Each of kit.js cullInstances' BatchedMeshes in the area (culled per
  // instance) against the InstancedMesh the area had before (rebuilt here from the batch: the same geometry, material,
  // matrices in the same order, colours, casting) — the frozen game state, the area entered as q_area.js does it
  // (W_AREA, W_AT), Twinsen turned to each of 8 headings (W_ONLY) and settled (the first 34 of 40 frames not drawn).
  // Per heading: differing pixels of the final image, and main-pass calls / triangles both ways.
  const G = game, R = G.renderer.renderer, RR = G.renderer, DT = 1 / 30;
  const THREE = await import('three');
  const { CULL_INST } = await import('/src/game/kit.js');
  const only = window.ONLY ? String(window.ONLY).split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7];
  G.bench.setCamera('follow');
  const AREA = String(window.AREA || 'zeelich');
  G.regions.ensure(AREA, 'probe'); G.state = 'play'; G.enterRoom(AREA, null, true, true); G.state = 'play';
  if (window.AT) { const [x, z] = String(window.AT).split(',').map(Number); G.hero.pos.set(x, G.physics.groundAt(x, z, G.hero.pos.y + 3), z); }
  G.bench.camera();
  const h = G.hero, a0 = h.angle;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const room = G.room.group;
  const under = (o) => { for (let p = o; p; p = p.parent) if (p === room) return true; return false; };
  const pairs = CULL_INST.batches.filter((B) => under(B.mesh)).map((B) => {
    const bm = B.mesh, n = B.inst.length, im = new THREE.InstancedMesh(bm.userData.cullSrc, bm.material, n), m = new THREE.Matrix4(), c = new THREE.Color();
    B.inst.forEach((I, i) => { bm.getMatrixAt(I.k, m); im.setMatrixAt(i, m); if (bm._colorsTexture) { bm.getColorAt(I.k, c); im.setColorAt(i, c); } });
    im.castShadow = bm.castShadow; im.receiveShadow = bm.receiveShadow; im.userData.gpuGroup = bm.userData.gpuGroup;
    return { bm, im, n };
  });
  // (W_TERRAIN=1: the terrain's squares batch, terrain.js, against the tiles it had before — rebuilt with its _tileMesh —
  //  instead of the instance batches; the region's Terrain is R.terrain)
  if (window.TERRAIN) {
    pairs.length = 0;
    const T = G.room.terrain; let bm = null; room.traverse((o) => { if (o.isBatchedMesh && o.name === 'terrain') bm = o; });
    if (T && bm) { const g = new THREE.Group(); for (const t of bm.userData.tiles) g.add(T._tileMesh(bm.parent.userData.full, bm.material, ...t)); g.name = 'terrain-tiles'; pairs.push({ bm, im: g, n: bm.userData.tiles.length }); }
  }
  const gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const A = new Uint8Array(W * H * 4), Bf = new Uint8Array(W * H * 4);
  const read = (buf) => { R.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf); };
  let calls = 0, tris = 0;
  const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (scene === G.scene) { calls++; let t; if (obj.isBatchedMesh) { t = 0; const C = obj._multiDrawCounts; for (let i = 0; i < obj._multiDrawCount; i++) t += C[i]; t /= 3; } else { const cc = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; t = Math.min(cc, geo.drawRange.count) / 3 * (obj.isInstancedMesh ? obj.count : 1); } tris += t; }
    return rbd.apply(this, arguments);
  };
  // (the static shadow cache dropped before each frame: the swap below drops it, and a cache drawn round another focus
  //  moves the depth of shallow ground by a fraction of a texel — speckles of acne differ, whatever the casters)
  const frame = (buf) => { G.shadowCache?.drop?.(); RR.render(); RR.render(); calls = 0; tris = 0; RR.render(); read(buf); return [calls, Math.round(tris / 1000)]; };
  const out = [`${AREA}: ${pairs.length} batches (${pairs.map((p) => (p.bm.userData.gpuGroup || p.bm.name) + ' ' + p.n).join(', ')})${window.TERRAIN ? ' — the terrain: squares vs its tiles' : ''}`];
  let worst = 0;
  for (const k of only) {
    G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / 8; h.vel.set(0, 0); };
    { const rr = RR.render; try { for (let i = 0; i < 40; i++) { RR.render = i < 34 ? () => {} : rr; step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); } } finally { RR.render = rr; } }
    G.benchTick = null;
    const fa = frame(A);
    for (const { bm, im } of pairs) { bm.parent.add(im); bm.visible = false; }
    const fb = frame(Bf);
    for (const { bm, im } of pairs) { im.removeFromParent(); bm.visible = true; }
    let d = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== Bf[i] || A[i + 1] !== Bf[i + 1] || A[i + 2] !== Bf[i + 2]) d++;
    worst = Math.max(worst, d);
    out.push(`heading ${k * 45}°: pixels differ ${d} · main ${fa[0]} calls ${fa[1]}k tris (this build: batches culled per instance or square) vs ${fb[0]} calls ${fb[1]}k (as before: InstancedMeshes, or the terrain's tiles)`);
    await new Promise((r) => setTimeout(r, 0));
  }
  R.renderBufferDirect = rbd;
  out.push(`worst ${worst} pixels differ`);
  return out.join('\n');
})()
