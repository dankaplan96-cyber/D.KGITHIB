(async () => {
  // CPU-WALK census: what the shown-world update walks on a route, and what of it ever changes. After the update of
  // each drawn frame (Renderer.mid), every object reached through shown parents is recorded: its ten TRS numbers, its
  // visibility, its parent, its child count. Over FRAMES frames: how many are walked, how many ever change (and how),
  // grouped by the scene's top-level child and by kind (draw-batched piece, shadow-batch member, rig part, other).
  const G = game, ROUTE = String(window.ROUTE || 'street'), FR = +(window.FRAMES || 240), CAM = String(window.CAM || 'follow');
  document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play');
  await G.bench.prepareAreas();
  G.bench.setCamera(CAM);
  const route = G.bench.routes().find((x) => x.id === ROUTE);
  G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
  let t = 0; for (let i = 0; i < 60; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }
  const rec = new Map();   // object -> { sig, trs, vis, par, kids, top }
  const topOf = (o) => { let x = o; while (x.parent && x.parent !== G.scene) x = x.parent; return x; };
  const shadowMembers = new Set(); for (const A of G.shadowCull.areas.values()) for (const C of [...(A.members || []), ...(A.quiet || []), ...(A.solo || [])]) if (C?.o) shadowMembers.add(C.o);
  const rigRoots = new Set(); for (const L of [G.walkers?.list, G.people, G.npcs, G.enemies, [G.hero]]) for (const a of L || []) if (a?.rig?.root) rigRoots.add(a.rig.root);
  const kind = (o) => { if (o.userData.drawBatched) return 'batched'; if (shadowMembers.has(o)) return 'shadowMember'; for (let x = o; x; x = x.parent) { if (rigRoots.has(x)) return 'rig'; if (x.userData.keep) return 'keep'; } return o.isMesh ? 'mesh' : o.isBone ? 'bone' : 'node'; };
  const C = { frames: 0, walked: [] };
  const mid = G.renderer.mid;
  G.renderer.mid = function (...a) {
    C.frames++;
    let n = 0;
    const walk = (o) => {
      for (const k of o.children) {
        n++;
        let R = rec.get(k);
        const p = k.position, q = k.quaternion, s = k.scale;
        const trs = [p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z].join(',');
        if (!R) rec.set(k, (R = { trs, vis: k.visible, par: k.parent, kids: k.children.length, nTrs: 0, nVis: 0, nPar: 0, nKids: 0, seen: 0, mwF: k.__mwF, nMw: 0 }));
        else {
          if (R.trs !== trs) { R.nTrs++; R.trs = trs; }
          if (R.vis !== k.visible) { R.nVis++; R.vis = k.visible; }
          if (R.par !== k.parent) { R.nPar++; R.par = k.parent; }
          if (R.kids !== k.children.length) { R.nKids++; R.kids = k.children.length; }
          if (R.mwF !== k.__mwF) { R.nMw++; R.mwF = k.__mwF; }
        }
        R.seen++;
        if (k.visible) walk(k);
      }
    };
    walk(G.scene);
    C.walked.push(n);
    return mid.apply(this, a);
  };
  const stats0 = [];
  for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); const S = G.renderer._mw?.stats; if (S) stats0.push({ ...S }); }
  G.renderer.mid = mid;
  // group
  const groups = {};
  for (const [o, R] of rec) {
    if (R.seen < C.frames / 2) continue;
    const top = topOf(o), tk = (top.name || top.type) + (top.userData?.drawBatchRoot ? '' : '');
    const kd = kind(o);
    const g = (groups[tk + ' / ' + kd] ??= { n: 0, shown: 0, trs: 0, vis: 0, par: 0, kids: 0, mw: 0 });
    g.n++; if (R.vis) g.shown++; if (R.nTrs) g.trs++; if (R.nVis) g.vis++; if (R.nPar) g.par++; if (R.nKids) g.kids++; if (R.nMw) g.mw++;
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const out = [`census ${ROUTE} (${CAM}), ${C.frames} frames: objects reached through shown parents ${avg(C.walked).toFixed(0)} a frame (min ${Math.min(...C.walked)}, max ${Math.max(...C.walked)})`];
  out.push(`shownTree stats a frame (avg): ` + ['visited', 'composed', 'world', 'own'].map((k) => `${k} ${avg(stats0.map((s) => s[k])).toFixed(1)}`).join(' · '));
  out.push('group (top-level / kind): n · shown · TRS changed · visibility changed · reparented · children changed · world recomputed');
  for (const [k, g] of Object.entries(groups).sort((a, b) => b[1].n - a[1].n)) out.push(`  ${k}: ${g.n} · ${g.shown} · ${g.trs} · ${g.vis} · ${g.par} · ${g.kids} · ${g.mw}`);
  const db = G.drawBatch.areas.get(G.room?.group || G.world.root);
  out.push(`draw batch pieces watched: ${db ? db.members.length : 'none'}`);
  return { text: out.join('\n') };
})()
