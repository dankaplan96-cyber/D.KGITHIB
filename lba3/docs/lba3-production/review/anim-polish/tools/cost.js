// ANIM-POLISH: the hero's Rig.update time (ms per call, median and 95th percentile) walking, turning on the spot and
// standing, at 60 fps, in chapter 1's square (run with eval.mjs on the build to price). SwiftShader's CPU: a relative number
(() => {
  const G = game, h = G.hero, r = h.rig, T = [];
  G.settings.controls = 'classic'; G.applySettings();
  const orig = r.update.bind(r);
  r.update = (dt, sp) => { const t0 = performance.now(); orig(dt, sp); T.push(performance.now() - t0); };
  const run = (keys, n) => { T.length = 0; for (let i = 0; i < n; i++) { G.input.keys.clear(); for (const k of keys) G.input.keys.add(k); G.frame(1 / 60, false); } const s = [...T].sort((a, b) => a - b); return { median: +s[s.length >> 1].toFixed(4), p95: +s[Math.floor(s.length * 0.95)].toFixed(4), n: s.length }; };
  run([], 60);
  const out = {};
  for (let rep = 0; rep < 3; rep++) {
    out['walk' + rep] = run(['ArrowUp'], 240);
    out['turn' + rep] = run(['ArrowLeft'], 240);
    out['stand' + rep] = run([], 240);
  }
  r.update = orig;
  return out;
})()
