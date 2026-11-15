// SPACEPORT-2 (the user, 15.11: "the way in should come from inside the building, as at a real airport: you go in,
// through security, and then out to the area you fly from"). Citadel Spaceport's deck is airside: the footbridge ends at
// the terminal's landside door (src/game/spaceport.js), the hall's way runs door → ticket counter → security → gate
// (src/game/terminal.js), the gate lets him out onto the deck while a ship flies for him (story/islands.js canExit).
//   1. from the shore's sign post along the bridge, by input, he reaches the deck only through the terminal: the planner
//      finds no way, a straight run ends in the hall, runs and jumps at the bridge's end with the door shut never land
//      him on the deck;
//   2. chapter 4 by input: the door, the counter (its prompt, the menu), the security pillars, the gate, the deck, the
//      pad's prompt; and back: in by the gate, through the hall, out by the door onto the bridge, to the sign post;
//   3. arriving by ship (Zeelich → Citadel) he stands on the deck, and walks out through the terminal to the square;
//   4. the gate by chapter: shut from the hall in chapter 1 (the guard says why) while the way out by the door stays
//      open; chapter 2 with Doran's project ship it opens and the ship boards (→ chapter 3 on Zeelich); the evacuation
//      it opens; the evacuation's guard stands on the bridge, not in the terminal's walls; Corla's kiosk is on the shore
//      and sells the seat through the gate (chapter 4);
//   5. old saves (a real page reload, Continue): on the old deck where the terminal stands now, on the bridge, on the
//      deck: each loads on a floor, out of the walls, on the side it belongs to.
// ISO (logged): the chapter is set by its flags; the hero is put at the start of each walk. Automated runtime only
// (headless Chromium, SwiftShader).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const S_X0 = -14.0;   // (the terminal's west face: spaceport.js TERMINAL_BLOCK.x0)
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, c1_ship: false }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.refreshCast(); P.settle(); }, [key, extra]);
// the hero's side of the port: 'hall' (in the terminal), 'deck' (airside), 'land' (the bridge, the shore), or another room
const SIDE = `const side = () => { const G = game, S = G.world.spaceport, h = G.hero; if (G.room) return G.room.id === 'terminal' ? 'hall' : G.room.id; return S.airside(h.pos.x, h.pos.z) && Math.abs(h.pos.y - S.deck.y) < 0.35 ? 'deck' : 'land'; };`;
await ev(SIDE.replace('const side', 'window.side'));

// ---------------------------------------------------------------- 1. the bridge reaches the deck only through the terminal
await setChapter('dig');
iso('chapter 4 by its flags; he is put on the shore by the sign post, facing the bridge');
const plan = await ev(() => { const G = game, S = G.world.spaceport; G.exitRoom({ x: -33.4, z: 40.4, a: Math.PI / 2 }, true, true); P.settle();
  const toDeck = P.plan(S.landing.x, S.landing.z, { tol: 0.5 }), toDoor = P.plan(S.door.x - 1.0, S.door.z, { tol: 0.5 });
  return { deck: toDeck.ok, door: toDoor.ok }; });
check('the planner finds a way from the shore to the bridge\'s end before the door, and none from there onto the deck', plan.door && !plan.deck, plan);
const run = await ev(() => { const G = game, h = G.hero; G.exitRoom({ x: -33.4, z: 40.0, a: Math.PI / 2 }, true, true); P.settle(); if (h.behaviour !== 'athletic') P.tap('F2');
  let deck = 0, t = 0; const st = []; G.input.keys.add('ArrowUp'); while (t < 12 && !G.room) { G.step(1 / 30); t += 1 / 30; if (side() === 'deck') deck++; if (G.state !== 'play') { st.push(G.state); P.settle(); G.input.keys.add('ArrowUp'); } } G.input.keys.delete('ArrowUp'); const end = [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)]; P.settle();
  return { room: G.room?.id ?? 'citadel', deck, t: +t.toFixed(1), end, st: [...new Set(st)] }; });
