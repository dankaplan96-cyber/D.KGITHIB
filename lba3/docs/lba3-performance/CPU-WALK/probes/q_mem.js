(async () => {
  // CPU-WALK: do the frozen records stay bounded? Routes in a cycle (W_SEQ, W_CYCLES × W_FRAMES frames each, draws left
  // out), after each route: the records under the scene (their count, entries held, live and dead entries, ranges held),
  // the JS heap (performance.memory, after a GC when the page allows it), and the walk's counts.
  const G = game, FR = +(window.FRAMES || 300), CYC = +(window.CYCLES || 6);
  const SEQ = String(window.SEQ || 'street,transition,arrival,combat').split(',');
  const DC = await import('./src/engine/drawcull.js'), MW = DC.MW;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const R = G.renderer, comp = R.composer.render; R.composer.render = () => {};
  const recs = () => {
    let n = 0, held = 0, dead = 0, ranges = 0, live = 0;
    const seen = new Set();
    G.scene.traverse((o) => { const Z = o.__frz; if (Z && !seen.has(Z)) { seen.add(Z); n++; held += Z.O.length; dead += Z.dead; ranges += Z.ranges.length; live += Z.alive; } });
    return { records: n, entries: held, deadEntries: dead, ranges, liveRanges: live };
  };
  const heap = () => { try { if (window.gc) window.gc(); } catch { /* */ } return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null; };
  const out = [`records and heap over ${CYC} cycles of ${SEQ.join(', ')} (${FR} frames each)`];
  const rows = [];
  for (let c = 0; c < CYC; c++) for (const id of SEQ) {
    const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
    let t = 0;
    for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); if (i % 100 === 99) await new Promise((r) => setTimeout(r, 0)); }
    const r = { cycle: c, route: id, ...recs(), heapMB: heap(), walked: R._mw.stats.visited, frozen: R._mw.stats.frozen };
    rows.push(r);
    out.push(`  ${c}/${id}: records ${r.records} · entries ${r.entries} (dead ${r.deadEntries}) · ranges ${r.ranges} (live ${r.liveRanges}) · heap ${r.heapMB} MB · walked ${r.walked} frozen ${r.frozen}`);
  }
  R.composer.render = comp;
  return { text: out.join('\n'), rows };
})()
