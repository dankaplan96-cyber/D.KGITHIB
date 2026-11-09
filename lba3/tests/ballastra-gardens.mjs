// EXPANSION W-3 · The Water Gardens (src/game/ballastra/gardens.js, gardenrooms.js): the place and its handles,
// BALLASTRA.gardens, before the story uses them. The region and its two rooms build lazily (as regions.js builds every
// area), far from everything; every handle is there; the basins' level carries the rafts and walkways (their floors
// ride the water, the gangways tilt down to them); the rafts' three states; the channels' flows, the gauges and the three
// gates (outside and on the tunnel's board); he walks the gardens by input, dry and full: the plaza, the gauges, the
// hatch, the north path and its stairs, down a gangway onto each basin's walkway and across, the south path, the rig's
// platform (into a shallow basin and out), the east terrace, the wheel and the kiln's door; through the hatch and the
// kiln's door and back; the tunnel's tap, bypass and G1; the kiln and its wheel; the rig's parts, dials, levels, lamps,
// spills and sluice; the soft edge; the way to and from the Arch District (W-2's gate); a second visit builds nothing.
// ISO (logged): he is put in the gardens with enterRoom (no travel there yet: the cloud's); the handles are called
// directly, as the story will.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { P.settle(); });
console.log('ISO  he is put in the gardens with enterRoom (no travel there yet); the handles are called directly, as the story will');

// ---- the build: its own lazy group, far from everything, built in steps
const built = await ev(() => {
  const G = game, gr = G.regions.groups.get('bl_gardens'), before = gr.state;
  G.enterRoom('bl_gardens', null, true); P.settle();
  const H = G.rooms.bl_gardens.gardens, R = G.rooms.bl_gardens, c = R.center, mine = new Set(H?.rooms || []);
  const far = Object.entries(G.rooms).filter(([id, Q]) => !mine.has(id) && (Q.center || Q.group?.position)).map(([id, Q]) => { const q = Q.center || Q.group.position; return [id, Math.round(Math.hypot(q.x - c.x, q.z - c.z))]; }).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return { before, after: gr.state, ms: gr.ms, rooms: H?.rooms, here: G.room?.id, y: +G.hero.pos.y.toFixed(2), nearest: far,
    scene: G.regions.sceneOf(c.x + 5, c.z + 5), roomScenes: ['bl_tunnel', 'bl_kiln'].map((id) => G.regions.sceneOf(G.rooms[id].center.x, G.rooms[id].center.z)) };
});
check('the gardens build on first need (their own lazy group) and he stands on the west plaza by the gate from the Arch District', built.before === 'unloaded' && built.rooms?.join() === 'bl_gardens,bl_tunnel,bl_kiln' && built.here === 'bl_gardens' && Math.abs(built.y - 6.4) < 0.1, built);
check('they stand far from every other area (the nearest over 600 m away), and their points and rooms are known as their own before they are built', built.nearest.every(([, d]) => d > 600) && built.scene === 'bl_gardens' && built.roomScenes.join() === 'bl_tunnel,bl_kiln', built);

