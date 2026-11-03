// EXPANSION W-1 · Float Harbor (src/game/ballastra/): the place and its handles, BALLASTRA.harbor, before the story
// uses them. The region and the shed's room build (lazily, as regions.js builds every area); every state of the
// counterweight × the crane gives the lift level of the rule, with the walkway blocked exactly when the spec says, the
// deck's collision at its height and the balanced case at the top; everything goes back; the shortcut opens and shuts
// with its collision; the boat sails out and can be put back. He walks the whole harbour by input (P.go: the pad, the
// pontoons, the quay, onto the lift's deck and off it again, the walkway, the shed's float, in and out of the shed, the
// gangway, the district's edge, the shortcut), the blocked walkway cuts the shed's side off from the quay's, the soft
// edge eases him back off the water, and a second visit builds nothing again.
// ISO (logged): he is put on the pad with enterRoom (no travel to Ballastra exists yet: the cloud's); the handles are
// called directly, as the story will.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { P.settle(); });

// ---- the build: its own lazy group, far from everything, built in steps
const built = await ev(() => {
  const G = game, gr = G.regions.groups.get('ballastra'), before = gr.state;
  G.enterRoom('ballastra', null, true); P.settle();
  const H = G.rooms.ballastra.harbor, R = G.rooms.ballastra, c = R.center;
  const far = Object.entries(G.rooms).filter(([id, Q]) => id !== 'ballastra' && id !== 'bl_shed' && (Q.center || Q.group?.position)).map(([id, Q]) => { const q = Q.center || Q.group.position; return [id, Math.round(Math.hypot(q.x - c.x, q.z - c.z))]; }).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return { before, after: gr.state, steps: gr.stepsMs ?? null, ms: gr.ms, rooms: H?.rooms, here: G.room?.id, hero: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((v) => +v.toFixed(2)), nearest: far, scene: G.regions.sceneOf(c.x + 5, c.z + 5), shedScene: G.regions.sceneOf(G.rooms.bl_shed.center.x, G.rooms.bl_shed.center.z) };
});
check('the region builds on first need (its own lazy group) and he stands on the pad', built.before === 'unloaded' && built.rooms?.join() === 'ballastra,bl_shed' && built.here === 'ballastra' && built.hero[1] > 1.3, built);
check('it stands far from every other area (the nearest built one over 600 m away), and its points are known as its own before it is built', built.nearest.every(([, d]) => d > 600) && built.scene === 'ballastra' && built.shedScene === 'bl_shed', built);

// ---- the handles: spots, stand spots, the ball target
const shape = await ev(() => {
  const H = game.rooms.ballastra.harbor, has = (o, ks) => ks.every((k) => o?.[k] && Number.isFinite(o[k].x) && Number.isFinite(o[k].z));
  return { spawns: has(H.spawns, ['pad', 'shedDoorOut', 'shedIn', 'districtEdge']), stands: has(H.stands, ['tessa_shed', 'tessa_quay', 'tessa_lift', 'docker1', 'docker2', 'customs', 'boatOwner']) && Object.values(H.stands).every((s) => Number.isFinite(s.a)),
    spots: has(H.spots, ['crank', 'liftLever', 'boat', 'shedBench']) && ['crank', 'liftLever', 'boat', 'shedBench'].every((k) => H.spots[k].r > 0), latch: H.craneLatch, doors: [H.doors.shedOut.room, H.doors.shedIn.room],
    methods: ['counterweight.set', 'crane.release', 'crane.reset', 'boat.sailOut', 'shortcut.setOpen'].every((k) => { const [a, b] = k.split('.'); return typeof H[a]?.[b] === 'function'; }) };
});
check('the handles: four spawns, seven stand spots {x, z, a}, four use spots {x, z, r}, the crane latch {x, y, z, r}, the shed door both ways, the five setters', shape.spawns && shape.stands && shape.spots && Number.isFinite(shape.latch?.y) && shape.latch.r > 0 && shape.doors.join() === 'bl_shed,ballastra' && shape.methods, shape);

