(async () => {
  // render-submission CPU per drawn frame (GPU queue drained before each, as tests/perfbudget.mjs does), this build's
  // call reducers on (shadow cache, folded batches) against off, in interleaved blocks of 12 frames
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const set = (on) => { G.shadowCache.enabled = on; if (G.drawBatch.fold !== on) { G.drawBatch.fold = on; G.drawBatch.reset(); } };
  const ms = { on: [], off: [] }, calls = { on: [], off: [] };
  let t = 0;
  for (let b = 0; b < 8; b++) {
    const on = b % 2 === 0; set(on);
    for (let i = 0; i < 14; i++) {
      t += 1 / 30; route.drive(t, 1 / 30);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      G.perf.beginFrame(); G._renderMs = 0; G.frame(1 / 30, true);
      if (i >= 2) { ms[on ? 'on' : 'off'].push(G._renderMs); calls[on ? 'on' : 'off'].push(R.info.render.calls); }
    }
  }
  set(true);
  const med = (a) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.floor(v.length / 2)].toFixed(2); };
  return JSON.stringify({ submitMs: { on: med(ms.on), off: med(ms.off) }, calls: { on: med(calls.on), off: med(calls.off) }, n: ms.on.length });
})()
