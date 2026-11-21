(async () => {
  // CPU-WALK: the shown-world update's and the draw batches' check's CPU per frame on a route, the old way
  // (MW.frozen = false: PERF-CPU's walk of every shown object, every batched piece checked) against this one, in ONE
  // page, alternating blocks of BLOCK frames (the machine is shared: separate runs differ by 2-3x). The frames are the
  // game's own (Game.frame with a render), the passes' draws left out (composer.render is a no-op while measuring:
  // SwiftShader's draw time would drown the CPU being measured), so everything before them runs as in play: FarCull,
  // the update, the draw batches' check, BoxCull. Per variant: minimum and median over blocks of the per-frame mean.
  // W_ROUTE (street), W_CAM (follow), W_BLOCK (60), W_BLOCKS (8 per variant), W_VARIANTS ('old,new').
  const G = game, ROUTE = String(window.ROUTE || 'street'), CAM = String(window.CAM || 'follow'), BLOCK = +(window.BLOCK || 60), NB = +(window.BLOCKS || 8);
  const DC = await import('./src/engine/drawcull.js');
  const MW = DC.MW, GEO = (await import('./src/engine/drawbatch.js')).GEO;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera(CAM);
  const route = G.bench.routes().find((x) => x.id === ROUTE);
  G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
  let t = 0; for (let i = 0; i < 90; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }
  const R = G.renderer, comp = R.composer.render;
  const VARS = String(window.VARIANTS || 'old,new').split(',');
  // (old: PERF-CPU's walk and every piece's geometry versions read each frame; new: frozen subtrees, versions only after an edit)
  const setV = (v) => { MW.frozen = v !== 'old'; if (GEO) GEO.off = v === 'old'; };
  // timing: from the end of `pre` (FarCull, blobs) to the start of `mid` = the shown-world update; mid's draw-batch
  // update (its check of the pieces) on its own
  const pre = R.pre, mid = R.mid, DB = G.drawBatch, dbu = DB.update;
  let tPre = 0, walkMs = 0, dbMs = 0, n = 0;
  R.pre = function (...a) { const r = pre.apply(this, a); tPre = performance.now(); return r; };
  R.mid = function (...a) { walkMs += performance.now() - tPre; return mid.apply(this, a); };
  DB.update = function (...a) { const t0 = performance.now(); const r = dbu.apply(this, a); dbMs += performance.now() - t0; return r; };
  R.composer.render = () => {};
  const res = Object.fromEntries(VARS.map((v) => [v, { walk: [], db: [], visited: [], frozen: [], polled: [], watched: [] }]));
  try {
    for (let b = 0; b < NB; b++) for (const v of VARS) {
      setV(v);
      for (let i = 0; i < 20; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }   // (settle into the variant)
      walkMs = 0; dbMs = 0; n = 0; let vis = 0, frz = 0, pol = 0, wat = 0;
      for (let i = 0; i < BLOCK; i++) {
        t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); n++;
        const S = R._mw?.stats; if (S) { vis += S.visited; frz += S.frozen || 0; pol += S.polled || 0; }
        const A = DB.areas.get(G.room?.group || G.world.root); if (A) wat += A.checked ?? A.members.length;
      }
      const E = res[v]; E.walk.push(walkMs / n); E.db.push(dbMs / n); E.visited.push(vis / n); E.frozen.push(frz / n); E.polled.push(pol / n); E.watched.push(wat / n);
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally { R.pre = pre; R.mid = mid; DB.update = dbu; R.composer.render = comp; MW.frozen = true; if (GEO) GEO.off = false; }
  const st = (a) => { const v = a.slice().sort((x, y) => x - y); return { min: +v[0].toFixed(3), med: +v[v.length >> 1].toFixed(3) }; };
  const out = [`CPU-WALK ${ROUTE} (${CAM}) · ${G.settings.quality} · ${NB} blocks × ${BLOCK} frames per variant, alternating · ms a frame (min / median of block means)`];
  const sum = {};
  for (const v of VARS) {
    const E = res[v], w = st(E.walk), d = st(E.db), avg = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
    sum[v] = { walk: w, db: d, visited: avg(E.visited), frozen: avg(E.frozen), polled: avg(E.polled), watched: avg(E.watched) };
    out.push(`  ${v}: shown-world update ${w.min} / ${w.med} · draw-batch check ${d.min} / ${d.med} · objects walked ${sum[v].visited} · in frozen subtrees ${sum[v].frozen} (polled ${sum[v].polled}) · pieces checked ${sum[v].watched}`);
  }
  return { text: out.join('\n'), sum };
})()