// ---- the rule: every counterweight position × the crane, instant (as a load does) and animated
const table = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, P2 = G.physics, out = [];
  for (const rel of [false, true]) for (const cw of [0, 1, 2]) {
    H.counterweight.set(cw, true); if (rel) H.crane.release(true); else H.crane.reset(true); G.step(0.05);
    const lv = H.lift.level, y = H.lift.y, deck = P2.groundAt(G.rooms.ballastra.center.x - 2.4, G.rooms.ballastra.center.z - 4, 10);
    out.push({ cw, rel, lv, name: H.lift.levelName, y: +y.toFixed(2), deck: +deck.toFixed(2), blocked: H.walkway.blocked, solid: H.walkway.solid, balanced: H.balanced, free: H.boat.free });
  }
  return out;
});
const expect = { 'false,0': 0, 'false,1': 0, 'false,2': 1, 'true,0': 1, 'true,1': 2, 'true,2': 3 };
check('the lift follows the rule (high weight → low deck; the load adds two steps): every state of the counterweight × the crane', table.every((r) => r.lv === expect[r.rel + ',' + r.cw]), table);
check('the deck\'s collision stands at the deck\'s height in every state (its rim walks at the level\'s height)', table.every((r) => Math.abs(r.deck - r.y) < 0.02), table.map((r) => [r.lv, r.y, r.deck]));
check('the walkway is blocked, and solid, exactly when the crane is released and the counterweight is not in the middle', table.every((r) => r.blocked === (r.rel && r.cw !== 1) && r.solid === r.blocked), table.map((r) => [r.rel, r.cw, r.blocked, r.solid]));
check('balanced is the one combination (released, middle): the deck at the top, level with the inner basin, the boat free', table.filter((r) => r.balanced).length === 1 && table.find((r) => r.balanced).lv === 2 && table.every((r) => r.free === (r.lv === 2)), table.find((r) => r.balanced));

const anim = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, seen = [];
  H.crane.reset(true); H.counterweight.set(2, true); G.step(0.1);
  const start = { lv: H.lift.level, y: +H.lift.y.toFixed(2) };
  H.crane.release(); G.step(0.4); seen.push({ t: 0.4, moving: H.lift.moving, y: +H.lift.y.toFixed(2) }); G.step(3); seen.push({ t: 3.4, lv: H.lift.level, y: +H.lift.y.toFixed(2), blocked: H.walkway.blocked, solid: H.walkway.solid });
  const t0 = G.time; H.counterweight.set(1); let moved = null; for (let i = 0; i < 60 && moved == null; i++) { G.step(0.05); if (!H.lift.moving) moved = +(G.time - t0).toFixed(2); }
  G.step(2); seen.push({ t: 'balanced', lv: H.lift.level, y: +H.lift.y.toFixed(2), balanced: H.balanced, blocked: H.walkway.blocked, solid: H.walkway.solid, took: moved });
  H.crane.reset(); G.step(3); seen.push({ t: 'reset', lv: H.lift.level, released: H.crane.released, solid: H.walkway.solid });
  H.counterweight.set(2); G.step(3); seen.push({ t: 'back', lv: H.lift.level, y: +H.lift.y.toFixed(2) });
  return { start, seen };
});
const [s1, s2, s3, s4, s5] = anim.seen;
check('animated: the deck moves smoothly (about 1.5 s a step), the load lands on the walkway when it can\'t seat', anim.start.lv === 1 && s1.moving && s2.lv === 3 && s2.blocked && s2.solid, anim);
check('animated: the counterweight to the middle balances it (deck at the top, the walkway clear again) in about 1.5 s', s3.lv === 2 && s3.balanced && !s3.blocked && !s3.solid && s3.took > 1.2 && s3.took < 2.0, s3);
check('everything goes back: crane.reset swings the load away, the counterweight back down strands the deck halfway again', s4.lv === 0 && !s4.released && !s4.solid && s5.lv === 1, [s4, s5]);

// ---- walking the harbour by input
const walk = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, R = G.rooms.ballastra, c = R.center, L = (x, z) => ({ x: c.x + x, z: c.z + z });
  H.crane.reset(true); H.counterweight.set(2, true); H.shortcut.setOpen(false, true);
  G.enterRoom('ballastra', H.spawns.pad, true); P.settle();
  const legs = [], go = (name, p, o = {}) => { const r = P.go(p.x, p.z, { tol: 0.7, maxT: 120, ...o }); legs.push({ name, r: r.r, t: +r.t.toFixed(1), at: [G.hero.pos.x - c.x, G.hero.pos.y, G.hero.pos.z - c.z].map((v) => +v.toFixed(2)), room: G.room?.id }); return r.r === 'arrived'; };
  go('pad → pontoons', L(-8, 14)); go('pontoons → quay (stairs up)', L(8, 6)); go('quay → crank', H.spots.crank); go('crank → dial', H.spots.liftLever);
  go('quay → walkway', L(0, 8.9)); go('walkway → shed float (stairs down)', L(-9.5, 5.5)); go('shed float → gangway → district edge', H.spawns.districtEdge);
  go('district edge → shortcut pier (north side)', L(-28, -23)); go('back to the shed float', L(-9.5, 5.5)); go('shed float → back over the walkway → customs', H.stands.customs);
  return legs;
});
check('he walks the whole harbour by input: pad, pontoons, the stairs, the quay, the crank, the dial, the walkway, the shed\'s float, the gangway, the district\'s edge, the shortcut\'s far pier, and back', walk.every((l) => l.r === 'arrived'), walk);

