(() => { const mode = window.__scanMode || "here";
  const G = game, PH = G.physics, h = G.hero, HR = h.radius;
  const out = { chapter: G.flags.chapterKey, start: G.room?.id ?? 'citadel', scenes: [] };
  const keyOf = (o) => o.kind + ':' + (o.id ?? o.spot?.id ?? o.label ?? '') + (o.i != null ? '#' + o.i : '');
  const save = { x: h.pos.x, y: h.pos.y, z: h.pos.z };
  const usable = (x, y, z) => {   // what is in reach from (x, z), facing ignored
    h.pos.set(x, y, z); const got = new Set();
    const consider = (d, max, o) => { if (d < max && o.kind !== 'npc' && o.kind !== 'pet') got.add(keyOf(o)); };
    const dist = (px, pz) => Math.hypot(px - x, pz - z);
    try { G.story.interactables(consider, dist); G.story.chapters[0].baseInteractables(consider, dist, G.story.cur); } catch (e) { got.add('ERR:' + e.message); }
    return got;
  };
  const scan = (name, cx, cz, half, seeds, y0, fromEdge) => {
    const S = 0.15, N = Math.round(2 * half / S);
    const people = G.npcs.filter((n) => n.present && !n.ambient && !n.controlled && !n.away && n.rig.root.visible && Math.abs(n.pos.x - cx) < half + 1 && Math.abs(n.pos.z - cz) < half + 1);
    if (!people.length) return null;
    const cells = []; // { x, z, y, free, ppl, use:Set }
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = cx - half + i * S, z = cz - half + j * S, y = PH.groundAt(x, z, y0 + 1.2);
      const free = Number.isFinite(y) && y > y0 - 1.5 && !PH.blockedAt(x, z, y, HR) && !PH.steepAt(x, z, y);
      const pd = Math.min(...people.map((n) => Math.hypot(x - n.pos.x, z - n.pos.z) - (n.bodyR ?? n.radius) - HR));
      cells.push({ i, j, x, z, y, free, pd, use: free ? usable(x, y, z) : new Set() });
    }
    const at = (i, j) => (i < 0 || j < 0 || i > N || j > N) ? null : cells[j * (N + 1) + i];
    const flood = (withPeople) => {
      const seen = new Uint8Array(cells.length), q = [];
      const ok = (c) => c && c.free && (!withPeople || c.pd > 0);
      const push = (c) => { const k = c.j * (N + 1) + c.i; if (!seen[k] && ok(c)) { seen[k] = 1; q.push(c); } };
      if (fromEdge) { for (const c of cells) if (c.i === 0 || c.j === 0 || c.i === N || c.j === N) push(c); }
      for (const [sx, sz] of seeds) { const c = at(Math.round((sx - cx + half) / S), Math.round((sz - cz + half) / S)); if (c) { push(c); if (!ok(c)) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) { const d = at(c.i + a, c.j + b); if (d) push(d); } } }
      while (q.length) { const c = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const d = at(c.i + a, c.j + b); if (d && Math.abs(d.y - c.y) < 0.6) push(d); } }
      return seen;
    };
    const s0 = flood(false), s1 = flood(true);
    const things = new Map();
    cells.forEach((c, k) => { for (const u of c.use) { const t = things.get(u) || { cells: 0, r0: 0, r1: 0, minPd: 9 }; t.cells++; if (s0[k]) t.r0++; if (s1[k]) t.r1++; if (s0[k] && c.pd < t.minPd) t.minPd = c.pd; things.set(u, t); } });
    const rows = [];
    for (const [k, t] of things) {
      const verdict = t.r0 > 0 && t.r1 === 0 ? 'BLOCKED' : t.r0 > 0 && (t.r1 < t.r0 * 0.6 || t.minPd < 1.0) ? 'NEAR' : t.r0 === 0 ? 'unreachable-anyway' : 'ok';
      if (verdict !== 'ok') rows.push({ thing: k, verdict, useCells: t.cells, reach0: t.r0, reach1: t.r1, minGapToPerson: +t.minPd.toFixed(2) });
    }
    return { scene: name, people: people.map((n) => [n.def.id, +n.pos.x.toFixed(2), +n.pos.z.toFixed(2), n.bodyR]), things: things.size, rows };
  };
  const sceneScan = () => {
    const R = G.room;
    if (R && !R.outdoor) {
      const c = G.regions?.centreOf?.(R.id) || R.center || { x: h.pos.x, z: h.pos.z };
      const seeds = [[R.spawn?.x ?? h.pos.x, R.spawn?.z ?? h.pos.z], ...(R.exits || []).map((e) => [e.x, e.z])];
      return scan(R.id, c.x, c.z, 13, seeds, R.spawn?.y ?? h.pos.y, false);
    }
    // outdoors: a box round each story person (merged by proximity: one per person)
    const list = [];
    for (const n of G.npcs.filter((n) => n.present && !n.ambient && n.rig.root.visible && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 400)) {
      const r = scan((G.room?.id ?? 'citadel') + '@' + n.def.id, n.pos.x, n.pos.z, 5, [], n.pos.y, true);
      if (r && r.rows.length) list.push(r);
    }
    return list;
  };
  try {
    const here = sceneScan(); out.scenes.push(...(Array.isArray(here) ? here : [here]).filter(Boolean));
    if (mode === 'rooms') {
      const ids = [...(G.regions?.of?.keys?.() || [])].filter((id) => { const c = G.regions.centreOf(id); return c && !c.outdoor && G.regions.has(id); });
      out.rooms = ids;
      for (const id of ids) {
        if (id === out.start) continue;
        try { G.enterRoom(id, null, true, true); for (let i = 0; i < 8; i++) G.step(0.1); G.story.refreshCast(); G.step(0.05); }
        catch (e) { out.scenes.push({ scene: id, error: e.message }); continue; }
        if ((G.room?.id) !== id) { out.scenes.push({ scene: id, error: 'not entered: ' + (G.room?.id ?? 'out') }); continue; }
        const r = sceneScan(); if (r) out.scenes.push(...(Array.isArray(r) ? r : [r]));
      }
    }
  } catch (e) { out.error = e.message + ' ' + e.stack?.split('\n')[1]; }
  h.pos.set(save.x, save.y, save.z);
  return out;
})()
