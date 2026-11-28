// CONTROL-FEEL (WORKLIST #31): after the jump came down to LBA2's (1.19 m up, 3.2 m along; src/game/actors.js JUMP),
// every place in the world built for a jump is still crossed by jumps, and what is built against one still holds.
// By input (P.hopTo: Athletic, Up, Space; the harness steps at 30 fps, the lower apex), placed by ISO at each start:
// (the highest ledge a jump takes is its apex + the 0.25 m his feet may be under an edge in the air: 1.38 m at 60 fps,
// 1.33 m at 30; tests/controls.mjs 6b measures the apex)
//   1. Citadel, the Whispering Cliffs: the stones risen (ISO, as after the target), up all of them to the plateau
//   2. Zeelich, the old mill: up its stair-stones to the gallery (chapter 3's cog, chapter 10's relay)
//   3. the deep installation's galleries: across the chasm on the three sets of stepping stones
//   4. built against a jump: the test step's deck (2.35 m) and the depot's fence (2.4 m) are not reached
//   5. WAVE3: up the goats' six ledges by Lhar's icefall; not onto the high rock's lip or the gorge's rock stack by a jump
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true }); });

// ---------------------------------------------------------------- 1. the Whispering Cliffs' stones
iso('Citadel: put at the stones\' start, the stones risen at once (as after the target)');
const cliffs = await ev(() => {
  const G = game, W = G.world, h = G.hero;
  G.exitRoom({ x: -66, z: -20 }, true); G.step(0.5);
  W.raiseStones(true); G.step(0.5);
  const rises = W.stones.map((s, i) => +(s.c.top - (i ? W.stones[i - 1].c.top : G.physics.groundAt(s.c.x - 2, s.c.z))).toFixed(2));
  const gaps = W.stones.slice(1).map((s, i) => +(Math.hypot(s.c.x - W.stones[i].c.x, s.c.z - W.stones[i].c.z) - s.c.r - W.stones[i].c.r).toFixed(2));
  let i = 0, tries = 0;
  while (i < W.stones.length && tries < 30) {
    const s = W.stones[i]; tries++;
    const y = P.hopTo(s.c.x, s.c.z, s.c.top);
    if (Math.abs(y - s.c.top) < 0.3 && Math.hypot(h.pos.x - s.c.x, h.pos.z - s.c.z) < s.c.r) i++;
    else { const j = W.stones.findIndex((q) => Math.abs(h.pos.y - q.c.top) < 0.3 && Math.hypot(h.pos.x - q.c.x, h.pos.z - q.c.z) < q.c.r); i = j + 1; }
  }
  return { n: W.stones.length, reached: i, tries, maxRise: Math.max(...rises.slice(1)), rises, gaps, y: +h.pos.y.toFixed(2) };
});
check(`Whispering Cliffs: up all ${cliffs.n} stones by jumps (rises ≤ ${cliffs.maxRise} m)`, cliffs.reached === cliffs.n, cliffs);

// ---------------------------------------------------------------- 2. the old mill
iso('Zeelich: entered by the dock (the room switch the ship uses)');
const mill = await ev(() => {
  const G = game, Z = G.rooms.zeelich; G.enterRoom('zeelich', Z.dock, true); P.settle();
  const mt = Z.millTop, S = mt.stones, rises = S.map((s, k) => +(s.y - (k ? S[k - 1].y : mt.y - 8.75)).toFixed(2)).concat(+(mt.y - S.at(-1).y).toFixed(2));
  const r = P.climbOldMill();
  return { ...r, rises, n: S.length };
});
check(`Zeelich's old mill: up its ${mill.n} stair-stones (each ${Math.max(...mill.rises)} m) to the gallery by jumps`, mill.top, mill);

