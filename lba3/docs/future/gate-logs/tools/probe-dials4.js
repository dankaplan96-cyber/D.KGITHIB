(() => {
  // GATE-1: walk (input) to each dial's search spot; report the nearest reachable point, what E targets, and E's effect.
  // run 1 as is; then (ISO) Zoé and Arthur moved 1.6 m back toward the room's centre and the same again
  const G = game, L = G.rooms.lighttop, h = G.hero, out = { runs: [] };
  const npcs = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(h.pos) < 6);
  const run = (tag) => {
    const res = { tag, npcs: npcs.map((n) => [n.def?.id, +n.pos.x.toFixed(2), +n.pos.z.toFixed(2)]), dials: [] };
    for (const i of [1, 2, 3]) {
      const s = L.searches.find((x) => x.id === 'dial' + i);
      const r = P.go(s.x, s.z, { tol: 0.1, maxT: 20, people: true });
      const dist = Math.hypot(h.pos.x - s.x, h.pos.z - s.z);
      P.face(s.x, s.z);
      const it = G.findInteractable();
      const before = JSON.stringify(G.flags.c10_dials);
      if (it) { P.tap('KeyE', 0.1); P.settle(); }
      res.dials.push({ id: s.id, spot: [+s.x.toFixed(2), +s.z.toFixed(2)], go: r.r, at: [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)], dist: +dist.toFixed(2), reach: +(s.r + 0.2).toFixed(2), target: it ? (it.kind + ':' + (it.npc?.def?.id || it.id || it.label)) : null, turned: before !== JSON.stringify(G.flags.c10_dials), room: G.room?.id });
      if (G.room?.id !== 'lighttop') break;
    }
    return res;
  };
  out.runs.push(run('as is'));
  if (G.room?.id === 'lighttop') {
    const c = L.group.position;
    for (const n of npcs) { const dx = c.x - n.pos.x, dz = c.z - n.pos.z, l = Math.hypot(dx, dz) || 1; n.pos.x += dx / l * 1.6; n.pos.z += dz / l * 1.6; }
    G.step(0.1);
    out.runs.push(run('ISO: Zoé and Arthur moved back 1.6 m'));
  }
  out.flags = { dials: G.flags.c10_dials, light: !!G.flags.c10_light, zoeAsk: !!G.flags.c10_zoeAsk };
  out.heroR = h.radius;
  return out;
})()
