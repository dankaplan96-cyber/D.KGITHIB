// CAVE-STAIR (P69, the user 18.11: "the cave and the stairs that lead to it don't work well, in Citadel up above";
// then: "a rock at the cave's entrance; the stairs are in the air and not connected properly; inside, everything is
// weird"): the flight from Citadel's plateau down to the door of Tralu's cave, the door both ways, the cave's stair.
// Every walk is by held keys (Classic: Up walks, 2 runs) from a start placed once; docs/lba-maturity/CAVE-STAIR.md.
//   1. the ground lies under every tread across its width and under the landing (the bank rose 0.3 m over them)
//   2. no cliff rock stands up through the landing (one stood in the doorway) or over the north parapet
//   3. down and up the flight, walking and running, on its axis and its sides: every tread in turn, never in the air,
//      never stuck; from the plateau's north-west onto the top (a 0.6 m ledge stopped him); from the bank south of it
//      down over the kerb (he fell into the kerb and stuck there); the landing's east edge (a fall to the sea cliff)
//   4. the door in and out: where he lands each way and his facing
//   5. the cave's stair: up and down, run; into its open side from the floor (he walked into the steps at floor level)
//   6. old saves: on the landing's east edge (now the parapet), inside the cave's stair: load standing, free to walk
// SHOTS=dir: pictures from the play camera (default captures/cave-stair, prefix test-).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS ?? 'captures/cave-stair';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const CAMWALK = fileURLToPath(new URL('./lib/camwalk.js', import.meta.url));
const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/test-${name}.jpg`, type: 'jpeg', quality: 80 }); };
const helpers = () => ev(() => {
  // the door's frame (island.js frame()): lx along its face, + to the west; lz out of it, + to the north
  const o = { x: -80.7, z: -82.0, ry: Math.PI }, c = Math.cos(o.ry), s = Math.sin(o.ry);
  window.F = (lx, lz) => [o.x + c * lx + s * lz, o.z - s * lx + c * lz];
  window.L = (x, z) => { const dx = x - o.x, dz = z - o.z; return [c * dx - s * dz, s * dx + c * dz]; };
  window.treads = () => game.physics.colliders.filter((k) => k.type === 'box' && !k.noStand && Math.abs(k.z + 82.85) < 0.01 && k.x < -81).map((k) => k.top).sort((a, b) => a - b);
  // a walk by held keys from (lx, lz) facing a (world heading): the trace, stalls, frames in the air
  window.walk = (lx, lz, a, s, { run = false, room = null } = {}) => {
    const h = game.hero;
    if (room) { h.pos.set(lx, game.physics.groundAt(lx, lz, 3), lz); h.angle = a; h.resetMotion(); h.vy = 0; h.onGround = true; }
    else { const [x, z] = F(lx, lz); CW.place({ x, z, a }); }
    h.behaviour = run ? 'athletic' : 'normal';
    for (let i = 0; i < 10; i++) game.frame(1 / 60, false);
    game.input.keys.add('ArrowUp');
    const tr = []; let air = 0, stall = 0, run0 = 0, maxStall = 0;
    for (let i = 0; i < s * 60; i++) {
      const px = h.pos.x, pz = h.pos.z;
      game.frame(1 / 60, false);
      if (!h.onGround) air++;
      if (Math.hypot(h.pos.x - px, h.pos.z - pz) < 0.004) { stall++; run0++; maxStall = Math.max(maxStall, run0); } else run0 = 0;
      const [qx, qz] = room ? [h.pos.x, h.pos.z] : L(h.pos.x, h.pos.z);
      tr.push([+qx.toFixed(2), +qz.toFixed(2), +h.pos.y.toFixed(3), game.room?.id || 'citadel']);
    }
    game.input.keys.delete('ArrowUp');
    return { tr, air, stall, maxStall, end: tr[tr.length - 1], room: game.room?.id || 'citadel' };
  };
});

await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: CAMWALK });
await ev(() => CW.setup());
await helpers();

// ---------------------------------------------------------------- 1. the ground under the treads and the landing
let r = await ev(() => {
  const T = game.world.terrain, tops = treads(), worst = { d: -9 }, lworst = { d: -9 };
  for (let i = 0; i < tops.length; i++) {
    const run = (5.5 - 1.3) / 12;
    for (let lx = 1.3 + i * run + 0.03; lx < 1.3 + (i + 1) * run - 0.02; lx += 0.05) for (let lz = -0.03; lz <= 1.74; lz += 0.1) {
      const d = T.heightAt(...F(lx, lz)) - tops[i];
      if (d > worst.d) Object.assign(worst, { d: +d.toFixed(3), step: i, lx: +lx.toFixed(2), lz: +lz.toFixed(2) });
    }
  }
  const yl = game.physics.groundAt(...F(0.5, 1.0));
  for (let lx = -1.1; lx <= 1.25; lx += 0.1) for (let lz = 0.05; lz <= 1.7; lz += 0.1) { const d = T.heightAt(...F(lx, lz)) - yl; if (d > lworst.d) Object.assign(lworst, { d: +d.toFixed(3), lx: +lx.toFixed(2), lz: +lz.toFixed(2) }); }
  const rises = tops.map((t, i) => +(t - (i ? tops[i - 1] : yl)).toFixed(3));
  return { tops: tops.map((t) => +t.toFixed(2)), rises, worst, landing: +yl.toFixed(2), lworst };
});
check('1. the ground lies under every tread across its width (was up to 0.3 m over the south third)', r.tops.length === 12 && r.worst.d <= 0.005, r.worst);
check('1. the ground lies under the landing (was 0.4 m over its back by the door)', r.lworst.d <= 0.005, r.lworst);
check('1. twelve even risers from the landing (0.20–0.23 m)', r.rises.every((x) => x > 0.2 && x < 0.23), r.rises);

// ---------------------------------------------------------------- 2. the cliff rocks
r = await ev(() => {
  const m = game.scene.getObjectByName('cliffRocks'), A = m.geometry.attributes.position.array, v = { x: 0 }, out = { landing: [], parapet: 0 };
  m.updateMatrixWorld(true);
  const yl = game.physics.groundAt(...F(0.5, 1.0));
  for (let i = 0; i < A.length; i += 3) {
    const [lx, lz] = L(A[i], A[i + 2]), y = A[i + 1];
    if (lx > -1.3 && lx < 1.3 && lz > 0.0 && lz < 1.75 && y > yl + 0.02) out.landing.push([+lx.toFixed(2), +lz.toFixed(2), +y.toFixed(2)]);
  }
  out.landing = out.landing.slice(0, 6); out.n = A.length / 9;
  return out;
});
check('2. no cliff rock stands up through the landing before the door (one stood in the doorway)', r.landing.length === 0, r);
await ev(() => { const [x, z] = F(2.4, 0.85); CW.place({ x, z, a: Math.PI / 2 }); });
await shot('landing');

// ---------------------------------------------------------------- 3. the flight by input
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI, S = 0;
const flight = async (name, lx, lz, a, s, opts) => {
  const w = await ev(({ lx, lz, a, s, opts }) => { const w = walk(lx, lz, a, s, opts); const tops = treads(); const on = new Set(); for (const [x, , y, rm] of w.tr) if (rm === 'citadel' && x > 1.3 && x < 5.5) { const i = tops.findIndex((t) => Math.abs(t - y) < 0.01); if (i >= 0) on.add(i); } return { ...w, on: on.size, tr: w.tr.filter((_, i) => i % 15 === 0).map((p) => p.join(',')).join(' ') }; }, { lx, lz, a, s, opts });
  return w;
};
let w = await flight('down', 7.5, 0.85, E, 6);
check('3. down the flight from the plateau (walk): every tread in turn, never in the air, into the cave by its door', w.on === 12 && w.air === 0 && w.room === 'tralucave', { on: w.on, air: w.air, room: w.room, tr: w.tr });
w = await flight('up', 1.6, 0.85, W, 3.6);
check('3. up the flight to the plateau (walk): every tread, never in the air, past the top onto level ground', w.on === 12 && w.air === 0 && w.end[0] > 6.5 && w.maxStall < 10, { on: w.on, air: w.air, end: w.end, tr: w.tr });
w = await flight('down-run', 7.5, 0.85, E, 4, { run: true });
check('3. down the flight running (Athletic): never in the air, into the cave', w.air === 0 && w.room === 'tralucave', { air: w.air, room: w.room, tr: w.tr });
w = await flight('up-run', 1.6, 0.85, W, 1.6, { run: true });
check('3. up the flight running: never in the air, at the top', w.air === 0 && w.end[0] > 6 && w.maxStall < 10, { air: w.air, end: w.end, tr: w.tr });
w = await flight('down-north-side', 7.5, 1.5, E, 4.5);
check('3. from the plateau\'s north-west onto the top and down the north side of the flight (stuck at a 0.6 m ledge)', w.end[0] < 1.4 && w.air === 0, { end: w.end, maxStall: w.maxStall, tr: w.tr });
w = await flight('up-south-side', 1.6, 0.35, W, 6);
check('3. up the south side of the flight, along the kerb: on the treads, not on the bank over them', w.on === 12 && w.end[0] > 6 && w.air === 0, { on: w.on, end: w.end, tr: w.tr });
w = await flight('off-the-bank', 4.5, -1.6, N, 4);
check('3. from the bank south of the flight north over the kerb: onto a tread, not caught in the kerb (stuck there)', await ev(() => { const h = game.hero, [lx, lz] = L(h.pos.x, h.pos.z), t = treads(); return lz > 0.3 && t.some((v) => Math.abs(v - h.pos.y) < 0.01); }), { end: w.end, tr: w.tr });
w = await flight('landing-east', 0.3, 1.3, E, 2.5);
check('3. east across the landing: stopped by its parapet, on the landing (a 7 m fall to the sea cliff)', w.air === 0 && Math.abs(w.end[2] - 12.92) < 0.02 && w.end[0] > -0.9, { end: w.end, air: w.air });
w = await flight('landing-north', 1.0, 1.2, N, 2);
check('3. north off the landing: stopped by its parapet, on the landing', w.air === 0 && Math.abs(w.end[2] - 12.92) < 0.02 && w.end[1] < 1.5, { end: w.end, air: w.air });
await shot('landing-parapet');

// ---------------------------------------------------------------- 4. the door both ways
r = await ev(() => {
  const [x, z] = F(2.4, 0.85); CW.place({ x, z, a: Math.PI / 2 });
  const d = game.story.doors().find((q) => q.room === 'tralucave'), t1 = P.through(d.x, d.z);
  for (let i = 0; i < 30; i++) game.frame(1 / 60, false);
  const h = game.hero, R = game.room, inn = { room: R?.id, d: +Math.hypot(h.pos.x - R.spawn.x, h.pos.z - R.spawn.z).toFixed(2), a: +h.angle.toFixed(2), y: +h.pos.y.toFixed(2), state: game.state };
  const t2 = P.exitTo('tralucave-out');
  const [lx, lz] = L(h.pos.x, h.pos.z);
  const out = { room: game.room?.id || 'citadel', lx: +lx.toFixed(2), lz: +lz.toFixed(2), y: +h.pos.y.toFixed(2), a: +h.angle.toFixed(2), ground: h.onGround, state: game.state };
  return { t1, inn, t2, out };
});
check('4. in by the door: in the cave by its door, facing into the room, on its floor', r.inn.room === 'tralucave' && r.inn.d < 1.2 && Math.abs(r.inn.a - Math.PI / 2) < 0.2 && r.inn.y === 0 && r.inn.state === 'play', r.inn);
check('4. out: on the landing or the first treads, on the flight\'s axis, facing up it, standing', r.out.room === 'citadel' && r.out.lx > 0.6 && r.out.lx < 2.6 && Math.abs(r.out.lz - 0.85) < 0.2 && Math.abs(r.out.a + Math.PI / 2) < 0.2 && r.out.ground && r.out.state === 'play', r.out);
await shot('out-of-door');

// ---------------------------------------------------------------- 5. the cave's stair
await ev(() => { const d = game.story.doors().find((q) => q.room === 'tralucave'); P.through(d.x, d.z); P.settle(); });
const cave = (x, z, a, s, run = false) => ev(({ x, z, a, s, run }) => { const w = walk(8400 + x, z, a, s, { room: true, run }); return { ...w, end: [+(w.end[0] - 8400).toFixed(2), w.end[1], w.end[2]], ys: [...new Set(w.tr.map((p) => p[2]))].slice(0, 20), tr: undefined }; }, { x, z, a, s, run });
w = await cave(-2.6, 3.0, N, 4);
check('5. up the cave\'s stair (walk): onto the terrace (1.8 m), every step', Math.abs(w.end[2] - 1.8) < 0.01 && [0.3, 0.6, 0.9, 1.2, 1.5].every((v) => w.ys.some((y) => Math.abs(y - v) < 0.01)) && w.air === 0, w);
w = await cave(-2.6, -4.5, S, 4);
check('5. down it (walk): onto the floor', Math.abs(w.end[2]) < 0.01 && w.end[1] > 1.5 && w.air === 0, w);
w = await cave(-2.6, 3.0, N, 3, true);
check('5. up it running: onto the terrace', Math.abs(w.end[2] - 1.8) < 0.01, w);
w = await cave(0.5, -0.3, W, 3);
check('5. from the floor into the stair\'s open east side: stopped at its side, not inside the steps (walked in at floor level)', w.end[0] > -1.2 && Math.abs(w.end[2]) < 0.01, w);
await shot('cave-stair-side');

// ---------------------------------------------------------------- 6. old saves
const oldSave = async (room, x, z) => {
  await ev(({ room, x, z }) => {
    if (game.room) game.exitRoom({ x: -88.2, z: -82.85, a: 0 }, true, true); P.settle(); game.save(false);
    const s = JSON.parse(localStorage.getItem('lba3_save_v1')); s.room = room; s.hero.x = x; s.hero.z = z;
    localStorage.setItem('lba3_save_v1', JSON.stringify(s));
  }, { room, x, z });
  await open(page, '?nocine');
  await menu(page, 'continue');
  await helpers();
  return ev(() => {
    P.settle(); game.step(1);
    const room0 = game.room?.id || 'citadel', h = game.hero, p = h.pos, x0 = p.x, z0 = p.z, y0 = p.y, ov = game.physics.overlapAt(p.x, p.z, p.y, h.radius);
    let moved = 'stuck';
    for (const [dx, dz] of [[1.2, 0.3], [0.3, 1.2], [-1.2, -0.3], [-0.3, -1.2]]) if (P.go(x0 + dx, z0 + dz, { tol: 0.4, maxT: 10 }).r === 'arrived') { moved = 'arrived'; break; }
    return { room: room0, after: game.room?.id || 'citadel', at: [+x0.toFixed(2), +z0.toFixed(2), +y0.toFixed(2)], ov: +ov.toFixed(3), ground: h.onGround, state: game.state, moved };
  });
};
{
  const [x, z] = await ev(() => F(-1.05, 1.0));
  r = await oldSave(null, x, z);
  check('6. an old save on the landing\'s east edge (the parapet now): loads on the landing, clear of it, free to walk', r.state === 'play' && r.ground && r.ov < 0.03 && Math.abs(r.at[2] - 12.92) < 0.05 && (r.moved === 'arrived' || r.after !== r.room), r);
  r = await oldSave('tralucave', 8400 - 2.6, -0.3);
  check('6. an old save inside the cave\'s stair (walked into at floor level): loads standing on a step, free to walk', r.room === 'tralucave' && r.state === 'play' && r.ground && r.at[2] > 0.5 && (r.moved === 'arrived' || r.after !== r.room), r);
}
done();
await browser.close();
