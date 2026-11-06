(async () => {
  // TITLE-LOAD (the coordinator's arrival evidence: on the laptop's Low arrival route two frames in view right after the
  // black uploaded +40 / +31 geometries): the benchmark's arrival route on the game's own loop (real time, every frame
  // drawn as the player gets it), each frame of each scene change logged from its start to 1 s after the fade cleared:
  // its interval, the transition's phase (hold / held k / fade opacity), shown black or in view, the readiness flag
  // (_settleBusy), and its jobs (draw / shadow batches built, pieces leaving batches, geometries and textures made).
  // A frame in view that made geometries is listed first. W_Q=low|medium W_SECS=20 W_CAM=orbit|follow W_SKIP=s, W_FROM=n (log from
  // then on / from the n+1-th scene change: the first visits left out)
  const G = game, Q = window.Q || 'low', SECS = +(window.SECS || 20);
  G.bench.setCamera(window.CAM || 'orbit');
  G.settings.quality = Q; G.settings.qualityAuto = false; G.applySettings();
  for (let i = 0; i < 400 && G.gfxHold; i++) await new Promise((r) => setTimeout(r, 50));
  // (W_PARALLEL=1: the warm-up's precompile resolves as three's compileAsync does where KHR_parallel_shader_compile is
  //  there and nothing is left to compile — at once, in the same task — as on the laptop; SwiftShader has no such
  //  extension, so three polls with a 10 ms timer)
  if (window.PARALLEL) { const pc = G.renderer.precompile.bind(G.renderer); G.renderer.precompile = (...a) => { const p = pc(...a); return G.preparing ? p : p.then(() => {}, () => {}).then(() => {}) && Promise.resolve(); }; }
  const route = G.bench.routes().find((r) => r.id === 'arrival');
  G.testFreeze = false; G.state = 'play'; route.setup();
  let t = 0; const rows = []; let last = null, after = 0, nTrans = 0, inView = [];
  const adv = G.advance.bind(G);
  // (W_UNWARM=1: each scene change finds its warm-up key stale — as after any program made elsewhere since, e.g. a preset
  //  change in the benchmark — so warmScene starts a shader hold with nothing left to compile: it ends at once)
  G.benchTick = (real) => { t += real; G.state = 'play'; if (window.UNWARM && !G.trans) G._warmed?.clear(); route.drive(t, real); };
  G.advance = function (real) {
    const T0 = G.trans, a = G.jobCounters(), dbl0 = G.drawBatch.left || 0, k0 = T0 ? { hold: !!T0.hold, held: !!T0.held, k: T0.heldAt != null ? G._frameNo + 1 - T0.heldAt : null, t: +T0.t.toFixed(2), busy: !!G._settleBusy } : null;
    // (W_FAST=1: each frame advanced as a 60 Hz frame, one simulation step — as the laptop's frames run; SwiftShader's slow
    //  frames are simulated in several steps, and every step runs the transition's logic)
    if (window.FAST) real = Math.min(real, 1 / 60);
    const r = adv(real);
    const b = G.jobCounters(), T = G.trans;
    if (!T0 && T) nTrans++;
    if (T0 || T) { after = 30; }
    if (after > 0 && t >= +(window.SKIP || 0) && nTrans > +(window.FROM || 0)) {
      after--;
      const black = !!G._shownBlack, d = [];
      if (b.dbn > a.dbn) d.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`); if (b.sbn > a.sbn) d.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
      if (b.sc > a.sc) d.push('cache full build'); if (b.p > a.p) d.push(`+${b.p - a.p} programs`); if (b.g !== a.g) d.push(`${b.g - a.g > 0 ? '+' : ''}${b.g - a.g} geometries`); if (b.x !== a.x) d.push(`+${b.x - a.x} textures`);
      const dl = (G.drawBatch.left || 0) - dbl0; if (dl) d.push(`${dl} pieces left draw batches`);
      const row = `${(t).toFixed(2)}s int ${(real * 1000).toFixed(0)} ms ${black ? 'BLACK' : 'view '} ${k0 ? (k0.hold ? 'hold' : k0.held ? `held k${k0.k} busy ${k0.busy}` : `fade t ${k0.t}`) : 'no trans'} op ${(G._fadeOp ?? 0).toFixed(2)} room ${G.room?.id || 'citadel'} ${d.join(', ')}`;
      rows.push(row);
      if (!black && b.g > a.g) inView.push(row);
    }
    return r;
  };
  // (W_STEP=n: n frames stepped by hand at 1/60 s instead — one simulation step each, as a 60 Hz frame — the loop held
  //  meanwhile; the stepped frames' own work is real)
  if (window.STEP) { G.testFreeze = true; for (let i = 0; i < +window.STEP; i++) { G.testFreeze = false; try { G.advance(1 / 60); } finally { G.testFreeze = true; } if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); } }
  else await new Promise((r) => setTimeout(r, SECS * 1000));
  G.advance = adv; G.benchTick = null; G.testFreeze = true;
  return { text: [`reveal probe · ${Q} · battery ${G.renderer.battery} · ${SECS} s of the arrival route on the game's loop`, `frames in view that made geometries: ${inView.length}`, ...inView.map((x) => '  ' + x), '', ...rows].join('\n') };
})()
