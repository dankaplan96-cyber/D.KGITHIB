(async () => {
  // Matched A/B of this pass's CPU changes on a route (window.ROUTE), every frame drawn, the GPU drained before each:
  // blocks of 14 frames alternating A (box culling off, still instanced casters drawn live) and B (both on), 10 blocks.
  // Medians of the frame's CPU time, its render submission and its draw calls (main + shadow).
  const G = game, R = G.renderer.renderer, gl = R.getContext(), C = G.shadowCache;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const quiet = C.quiet;
  const set = (on) => {
    G.boxCull.enabled = on;
    if ((C.quiet === quiet) !== on) { C.quiet = on ? quiet : () => false; C._inst = new WeakMap(); }
  };
  const ms = { A: [], B: [] }, sub = { A: [], B: [] }, calls = { A: [], B: [] }, shadow = { A: [], B: [] };
  let t = 0;
  for (let i = 0; i < 30; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, true); }
  const NB = +(window.NB || 10);
  for (let b = 0; b < NB; b++) {
    const on = b % 2 === 1, k = on ? 'B' : 'A'; set(on);
    for (let i = 0; i < 14; i++) {
      t += 1 / 30; route.drive(t, 1 / 30);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      G.perf.beginFrame(); G._renderMs = 0;
      const t0 = performance.now(); G.frame(1 / 30, true); const f = performance.now() - t0;
      if (i >= 3) { ms[k].push(f); sub[k].push(G._renderMs); calls[k].push(R.info.render.calls); shadow[k].push(G.perf.shadow); }
    }
  }
  set(true);
  const med = (a) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.floor(v.length / 2)].toFixed(2); };
  return `AB ${window.ROUTE || 'street'} · ${G.settings.quality} · battery ${G.renderer.battery} · frames ${ms.A.length}+${ms.B.length}\n`
    + `AB A (off): frame CPU ${med(ms.A)} · submit ${med(sub.A)} ms · calls ${med(calls.A)} (shadow ${med(shadow.A)})\n`
    + `AB B (on):  frame CPU ${med(ms.B)} · submit ${med(sub.B)} ms · calls ${med(calls.B)} (shadow ${med(shadow.B)})`;
})()
