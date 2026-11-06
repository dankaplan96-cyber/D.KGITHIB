// Citadel Spaceport (src/game/spaceport.js) and its flights (src/game/story/islands.js): from the town he walks
// over the footbridge onto the platform (INPUT); before chapter 4 the shuttle is grounded (a note, no menu); from
// chapter 4 it flies to Zeelich Spaceport only (CONNECT: Zeelich is another planet) and back from there; the
// platform's edges hold (no walking off into the bay); the departures board reads. ISO (logged): the chapter is set
// by its flags; he starts outdoors in the town.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const setChapter = (key) => ev((key) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.refreshCast(); }, key);

// chapter 2 (the Joint Project): walk from the town square to the shuttle (INPUT)
await setChapter('project');
const walk = await ev(() => {
  const G = game, h = G.hero, S = G.world.spaceport; G.exitRoom({ x: G.world.POI.village.x, z: G.world.POI.village.z, a: 0 }, true); P.settle();
  const ready = () => P.target()?.kind === 'portGrounded' || P.target()?.kind === 'isleShuttle';
  const r = P.go(S.pad.x, S.pad.z, { tol: 3.8, run: true, maxT: 180, stopWhen: ready }); P.face(S.pad.x, S.pad.z);
  return { r: r.r, onDeck: h.pos.x > S.deck.x0 && Math.abs(h.pos.y - S.deck.y) < 0.2, y: +h.pos.y.toFixed(2), target: P.target()?.kind, trace: P.trace.slice(-4) };
});
check('from the town square he walks over the bridge onto the spaceport platform to the shuttle', walk.onDeck && walk.target === 'portGrounded', walk);
const grounded = await ev(() => { const said = []; const sv = game.say; game.say = function (n, lines, ...a) { said.push(...lines); return sv.call(this, n, lines, ...a); };
  P.tap('KeyE', 0.1); game.say = sv; const st = game.state, txt = said.join(' '); P.settle(); return { st, grounded: /grounded/i.test(txt), menu: !document.querySelector('#shop')?.classList.contains('hidden') && document.querySelectorAll('#shop .item').length > 0 && st === 'shop' }; });
check('before chapter 4: E at the shuttle reads the grounded notice, no flight menu', grounded.grounded && !grounded.menu, grounded);
const board = await ev(() => { const B = game.world.spaceport.board; const r = P.use(B.x + 0.9, B.z, { near: 0.9 }); return { r: r.r, lines: r.lines, kind: r.target?.kind }; });
check('the departures board reads', board.kind === 'sign' && board.lines >= 1, board);

// the platform holds: run at its edges in 8 directions (INPUT), never into the bay
const edges = await ev(() => { const G = game, h = G.hero, S = G.world.spaceport; let low = 1e9, offDeck = 0;
  for (let k = 0; k < 8; k++) { h.pos.set(0, S.deck.y, 40); h.vy = 0; h.angle = k * Math.PI / 4; if (h.behaviour !== 'athletic') P.tap('F2');
    for (let s = 0; s < 8 * 30; s++) { P.holdFor(['ArrowUp'], 1 / 30); if (h.pos.x > S.deck.x0 + 0.5) low = Math.min(low, h.pos.y); if (h.pos.x > S.deck.x0 + 0.1 && (h.pos.x > S.deck.x1 || h.pos.z < S.deck.z0 || h.pos.z > S.deck.z1)) offDeck++; if (G.state !== 'play') P.settle(); } }
  return { low: +low.toFixed(2), offDeck, deckY: S.deck.y }; });
check('the platform\'s railings hold: running at every edge he stays on the deck', edges.low > edges.deckY - 0.2 && edges.offDeck === 0, edges);

