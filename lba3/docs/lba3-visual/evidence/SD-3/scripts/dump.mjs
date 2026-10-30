// dump the Hamalayi's heights, slopes, colliders and contract spots (region-local) → json for a plan map
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a5c22898755b8fc79/lba2-remaster/tests/lib/boot.mjs';
import fs from 'fs';
const OUT = process.argv[2];
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine'); await menu(page, 'new');
const d = await page.evaluate(() => {
  const G = game, R = G.rooms.hamalayi, ox = 4300, oz = 0, P = G.physics, T = R.terrain;
  const H = [], S = [];
  for (let z = -110; z <= 110; z += 1) { const rh = [], rs = []; for (let x = -110; x <= 110; x += 1) { rh.push(+T.heightAt(x, z).toFixed(2)); rs.push(+T.slopeAt(x, z).toFixed(2)); } H.push(rh); S.push(rs); }
  const cols = P.colliders.filter((c) => Math.abs(c.x - ox) < 130 && Math.abs(c.z - oz) < 130).map((c) => ({ type: c.type, x: +(c.x - ox).toFixed(2), z: +(c.z - oz).toFixed(2), r: c.r, hw: c.hw, hd: c.hd, rot: c.rot || 0, top: +c.top.toFixed(2), enabled: c.enabled, noStand: !!c.noStand, seeThrough: !!c.seeThrough }));
  const L = (p) => p && { x: +(p.x - ox).toFixed(2), z: +(p.z - oz).toFixed(2) };
  const spots = { landing: L(R.landing), glider: L(R.glider), hut: L(R.hut), lhar: L(R.lhar), heatPost: L(R.heatPost), slide: L(R.slide), gate: L(R.monastery.gate), yard: L(R.monastery.yard), obsDoor: L(R.observatory.door), obs: L(R.observatory), vent: L(R.vent), basin: L(R.basin), liftBottom: L(R.lift.bottom), liftTop: L(R.lift.top), pad: L(R.lift.pad), winch: L(R.lift.winch), crank: L(R.lift.crank), kite: L(R.kite), tree: L(R.gorge.tree) };
  for (const [k, v] of Object.entries(R.npcSpots)) spots['npc_' + k] = L(v);
  return { H, S, cols, spots, y: { liftY0: R.lift.y0, liftY1: R.lift.y1 } };
});
fs.writeFileSync(OUT, JSON.stringify(d));
console.log(errs.slice(0, 5).join('\n') || 'no errors', d.cols.length);
await browser.close();
