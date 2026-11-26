(async () => {
  // HEADING-LOAD: the view culls during a turn. The street route's setup with the Follow camera (Far); Twinsen turns on the
  // spot (RATE rad/s, the sweep's 3 by default) and every STEP s the game advances and draws a frame (its own render,
  // the culls refilled at that render); that frame is read back, then drawn again with the variants VARS ('|'-separated
  // benchgpu ids) on — the culls undone — and read back: differing pixels per frame, and calls/triangles both ways.
  //   W_FRAMES=32 W_STEP=0.0667 W_RATE=3 W_VARS='grass/flowers not culled|instanced decoration not culled'
  const G = game, R = G.renderer.renderer, RR = G.renderer;
  const { GPU_VARIANTS } = await import('/src/engine/benchgpu.js');
  const FR = +(window.FRAMES || 32), DT = +(window.STEP || 1 / 15), RATE = +(window.RATE || 3);
  const VARS = String(window.VARS || '').split('|').filter(Boolean).map((v) => GPU_VARIANTS.find((x) => x.id.includes(v))).filter(Boolean);
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, a0 = h.angle;
  let ang = a0;
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = ang; h.vel.set(0, 0); };
  const step = (dt) => { G.testFreeze = false; try { G.advance(dt); } finally { G.testFreeze = true; } };
  for (let i = 0; i < 30; i++) { step(1 / 30); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
  const gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const A = new Uint8Array(W * H * 4), B = new Uint8Array(W * H * 4);
  const read = (buf) => { R.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf); };
  let calls = 0, tris = 0;
  const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) { if (scene === G.scene) { calls++; const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; tris += (obj.isBatchedMesh ? 0 : Math.min(c, geo.drawRange.count) / 3) * (obj.isInstancedMesh ? obj.count : 1); } return rbd.apply(this, arguments); };
  const out = [];
  let worst = 0, sumA = 0, sumB = 0, cA = 0, cB = 0;
  for (let f = 0; f < FR; f++) {
    ang += RATE * DT;
    calls = 0; tris = 0; step(DT); read(A); const ca = calls, ta = tris;
    for (const v of VARS) v.apply(G);
    calls = 0; tris = 0; RR.render(); read(B); const cb = calls, tb = tris;
    for (const v of VARS) v.undo(G);
    let d = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) d++;
    worst = Math.max(worst, d); sumA += ta; sumB += tb; cA += ca; cB += cb;
    out.push(`frame ${f} heading ${(((ang - a0) * 180) / Math.PI % 360).toFixed(0)}°: pixels differ ${d} · main calls ${ca} vs ${cb} · triangles ${(ta / 1000).toFixed(0)}k vs ${(tb / 1000).toFixed(0)}k (BatchedMesh not counted)`);
    if (f % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }
  R.renderBufferDirect = rbd; G.benchTick = null;
  out.push(`all ${FR} frames: worst ${worst} pixels differ · mean main calls ${(cA / FR).toFixed(1)} vs ${(cB / FR).toFixed(1)} · mean triangles ${(sumA / FR / 1000).toFixed(1)}k vs ${(sumB / FR / 1000).toFixed(1)}k`);
  return out.join('\n');
})()