// ---- the handles
const shape = await ev(() => {
  const H = game.rooms.bl_gardens.gardens, has = (o, ks) => ks.filter((k) => !(o?.[k] && Number.isFinite(o[k].x) && Number.isFinite(o[k].z)));
  const stands = ['wenna_rafts', 'wenna_gauges', 'grower1', 'grower2', 'corvin_kiln', 'corvin_wheel', 'tessa_rig', 'oren_rig', 'mags_rig', 'wenna_rig', 'tib_sluice', 'rigWatch1', 'rigWatch2', 'rigWatch3', 'rigWatch4'];
  const spots = ['gaugeUpper', 'gaugeLower', 'tunnelHatch', 'tap', 'bypassValve', 'gate1', 'rigSlot0', 'rigSlot1', 'rigSlot2', 'rigSlot3', 'rigSlot4', 'rigRange0', 'rigRange1', 'rigRange2'];
  const balls = ['gate2Latch', 'gate3Latch', 'rigSwitch0', 'rigSwitch1', 'rigSwitch2'];
  const methods = ['channels.show', 'gauges.set', 'gate.set', 'tap.setOpen', 'bypass.setFree', 'rafts.setState', 'walkways.setLevel', 'kiln.setRunning', 'wheel.setSpeed', 'rig.setPart', 'rig.setRange', 'rig.setLevels', 'rig.setLamp', 'rig.spill', 'rig.setSluice'];
  return {
    spawns: has(H.spawns, ['fromArches', 'fromHouse', 'tunnelIn', 'tunnelOut', 'kilnIn', 'kilnOut', 'rig']),
    stands: has(H.stands, stands).concat(stands.filter((k) => !Number.isFinite(H.stands[k]?.a))),
    spots: has(H.spots, spots).concat(spots.filter((k) => !(H.spots[k]?.r > 0))),
    balls: has(H.ballTargets, balls).concat(balls.filter((k) => !(Number.isFinite(H.ballTargets[k]?.y) && H.ballTargets[k].r > 0))),
    exits: [H.exits.toArches.room, H.exits.toHouse.room], doors: ['tunnelOut', 'tunnelIn', 'kilnOut', 'kilnIn'].map((k) => H.doors[k]?.room),
    safe: H.safe.length, methods: methods.filter((k) => { const [a, b] = k.split('.'); return typeof H[a]?.[b] !== 'function'; }), onChange: typeof H.onChange,
  };
});
check('the handles: seven spawns, fifteen stand spots {x, z, a}, fourteen use spots {x, z, r}, five ball targets {x, y, z, r}, the two exits, two doors both ways, safe spots, the setters', !shape.spawns.length && !shape.stands.length && !shape.spots.length && !shape.balls.length
  && shape.exits.join() === 'bl_arches,bl_house' && shape.doors.join() === 'bl_tunnel,bl_gardens,bl_kiln,bl_gardens' && shape.safe >= 4 && !shape.methods.length && shape.onChange === 'function', shape);

const spotsClear = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, Ph = G.physics, bad = [];
  for (const t of [0, 1]) {
    H.walkways.setLevel(t, true); G.step(0.05);
    for (const [k, s] of Object.entries(H.stands)) {
      if (k === 'corvin_kiln') continue;
      const gi = Ph.groundInfo(s.x, s.z, 12);
      if (!gi.brick || Ph.blockedAt(s.x, s.z, gi.h, 0.3)) bad.push([t, k, gi.brick, +gi.h.toFixed(2)]);
    }
  }
  const k = H.stands.corvin_kiln; if (Ph.blockedAt(k.x, k.z, 0, 0.3)) bad.push(['room', 'corvin_kiln']);
  return bad;
});
check('every stand spot is clear floor, the basins dry and full (a resident can stand there)', !spotsClear.length, spotsClear);

