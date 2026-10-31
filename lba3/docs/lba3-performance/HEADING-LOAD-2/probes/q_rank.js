(async () => {
  // HEADING-LOAD-2: which outdoor areas draw most. Each area of window.AREAS (','-separated room ids; default every
  // Zeelich island) entered at its arrival point, Follow camera at Far; Twinsen turned to each of 8 headings (W_ONLY
  // to pick some) and settled 40 frames; one frame's main-pass calls and triangles, the mean and the worst heading.
  const G = game, R = G.renderer.renderer, RR = G.renderer, DT = 1 / 30;
  const { ISLES } = await import('/src/game/zislands.js');
  const AREAS = window.AREAS ? String(window.AREAS).split(',') : ISLES.map((n) => 'isle_' + n).filter((id) => G.regions.has(id));
  const only = window.ONLY ? String(window.ONLY).split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7];
  G.bench.setCamera('follow');
  let calls = 0, tris = 0, on = false;
  const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (on && scene === G.scene) { calls++; let t; if (obj.isBatchedMesh) { t = 0; const C = obj._multiDrawCounts; for (let i = 0; i < obj._multiDrawCount; i++) t += C[i]; t /= 3; } else { const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; t = Math.min(c, geo.drawRange.count) / 3 * (obj.isInstancedMesh ? obj.count : 1); } tris += t; }
    return rbd.apply(this, arguments);
  };
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const out = [];
  for (const id of AREAS) {
    const t0 = performance.now();
    G.regions.ensure(id, 'probe'); G.state = 'play'; G.enterRoom(id, null, true, true); G.state = 'play'; G.bench.camera();
    const h = G.hero, a0 = h.angle, per = [];
    for (const k of only) {
      G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / 8; h.vel.set(0, 0); };
      for (let i = 0; i < 40; i++) { step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
      G.benchTick = null; RR.render();
      calls = 0; tris = 0; on = true; RR.render(); on = false;
      per.push([k * 45, calls, Math.round(tris / 1000)]);
    }
    const mean = per.reduce((a, p) => a + p[2], 0) / per.length, worst = per.reduce((a, p) => (p[2] > a[2] ? p : a));
    out.push(`${id}: mean ${mean.toFixed(0)}k tris · worst ${worst[0]}° ${worst[1]} calls ${worst[2]}k · ${per.map((p) => `${p[0]}° ${p[1]}/${p[2]}k`).join(' ')} (${Math.round((performance.now() - t0) / 1000)} s)`);
    console.log('PROBE ' + out[out.length - 1]);
  }
  R.renderBufferDirect = rbd;
  return out.join('\n');
})()
