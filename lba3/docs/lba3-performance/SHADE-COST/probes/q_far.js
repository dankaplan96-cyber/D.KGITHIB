(async () => {
  // SHADE-COST (q_class.js's twin): how far the terrain pixels of the frozen views are from the camera. In the output
  // 'cobble' is the share beyond 40 m, 'dirt' beyond 25 m, 'sand' beyond 60 m (the bits are reused). Below: q_class's text.
  // SHADE-COST: which of the terrain shader's reads run on each terrain pixel of the frozen views. The terrain is drawn
  // with its own shader plus a classification written over its colour (bits: 1 grass read, 2 cobbles, 4 dirt, 8 sand
  // (2 reads), 16 rock (3 reads), 32 grass's result used); everything else in the view is drawn black with its depth,
  // so only the terrain pixels the view shows are counted. Read back from the scene pass's float target.
  const G = game, RR = G.renderer, r = RR.renderer, gl = r.getContext();
  const THREE = await import('three');
  const mats = SC_TERRAIN_MATS(G);
  const tag = `
    float scD = length(vViewPosition);
    float dbgK = 1.0 + (scD > 40.0 ? 2.0 : 0.0) + (scD > 25.0 ? 4.0 : 0.0) + (scD > 60.0 ? 8.0 : 0.0);`;
  const tagUnused = `
    float dbgK = 1.0 + (sp2 > 0.0 ? 2.0 : 0.0) + (sp.w > 0.0 ? 4.0 : 0.0) + (sp.y > 0.003 ? 8.0 : 0.0) + (vSplat.z > 0.229 ? 16.0 : 0.0)
      + ((sp.x > 0.0 || gs > 0.001 || (sp2 > 0.001 && ns - sp2 > 0.001)) ? 32.0 : 0.0);`;
  for (const m of mats) {
    const ob = m.onBeforeCompile, ck = m.customProgramCacheKey;
    m.__ob = ob; m.__ck = ck;
    m.onBeforeCompile = (sh, rr) => { ob(sh, rr); sh.fragmentShader = sh.fragmentShader.replace('diffuseColor.rgb *= tex;', 'diffuseColor.rgb *= tex;' + tag).replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor = vec4(dbgK / 64.0, 1.0, 0.0, 1.0);'); };
    m.customProgramCacheKey = () => 'terrain-dbg-far'; m.needsUpdate = true;
  }
  const black = new THREE.MeshBasicMaterial({ color: 0, fog: false });
  const orig = r.renderBufferDirect;
  const spr = RR.scenePass.render.bind(RR.scenePass); let last = null; RR.scenePass.render = (rr, wb, rb, ...a) => { last = rb; return spr(rr, wb, rb, ...a); };
  const out = {};
  for (const [name, set, tick] of SC_VIEWS(G)) {
    await SC_SET(G, set, tick);
    const bg = G.scene.background; G.scene.background = null; const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(); r.setClearColor(0, 0);
    r.renderBufferDirect = function (c, s, g, m, o, gr) {
      if (s === G.scene && o.name !== 'terrain') { if (m.transparent || m.colorWrite === false) return; return orig.call(this, c, s, g, black, o, gr); }
      return orig.call(this, c, s, g, m, o, gr);
    };
    try { RR.render(); } finally { r.renderBufferDirect = orig; G.scene.background = bg; r.setClearColor(cc, ca); }
    const W = last.width, H = last.height, px = new Float32Array(W * H * 4);
    r.setRenderTarget(last); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); r.setRenderTarget(null);
    const hist = new Map(); let terr = 0;
    for (let i = 0; i < px.length; i += 4) { if (px[i + 1] < 0.5) continue; terr++; const k = Math.round(px[i] * 64); hist.set(k, (hist.get(k) || 0) + 1); }
    const reads = { grass: 0, grassUsed: 0, cobble: 0, dirt: 0, sand: 0, rock: 0 };
    for (const [k, n] of hist) { if (k & 1) reads.grass += n; if (k & 32) reads.grassUsed += n; if (k & 2) reads.cobble += n; if (k & 4) reads.dirt += n; if (k & 8) reads.sand += n; if (k & 16) reads.rock += n; }
    const combos = [...hist].sort((a, b) => b[1] - a[1]).map(([k, n]) => [[k & 32 ? 'G' : 'g', k & 2 ? 'C' : '', k & 4 ? 'D' : '', k & 8 ? 'S' : '', k & 16 ? 'R' : ''].join(''), +(n / terr * 100).toFixed(1)]);
    const texReads = reads.grass + reads.cobble + reads.dirt + 2 * reads.sand + 3 * reads.rock;
    out[name] = { pixels: W * H, terrainPx: terr, share: +(terr / (W * H)).toFixed(3), perTerrainPx: { ...Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, +(v / terr).toFixed(3)])), texReads: +(texReads / terr).toFixed(2) }, combos: combos.slice(0, 10) };
  }
  for (const m of mats) { m.onBeforeCompile = m.__ob; m.customProgramCacheKey = m.__ck; m.needsUpdate = true; }
  return out;
})()
