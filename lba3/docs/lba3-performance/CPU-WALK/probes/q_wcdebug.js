(async () => {
  // CPU-WALK debugging: run a route with the walk check on; at the first frame with a mismatch, dump the state of the
  // first mismatching object and its ancestors (caches, frames, records).
  const G = game, ROUTE = String(window.ROUTE || 'arrival'), FR = +(window.FRAMES || 400);
  const DC = await import('./src/engine/drawcull.js'), MW = DC.MW;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const SEQ = ROUTE.split(',');
  const R = G.renderer, comp = R.composer.render; R.composer.render = () => {};
  const K = (MW.check = { frames: 0, compared: 0, bad: 0, casters: 0, castersBad: 0, pieces: 0, piecesBad: 0, samples: [] });
  const M4 = G.camera.matrixWorld.constructor;
  const nm = (o) => (o.name || o.type) + '#' + o.id;
  const info = (o) => {
    const p = o.position, q = o.quaternion, s = o.scale, c = o.__trs;
    const exp = new M4().multiplyMatrices(o.parent.matrixWorld, new M4().compose(p, q, s));
    return { o: nm(o), vis: o.visible, trs: [p.x, p.y, p.z, q._x, q._y, q._z, q._w, s.x, s.y, s.z].map((v) => +v.toFixed(4)).join(','), trsCache: c ? Array.from(c).map((v) => +v.toFixed(4)).join(',') : null,
      mwF: o.__mwF, visF: o.__visF, hid: o.__hid, q: o.__q, frzBy: o.__frzBy ? { alive: o.__frzBy.alive, okF: o.__frzBy.okF, root: nm(o.__frzBy.k), owner: nm(o.__frzBy.Z.owner) } : null, frz: o.__frz ? o.__frz.ranges.filter((r) => r.alive).map((r) => nm(r.k)).join(' ') : null,
      ok: exp.equals(o.matrixWorld), mwnu: o.matrixWorldNeedsUpdate, mau: o.matrixAutoUpdate, own: o.updateMatrixWorld !== DC.MW.constructor && o.updateMatrixWorld.name };
  };
  let t = 0, found = null;
  const log = [];
  let route = null;
  for (let i = 0; i < FR * SEQ.length && !found; i++) {
    if (i % FR === 0) { route = G.bench.routes().find((x) => x.id === SEQ[i / FR]); G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play'; t = 0; log.push('route ' + SEQ[i / FR]); }
    t += 1 / 60; route.drive(t, 1 / 60);
    const b0 = K.bad;
    R.composer.render = (i % FR) % 40 === 39 ? comp : () => {};   // (every 40th drawn for real, as q_walkcheck.js)
    G.frame(1 / 60, true);
    log.push(`${i}: F=${MW.frame} visited=${R._mw.stats.visited} frozen=${R._mw.stats.frozen} thaw=${R._mw.stats.thaw} freeze=${R._mw.stats.freeze} trans=${!!G.trans} room=${G.room?.id || 'citadel'}`);
    if (K.bad > b0) {
      // find the first mismatching object
      const walk = (o) => { for (const k of o.children) { if (!k.visible) continue; if (k.matrixWorldAutoUpdate) { const e = new M4().multiplyMatrices(k.parent === G.scene ? new M4() : k.parent.matrixWorld, k.matrixAutoUpdate ? new M4().compose(k.position, k.quaternion, k.scale) : k.matrix); if (!e.equals(k.matrixWorld)) return k; } const r = walk(k); if (r) return r; } return null; };
      const o = walk(G.scene);
      if (!o) { log.push('mismatch but none found again'); continue; }
      const chain = []; for (let x = o; x && x !== G.scene; x = x.parent) chain.push(info(x));
      found = { frame: i, F: MW.frame, samples: K.samples.slice(0, 4), chain };
    }
  }
  R.composer.render = comp; MW.check = null;
  return { text: JSON.stringify(found, null, 1) + '\n' + log.slice(-25).join('\n') };
})()