// ---------------------------------------------------------------- 3. the galleries' stepping stones
iso('the deep installation\'s galleries: entered by the room switch, the three sets raised at once (as after the pillars)');
const shell = await ev(() => {
  const G = game, h = G.hero, id = Object.keys(G.rooms).find((k) => G.rooms[k].stones?.sets);
  if (!id) return { none: true };
  G.enterRoom(id, null, true); P.settle();
  const R = G.room; for (let i = 0; i < 3; i++) R.stones.raise(i, true); G.step(0.5);
  const st = R.stones.sets.flat(), c0 = st[2].c, top = st[0].top, done = () => h.pos.x > c0.x + 5 && Math.abs(h.pos.y - top) < 0.3, tries = [], hops = [];
  for (let attempt = 0; attempt < 4 && !done(); attempt++) {
    const out = [];
    if (h.pos.y < top - 1) { for (let i = 1; i <= 7; i++) P.go(c0.x - 5 + 0.65, c0.z + 9.3 - (i - 1) * 0.72, { tol: 0.35, maxT: 20 }); P.go(c0.x - 6.2, c0.z + 4.6, { tol: 0.5 }); }
    P.go(st[0].c.x - 1.9, st[0].c.z + 1.0, { tol: 0.4 });
    if (Math.abs(h.pos.y - top) > 0.3) { tries.push({ shelf: false, y: +h.pos.y.toFixed(2) }); continue; }
    // (as a player hops a gap onto a small stone: to the brink first (1.8 m short of the next stone's centre), then a short
    // hop — Up 0.12 s, Space; a full run carries 3 m, past a 1.3 m stone)
    // (to the brink: Normal, face it, short steps forward until 1.85 m short of its centre)
    const brink = (s) => { if (h.behaviour !== 'normal') P.tap('F1'); P.face(s.c.x, s.c.z); for (let i = 0; i < 40 && Math.hypot(s.c.x - h.pos.x, s.c.z - h.pos.z) > 1.85; i++) { G.input.keys.add('ArrowUp'); G.step(1 / 30); G.input.keys.delete('ArrowUp'); G.step(1 / 30); } G.step(0.2); };
    const hop = (x, z) => { const d0 = Math.hypot(x - h.pos.x, z - h.pos.z), y = P.hopTo(x, z, top, { walk: false, brake: 0.9 }); hops.push([+d0.toFixed(2), +Math.hypot(x - h.pos.x, z - h.pos.z).toFixed(2), y]); return y; };
    for (const s of st) { let y = 0; for (let k = 0; k < 2; k++) { brink(s); y = hop(s.c.x, s.c.z); if (Math.abs(y - top) < 0.3 || h.pos.y < top - 1) break; } out.push(+y.toFixed(2)); if (h.pos.y < top - 1) break; P.go(s.c.x, s.c.z, { tol: 0.2, maxT: 3, fight: false }); }
    if (h.pos.y > top - 1) { const fx = c0.x + 5 + 1.2, fz = c0.z - 1.9; brink({ c: { x: fx, z: fz } }); out.push(hop(fx, fz)); }
    tries.push(out);
  }
  const gaps = st.slice(1).map((s, i) => +(Math.hypot(s.c.x - st[i].c.x, s.c.z - st[i].c.z) - s.c.r - st[i].c.r).toFixed(2));
  return { room: id, crossed: done(), tries, gaps, hops, x: +h.pos.x.toFixed(1) };   // (hops: [from, landed off the centre, y])
});
check('the galleries: across the chasm on the stepping stones by jumps (flush, gaps under a metre)', shell.none || shell.crossed, shell);

// ---------------------------------------------------------------- 4. built against a jump
iso('Zeelich: by the test step and by the depot\'s fence');
const against = await ev(() => {
  const G = game, Z = G.rooms.zeelich, h = G.hero, PH = G.physics, out = {};
  if (G.room?.id !== 'zeelich') { G.enterRoom('zeelich', Z.dock, true); P.settle(); }
  const S = G.story.arsenal?.step;
  if (S) { const y = P.hopTo(S.x, S.z, S.top, { from: 1.6 }); out.step = { top: +S.top.toFixed(2), landed: y, on: Math.abs(y - S.top) < 0.3 }; G.step(1); }
  // the depot's fence: a running jump straight at it from outside, its top and where he ends
  const fence = PH.colliders.filter((c) => c.enabled && c.noStand && c.top - PH.groundAt(c.x, c.z) > 2.2 && Math.hypot(c.x - Z.depot.x, c.z - Z.depot.z) < 25);
  if (fence.length) {
    const f = fence[0], ins = Math.hypot(Z.depot.x - f.x, Z.depot.z - f.z), ux = (Z.depot.x - f.x) / ins, uz = (Z.depot.z - f.z) / ins;
    const sx = f.x - ux * 3.5, sz = f.z - uz * 3.5; P.go(sx, sz, { tol: 0.5, fight: false });
    const y = P.hopTo(f.x + ux * 1.5, f.z + uz * 1.5, PH.groundAt(f.x + ux * 1.5, f.z + uz * 1.5), { walk: false, from: 3.5 });
    const inside = (h.pos.x - f.x) * ux + (h.pos.z - f.z) * uz > 0;
    out.fence = { h: +(f.top - PH.groundAt(f.x, f.z)).toFixed(2), inside, y };
  }
  return out;
});
check('built against a jump: the test step\'s deck (2.35 m) is not reached, nor over the depot\'s fence (≥ 2.3 m)', (!against.step || !against.step.on) && (!against.fence || !against.fence.inside), against);

