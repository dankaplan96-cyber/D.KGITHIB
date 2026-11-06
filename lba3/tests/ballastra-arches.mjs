// EXPANSION W-2 · The Arch District (src/game/ballastra/arches.js, archhouses.js, archrooms.js): the place and its
// handles, BALLASTRA.arches, before the story uses them. The region and its three rooms build lazily (as regions.js
// builds every area), far from everything; every handle is there; the canal's three levels change the district's
// floors (the walkway and its boat steps dry at 1 and 2, boarded off and drawn up at 0; the market float and its
// gangways at the level's height; the Speaking Steps' tiers floors where dry) and its look (washing, shutters, boats
// with the row at home); he walks the district by input at each level (the market, the row, Mags's door, the narrow
// stair to the terrace, the bell, Oren's door, the wide stair, the ledge and the pump room's door), through each
// room's door and back; Dunn's silt and door, the spill gate's chain, pawl and gate, the bell's tie, horns, cam and
// ring; the soft edge; a second visit builds nothing; the way back to the harbour lands at its district's edge.
// ISO (logged): he is put in the district with enterRoom (no travel there yet: the cloud's); the handles are called
// directly, as the story will.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { P.settle(); });

// ---- the build: its own lazy group, far from everything, built in steps
const built = await ev(() => {
  const G = game, gr = G.regions.groups.get('bl_arches'), before = gr.state;
  G.enterRoom('bl_arches', null, true); P.settle();
  const H = G.rooms.bl_arches.arches, R = G.rooms.bl_arches, c = R.center, mine = new Set(H?.rooms || []);
  const far = Object.entries(G.rooms).filter(([id, Q]) => !mine.has(id) && (Q.center || Q.group?.position)).map(([id, Q]) => { const q = Q.center || Q.group.position; return [id, Math.round(Math.hypot(q.x - c.x, q.z - c.z))]; }).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return { before, after: gr.state, steps: gr.stepsMs?.length ?? null, ms: gr.ms, rooms: H?.rooms, here: G.room?.id, hero: [G.hero.pos.y].map((v) => +v.toFixed(2)), nearest: far,
    scene: G.regions.sceneOf(c.x + 5, c.z + 5), roomScenes: ['bl_oren', 'bl_mags', 'bl_pump'].map((id) => G.regions.sceneOf(G.rooms[id].center.x, G.rooms[id].center.z)) };
});
check('the district builds on first need (its own lazy group, in steps) and he stands at the landing from the harbour', built.before === 'unloaded' && built.rooms?.join() === 'bl_arches,bl_oren,bl_mags,bl_pump' && built.here === 'bl_arches' && Math.abs(built.hero[0] - 1.4) < 0.1, built);
check('it stands far from every other area (the nearest over 600 m away), and its points and rooms are known as its own before they are built', built.nearest.every(([, d]) => d > 600) && built.scene === 'bl_arches' && built.roomScenes.join() === 'bl_oren,bl_mags,bl_pump', built);

