// TY-3-FIX: fit the 'pump' pose (src/engine/rig.js PUMP_POSE) to the handle (src/game/townlife.js): for each key angle
// of the handle (lifted -0.45, level 0, pushed 0.28 rad) the shoulders and elbows that put his hands' middle on the
// grip. Twinsen placed at the pump's use spot facing the handle (ISO), the rig run to rest in each candidate pose;
// prints the best values and the static hands-to-grip error along the stroke. node fit-pump.mjs (GAME_URL)
// Result used (0.26.1): level -0.5/-1.05, up -1.1/-1.1, down -0.6/-0.7: < 1 cm at the keys, <= 5 cm between.
import { launch, open, menu } from '../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const res = await ev(async () => {
  const { PUMP_POSE: Q, PUMP_STROKE, pumpAngle } = await import('/src/engine/rig.js');
  const h = game.hero, L = game.world.life, U = L.pump.use, r = h.rig;
  game.exitRoom({ x: U.x, z: U.z, a: U.a }, true); game.step(0.5);
  h.pos.x = U.x; h.pos.z = U.z; h.angle = U.a; h.sync();
  const piv = { x: L.pump.x - 0.12, y: game.physics.groundAt(L.pump.x, L.pump.z) + 1.1, z: L.pump.z };
  const grip = (th) => ({ x: piv.x - 0.8 * Math.cos(th), y: piv.y - 0.8 * Math.sin(th), z: piv.z });
  const bones = []; r.root.traverse((o) => { if (/^hand[LR]$/.test(o.name)) bones.push(o); });
  const mid = () => { const a = bones[0].getWorldPosition(bones[0].position.clone()), b = bones[1].getWorldPosition(bones[1].position.clone()); return a.add(b).multiplyScalar(0.5); };
  // the pose held at stroke time t (null: taking hold), run to rest
  const at = (t) => { r.play(t == null ? 'pumpGrip' : 'pump'); for (let i = 0; i < 60; i++) { r.actionT = t == null ? 0 : t - 1 / 60; r.update(1 / 60, 0); } r.root.updateMatrixWorld(true); return mid(); };
  const keyT = { level: null, up: Q.lift, down: Q.lift + Q.push };
  const err = (key) => { const m = at(keyT[key]), g = grip(Q[key].th); return +Math.hypot(m.x - g.x, m.y - g.y, m.z - g.z).toFixed(4); };
  const before = { level: err('level'), up: err('up'), down: err('down') };
  const best = {};
  for (const key of ['level', 'up', 'down']) {
    let b = null;
    for (let arm = -2.4; arm <= -0.2; arm += 0.05) for (let el = -1.8; el <= 0.01; el += 0.05) { Q[key].arm = arm; Q[key].el = el; const d = err(key); if (!b || d < b.d) b = { d, arm: +arm.toFixed(2), el: +el.toFixed(2) }; }
    Q[key].arm = b.arm; Q[key].el = b.el; best[key] = b;
  }
  // along the whole stroke: hands to grip at the angle the stroke means, their radius from the pivot
  const path = []; for (let t = 0; t <= PUMP_STROKE + 1e-6; t += 0.05) { const m = at(t), th = pumpAngle(t), g = grip(th); path.push([+t.toFixed(2), +th.toFixed(3), +Math.hypot(m.x - g.x, m.y - g.y, m.z - g.z).toFixed(3), +Math.hypot(m.x - piv.x, m.y - piv.y).toFixed(3)]); }
  return { before, best, pose: JSON.parse(JSON.stringify(Q)), path };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