// ---------------------------------------------------------------- 5. WAVE3 (H-7, H-8: story/depth.js)
// the goats' way by Lhar's icefall: up its six ledges by jumps (each rise 1.0 m); built against a jump: from the top
// ledge the high rock's lip (the rope's climb, after chapter 7) and, in the gorge, the ice arch's rock stack from the bank
iso('the Hamalayi (entered by the room switch), at the foot of the goats\' ledges by Lhar\'s icefall');
const goat = await ev(() => {
  const G = game, h = G.hero, PH = G.physics;
  G.enterRoom('hamalayi', null, true); P.settle(); G.step(0.3);
  const D = G.story.depth, L = D.gt?.ledges; if (!L) return { none: true };
  h.pos.set(L[0].x + 1.2, PH.groundAt(L[0].x + 1.2, L[0].z + 2.2, 40), L[0].z + 2.2); G.step(0.3); P.settle();
  const climb = (L) => { const h = game.hero, ys = []; let fell = 0; const on = () => L.findIndex((q) => Math.abs(h.pos.y - q.y) < 0.3 && Math.hypot(h.pos.x - q.x, h.pos.z - q.z) < q.r + 0.1); for (let att = 0; att < 4; att++) { let i = on(); while (i < L.length - 1) { const s = L[i + 1], prev = i >= 0 ? L[i] : null; if (prev) { const dl = Math.hypot(s.x - prev.x, s.z - prev.z), e = Math.max(0, prev.r - 0.35); P.go(prev.x + (s.x - prev.x) / dl * e, prev.z + (s.z - prev.z) / dl * e, { tol: 0.12, maxT: 3 }); } const y = P.hopTo(s.x, s.z, s.y, { walk: !prev }); ys.push(+y.toFixed(2)); if (Math.abs(y - s.y) > 0.3) { fell++; break; } i++; } if (on() === L.length - 1) break; } return { ys, fell, top: on() === L.length - 1 }; }; const cl = climb(L), ys = cl.ys;
  const top = L[L.length - 1], lip = D.gt.top;
  const yl = P.hopTo(lip.x, lip.z, lip.y, { walk: false });
  // the gorge's stack: a running jump at it from the north bank
  const A = D.ar; let stack = null;
  if (A) { h.pos.set(A.S.x, PH.groundAt(A.S.x, A.S.z - 6, 20), A.S.z - 6); G.step(0.3); P.settle(); const y = P.hopTo(A.S.x, A.S.z, A.S.y, { walk: false, from: 4 }); stack = { top: A.S.y, landed: y, on: Math.abs(y - A.S.y) < 0.3 }; }
  return { tops: L.map((s) => s.y), ys, up: cl.top, fell: cl.fell, lip: { y: +lip.y.toFixed(2), landed: yl, on: Math.abs(yl - lip.y) < 0.4 }, stack };
});
check('the goats\' way (H-7): up all six ledges by Athletic jumps', goat.none || goat.up, goat);
check('built against a jump (H-7, H-8): the high rock\'s lip from the top ledge (the rope\'s job), the gorge\'s rock stack from its bank (the line\'s)', goat.none || (!goat.lip.on && !(goat.stack && goat.stack.on)), goat);
done();
await browser.close();
