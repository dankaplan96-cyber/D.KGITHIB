(async () => {
  // FIRST-BUILD (Test Lab finding 4, `region-entry`: a first visit spends 2.5–4 s behind black, in pieces). As the Test
  // Lab does it: from the street after New Game, enterRoom(id) with its fade, nothing preloaded, then back to the street;
  // SEQ (default zeelich,desert,hamalayi,zeelich). Every frame from the change's start until 30 frames after the fade
  // stepped as a 60 Hz frame (testFreeze off inside each step: the game's own transition path), logged: its JS ms,
  // black or in view, its phase, its jobs. The area's build (regions.buildAsync: its own tasks, under the card, between
  // frames) is taken from regions.log. Per visit: the black frames' ms, the build's ms, wall time from the change to
  // the first frame in view, shadow cache builds and why, programs, geometries, textures.
  const G = game, R = G.renderer.renderer, SEQ = String(window.SEQ || 'zeelich,desert,hamalayi,zeelich').split(',');
  // (W_EARLY=1 / 0: game.earlyWarm true / false — a first visit's programs started at the start of its preparation, or
  //  not; unset: the game's own rule, on where the driver compiles in parallel, which SwiftShader does not. Here it is a
  //  code-path and program-count check, not a timing: SwiftShader compiles at once either way)
  if (window.EARLY != null) G.earlyWarm = String(window.EARLY) === '1';
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  const step = () => { G.testFreeze = false; try { G.advance(1 / 60); } finally { G.testFreeze = true; } };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 30; i++) { step(); await tick(); }
  const out = [`region entry (stepped 60 Hz frames) · ${G.settings.quality} · battery ${G.renderer.battery} · shadows ${R.shadowMap.enabled} · staged ${G.stagedPrep !== false}`];
  const seen = new Set(), sum = [];
  const go = async (id) => {
    const cold = !seen.has(id); seen.add(id);
    const lg0 = G.prepLog?.length ?? 0, rl0 = G.regions.log.length, c0 = G.jobCounters(), w0 = performance.now();
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); else G.enterRoom(id, null, false, true);
    const rows = []; let n = 0, blackMs = 0, k = 0, sc = 0, worstView = 0, worstBlack = 0, firstView = null, why = [], sawBlack = false;
    while (n++ < 900) {
      const T0 = G.trans, ph = T0 ? (T0.hold ? (T0.prep ? `prep ${T0.prepI}` : T0.building ? 'build' : 'hold') : T0.held ? 'held' : `fade ${T0.t.toFixed(2)}`) : 'none';
      const a = G.jobCounters(), dbl = G.drawBatch.left || 0, sbl = G.shadowCull.left || 0, t0 = performance.now();
      step(); const ms = performance.now() - t0;
      const b = G.jobCounters(), black = !!G._shownBlack;
      const d = [];
      if (b.dbn > a.dbn) d.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`); if (b.sbn > a.sbn) d.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
      if (b.sc > a.sc) { sc += b.sc - a.sc; const w = b.scd > a.scd ? G.shadowCache?.dropWhy || '?' : 'first'; why.push(w); d.push(`shadow cache built (${w})`); }
      if (b.p > a.p) d.push(`+${b.p - a.p} programs`); if (b.g !== a.g) d.push(`${b.g - a.g > 0 ? '+' : ''}${b.g - a.g} geometries`); if (b.x !== a.x) d.push(`${b.x - a.x > 0 ? '+' : ''}${b.x - a.x} textures`);
      if ((G.drawBatch.left || 0) !== dbl) d.push(`${(G.drawBatch.left || 0) - dbl} pieces left draw batches`);
      if ((G.shadowCull.left || 0) !== sbl) d.push(`${(G.shadowCull.left || 0) - sbl} left shadow batches`);
      if (black) { sawBlack = true; blackMs += ms; worstBlack = Math.max(worstBlack, ms); } else { if (firstView == null && sawBlack) firstView = performance.now() - w0; if (G.trans || k < 30) worstView = Math.max(worstView, ms); }
      if (black || d.length || (G.trans && !black && rows.length < 400)) rows.push(`  ${String(rows.length).padStart(3)} ${ms.toFixed(0).padStart(6)} ms ${black ? 'BLACK' : 'view '} ${ph.padEnd(10)} op ${(G._fadeOp ?? 0).toFixed(2)} ${d.join(', ')}`);
      if (!G.trans && ++k > 30) break;
      await tick();
      if (G.trans?.building) { while (G.trans?.building) await new Promise((r) => setTimeout(r, 5)); }
    }
    const built = G.regions.log.slice(rl0), buildMs = built.reduce((s, e) => s + e.ms, 0), c1 = G.jobCounters();
    const pl = (G.prepLog || []).slice(lg0).map((e) => `${e.k} ${e.ms}`).join(' · ');
    out.push(`${id} (${cold ? 'cold' : 'repeat'}): black frames ${blackMs.toFixed(0)} ms (worst ${worstBlack.toFixed(0)}) + area build ${buildMs} ms${built.length ? ` (${built.map((e) => `${e.group} ${e.ms}${e.steps ? `, ${e.steps.length} steps, longest ${e.longest}` : ''}`).join('; ')})` : ''} = ${(blackMs + buildMs).toFixed(0)} ms of work behind black · wall to first frame in view ${firstView == null ? '?' : firstView.toFixed(0)} ms · worst frame in view ${worstView.toFixed(0)} ms · shadow cache builds ${sc} (${why.join(', ')}) · +${c1.p - c0.p} programs, ${c1.g - c0.g} geometries, ${c1.x - c0.x} textures${G.trans ? ' · STILL IN THE SCENE CHANGE after 900 frames' : ''}`);
    out.push(`  preparation steps (ms): ${pl || '-'}`);
    out.push(...rows.filter((r) => / BLACK |built|programs|geometries|textures|left/.test(r)).slice(0, 60));
    sum.push({ id, cold, blackMs: Math.round(blackMs), buildMs, total: Math.round(blackMs + buildMs), worstBlack: Math.round(worstBlack), worstView: Math.round(worstView), sc, why, prog: c1.p - c0.p });
  };
  for (const id of SEQ) { await go(id); await go('citadel'); }
  G.benchTick = null;
  return { text: out.join('\n'), sum };
})()