// ---- the handles
const shape = await ev(() => {
  const H = game.rooms.bl_arches.arches, has = (o, ks) => ks.filter((k) => !(o?.[k] && Number.isFinite(o[k].x) && Number.isFinite(o[k].z)));
  const stands = ['oren_table', 'oren_terrace', 'oren_steps', 'mags_house', 'mags_row', 'mags_steps', 'dunn_door', 'corvin_stall', 'hobb_market', 'tessa_steps', 'tessa_pump', 'tib_bell', 'quill_steps', 'row1', 'row2', 'row3', 'row4', 'market1', 'market2', 'market3'];
  const spots = ['orenPlan', 'pumpPlates', 'pumpMachine', 'spillWheel', 'dunnDoor', 'noticeBoard', 'bellPull', 'bellCam', 'bellHorn0', 'bellHorn1', 'bellHorn2'];
  const methods = ['canal.setLevel', 'row.setHome', 'dunnDoor.setOpen', 'silt.setHits', 'chain.cut', 'pawl.release', 'spillGate.setOpen', 'bell.untie', 'bell.setHorn', 'bell.setCam', 'bell.ring'];
  return {
    spawns: has(H.spawns, ['fromHarbor', 'fromGardens', 'orenIn', 'orenOut', 'magsIn', 'magsOut', 'pumpIn', 'pumpOut', 'steps']),
    stands: has(H.stands, stands).concat(stands.filter((k) => !Number.isFinite(H.stands[k]?.a))),
    spots: has(H.spots, spots).concat(spots.filter((k) => !(H.spots[k]?.r > 0))),
    targets: [H.ballTargets.spillPawl, H.swordTargets.spillChain, H.swordTargets.dunnSilt].map((t) => t && Number.isFinite(t.y) && t.r > 0),
    exits: [H.exits.toHarbor.room, H.exits.toGardens.room], doors: ['orenOut', 'orenIn', 'magsOut', 'magsIn', 'pumpOut', 'pumpIn'].map((k) => H.doors[k]?.room),
    safe: H.safe.length, methods: methods.filter((k) => { const [a, b] = k.split('.'); return typeof H[a]?.[b] !== 'function'; }),
  };
});
check('the handles: nine spawns, twenty stand spots {x, z, a}, eleven use spots {x, z, r}, the pawl, chain and silt targets {x, y, z, r}, the two exits, three doors both ways, safe spots, the setters', !shape.spawns.length && !shape.stands.length && !shape.spots.length && shape.targets.every(Boolean)
  && shape.exits.join() === 'ballastra,bl_gardens' && shape.doors.join() === 'bl_oren,bl_arches,bl_mags,bl_arches,bl_pump,bl_arches' && shape.safe >= 4 && !shape.methods.length, shape);

const spotsClear = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, Ph = G.physics, bad = [];
  H.canal.setLevel(1, true); H.row.setHome(true, true); G.step(0.05);
  for (const [k, s] of Object.entries(H.stands)) {
    const gi = Ph.groundInfo(s.x, s.z, 12);
    if (!gi.brick || Ph.blockedAt(s.x, s.z, gi.h, 0.3)) bad.push([k, gi.brick, +gi.h.toFixed(2)]);
  }
  return bad;
});
check('every stand spot is clear floor at the balanced level (a resident can stand there)', !spotsClear.length, spotsClear);

