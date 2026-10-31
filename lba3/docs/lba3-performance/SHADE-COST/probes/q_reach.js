(async () => {
  // SHADE-COST: on how many of the lit pixels each frozen view shows a lamp of the light pool can light the pixel at all
  // (renderer.js scLampReaches): every lit material is compiled with a probe define that writes the count of lamps in
  // reach instead of its colour (fog off for the probe), read back from the scene pass's float target. Pixels with 0
  // skip every lamp's set-up since SHADE-COST.
  const G = game, RR = G.renderer, r = RR.renderer, gl = r.getContext();
  const THREE = await import('three');
  const C = THREE.ShaderChunk, b0 = C.lights_fragment_begin, o0 = C.opaque_fragment;
  C.lights_fragment_begin = '#ifdef SC_DBG_REACH\nfloat scReach = 0.0, scLit = 1.0;\n#endif\n' + b0.replace(/if \( scLampReaches\( pointLight, geometryPosition \) \) \{/g, 'if ( scLampReaches( pointLight, geometryPosition ) ) {\n#ifdef SC_DBG_REACH\nscReach += 1.0;\n#endif\n');
  C.opaque_fragment = o0 + '\n#ifdef SC_DBG_REACH\ngl_FragColor = vec4( scReach, scLit, 0.0, 1.0 );\n#endif\n';
  const mats = new Set(); G.scene.traverse((o) => { for (const m of [o.material].flat()) if (m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial)) mats.add(m); });
  const spr = RR.scenePass.render.bind(RR.scenePass); let last = null; RR.scenePass.render = (rr, wb, rb, ...a) => { last = rb; return spr(rr, wb, rb, ...a); };
  const out = {};
  try {
    for (const [name, set, tick] of SC_VIEWS(G)) {
      await SC_SET(G, set, tick);
      const lamps = G.lightPool.lights.map((L) => ({ on: L.intensity > 0, d: +L.distance.toFixed(1), at: [L.position.x, L.position.z].map((v) => +v.toFixed(1)) }));
      for (const m of mats) { m.defines = { ...(m.defines || {}), SC_DBG_REACH: '' }; m.needsUpdate = true; }
      const fog = G.scene.fog, bg = G.scene.background; G.scene.fog = null; G.scene.background = null; const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(); r.setClearColor(0, 0);
      try { RR.render(); } finally { G.scene.fog = fog; G.scene.background = bg; r.setClearColor(cc, ca); }
      const W = last.width, H = last.height, px = new Float32Array(W * H * 4);
      r.setRenderTarget(last); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); r.setRenderTarget(null);
      let lit = 0; const h = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < px.length; i += 4) { if (Math.abs(px[i + 1] - 1) > 0.01) continue; lit++; h[Math.min(8, Math.round(px[i]))]++; }
      out[name] = { lamps, litPx: lit, share: +(lit / (W * H)).toFixed(3), inReachOf: h.map((n) => +(n / lit * 100).toFixed(2)) };
      for (const m of mats) { delete m.defines.SC_DBG_REACH; m.needsUpdate = true; }
    }
  } finally { C.lights_fragment_begin = b0; C.opaque_fragment = o0; }
  return out;
})()
