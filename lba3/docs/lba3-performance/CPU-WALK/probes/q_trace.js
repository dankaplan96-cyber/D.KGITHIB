(async () => {
  // CPU-WALK debugging: the routes in order (W_ROUTES) with the walk check; three's matrix calls on every object
  // (updateMatrix, updateMatrixWorld, updateWorldMatrix, copy, applyMatrix4, attach) recorded per frame with their
  // caller; at the first mismatch, the record of the mismatching object and its parent over the last frames.
  const G = game, FR = +(window.FRAMES || 360);
  const SEQ = String(window.ROUTES || 'street,interior,combat,transition,arrival,hamalayi,sweep').split(',');
  const DC = await import('./src/engine/drawcull.js'), MW = DC.MW;
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const O3 = G.scene.constructor.prototype.__proto__;   // (Object3D.prototype: Scene extends Object3D)
  const log = new Map(); let fi = 0;
  const rec = (o, what) => { let L = log.get(o.id); if (!L) log.set(o.id, (L = [])); if (L.length > 40) L.shift(); const st = (new Error().stack || '').split('\n').slice(3, 6).map((s) => s.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+/, '')).join(' < '); L.push(`${fi}: ${what} [${st}] trs=${[o.position.x, o.position.y, o.position.z, o.quaternion._x, o.quaternion._y, o.quaternion._z, o.quaternion._w].map((v) => v.toFixed(4)).join(',')}`); };
  const wrap = (name) => { const f = O3[name]; O3[name] = function (...a) { rec(this, name + '(' + a.map((x) => typeof x === 'object' ? (x?.id ?? '') : x).join(',') + ')'); return f.apply(this, a); }; return () => { O3[name] = f; }; };
  const undo = ['updateMatrix', 'updateWorldMatrix', 'copy', 'applyMatrix4', 'attach', 'add', 'remove'].map(wrap);
  const R = G.renderer, comp = R.composer.render;
  const K = (MW.check = { frames: 0, compared: 0, bad: 0, casters: 0, castersBad: 0, pieces: 0, piecesBad: 0, samples: [] });
  const M4 = G.camera.matrixWorld.constructor;
  let found = null, route = null, t = 0;
  // (the walk's own decisions for the watched objects: frozen or not, each frame)
  const walkLog = [];
  try {
    for (let i = 0; i < FR * SEQ.length && !found; i++) {
      fi = i;
      if (i % FR === 0) { route = G.bench.routes().find((x) => x.id === SEQ[i / FR]); G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play'; t = 0; walkLog.push(`${i}: route ${SEQ[i / FR]}`); }
      t += 1 / 60; route.drive(t, 1 / 60);
      R.composer.render = (i % FR) % 40 === 39 ? comp : () => {};
      const b0 = K.bad;
      G.frame(1 / 60, true);
      if (K.bad > b0) {
        const walk = (o) => { for (const k of o.children) { if (!k.visible) continue; if (k.matrixWorldAutoUpdate) { const e = new M4().multiplyMatrices(k.parent.matrixWorld, k.matrixAutoUpdate ? new M4().compose(k.position, k.quaternion, k.scale) : k.matrix); if (!e.equals(k.matrixWorld)) return k; } const r = walk(k); if (r) return r; } return null; };
        const o = walk(G.scene);
        if (!o) continue;
        const mOK = new M4().compose(o.position, o.quaternion, o.scale).equals(o.matrix);
        const root = (() => { let x = o; while (x.parent && x.parent !== G.scene) x = x.parent; return x; })();
        const actor = [G.hero, ...(G.npcs || []), ...(G.enemies || [])].find((a) => a?.rig?.root === root);
        found = { frame: i, F: MW.frame, obj: `${o.name || o.type}#${o.id}`, parent: `${o.parent.name || o.parent.type}#${o.parent.id}`, matrixIsComposeOfTRS: mOK, rootName: root.name, actor: actor ? (actor.id || actor.name || actor.constructor.name) : null,
          objLog: log.get(o.id) || [], parentLog: log.get(o.parent.id) || [], samples: K.samples.slice(0, 3) };
      }
    }
  } finally { for (const u of undo) u(); R.composer.render = comp; MW.check = null; }
  return { text: JSON.stringify(found, null, 1) + '\n' + walkLog.join('\n') };
})()