// ---- the canal's three levels: the floors and the look
const levels = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, Ph = G.physics, pl = H.plan, out = [];
  const g = (x, z, y = 12) => { const i = Ph.groundInfo(c.x + x, c.z + z, y); return i.brick ? +i.h.toFixed(2) : null; };
  const rowStep = pl.ROW[1][0] - pl.ROW[1][1] * 0.18;
  for (const home of [false, true]) for (const lv of [0, 1, 2]) {
    H.row.setHome(home, true); H.canal.setLevel(lv, true); G.step(0.05);
    const grp = G.rooms.bl_arches.group, vis = (n) => grp.getObjectByName(n)?.visible;
    const gsMid = g((pl.GS.x0 + pl.GS.x1) / 2, (pl.GS.zA + pl.GS.zB) / 2), gnMid = g((pl.GN.x0 + pl.GN.x1) / 2, (pl.GN.zA + pl.GN.zB) / 2);
    let tiers = 0; for (let i = 0; i < pl.STEPS.tiers.length; i++) { const r = pl.STEPS.r + pl.STEPS.ring * (i + 0.5); if (g(pl.STEPS.x, pl.STEPS.z - r) === pl.STEPS.tiers[i]) tiers++; }
    out.push({ home, lv, y: +H.canal.y.toFixed(2), walk: g(-12, -29.5), boatStep: g(rowStep, pl.WALK.z1 + 0.4), float: g(-5.6, -16), gs: gsMid, gn: gnMid,
      boardWest: Ph.blockedAt(c.x - 22, c.z + pl.LEDGE.z0 - 0.1, pl.QY, 0.3), tiers, marker: +grp.getObjectByName('bl_canal').position.y.toFixed(2),
      washing: vis('bl_washing'), open: vis('bl_shuttersOpen'), shut: vis('bl_shuttersShut'), boats: vis('bl_rowBoats') || vis('bl_rowBoatsAground'), aground: vis('bl_rowBoatsAground') });
  }
  return out;
});
const L = (home, lv) => levels.find((r) => r.home === home && r.lv === lv);
check('the canal\'s water stands at each level\'s height (2.25 flooded, 1.4 balanced, 0.4 low), the basin\'s surface with it', levels.every((r) => Math.abs(r.y - [2.25, 1.4, 0.4][r.lv]) < 0.01 && Math.abs(r.marker - r.y) < 0.01), levels.map((r) => [r.lv, r.y, r.marker]));
check('the walkway and the boat steps are floors when dry (levels 1 and 2), not at level 0, where boards close the west stair', levels.every((r) => (r.lv === 0 ? r.walk == null && r.boatStep == null && r.boardWest : Math.abs(r.walk - 1.75) < 0.01 && Math.abs(r.boatStep - 1.55) < 0.01 && !r.boardWest)), levels.map((r) => [r.lv, r.walk, r.boatStep, r.boardWest]));
check('the market float rides the level (2.85, 2.0, aground at 1.05) and its gangways meet it; the row\'s gangway is drawn up at level 0', levels.every((r) => Math.abs(r.float - [2.85, 2.0, 1.05][r.lv]) < 0.02 && r.gs != null && Math.abs(r.gs - (2.8 + r.float) / 2) < 0.3 && (r.lv === 0 ? r.gn == null : Math.abs(r.gn - (1.75 + r.float) / 2) < 0.3)), levels.map((r) => [r.lv, r.float, r.gs, r.gn]));
check('the Speaking Steps: the water says how many tiers are floors (more as it falls)', L(false, 0).tiers < L(false, 1).tiers && L(false, 1).tiers < L(false, 2).tiers && L(false, 2).tiers >= 5, levels.map((r) => [r.lv, r.tiers]));
check('the row: washing out, shutters open and boats tied only when home and not flooded; the boats sit aground at the low level', levels.every((r) => r.washing === (r.home && r.lv !== 0) && r.open === r.washing && r.shut === !r.washing && r.boats === r.home && (!r.home || r.aground === (r.lv === 2))), levels.map((r) => [r.home, r.lv, r.washing, r.open, r.boats, r.aground]));

const anim = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, out = {};
  H.canal.setLevel(0, true); G.step(0.05);
  const t0 = G.time; H.canal.setLevel(1); G.step(1.0); out.mid = { moving: H.canal.moving, y: +H.canal.y.toFixed(2), float: +G.physics.groundAt(c.x - 5.6, c.z - 16, 12).toFixed(2) };
  let took = null; for (let i = 0; i < 200 && took == null; i++) { G.step(0.05); if (!H.canal.moving) took = +(G.time - t0).toFixed(1); }
  out.end = { level: H.canal.level, y: +H.canal.y.toFixed(2), took };
  return out;
});
check('animated: the canal fills or drains in about five seconds, the float riding it the whole way', anim.mid.moving && anim.mid.y < 2.25 && anim.mid.y > 1.4 && Math.abs(anim.mid.float - (anim.mid.y + 0.6)) < 0.05 && anim.end.level === 1 && anim.end.took > 4 && anim.end.took < 6.5, anim);