// chapter 4: fly to Zeelich, then back (INPUT)
await setChapter('dig');
const fly = (pick, which = 'main') => ev(([pick, which]) => {
  const G = game, h = G.hero, p = which === 'zport' ? G.rooms.zeelich.spaceport.pad : G.story.isles.pad();
  const ready = () => P.target()?.kind === 'isleShuttle';
  const r = P.go(p.x, p.z, { tol: which === 'zport' ? 5.2 : 3.8, stopWhen: ready, maxT: 120 }); P.face(p.x, p.z);
  if (!ready()) return { fail: 'no prompt', r };
  P.tap('KeyE', 0.1);
  const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent + (b.disabled ? '*' : ''));
  const i = items.findIndex((t) => t.startsWith(pick));
  if (i < 0) { document.querySelector('#shop .leave')?.click(); P.settle(); return { items, room: G.room?.id ?? 'citadel', state: G.state, picked: false }; }
  P.menuPick(i);
  return { items, room: G.room?.id ?? 'citadel', state: G.state, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
}, [pick, which]);
await ev(() => { const S = game.world.spaceport; game.hero.pos.set(S.landing.x, S.deck.y, S.landing.z); P.settle(); });
const f1 = await fly('Zeelich');
check('chapter 4: the spaceport\'s menu lists only Zeelich Spaceport (Zeelich is another planet: no islands); it lands him on Zeelich\'s spaceport deck', JSON.stringify(f1.items) === JSON.stringify(['Zeelich Spaceport']) && f1.room === 'zeelich' && f1.state === 'play', f1);
const f2 = await fly('Twinsun', 'zport');
const at = await ev(() => { const S = game.world.spaceport, h = game.hero; return { d: +Math.hypot(h.pos.x - S.pad.x, h.pos.z - S.pad.z).toFixed(2), y: +h.pos.y.toFixed(2), deck: S.deck.y, room: game.room?.id ?? 'citadel' }; });
check('Zeelich Spaceport\'s spaceship (its menu: Citadel only) flies back to Citadel Spaceport: beside the pad, on the deck, in play', JSON.stringify(f2.items) === JSON.stringify(['Twinsun: Citadel Spaceport']) && f2.room === 'citadel' && f2.state === 'play' && at.d < 8 && Math.abs(at.y - at.deck) < 0.2, { f2, at });
const f3 = await fly('Otringal');
check('no Zeelich island from Citadel: Otringal is not on the spaceport\'s menu', f3.picked === false && f3.room === 'citadel', f3);

// ---- SPACEPORT-1: the terminals (terminal.js, zterminal.js). He walks in by their doors (INPUT); while passenger
// flights are grounded the counter's clerk says so and the GROUNDED notice is up; from chapter 4 the counter sells the
// same spaceship as the pad (its menu, the same places), and he boards through the gate; the gate leads out onto the
// deck by the pad; the departures boards read.
const T = await ev(async () => { const a = await import('/src/game/terminal.js'), b = await import('/src/game/zterminal.js'); window.TT = { terminal: a.TERMINAL, zterminal: b.ZTERMINAL }; return true; });
void T;
const toDoor = (room) => ev((room) => { const G = game;
  if (room === 'terminal') G.exitRoom({ x: -2.5, z: 35.5, a: Math.PI }, true);
  else { G.regions.ensure('zeelich', 'test'); G.step(0.3); const S = G.regions.built('zeelich').spaceport; G.enterRoom('zeelich', S.landing, true); }
  P.settle(); const e = P.enter(room); P.settle(); return { r: e.r, room: G.room?.id ?? 'citadel' }; }, room);
