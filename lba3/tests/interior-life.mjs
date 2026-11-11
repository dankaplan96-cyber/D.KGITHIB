// INTERIOR-LIFE: people in Citadel's seven interiors and at the two spaceports (src/game/roomlife.js, story/interiors.js,
// text/interiors.js), and the household rounds of the story's people at home (roomlife.js StoryRounds). Played on the
// real game, deterministic stepping (game.step):
//   - each room in chapter 1 (the dry well), chapter 2 and the evacuation (chapter 8): the right people are there (the
//     evacuation: only Luc and Mr Bazoo, packing); every one stands on the room's floor, off its walls and furniture (a
//     sitter on their seat, inside the walls), faces their work, a seat's way, a partner or Twinsen; each answers a talk
//     (P.talk, by input: he walks to them and presses E) with a line of their own; their rounds go on (stops visited)
//   - Citadel Spaceport: chapters 1–3 the grounded set (a stranded traveller, the mechanic), from chapter 4 the flying
//     set (a visitor at the board, a family, the mechanic), none in the evacuation; nobody stands on the walkway from the
//     bridge to the ship, in the pad's ring or on the board's reading spot; each answers a talk. Zeelich Spaceport: two
//     Esmer travellers, the same rules
//   - SPACEPORT-1, the terminals (walked into by their doors, INPUT): Citadel's in chapters 1, 2 (grounded: the clerk,
//     the café's keeper, the port guard, a stranded traveller; the GROUNDED notice up), 4 (flying: the clerk, the café's
//     keeper, two passengers; the notice down) and the evacuation (nobody); Zeelich's in chapters 3 and 9 (the clerk,
//     the porter); each on the hall's floor or the counter's platform, off the furniture, clear of the counter's, the
//     board's, the door's and the gate's spots; each answers a talk; their rounds go on
//   - Zoé in chapter 2's free play (story/chapter1.js: her mark at home): she moves between at least 3 stops in 60 s,
//     never through a wall or the furniture; a talk stops her and she faces Twinsen; a scene's place for her (the gate,
//     chapter 2's "meet Zoé") puts her there at once, and back home she is on her mark; Arthur's round too
//   - cost: the rooms' people's update time per frame with the hero in the tavern, on the street, and the household round's
// ISO (logged): chapters are set by their flags (as tests/townlife.mjs); the hero is put outside a door by exitRoom and
// walks in by input. Pictures: one per room with its people in /dev/shm/interior-life-shots/ (SHOTS=dir to change).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker();
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || '/dev/shm/interior-life-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { await ev(() => game.renderer.render?.()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
await open(page, '?nocine'); await menu(page, 'new');

await ev(async () => {
  const RL = await import('/src/game/roomlife.js');
  window.RL = RL;
  window.said = []; const sv = game.say; game.say = function (n, lines, ...a) { window.said.push({ n, lines: [...lines] }); return sv.call(this, n, lines, ...a); };
  window.setChapter = (key, extra = {}) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: key !== 'well', intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); G.step(0.2); };
  window.people = (place) => (game.roomWalkers?.res || []).filter((r) => r.def.room === place);
  // where everyone of a place stands, and whether it is right
  window.audit = (place, floors) => {
    const G = game, PH = G.physics, h = G.hero, out = [];
    for (const r of people(place)) {
      if (!r.present || r.away) continue;
      // (sitting down, sitting, or getting up again — walkers.js sitTick, 0.8 s each way — a sitter is over its seat)
      const p = r.pos, st = r.st, seated = st === 'seated' || st === 'sitin' || st === 'sitout', s = r.stop, bad = [];
      if (floors && !floors.some((f) => p.x >= f.x0 - 0.01 && p.x <= f.x1 + 0.01 && p.z >= f.z0 - 0.01 && p.z <= f.z1 + 0.01)) bad.push('off the floor');
      const fy = floors?.find((f) => p.x >= f.x0 - 0.01 && p.x <= f.x1 + 0.01 && p.z >= f.z0 - 0.01 && p.z <= f.z1 + 0.01)?.y ?? p.y;
      for (const c of PH.near(p.x, p.z)) {
        if (!c.enabled || c.stair || c.top <= fy + 0.02) continue;   // (the floor it stands on)
        if (seated && (c.top < 2.0 || (s?.seat && Math.hypot(c.x - s.seat.x, c.z - s.seat.z) < 1.2))) continue;   // (a sitter: only the walls)
        if (PH._inside(c, p.x, p.z, seated ? 0.05 : 0.1) && c.bottom < p.y + 1.6 && c.top > p.y + 0.05) bad.push(`in a collider at ${c.x.toFixed(1)},${c.z.toFixed(1)} top ${c.top.toFixed(2)}`);
      }
      // the way it faces: its stop's (its work), its seat's, its partner's or Twinsen's (it turns to him when he is near)
      const want = [s?.a, s?.seat?.a, r.angleTo(h)];
      const mate = s?.mate && people(place).find((q) => q.def.id === s.mate); if (mate) want.push(r.angleTo(mate));
      const dA = (a) => Math.abs(Math.atan2(Math.sin(a - r.angle), Math.cos(a - r.angle)));
      const facing = st === 'walk' || st === 'plan' || want.some((a) => a != null && dA(a) < 0.6);
      if (!facing) bad.push('faces ' + r.angle.toFixed(2) + ' (stop ' + (s?.a ?? 0).toFixed(2) + ')');
      if (!seated && Math.abs(p.y - fy) > 0.1) bad.push('not on the floor: y ' + p.y.toFixed(2));
      out.push({ id: r.def.id, st, stop: s?.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), bad });
    }
    return out;
  };
});

