(async () => {
  // CPU-WALK pixel A/B, in one page and one game state: on each route, after the scenery has frozen, at SHOTS frames
  // the same state is drawn twice without a game step in between — first with the frozen walk (A), then (X) with
  // PERF-CPU's walk (MW.frozen = false, every shown object visited, as before this round) on even shots, with three's
  // own full update of the shown objects (MW.cached = false: every shown world matrix recomputed from scratch) on odd
  // ones — and the canvas pixels compared. Only the first two draws of a state are compared: a THIRD draw of the same
  // state differs from the first by itself in some views (5–244 px here, whatever the walk: W_SAME=1 draws X with the
  // frozen walk too, the control; the cause is per-draw state elsewhere, not the walk).
  // W_ROUTES, W_SHOTS (8), W_GAP (45 frames between shots: the scenery frozen again after X ended the records).
  const G = game, SHOTS = +(window.SHOTS || 8), GAP = +(window.GAP || 45), SAME = window.SAME === '1';
  const SEQ = String(window.ROUTES || 'street,interior,combat,arrival,sweep').split(',');
  const DC = await import('./src/engine/drawcull.js'), MW = DC.MW;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const R = G.renderer, comp = R.composer.render, gl = R.renderer.getContext();
  const grab = () => { R.render(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
  const out = [`pixel A/B · ${G.settings.quality} · ${gl.drawingBufferWidth}x${gl.drawingBufferHeight} · per shot: pixels differing, frozen walk vs ${SAME ? 'frozen walk (control)' : 'PERF-CPU walk (even shots) / three\'s full update (odd shots)'} (objects in frozen ranges)`];
  const sum = { cpu: 0, three: 0, nCpu: 0, nThree: 0 };
  for (const id of SEQ) {
    const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
    let t = 0;
    const res = [];
    for (let s = 0; s < SHOTS; s++) {
      R.composer.render = () => {};
      for (let i = 0; i < (s === 0 ? 60 : GAP); i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }
      R.composer.render = comp;
      const A = grab(), frozen = R._mw.stats.frozen;
      const three = s % 2 === 1;
      if (!SAME) { if (three) MW.cached = false; else MW.frozen = false; }
      const X = grab();
      MW.cached = true; MW.frozen = true;
      const d = diff(A, X);
      if (three) { sum.three += d; sum.nThree++; } else { sum.cpu += d; sum.nCpu++; }
      res.push(`${three ? 'three' : 'cpu'} ${d} (${frozen})`);
      await new Promise((r) => setTimeout(r, 0));
    }
    out.push(`${id}: ${res.join(' · ')}`);
  }
  out.push(`frozen walk vs PERF-CPU walk: ${sum.cpu} pixels differ over ${sum.nCpu} shots · vs three's full update: ${sum.three} over ${sum.nThree} shots`);
  return { text: out.join('\n'), sum };
})()