// ---- walking the district by input, at each level
const walk = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, pl = H.plan, L = (x, z) => ({ x: c.x + x, z: c.z + z });
  const legs = [], go = (name, p, o = {}) => { const r = P.go(p.x, p.z, { tol: 0.7, maxT: 120, ...o }); legs.push({ name, r: r.r, t: +r.t.toFixed(1), at: [G.hero.pos.x - c.x, G.hero.pos.y, G.hero.pos.z - c.z].map((v) => +v.toFixed(2)), room: G.room?.id }); return r.r === 'arrived'; };
  H.canal.setLevel(1, true); H.row.setHome(true, true); G.step(0.05);
  G.enterRoom('bl_arches', H.spawns.fromHarbor, true); P.settle();
  go('landing → the quay (stairs up)', L(-8, 9)); go('quay → the notice board', H.spots.noticeBoard); go('quay → the jetty → the gangway → the market', L(-5.6, -15)); go('market → before Corvin\'s stall', L(-8.3, -13.2));
  go('market → the row\'s gangway → the walkway', L(-5.6, -29.6)); go('walkway → Mags\'s door', H.stands.mags_row); go('walkway → a boat step', L(pl.ROW[1][0] - pl.ROW[1][1] * 0.18, pl.WALK.z1 + 0.4), { tol: 0.5 });
  go('walkway → Dunn\'s door (silted)', H.spots.dunnDoor); go('walkway → the narrow stair up the wall → the terrace', L(22.5, -12)); go('terrace → Oren\'s door', H.spawns.orenOut);
  go('terrace → the bell\'s rope', H.spots.bellPull); go('the bell → its horns\' wheels', H.spots.bellHorn1); go('the bell → its cam', H.spots.bellCam);
  go('terrace → the wide stair → the quay → the Speaking Steps', H.spawns.steps); go('Steps → down to a dry tier', L(pl.STEPS.x, pl.STEPS.z - pl.STEPS.r - 1.2), { tol: 0.6 });
  go('Steps → the west ledge → the pump room\'s door', H.spawns.pumpOut); go('ledge → down the west stair → the walkway', L(-15, -29.6));
  return legs;
});
check('balanced (level 1): he walks the whole district by input: landing, quay, notice board, jetty, gangway, market, the row\'s gangway, walkway, Mags\'s door, a boat step, Dunn\'s door, the narrow stair, the terrace, Oren\'s door, the bell\'s rope, horns and cam, the wide stair, the Steps and a dry tier, the ledge, the pump room\'s door, the west stair', walk.every((l) => l.r === 'arrived'), { legs: walk.length, failed: walk.filter((l) => l.r !== 'arrived') });

const flood = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, out = {};
  H.canal.setLevel(0, true); G.step(0.05); G.enterRoom('bl_arches', H.spawns.fromHarbor, true); P.settle();
  out.walkway = P.plan(c.x - 12, c.z - 29.6).ok;
  for (const [k, p] of [['market', { x: c.x - 5.6, z: c.z - 15 }], ['terrace', H.spawns.orenOut], ['bell', H.spots.bellPull], ['pump', H.spawns.pumpOut], ['steps', H.spawns.steps]]) out[k] = P.go(p.x, p.z, { tol: 0.7, maxT: 120 }).r;
  out.fromTerrace = P.go(c.x - 12, c.z - 29.6, { tol: 0.7, maxT: 30 }).r;
  out.at = [G.hero.pos.x - c.x, G.hero.pos.y, G.hero.pos.z - c.z].map((v) => +v.toFixed(1));
  H.canal.setLevel(2, true); G.step(0.05);
  out.low = {};
  for (const [k, p] of [['market', { x: c.x - 5.6, z: c.z - 15 }], ['walkway', { x: c.x - 12, z: c.z - 29.6 }], ['mags', H.stands.mags_row], ['terrace', H.spawns.orenOut]]) out.low[k] = P.go(p.x, p.z, { tol: 0.7, maxT: 120 }).r;
  out.lowY = +G.hero.pos.y.toFixed(2);
  H.canal.setLevel(1, true);
  return out;
});
check('flooded (level 0): the walkway is cut off (no plan, the boards and the drawn-up gangway), yet the market, the terrace, the bell, the Steps and the pump room\'s door are all walked to', !flood.walkway && ['market', 'terrace', 'bell', 'pump', 'steps'].every((k) => flood[k] === 'arrived') && flood.fromTerrace !== 'arrived', flood);
check('low (level 2): the float aground, its gangways steep but walkable: market, walkway, Mags\'s door, the terrace', Object.values(flood.low).every((r) => r === 'arrived'), flood.low);

