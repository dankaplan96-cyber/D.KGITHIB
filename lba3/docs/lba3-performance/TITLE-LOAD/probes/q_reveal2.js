(async () => {
  // TITLE-LOAD (the coordinator's arrival evidence: the laptop's Low arrival route, two frames in view right after the
  // black with +40 / +31 geometries): scene changes stepped by hand as 60 Hz frames (one simulation step each, as the
  // laptop's frames run; testFreeze off inside each step, the game's own transition path), each frame logged from the
  // change's start until the fade has cleared: shown black or in view, the transition's phase, its jobs. SEQ visits
  // (default Zeelich, Citadel, the desert, Citadel); the first visit of each is cold. W_PARALLEL=1: the shader warm-up
  // resolves as three's compileAsync does with KHR_parallel_shader_compile when nothing is left to compile — at once, in
  // the same task (SwiftShader has no such extension: three polls with a 10 ms timer). W_UNWARM=1: every change finds its
  // warm-up key stale (as after any program made elsewhere since — a preset change in the benchmark).
  const G = game, R = G.renderer.renderer, SEQ = String(window.SEQ || 'zeelich,citadel,desert,citadel').split(',');
  if (window.PARALLEL) { const pc = G.renderer.precompile.bind(G.renderer); G.renderer.precompile = (...a) => { pc(...a).catch(() => {}); return Promise.resolve(); }; }
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  const step = () => { G.testFreeze = false; try { G.advance(1 / 60); } finally { G.testFreeze = true; } };
  for (let i = 0; i < 20; i++) step();
  const out = [`reveal (stepped 60 Hz frames) · ${G.settings.quality} · battery ${G.renderer.battery} · parallel-style warm-up ${!!window.PARALLEL} · stale keys ${!!window.UNWARM} · staged ${G.stagedPrep !== false}`];
  const seen = new Set(); let inViewUploads = 0, worstBlack = 0, worstView = 0;
  for (const id of SEQ) {
    const cold = !seen.has(id); seen.add(id);
    if (window.UNWARM) G._warmed?.clear();
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); else G.enterRoom(id, null, false, true);
    const rows = []; let n = 0, tot = 0, blackMs = 0, k = 0;
    const lg0 = G.prepLog?.length ?? 0;
    while (n++ < 600) {
      const T0 = G.trans, ph = T0 ? (T0.hold ? (T0.prep ? `prep ${T0.prepI}` : 'hold') : T0.held ? 'held' : `fade ${T0.t.toFixed(2)}`) : 'none';
      const a = G.jobCounters(), dbl = G.drawBatch.left || 0, t0 = performance.now();
      step(); const ms = performance.now() - t0; tot += ms;
      const b = G.jobCounters(), black = !!G._shownBlack;
      const d = [];
      if (b.dbn > a.dbn) d.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`); if (b.sbn > a.sbn) d.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
      if (b.sc > a.sc) d.push('shadow cache built'); if (b.p > a.p) d.push(`+${b.p - a.p} programs`); if (b.g !== a.g) d.push(`${b.g - a.g > 0 ? '+' : ''}${b.g - a.g} geometries`); if (b.x !== a.x) d.push(`+${b.x - a.x} textures`);
      if ((G.drawBatch.left || 0) !== dbl) d.push(`${(G.drawBatch.left || 0) - dbl} pieces left batches`);
      if (black) { blackMs += ms; worstBlack = Math.max(worstBlack, ms); } else if (G.trans || k < 30) worstView = Math.max(worstView, ms);
      if (!black && b.g > a.g) inViewUploads++;
      rows.push(`  ${String(rows.length).padStart(3)} ${ms.toFixed(0).padStart(6)} ms ${black ? 'BLACK' : 'view '} ${ph.padEnd(10)} op ${(G._fadeOp ?? 0).toFixed(2)} ${d.join(', ')}${!black && b.g > a.g ? '  << UPLOAD IN VIEW' : ''}`);
      if (!G.trans && ++k > 30) break;
      await new Promise((r) => setTimeout(r, 0));   // (every promise a frame settles — a warm-up's end — runs before the next, as between two real frames)
      if (rows.length % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const pl = (G.prepLog || []).slice(lg0).map((e) => `${e.k} ${e.ms}`).join(' · ');
    out.push(`${id} (${cold ? 'cold' : 'repeat'}): ${rows.length} frames, ${tot.toFixed(0)} ms in all, ${blackMs.toFixed(0)} ms black; preparation steps (ms): ${pl || '-'}`);
    out.push(...rows.filter((r) => !/ view  (none|fade [0-9.]+) +op [0-9.]+ $/.test(r) || /UPLOAD/.test(r)));
  }
  out.push(`frames in view that made geometries: ${inViewUploads} · longest black frame ${worstBlack.toFixed(0)} ms · longest frame in view (fade and 30 after) ${worstView.toFixed(0)} ms`);
  G.benchTick = null;
  return out.join('\n');
})()
