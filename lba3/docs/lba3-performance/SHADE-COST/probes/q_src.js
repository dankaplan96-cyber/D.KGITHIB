(async () => {
  // SHADE-COST: the final fragment source of the programs named in window.KEYS (default: the terrain's and the scenery's
  // texture-array twin), as the driver receives it, preprocessor run by a tiny #define/#if evaluator is NOT done here:
  // the raw source is returned; count with tools on the host side.
  const G = game, r = G.renderer.renderer, gl = r.getContext();
  await SC_SET(G, SC_VIEWS(G)[0][1], SC_VIEWS(G)[0][2]);
  G.renderer.render();
  const want = String(window.KEYS || 'terrain-splat,merged-arr,lba-ramp-sun').split(',');
  const out = {};
  for (const p of r.info.programs) {
    const k = want.find((w) => p.cacheKey.includes(w)); if (!k) continue;
    const sh = gl.getAttachedShaders(p.program);
    const fs = sh.map((s) => gl.getShaderSource(s)).find((s) => s.includes('gl_FragColor') || s.includes('pc_fragColor') || /out\s+highp\s+vec4/.test(s));
    (out[k] ||= []).push({ name: p.name, fsLen: fs.length, fs });
  }
  return { text: Object.entries(out).map(([k, L]) => L.map((x, i) => `//// ${k} #${i} (${x.name})\n${x.fs}`).join('\n')).join('\n') };
})()
