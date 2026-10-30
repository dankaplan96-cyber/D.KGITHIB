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

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