// ---- the basins' level: the water, the walkways, the rafts, the gangways
const levels = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, c = G.rooms.bl_gardens.center, Ph = G.physics, pl = H.plan, out = [];
  const g = (x, z, y = 12) => { const i = Ph.groundInfo(c.x + x, c.z + z, y); return i.brick ? +i.h.toFixed(2) : null; };
  for (const t of [0, 0.5, 1]) {
    H.walkways.setLevel(t, true); G.step(0.05);
    const grp = G.rooms.bl_gardens.group;
    out.push({ t, basins: pl.BAS.map((b, i) => ({ water: +H.walkways.y[i].toFixed(2), shown: grp.getObjectByName('bl_basinWater' + i).visible, walk: g(b.cx, pl.WALK.z0 + 4), cross: g(b.cx + 5, pl.WALK.cz), gangN: g(b.cx, pl.BZ0 + pl.GANG.run / 2), raftBlocked: Ph.blockedAt(c.x + b.cx + 2.7, c.z + 1.6, H.walkways.y[i] + 0.32, 0.1), path: b.path })) });
  }
  return out;
});
check('the basins\' water stands at the level asked (dry: a film over the mud, its surface hidden; full: a hand under the paths), each basin its own', levels.every((r) => r.basins.every((b, i) => Math.abs(b.water - ([4.82, 3.22, 1.62][i] + r.t * [0.88, 0.88, 0.88][i])) < 0.02 && b.shown === (r.t > 0.03))), levels.map((r) => [r.t, r.basins.map((b) => [b.water, b.shown])]));
check('the walkways ride the water (their floor 0.32 over it, the long one and the cross one), the rafts float beside them and are not walked on', levels.every((r) => r.basins.every((b) => b.walk != null && Math.abs(b.walk - (b.water + 0.32)) < 0.02 && b.cross != null && Math.abs(b.cross - (b.water + 0.32)) < 0.02 && b.raftBlocked)), levels.map((r) => [r.t, r.basins.map((b) => [b.walk, b.cross, b.raftBlocked])]));
check('the gangways tilt from the paths down to the walkways\' ends: their middle halfway between, steeper when dry', levels.every((r) => r.basins.every((b) => b.gangN != null && Math.abs(b.gangN - (b.path + b.water + 0.32) / 2) < 0.15)), levels.map((r) => [r.t, r.basins.map((b) => b.gangN)]));
const anim = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, out = {};
  H.walkways.setLevel(0, true); G.step(0.05);
  const t0 = G.time; H.walkways.setLevel(1); G.step(1.2); out.mid = { moving: H.walkways.moving, y: +H.walkways.y[1].toFixed(2) };
  let took = null; for (let i = 0; i < 200 && took == null; i++) { G.step(0.05); if (!H.walkways.moving) took = +(G.time - t0).toFixed(1); }
  out.end = { level: H.walkways.level, y: +H.walkways.y[1].toFixed(2), took };
  return out;
});
check('animated: the basins fill or drain in about four seconds, the walkways riding them the whole way', anim.mid.moving && anim.mid.y > 3.22 && anim.mid.y < 4.1 && anim.end.level === 1 && Math.abs(anim.end.y - 4.1) < 0.02 && anim.end.took > 3 && anim.end.took < 5.5, anim);
const rafts = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, grp = G.rooms.bl_gardens.group, out = [];
  for (const s of [0, 1, 2]) { H.rafts.setState(s, true); G.step(0.05); out.push({ s, shown: [0, 1, 2].map((k) => [0, 1, 2].every((b) => grp.getObjectByName(`bl_plants${b}_${k}`).visible)), bed: grp.getObjectByName('bl_bed0').material.map?.image?.width ? grp.getObjectByName('bl_bed0').material.uuid : null }); }
  return out;
});
check('the rafts\' three states: wilted on cracked mud, recovering, green (one planting shown at a time, the beds wet once anything grows)', rafts.every((r) => r.shown.every((v, k) => v === (k === r.s))) && rafts[0].bed !== rafts[1].bed && rafts[1].bed === rafts[2].bed, rafts);

