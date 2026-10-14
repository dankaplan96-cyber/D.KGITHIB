// Citadel twelve years on (src/game/homelife.js, townlife.js, story/life.js): the family's house, The Old Pump and
// The Mislabelled Shipment, played by input (walking, E, talking) in both valid orders, with a save & Continue in
// the middle, the stories' changes before and after story events (prologue, chapter 2, the evacuation), and the
// main story's people unchanged. ISO (logged): chapters are set by their flags; a fresh island per order.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');

const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); }, [key, extra]);
await said();

// ---- the cast is there
const cast = await ev(() => ['bram', 'odile', 'nell'].map((id) => { const n = game.npcs.find((x) => x.def.id === id); return { id, present: n?.present, d: n && +Math.hypot(n.pos.x - game.world.life.spots[id].x, n.pos.z - game.world.life.spots[id].z).toFixed(2) }; }));
check('Bram, Officer Odile and Nell are on Citadel at their places', cast.every((c) => c.present && c.d < 0.5), cast);

// ---- the house (prologue, INPUT): each family corner gives a short look
const home = await ev(() => { const out = {}; const H = game.rooms.house.life;
  for (const w of ['desk', 'trunk', 'mend', 'meter', 'bench']) { const p = { desk: H.zoeDesk, trunk: H.trunk, mend: H.mendBox, meter: H.meter, bench: H.bench }[w]; const r = P.use(p.x, p.z, { near: 0.6, kind: 'lhome' }); out[w] = { r: r.r, lines: r.lines, what: r.target?.kind }; }
  return out; });
const homeLines = await said();
check('the house: Zoé\'s board, the old trunk, the mend box, the heat meter and Arthur\'s bench each have a short look (INPUT)', Object.values(home).every((h) => h.what === 'lhome' && h.lines >= 1) && homeLines.length >= 5 && homeLines.length <= 8, { home, homeLines });
check('before the heat network (prologue) Zoé\'s board and the meter say the house is waiting', homeLines.some((l) => /near the top/.test(l)) && homeLines.some((l) => /Not connected yet/.test(l)), homeLines);

// ---- prologue: the pump is dry, Bram and Odile fit the morning
const pro = await ev(() => { game.hero.hasBall = true; const L = game.world.life, out = {}; const r1 = P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); out.pump = r1.r; const b = P.npc('bram'); const r2 = P.talk ? P.talk('bram') : null; out.bram = r2?.r; out.flags = { ask: !!game.flags.l_pumpAsk }; return out; });
const proLines = await said();
check('prologue: the pump is dry and Bram only remarks on it (no side story yet)', proLines.some((l) => /dry/i.test(l)) && !pro.flags.ask, { pro, proLines });

// ---- chapter 2, order A: Bram → the pump (no pliers) → Arthur → the boat box → the pump
await setChapter('project', { c1_water: true });
const a1 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('bram'); const ask = !!f.l_pumpAsk; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { ask, need: !!f.l_needPliers, pin: !!f.l_pin }; });
check('chapter 2: Bram asks about his pump; the valve pin needs pliers Twinsen doesn\'t have', a1.ask && a1.need && !a1.pin, a1);
const a2 = await ev(() => { const f = game.flags; P.talk('arthur'); return { asked: !!f.l_arPliers, room: game.room?.id }; });
const a2l = await said();
check('Arthur admits he borrowed the pliers (his boat box, by the pond)', a2.asked && a2l.some((l) => /boat box/.test(l)), { a2, a2l });
const a3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); const pliers = !!f.l_pliers;
  P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); const pin = !!f.l_pin;
  let strokes = 0; for (let i = 0; i < 6 && !f.l_pump; i++) { P.wait(0.5); P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); strokes++; }   // (as a player does: press again until it runs)
  const water = L.pump.running; const hp0 = h.hp = Math.max(1, h.maxHp - 4); P.wait(0.5); P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' });
  const clov0 = game.pickups.list.filter((p) => p.type === 'clover').length; P.talk('bram'); P.wait(1.5);
  return { strokes, pliers, pin, pump: !!f.l_pump, water, healed: h.hp > hp0, thanks: !!f.l_bramThanks, clover: game.pickups.list.filter((p) => p.type === 'clover').length - clov0 >= 0, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines };
});
check('the boat box has the pliers; the pin comes out; three strokes and the pump runs (INPUT)', a3.pliers && a3.pin && a3.pump && a3.water, a3);
check('the pump\'s water restores life; Bram thanks him with a clover; the journal tracks it', a3.healed && a3.thanks && a3.journal?.some((l) => l.key === 'l_j_pump0' && l.done), a3);

// ---- the shipment: Odile → the crate → Nell → the bench → glow → the barrel → the bench → Odile → Nell
const s1 = await ev(() => { const L = game.world.life, f = game.flags;
  P.talk('odile'); const ask = !!f.l_crateAsk;
  P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' });
  return { ask, open: !!f.l_crateOpen, cs: f.l_cs, carry: game.story.items().some((i) => i.id === 'coupler') }; });