// ---- the doors: into each room and back out
const rooms = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, out = [];
  H.canal.setLevel(1, true); G.step(0.05);
  for (const [k, inn, stand] of [['oren', 'orenIn', 'oren_table'], ['mags', 'magsIn', 'mags_house'], ['pump', 'pumpIn', 'tessa_pump']]) {
    G.enterRoom('bl_arches', H.spawns[k + 'Out'], true); P.settle();
    const d = H.doors[k + 'Out']; const r1 = P.through(d.x, d.z); const inRoom = G.room?.id;
    const s = H.stands[stand], free = !G.physics.blockedAt(s.x, s.z, 0, 0.35);
    const back = H.doors[k + 'In']; const r2 = P.through(back.x, back.z);
    out.push({ k, r1: r1.r ?? r1, inRoom, free, r2: r2.r ?? r2, out: G.room?.id, d: +Math.hypot(G.hero.pos.x - H.spawns[k + 'Out'].x, G.hero.pos.z - H.spawns[k + 'Out'].z).toFixed(2) });
  }
  return out;
});
check('the three doors: in to Oren\'s, Mags\'s and the pump room by input, their people\'s spots clear floor, and out again before each door', rooms.every((r) => r.inRoom === 'bl_' + r.k && r.free && r.out === 'bl_arches' && r.d < 2.5), rooms);

// ---- Dunn's door, the spill gate, the bell
const dunn = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, Ph = G.physics, pl = H.plan, dx = c.x + pl.ROW[pl.DUNN][0], out = [];
  const z = c.z + pl.WALK.z0 + 0.35;
  for (const n of [0, 1, 2, 3]) { H.silt.setHits(n, true); G.step(0.05); out.push({ n, solid: Ph.blockedAt(dx, z, pl.WALK_Y, 0.3), cleared: H.silt.cleared }); }
  const shut = Ph.blockedAt(dx, c.z + pl.ROW_Z + pl.ROW_D / 2, pl.BOAT_STEP, 0.2);
  H.dunnDoor.setOpen(true); G.step(1.5); const opened = { open: H.dunnDoor.open, angle: +G.rooms.bl_arches.group.getObjectByName('bl_dunnDoor').rotation.y.toFixed(2) };
  H.dunnDoor.setOpen(false, true); H.silt.setHits(0, true); G.step(0.05);
  return { silt: out, shut, opened, back: { open: H.dunnDoor.open, hits: H.silt.hits } };
});
check('Dunn\'s door: the silt heap is solid until its third hit, the door shut until opened (it swings in), and both go back', dunn.silt.slice(0, 3).every((s) => s.solid && !s.cleared) && !dunn.silt[3].solid && dunn.silt[3].cleared && dunn.shut && dunn.opened.open && dunn.opened.angle > 1.5 && !dunn.back.open && dunn.back.hits === 0, dunn);

const gate = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, Ph = G.physics, R = G.rooms.bl_pump, out = {};
  G.enterRoom('bl_pump', null, true); P.settle();
  const w = H.spots.spillWheel, gz = w.z - 1.6;
  out.before = { severed: H.chain.severed, released: H.pawl.released, open: H.spillGate.open, solid: Ph.blockedAt(w.x, gz, 0, 0.2), chain: R.group.getObjectByName('bl_spillChain').visible };
  H.chain.cut(); H.pawl.release(); G.step(0.6);
  out.done = { severed: H.chain.severed, released: H.pawl.released, chainCut: R.group.getObjectByName('bl_spillChainCut').visible, chain: R.group.getObjectByName('bl_spillChain').visible };
  H.spillGate.setOpen(true); G.step(0.5); out.mid = { moving: H.spillGate.moving }; G.step(3.5);
  out.open = { open: H.spillGate.open, moving: H.spillGate.moving, solid: Ph.blockedAt(w.x, gz, 0, 0.2) };
  H.spillGate.setOpen(false, true); H.chain.reset(true); H.pawl.reset(true); G.step(0.1);
  out.back = { open: H.spillGate.open, solid: Ph.blockedAt(w.x, gz, 0, 0.2), severed: H.chain.severed, released: H.pawl.released };
  return out;
});
check('the spill gate: chained, pawl down and solid at first; the chain cut and the pawl released (their own look); the gate rises (about 3 s) and is no longer solid; everything goes back', !gate.before.severed && !gate.before.released && gate.before.solid && gate.before.chain && gate.done.severed && gate.done.released && gate.done.chainCut && !gate.done.chain && gate.mid.moving && gate.open.open && !gate.open.moving && !gate.open.solid && gate.back.solid && !gate.back.severed, gate);

