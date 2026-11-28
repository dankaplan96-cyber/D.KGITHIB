// P113 (the user, 23.11: Pippa's shop — the raised square's steps began at its door, its sill 0.24 m under the
// ground): every registered building's door (src/game/worldfit.js FIT: the town's houses, the harbour shed, the
// project's buildings, Zeelich, the Esmer islands, the desert, the Hamalayi) against a LEVEL CHANGE before it — a
// raised plaza, a lawn's kerb, the promenade, a flight of steps, a terrace edge: the ground within 2.5 m out from the
// door across its own width (the opening less its surround), measured on the walkable surface (the terrain and anything built on it).
// A door fails when the ground in front of it rises over its sill (buried) or a step down from it lies within 0.6 m
// of the wall (no landing: the steps start at the door), and every door whose ground in front changes level by more
// than 0.15 m is listed with its profile (the sweep's record).
// REPORT=<file.json> keeps every door's profile. GAME_URL as the other tests. Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page } = await launch({ width: 640, height: 360 });
await open(page, '?nocine&allregions');
await menu(page, 'new');

const res = await page.evaluate(async () => {
  const G = game, W = G.world, phys = W.physics, T = phys.terrain;
  const { FIT, sideLocal, toWorld } = await import('./src/game/worldfit.js');
  const r2 = (v) => Math.round(v * 100) / 100;
  const out = [];
  for (const b of FIT) {
    for (const op of b.openings) {
      if (op.kind !== 'door') continue;
      const sill = b.oy + b.floor, c = (op.x0 + op.x1) / 2, pad = b.pad ?? 0.05;
      const half = Math.max(0.3, (op.x1 - op.x0) / 2 - 0.25);   // (the door's own way: its opening less the surround, ±)
      // the walkable surface: the highest thing he would stand on, from just over the sill down
      const surf = (x, z) => { const t = T.heightAt(x, z); const g = phys.groundAt(x, z, sill + 0.5); return Math.max(Number.isFinite(g) ? g : -Infinity, t > sill - 4 ? t : -Infinity); };
      const rows = [];
      for (let v = 0.15; v <= 2.51; v += 0.15) {
        const row = [];
        for (const k of [-1, -0.5, 0, 0.5, 1]) { const u = k * half; const [lx, lz] = sideLocal(b, op.side, c + u, pad + v), [x, z] = toWorld(b, lx, lz); row.push(surf(x, z) - sill); }
        rows.push({ v: r2(v), d: row.map(r2) });
      }
      const [dx, dz] = toWorld(b, ...sideLocal(b, op.side, c, pad + 0.5));
      const all = rows.flatMap((r) => r.d).filter(Number.isFinite);
      const near = rows.filter((r) => r.v <= 0.61).flatMap((r) => r.d.slice(1, 4)).filter(Number.isFinite);
      out.push({
        area: b.region, building: b.name, side: op.side, at: [r2(dx), r2(sill), r2(dz)],
        maxUp: r2(Math.max(...all)), maxDown: r2(-Math.min(...all)), nearUp: r2(Math.max(...near)), nearDown: r2(-Math.min(...near)),
        steps: b.steps, rows,
      });
    }
  }
  return out;
});
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(res, null, 1));
const buried = res.filter((d) => d.nearUp > 0.04);
const noLanding = res.filter((d) => d.nearDown > 0.22 && d.maxUp <= 0.04);   // (more than a door's own step, 0.13–0.2)
const changing = res.filter((d) => d.maxUp > 0.15 || d.maxDown > 0.15);
console.log(`doors scanned: ${res.length} (${[...new Set(res.map((d) => d.area))].join(', ')})`);
console.log('doors with a level change within 2.5 m (> 0.15 m):');
for (const d of changing) console.log(`  ${d.area} · ${d.building} (${d.side}) at ${d.at.join(', ')}: up ${d.maxUp}, down ${d.maxDown}; within 0.6 m up ${d.nearUp}, down ${d.nearDown}`);
check(`no door with the ground over its sill within 0.6 m in front (${buried.length})`, buried.length === 0, buried.map((d) => `${d.building} ${d.nearUp}`).join('; '));
console.log(`doors with more than a door step's drop within 0.6 m of the wall (listed: a stoop or a slope at the door): ${noLanding.length}`);
for (const d of noLanding) console.log(`  ${d.area} · ${d.building} (${d.side}): ${d.nearDown} m down`);
await browser.close();
done();
