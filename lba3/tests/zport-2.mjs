// P83 item 10 (the user, 20.11: "Zeelich Spaceport gets Citadel's layout", SPACEPORT-2's way in through the terminal).
// Zeelich Spaceport's deck is airside: the footbridge from the shore ends at the terminal's landside door
// (src/game/zterminal.js ZPORT_TERMINAL, travel.js ZPORT), the hall's way runs door → ticket counter → security → gate,
// the gate lets him out onto the deck before the pad; the same way back.
//   1. from the shore at the bridge's foot, by input, he reaches the deck only through the terminal: the planner finds no
//      way, a straight run ends in the hall, runs and jumps at the bridge's end with the door held shut never land him on
//      the deck;
//   2. chapter 4 by input: the door, the counter (its prompt, the spaceship's menu), the security pillars, the gate, the
//      deck, the pad's prompt; and back: in by the gate, through the hall, out by the door onto the bridge, to the street;
//   3. arriving by ship (Zeelich → Citadel → Zeelich by the pads' menus) he stands at the landing spot on the deck before
//      the gate, and walks out through the terminal to the street;
//   4. chapter 3's arrival (the project's ship, chapter 2's people at the landing): Doran and the guard who meets the ship
//      stand on the deck, out of the terminal's walls; the deck's people's stops are out of its walls;
//   5. old saves (a real page reload, Continue) on the old deck where the terminal stands now, on the old bridge's end,
//      on the bridge, on the deck: each loads on a floor, out of the walls, on the side it belongs to.
// ISO (logged): the chapter is set by its flags; the hero is put at the start of each walk. Automated runtime only
// (headless Chromium, SwiftShader).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const O = 2400;   // (Zeelich's origin: zeelich.js ZEELICH; the port's numbers below are ZPORT's, local)
const NORTH = 31;   // (the terminal's north face: ZPORT_TERMINAL.z0)
await open(page, '?nocine'); await menu(page, 'new');
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, c1_ship: false }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.regions.ensure('zeelich', 'test'); G.story.refreshCast(); P.settle(); }, [key, extra]);
// the hero's side of the port: 'hall' (in the terminal), 'deck' (airside), 'land' (the bridge, the island), or another room
const SIDE = `const side = () => { const G = game, h = G.hero; if (G.room?.id === 'zterminal') return 'hall'; if (G.room?.id !== 'zeelich') return G.room?.id ?? 'citadel'; const S = G.room.spaceport; return S.airside(h.pos.x, h.pos.z) && Math.abs(h.pos.y - S.deck.y) < 0.35 ? 'deck' : 'land'; };
  const zput = (x, z, a) => { const G = game; P.settle(); G.enterRoom('zeelich', { x: 2400 + x, z, a }, true); P.settle(); G.step(0.1); G.hero.angle = a; };`;
const helpers = () => ev(SIDE.replace('const side', 'window.side').replace('const zput', 'window.zput'));
await helpers();

// ---------------------------------------------------------------- 1. the bridge reaches the deck only through the terminal
await setChapter('dig');
iso('chapter 4 by its flags; he is put on the shore at the bridge\'s foot, facing the bridge');
const plan = await ev(() => { const G = game; zput(-4, 24.0, 0); const S = G.room.spaceport;
  const toDeck = P.plan(S.landing.x, S.landing.z, { tol: 0.5 }), toDoor = P.plan(S.door.x, S.door.z - 1.0, { tol: 0.5 });
  return { deck: toDeck.ok, door: toDoor.ok, room: G.room?.id }; });
check('the planner finds a way from the shore to the bridge\'s end before the terminal\'s door, and none from there onto the deck', plan.room === 'zeelich' && plan.door && !plan.deck, plan);
const run = await ev(() => { const G = game, h = G.hero; zput(-4, 24.0, 0); if (h.behaviour !== 'athletic') P.tap('F2');
  let deck = 0, t = 0; const st = []; G.input.keys.add('ArrowUp'); while (t < 12 && G.room?.id === 'zeelich') { G.step(1 / 30); t += 1 / 30; if (side() === 'deck') deck++; if (G.state !== 'play') { st.push(G.state); P.settle(); G.input.keys.add('ArrowUp'); } } G.input.keys.delete('ArrowUp'); const end = [+(h.pos.x - 2400).toFixed(2), +h.pos.z.toFixed(2)]; P.settle();
  return { room: G.room?.id, deck, t: +t.toFixed(1), end, st: [...new Set(st)] }; });