const ROOMS = ['tavern', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage'];
const roomInfo = await ev(() => Object.fromEntries(Object.entries(RL.ROOMS).map(([k, R]) => [k, { ids: R.people.map((p) => p.id), stays: R.people.filter((p) => p.stays).map((p) => p.id) }])));

// ---- the cast: everyone listed, hidden until their place is built (nothing built for them)
const cast = await ev(() => { const W = game.roomWalkers, G = game; return { n: W.res.length, ids: W.res.map((r) => r.def.id), pending: W.res.filter((r) => r.def.pending).map((r) => r.def.id), built: ['tavern', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage', 'terminal', 'zterminal', 'zeelich'].filter((id) => G.regions.built(id)), street: G.walkers.res.length, clash: W.res.filter((r) => G.npcs.some((n) => n !== r && n.def.id === r.def.id)).map((r) => r.def.id) }; });
check('the rooms\' and the ports\' people are in the cast (40: the terminals\' 12 — WC-4\'s evacuation queue and council guards among them — and WC-3\'s School classroom and council antechamber 8, PEOPLE-1\'s Otringal bar and hotel 4), none sharing an id; those of places not built yet wait hidden (39); nothing was built for them; the street\'s residents are their own (47: WC-3\'s 24, DECLUTTER\'s Tibbo, Oni, Marl, Bashir and ZEELICH-LIFE\'s Fennick, Rezz, Oma among them; the islands\' people are made only when their island is built)', cast.n === 44 && cast.clash.length === 0 && cast.built.length === 0 && cast.pending.length === 39 && cast.street === 47, { ...cast, ids: cast.ids.length, pending: cast.pending.length });
const names = await ev(async () => { const { t } = await import('/src/game/i18n.js'); return game.roomWalkers.res.filter((r) => t(r.def.name) === r.def.name).map((r) => r.def.id); });
check('every one of them has a name', names.length === 0, names);

// ---- each room in chapter 1, chapter 2 and the evacuation
const STATES = [['chapter 1 (the dry well)', 'well', {}], ['chapter 2 (the water back)', 'project', { c1_water: true }], ['the evacuation (chapter 8)', 'evacuation', {}]];
const visits = {};
for (const [label, key, extra] of STATES) {
  await ev(([key, extra]) => setChapter(key, extra), [key, extra]);
  iso(`${label}: chapter set by its flags`);
  for (const room of ROOMS) {
    // (the neighbours' door opens once the prologue is done: in chapter 1 the room is built and looked at, not walked into)
    const walkIn = !(room === 'nbrhouse' && key === 'well');
    const r = await ev(([room, walkIn]) => {
      const G = game, out = {};
      if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); }
      if (walkIn) { const o = G.story.exitTo(room + '-out'); G.exitRoom({ ...o, a: o.a + Math.PI }, true, true); G.step(0.3); window.said.length = 0; out.enter = P.enter(room).r; if (out.enter !== 'entered') out.said = window.said.slice(-4).map((q) => q.n + ': ' + q.lines.join(' ').slice(0, 80)); }
      else { G.regions.ensure(room, 'test'); G.step(0.3); out.enter = 'not walked in'; }
      out.room = G.room?.id ?? 'citadel';
      return out;
    }, [room, walkIn]);
    // let the room live a while (in its own frame rate: the hero stands by the door)
    const live = await ev(([room]) => { const G = game; for (let i = 0; i < 40; i++) G.step(0.5); const R = G.regions.built(room), c = R.center;
      const floors = RL.ROOMS[room].floors.map((f) => ({ x0: f.x0 + c.x, x1: f.x1 + c.x, z0: f.z0 + c.z, z1: f.z1 + c.z, y: f.y }));
      const here = people(room).filter((r) => r.present && !r.away).map((r) => r.def.id);
      // (one who has just arrived at a stop is still turning to it: looked at again a moment later — 2.5 s: since STOP-TURN
      //  (walkers.js dwellTick) a stop first settles 1.2 s, then turns; Ama at her forms cabinet took 2.2 s)
      let a = audit(room, floors); if (a.some((q) => q.bad.some((b) => b.startsWith('faces')))) { G.step(2.5); a = audit(room, floors); }
      const spot = Object.values(R.npcSpots || {})[0];
      const keeper = people(room)[0];
      return { here, audit: a, spot: spot ? { x: +(spot.x - c.x).toFixed(2), z: +(spot.z - c.z).toFixed(2) } : null, keeperStop0: keeper ? { x: +(keeper.stops[0].x - c.x).toFixed(2), z: +(keeper.stops[0].z - c.z).toFixed(2) } : null, logs: Object.fromEntries(people(room).map((q) => [q.def.id, q.log.filter((l) => / at |seated|chat over/.test(l)).length])) }; }, [room]);
    const want = key === 'evacuation' ? roomInfo[room].stays : roomInfo[room].ids;
    check(`${label}, ${room}: the right people are there (${want.join(', ') || 'nobody'}) [${r.enter}]`, JSON.stringify([...live.here].sort()) === JSON.stringify([...want].sort()) && (r.room === room || !walkIn), { want, here: live.here, ...r });
    const bad = live.audit.filter((q) => q.bad.length);
    check(`${label}, ${room}: each stands on the room's floor, off the walls and the furniture, and faces sensibly`, bad.length === 0, { bad, all: live.audit });
    if (key === 'project') check(`${room}: the keeper's round starts at the room's spot for them (R.npcSpots)`, live.spot && live.keeperStop0 && Math.hypot(live.spot.x - live.keeperStop0.x, live.spot.z - live.keeperStop0.z) < 0.1, live);
    for (const [id, n] of Object.entries(live.logs)) visits[id] = (visits[id] || 0) + n;
    if (walkIn && key === 'project') await shot(room);   // (the room with its people, the hero by the door)
    if (walkIn) {
      const talks = await ev(([ids]) => { const out = {}; for (const id of ids) { window.said.length = 0; const r = P.talk(id); const shop = game.state === 'shop'; if (shop) { P.tap('Escape', 0.1); P.settle(); } out[id] = { r: r.r, to: r.to, sp: r.speakers, ...(r.skipped ? { sk: r.skipped } : {}), said: window.said.filter((s) => s.n === 'n_' + id).map((s) => s.lines.join(' ')), ...(shop ? { shop } : {}) }; } return out; }, [live.here]);   // (SHOPS-1: a keeper's talk ends in their shop: left with Esc before the next talk)
      check(`${label}, ${room}: each answers a talk with a line of their own (INPUT)`, Object.values(talks).every((q) => q.r === 'talked' && q.said.length > 0), talks);
      if (key === 'project') console.log(`  ${room} lines: ` + Object.entries(talks).map(([id, q]) => `${id}: "${q.said[0]}"`).join(' · '));
      if (key === 'evacuation' && live.here.length) await shot(room + '-evacuation');
    }
  }
}
check('the rooms\' people keep their rounds: each visited stops of their round (seated, at a stop, a chat)', roomInfo && Object.entries(roomInfo).filter(([k]) => ROOMS.includes(k)).flatMap(([, r]) => r.ids).every((id) => (visits[id] || 0) >= 1), visits);

// ---- the cost: the rooms' people with the hero in the tavern; the street; every room's people abstract then
const cost = await ev(() => { const G = game, W = G.roomWalkers;
  setChapter('project', { c1_water: true });
  if (G.room) { const e = G.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); P.settle(); }
  const o = G.story.exitTo('tavern-out'); G.exitRoom({ ...o, a: o.a + Math.PI }, true, true); G.step(0.3); P.enter('tavern');
  const run = (s) => { W.measure = true; W.stats.ms = 0; W.stats.full = W.stats.reduced = W.stats.abstract = 0; const n = Math.round(s * 30); for (let i = 0; i < n; i++) G.step(1 / 30); W.measure = false; return { msPerFrame: +(W.stats.ms / n).toFixed(3), full: W.stats.full, abstract: W.stats.abstract, frames: n }; };
  const tavern = run(20);
  const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle();
  const street = run(20);
  const inFull = W.res.filter((r) => !r.def.outdoor && r.tier !== 2).map((r) => r.def.id);
  return { tavern, street, inFull, people: W.res.length }; });
console.log(`MEASURE rooms' and ports' people (${cost.people}): hero in the tavern ${cost.tavern.msPerFrame} ms/frame (${cost.tavern.full} full updates, ${cost.tavern.abstract} abstract ticks in ${cost.tavern.frames} frames); hero on the street ${cost.street.msPerFrame} ms/frame (${cost.street.full} full, ${cost.street.abstract} abstract). SwiftShader container: CPU time of their updates only, not fps.`);
check('cost: in the tavern its people are simulated in full; with the hero on the street no room\'s person is (they are stepped twice a second, abstract)', cost.inFull.length === 0 && cost.tavern.full > 0, cost);

// ---- Citadel Spaceport
const portSets = await ev(() => ({ all: RL.PORT_IDS.citadel, grounded: ['gurt', 'dov'], flying: ['gurt', 'esren', 'gunda', 'bibi'], evac: ['gurt', 'dov', 'gunda', 'bibi'] }));   // (WC-4: the evacuation's deck: the mechanic, Dov, the family)
const portCheck = async (label, key, extra, want, talk) => {
  await ev(([key, extra]) => { setChapter(key, extra); const G = game; G.exitRoom({ x: -16, z: 40, a: Math.PI / 2 }, true, true); G.step(0.3); }, [key, extra]);
  iso(`Citadel Spaceport, ${label}: the hero put on the deck by the bridge (exitRoom)`);
  const r = await ev(() => { const G = game; for (let i = 0; i < 60; i++) G.step(0.5);
    const S = G.world.spaceport, d = S.deck, b = S.board, fl = [{ x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1 }, { x0: S.bridge.x0, x1: S.bridge.x1, z0: S.bridge.z - S.bridge.hw, z1: S.bridge.z + S.bridge.hw }];
    let a = audit('port_citadel', fl); if (a.some((q) => q.bad.some((b) => b.startsWith('faces')))) { G.step(2.5); a = audit('port_citadel', fl); }
    // standing (not walking): off the walkway, the pad's ring, the board's reading spot
    const clear = people('port_citadel').filter((q) => q.present && !q.away && q.st !== 'walk' && q.st !== 'plan').map((q) => ({ id: q.def.id, walkway: q.pos.x < S.pad.x - 4 && Math.abs(q.pos.z - S.bridge.z) < 1.9, ring: Math.hypot(q.pos.x - S.pad.x, q.pos.z - S.pad.z) < 5.6, board: Math.hypot(q.pos.x - (b.x + 0.6), q.pos.z - b.z) < 1.0 })).filter((q) => q.walkway || q.ring || q.board);
    return { here: people('port_citadel').filter((q) => q.present && !q.away).map((q) => q.def.id), bad: a.filter((q) => q.bad.length), clear, stops: people('port_citadel').flatMap((q) => q.stops.map((s) => ({ id: s.id, x: s.x, z: s.z }))) }; });
  check(`Citadel Spaceport, ${label}: the right people are there (${want.join(', ') || 'nobody'})`, JSON.stringify([...r.here].sort()) === JSON.stringify([...want].sort()), r.here);
  check(`Citadel Spaceport, ${label}: each on the deck, off the furniture, facing sensibly; nobody stands on the walkway, in the pad's ring or on the board's reading spot`, r.bad.length === 0 && r.clear.length === 0, { bad: r.bad, clear: r.clear });
  if (talk && want.length) {
    const talks = await ev(([ids]) => { const out = {}; for (const id of ids) { window.said.length = 0; const nm = game.npcs.find((q) => q.def.id === id)?.def.name || 'n_' + id; const q = P.talk(id); out[id] = { r: q.r, to: q.to, sp: q.speakers, ...(q.skipped ? { sk: q.skipped } : {}), said: window.said.filter((s) => s.n === nm).map((s) => s.lines.join(' ')) }; } return out; }, [r.here]);
    check(`Citadel Spaceport, ${label}: each answers a talk (INPUT), the line fits the flights (${key})`, Object.values(talks).every((q) => q.r === 'talked' && q.said.length > 0), talks);
    console.log(`  port ${label}: ` + Object.entries(talks).map(([id, q]) => `${id}: "${q.said[0]}"`).join(' · '));
    await ev(() => { const G = game; G.exitRoom({ x: -12.5, z: 39.5, a: Math.PI / 2 + 0.3 }, true, true); for (let i = 0; i < 10; i++) G.step(0.5); });
    await shot('spaceport-' + key);
  }
  return r;
};
const stopsAll = await ev(() => { const S = game.world.spaceport, b = S.board; return people('port_citadel').flatMap((q) => q.stops.map((s) => ({ id: s.id, walkway: s.x < S.pad.x - 4 && Math.abs(s.z - S.bridge.z) < 1.9, ring: Math.hypot(s.x - S.pad.x, s.z - S.pad.z) < 5.6, board: Math.hypot(s.x - (b.x + 0.6), s.z - b.z) < 1.0, doran: Math.hypot(s.x - (S.landing.x - 1.0), s.z - (S.landing.z + 2.6)) < 1.6 }))).filter((s) => s.walkway || s.ring || s.board || s.doran); });
check('Citadel Spaceport: no stop on the walkway, in the pad\'s ring, on the board\'s reading spot or where chapter 2 puts Doran by the hatch', stopsAll.length === 0, stopsAll);
await portCheck('chapter 1 (flights grounded)', 'well', {}, portSets.grounded, true);
await portCheck('chapter 2', 'project', { c1_water: true }, portSets.grounded, false);
await portCheck('chapter 4 (flights run)', 'dig', {}, portSets.flying, true);
await portCheck('the evacuation', 'evacuation', {}, portSets.evac, true);

// ---- Zeelich Spaceport
for (const [label, key] of [['chapter 3 (flights grounded)', 'zeelich'], ['chapter 9 (flights run)', 'council']]) {
  await ev((key) => { setChapter(key); const G = game; G.regions.ensure('zeelich', 'test'); G.step(0.3); if (G.room?.id !== 'zeelich') { G.enterRoom('zeelich', G.regions.built('zeelich').spaceport.landing, true); } G.step(0.5); }, key);
  iso(`Zeelich Spaceport, ${label}: chapter set by its flags; the hero put on the deck (enterRoom)`);
  const r = await ev(() => { const G = game, Z = G.regions.built('zeelich'), S = Z.spaceport, d = S.deck; for (let i = 0; i < 60; i++) G.step(0.5);
    let a = audit('port_zeelich', [d]); if (a.some((q) => q.bad.some((b) => b.startsWith('faces')))) { G.step(2.5); a = audit('port_zeelich', [d]); }
    const clear = people('port_zeelich').filter((q) => q.present && q.st !== 'walk' && q.st !== 'plan').map((q) => ({ id: q.def.id, walkway: Math.abs(q.pos.x - S.pad.x) < 2.2 && q.pos.z < S.landing.z + 0.5, ring: Math.hypot(q.pos.x - S.pad.x, q.pos.z - S.pad.z) < 6.0 })).filter((q) => q.walkway || q.ring);
    return { here: people('port_zeelich').filter((q) => q.present && !q.away).map((q) => q.def.id), bad: a.filter((q) => q.bad.length), clear, all: a }; });
  check(`Zeelich Spaceport, ${label}: its two Esmer travellers are there, on the deck, clear of the walkway and the pad's ring`, r.here.length === 2 && r.bad.length === 0 && r.clear.length === 0, r);
  const talks = await ev(([ids]) => { const out = {}; for (const id of ids) { window.said.length = 0; const q = P.talk(id); out[id] = { r: q.r, to: q.to, sp: q.speakers, ...(q.skipped ? { sk: q.skipped } : {}), said: window.said.filter((s) => s.n === 'n_' + id).map((s) => s.lines.join(' ')) }; } return out; }, [r.here]);
  check(`Zeelich Spaceport, ${label}: each answers a talk (INPUT)`, Object.values(talks).every((q) => q.r === 'talked' && q.said.length > 0), talks);
  console.log(`  zeelich port ${label}: ` + Object.entries(talks).map(([id, q]) => `${id}: "${q.said[0]}"`).join(' · '));
  if (key === 'council') { await ev(() => { const G = game, S = G.regions.built('zeelich').spaceport; G.enterRoom('zeelich', { x: S.landing.x - 3, z: S.landing.z + 2, a: Math.PI * 0.8 }, true); for (let i = 0; i < 10; i++) G.step(0.5); }); await shot('spaceport-zeelich'); }
}

// ---- SPACEPORT-1: the terminals' people (terminal.js, zterminal.js; roomlife.js ROOMS.terminal / zterminal)
// (WC-4: by the port's state, roomlife.js portPhase; the last column is the notice up: 'grounded', the evacuation's
//  'list' at Citadel, the council's order on Zeelich in chapter 9, or none)
const TERM = [
  ['terminal', 'chapter 1 (grounded)', 'well', {}, ['ama', 'tavi', 'bern', 'lomba'], 'grounded'],
  ['terminal', 'chapter 2 (grounded)', 'project', { c1_water: true }, ['ama', 'tavi', 'bern', 'lomba'], 'grounded'],
  ['terminal', 'chapter 4 (flying)', 'dig', {}, ['ama', 'tavi', 'ressa', 'ollo'], null],
  ['terminal', 'the evacuation (the queue for the project\'s ships)', 'evacuation', {}, ['ama', 'tavi', 'bern', 'lomba', 'ressa', 'ollo', 'rollo_q', 'pell_q'], 'list'],
  ['terminal', 'chapter 9 (flying)', 'council', {}, ['ama', 'tavi', 'ressa', 'ollo'], null],
  ['terminal', 'chapter 10 (back to normal, Mrs Lomba home)', 'network', {}, ['ama', 'tavi', 'lomba', 'ressa', 'ollo'], null],
  ['terminal', 'the epilogue', 'home', {}, ['ama', 'tavi', 'lomba', 'ressa', 'ollo'], null],
  ['zterminal', 'chapter 3 (grounded)', 'zeelich', {}, ['velo', 'pask'], 'grounded'],
  ['zterminal', 'chapter 4 (flying)', 'dig', {}, ['velo', 'pask'], null],
  ['zterminal', 'the evacuation (quieter: its staff)', 'evacuation', {}, ['velo', 'pask'], null],
  ['zterminal', 'chapter 9 (the council\'s guards)', 'council', {}, ['velo', 'pask', 'zt_guard', 'zt_guard2'], 'council'],
  ['zterminal', 'chapter 10 (back to normal)', 'network', {}, ['velo', 'pask'], null],
];
for (const [room, label, key, extra, want, notice] of TERM) {
  const r = await ev(async ([room, key, extra]) => {
    setChapter(key, extra); const G = game, out = {};
    if (room === 'terminal') G.exitRoom({ x: -2.5, z: 35.5, a: Math.PI }, true, true);
    else { G.regions.ensure('zeelich', 'test'); G.step(0.3); G.enterRoom('zeelich', G.regions.built('zeelich').spaceport.landing, true, true); }
    G.step(0.3); out.enter = P.enter(room).r; out.room = G.room?.id;
    const mod = await import(room === 'terminal' ? '/src/game/terminal.js' : '/src/game/zterminal.js'), H = mod.TERMINAL || mod.ZTERMINAL;
    for (let i = 0; i < 60; i++) G.step(0.5);
    const R = G.regions.built(room), c = R.center;
    const floors = RL.ROOMS[room].floors.map((f) => ({ x0: f.x0 + c.x, x1: f.x1 + c.x, z0: f.z0 + c.z, z1: f.z1 + c.z, y: f.y }));
    let a = audit(room, floors); if (a.some((q) => q.bad.some((b) => b.startsWith('faces')))) { G.step(2.5); a = audit(room, floors); }
    out.here = people(room).filter((q) => q.present && !q.away).map((q) => q.def.id);
    out.bad = a.filter((q) => q.bad.length); out.all = a;
    // (standing or sitting, not walking: clear of where Twinsen stands to use the counter and read the board, of the
    //  door's and the gate's triggers and the gate's way in)
    const spots = { counter: [H.counter, 0.9], board: [H.board, 0.9], door: [H.door, 1.6], gate: [H.gate, 1.6], gateIn: [R.entries.gate, 1.0] };
    out.clear = people(room).filter((q) => q.present && !q.away && q.st !== 'walk' && q.st !== 'plan').flatMap((q) => Object.entries(spots).filter(([, [p, d]]) => Math.hypot(q.pos.x - p.x, q.pos.z - p.z) < d).map(([k]) => q.def.id + '@' + k));
    out.stopsClear = people(room).flatMap((q) => q.stops.flatMap((s) => Object.entries(spots).filter(([, [p, d]]) => Math.hypot(s.x - p.x, s.z - p.z) < d).map(([k]) => s.id + '@' + k)));
    out.notice = H.notice.kind ?? null; out.grounded = H.notice.visible;
    out.logs = Object.fromEntries(people(room).map((q) => [q.def.id, q.log.filter((l) => / at |seated|chat over/.test(l)).length]));
    return out;
  }, [room, key, extra]);
  iso(`${room}, ${label}: chapter set by its flags; the hero put on the deck before its door and walked in (INPUT: ${r.enter})`);
  check(`${room}, ${label}: the right people are there (${want.join(', ') || 'nobody'})`, r.room === room && JSON.stringify([...r.here].sort()) === JSON.stringify([...want].sort()), r);
  check(`${room}, ${label}: each on the hall's floor or the counter's platform, off the walls and the furniture, facing sensibly; nobody (and no stop) on the counter's or the board's spot, the door or the gate`, r.bad.length === 0 && r.clear.length === 0 && r.stopsClear.length === 0, { bad: r.bad, clear: r.clear, stopsClear: r.stopsClear });
  check(`${room}, ${label}: the notice ${notice ? `is up and reads ${notice === 'grounded' ? 'GROUNDED' : notice === 'list' ? 'the project\'s boarding by its list' : 'the council\'s order'}` : 'is down'} (the GROUNDED one ${notice === 'grounded' ? 'up' : 'down'})`, r.notice === notice && r.grounded === (notice === 'grounded'), { kind: r.notice, grounded: r.grounded });
  for (const [id, n] of Object.entries(r.logs)) visits[id] = (visits[id] || 0) + n;
  if (want.length) {
    const talks = await ev(([ids]) => { const out = {}; for (const id of ids) { window.said.length = 0; const nm = game.npcs.find((q) => q.def.id === id)?.def.name || 'n_' + id; const q = P.talk(id); out[id] = { r: q.r, to: q.to, sp: q.speakers, ...(q.skipped ? { sk: q.skipped } : {}), said: window.said.filter((s) => s.n === nm).map((s) => s.lines.join(' ')) }; } return out; }, [r.here]);
    check(`${room}, ${label}: each answers a talk with a line of their own (INPUT)`, Object.values(talks).every((q) => q.r === 'talked' && q.said.length > 0), talks);
    console.log(`  ${room} ${label}: ` + Object.entries(talks).map(([id, q]) => `${id}: "${q.said[0]}"`).join(' · '));
    await ev(() => { for (let i = 0; i < 6; i++) game.step(0.5); });
    await shot(`${room}-${key}`);
  }
}
check('the terminals\' people keep their rounds: each visited a stop (seated, at a stop)', ['ama', 'tavi', 'bern', 'lomba', 'ressa', 'ollo', 'rollo_q', 'pell_q', 'velo', 'pask', 'zt_guard', 'zt_guard2'].every((id) => (visits[id] || 0) >= 1), visits);

// ---- Zoé's household round (chapter 2's free play: story/chapter1.js puts her on her mark at home)
await ev(() => { setChapter('project'); const G = game;
  const h = G.world.houses[0]; G.exitRoom({ x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry + Math.PI }, true, true); G.step(0.3); P.enter('house'); P.settle(); });
iso('chapter 2 (flags), the hero put before the house door (exitRoom) and walked in (INPUT); he stands by the front door');
const zoe = await ev(() => {
  const G = game, R = G.rooms.house, z = G.npcs.find((n) => n.def.id === 'zoe'), PH = G.physics, out = {};
  const mark = R.npcSpots.zoe;
  out.start = { d: +Math.hypot(z.pos.x - mark.x, z.pos.z - mark.z).toFixed(2), placed: z.placed };
  const RS = G.story.interiors.rounds; RS.measure = true; RS.stats.ms = 0; RS.stats.frames = 0;
  const cols = R.colliders.filter((c) => c.enabled && c.top > 0.05 && !c.stair);
  // (her pace over each half second: a walk, not a run; a single frame may carry a wall's push-out as she slides by it)
  const hits = [], trail = []; let moved = 0, prev = [z.pos.x, z.pos.z], maxV = 0;
  for (let i = 0; i < 600; i++) {
    G.step(0.1);
    moved += Math.hypot(z.pos.x - prev[0], z.pos.z - prev[1]); prev = [z.pos.x, z.pos.z]; trail.push(prev);
    if (trail.length > 5) { const q = trail[trail.length - 6]; maxV = Math.max(maxV, Math.hypot(prev[0] - q[0], prev[1] - q[1]) / 0.5); }
    for (const c of cols) if (PH._inside(c, z.pos.x, z.pos.z, 0.1) && c.top > z.pos.y + 0.05 && c.bottom < z.pos.y + 1.6) hits.push(`${(z.pos.x - R.center.x).toFixed(1)},${(z.pos.z - R.center.z).toFixed(1)} in ${(c.x - R.center.x).toFixed(1)},${(c.z - R.center.z).toFixed(1)} top ${c.top.toFixed(2)}`);
  }
  const S = RS.st.get('zoe');
  out.stops = S ? [...new Set(S.log.filter((l) => / at /.test(l)).map((l) => l.split(' at ')[1]))] : [];
  out.log = S?.log; out.moved = +moved.toFixed(1); out.maxV = +maxV.toFixed(2); out.hits = [...new Set(hits)].slice(0, 8);
  out.ms = +(RS.stats.ms / Math.max(1, RS.stats.frames)).toFixed(3); RS.measure = false;
  return out;
});
check('Zoé: in 60 s of free play at home she goes round at least 3 stops of her household round (sink, stove, table, window, stairs, desk)', zoe.stops.length >= 3, zoe);
check('Zoé: she never walks through a wall or the furniture, at a walk (≤ 1.6 m/s over any half second)', zoe.hits.length === 0 && zoe.maxV <= 1.6 && zoe.moved > 5, { hits: zoe.hits, maxV: zoe.maxV, moved: zoe.moved });
console.log(`MEASURE household round: ${zoe.ms} ms per driven frame (Zoé and Arthur)`);
console.log(`  Zoé in 60 s: stops ${zoe.stops.join(' → ')}; walked ${zoe.moved} m, fastest half second ${zoe.maxV} m/s, ${zoe.hits.length} collider overlaps`);
// a talk while she walks: she stops and turns to Twinsen
const talkZ = await ev(() => {
  const G = game, z = G.npcs.find((n) => n.def.id === 'zoe'), S = G.story.interiors.rounds.st.get('zoe'), h = G.hero;
  for (let i = 0; i < 400 && S.st !== 'walk'; i++) G.step(0.1);
  const walking = S.st === 'walk';
  // (he walks up to her and presses E once the prompt is hers, as P.talk does; she may have reached a stop meanwhile)
  let tg = null, walkingAtE = false;
  for (let k = 0; k < 8 && !(tg?.kind === 'npc' && tg.id === 'zoe'); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.2, maxT: 8 }); P.face(z.pos.x, z.pos.z); tg = P.target(); }
  walkingAtE = S.st === 'walk';
  P.tap('KeyE', 0.1);
  const out = { walking, walkingAtE, target: tg?.kind + ':' + tg?.id, state: G.state };
  const p0 = [z.pos.x, z.pos.z]; for (let i = 0; i < 30; i++) G.step(0.05);
  const dA = Math.abs(Math.atan2(Math.sin(z.angleTo(h) - z.angle), Math.cos(z.angleTo(h) - z.angle)));
  out.inDialog = G.state === 'dialog'; out.drift = +Math.hypot(z.pos.x - p0[0], z.pos.z - p0[1]).toFixed(3); out.facing = +dA.toFixed(2); out.anim = z.rig.anim;
  P.settle();
  const p1 = [z.pos.x, z.pos.z]; for (let i = 0; i < 100; i++) G.step(0.1);
  out.after = +Math.hypot(z.pos.x - p1[0], z.pos.z - p1[1]).toFixed(2) + ' m in 10 s, ' + S.st;
  return out; });
