(async () => {
  const G = game; await G.bench.prepareAreas();
  const out = {};
  for (const id of ['zeelich', 'desert', 'hamalayi', null]) {
    if (id) G.enterRoom(id, null, false, true); else G.exitRoom({ x: -42, z: 2, a: 0 }, false, true);
    for (let i = 0; i < 30; i++) G.frame(1 / 30, i === 29);
    const root = G.room?.group || G.world.root;
    const r = {};
    for (const fold of [false, true]) {
      G.drawBatch.reset(); G.drawBatch.fold = fold;
      const t0 = performance.now(); G.drawBatch.update(root); r['draw fold ' + fold] = Math.round(performance.now() - t0);
      const st = G.drawBatch.stats(); r['stats ' + fold] = Object.values(st)[0];
    }
    // shadow batches
    G.shadowCull.reset(); G.drawBatch.reset();
    { const t0 = performance.now(); G.shadowCull.update(root, G.camera, G.hero.pos); r.shadow = Math.round(performance.now() - t0); }
    G.drawBatch.update(root);
    out[id || 'citadel'] = r;
  }
  return JSON.stringify(out, null, 1);
})()