check('INPUT: a straight run from the shore along the bridge ends in the terminal\'s hall (through its door), never on the deck', run.room === 'zterminal' && run.deck === 0, run);
const shut = await ev(() => { const G = game, h = G.hero, I = G.input;
  const out = { deck: 0, maxZ: -99, fell: 0, runs: 0, jumps: 0 };
  const hold = (codes, s) => { for (const c of codes) I.keys.add(c); for (let t = 0; t < s; t += 1 / 30) { G.doorCool = 9; G.step(1 / 30); if (G.room?.id !== 'zeelich') break; if (side() === 'deck') out.deck++; if (h.pos.z > out.maxZ) out.maxZ = h.pos.z; if (h.pos.y < 5) out.fell++; } for (const c of codes) I.keys.delete(c); };
  const put = (x, z, a) => { zput(x, z, a); if (h.behaviour !== 'athletic') P.tap('F2'); };
  for (const a of [0, Math.PI / 4, -Math.PI / 4, 0.15, -0.15]) { put(-4, 28.0, a); hold(['ArrowUp'], 4); out.runs++; }
  for (const [x, z, tx, tz] of [[-5.2, 29.8, -11, 33.5], [-2.8, 29.8, 3, 33.5], [-5.4, 30.4, -10.5, 32.6], [-2.6, 30.4, 2.5, 32.6], [-5.0, 28.6, -12, 34], [-3.0, 28.6, 4, 34]]) {
    put(x, z, Math.atan2(tx - x - 2400 + 2400, tz - z)); P.face(2400 + tx, tz); I.keys.add('ArrowUp'); G.step(0.15); P.tap('Space', 0); I.keys.add('ArrowUp');
    for (let t = 0; t < 2.5; t += 1 / 30) { G.doorCool = 9; G.step(1 / 30); if (G.room?.id !== 'zeelich') break; if (side() === 'deck') out.deck++; if (h.pos.y < 5) { out.fell++; break; } }
    P.release(); out.jumps++;
  }
  P.settle(); return out; });
check('INPUT with the door held shut: 5 runs at the bridge\'s end (straight and slanting) and 6 running jumps over the rails toward the deck\'s corners never put him on the deck; he stays north of the terminal\'s face', shut.deck === 0 && shut.maxZ < NORTH + 0.0001, shut);

// ---------------------------------------------------------------- 2. chapter 4: door → counter → security → gate → deck, and back
const way = await ev(async () => { const G = game, h = G.hero, out = {};
  zput(-4, 24.0, 0); const S = G.room.spaceport;
  const e = P.enter('zterminal'); out.enter = e.r; out.room = G.room?.id;
  const TT = (await import('/src/game/zterminal.js')).ZTERMINAL, R = G.room, c = R.center;
  out.spawn = { dDoor: +Math.hypot(h.pos.x - TT.door.x, h.pos.z - TT.door.z).toFixed(2), a: +h.angle.toFixed(2) };
  const ready = () => P.target()?.kind === 'termCounter';
  P.go(TT.counter.x, TT.counter.z, { tol: 0.35, maxT: 40, stopWhen: ready }); P.face(TT.counter.x, TT.counter.z - 1); for (let k = 0; k < 12 && !ready(); k++) G.step(0.25);
  out.counter = ready(); out.atCounter = [+(h.pos.x - c.x).toFixed(1), +(h.pos.z - c.z).toFixed(1)];
  if (out.counter) { P.tap('KeyE', 0.1); out.menu = G.state === 'shop' ? [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent) : G.state; document.querySelector('#shop .leave')?.click(); P.settle(); }
  const track = []; const sv = G.step.bind(G); let n = 0;
  G.step = (dt) => { sv(dt); if (n++ % 3 === 0 && G.room?.id === 'zterminal') track.push([+(h.pos.x - c.x).toFixed(2), +(h.pos.z - c.z).toFixed(2)]); };
  const g = P.through(TT.gate.x, TT.gate.z); G.step = sv;
  out.gate = g.r; out.after = side(); out.at = { x: +(h.pos.x - 2400).toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(2), fromGate: +Math.hypot(h.pos.x - S.gate.x, h.pos.z - S.gate.z).toFixed(2) };
  // (between the pillars: the hall's frame, the gate in the back wall at x −7.3, the pillars' line z −5.4)
  out.pillars = track.some(([x, z]) => Math.abs(x + 7.3) < 1.0 && z < -4.9);
  const pr = () => P.target()?.kind === 'isleShuttle';
  P.go(S.pad.x, S.pad.z, { tol: 5.2, stopWhen: pr, maxT: 60 }); P.face(S.pad.x, S.pad.z); out.pad = P.target()?.kind;
  return out; });
