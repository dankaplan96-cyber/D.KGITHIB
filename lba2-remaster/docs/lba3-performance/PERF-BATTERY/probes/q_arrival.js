(async () => {
  const G = game;
  G.testFreeze = false;
  await G.bench.prepareAreas();
  const frame = { ph: {} }; const rows = [];
  const wrap = (obj, name, label) => { const f = obj[name]; if (!f) return; obj[name] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { const d = performance.now() - t0; frame.ph[label] = (frame.ph[label] || 0) + d; } }; };
  wrap(G, 'warmScene', 'warmScene'); wrap(G, 'uploadGeometry', 'uploadGeometry'); wrap(G, 'uploadTextures', 'uploadTextures');
  wrap(G.shadowCull, 'update', 'shadowCull'); wrap(G.drawBatch, 'update', 'drawBatch'); wrap(G.hud, 'mapTick', 'mapTick');
  wrap(G.renderer, 'render', 'render'); wrap(G.renderer, 'precompile', 'precompile'); wrap(G, 'enterRoom', 'enterRoom'); wrap(G, 'exitRoom', 'exitRoom');
  wrap(G.world, 'update', 'world.update'); wrap(G, 'warmShadows', 'warmShadows'); wrap(G.lightPool, 'update', 'lightPool');
  if (G.shadowCache) { const sc = G.shadowCache, d0 = sc.draw.bind(sc); sc.draw = (...a) => { const t0 = performance.now(); try { return d0(...a); } finally { frame.ph.shadowCacheDraw = (frame.ph.shadowCacheDraw || 0) + performance.now() - t0; } }; }
  const adv = G.advance.bind(G);
  G.advance = (real) => {
    frame.ph = {}; const t0 = performance.now(); const black0 = G._fadeOp, tr = !!G.trans;
    adv(real);
    const ms = performance.now() - t0;
    rows.push({ t: +(performance.now() / 1000).toFixed(2), real: Math.round(real * 1000), cpu: Math.round(ms), fade: +(G._fadeOp ?? 0).toFixed(2), trans: tr, hold: !!G.trans?.hold, room: G.room?.id || 'citadel', ph: Object.fromEntries(Object.entries(frame.ph).filter(([, v]) => v > 4).map(([k, v]) => [k, Math.round(v)])) });
  };
  G.loop = function () { requestAnimationFrame(() => this.loop()); };
  const route = G.bench.routes().find((r) => r.id === 'arrival');
  G.state = 'play'; route.setup(); G.state = 'play';
  const gl = G.renderer.renderer.getContext();
  let t = 0;
  const NF = +(window.NF || 400);
  for (let i = 0; i < NF; i++) {
    const dt = 1 / 30; t += dt;
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    await new Promise((r) => setTimeout(r, 0));
    G.state = 'play'; route.drive(t, dt);
    G.advance(dt);
  }
  const txt = '';
  const big = rows.filter((r) => r.cpu > 40 || Object.values(r.ph).some((v) => v > 30));
  return '\n\nframes with > 40 ms CPU (of ' + rows.length + '):\n' + big.map((r) => JSON.stringify(r)).join('\n');
})()