check('INPUT: a straight run from the sign post along the bridge ends in the terminal\'s hall (through its door), never on the deck', run.room === 'terminal' && run.deck === 0, run);
// with the doors held shut (the triggers off), at the bridge's end: runs straight, along the wall both ways, and jumps
// over the rails toward the deck's corners north and south of the terminal
const shut = await ev(() => { const G = game, h = G.hero, S = G.world.spaceport, I = G.input; G.exitRoom({ x: -20, z: 40, a: Math.PI / 2 }, true, true); P.settle();
  const hold = (codes, s) => { for (const c of codes) I.keys.add(c); for (let t = 0; t < s; t += 1 / 30) { G.doorCool = 9; G.step(1 / 30); if (side() === 'deck') out.deck++; if (h.pos.x > out.maxX) out.maxX = h.pos.x; if (h.pos.y < S.deck.y - 1) out.fell++; } for (const c of codes) I.keys.delete(c); };
  const out = { deck: 0, maxX: -99, fell: 0, runs: 0, jumps: 0 };
  const put = (x, z, a) => { P.settle(); G.exitRoom({ x, z, a }, true, true); G.step(0.1); h.angle = a; if (h.behaviour !== 'athletic') P.tap('F2'); };
  if (h.behaviour !== 'athletic') P.tap('F2');
  for (const a of [Math.PI / 2, Math.PI / 4, 3 * Math.PI / 4, Math.PI / 2 - 0.15, Math.PI / 2 + 0.15]) { put(-18, 40, a); hold(['ArrowUp'], 4); out.runs++; }
  for (const [x, z, tx, tz] of [[-15.2, 38.5, -13.4, 33.2], [-15.2, 41.5, -13.4, 46.8], [-14.6, 38.5, -13.2, 35], [-14.6, 41.5, -13.2, 45], [-16.5, 38.6, -14.0, 33.5], [-16.5, 41.4, -14.0, 46.5]]) {
    put(x, z, Math.atan2(tx - x, tz - z)); P.face(tx, tz); I.keys.add('ArrowUp'); G.step(0.15); P.tap('Space', 0); I.keys.add('ArrowUp');
    for (let t = 0; t < 2.5; t += 1 / 30) { G.doorCool = 9; G.step(1 / 30); if (side() === 'deck') out.deck++; if (h.pos.y < S.deck.y - 1) { out.fell++; break; } }
    P.release(); out.jumps++;
  }
  P.settle(); return out; });
check('INPUT with the door held shut: 5 runs at the bridge\'s end (straight, along the wall both ways) and 6 running jumps over the rails toward the deck\'s corners never put him on the deck; he stays west of the terminal\'s face', shut.deck === 0 && shut.maxX < S_X0 + 0.0001, shut);

// ---------------------------------------------------------------- 2. chapter 4: door → counter → security → gate → deck, and back
const way = await ev(async () => { const G = game, h = G.hero, S = G.world.spaceport, out = {};
  G.exitRoom({ x: -33.4, z: 40.4, a: Math.PI / 2 }, true, true); P.settle();
  const e = P.enter('terminal'); out.enter = e.r; out.room = G.room?.id;
  const TT = (await import('/src/game/terminal.js')).TERMINAL, R = G.room, c = R.center;
  out.spawn = { dDoor: +Math.hypot(h.pos.x - TT.door.x, h.pos.z - TT.door.z).toFixed(2), a: +h.angle.toFixed(2) };
  // the counter: walk up, its prompt, E: the spaceship's menu (left without buying)
  const ready = () => P.target()?.kind === 'termCounter';
  P.go(TT.counter.x, TT.counter.z, { tol: 0.35, maxT: 40, stopWhen: ready }); P.face(TT.counter.x, TT.counter.z - 1); for (let k = 0; k < 12 && !ready(); k++) G.step(0.25);
  out.counter = ready(); out.atCounter = [+(h.pos.x - c.x).toFixed(1), +(h.pos.z - c.z).toFixed(1)];
  if (out.counter) { P.tap('KeyE', 0.1); out.menu = G.state === 'shop' ? [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent) : G.state; document.querySelector('#shop .leave')?.click(); P.settle(); }
  // on to the gate, through the security pillars (the hall's frame: the gate at the left wall's back, x −8, z −4.2)
  const track = []; const sv = G.step.bind(G); let n = 0;
  G.step = (dt) => { sv(dt); if (n++ % 3 === 0 && G.room?.id === 'terminal') track.push([+(h.pos.x - c.x).toFixed(2), +(h.pos.z - c.z).toFixed(2)]); };
  const g = P.through(TT.gate.x, TT.gate.z); G.step = sv;
  out.gate = g.r; out.after = side(); out.at = { x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(2), fromGate: +Math.hypot(h.pos.x - S.gate.x, h.pos.z - S.gate.z).toFixed(2) };
  // passed between the pillars (x ≈ −7.4 in the hall's frame, z −5.35…−3.05) and before that across the hall from the counter
  out.pillars = track.some(([x, z]) => x < -6.8 && z > -5.2 && z < -3.2);
  out.order = { counterX: out.atCounter[0], pillarsX: -7.4, doorX: +(TT.door.x - c.x).toFixed(1) };
  // to the pad: its prompt (the spaceship's menu)
  const pr = () => P.target()?.kind === 'isleShuttle';
  P.go(S.pad.x, S.pad.z, { tol: 3.8, stopWhen: pr, maxT: 60 }); P.face(S.pad.x, S.pad.z); out.pad = P.target()?.kind;
  return out; });
