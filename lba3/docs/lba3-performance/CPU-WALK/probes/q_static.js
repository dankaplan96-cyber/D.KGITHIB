(async () => {
  // CPU-WALK: the cost of finding that nothing changed. In each measured frame, right after the frame's own update
  // (Renderer.mid), the shown-world update is run REP more times: nothing has moved in between, so each extra run is
  // the pure "visit / check everything" cost — PERF-CPU's walk (MW.frozen = false) against the frozen walk. Blocks
  // alternate; per variant the minimum and median of the block means, in µs per extra run.
  const G = game, ROUTE = String(window.ROUTE || 'street'), REP = +(window.REP || 20), BLOCK = +(window.BLOCK || 20), NB = +(window.BLOCKS || 6);
  const DC = await import('./src/engine/drawcull.js'), MW = DC.MW;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === ROUTE);
  G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
  const R = G.renderer, comp = R.composer.render, mid = R.mid; R.composer.render = () => {};
  let t = 0; const step = (n) => { for (let i = 0; i < n; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); } };
  step(60);
  let acc = 0, on = false, vis = 0, pol = 0;
  R.mid = function (...a) {
    if (on) {
      const st = R._mw, t0 = performance.now();
      for (let r = 0; r < REP; r++) DC.updateShownWorld(G.scene, st);
      acc += performance.now() - t0; vis += st.stats.visited; pol += st.stats.polled;
    }
    return mid.apply(this, a);
  };
  const res = { old: [], new: [] }, cnt = { old: [0, 0], new: [0, 0] };
  try {
    for (let b = 0; b < NB; b++) for (const v of ['old', 'new']) {
      MW.frozen = v === 'new'; step(v === 'new' ? 45 : 5);
      acc = 0; vis = 0; pol = 0; on = true; step(BLOCK); on = false;
      res[v].push((acc / (BLOCK * REP)) * 1000); cnt[v][0] += vis / BLOCK; cnt[v][1] += pol / BLOCK;
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally { R.mid = mid; R.composer.render = comp; MW.frozen = true; }
  const st = (a) => { const s = a.slice().sort((x, y) => x - y); return `${s[0].toFixed(0)} / ${s[s.length >> 1].toFixed(0)}`; };
  return { text: `static ${ROUTE}: an update that finds nothing changed, µs (min / median of ${NB} blocks × ${BLOCK} frames × ${REP}): PERF-CPU walk ${st(res.old)} (visits ${(cnt.old[0] / NB).toFixed(0)}) · frozen walk ${st(res.new)} (visits ${(cnt.new[0] / NB).toFixed(0)}, polls ${(cnt.new[1] / NB).toFixed(0)})`, res };
})()
