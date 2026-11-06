(() => {
  // GATE-1 ISO experiment: the same dial loop as segment 13, (a) as is, (b) with Zoé and Arthur made non-solid (ISO)
  const G = game, L = G.rooms.lighttop, out = {};
  const loop = () => { for (let pass = 0; pass < 3 && !G.flags.c10_light; pass++) for (const i of [1, 2, 3]) { if (G.flags.c10_light) break; const s = L.searches.find((x) => x.id === 'dial' + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); } return { dials: G.flags.c10_dials, light: !!G.flags.c10_light, room: G.room?.id }; };
  const npcs = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(G.hero.pos) < 6);
  out.solidKeys = npcs.map((n) => Object.keys(n).filter((k) => /solid|body|radius|block/i.test(k)).map((k) => k + '=' + JSON.stringify(n[k])?.slice(0, 40)));
  // (b) ISO: move them 1.6 m back from the dial bank, away from the dials' line
  const c = L.group.position;
  for (const n of npcs) { const dx = c.x - n.pos.x, dz = c.z - n.pos.z, l = Math.hypot(dx, dz) || 1; n.pos.x += dx / l * 1.6; n.pos.z += dz / l * 1.6; }
  out.moved = npcs.map((n) => [n.def?.id, +n.pos.x.toFixed(2), +n.pos.z.toFixed(2)]);
  G.step(0.2);
  out.after = npcs.map((n) => [n.def?.id, +n.pos.x.toFixed(2), +n.pos.z.toFixed(2)]);
  out.result = loop();
  out.trace = P.trace.slice(-8);
  return out;
})()