// at the counter (INPUT): walk up, E; what is said, or the menu's items (the menu then picks `pick`, or is left)
const counter = (room, pick) => ev(([room, pick]) => {
  const G = game, H = TT[room], said = [], sv = G.say;
  G.say = function (n, lines, ...a) { said.push(n + ': ' + lines.join(' ')); return sv.call(this, n, lines, ...a); };
  const ready = () => P.target()?.kind === 'termCounter';
  const r = P.go(H.counter.x, H.counter.z, { tol: 0.35, maxT: 40 }); P.face(H.counter.x, H.counter.z - 1);   // (up to the counter, facing the clerk's side)
  for (let k = 0; k < 12 && !ready(); k++) G.step(0.25);
  if (!ready()) { G.say = sv; return { fail: 'no counter prompt', r: r.r, target: P.target() }; }
  P.tap('KeyE', 0.1);
  const st = G.state, items = st === 'shop' ? [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent) : [];
  if (st !== 'shop') { P.settle(); G.say = sv; return { st, said, items, notice: H.notice.visible, room: G.room?.id }; }
  G.say = sv;
  const i = pick ? items.findIndex((x) => x.startsWith(pick)) : -1;
  if (i < 0) { document.querySelector('#shop .leave')?.click(); P.settle(); return { st, items, picked: false, notice: H.notice.visible }; }
  const notice = H.notice.visible;
  P.menuPick(i); P.settle(60);
  const h = G.hero; return { st, items, picked: true, notice, room: G.room?.id ?? 'citadel', state: G.state, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
}, [room, pick]);
const near = (room) => ev((room) => { const G = game, h = G.hero, l = room === 'citadel' ? G.world.spaceport.landing : G.regions.built('zeelich').spaceport.landing; return { room: G.room?.id ?? 'citadel', d: +Math.hypot(h.pos.x - l.x, h.pos.z - l.z).toFixed(2), state: G.state }; }, room);

await setChapter('project');
const in1 = await toDoor('terminal');
check('SPACEPORT-1: from the deck he walks into Citadel Spaceport\'s terminal by its blue door (INPUT)', in1.room === 'terminal', in1);
const c1 = await counter('terminal');
check('chapter 2 (grounded): at the terminal\'s ticket counter Ama says the flights are grounded; no menu; the GROUNDED notice is up', c1.st !== 'shop' && c1.said.some((x) => /^n_ama: .*grounded/i.test(x)) && c1.notice === true, c1);
const c1b = await (async () => { await ev(() => { game.flags.c1_ship = true; game.story.refreshCast(); }); const r = await counter('terminal'); await ev(() => { game.flags.c1_ship = false; game.story.refreshCast(); }); return r; })();
check('chapter 2, Doran waiting with the project ship: Ama points Twinsen out through the gate to him', c1b.st !== 'shop' && c1b.said.some((x) => /^n_ama: .*Doran/.test(x)), c1b);
const bd1 = await ev(() => { const H = TT.terminal; const r = P.use(H.board.x, H.board.z, { kind: 'termBoard', near: 0.8 }); return { r: r.r, lines: r.lines, kind: r.target?.kind }; });
check('the terminal\'s departures board reads', bd1.kind === 'termBoard' && bd1.lines >= 1, bd1);
const g1 = await ev(() => { const H = TT.terminal, r = P.through(H.gate.x, H.gate.z); P.settle(); const S = game.world.spaceport, h = game.hero; return { r: r.r, room: game.room?.id ?? 'citadel', d: +Math.hypot(h.pos.x - S.landing.x, h.pos.z - S.landing.z).toFixed(2), y: +(h.pos.y - S.deck.y).toFixed(2) }; });
check('the terminal\'s gate (INPUT: walked through) leads out onto the deck by the pad', g1.room === 'citadel' && g1.d < 1.5 && Math.abs(g1.y) < 0.2, g1);

await setChapter('dig');
await toDoor('terminal');
const c2 = await counter('terminal', 'Zeelich');
check('chapter 4: the terminal\'s counter sells the spaceship (menu: Zeelich Spaceport only; the notice down) and he lands on Zeelich Spaceport\'s deck', JSON.stringify(c2.items) === JSON.stringify(['Zeelich Spaceport']) && c2.notice === false && c2.room === 'zeelich' && c2.state === 'play', c2);
const n2 = await near('zeelich');
check('… beside Zeelich\'s pad, at its landing spot', n2.d < 1.0, n2);
const in2 = await toDoor('zterminal');
check('Zeelich Spaceport\'s pavilion door leads into its terminal (INPUT)', in2.room === 'zterminal', in2);
const bd2 = await ev(() => { const H = TT.zterminal; const r = P.use(H.board.x, H.board.z, { kind: 'termBoard', near: 0.8 }); return { r: r.r, lines: r.lines, kind: r.target?.kind }; });
check('Zeelich\'s terminal board reads', bd2.kind === 'termBoard' && bd2.lines >= 1, bd2);
const c3 = await counter('zterminal', 'Twinsun');
const n3 = await near('citadel');
check('Zeelich\'s terminal counter: the spaceship to Citadel only; he lands beside Citadel\'s pad', JSON.stringify(c3.items) === JSON.stringify(['Twinsun: Citadel Spaceport']) && c3.room === 'citadel' && n3.d < 1.0 && n3.state === 'play', { c3, n3 });
// with the journey films on (as a player has them): out through the gate under the black, the film from the pad
await toDoor('terminal');
const film = await ev(() => { const G = game; G.travel.films.on = true; return G.travel.films.log.length; });
const c4 = await counter('terminal', 'Zeelich');
const fl = await ev((n0) => { const G = game; for (let i = 0; i < 400 && (G.state !== 'play' || G.trans); i++) G.step(0.1); const F = G.travel.films; F.on = false; return { log: F.log.slice(n0).map((e) => `${e.part} ${e.mode} ${e.from}>${e.to}${e.skipped ? ' skipped' : ''}`), room: G.room?.id, state: G.state }; }, film);
const n4 = await near('zeelich');
check('with the films on: from the counter he goes out through the gate, the ship\'s departure film plays from Citadel\'s pad (take-off, cabin, space) and its arrival on Zeelich; he stands at the landing spot', fl.log.includes('depart ship citadel_port>zeelich_port') && fl.log.includes('arrive ship citadel_port>zeelich_port') && fl.room === 'zeelich' && n4.d < 1.0 && n4.state === 'play', { c4, fl, n4 });
const g2 = await ev(() => { const G = game; P.enter('zterminal'); const H = TT.zterminal, r = P.through(H.gate.x, H.gate.z); P.settle(); const l = G.regions.built('zeelich').spaceport.landing, h = G.hero; return { r: r.r, room: G.room?.id, d: +Math.hypot(h.pos.x - l.x, h.pos.z - l.z).toFixed(2) }; });
check('Zeelich\'s terminal gate (INPUT) leads out onto the deck at the pad\'s landing spot', g2.room === 'zeelich' && g2.d < 1.5, g2);

// the films on, the other way: from Zeelich's counter out through its gate, the film from Zeelich's pad, home to Citadel
const film2 = await ev(() => { const G = game; P.enter('zterminal'); G.travel.films.on = true; return G.travel.films.log.length; });
const c6 = await counter('zterminal', 'Twinsun');
const fl2 = await ev((n0) => { const G = game; for (let i = 0; i < 400 && (G.state !== 'play' || G.trans); i++) G.step(0.1); const F = G.travel.films; F.on = false; return { log: F.log.slice(n0).map((e) => `${e.part} ${e.mode} ${e.from}>${e.to}${e.skipped ? ' skipped' : ''}`), room: G.room?.id ?? 'citadel', state: G.state }; }, film2);
const n6 = await near('citadel');
check('with the films on, from Zeelich\'s counter: the departure film from Zeelich\'s pad and the arrival at Citadel\'s; he stands at the landing spot', fl2.log.includes('depart ship zeelich_port>citadel_port') && fl2.log.includes('arrive ship zeelich_port>citadel_port') && fl2.room === 'citadel' && n6.d < 1.0 && n6.state === 'play', { c6, fl2, n6 });

// out by the doors (INPUT: walked through), and he stays out (standing a while by the door does not take him back in)
const outDoor = (room) => ev((room) => { const G = game; if (G.room?.id !== room) P.enter(room); const H = TT[room]; const r = P.through(H.door.x, H.door.z); P.settle();
  const at = G.room?.id ?? 'citadel'; for (let i = 0; i < 30; i++) G.step(0.1); const d = G.story.doors().find((x) => x.room === room), h = G.hero;
  return { r: r.r, at, after: G.room?.id ?? 'citadel', fromDoor: +Math.hypot(h.pos.x - d.x, h.pos.z - d.z).toFixed(2), doorR: d.r }; }, room);
const o1 = await outDoor('terminal');
check('out of Citadel\'s terminal by its door: on the deck before it, and he stays out', o1.at === 'citadel' && o1.after === 'citadel' && o1.fromDoor > o1.doorR, o1);
await ev(() => { const G = game; G.regions.ensure('zeelich', 'test'); G.step(0.3); G.enterRoom('zeelich', G.regions.built('zeelich').spaceport.landing, true); P.settle(); });
const o2 = await outDoor('zterminal');
check('out of Zeelich\'s terminal by its door: on the deck before the pavilion, and he stays out', o2.at === 'zeelich' && o2.after === 'zeelich' && o2.fromDoor > o2.doorR, o2);

// ---- WC-4, the evacuation (chapter 8): the queue for the project's ships in Citadel's terminal. From the door he walks
// through the hall to the gate past the queue and out onto the deck (INPUT); the board reads the project's boarding.
// Chapter 9: Zeelich's board reads the council's checks. (Who is there, by chapter: tests/interior-life.mjs.)
const boardSays = (room) => ev((room) => { const G = game, H = TT[room], said = [], sv = G.say; G.say = function (n, l, ...a) { said.push(l.join(' ')); return sv.call(this, n, l, ...a); };
  const r = P.use(H.board.x, H.board.z, { kind: 'termBoard', near: 0.8 }); G.say = sv; P.settle(); return { r: r.r, kind: r.target?.kind, said: said.join(' ') }; }, room);
await setChapter('evacuation');
await toDoor('terminal');
const q8 = await ev(() => { const G = game; for (let i = 0; i < 30; i++) G.step(0.5);
  const q = (G.roomWalkers?.res || []).filter((r) => r.def.room === 'terminal' && r.present && !r.away), inLine = q.filter((r) => /queue|_list|bern_call/.test(r.stop?.id || '') && r.st !== 'walk').map((r) => r.def.id);
  const H = TT.terminal, g = P.through(H.gate.x, H.gate.z); P.settle(); const S = G.world.spaceport, h = G.hero;
  return { here: q.map((r) => r.def.id), inLine, gate: g.r, room: G.room?.id ?? 'citadel', d: +Math.hypot(h.pos.x - S.landing.x, h.pos.z - S.landing.z).toFixed(2), trace: P.trace?.slice(-3) }; });
check('WC-4, chapter 8: Citadel\'s terminal has the queue for the project\'s ships (8 people, the guard with the list and the queue at their places); from the door he walks past them to the gate and out onto the deck by the pad (INPUT)', q8.here.length === 8 && q8.inLine.length >= 2 && q8.room === 'citadel' && q8.d < 1.5, q8);
await toDoor('terminal');
const b8 = await boardSays('terminal');
check('WC-4, chapter 8: the terminal\'s board reads the project\'s boarding by its list', b8.kind === 'termBoard' && /list/.test(b8.said), b8);
await setChapter('council');
await toDoor('zterminal');
const b9 = await boardSays('zterminal');
check('WC-4, chapter 9: Zeelich\'s terminal board reads the council\'s checks at the gate', b9.kind === 'termBoard' && /council/i.test(b9.said), b9);

// save and reload in a terminal (a real page reload, Continue): back in the hall with its people and its notice
const reloadIn = async (key, room, ids) => {
  await setChapter(key);
  await toDoor(room);
  await ev(() => { for (let i = 0; i < 20; i++) game.step(0.5); game.save(false); });
  await page.reload(); await open(page, '?nocine'); await menu(page, 'continue');
  return ev(async ([room, ids]) => { const G = game; for (let i = 0; i < 40; i++) { G.step(0.25); if (G.state !== 'play') P.settle(); }
    const a = await import('/src/game/terminal.js'), b = await import('/src/game/zterminal.js'); window.TT = { terminal: a.TERMINAL, zterminal: b.ZTERMINAL };
    const here = (G.roomWalkers?.res || []).filter((r) => r.def.room === room && r.present && !r.away && !r.def.pending).map((r) => r.def.id);
    return { room: G.room?.id, chapter: G.flags.chapterKey, here, want: ids, notice: TT[room].notice?.visible, state: G.state }; }, [room, ids]);
};
const rl1 = await reloadIn('project', 'terminal', ['ama', 'tavi', 'bern', 'lomba']);
check('save and reload (Continue) in Citadel\'s terminal, chapter 2: back in the hall, its grounded people there, the notice up', rl1.room === 'terminal' && JSON.stringify([...rl1.here].sort()) === JSON.stringify([...rl1.want].sort()) && rl1.notice === true, rl1);
const c5 = await counter('terminal');
check('… and the counter still answers (grounded)', c5.st !== 'shop' && c5.said.some((x) => /^n_ama: .*grounded/i.test(x)), c5);
const rl2 = await reloadIn('council', 'zterminal', ['velo', 'pask', 'zt_guard', 'zt_guard2']);
check('save and reload in Zeelich\'s terminal, chapter 9: back in the hall with Velo, Pask and the council\'s two guards (WC-4), the GROUNDED notice down', rl2.room === 'zterminal' && JSON.stringify([...rl2.here].sort()) === JSON.stringify([...rl2.want].sort()) && rl2.notice === false, rl2);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