// ---- the water's ways: the channels, the gauges, the gates (outside and on the tunnel's board)
const water = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, grp = G.rooms.bl_gardens.group, T = G.rooms.bl_tunnel.group, out = {};
  const vis = (n) => grp.getObjectByName(n)?.visible;
  const falls = (k) => grp.children.filter((m) => m.name === 'bl_fall_' + k).map((m) => m.visible);
  out.start = { flows: H.channels.flows, g1: vis('bl_chanG1a'), leat: vis('bl_chanLeat'), up: vis('bl_chanUpper'), over: vis('bl_chanG3'), gFalls: falls('gardens'), kFalls: falls('kiln') };
  H.channels.show({ gardens: 1, kiln: 0.5, overflow: 0.4 }); G.step(2);
  out.after = { flows: H.channels.flows, g1: vis('bl_chanG1a'), leat: vis('bl_chanLeat'), over: vis('bl_chanG3'), gFalls: falls('gardens'), oFalls: falls('overflow') };
  H.channels.show({ kiln: 0 }); G.step(2); out.noKiln = { leat: vis('bl_chanLeat'), kFalls: falls('kiln') };
  const markers = () => grp.children.filter((m) => m.isMesh && m.userData.keep && Math.abs(m.position.z - (H.plan.GAUGE[0].z + 0.12)) < 0.01 && Math.abs(m.position.x - H.plan.GAUGE[0].x) < 0.01).map((m) => +(m.position.y).toFixed(2));   // (the upper gauge's float: the group's own frame)
  out.gauge0 = markers(); H.gauges.set(0.2, 0.8); G.step(2); out.gauge1 = markers(); out.gaugeVals = [H.gauges.upper, H.gauges.lower];
  // the gates: each leaf rises with its setting, outside; the tunnel's board shows all three
  const leafY = () => [1, 2, 3].map((id) => H.gate.get(id));
  out.gates0 = leafY();
  const boardY = () => T.children.filter((m) => m.isObject3D && !m.isMesh && m.children.length === 3 && m.children[2].geometry?.type === 'ConeGeometry').map((m) => +m.position.y.toFixed(2));
  out.board0 = boardY();
  H.gate.set(1, 2); H.gate.set(2, 1); H.gate.set(3, 2); G.step(2.0);
  out.gates1 = leafY(); out.board1 = boardY();
  H.gate.set(1, 0, true); H.gate.set(2, 2, true); H.gate.set(3, 0, true); G.step(0.05); out.board2 = boardY();
  H.channels.show({ upper: 1, gardens: 0, kiln: 1, overflow: 0 }, true); H.gauges.set(0.9, 0.1, true);
  return out;
});
check('the channels: the aqueduct and the leat run at first, the gardens\' channel and the overflow dry; a flow given shows its water and its falls (the spout, the weirs\' notches, the spillway, the wheel\'s), none shows none', water.start.up && water.start.leat && !water.start.g1 && !water.start.over && water.start.gFalls.every((v) => !v) && water.start.kFalls.every(Boolean)
  && water.after.g1 && water.after.leat && water.after.over && water.after.gFalls.length >= 3 && water.after.gFalls.every(Boolean) && water.after.oFalls.every(Boolean) && !water.noKiln.leat && water.noKiln.kFalls.every((v) => !v), water);
check('the gauges: their bronze floats ride to the values given (upper high and lower low at first, then the other way)', water.gauge0.length === 1 && water.gauge1.length === 1 && water.gauge1[0] < water.gauge0[0] && water.gaugeVals.join() === '0.2,0.8', { g0: water.gauge0, g1: water.gauge1 });
check('the gates: G1 shut, G2 open, G3 shut at first; each set (shut, half, open) moves its leaf outside and on the tunnel\'s board, and goes back', water.gates0.join() === '0,2,0' && water.gates1.join() === '2,1,2' && water.board0.length === 3 && water.board0[1] > water.board0[0] && water.board1[0] > water.board0[0] && water.board1[1] < water.board0[1] && water.board2.join() === water.board0.join(), water);

