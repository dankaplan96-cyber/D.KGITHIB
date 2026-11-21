(async () => {
  // SHADE-COST: pixel A/B of each shader change on the same frozen frame. For each view (views.js) the final image
  // with this build's shaders (A) against the same frame with ONE change undone (B), and A against A drawn again
  // (noise). Changes: the terrain's grass skip and world normal (terrain.js TERRAIN_SHADE), the lamps' reach test,
  // the indirect specular and the sun's shadow on surfaces turned away (renderer.js SC_LAMP_OLD / SC_IBL_OLD /
  // SC_SUN_OLD), the output pass's own pixel and luma roots (setOldCentre / setOldLuma), all together (the shaders as before this round),
  // and the trade-offs (the terrain's sun without specular, opaque front to back). window.SHOTS=1: the trade-offs'
  // images and diff masks (__images).
  const G = game, RR = G.renderer, r = RR.renderer, gl = r.getContext();
  const { TERRAIN_SHADE, setTerrainShade } = await import('/src/engine/terrain.js');
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const frame = () => { G.shadowCache?.drop?.(); RR.render(); RR.render(); RR.render(); const px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const cmp = (a, b) => { let n = 0, o2 = 0, o8 = 0, max = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) n++; if (d > 2) o2++; if (d > 8) o8++; if (d > max) max = d; } return { differ: n, over2: o2, over8: o8, max }; };
  const mats = () => { const s = new Set(); G.scene.traverse((o) => { for (const m of [o.material].flat()) if (m && !m.isShaderMaterial && !m.isRawShaderMaterial) s.add(m); }); return s; };
  const define = (name, on) => { for (const m of mats()) { if (!m.defines && !on) continue; m.defines = { ...(m.defines || {}) }; if (on) m.defines[name] = ''; else delete m.defines[name]; m.needsUpdate = true; } };
  const sortF2B = (on) => r.setOpaqueSort(on ? (a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder || a.z - b.z || a.id - b.id : RR.opaqueSort);
  const CH = [
    ['terrain grass read everywhere', () => setTerrainShade('grassSkip', false), () => setTerrainShade('grassSkip', true)],
    ['terrain world normal varying', () => setTerrainShade('nrmVarying', true), () => setTerrainShade('nrmVarying', false)],
    ['lamps set up everywhere', () => define('SC_LAMP_OLD', true), () => define('SC_LAMP_OLD', false)],
    ['indirect specular always', () => define('SC_IBL_OLD', true), () => define('SC_IBL_OLD', false)],
    ['sun shadow read when turned away', () => define('SC_SUN_OLD', true), () => define('SC_SUN_OLD', false)],
    ['output own pixel filtered', () => RR.setOldCentre(true), () => RR.setOldCentre(false)],
    ['output lumas rooted everywhere', () => RR.setOldLuma(true), () => RR.setOldLuma(false)],
    ['all seven as before', () => { setTerrainShade('grassSkip', false); setTerrainShade('nrmVarying', true); define('SC_LAMP_OLD', true); define('SC_IBL_OLD', true); define('SC_SUN_OLD', true); RR.setOldCentre(true); RR.setOldLuma(true); },
      () => { RR.setOldCentre(false); RR.setOldLuma(false); setTerrainShade('grassSkip', true); setTerrainShade('nrmVarying', false); define('SC_LAMP_OLD', false); define('SC_IBL_OLD', false); define('SC_SUN_OLD', false); }],
    ['TRADE terrain sun without specular', () => setTerrainShade('sunLambert', true), () => setTerrainShade('sunLambert', false)],
    ['TRADE opaque front to back', () => sortF2B(true), () => sortF2B(false)],
  ];
  const only = window.ONLY ? String(window.ONLY).split(',') : null;
  const png = (px, mask) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4;
      if (mask) { const v = Math.min(255, Math.max(Math.abs(px[s] - mask[s]), Math.abs(px[s + 1] - mask[s + 1]), Math.abs(px[s + 2] - mask[s + 2])) * 16); im.data[d] = v; im.data[d + 1] = v; im.data[d + 2] = v; }
      else { im.data[d] = px[s]; im.data[d + 1] = px[s + 1]; im.data[d + 2] = px[s + 2]; }
      im.data[d + 3] = 255; }
    cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
  RR.setAutoRes(false);   // (full resolution held: the automatic resolution would follow SwiftShader's slow frames)
  const out = { W, H, shade: { ...TERRAIN_SHADE }, views: {} }, imgs = {};
  for (const [name, set, tick] of SC_VIEWS(G)) {
    if (only && !only.includes(name)) continue;
    await SC_SET(G, set, tick);
    const A = frame(), A2 = frame();
    const row = { noise: cmp(A, A2) };
    if (window.SHOTS) imgs[name] = png(A);
    for (const [cn, on, off] of CH) {
      on(); const B = frame(); off(); const A3 = frame();
      row[cn] = { ...cmp(A, B), restored: cmp(A, A3).differ };
      if (window.SHOTS && cn.startsWith('TRADE')) { const k = name + '-' + cn.replace(/^TRADE /, '').replace(/\W+/g, '_'); imgs[k] = png(B); imgs[k + '-diffx16'] = png(A, B); }
      await new Promise((res) => setTimeout(res, 0));
    }
    out.views[name] = row;
  }
  const lines = [];
  for (const [v, row] of Object.entries(out.views)) for (const [k, x] of Object.entries(row)) lines.push(`${v.padEnd(9)} ${k.padEnd(36)} differ ${String(x.differ).padStart(7)} (${(x.differ / (W * H) * 100).toFixed(3)} %) over2 ${String(x.over2).padStart(6)} over8 ${String(x.over8).padStart(6)} max ${x.max}${x.restored != null ? ` restored ${x.restored}` : ''}`);
  return { text: lines.join('\n'), __images: imgs, ...out };
})()
