(async () => {
  // The render-submission path piece by piece, each repeated REP times on the same frame (the timer's 0.1 ms grain
  // averaged out), the GPU queue drained before each timed block. Street route (window.ROUTE), after 60 frames.
  const G = game, R = G.renderer.renderer, gl = R.getContext(), RR = G.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; for (let i = 0; i < 60; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, i % 6 === 0); }
  G.frame(1 / 30, true);
  const drain = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const REP = +(window.REP || 30);
  const time = (f) => { drain(); f(); let a = 0; for (let i = 0; i < REP; i++) { drain(); const t0 = performance.now(); f(); a += performance.now() - t0; } drain(); return +(a / REP).toFixed(3); };
  const { updateShownWorld } = await import('/src/engine/drawcull.js');
  const S = G.scene, root = G.room?.group || G.world.root, st = { hidden: [], prev: [], frame: 0 };
  let nObj = 0, nVis = 0, nAuto = 0, nL0 = 0; S.traverse((o) => { nObj++; }); S.traverseVisible((o) => { nVis++; if (o.matrixAutoUpdate) nAuto++; if (o.layers.test(G.camera.layers)) nL0++; });
  const out = { objects: nObj, visible: nVis, visibleAutoMatrix: nAuto, visibleOnCameraLayer: nL0 };
  out.updateShownWorld = time(() => { S.matrixWorldAutoUpdate = true; updateShownWorld(S, st); });
  out.drawBatchWatch = time(() => G.drawBatch.update(root));
  out.shadowCullUpdate = time(() => G.shadowCull.update(root, G.camera, G.hero.pos));
  out.farCullBlobs = time(() => { RR.pre(); RR.post(); });
  // three's render of the scene pass without drawing (projectObject, sort, lights setup), shadow map not redrawn
  const stub = (f) => { const d = R.renderBufferDirect, au = R.shadowMap.autoUpdate; R.renderBufferDirect = () => {}; R.shadowMap.autoUpdate = false; try { f(); } finally { R.renderBufferDirect = d; R.shadowMap.autoUpdate = au; } };
  S.matrixWorldAutoUpdate = false;
  out.mainNoDraw = time(() => stub(() => { R.setRenderTarget(RR.composer.renderTarget1); R.render(S, G.camera); }));
  out.mainDraw = time(() => { const au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false; try { R.setRenderTarget(RR.composer.renderTarget1); R.render(S, G.camera); } finally { R.shadowMap.autoUpdate = au; } });
  // the shadow map alone (cache + live casters)
  let calls = 0; const cnt = R.renderBufferDirect; R.renderBufferDirect = function (...a) { calls++; return cnt.apply(this, a); };
  out.mainCalls = (calls = 0, (R.shadowMap.autoUpdate = false), R.setRenderTarget(RR.composer.renderTarget1), R.render(S, G.camera), (R.shadowMap.autoUpdate = true), calls);
  R.renderBufferDirect = cnt;
  out.fullComposer = time(() => { RR.composer.render(); });
  S.matrixWorldAutoUpdate = true;
  out.perCallUs = +((1000 * (out.mainDraw - out.mainNoDraw)) / Math.max(1, out.mainCalls)).toFixed(1);
  out.shadowEtc = +(out.fullComposer - out.mainDraw).toFixed(3);
  return JSON.stringify(out);
})()
