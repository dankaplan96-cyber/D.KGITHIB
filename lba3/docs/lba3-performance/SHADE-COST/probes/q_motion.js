(async () => {
  // SHADE-COST: the same A/B in motion. The benchmark's own routes (bench.js: the street — Twinsen walking, the camera
  // turning —, the furnished interior, combat) are driven frame by frame at 1/30 s; every frame is drawn with this
  // build's shaders (A) and, in the same game state, with the seven changes undone (B), and compared. Moving edges,
  // silhouettes, vegetation and the output pass's edge smoothing are in it. window.FRAMES (24) frames a route after
  // 1 s of warm-up; window.ROUTES ('street,interior,combat'); window.SCALE: the resolution factor held (default 1).
  const G = game, RR = G.renderer, r = RR.renderer, gl = r.getContext();
  const { setTerrainShade } = await import('/src/engine/terrain.js');
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, N = +(window.FRAMES || 24), DT = 1 / 30;
  const mats = () => { const s = new Set(); G.scene.traverse((o) => { for (const m of [o.material].flat()) if (m && !m.isShaderMaterial && !m.isRawShaderMaterial) s.add(m); }); return s; };
  const define = (name, on) => { for (const m of mats()) { if (!m.defines && !on) continue; m.defines = { ...(m.defines || {}) }; if (on) m.defines[name] = ''; else delete m.defines[name]; m.needsUpdate = true; } };
  // (window.OLD: which changes B undoes, of terrain,lamp,ibl,sun,centre,luma; default all)
  const O = new Set(String(window.OLD || 'terrain,lamp,ibl,sun,centre,luma').split(','));
  const old = (on) => {
    if (O.has('terrain')) { setTerrainShade('grassSkip', !on); setTerrainShade('nrmVarying', on); }
    if (O.has('lamp')) define('SC_LAMP_OLD', on); if (O.has('ibl')) define('SC_IBL_OLD', on); if (O.has('sun')) define('SC_SUN_OLD', on);
    if (O.has('centre')) RR.setOldCentre(on); if (O.has('luma')) RR.setOldLuma(on);
  };
  const read = () => { G.shadowCache?.drop?.(); RR.render(); RR.render(); const px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const cmp = (a, b) => { let n = 0, max = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) n++; if (d > max) max = d; } return [n, max]; };
  const routes = G.bench.routes(), want = String(window.ROUTES || 'street,interior,combat').split(',');
  const lines = [];
  // (the resolution held: full (exact: the output pass reads by index) or window.SCALE, e.g. 0.9 (filtered taps, sharpening))
  RR.setAutoRes(false); if (window.SCALE) RR.setDyn(+window.SCALE);
  // (compile both sets once before the frames, so no frame waits)
  old(true); RR.render(); old(false); RR.render();
  for (const id of want) {
    const R = routes.find((x) => x.id === id); if (!R) { lines.push(id + ': no such route'); continue; }
    G.bench.setCamera('orbit'); G.state = 'play'; R.setup(); G.state = 'play';
    let t = 0; const rr = RR.render;
    const step = () => { R.drive(t, DT); t += DT; G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
    RR.render = () => {}; try { for (let i = 0; i < 30; i++) step(); } finally { RR.render = rr; }
    old(true); RR.render(); old(false);
    let worst = 0, maxd = 0, tot = 0; const per = [];
    for (let f = 0; f < N; f++) {
      RR.render = () => {}; try { step(); } finally { RR.render = rr; }
      const A = read(); old(true); const B = read(); old(false);
      const [n, mx] = cmp(A, B); per.push(n); tot += n; worst = Math.max(worst, n); maxd = Math.max(maxd, mx);
      if (f % 4 === 3) await new Promise((res) => setTimeout(res, 0));
    }
    const U = RR.output.uniforms;
    lines.push(`${id.padEnd(9)} undone: ${[...O].join(',')} · ${N} frames: pixels differing per frame ${per.join(' ')} (worst ${worst} of ${W * H}, max level ${maxd}) · output pass exact ${U.exact.value} edgeAA ${U.edgeAA.value} sharpen ${U.sharpen.value}`);
  }
  return { text: lines.join('\n') };
})()
