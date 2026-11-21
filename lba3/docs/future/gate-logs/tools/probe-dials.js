(() => {
  const G = game, L = G.rooms.lighttop, h = G.hero, out = {};
  out.hero = [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2));
  out.dials = L.searches.filter((s) => /^dial/.test(s.id)).map((s) => ({ id: s.id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), r: s.r }));
  out.npcs = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(h.pos) < 6).map((n) => ({ id: n.id, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2), d: +n.pos.distanceTo(h.pos).toFixed(2), r: n.bodyR ?? n.radius }));
  out.flags = { dials: G.flags.c10_dials, light: G.flags.c10_light, zoe: Object.keys(G.flags).filter((k) => /^c10_/.test(k)) };
  // try to walk by input toward dial1 and see where he ends
  const d1 = out.dials[0];
  const tries = [];
  for (const d of out.dials) { const r = P.go(d.x, d.z, { tol: 0.8 }); tries.push({ to: d.id, r: r.r, at: [h.pos.x, h.pos.z].map((v) => +v.toFixed(2)), target: P.target()?.id, label: P.target()?.label }); }
  out.tries = tries;
  // the floor colliders near him
  out.colliders = (G.room?.colliders || G.colliders || []).filter?.((c) => c.box && Math.abs((c.box.min.x + c.box.max.x) / 2 - h.pos.x) < 4 && Math.abs((c.box.min.z + c.box.max.z) / 2 - h.pos.z) < 4).map((c) => ({ min: [c.box.min.x, c.box.min.y, c.box.min.z].map((v) => +v.toFixed(2)), max: [c.box.max.x, c.box.max.y, c.box.max.z].map((v) => +v.toFixed(2)), tag: c.tag || c.name })).slice(0, 20);
  out.trace = P.trace.slice(-15);
  return out;
})()