check('Zoé: a talk stops her where she is and she turns to Twinsen; afterwards she goes on with her round', talkZ.inDialog && talkZ.drift < 0.05 && talkZ.facing < 0.35, talkZ);
// a scene's place for her wins at once; back home she is on her mark
const scene = await ev(() => {
  const G = game, f = G.flags, z = G.npcs.find((n) => n.def.id === 'zoe'), R = G.rooms.house, mark = R.npcSpots.zoe, W = G.world, out = {};
  for (let i = 0; i < 200 && Math.hypot(z.pos.x - mark.x, z.pos.z - mark.z) < 1.0; i++) G.step(0.2);
  out.awayFromMark = +Math.hypot(z.pos.x - mark.x, z.pos.z - mark.z).toFixed(2);
  f.c1_needZoe = true; G.story.refreshCast(); G.step(0.1);
  out.atGate = +Math.hypot(z.pos.x - (W.gate.x - 1.5), z.pos.z - (W.gate.z + 1.5)).toFixed(2);
  f.c1_needZoe = false; G.story.refreshCast(); G.step(0.1);
  out.onMark = +Math.hypot(z.pos.x - mark.x, z.pos.z - mark.z).toFixed(3);
  // the cut-scene state: the round stands still
  const p0 = [z.pos.x, z.pos.z]; G.setState('cutscene'); for (let i = 0; i < 20; i++) G.step(0.1); out.cutDrift = +Math.hypot(z.pos.x - p0[0], z.pos.z - p0[1]).toFixed(3); G.setState('play');
  // a load (applyFlags, as Continue does) leaves her where the story says, and the round goes on
  G.story.applyFlags(); for (let i = 0; i < 100; i++) G.step(0.1); out.afterLoad = G.story.interiors.rounds.st.get('zoe')?.st;
  return out; });