check('INPUT, chapter 4: from the sign post over the bridge into the terminal by its landside door, standing inside it facing into the hall', way.enter === 'entered' && way.room === 'terminal' && way.spawn.dDoor < 2.6 && Math.abs(Math.abs(way.spawn.a) - Math.PI) < 0.3, way);
check('… the ticket counter ahead of the door: its prompt, the spaceship\'s menu (Zeelich Spaceport)', way.counter && JSON.stringify(way.menu) === JSON.stringify(['Zeelich Spaceport']), way);
check('… across the hall between the security pillars, out by the gate onto the deck (airside) before the gate, facing the ship; the pad\'s prompt', way.pillars && way.after === 'deck' && way.at.fromGate < 3.0 && Math.abs(way.at.a - Math.PI / 2) < 0.4 && way.pad === 'isleShuttle', way);
const back = await ev(async () => { const G = game, h = G.hero, S = G.world.spaceport, out = {};
  const e = P.enter('terminal'); out.enter = e.r;
  const TT = (await import('/src/game/terminal.js')).TERMINAL, R = G.room;
  out.inGate = R ? +Math.hypot(h.pos.x - R.entries.gate.x, h.pos.z - R.entries.gate.z).toFixed(2) : null;
  const d = P.through(TT.door.x, TT.door.z); out.door = d.r; out.side = side(); out.at = { x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(2) };
  let deck = 0; const sv = G.step.bind(G); G.step = (dt) => { sv(dt); if (side() === 'deck') deck++; };
  const r = P.go(-33.4, 40.4, { tol: 0.8, maxT: 60 }); G.step = sv; out.home = r.r; out.deck = deck; out.end = side();
  for (let i = 0; i < 25; i++) G.step(0.1); out.stays = side();
  return out; });
check('INPUT, the way back: from the pad into the terminal by its gate (inside the gate), through the hall and out by its door onto the bridge facing the shore', back.enter === 'entered' && back.inGate != null && back.inGate < 1.5 && back.side === 'land' && back.at.x < S_X0 - 0.5 && Math.abs(back.at.a + Math.PI / 2) < 0.4, back);
check('… and along the bridge to the sign post (never on the deck), where he stays', back.home === 'arrived' && back.deck === 0 && back.stays === 'land', back);

// ---------------------------------------------------------------- 3. arriving by ship, out through the terminal to the square
const fly = (pick, which) => ev(([pick, which]) => { const G = game, p = which === 'zport' ? G.regions.built('zeelich').spaceport.pad : G.world.spaceport.pad;
  const ready = () => P.target()?.kind === 'isleShuttle';
  P.go(p.x, p.z, { tol: which === 'zport' ? 5.2 : 3.8, stopWhen: ready, maxT: 120 }); P.face(p.x, p.z); if (!ready()) return { fail: 'no prompt', at: [G.hero.pos.x, G.hero.pos.z] };
  P.tap('KeyE', 0.1); const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent); const i = items.findIndex((x) => x.startsWith(pick));
  if (i < 0) { document.querySelector('#shop .leave')?.click(); P.settle(); return { items, picked: false }; }
  P.menuPick(i); P.settle(60); return { items, picked: true, room: G.room?.id ?? 'citadel' }; }, [pick, which]);