// ---- walking the gardens by input, dry and full
const walkAt = async (t) => ev((t) => {
  const G = game, H = G.rooms.bl_gardens.gardens, c = G.rooms.bl_gardens.center, pl = H.plan, L = (x, z) => ({ x: c.x + x, z: c.z + z });
  const legs = [], go = (name, p, o = {}) => { const r = P.go(p.x, p.z, { tol: 0.7, maxT: 120, ...o }); legs.push({ name, r: r.r, t: +r.t.toFixed(1), at: [G.hero.pos.x - c.x, G.hero.pos.y, G.hero.pos.z - c.z].map((v) => +v.toFixed(2)), room: G.room?.id }); return r.r === 'arrived'; };
  H.walkways.setLevel(t, true); G.step(0.05);
  G.enterRoom('bl_gardens', H.spawns.fromArches, true); P.settle();
  const B = pl.BAS;
  go('the gate → the gauges', H.spots.gaugeUpper); go('the gauges → the tunnel\'s hatch (before it)', H.spots.tunnelHatch);
  go('the plaza → the north path', L(-28, -10.5)); go('north path → down the gangway → the upper basin\'s walkway', L(B[0].cx, pl.WALK.z0 + 3));
  go('walkway → the cross walkway\'s end', L(B[0].cx + pl.WALK.cx - 0.6, pl.WALK.cz)); go('walkway → up the south gangway → the south path', L(B[0].cx, pl.SP.z0 + 2));
  go('south path → down the stair → the middle level', L(0, 19)); go('→ the rig\'s frame', H.spots.rigSlot2); go('the frame → into basin A (wading)', L(pl.RB[0].x, pl.RB[0].z), { tol: 0.6 });
  go('out of the basin → its range dial', H.spots.rigRange0); go('the rig → the middle basin\'s south gangway → its walkway', L(B[1].cx, pl.WALK.z1 - 3));
  go('walkway → up the north gangway → the north path', L(B[1].cx, -10.5)); go('north path → down the stair → the lower level', L(30, -10.5));
  go('north path → the lower basin\'s walkway', L(B[2].cx, pl.WALK.cz)); go('walkway → the east terrace by the wheel', H.stands.corvin_wheel);
  go('the wheel → before the kiln\'s door', H.spawns.kilnOut); go('the kiln → the causeway\'s gate (closed)', L(pl.EAST.x1 - 2.4, 23)); go('the east terrace → the south path → the rig', H.spawns.rig);
  return legs;
}, t);
const dry = await walkAt(0);
check('dry (the basins at their lowest): he walks the gardens by input: the gauges, the hatch, the north path, down a gangway onto the upper walkway and across, up to the south path, the stair, the rig\'s frame, into a shallow basin and out to its dial, the middle walkway, the stairs, the lower walkway, the wheel, the kiln\'s door, the causeway\'s gate, back to the rig', dry.every((l) => l.r === 'arrived'), { legs: dry.filter((l) => l.r !== 'arrived'), all: dry.map((l) => l.r).join() });
const full = await walkAt(1);
check('full (the basins at their highest): the same walk by input', full.every((l) => l.r === 'arrived'), { legs: full.filter((l) => l.r !== 'arrived'), all: full.map((l) => l.r).join() });

// ---- the doors: the hatch down into the tunnel and back up; the kiln's door and back
const rooms = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, out = [];
  for (const [k, room, stand] of [['tunnel', 'bl_tunnel', null], ['kiln', 'bl_kiln', 'corvin_kiln']]) {
    G.enterRoom('bl_gardens', H.spawns[k + 'Out'], true); P.settle();
    const d = H.doors[k + 'Out']; const r1 = P.through(d.x, d.z); const inRoom = G.room?.id;
    const free = stand ? !G.physics.blockedAt(H.stands[stand].x, H.stands[stand].z, 0, 0.35) : true;
    const spots = k === 'tunnel' ? ['tap', 'bypassValve', 'gate1'].map((s) => P.go(H.spots[s].x, H.spots[s].z, { tol: 0.8, maxT: 40 }).r) : [];
    const back = H.doors[k + 'In']; const r2 = P.through(back.x, back.z);
    out.push({ k, r1: r1.r ?? r1, inRoom, free, spots, r2: r2.r ?? r2, out: G.room?.id, d: +Math.hypot(G.hero.pos.x - H.spawns[k + 'Out'].x, G.hero.pos.z - H.spawns[k + 'Out'].z).toFixed(2) });
  }
  return out;
});
check('the hatch and the kiln\'s door: in by input (in the tunnel to the tap, the bypass valve and G1\'s wheel; Corvin\'s spot clear), and out again by the hatch and the door', rooms.every((r) => r.inRoom === 'bl_' + r.k && r.free && r.spots.every((s) => s === 'arrived') && r.out === 'bl_gardens' && r.d < 2.5), rooms);