check('INPUT, chapter 4: from the shore over the bridge into the terminal by its landside door, standing inside it facing into the hall', way.enter === 'entered' && way.room === 'zterminal' && way.spawn.dDoor < 2.6 && Math.abs(Math.abs(way.spawn.a) - Math.PI) < 0.3, way);
check('… the ticket counter: its prompt, the spaceship\'s menu', way.counter && Array.isArray(way.menu) && way.menu.length >= 1, way);
check('… down the hall between the security pillars, out by the gate onto the deck (airside) before the gate, facing the ship; the pad\'s prompt', way.pillars && way.after === 'deck' && way.at.fromGate < 3.0 && Math.abs(way.at.a) < 0.4 && way.pad === 'isleShuttle', way);
const back = await ev(async () => { const G = game, h = G.hero, out = {};
  const e = P.enter('zterminal'); out.enter = e.r;
  const TT = (await import('/src/game/zterminal.js')).ZTERMINAL, R = G.room;
  out.inGate = R?.entries ? +Math.hypot(h.pos.x - R.entries.gate.x, h.pos.z - R.entries.gate.z).toFixed(2) : null;
  const d = P.through(TT.door.x, TT.door.z); out.door = d.r; out.side = side(); out.at = { x: +(h.pos.x - 2400).toFixed(2), z: +h.pos.z.toFixed(2), a: +h.angle.toFixed(2) };
  let deck = 0; const sv = G.step.bind(G); G.step = (dt) => { sv(dt); if (side() === 'deck') deck++; };
  const st = { x: 2400 - 24, z: 4 };   // (the street's east end: zeelich.js R.street is (−24, 0), on a step)
  const r = P.go(st.x, st.z, { tol: 1.5, maxT: 90 }); G.step = sv; out.home = r.r; out.deck = deck; out.end = side();
  return out; });
check('INPUT, the way back: from the pad into the terminal by its gate (inside the gate), through the hall and out by its door onto the bridge facing the shore', back.enter === 'entered' && back.inGate != null && back.inGate < 1.5 && back.side === 'land' && back.at.z < NORTH - 0.5 && Math.abs(Math.abs(back.at.a) - Math.PI) < 0.4, back);
check('… and over the bridge into the street (never on the deck)', back.home === 'arrived' && back.deck === 0 && back.end === 'land', back);

// ---------------------------------------------------------------- 3. arriving by ship, out through the terminal
const fly = (pick, which) => ev(([pick, which]) => { const G = game, p = which === 'zport' ? G.regions.built('zeelich').spaceport.pad : G.world.spaceport.pad;
  const ready = () => P.target()?.kind === 'isleShuttle';
  P.go(p.x, p.z, { tol: which === 'zport' ? 5.2 : 3.8, stopWhen: ready, maxT: 120 }); P.face(p.x, p.z); if (!ready()) return { fail: 'no prompt', at: [G.hero.pos.x, G.hero.pos.z], room: G.room?.id };
  P.tap('KeyE', 0.1); const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent); const i = items.findIndex((x) => x.startsWith(pick));
  if (i < 0) { document.querySelector('#shop .leave')?.click(); P.settle(); return { items, picked: false }; }
  P.menuPick(i); P.settle(60); return { items, picked: true, room: G.room?.id ?? 'citadel' }; }, [pick, which]);
const f0 = await ev(() => { zput(-4, 39.0, 0); return side(); });
const f1 = await fly('Twinsun', 'zport');
const f2 = await fly('Zeelich', 'main');
const arr = await ev(() => { const G = game, h = G.hero, S = G.room?.spaceport; if (!S) return { room: G.room?.id };
  const at = { side: side(), d: +Math.hypot(h.pos.x - S.landing.x, h.pos.z - S.landing.z).toFixed(2), a: +h.angle.toFixed(2), toGate: +Math.hypot(h.pos.x - S.gate.x, h.pos.z - S.gate.z).toFixed(2) };
  const st = { x: 2400 - 24, z: 4 }; let deck = 0; const sv = G.step.bind(G); G.step = (dt) => { sv(dt); if (side() === 'deck') deck++; };
  const r = P.go(st.x, st.z, { tol: 1.5, maxT: 120 }); G.step = sv; return { at, home: r.r, end: side(), deck }; });
check('arriving by ship (Zeelich → Citadel → Zeelich by the pads\' menus): he stands at the landing spot on the deck (airside), before the gate and facing it', f0 === 'deck' && f1.room === 'citadel' && f2.room === 'zeelich' && arr.at?.side === 'deck' && arr.at.d < 1.0 && arr.at.toGate < 2.5 && Math.abs(Math.abs(arr.at.a) - Math.PI) < 0.4, { f0, f1, f2, arr });
check('INPUT: from there through the terminal (in by the gate, out by the door) and over the bridge to the street', arr.home === 'arrived' && arr.end === 'land', arr);

