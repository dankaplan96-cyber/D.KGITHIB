// SLIDE-RESCUE keyboard review (11.11). At steep spots (the slidetraps scan, plus the D3 waterline bank and the east
// flight's top) Twinsen is put on standable ground beside the slope, then driven by keys only (Classic arrows, Space,
// F1/F2) as a player would: walk onto the slope, hold Up against it, run and jump on it, let go; then Up again.
// Measured every frame: life, respawn jumps (> 2.5 m in a frame), the longest slide that gets no lower (stuck),
// the time from letting go to standing, whether Up moves him afterwards, and the walk/fall pose's 1-2 frame blips on
// the ground (the flicker at a face's foot fixed in 11.11: actors.js Hero.footOfSlope, SLIDE_POSE).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { P.settle(); game.setState('play'); game.step(0.3); });
const PER = +(process.env.PER || 4);
const REGIONS = [
  { id: 'citadel', band: [-400, 400], known: [[-77.65, 52.76], [-28.9, -45.8]] },
  { id: 'desert', band: [3200, 3700], known: [] },
  { id: 'hamalayi', band: [4100, 4600], known: [[4226.7, 86.2]] },
];
const spots = (R) => ev(({ id, band, known, PER }) => {
  const G = game, PH = G.physics;
  if (id === 'citadel') { if (G.room) G.exitRoom({ x: -42, z: -2, a: 0 }, true, true); }
  else G.enterRoom(id, null, true, true);
  G.step(0.3); P.settle();
  const out = [];
  for (const c of PH.colliders) {
    if (!c.enabled || c.x < band[0] || c.x > band[1] || c.stair) continue;
    for (const off of [0.5, 0.9, 1.4]) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a);
      let ex;
      if (c.type === 'cyl') ex = c.r;
      else { const lx = ux * c.cos - uz * c.sin, lz = ux * c.sin + uz * c.cos; ex = Math.min(c.hw / Math.max(1e-3, Math.abs(lx)), c.hd / Math.max(1e-3, Math.abs(lz))); }
      const x = c.x + ux * (ex + off), z = c.z + uz * (ex + off);
      const gi = PH.groundInfo(x, z, 1e9), g = gi.h;
      if (gi.brick || g < -0.35) continue;
      if (!(c.top > g + 0.55 && c.bottom < g + 1.6)) continue;
      const st = PH.steepAt(x, z, g);
      if (!st || st.dx * -ux + st.dz * -uz < 0.5) continue;
      if (PH.blockedAt(x, z, g, G.hero.radius)) continue;
      if (!out.some((q) => Math.hypot(q[0] - x, q[1] - z) < 0.3)) out.push([+x.toFixed(2), +z.toFixed(2), 'scan']);
      break;
    }
  }
  const k = Math.max(1, Math.floor(out.length / PER)), pick = out.filter((_, i) => i % k === Math.floor(k / 2)).slice(0, PER);
  return { total: out.length, list: [...known.map(([x, z]) => [x, z, 'known']), ...pick] };
}, { ...R, PER });

