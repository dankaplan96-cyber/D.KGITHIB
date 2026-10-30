(async () => {
  // The sun's shadow map per frame on a route, every frame drawn (30 fps steps), the GPU drained before each frame:
  // CPU ms in ShadowCache's parts (statics, the slices of the next cache, full builds, the live pass) and three's base
  // shadow render, with the calls each makes. Sums over NF frames / NF.
  const G = game, R = G.renderer.renderer, gl = R.getContext(), C = G.shadowCache;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; for (let i = 0; i < 45; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, i % 5 === 0); }
  const acc = {}, n = {}, now = () => performance.now();
  const wrap = (obj, name, label) => { const f = obj[name]; obj[name] = function (...a) { const t0 = now(); const c0 = G.perf.shadow; try { return f.apply(this, a); } finally { acc[label] = (acc[label] || 0) + now() - t0; n[label] = (n[label] || 0) + (G.perf.shadow - c0); } }; };
  wrap(C, 'statics', 'statics()'); wrap(C, 'draw', 'draw (a slice of a cache)'); wrap(C, 'live', 'live (blit + moving casters)'); wrap(C, 'render', 'ShadowCache.render (all)');
  const LB = (await import('/src/game/kit.js')).LOD_BATCHES;
  for (const b of LB) if (b.mesh) wrap(b.mesh, 'onBeforeShadow', 'tree batch onBeforeShadow (geometry swaps)');
  const NF = +(window.NF || 90), drain = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const s0 = { ...C.stats };
  let total = 0;
  for (let i = 0; i < NF; i++) {
    t += 1 / 30; route.drive(t, 1 / 30); drain();
    G.perf.beginFrame(); const t0 = now(); G.frame(1 / 30, true); total += now() - t0;
  }
  // the same frames again with three's draw step stubbed inside the live pass only (its traversal, depth-material lookups)
  const liveAsIs = (acc['live (blit + moving casters)'] / NF).toFixed(3);
  const rbd = R.renderBufferDirect; let inLive = false; const L0 = C.live;
  C.live = function (...a) { inLive = true; try { return L0.apply(this, a); } finally { inLive = false; } };
  R.renderBufferDirect = function (...a) { if (inLive && a[1] === null) return; return rbd.apply(this, a); };
  const before = acc['live (blit + moving casters)'];
  for (let i = 0; i < NF; i++) { t += 1 / 30; route.drive(t, 1 / 30); drain(); G.perf.beginFrame(); G.frame(1 / 30, true); }
  R.renderBufferDirect = rbd; C.live = L0;
  const liveStub = ((acc['live (blit + moving casters)'] - before) / NF).toFixed(3);
  const stC = Object.fromEntries(Object.entries(C.stats).map(([k, v]) => [k, v - s0[k]]));
  const st = stC; const lines = [`live pass repeated: as is ${liveAsIs} ms, draw step stubbed ${liveStub} ms`, `${window.ROUTE || 'street'} · ${G.settings.quality} · battery ${G.renderer.battery} · ${NF} frames · frame CPU mean ${(total / NF).toFixed(2)} ms · cache stats over the frames ${JSON.stringify(st)} · tree batches ${LB.length} (instances ${LB.map((b) => b.inst?.length).join(',')})`];
  for (const k of Object.keys(acc)) lines.push(`${(acc[k] / NF).toFixed(3).padStart(8)} ms/frame · ${(n[k] / NF).toFixed(1).padStart(6)} shadow calls/frame  ${k}`);
  return lines.join('\n');
})()