const f1 = await ev(() => { const G = game, S = G.world.spaceport; G.exitRoom({ x: S.landing.x, z: S.landing.z, a: S.landing.a }, true, true); P.settle(); return side(); });
const f2 = await fly('Zeelich', 'main');
const f3 = await fly('Twinsun', 'zport');
const arr = await ev(() => { const G = game, h = G.hero, S = G.world.spaceport; const at = { side: side(), d: +Math.hypot(h.pos.x - S.landing.x, h.pos.z - S.landing.z).toFixed(2) };
  const e = P.enter('terminal'); const TT = G.rooms.terminal; const d = P.through(G.rooms.terminal.exits.find((x) => x.to === 'terminal-out').x, G.rooms.terminal.exits.find((x) => x.to === 'terminal-out').z); void TT;
  const v = G.world.POI.village, r = P.go(v.x, v.z, { tol: 2.0, maxT: 120 }); return { at, enter: e.r, out: d.to, home: r.r, end: side(), d: +Math.hypot(h.pos.x - v.x, h.pos.z - v.z).toFixed(1) }; });
check('arriving by ship (Citadel → Zeelich → Citadel by the pads\' menus): he stands at the landing spot on the deck (airside)', f1 === 'deck' && f2.room === 'zeelich' && f3.room === 'citadel' && arr.at.side === 'deck' && arr.at.d < 1.0, { f1, f2, f3, arr });
check('INPUT: from there out through the terminal (in by the gate, out by the door) and over the bridge to the town square', arr.enter === 'entered' && arr.out === 'citadel' && arr.home === 'arrived', arr);

