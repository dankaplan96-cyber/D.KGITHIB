// PACE-SIM: is coming back seamless? The hero goes from the street into the house for 20 s and out again (through the
// game's own door transitions, real fades). Checks, for every present person and enemy:
//   - body on its position: the rig's root where the actor is (no stale body that pops on its first update),
//   - nobody near the street jumped between the last frame before the door and the first frames after the fade,
//   - a person the story moves while Twinsen is indoors (placeAt) and an enemy moved directly are drawn at their new
//     spots on the first frame back,
//   - a fast in-out-in (each door taken as soon as the last fade is over) leaves everyone where they were.
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const out = await ev(async () => {
  const G = game, res = {}, A = () => [...G.npcs, ...G.enemies].filter((a) => a.present && (a.alive ?? true) && a.rig?.root);
  const snap = () => new Map(A().map((a) => [a, { x: a.pos.x, y: a.pos.y, z: a.pos.z, rx: a.rig.root.position.x, rz: a.rig.root.position.z }]));
  // the body where the actor is: the rig root's world position against pos (xz)
  const off = (a) => { const r = a.rig.root; r.updateWorldMatrix(true, false); const e = r.matrixWorld.elements; return Math.hypot(e[12] - a.pos.x, e[14] - a.pos.z); };
  const run = (s) => { for (let t = 0; t < s; t += 1 / 60) G.frame(1 / 60, false); };
  const settle = () => { let k = 0; while ((G.trans || G.state !== 'play') && k++ < 600) G.frame(1 / 60, false); };
  G.exitRoom({ x: -45, z: 74, a: 0 }, true, true); G.state = 'play'; run(2);
  const before = snap();
  // a story person and an enemy that the story will move while he is inside
  const mover = G.npcs.find((n) => !n.ambient && n.present && Math.abs(n.pos.x) < 300 && !n.track);
  const mite = G.enemies.find((e) => e.present && e.alive && e.pos.x > 1050 && e.pos.x < 1150);
  G.enterRoom('house'); settle(); run(10);
  if (mover) { res.mover = mover.def.id; res.moverTo = { x: mover.pos.x + 3, z: mover.pos.z + 1 }; mover.placeAt(res.moverTo); }
  if (mite) { res.mite = mite.id; mite.pos.x += 2; }
  run(10);
  res.miteBodyOffInHouse = mite ? +off(mite).toFixed(3) : null;
  const inside = snap();
  G.exitRoom({ x: -45, z: 74, a: 0 }); settle();
  const first = snap();
  // bodies off their positions on the first frame after the fade, and the largest jump of anyone within 60 m
  const h = G.hero.pos, near = A().filter((a) => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 60);
  res.nearCount = near.length;
  res.bodyOffMax = +Math.max(0, ...A().filter((a) => Math.abs(a.pos.x) < 400).map(off)).toFixed(3);
  res.moverBodyOff = mover ? +off(mover).toFixed(3) : null;
  res.moverAt = mover ? { x: +mover.pos.x.toFixed(2), z: +mover.pos.z.toFixed(2) } : null;
  // story people with no walk (they stand where they are put) moved while he was inside? (should be: no)
  res.staticMoved = [...before].filter(([a, p]) => !a.ambient && !a.track && a !== mover && a.def && Math.abs(p.x) < 300 && G.npcs.includes(a) && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.05).map(([a]) => a.def.id);
  run(1);
  const after = snap();
  res.jumpFirstSecond = +Math.max(0, ...near.map((a) => { const p = first.get(a), q = after.get(a); return p && q ? Math.hypot(q.x - p.x, q.z - p.z) : 0; })).toFixed(2);
  // fast in-out-in-out: each door as soon as the last fade is over
  const s0 = snap();
  for (let k = 0; k < 2; k++) { G.enterRoom('house'); settle(); G.exitRoom({ x: -45, z: 74, a: 0 }); settle(); }
  res.fastMovedStatic = [...s0].filter(([a, p]) => !a.ambient && !a.track && G.npcs.includes(a) && a.def && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.05).map(([a]) => a.def.id);
  res.bodyOffMaxAfterFast = +Math.max(0, ...A().filter((a) => Math.abs(a.pos.x) < 400).map(off)).toFixed(3);
  res.walkersTiers = G.walkers ? { ...G.walkers.stats } : null;
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