// ---- the tunnel's controls, the kiln and its wheel
const tunnel = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, T = G.rooms.bl_tunnel.group, out = {};
  G.enterRoom('bl_tunnel', null, true); P.settle();
  out.start = { tap: H.tap.open, free: H.bypass.free, trickle: T.getObjectByName('bl_tapTrickle').visible, rust: T.getObjectByName('bl_bypassRust').visible };
  H.tap.setOpen(false); H.bypass.setFree(true); G.step(2);
  out.done = { tap: H.tap.open, free: H.bypass.free, trickle: T.getObjectByName('bl_tapTrickle').visible, rust: T.getObjectByName('bl_bypassRust').visible };
  H.tap.setOpen(true, true); H.bypass.setFree(false, true); G.step(0.05);
  out.back = { tap: H.tap.open, free: H.bypass.free, rust: T.getObjectByName('bl_bypassRust').visible };
  return out;
});
check('the tunnel: the unrecorded tap open (its trickle at the bodged clamp) and the bypass seized (rust over it) at first; shut and freed they show it; both go back', tunnel.start.tap && !tunnel.start.free && tunnel.start.trickle && tunnel.start.rust && !tunnel.done.tap && tunnel.done.free && !tunnel.done.trickle && !tunnel.done.rust && tunnel.back.tap && !tunnel.back.free && tunnel.back.rust, tunnel);
const kiln = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, grp = G.rooms.bl_gardens.group, out = {};
  G.enterRoom('bl_gardens', H.spawns.kilnOut, true); P.settle();
  const wh = grp.getObjectByName('bl_waterWheel'), a0 = wh.rotation.z; G.step(2); out.turning = Math.abs(wh.rotation.z - a0) > 0.3;
  H.wheel.setSpeed(0); G.step(8); const a1 = wh.rotation.z; G.step(2); out.stopped = Math.abs(wh.rotation.z - a1) < 0.05;
  H.wheel.setSpeed(1); H.channels.show({ kiln: 0 }, true); G.step(8); const a2 = wh.rotation.z; G.step(2); out.dryStops = Math.abs(wh.rotation.z - a2) < 0.05;
  H.channels.show({ kiln: 1 }, true);
  out.smoke = grp.getObjectByName('bl_kilnSmoke').visible; H.kiln.setRunning(false); out.cold = { running: H.kiln.running, smoke: grp.getObjectByName('bl_kilnSmoke').visible, light: G.rooms.bl_kiln.lights.at(-1).userData.base };
  H.kiln.setRunning(true); out.warm = { running: H.kiln.running, light: G.rooms.bl_kiln.lights.at(-1).userData.base };
  return out;
});
check('the kiln: its wheel turns with the leat\'s water, stops when told or when the leat runs dry; running it smokes and its mouth lights the workshop, cold it doesn\'t', kiln.turning && kiln.stopped && kiln.dryStops && kiln.smoke && !kiln.cold.running && !kiln.cold.smoke && kiln.cold.light === 0 && kiln.warm.running && kiln.warm.light > 0, kiln);

