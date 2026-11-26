(() => {
  const G = game, h = G.hero, out = {};
  out.hero = [h.pos.x, h.pos.z].map((v) => +v.toFixed(2));
  out.npcs = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(h.pos) < 8).map((n) => ({ id: n.def?.id, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2), d: +n.pos.distanceTo(h.pos).toFixed(2) }));
  out.exits = (G.room?.exits || []).map((e) => ({ to: e.to || e.room, x: +(e.x ?? 0).toFixed(2), z: +(e.z ?? 0).toFixed(2), r: e.r }));
  // free directions by the game's own collision (no people): 16 headings, 0.6 m
  out.free = [];
  for (let a = 0; a < 16; a++) { const nx = h.pos.x + Math.sin(a / 16 * 6.283) * 0.6, nz = h.pos.z + Math.cos(a / 16 * 6.283) * 0.6; out.free.push(P._stepTo(h.pos.x, h.pos.y, h.pos.z, nx, nz) == null ? 0 : 1); }
  const plain = P.plan(1601.4, -1.1, {}); const ppl = P.plan(1601.4, -1.1, { people: true });
  out.planNoPeople = plain?.ok ?? plain; out.planPeople = ppl?.ok ?? ppl;
  return out;
})()
