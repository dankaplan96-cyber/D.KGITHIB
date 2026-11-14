(async () => {
  // FIRST-BUILD (Test Lab finding 1, `title-to-play`: one frame of 0.6–1.2 s in view as the house first appears after
  // New Game). The title runs TITLEF frames, then New Game is pressed as the Test Lab does (a click on the button; the
  // page was opened with ?nocine, as the Test Lab opens it), then FRAMES frames are stepped as 60 Hz frames (one
  // simulation step each; testFreeze off inside each step: the game's own loop path), each logged: its JS ms, shown
  // black or in view, its jobs (draw / shadow batches built, shadow cache, programs, geometries, textures). The click's
  // own handler is timed too (audio, the scene swap). W_SHOT=1: the settled house frame as a PNG (W_SEED reseeds
  // Math.random right after the click, so two builds draw the same people in the same places).
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const step = () => { G.testFreeze = false; try { G.advance(1 / 60); } finally { G.testFreeze = true; } };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const jobs = (a, b) => {
    const d = [];
    if (b.dbn > a.dbn) d.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`); if (b.sbn > a.sbn) d.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
    if (b.sc > a.sc) d.push(`shadow cache built${b.scd > a.scd ? ' (dropped: ' + (G.shadowCache?.dropWhy || '?') + ')' : ''}`); if (b.p > a.p) d.push(`+${b.p - a.p} programs`);
    if (b.g !== a.g) d.push(`${b.g - a.g > 0 ? '+' : ''}${b.g - a.g} geometries`); if (b.x !== a.x) d.push(`${b.x - a.x > 0 ? '+' : ''}${b.x - a.x} textures`);
    return d.join(', ');
  };
  const TITLEF = +(window.TITLEF || 30), FRAMES = +(window.FRAMES || 60);
  for (let i = 0; i < TITLEF; i++) { step(); await tick(); }
  const out = [`New Game (stepped 60 Hz frames) · ${G.settings.quality} · battery ${G.renderer.battery} · title frames ${TITLEF} · audio before the click: ${G.audio.ctx ? 'made (' + G.audio.ctx.state + ')' : 'none'}${G.audio._pre ? ', context made while loading (' + G.audio._pre.state + ')' : ''}`];
  { const L = G.loadTimes || {}; out.push(`loading: build ${L.total} ms · preparation ${L.shaders} ms · steps ${JSON.stringify(L.prep || {})} · slices (count/longest) ${Object.entries(L.slices || {}).map(([k, v]) => `${k} ${v.length}/${Math.max(...v)}`).join(' ')}`); }
  const a0 = G.jobCounters(), t0 = performance.now();
  document.querySelector('[data-act="new"]').click();
  const clickMs = performance.now() - t0, a1 = G.jobCounters();
  out.push(`click handler: ${clickMs.toFixed(0)} ms (title frame, in view) ${jobs(a0, a1)} · state ${G.state} · room ${G.room?.id} · audio ${G.audio.ctx?.state ?? 'none'}`);
  if (window.SEED) { let a = +window.SEED >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let worstView = 0, worstBlack = 0, blackMs = 0, viewUploads = 0, n = 0, sum = 0;
  const rows = [];
  for (let i = 0; i < FRAMES; i++) {
    const a = G.jobCounters(), t = performance.now();
    step();
    const ms = performance.now() - t, b = G.jobCounters(), black = !!G._shownBlack;
    if (black) { blackMs += ms; worstBlack = Math.max(worstBlack, ms); } else { worstView = Math.max(worstView, ms); if (i >= 5) { sum += ms; n++; } }
    if (!black && b.g > a.g) viewUploads++;
    const P = G.perf, f = P.buf.length < 1200 ? P.buf[P.buf.length - 1] : P.buf[(P.i + 1199) % 1200];
    rows.push(`  ${String(i).padStart(3)} ${ms.toFixed(0).padStart(6)} ms ${black ? 'BLACK' : 'view '} ${G.state.padEnd(6)} ${String(G.room?.id).padEnd(6)} sim ${f?.sim?.toFixed(0)} render ${f?.render?.toFixed(0)} calls ${f?.calls} ${jobs(a, b)}`);
    await tick();
  }
  out.push(...rows.filter((r, i) => i < 8 || / [a-z]+ (built|cache)|programs|geometries|textures/.test(r) || +r.slice(5, 12) > 100));
  out.push(`frames in view: worst ${worstView.toFixed(0)} ms, mean of frames 5+ ${(sum / Math.max(1, n)).toFixed(1)} ms · black frames ${blackMs.toFixed(0)} ms in all (worst ${worstBlack.toFixed(0)}) · frames in view that made geometries ${viewUploads}`);
  out.push(`state ${G.state} · room ${G.room?.id} · draw batch areas ${G.drawBatch.areas.size} · shadow areas ${G.shadowCull.areas.size} · programs ${R.info.programs.length} · geometries ${R.info.memory.geometries} · textures ${R.info.memory.textures}`);
  const res = { text: out.join('\n') };
  if (window.SHOT) {
    const Wd = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(Wd * H * 4);
    step(); R.setRenderTarget(null); gl.readPixels(0, 0, Wd, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const cv = document.createElement('canvas'); cv.width = Wd; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(Wd, H);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * Wd * 4, (H - y) * Wd * 4), y * Wd * 4);
    for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255; cx.putImageData(im, 0, 0);
    res.__images = { ['house-' + (window.TAG || 'x')]: cv.toDataURL('image/png') };
  }
  return res;
})()