// ---- the rig
const rig = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, c = G.rooms.bl_gardens.center, Ph = G.physics, pl = H.plan, grp = G.rooms.bl_gardens.group, out = {};
  G.enterRoom('bl_gardens', H.spawns.rig, true); P.settle();
  const rigG = grp.getObjectByName('bl_rig'), partsShown = () => rigG.children.filter((m) => m.isMesh && m.visible && Math.abs(m.position.z - (pl.FRAME.z)) < 0.01).length;
  out.empty = { parts: H.rig.parts, shown: partsShown(), floor: +Ph.groundAt(c.x + pl.RB[1].x, c.z + pl.RB[1].z, 8).toFixed(2), sluice: H.rig.sluice };
  [0, 1, 2, 3, 4].forEach((i) => H.rig.setPart(i, true)); G.step(0.05); out.assembled = { parts: H.rig.parts, shown: partsShown() };
  H.rig.setRange(0, 0); H.rig.setRange(2, 2); H.rig.setLevels([0.3, 0.6, 1.0]); H.rig.setLamp(0, 'green'); H.rig.setLamp(1, 'amber'); H.rig.setLamp(2, 'red'); G.step(2.5);
  const w = (i) => grp.getObjectByName('bl_rigWater' + i);
  out.set = { ranges: H.rig.ranges, levels: H.rig.levels, lamps: H.rig.lamps, water: [0, 1, 2].map((i) => +w(i).position.y.toFixed(2)), shown: [0, 1, 2].map((i) => w(i).visible) };
  out.spill = { bad: H.rig.spill(0, 2), ok: H.rig.spill(1, 2) }; G.step(0.5); out.spilling = H.rig.spilling; G.step(3); out.spilt = H.rig.spilling;
  H.rig.setSluice(true); G.step(2); out.sluice = { open: H.rig.sluice, fall: grp.getObjectByName('bl_fall_sluice').visible };
  [0, 1, 2, 3, 4].forEach((i) => H.rig.setPart(i, false, true)); H.rig.setLevels([0, 0, 0], true); [0, 1, 2].forEach((i) => { H.rig.setLamp(i, 'off'); H.rig.setRange(i, 1, true); }); H.rig.setSluice(false, true); G.step(0.05);
  out.back = { parts: H.rig.parts.some(Boolean), shown: partsShown(), water: [0, 1, 2].map((i) => w(i).visible), sluice: H.rig.sluice };
  return out;
});
check('the rig: empty at first, its basins shallow floors (wadeable); the five parts fit in the frame; dials, levels (the water and floats rise), lamps; a spill only to a neighbour, about 2.5 s; the storm sluice opens and pours; all goes back', !rig.empty.parts.some(Boolean) && rig.empty.shown === 0 && Math.abs(rig.empty.floor - 4.55) < 0.02 && !rig.empty.sluice
  && rig.assembled.parts.every(Boolean) && rig.assembled.shown === 5 && rig.set.ranges.join() === '0,1,2' && rig.set.lamps.join() === 'green,amber,red' && rig.set.water[0] < rig.set.water[1] && rig.set.water[1] < rig.set.water[2] && rig.set.shown.every(Boolean)
  && rig.spill.bad === false && rig.spill.ok === true && rig.spilling[1] && !rig.spilt.some(Boolean) && rig.sluice.open && rig.sluice.fall && !rig.back.parts && rig.back.shown === 0 && rig.back.water.every((v) => !v) && !rig.back.sluice, rig);

