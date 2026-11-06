(() => {
  // GATE-1: can each lighthouse dial be reached and turned by input with Zoé and Arthur where they stand?
  const G = game, L = G.rooms.lighttop, h = G.hero, out = { dials: [] };
  const npcs = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(h.pos) < 6);
  out.npcs = npcs.map((n) => ({ id: n.def?.id, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2) }));
  const dials = L.searches.filter((s) => /^dial/.test(s.id));
  for (const d of dials) {
    const res = { id: d.id, spots: 0, tried: [] };
    const cand = [];
    for (let a = 0; a < 24; a++) for (const rr of [0.5, 0.6]) {
      const x = d.x + Math.sin(a / 24 * 6.283) * rr, z = d.z + Math.cos(a / 24 * 6.283) * rr;
      if (npcs.some((n) => Math.hypot(n.pos.x - x, n.pos.z - z) < 0.9)) continue;
      const y = P._stepTo(x + 0.05, h.pos.y, z, x, z); if (y == null) continue;
      cand.push({ x, z });
    }
    res.spots = cand.length;
    for (const c of cand.slice(0, 6)) {
      const r = P.go(c.x, c.z, { tol: 0.15, maxT: 25 });
      P.face(d.x, d.z); const tg = P.target();
      const t = { to: [+c.x.toFixed(2), +c.z.toFixed(2)], r: r.r, at: [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)], target: tg?.kind + ':' + tg?.id };
      if (tg?.kind === 'c10dial' || /dial/.test(tg?.label || '')) {
        const before = JSON.stringify(G.flags.c10_dials); P.tap('KeyE', 0.1); P.settle(); t.turned = before !== JSON.stringify(G.flags.c10_dials);
        res.tried.push(t); break;
      }
      res.tried.push(t);
      if (G.room?.id !== 'lighttop') break;
    }
    out.dials.push(res);
  }
  out.room = G.room?.id; out.flags = { dials: G.flags.c10_dials, light: G.flags.c10_light };
  return out;
})()