const shed = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, out = {};
  P.go(H.spawns.shedDoorOut.x, H.spawns.shedDoorOut.z, { tol: 0.6 });
  const d = H.doors.shedOut; const r1 = P.through(d.x, d.z); out.in = { ...r1, room: G.room?.id };
  const b = H.spots.shedBench; const r2 = P.go(b.x, b.z, { tol: 0.8 }); out.bench = { r: r2.r, d: +Math.hypot(G.hero.pos.x - b.x, G.hero.pos.z - b.z).toFixed(2) };
  const t = G.rooms.bl_shed.npcSpots.tessa_shed; out.tessa = { inRoom: Math.hypot(t.x - G.rooms.bl_shed.center.x, t.z - G.rooms.bl_shed.center.z) < 4, ground: +G.physics.groundAt(t.x, t.z, 2).toFixed(2), blocked: G.physics.blockedAt(t.x, t.z, 0, 0.35) };
  const r3 = P.exitTo ? P.through(H.doors.shedIn.x, H.doors.shedIn.z) : null; out.out = { ...r3, room: G.room?.id, at: [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(1)), d: +Math.hypot(G.hero.pos.x - H.spawns.shedDoorOut.x, G.hero.pos.z - H.spawns.shedDoorOut.z).toFixed(2) };
  return out;
});
check('in and out of the shed by its door: inside he walks to the bench; Tessa\'s spot is clear floor; out, he stands before the door', shed.in.room === 'bl_shed' && shed.bench.r === 'arrived' && shed.tessa.inRoom && !shed.tessa.blocked && shed.out.room === 'ballastra' && shed.out.d < 2.5, shed);

// ---- the deck: on and off at the top, and off again from any level by its stair
const deck = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, c = G.rooms.ballastra.center, L = (x, z) => ({ x: c.x + x, z: c.z + z }), h = G.hero, out = [];
  P.go(c.x + 5, c.z - 4, { tol: 0.6 });
  H.counterweight.set(1, true); H.crane.release(true); G.step(0.2);
  let r = P.go(L(2.4, -4).x, L(2.4, -4).z, { tol: 0.5 }); out.push({ leg: 'onto the deck at the top', r: r.r, y: +h.pos.y.toFixed(2), deck: +H.lift.y.toFixed(2) });
  r = P.go(L(-2.4, -5).x, L(-2.4, -5).z, { tol: 0.5 }); out.push({ leg: 'round its rims to the west side', r: r.r, y: +h.pos.y.toFixed(2) });
  // the story moves it while he stands on it: down to the bottom, he rides it, and walks off by the stair
  H.crane.reset(); G.step(3.2); out.push({ leg: 'rode it down', lv: H.lift.level, y: +h.pos.y.toFixed(2), deck: +H.lift.y.toFixed(2) });
  r = P.go(c.x + 6, c.z + 1, { tol: 0.7, maxT: 90 }); out.push({ leg: 'off by its stair to the quay', r: r.r, y: +h.pos.y.toFixed(2) });
  // halfway: down onto it from the quay, and off again
  H.counterweight.set(2); G.step(3.2);
  r = P.go(L(2.4, -5).x, L(2.4, -5).z, { tol: 0.5 }); out.push({ leg: 'down onto the halfway deck', r: r.r, y: +h.pos.y.toFixed(2), deck: +H.lift.y.toFixed(2) });
  r = P.go(c.x + 6, c.z + 1, { tol: 0.7, maxT: 90 }); out.push({ leg: 'off it again by the stair', r: r.r, y: +h.pos.y.toFixed(2) });
  return out;
});
check('the deck: walked onto at the top from the quay, round its rims; ridden down; off by its stair at every level (never stranded on it)', deck.every((l) => !l.r || l.r === 'arrived') && Math.abs(deck[0].y - deck[0].deck) < 0.05 && Math.abs(deck[2].y - deck[2].deck) < 0.1 && deck[3].y > 2.1 && deck[5].y > 2.1, deck);