// ---- the soft edge, the way to and from the Arch District, a second visit
const edge = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, c = G.rooms.bl_gardens.center, h = G.hero, pl = H.plan;
  H.walkways.setLevel(1, true); G.enterRoom('bl_gardens', H.spawns.rig, true); P.settle();
  h.pos.set(c.x + pl.BAS[1].cx + 10, 4.0, c.z + 0); h.onGround = false; G.step(2.5);
  const g = G.physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
  return { onFloor: g.brick, dead: h.dead, state: G.state, at: [+(h.pos.x - c.x).toFixed(1), +(h.pos.y).toFixed(2), +(h.pos.z - c.z).toFixed(1)] };
});
check('the soft edge: put over a basin\'s open water he is eased back onto a floor', edge.onFloor && !edge.dead && edge.state === 'play', edge);
const ways = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, A = G.rooms.bl_arches.arches, out = {};
  G.enterRoom('bl_arches', A.spawns.fromGardens, true); P.settle();
  const e = A.exits.toGardens; const r1 = P.through(e.x, e.z);
  out.in = { r: r1.r ?? r1, room: G.room?.id, d: +Math.hypot(G.hero.pos.x - H.spawns.fromArches.x, G.hero.pos.z - H.spawns.fromArches.z).toFixed(2) };
  const x = H.exits.toArches; const r2 = P.through(x.x, x.z);
  out.out = { r: r2.r ?? r2, room: G.room?.id, d: +Math.hypot(G.hero.pos.x - A.spawns.fromGardens.x, G.hero.pos.z - A.spawns.fromGardens.z).toFixed(2) };
  return out;
});
check('the way from the Arch District: through its terrace\'s east gate he arrives at the gardens\' west gate; back through it, he arrives at the terrace\'s gate', ways.in.room === 'bl_gardens' && ways.in.d < 2.5 && ways.out.room === 'bl_arches' && ways.out.d < 2.5, ways);
const again = await ev(() => { const G = game, n = G.regions.log.length; G.exitRoom({ x: -42, z: 2, a: 0 }, true); P.settle(); for (const id of ['bl_gardens', 'bl_tunnel', 'bl_gardens', 'bl_kiln', 'bl_gardens']) { G.enterRoom(id, null, true); P.settle(); } return { builds: G.regions.log.slice(n).map((e) => e.group), room: G.room?.id, gardens: !!G.rooms.bl_gardens.gardens }; });
check('a second visit (out to Citadel and back, each room and out) builds nothing again', again.builds.length === 0 && again.room === 'bl_gardens' && again.gardens, again);

// ---- the cost: draw calls and triangles at the views the spec asks for (SwiftShader: counts only, never fps)
const cost = await ev(() => {
  const G = game, H = G.rooms.bl_gardens.gardens, c = G.rooms.bl_gardens.center, R = G.renderer.renderer, out = [];
  H.walkways.setLevel(1, true); H.rafts.setState(2, true); H.channels.show({ gardens: 1 }, true);
  const at = (name, room, x, z, a) => { G.enterRoom(room, { x, z, a }, true); P.settle(); G.camRig.lba && (G.camRig.lba.init = false); for (let i = 0; i < 8; i++) G.step(0.1); R.info.reset(); R.info.autoReset = false; G.frame(1 / 30, true); out.push({ name, calls: R.info.render.calls, tris: R.info.render.triangles }); R.info.autoReset = true; };
  at('the rafts with the gauges (the plaza)', 'bl_gardens', c.x - 40, c.z - 12, Math.PI * 0.7);
  at('the upper basin from the north path', 'bl_gardens', c.x - 21, c.z - 10.5, 0);
  at('the test rig', 'bl_gardens', c.x + 9.25, c.z + 23, 0);
  at('the east terrace and the wheel', 'bl_gardens', c.x + 51, c.z - 8, Math.PI);
  at('the tunnel', 'bl_tunnel', G.rooms.bl_tunnel.spawn.x, G.rooms.bl_tunnel.spawn.z, Math.PI / 2);
  at('the kiln', 'bl_kiln', G.rooms.bl_kiln.spawn.x, G.rooms.bl_kiln.spawn.z, Math.PI / 2);
  H.walkways.setLevel(0, true); H.rafts.setState(0, true); H.channels.show({ gardens: 0 }, true);
  return out;
});
console.log('COST ' + JSON.stringify(cost));
check('the cost: every view under the Citadel street\'s budget (215 draw calls, 900k triangles; W-2\'s measure)', cost.every((v) => v.calls > 0 && v.calls <= 215 && v.tris <= 900000), cost);

done();
await browser.close();
