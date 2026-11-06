(async () => {
  // SHADE-COST: every program this round touched compiles in the 1997 look too (flat shading: the terrain's world normal
  // comes from its own varying there) and with each benchgpu switch: shader errors caught by three's debug hook,
  // programs counted. Street and house views (views.js).
  const G = game, RR = G.renderer, r = RR.renderer;
  const { setTerrainShade } = await import('/src/engine/terrain.js');
  const errs = [];
  r.debug.checkShaderErrors = true;
  r.debug.onShaderError = (gl, prog, vs, fs) => { errs.push((gl.getShaderInfoLog(fs) || '') + (gl.getShaderInfoLog(vs) || '') + (gl.getProgramInfoLog(prog) || '')); };
  const mats = () => { const s = new Set(); G.scene.traverse((o) => { for (const m of [o.material].flat()) if (m && !m.isShaderMaterial && !m.isRawShaderMaterial) s.add(m); }); return s; };
  const define = (name, on) => { for (const m of mats()) { if (!m.defines && !on) continue; m.defines = { ...(m.defines || {}) }; if (on) m.defines[name] = ''; else delete m.defines[name]; m.needsUpdate = true; } };
  const out = [];
  const V = SC_VIEWS(G);
  for (const [name, set, tick] of [V[0], V[3]]) {
    await SC_SET(G, set, tick);
    const p0 = r.info.programs.length;
    RR.setRetro(true); RR.render(); RR.render();
    out.push(`${name} retro: programs +${r.info.programs.length - p0}, errors ${errs.length}`);
    RR.setRetro(false); RR.render();
  }
  const sw = [['grassSkip', false], ['nrmVarying', true], ['diag', 'implicit'], ['diag', 'grass'], ['diag', 'unlit'], ['sunLambert', true]];
  for (const [k, v] of sw) { const was = { grassSkip: true, nrmVarying: false, diag: null, sunLambert: false }[k]; setTerrainShade(k, v); RR.render(); setTerrainShade(k, was); RR.render(); out.push(`terrain ${k}=${v}: errors ${errs.length}`); }
  for (const d of ['SC_LAMP_OLD', 'SC_IBL_OLD', 'SC_SUN_OLD']) { define(d, true); RR.render(); define(d, false); RR.render(); out.push(`${d}: errors ${errs.length}`); }
  for (const f of ['setOldCentre', 'setOldLuma', 'setOldEdges']) { RR[f](true); RR.render(); RR[f](false); RR.render(); out.push(`${f}: errors ${errs.length}`); }
  out.push('errors: ' + (errs.length ? errs.map((e) => e.slice(0, 300)).join(' | ') : 'none'));
  return { text: out.join('\n') };
})()