// ---- the blocked walkway cuts the shed's side off from the quay's; the shortcut joins the pad to the district
const cut = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, c = G.rooms.ballastra.center, out = {};
  H.counterweight.set(0, true); H.crane.release(true); G.step(0.2);
  G.enterRoom('ballastra', { x: c.x + 8, z: c.z + 6, a: 0 }, true); P.settle();
  const pl = P.plan(c.x - 9.5, c.z + 5.5); out.blocked = { blocked: H.walkway.blocked, ok: pl.ok };
  const r = P.go(c.x - 9.5, c.z + 5.5, { tol: 0.8, maxT: 25 }); out.walk = { r: r.r, at: [+(G.hero.pos.x - c.x).toFixed(1), +(G.hero.pos.z - c.z).toFixed(1)], shedSide: G.hero.pos.x - c.x < -4.5 && G.hero.pos.z - c.z < 10.5 && G.hero.pos.z - c.z > -6 };
  H.counterweight.set(1); G.step(3);
  out.balanced = { ok: P.plan(c.x - 9.5, c.z + 5.5).ok, r: P.go(c.x - 9.5, c.z + 5.5, { tol: 0.8 }).r };
  // the shortcut: shut, no way from the pad to the district's edge but the walkway; blocked + shut: none at all
  H.counterweight.set(0, true); G.enterRoom('ballastra', H.spawns.pad, true); P.settle();
  out.shut = P.plan(H.spawns.districtEdge.x, H.spawns.districtEdge.z).ok;
  H.shortcut.setOpen(true); G.step(1.5); const mid = H.shortcut.swinging; G.step(4);
  const pl2 = P.plan(H.spawns.districtEdge.x, H.spawns.districtEdge.z), r2 = P.go(H.spawns.districtEdge.x, H.spawns.districtEdge.z, { tol: 0.8 });
  out.open = { swingingMid: mid, ok: pl2.ok, r: r2.r, viaPier: P.trace.slice(-30).join(' ').length > 0 };
  H.shortcut.setOpen(false); G.step(5); out.shutAgain = { open: H.shortcut.open, swinging: H.shortcut.swinging };
  H.crane.reset(true); H.counterweight.set(2, true);
  return out;
});
check('crane released, counterweight not in the middle: the walkway is solid — no way from the quay to the shed\'s side', cut.blocked.blocked && !cut.blocked.ok && cut.walk.r !== 'arrived' && !cut.walk.shedSide, cut);
check('balanced: the way is clear again and he walks it', cut.balanced.ok && cut.balanced.r === 'arrived', cut.balanced);
check('the shortcut: shut, nothing links the pad to the district\'s edge while the walkway is blocked; open (it swings in ~4 s), he walks it straight there; it shuts again', !cut.shut && cut.open.swingingMid && cut.open.ok && cut.open.r === 'arrived' && !cut.shutAgain.open && !cut.shutAgain.swinging, cut);

// ---- the boat sails out at the top, and back
const boat = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, out = {};
  H.counterweight.set(1, true); H.crane.release(true); G.step(0.1);
  const b0 = H.spots.boat; H.boat.sailOut(); G.step(2); out.mid = { sailing: H.boat.sailing };
  G.step(10); const b1 = H.spots.boat; out.end = { out: H.boat.out, sailing: H.boat.sailing, moved: +Math.hypot(b1.x - b0.x, b1.z - b0.z).toFixed(1), path: H.sailPath.length };
  H.boat.reset(true); G.step(0.1); const b2 = H.spots.boat; out.back = { out: H.boat.out, d: +Math.hypot(b2.x - b0.x, b2.z - b0.z).toFixed(2) };
  H.boat.sailOut(true); G.step(0.1); out.instant = { out: H.boat.out, sailing: H.boat.sailing };
  H.boat.reset(true); H.crane.reset(true); H.counterweight.set(2, true); G.step(0.1);
  return out;
});
check('the boat sails out of the deck at the top along its path into the basin (about 10 s), and can be put back; instant for a load', boat.mid.sailing && boat.end.out && !boat.end.sailing && boat.end.moved > 15 && boat.back.d < 0.2 && boat.instant.out && !boat.instant.sailing, boat);

// ---- the soft edge, and a second visit
const edge = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor, c = G.rooms.ballastra.center, h = G.hero;
  G.enterRoom('ballastra', H.spawns.pad, true); P.settle();
  h.pos.set(c.x - 20, 0.6, c.z + 2); h.onGround = false; G.step(2.5);
  const g = G.physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
  return { onFloor: g.brick, y: +h.pos.y.toFixed(2), hp: h.hp, dead: h.dead, state: G.state };
});
check('the soft edge: put over the water, he is eased back onto a floor (no fall, no harm)', edge.onFloor && !edge.dead && edge.state === 'play', edge);
const again = await ev(() => { const G = game, n = G.regions.log.length; G.exitRoom({ x: -42, z: 2, a: 0 }, true); P.settle(); G.enterRoom('ballastra', null, true); P.settle(); G.enterRoom('bl_shed', null, true); P.settle(); G.enterRoom('ballastra', null, true); P.settle(); return { builds: G.regions.log.slice(n).map((e) => e.group), room: G.room?.id, harbor: !!G.rooms.ballastra.harbor }; });
check('a second visit (out to Citadel and back, the shed and out) builds nothing again', again.builds.length === 0 && again.room === 'ballastra' && again.harbor, again);

done();
await browser.close();