// ---------------------------------------------------------------- 4. the gate by chapter, the evacuation's guard, Corla's kiosk
const gateTry = (key, extra) => ev(async ([key, extra]) => { const G = game, f = G.flags; Object.assign(f, { chapterKey: key, c1_ship: false }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.story.refreshCast(); P.settle();
  G.exitRoom({ x: -18, z: 40, a: Math.PI / 2 }, true, true); P.settle();
  const said = [], sv = G.say; G.say = function (n, lines, ...a) { said.push(n + ': ' + lines.join(' ')); return sv.call(this, n, lines, ...a); };
  const e = P.enter('terminal'); const TT = (await import('/src/game/terminal.js')).TERMINAL;
  const g = P.through(TT.gate.x, TT.gate.z); G.say = sv;
  const out = { enter: e.r, gate: g.r, side: side(), said };
  if (out.side === 'hall') { const d = P.through(TT.door.x, TT.door.z); out.outByDoor = side(); void d; }
  return out; }, [key, extra]);
const g1 = await gateTry('well', {});
check('chapter 1 (flights grounded): the gate does not let him out of the hall; the port\'s guard says why (grounded); the door takes him back out onto the bridge', g1.enter === 'entered' && g1.side === 'hall' && g1.said.some((s) => /grounded/i.test(s)) && g1.outByDoor === 'land', g1);
const g2 = await gateTry('project', { c1_water: true, c1_ship: true });
const ship = await ev(() => { const G = game, S = G.world.spaceport, out = { side: side() }; const d = P.npc('doran'); out.doran = !!d?.present && S.airside(d.pos.x, d.pos.z);
  const ready = () => P.target()?.kind === 'c1ship'; P.go(S.pad.x, S.pad.z, { tol: 4.2, stopWhen: ready, maxT: 60 }); P.face(S.pad.x, S.pad.z); out.target = P.target()?.kind;
  if (ready()) { P.tap('KeyE', 0.1); P.settle(); P.settle(); }
  out.chapter = G.flags.chapterKey; out.room = G.room?.id ?? 'citadel'; return out; });
check('chapter 2 with Doran\'s project ship: the gate lets him onto the deck, Doran waits there, the ship\'s prompt; boarding takes him to chapter 3 on Zeelich', g2.side === 'deck' && ship.doran && ship.target === 'c1ship' && ship.chapter === 'zeelich' && ship.room === 'zeelich', { g2, ship });
const g8 = await gateTry('evacuation', {});
const guard = await ev(() => { const G = game, S = G.world.spaceport, T = S.terminal; return ['guard', 'worker'].map((id) => { const n = P.npc(id); if (!n?.present) return { id, present: false }; const x = n.pos.x, z = n.pos.z; return { id, x: +x.toFixed(2), z: +z.toFixed(2), inWalls: x > T.x0 - 0.4 && x < T.x1 + 0.4 && z > T.z0 - 0.4 && z < T.z1 + 0.4, onBridge: x < T.x0 && Math.abs(z - S.bridge.z) < S.bridge.hw }; }); });
check('the evacuation: the gate lets him onto the deck (the project\'s ships board by their list); its guard and the project worker stand on the bridge, not in the terminal\'s walls', g8.side === 'deck' && guard.every((q) => q.present === false || (!q.inWalls && q.onBridge)), { g8, guard });
await setChapter('dig');
const corla = await ev(() => { const G = game, S = G.world.spaceport, n = P.npc('cs_corla'), out = { present: !!n?.present };
  if (n) { out.at = [+n.pos.x.toFixed(2), +n.pos.z.toFixed(2)]; out.landside = !S.airside(n.pos.x, n.pos.z) && n.pos.x < S.bridge.x0; }
  G.exitRoom({ x: -33.4, z: 40.4, a: 0 }, true, true); P.settle();
  const sv = G.openMenu; let items = null; G.openMenu = function (title, list, cb) { items = list.map((x) => x.key); G.openMenu = sv; return sv.call(this, title, list, cb); };
  const t = P.talk('cs_corla'); G.openMenu = sv; out.talk = t.r; out.items = items;
  if (G.state === 'shop') { const i = [...document.querySelectorAll('#shop .item')].findIndex((b) => /Zeelich/.test(b.textContent)); if (i >= 0) { P.menuPick(i); P.settle(60); } }
  out.room = G.room?.id ?? 'citadel'; return out; });
check('Corla\'s TICKETS · INFO kiosk stands on the shore (landside); in chapter 4 she sells the seat and he flies to Zeelich (through the gate under the black)', corla.present && corla.landside && corla.talk === 'talked' && corla.items?.length === 1 && corla.room === 'zeelich', corla);

// ---------------------------------------------------------------- 5. old saves on the deck and the bridge
const loadAt = async (key, x, z) => {
  await ev(([key, x, z]) => { const G = game, f = G.flags; Object.assign(f, { chapterKey: key, c1_ship: false }); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.story.refreshCast(); P.settle();
    G.exitRoom({ x: -20, z: 40, a: 0 }, true, true); P.settle(); const s = G.stamp(G.snapshot()); s.room = null; s.hero.x = x; s.hero.z = z; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); }, [key, x, z]);
  await open(page, '?nocine'); await menu(page, 'continue');   // (open() navigates afresh: the page reloaded)
  await ev(SIDE.replace('const side', 'window.side'));
  return ev(() => { const G = game, h = G.hero, S = G.world.spaceport, T = S.terminal; for (let i = 0; i < 30; i++) { G.step(0.1); if (G.state !== 'play') P.settle(); }
    const x = h.pos.x, z = h.pos.z, floorY = S.deck.y;
    return { state: G.state, room: G.room?.id ?? 'citadel', x: +x.toFixed(2), z: +z.toFixed(2), y: +h.pos.y.toFixed(2), onFloor: Math.abs(h.pos.y - floorY) < 0.35, inWalls: x > T.x0 - 0.3 && x < T.x1 + 0.3 && z > T.z0 - 0.3 && z < T.z1 + 0.3, side: side(), chapter: G.flags.chapterKey }; });
};
const SAVES = [
  ['dig', -12.0, 40.0, 'land', 'the old deck at the bridge\'s end (the terminal\'s west half now)'],
  ['dig', -10.4, 44.0, 'deck', 'the old kiosk (the terminal\'s middle: just east of it)'],
  ['dig', -8.0, 36.5, 'deck', 'the old board\'s side (the terminal\'s east half)'],
  ['well', -9.8, 35.0, 'deck', 'the old benches (the terminal\'s east half), chapter 1'],
  ['dig', -22.0, 40.0, 'land', 'the bridge'],
  ['dig', -1.7, 39.5, 'deck', 'the deck at the landing spot'],
  ['dig', -2.5, 32.6, 'deck', 'the deck before the old terminal\'s door'],
];
for (const [key, x, z, want, label] of SAVES) {
  const r = await loadAt(key, x, z);
  check(`old save on ${label} (${x}, ${z}, ${key}) → Continue: in play, on the floor, out of the terminal's walls, on the ${want === 'land' ? 'bridge (landside)' : 'deck (airside)'}`, r.state === 'play' && r.room === 'citadel' && r.onFloor && !r.inWalls && r.side === want && r.chapter === key, r);
}

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
