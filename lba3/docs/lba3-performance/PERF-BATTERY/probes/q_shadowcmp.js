(async () => {
  const G = game, R = G.renderer.renderer, gl = R.getContext(), SC = G.shadowCache;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grab = () => { G.renderer.render(); const p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
  const out = [];
  const N = +(window.FRAMES || 150);
  for (let i = 0; i < N; i++) {
    const dt = 1 / 30; route.drive((i + 1) * dt, dt);
    G.frame(dt, true);
    if (i % 25 !== 24) continue;
    const a = grab();
    SC.render = (l, s, c) => SC.base(l, s, c);
    const b = grab();
    delete SC.render;
    let diff = 0, big = 0;
    for (let k = 0; k < a.length; k += 4) { const d = Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2])); if (d > 0) diff++; if (d > 8) big++; }
    out.push({ i, diff, big, stats: { ...SC.stats }, cache: SC.cache ? [SC.cache.u, SC.cache.v] : null });
  }
  return JSON.stringify({ W, H, out });
})()
