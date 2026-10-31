// pixel A/B of the output pass's edge smoothing: new (texelFetch/textureLod) vs old (EDGE_OLD), same frame, same state
const G = game, R = G.renderer, r = R.renderer, gl = r.getContext();
const { warmPassPrograms } = await import('./src/engine/warmup.js');
const out = {};
const read = () => { R.render(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
const cmp = (a, b) => { let n = 0, big = 0, max = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) n++; if (d > 2) big++; if (d > max) max = d; } return { differ: n, over2: big, max, pixels: a.length / 4 }; };
for (const cfg of ['battery', 'eco']) {
  G.settings.qualityAuto = true;
  G.autoQ.gov.setProfile(cfg === 'eco' ? 2 : 1, 'probe', { phase: 'hold', commitNow: true, t: 0 }); G.autoQ.applyAll();
  G.setBattery(cfg === 'battery'); G.autoQ.applyAll(); G.warmGraphics(); await R.precompile();
  for (const scene of ['street', 'interior', 'harbour']) {
    if (scene === 'street') { G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }
    else if (scene === 'interior') G.enterRoom('house', null, true, true);
    else { G.exitRoom({ x: -107, z: 37, a: -1.2 }, true, true); G.camRig.setMode(G.settings.camera); }
    G.step(1.5);
    R.setOldEdges(false); warmPassPrograms(r, R.composer); const a = read(); const a2 = read();
    R.setOldEdges(true); warmPassPrograms(r, R.composer); const b = read();
    R.setOldEdges(false); warmPassPrograms(r, R.composer);
    out[cfg + ' ' + scene] = { newVsOld: cmp(a, b), newVsNewAgain: cmp(a, a2), edge: R.output.uniforms.edgeAA.value, sharpen: R.output.uniforms.sharpen.value, exact: R.output.uniforms.exact.value };
  }
}
return out;
