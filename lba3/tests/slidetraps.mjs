// SLIDE-RESCUE (the user: Twinsen "loses his balance" and is put back with a life lost): a slide down a face too steep to
// stand on that runs into a collider (a rock, a post, a wall) must resolve — round the blocker, or a hop off the face
// onto standable ground — never the fall's respawn (actors.js Hero.slideStep, respawnFromFall).
//
// The scan: in Citadel, Desert Island and the Hamalayi every collider that stands across a slide (taller than a step
// over the ground beside it) is ringed with spots 0.5–1.4 m out; the spots on bare terrain too steep to stand on, whose
// way down points at the collider, are where a slide runs into it. Twinsen is put on each (ISO: placed, standing, no
// input) with the last safe spot far away, and the game runs on its own for up to 5 s. Each spot must end:
//   no respawn (no jump of more than 2.5 m in a frame), no life lost, standing (on the ground, not sliding) on
//   standable ground (not steep, not in the sea, not inside a collider).
// Plus the known traps: the Hamalayi rock at the outer peak ring's foot (4226.7, 3.3, 85.2), approached from the face
// above it, and the top of Citadel's east flight (x −28.9, z −46.3…−45.2; closed by geometry in CLIMB-21: a check that
// nothing regresses there).
// env: MAXPER=<n> spots per region (default 70, spread over the region by a fixed stride); SHOW=1 lists every spot.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { P.settle(); game.setState('play'); game.step(0.3); });
const MAXPER = +(process.env.MAXPER || 70);

const REGIONS = [
  { id: 'citadel', band: [-400, 400], known: [[-28.9, -46.3], [-28.9, -45.8], [-28.9, -45.2], [-29.4, -45.8], [-28.4, -45.8]] },
  { id: 'desert', band: [3200, 3700], known: [] },
  { id: 'hamalayi', band: [4100, 4600], known: [[4226.7, 86.2], [4226.2, 86.7], [4225.7, 87.2], [4227.2, 86.2], [4226.7, 86.6]] },
];

// the spots of one region: [x, z, why]
const spots = (R) => ev(({ id, band, known, MAXPER }) => {
  const G = game, PH = G.physics, T = PH.terrain;
  if (id === 'citadel') { if (G.room) G.exitRoom({ x: -42, z: -2, a: 0 }, true, true); }
  else G.enterRoom(id, null, true, true);
  G.step(0.3); P.settle();
  const out = [];
  for (const c of PH.colliders) {
    if (!c.enabled || c.x < band[0] || c.x > band[1] || c.stair) continue;
    const n = 12;
    for (const off of [0.5, 0.9, 1.4]) for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a);
      // a point `off` out from the collider's edge (a box: along its local axes' support in that direction)
      let ex;
      if (c.type === 'cyl') ex = c.r;
      else { const lx = ux * c.cos - uz * c.sin, lz = ux * c.sin + uz * c.cos; ex = Math.min(c.hw / Math.max(1e-3, Math.abs(lx)), c.hd / Math.max(1e-3, Math.abs(lz))); }
      const x = c.x + ux * (ex + off), z = c.z + uz * (ex + off);
      const gi = PH.groundInfo(x, z, 1e9), g = gi.h;
      if (gi.brick || g < -0.35) continue;
      if (!(c.top > g + 0.55 && c.bottom < g + 1.6)) continue;
      const st = PH.steepAt(x, z, g);
      if (!st || st.dx * -ux + st.dz * -uz < 0.5) continue;   // (its way down runs into the collider)
      if (PH.blockedAt(x, z, g, G.hero.radius)) continue;    // (inside something already: not a place he can be)
      if (!out.some((q) => Math.hypot(q[0] - x, q[1] - z) < 0.3)) out.push([+x.toFixed(2), +z.toFixed(2), 'scan']);
      break;
    }
  }
  // a fixed stride over the list (the same spots every run), the known traps always in
  const k = Math.max(1, Math.ceil(out.length / MAXPER)), pick = out.filter((_, i) => i % k === 0).slice(0, MAXPER);
  return { total: out.length, list: [...known.map(([x, z]) => [x, z, 'known']), ...pick] };
}, { ...R, MAXPER });

const run = (id, list) => ev(({ id, list }) => {
  const G = game, h = G.hero, PH = G.physics;
  const res = [];
  for (const [x, z, why] of list) {
    if (G.state !== 'play') P.settle();
    // the last safe spot far off: a respawn shows as a jump there
    G.lastSafe = { x: x + 40, z };
    h.hp = h.maxHp ?? 10; const hp0 = h.hp; h.invuln = 0; h.rescue = null; h.slideAnchor = null;
    h.pos.set(x, PH.groundAt(x, z, 1e9), z); h.onGround = true; h.vy = 0; h.vel.set(0, 0); h.gravity = null;
    let jump = 0, slid = false, hopped = false, settled = 0, t = 0;
    for (; t < 5; t += 1 / 30) {
      const px = h.pos.x, pz = h.pos.z;
      G.step(1 / 30);
      if (G.state !== 'play') break;
      jump = Math.max(jump, Math.hypot(h.pos.x - px, h.pos.z - pz));
      if (h.sliding) slid = true;
      if (h.rescue) hopped = true;
      settled = h.onGround && !h.sliding && !h.rescue ? settled + 1 / 30 : 0;
      if (settled > 0.4) break;
    }
    const g = PH.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.1);
    const standable = h.onGround && !h.sliding && !PH.steepAt(h.pos.x, h.pos.z, h.pos.y) && !(g.h < -0.35 && !g.brick) && !PH.blockedAt(h.pos.x, h.pos.z, h.pos.y, 0.05);
    const moved = Math.hypot(h.pos.x - x, h.pos.z - z);
    res.push({ at: [x, z], why, ok: jump < 2.5 && h.hp >= hp0 && standable, respawn: jump >= 2.5, hpLost: hp0 - h.hp, standable, slid, hopped, moved: +moved.toFixed(2), t: +t.toFixed(2), state: G.state, end: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) });
  }
  return res;
}, { id, list });

const all = {};
for (const R of REGIONS) {
  const s = await spots(R);
  const r = await run(R.id, s.list);
  all[R.id] = r;
  const bad = r.filter((x) => !x.ok), known = r.filter((x) => x.why === 'known');
  const sum = { spots: r.length, found: s.total, respawns: r.filter((x) => x.respawn).length, hpLost: r.reduce((a, x) => a + Math.max(0, x.hpLost), 0), notStandable: r.filter((x) => !x.standable).length, slid: r.filter((x) => x.slid).length, hopped: r.filter((x) => x.hopped).length };
  console.log('MEASURE', R.id, JSON.stringify(sum));
  if (process.env.SHOW) for (const x of r) console.log('  ', JSON.stringify(x));
  if (known.length) check(`${R.id}: the known traps resolve (no respawn, no life lost, standing on standable ground)`, known.every((x) => x.ok), known);
  check(`${R.id}: ${r.length} slide spots against colliders: none respawns, loses a life or ends off standable ground`, r.length > 0 && bad.length === 0, { ...sum, bad: bad.slice(0, 8) });
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