const bell = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, out = {};
  G.enterRoom('bl_arches', H.spots.bellPull, true); P.settle();
  out.tied = { tied: H.bell.tied, ring: H.bell.ring() };
  H.bell.untie(); out.untied = H.bell.tied;
  out.one = H.bell.ring(); G.step(1); out.ringing = H.bell.ringing; G.step(5); out.after = H.bell.ringing;
  H.bell.setCam(1); H.bell.setHorn(0, 1); H.bell.setHorn(1, 1); H.bell.setHorn(2, 2); G.step(2);
  out.two = H.bell.ring(); G.step(5);
  const g = G.rooms.bl_arches.group, yaw = [0, 1, 2].map((i) => +g.getObjectByName('bl_bellHorn' + i).rotation.y.toFixed(2));
  out.yaw = yaw; out.horns = H.bell.horns; out.cam = H.bell.cam;
  H.bell.setCam(0, true); [0, 1, 2].forEach((i) => H.bell.setHorn(i, i, true)); H.bell.tie(true);
  out.reset = { tied: H.bell.tied, horns: H.bell.horns, cam: H.bell.cam };
  return out;
});
check('the bell: refused while its clapper is tied; untied it rings one tone, then (the cam turned) two; the horns turn to the directions given (two pointing the same way share a yaw); it all goes back', bell.tied.tied && bell.tied.ring === null && !bell.untied && bell.one?.tones === 1 && bell.ringing && !bell.after && bell.two?.tones === 2 && bell.two.horns.join() === '1,1,2' && bell.yaw[0] === bell.yaw[1] && bell.yaw[1] !== bell.yaw[2] && bell.reset.tied && bell.reset.horns.join() === '0,1,2' && bell.reset.cam === 0, bell);

// ---- the soft edge, the way back to the harbour, a second visit
const edge = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches, c = G.rooms.bl_arches.center, h = G.hero;
  H.canal.setLevel(1, true); G.enterRoom('bl_arches', H.spawns.steps, true); P.settle();
  h.pos.set(c.x + 4, 1.0, c.z - 8); h.onGround = false; G.step(2.5);
  const g = G.physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
  // flooded while he stands on the walkway: he is put back on a dry floor
  G.enterRoom('bl_arches', { x: c.x - 12, z: c.z - 29.6, a: 0 }, true); P.settle(); H.canal.setLevel(0, true); G.step(2.5);
  const g2 = G.physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
  H.canal.setLevel(1, true);
  return { onFloor: g.brick, dead: h.dead, state: G.state, flooded: { onFloor: g2.brick, y: +h.pos.y.toFixed(2), at: [+(h.pos.x - c.x).toFixed(1), +(h.pos.z - c.z).toFixed(1)] } };
});
check('the soft edge: put over the water he is eased back onto a floor; caught on the walkway by a flood, he is put on dry stone', edge.onFloor && !edge.dead && edge.state === 'play' && edge.flooded.onFloor && edge.flooded.y >= 2.7, edge);
const back = await ev(() => {
  const G = game, H = G.rooms.bl_arches.arches;
  G.enterRoom('bl_arches', H.spawns.fromHarbor, true); P.settle();
  const e = H.exits.toHarbor; const r = P.through(e.x, e.z);
  const room = G.room?.id, hb = G.rooms.ballastra?.harbor, d = hb ? +Math.hypot(G.hero.pos.x - hb.spawns.districtEdge.x, G.hero.pos.z - hb.spawns.districtEdge.z).toFixed(2) : null;
  return { r: r.r ?? r, room, d };
});
check('the way back: through the landing\'s exit he arrives in the harbour at its district\'s edge', back.room === 'ballastra' && back.d < 2.5, back);
const again = await ev(() => { const G = game, n = G.regions.log.length; G.exitRoom({ x: -42, z: 2, a: 0 }, true); P.settle(); for (const id of ['bl_arches', 'bl_oren', 'bl_arches', 'bl_mags', 'bl_pump', 'bl_arches']) { G.enterRoom(id, null, true); P.settle(); } return { builds: G.regions.log.slice(n).map((e) => e.group), room: G.room?.id, arches: !!G.rooms.bl_arches.arches }; });
check('a second visit (out to Citadel and back, each room and out) builds nothing again', again.builds.length === 0 && again.room === 'bl_arches' && again.arches, again);

done();
await browser.close();