const run = (list) => ev((list) => {
  const G = game, h = G.hero, PH = G.physics, keys = G.input.keys, DT = 1 / 30;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const res = [];
  for (const [sx, sz, why] of list) {
    if (G.state !== 'play') P.settle();
    // a standable start 1.2–3.5 m from the spot, the straight walk to it free of bricks
    let A = null;
    for (let R = 1.2; R <= 3.5 && !A; R += 0.4) for (let i = 0; i < 16 && !A; i++) {
      const a = (i / 16) * Math.PI * 2, x = sx + Math.sin(a) * R, z = sz + Math.cos(a) * R, gi = PH.groundInfo(x, z, 1e9);
      if (gi.h < -0.3 && !gi.brick) continue;
      if (PH.steepAt(x, z, gi.h) || PH.blockedAt(x, z, gi.h, h.radius + 0.05)) continue;
      if (Math.abs(gi.h - PH.groundAt(sx, sz, 1e9)) > 2.5) continue;
      let clear = true;
      for (let k = 1; k < 8 && clear; k++) { const t = k / 8, px = x + (sx - x) * t, pz = z + (sz - z) * t; if (PH.blockedAt(px, pz, PH.groundAt(px, pz, gi.h + 1), 0.2)) clear = false; }
      if (clear) A = { x, z, y: gi.h };
    }
    if (!A) { res.push({ at: [sx, sz], why, skipped: 'no standable start' }); continue; }
    P.release(); if (h.behaviour !== 'normal') P.tap('F1');
    h.pos.set(A.x, A.y, A.z); h.onGround = true; h.vy = 0; h.resetMotion(); h.gravity = null; h.rescue = null; h.slideAnchor = null;
    h.hp = h.maxHp ?? 10; h.invuln = 0; const hp0 = h.hp;
    G.lastSafe = { x: A.x, z: A.z }; G.step(0.3);
    let lastPose = null, poseRun = 0; const M = { poseSwaps: 0, blips: 0, slid: 0, maxStuck: 0, jumps: 0, respawn: 0, rescues: 0, phases: {}, states: new Set() };
    let stuckT = 0, stuckY = null, wasRescue = false;
    const step = () => {
      const px = h.pos.x, pz = h.pos.z;
      G.step(DT);
      if (G.state !== 'play') { M.states.add(G.state); P.settle(); }
      const j = Math.hypot(h.pos.x - px, h.pos.z - pz); if (j > 2.5) M.respawn++;
      if (h.sliding) { M.slid += DT; if (stuckY == null || h.pos.y < stuckY - 0.3) { stuckY = h.pos.y; stuckT = 0; } else stuckT += DT; M.maxStuck = Math.max(M.maxStuck, stuckT); }
      else { stuckT = 0; stuckY = null; }
      if (h.rescue && !wasRescue) M.rescues++; wasRescue = !!h.rescue;
      { const fall = h.rig.anim === 'fall' && h.onGround; if (lastPose != null && fall !== lastPose) { M.poseSwaps++; if (!fall && lastPose && poseRun <= 2) M.blips++; poseRun = 0; } poseRun++; lastPose = fall; }
    };
    const steerTo = (ang) => { const d = norm(ang - h.angle); keys.delete('ArrowLeft'); keys.delete('ArrowRight'); if (d > 0.12) keys.add('ArrowLeft'); else if (d < -0.12) keys.add('ArrowRight'); };
    // 1. walk onto the slope (face it, Up)
    P.face(sx, sz);
    let t = 0, firstSlide = null;
    for (; t < 3; t += DT) { steerTo(Math.atan2(sx - h.pos.x, sz - h.pos.z)); keys.add('ArrowUp'); step(); if (h.sliding && firstSlide == null) firstSlide = +t.toFixed(2); if (firstSlide != null && t > firstSlide + 0.2) break; }
    M.phases.walk = { slid: firstSlide, at: [h.pos.x, h.pos.z].map((v) => +v.toFixed(2)) };
    // 2. hold Up against the slope (steered up the face as it is under him) for 3 s
    for (t = 0; t < 3; t += DT) { const st = PH.steepAt(h.pos.x, h.pos.z, h.pos.y); if (st) steerTo(Math.atan2(-st.dx, -st.dz)); else steerTo(Math.atan2(sx - h.pos.x, sz - h.pos.z)); keys.add('ArrowUp'); step(); }
    P.release();
    M.phases.against = { end: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), sliding: h.sliding };
    // 3. Athletic: run at the spot and press Space (jump) on the way and on the slope, every 0.3 s for 2.5 s
    P.tap('F2'); P.face(sx, sz);
    for (t = 0; t < 2.5; t += DT) { steerTo(Math.atan2(sx - h.pos.x, sz - h.pos.z)); keys.add('ArrowUp'); if (Math.round(t / DT) % 9 === 0) { keys.add('Space'); G.input.taps.add('Space'); } else keys.delete('Space'); step(); if (h.vy > 0.5 && !h.rescue) M.jumps++; }
    P.release();
    // 4. let go: how long until he stands (on the ground, not sliding, no hop under way)
    let free = null;
    for (t = 0; t < 4; t += DT) { step(); if (h.onGround && !h.sliding && !h.rescue) { free = +t.toFixed(2); break; } }
    // 5. control back: Up for 0.7 s moves him (turned a quarter at a time, up to three, if he faces a wall, the sea or a bank)
    const ctl = () => { const x0 = h.pos.x, z0 = h.pos.z; for (let k = 0; k < 21; k++) { keys.add('ArrowUp'); step(); } P.release(); return Math.hypot(h.pos.x - x0, h.pos.z - z0); };
    let moved = ctl(); for (let q = 1; q < 4 && moved < 0.3; q++) { const a = h.angle + Math.PI / 2; P.face(h.pos.x + Math.sin(a), h.pos.z + Math.cos(a)); moved = Math.max(moved, ctl()); }
    for (t = 0; t < 4 && !(h.onGround && !h.sliding && !h.rescue); t += DT) step();
    P.tap('F1');
    const gi = PH.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.1);
    const standable = h.onGround && !h.sliding && !PH.steepAt(h.pos.x, h.pos.z, h.pos.y) && !(gi.h < -0.35 && !gi.brick);
    res.push({ at: [sx, sz], why, start: [A.x, A.z].map((v) => +v.toFixed(2)), hpLost: hp0 - h.hp, respawn: M.respawn, slidS: +M.slid.toFixed(2), poseSwaps: M.poseSwaps, blips: M.blips, maxStuck: +M.maxStuck.toFixed(2), rescues: M.rescues, jumps: M.jumps, free, moved: +moved.toFixed(2), standable, states: [...M.states], ...M.phases, end: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) });
  }
  return res;
}, list);

for (const R of REGIONS) {
  const s = await spots(R);
  const r = await run(s.list);
  for (const x of r) console.log('  ', JSON.stringify(x));
  const done_ = r.filter((x) => !x.skipped);
  const bad = done_.filter((x) => x.hpLost > 0 || x.respawn > 0 || x.free == null || x.free > 1.5 || x.moved < 0.3 || !x.standable || x.blips > 3);
  console.log('MEASURE', R.id, JSON.stringify({ found: s.total, driven: done_.length, skipped: r.length - done_.length, slid: done_.filter((x) => x.slidS > 0).length, rescues: done_.reduce((a, x) => a + x.rescues, 0), hpLost: done_.reduce((a, x) => a + x.hpLost, 0), respawns: done_.reduce((a, x) => a + x.respawn, 0) }));
  check(`${R.id}: ${done_.length} steep spots driven by keys: no life lost, no respawn, standing within 1.5 s of letting go, Up moves him after, no walk/fall pose flicker (fall pose on the ground for 1-2 frames: at most 3)`, done_.length > 0 && bad.length === 0, bad.slice(0, 6));
}
done();
await browser.close();