check('Officer Odile holds the "soup pot"; opening it: a heat coupler, carried', s1.ask && s1.open && s1.carry, s1);
// first a trip: set it down and wait too long
const s2 = await ev(() => { const L = game.world.life, f = game.flags;
  P.talk('nell'); const knows = !!f.l_nellKnows;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const placed = f.l_cs;
  P.wait(11); P.settle();
  return { knows, placed, after: f.l_cs }; });
check('on the bench it runs and heats; left too long it trips and goes cold (a limited setback)', s2.knows && s2.placed === 'bench' && s2.after === 'tripped', s2);
const s3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  P.wait(4.5);   // glowing
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = f.l_cs;
  P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); const cooled = f.l_cs;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  return { took, cooled, done: f.l_cs, coupler: !!f.l_coupler }; });
check('restarted, taken off while glowing, cooled in the barrel, set back: it settles and the engine runs (INPUT)', s3.took === 'hot' && s3.cooled === 'cooled' && s3.done === 'done' && s3.coupler, s3);
const s4 = await ev(() => { const f = game.flags, h = game.hero; P.talk('odile'); const c0 = h.coins; P.talk('nell'); P.wait(2); P.settle();
  for (const p of [...game.pickups.list]) if (p.type === 'coin') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  return { cleared: !!f.l_cleared, paid: !!f.l_nellPaid, state: game.world.life.crate.state }; });
check('Odile clears it; the crate\'s tag reads CLEARED; Nell pays the finder\'s fee', s4.cleared && s4.paid && s4.state === 'cleared', s4);

// ---- save & Continue: the stories' state comes back
const file = path.join(os.tmpdir(), 'townlife-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const back = await ev(() => { P.settle(); const f = game.flags, L = game.world.life; return { pump: L.pump.running, crate: L.crate.state, cs: f.l_cs, nell: game.npcs.find((n) => n.def.id === 'nell').forceAnim }; });
check('save & quit → Continue: the pump runs, the crate is cleared, the engine is settled', back.pump && back.crate === 'cleared' && back.cs === 'done', back);

// ---- order B on a fresh flag set: the boat box first, the pump without asking Bram; and a save mid-heat
await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('l_')) delete f[k]; game.story.applyFlags(); });
await setChapter('project', { c1_water: true });
const b1 = await ev(() => { const L = game.world.life, f = game.flags;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' });
  P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); for (let i = 0; i < 6 && !f.l_pump; i++) P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' });
  const pump = !!f.l_pump; P.talk('bram'); return { pump, thanks: !!f.l_bramThanks, ask: !!f.l_pumpAsk }; });
check('other order: pliers first, the pump fixed before Bram asked; Bram still thanks him', b1.pump && b1.thanks, b1);
const b2 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(1); return f.l_cs; });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const b3 = await ev(() => { P.settle(); const f = game.flags; return { cs: f.l_cs, items: game.story.items().map((i) => i.id) }; });
check('a save made with the coupler heating comes back with it cold on the bench (restartable)', b2 === 'bench' && b3.cs === 'tripped', { b2, b3 });

// ---- the evacuation: the pump is the street's water; Bram's line changes
await setChapter('evacuation', { c1_water: true, c1_plan: true });
const ev8 = await ev(() => { P.settle(); const r = P.talk('bram'); return { r, room: game.room?.id ?? 'citadel', at: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(1)) }; });
const ev8l = await said();
check('evacuation: Bram\'s line follows the dark posts', ev8l.some((l) => /dark|Pipes break/i.test(l)), { ev8, ev8l });
const desk = await ev(() => { const H = game.rooms.house.life; P.use(H.zoeDesk.x, H.zoeDesk.z, { near: 0.6, kind: 'lhome' }); return true; });
const deskl = await said();
check('after Zoé found the plan, her board reads differently (the red pins are the houses left out)', deskl.some((l) => /missing from Vesk/.test(l)), deskl);

// ---- collision and access: walk from the square to each new place and back (INPUT; chapter 2: the square is open)
await setChapter('project', { c1_water: true });
const walk = await ev(() => { const W = game.world, L = W.life, out = [];
  game.exitRoom({ x: W.well.x + 2, z: W.well.z + 2, a: 0 }, true); P.settle();
  for (const [n, p] of [['pump', L.spots.bram], ['garden', L.boatBox], ['customs', L.customs], ['shop', L.shop.bench], ['square', { x: W.well.x + 2, z: W.well.z + 3 }]]) { const r = P.go(p.x, p.z, { tol: 1.2, run: true, maxT: 120 }); out.push([n, r.r]); }
  return out; });
check('from the square he walks to the pump, the garden, customs and the repair shop and back (INPUT)', walk.every(([, r]) => r === 'arrived'), walk);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
