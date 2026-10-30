// CONTAINERS-2: is any outdoor container in somebody's way? For every container: the nearest NPC (as placed at the
// start of each chapter's area), enemy patrol segment, story door (every chapter), room exit and region zone.
//   GAME_URL=http://localhost:8173/ node docs/lba3-production/reviews/CONTAINERS-2/clearance.mjs
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
const rows = await page.evaluate(() => {
  const G = game, out = [];
  const seg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const doors = [];
  for (const ch of G.story.chapters || []) { try { for (const d of ch.doors?.() || []) if (Number.isFinite(d.x)) doors.push(d); } catch (e) { /* (a chapter's doors need its state) */ } }
  const areas = [[null, G.world.givers], ...Object.entries(G.rooms).filter(([, R]) => R.outdoor).map(([id, R]) => [id, R.givers || []])];
  for (const [id, list] of areas) {
    const R = id ? G.rooms[id] : null;
    for (const gv of list) {
      if (!gv.kind) continue;   // (only the containers: the older givers are as they were)
      const near = { npc: 99, patrol: 99, door: 99, exit: 99, zone: 99 };
      for (const n of G.npcs || []) if (n.pos && Math.hypot(n.pos.x - gv.x, n.pos.z - gv.z) < near.npc && (n.room ?? null) === id) near.npc = Math.hypot(n.pos.x - gv.x, n.pos.z - gv.z);
      for (const e of G.enemies || []) { const P = e.patrol; if (!P || P.length < 2) continue; for (let i = 0; i < P.length; i++) near.patrol = Math.min(near.patrol, seg(gv.x, gv.z, P[i], P[(i + 1) % P.length])); }
      for (const d of doors) near.door = Math.min(near.door, Math.hypot(d.x - gv.x, d.z - gv.z));
      for (const h of id ? [] : G.world.houses) near.door = Math.min(near.door, Math.hypot(h.door.x - gv.x, h.door.z - gv.z));
      for (const e of R?.exits || []) near.exit = Math.min(near.exit, Math.hypot(e.x - gv.x, e.z - gv.z));
      const zones = R ? R.zones : G.world.zones;
      for (const z of Array.isArray(zones) ? zones : Object.values(zones || {}).flat()) if (z && Number.isFinite(z.x)) near.zone = Math.min(near.zone, Math.hypot(z.x - gv.x, z.z - gv.z) - (z.r || 0));
      for (const k in near) near[k] = +near[k].toFixed(1);
      const tight = near.npc < 2.5 || near.patrol < 1.5 || near.door < 3 || near.exit < 3 || near.zone < 1;
      out.push({ area: id || 'citadel', id: gv.id, kind: gv.kind, ...near, tight });
    }
  }
  return out;
});
for (const r of rows) console.log((r.tight ? 'TIGHT ' : 'ok    ') + JSON.stringify(r));
console.log(rows.length, 'containers,', rows.filter((r) => r.tight).length, 'tight');
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
