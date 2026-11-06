(() => {
  // GATE-1 postgame: after Continue from the save kept at the end of segment 14 (Keep Exploring), by input:
  // out of the house, a walk across town, a talk; then the travel points' menus are not checked here (tests/travel.mjs)
  const G = game, out = {};
  P.settle();
  out.start = P.state(); out.free = !!G.flags.ep_free; out.chapter = G.flags.chapterKey;
  const e = G.room?.exits?.find((x) => !x.room); if (e) out.exit = P.through(e.x, e.z);
  out.outside = P.state();
  const w = G.world.well; out.toWell = P.go(w.x + 3, w.z + 3, { tol: 1.5, run: true }).r;
  const npc = (G.npcs || []).filter((n) => n.present && n.def?.id && !/^res|walker/.test(n.def.id)).sort((a, b) => a.pos.distanceTo(G.hero.pos) - b.pos.distanceTo(G.hero.pos))[0];
  if (npc) { const r = P.talk(npc.def.id, { run: true }); out.talk = { id: npc.def.id, r: r.r, lines: r.lines }; }
  out.end = P.state();
  return out;
})()
