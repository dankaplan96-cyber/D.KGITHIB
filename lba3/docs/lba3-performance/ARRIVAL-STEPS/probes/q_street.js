(async () => {
  // ARRIVAL-STEPS (goal 3): the street route's CPU, played as the benchmark plays it (its drive, 1/30 s steps, every
  // frame drawn), after a warm-up: the frame's sections (perf.js) and the heap's growth per frame. Run under PROFILE=1
  // for the functions. W_FRAMES (default 240).
  const G = game, N = +(window.FRAMES || 240), DT = 1 / 30;
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const step = (t) => { G.testFreeze = false; try { route.drive?.(t, DT); G.advance(DT); } finally { G.testFreeze = true; } };
  G.bench.secOn?.();
  for (let i = 0; i < 90; i++) step(i * DT);
  const P = G.perf, secs = {}, heap0 = performance.memory?.usedJSHeapSize ?? 0;
  let gcs = 0, lastH = heap0, grow = 0, ms = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now(); step((90 + i) * DT); ms.push(performance.now() - t0);
    const f = P.buf[(P.i + P.buf.length - 1) % P.buf.length] || {};
    for (const [k, v] of Object.entries(f.sec || {})) secs[k] = (secs[k] || 0) + v;
    const h = performance.memory?.usedJSHeapSize ?? 0; if (h < lastH - 1e6) gcs++; else grow += h - lastH; lastH = h;
    if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  ms.sort((a, b) => a - b);
  const out = [`street · ${G.settings.quality} · ${N} frames · frame ms p50 ${ms[N >> 1].toFixed(1)} p95 ${ms[Math.floor(N * 0.95)].toFixed(1)}`,
    `heap growth between collections: ${(grow / N / 1024).toFixed(1)} KB a frame · ${gcs} collections seen`,
    'sections (ms a frame): ' + Object.entries(secs).map(([k, v]) => `${k} ${(v / N).toFixed(2)}`).join(' · ')];
  return out.join('\n');
})()