// ---------------------------------------------------------------- 4. chapter 3's arrival; the deck's people
iso('chapter 3 by its flags (the project\'s ship has landed, the plan not yet taken): Twinsen at the landing');
await setChapter('zeelich', { c1_plan: true, c1_ship: true });
const c3 = await ev(() => { const G = game, S = G.regions.built('zeelich').spaceport, T = S.terminal; G.enterRoom('zeelich', { ...S.landing }, true); G.story.refreshCast(); P.settle(); G.step(0.5); P.settle();
  const inWalls = (x, z) => x > T.x0 - 0.4 && x < T.x1 + 0.4 && z > T.z0 - 0.4 && z < T.z1 + 0.4;
  const who = ['doran', 'guard'].map((id) => { const n = P.npc(id); if (!n?.present) return { id, present: false }; return { id, present: true, x: +(n.pos.x - 2400).toFixed(2), z: +n.pos.z.toFixed(2), inWalls: inWalls(n.pos.x, n.pos.z), deck: S.airside(n.pos.x, n.pos.z) }; });
  const port = ['ennu', 'oshra'].map((id) => { const n = P.npc(id); const R = n?.round || n?.def?.round || []; return { id, stops: R.filter((s) => inWalls(s.x, s.z)).map((s) => s.id || [s.x, s.z]) }; });
  return { side: side(), who, port }; });
check('chapter 3\'s arrival: Twinsen at the landing on the deck; Doran and the guard who meets the ship stand on the deck, out of the terminal\'s walls; no stop of the deck\'s people is inside them', c3.side === 'deck' && c3.who.every((q) => q.present === false || (q.deck && !q.inWalls)) && c3.who.some((q) => q.present) && c3.port.every((q) => q.stops.length === 0), c3);

// ---------------------------------------------------------------- 5. old saves on the deck and the bridge
const loadAt = async (key, x, z) => {
  await ev(([key, x, z]) => { const G = game, f = G.flags; Object.assign(f, { chapterKey: key, c1_ship: false }); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.story.refreshCast(); P.settle();
    zput(-4, 39, 0); const s = G.stamp(G.snapshot()); s.room = 'zeelich'; s.hero.x = 2400 + x; s.hero.z = z; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); }, [key, x, z]);
  await open(page, '?nocine'); await menu(page, 'continue');   // (open() navigates afresh: the page reloaded)
  await helpers();
  return ev(() => { const G = game, h = G.hero; for (let i = 0; i < 30; i++) { G.step(0.1); if (G.state !== 'play') P.settle(); }
    const S = G.room?.spaceport; if (!S) return { state: G.state, room: G.room?.id };
    const T = S.terminal, x = h.pos.x, z = h.pos.z;
    return { state: G.state, room: G.room?.id, x: +(x - 2400).toFixed(2), z: +z.toFixed(2), y: +h.pos.y.toFixed(2), onFloor: Math.abs(h.pos.y - S.deck.y) < 0.35, inWalls: x > T.x0 - 0.3 && x < T.x1 + 0.3 && z > T.z0 - 0.3 && z < T.z1 + 0.3, side: side(), chapter: G.flags.chapterKey }; });
};
const SAVES = [
  ['dig', -4.0, 33.5, 'deck', 'the old deck at the bridge\'s end (the terminal\'s south half now)'],
  ['dig', -0.6, 35.2, 'deck', 'the old board\'s place (inside the terminal now)'],
  ['dig', -8.0, 34.5, 'deck', 'the old deck west of the bridge\'s end (inside the terminal now)'],
  ['dig', -4.0, 31.6, 'land', 'the old bridge\'s last metre (the terminal\'s north half now)'],
  ['zeelich', -4.0, 33.8, 'deck', 'the old deck at the bridge\'s end, chapter 3'],
  ['dig', -4.0, 28.0, 'land', 'the bridge'],
  ['dig', -4.0, 37.6, 'deck', 'the deck at the landing spot'],
  ['dig', 0.0, 37.3, 'deck', 'the deck before the old pavilion\'s door'],
];
for (const [key, x, z, want, label] of SAVES) {
  const r = await loadAt(key, x, z);
  check(`old save on ${label} (${x}, ${z}, ${key}) → Continue: in play, on the floor, out of the terminal's walls, on the ${want === 'land' ? 'bridge (landside)' : 'deck (airside)'}`, r.state === 'play' && r.room === 'zeelich' && r.onFloor && !r.inWalls && r.side === want && r.chapter === key, r);
}

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