check('Zoé: a scene that needs her elsewhere (chapter 2\'s "meet Zoé" at the gate) puts her there at once; back to the free play she is on her mark; a cut-scene freezes her round; after a load it goes on', scene.awayFromMark > 1 && scene.atGate < 0.2 && scene.onMark < 0.01 && scene.cutDrift < 0.01 && !!scene.afterLoad, scene);
const arthur = await ev(() => { const S = game.story.interiors.rounds.st.get('arthur'); return { log: S?.log, stops: S ? [...new Set(S.log.filter((l) => / at /.test(l)).map((l) => l.split(' at ')[1]))] : [] }; });
check('Arthur: his own round at home (his boat, his workbench, his window)', arthur.stops.length >= 2, arthur);
await ev(() => { const G = game; for (let i = 0; i < 30; i++) G.step(0.5); });
await shot('house-zoe');

// ---- Gilbert and Mira at the Water Office (chapter 2 before the water: their marks there)
const office = await ev(() => {
  const G = game; setChapter('project', { c1_water: false });   // (before the water Gilbert is at his counter: story/chapter1.js)
  const h = G.world.houses.find((x) => x.id === 'water'); G.exitRoom({ x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry + Math.PI }, true, true); G.step(0.3);
  const e = P.enter('office').r; const R = G.rooms.office, PH = G.physics, cols = R.colliders.filter((c) => c.enabled && c.top > 0.05 && !c.stair), hits = [];
  const ppl = ['gilbert', 'mira'].map((id) => G.npcs.find((n) => n.def.id === id));
  for (let i = 0; i < 900; i++) { G.step(0.1); for (const n of ppl) for (const c of cols) if (PH._inside(c, n.pos.x, n.pos.z, 0.1) && c.top > n.pos.y + 0.05 && c.bottom < n.pos.y + 1.6) hits.push(n.def.id + ' ' + (n.pos.x - R.center.x).toFixed(1) + ',' + (n.pos.z - R.center.z).toFixed(1)); }
  const st = G.story.interiors.rounds.st, stops = (id) => [...new Set((st.get(id)?.log || []).filter((l) => / at /.test(l)).map((l) => l.split(' at ')[1]))];
  const map = R.searches.find((q) => q.id === 'pipemap'), nearMap = RL.HOUSE_ROUNDS.filter((D) => D.room === 'office').flatMap((D) => D.stops.filter((q) => !q.mark && Math.hypot(q.x + R.center.x - map.x, q.z + R.center.z - map.z) < 2.0).map((q) => D.id + ':' + q.id));
  return { enter: e, room: G.room?.id, gilbert: stops('gilbert'), mira: stops('mira'), hits: [...new Set(hits)].slice(0, 6), nearMap }; });
check('Gilbert and Mira: their rounds at the Water Office in chapter 2 (counter, pipes, the far end of the counter; desk, plant, north wall), never through the furniture, none of them by the pipe map\'s reading place', office.gilbert.length >= 2 && office.mira.length >= 2 && office.hits.length === 0 && office.nearMap.length === 0, office);
await shot('office-gilbert-mira');

await browser.close();
done();
