(async () => {
  // CPU-WALK: the frozen walk against the from-scratch reference (drawcull.js walkCheck, drawbatch.js verify) on the
  // benchmark's routes, each long enough for its scenery to freeze (FREEZE_N updates) and to move again: the street
  // (Follow, then the orbit turning), the house, combat (throws crossing the view), the house door in and out, arrivals
  // in every region, the Hamalayi, the camera sweeping 360°, then a quality change mid-route. Draws left out (composer
  // render a no-op) except every DRAWN-th frame, which is drawn for real (the shadow pass reads the caster list).
  // W_ROUTES, W_FRAMES (360), W_DRAWN (40).
  const G = game, FR = +(window.FRAMES || 360), DRAWN = +(window.DRAWN || 40);
  const ROUTES = String(window.ROUTES || 'street,interior,combat,transition,arrival,hamalayi,sweep,street@orbit,street@quality').split(',');
  const DC = await import('./src/engine/drawcull.js');
  const MW = DC.MW;
  if (window.FROZEN === '0') MW.frozen = false;   // (W_FROZEN=0: the same check of PERF-CPU's walk, no frozen subtrees)
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  const R = G.renderer, comp = R.composer.render;
  const out = [`walkcheck · ${G.settings.quality} · ${FR} frames per route, every ${DRAWN}th drawn for real`];
  let total = 0;
  for (const spec of ROUTES) {
    const [id, mod] = spec.split('@');
    G.bench.setCamera(mod === 'orbit' ? 'orbit' : 'follow');
    const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
    const K = (MW.check = { frames: 0, compared: 0, bad: 0, casters: 0, castersBad: 0, pieces: 0, piecesBad: 0, samples: [] });
    let t = 0, frozenMax = 0, frozenSum = 0, visSum = 0, thaw = 0, freeze = 0, n = 0;
    R.composer.render = () => {};
    try {
      for (let i = 0; i < FR; i++) {
        if (mod === 'quality' && i === (FR >> 1)) { const q = G.settings.quality === 'low' ? 'medium' : 'low'; G.settings.qualityAuto = false; G.applyQuality ? G.applyQuality(q) : (G.settings.quality = q, G.applySettings()); }
        t += 1 / 60; route.drive(t, 1 / 60);
        R.composer.render = i % DRAWN === DRAWN - 1 ? comp : () => {};
        G.frame(1 / 60, true);
        const S = R._mw?.stats; if (S) { frozenMax = Math.max(frozenMax, S.frozen); frozenSum += S.frozen; visSum += S.visited; thaw += S.thaw || 0; freeze += S.freeze || 0; n++; }
        if (i % 60 === 59) await new Promise((r) => setTimeout(r, 0));
      }
    } finally { R.composer.render = comp; if (mod === 'quality') { G.settings.qualityAuto = true; G.settings.quality = G.autoQ.tier(); G.applySettings(); } }
    const bad = K.bad + K.castersBad + K.piecesBad; total += bad;
    out.push(`${spec}: ${K.frames} updates · ${K.compared} world matrices compared, ${K.bad} different · caster lists ${K.frames} (${K.casters} casters), ${K.castersBad} different · ${K.pieces} batched pieces verified, ${K.piecesBad} kept though changed · walked ${(visSum / Math.max(1, n)).toFixed(0)} a frame, frozen ${(frozenSum / Math.max(1, n)).toFixed(0)} (max ${frozenMax}) · ranges frozen ${freeze}, ended ${thaw}`);
    for (const s of K.samples.slice(0, 8)) out.push('    ' + s);
  }
  MW.check = null; MW.frozen = true;
  out.push(total ? `MISMATCHES: ${total}` : 'ALL EQUAL');
  return { text: out.join('\n') };
})()
