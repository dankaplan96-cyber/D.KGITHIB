(async () => {
  // The benchmark's "as played" logic at a realistic pace: drawing is replaced by a busy wait of WAIT ms × (the
  // automatic resolution's factor)² — a stand-in for a GPU whose time scales with pixels (no picture is drawn) — so
  // the loop runs at 30–60 fps and the automatic resolution can act. Synthetic: it checks the benchmark's plumbing
  // (settling, the reported factor), not any machine's speed.
  const G = game, RR = G.renderer, WAIT = +(window.WAIT || 30);
  const draw = RR.render.bind(RR);
  RR.render = () => { const t0 = performance.now(), w = WAIT * RR.effScale() ** 2; while (performance.now() - t0 < w); };
  G.testFreeze = false; G.last = performance.now();
  const text = await G.bench.run(['medium'], { routes: (window.BROUTES || 'street,interior').split(','), breakdown: false });
  G.testFreeze = true; RR.render = draw;
  return text.split('\n').filter((l) => /^ {2,}\w|as played|summary/.test(l)).map((l) => 'PROBE ' + l.slice(0, 330)).join('\n');
})()
