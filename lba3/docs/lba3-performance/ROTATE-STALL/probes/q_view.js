(async () => {
  // ROTATE-STALL: what the Follow camera's views draw, heading by heading. The street route's setup with the Follow
  // camera (Far), Twinsen turned to each of HEADINGS headings (settled ~1.3 s each), then one frame's draws listed by
  // pass (main / shadow) and owner (the builder, userData.src or the nearest named parent): calls and triangles.
  const G = game, R = G.renderer.renderer, DT = 1 / 30, N = +(window.HEADINGS || 8);
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, a0 = h.angle;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const own = (o) => { let s = null, n = null; for (let q = o; q && q !== G.scene; q = q.parent) { s ??= q.userData?.src; if (!n && q.name && !/^(shadowBatch|drawBatch)$/.test(q.name)) n = q.name; } return `${o.name === 'shadowBatch' ? 'shadowBatch' : o.userData?.drawBatch ? 'drawBatch' : o.isBatchedMesh ? 'BatchedMesh' : o.isInstancedMesh ? 'Instanced' : o.isSkinnedMesh ? 'Skinned' : o.type}:${n || '?'}${s ? '@' + s : ''}`; };
  const rbd = R.renderBufferDirect; let tally = null;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (tally) { const k = (scene === null ? 'S ' : 'M ') + own(obj); const e = (tally[k] ??= [0, 0]); e[0]++; const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; e[1] += Math.min(c, geo.drawRange.count) / 3 * (obj.isInstancedMesh ? obj.count : 1); }
    return rbd.apply(this, arguments);
  };
  const L = [];
  for (let k = 0; k < N; k++) {
    G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / N; h.vel.set(0, 0); };
    for (let i = 0; i < 40; i++) { step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
    tally = {}; step(); const T = tally; tally = null;
    const f = G.perf.buf[(G.perf.i + G.perf.buf.length - 1) % G.perf.buf.length] || {};
    const by = Object.entries(T).sort((a, b) => b[1][0] - a[1][0]);
    const main = by.filter(([k2]) => k2[0] === 'M'), sh = by.filter(([k2]) => k2[0] === 'S');
    const sum = (A) => A.reduce((s, [, v]) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    L.push(`heading ${k} (${((k * 360) / N).toFixed(0)}°, camera yaw ${G.camRig.yaw?.toFixed(2)}): calls ${f.calls} (shadow ${f.shadowCalls}), tris ${(f.tris / 1000).toFixed(0)}k · main ${sum(main)[0]} calls ${(sum(main)[1] / 1000).toFixed(0)}k tris · shadow ${sum(sh)[0]} calls ${(sum(sh)[1] / 1000).toFixed(0)}k tris`);
    if (window.WHY && k === +window.WHY) {
      const { explain } = await import('/src/engine/drawbatch.js');
      const why = {}; tally = {}; const seen = new Set();
      const rb2 = R.renderBufferDirect; R.renderBufferDirect = function (cam, scene, geo, mat, obj) { if (scene !== null && obj.isMesh && !obj.userData?.drawBatch && !seen.has(obj)) { seen.add(obj); const w = own(obj) + ' → ' + explain(obj, G.world.root); why[w] = (why[w] || 0) + 1; } return rb2.apply(this, arguments); };
      step(); R.renderBufferDirect = rb2; tally = null;
      L.push('   why drawn on its own: ' + Object.entries(why).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${n}× ${w}`).join(' · '));
    }
    L.push('   ' + main.slice(0, +(window.TOP || 14)).map(([k2, v]) => `${k2.slice(2)} ${v[0]}/${(v[1] / 1000).toFixed(0)}k`).join(' · '));
  }
  R.renderBufferDirect = rbd; G.benchTick = null;
  return L.join('\n');
})()
