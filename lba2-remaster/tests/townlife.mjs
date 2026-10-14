// Citadel twelve years on (src/game/homelife.js, townlife.js, story/life.js): the family's house, The Old Pump and
// The Mislabelled Shipment, played by input (walking, E, talking) in both valid orders, with a save & Continue in
// the middle, the stories' changes before and after story events (prologue, chapter 2, the evacuation), and the
// main story's people unchanged. Also the REV-TY-1 fixes: the house's board and meter follow the story, the boat
// box keeps the pliers in the prologue, rewards survive a save made before they are picked up, the pump's handle
// meets his hands, and the lane's pipe, the posts and the trough are solid.
// ISO (logged): chapters are set by their flags; a fresh island per order; a few placements by exitRoom.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');

const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); }, [key, extra]);
const toasts = () => ev(() => [...game.hud.toastEl.children].map((c) => c.textContent));
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
const stage0 = await ev(() => game.rooms.house.life.stage);
check('…and show it: every pin on the board red, the meter\'s needle at rest, no note on it (stage 0) (REV-TY-1 D4)', stage0 === 0, stage0);
// Arthur's bench is in his room in view of the house's camera: nothing tall between it and the camera
const benchView = await ev(() => { const H = game.rooms.house.life, R = game.rooms.house, b = H.bench; const cam = { x: Math.sin(Math.PI / 4), z: Math.cos(Math.PI / 4) };
  // walk the line from the bench toward the camera (it rises at the iso pitch 0.58): no collider taller than the line
  const PH = game.physics, hits = []; for (let d = 0.6; d < 6; d += 0.1) { const x = b.x - 0.8 + cam.x * d, z = b.z + cam.z * d, y = 0.9 + Math.tan(0.58) * d; for (const c of PH.near(x, z)) if (c.enabled && R.colliders.includes(c) && c.top > y && c.bottom < y && PH._inside(c, x, z)) hits.push([+x.toFixed(1), +z.toFixed(1), +c.top.toFixed(1)]); }
  return hits.slice(0, 5); });
check('Arthur\'s workbench stands where the house\'s camera sees it (nothing tall in between) (REV-TY-1 D2)', benchView.length === 0, benchView);

// ---- prologue: the pump is dry, Bram and Odile fit the morning; the boat box is only looked at
const pro = await ev(() => { game.hero.hasBall = true; const L = game.world.life, out = {}; const r1 = P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); out.pump = r1.r; const r2 = P.talk ? P.talk('bram') : null; out.bram = r2?.r; out.flags = { ask: !!game.flags.l_pumpAsk }; return out; });
const proLines = await said();
check('prologue: the pump is dry and Bram only remarks on it (no side story yet)', proLines.some((l) => /dry/i.test(l)) && !pro.flags.ask, { pro, proLines });
iso('prologue: Twinsen put outdoors by the garden (exitRoom) for the boat box');
const box0 = await ev(() => { const L = game.world.life; game.exitRoom({ x: L.boatBox.x, z: L.boatBox.z + 1.2, a: Math.PI }, true); P.settle(); const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { r: r.r, label: r.target?.label, pliers: !!game.flags.l_pliers, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines || [] }; });
const box0l = await said();
check('prologue: Arthur\'s boat box is only looked at; the pliers stay in it, no journal line (REV-TY-1 D6)', box0.label === 'p_look' && !box0.pliers && box0.journal.length === 0 && box0l.some((l) => /His things/.test(l)), { box0, box0l });

// ---- chapter 2, order A: Bram → the pump (no pliers) → Arthur → the boat box → the pump
await setChapter('project', { c1_water: true });
const a1 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('bram'); const ask = !!f.l_pumpAsk; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { ask, need: !!f.l_needPliers, pin: !!f.l_pin }; });
check('chapter 2: Bram asks about his pump; the valve pin needs pliers Twinsen doesn\'t have', a1.ask && a1.need && !a1.pin, a1);
const a2 = await ev(() => { const f = game.flags; P.talk('arthur'); return { asked: !!f.l_arPliers, room: game.room?.id }; });
const a2l = await said();
check('Arthur admits he borrowed the pliers (his boat box, by the pond)', a2.asked && a2l.some((l) => /boat box/.test(l)), { a2, a2l });
const a3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero, U = L.pump.use;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); const pliers = !!f.l_pliers;
  P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); const pin = !!f.l_pin;
  // the first stroke by hand, measured: his hands on the handle's grip through the stroke
  const bones = []; h.rig.root.traverse((o) => { if (/^hand[LR]$/.test(o.name)) bones.push(o); });
  P.go(U.x, U.z, { tol: 0.9, stopWhen: () => P.target()?.kind === 'lpump' }); const label = P.target()?.label, from = +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2);
  P.tap('KeyE', 0); const gap = [];
  for (let i = 0; i < 40; i++) { game.step(1 / 30); const T = h.rig.actionT; if (h.rig.anim === 'pump' && T >= 0.2 && T <= 0.47) { const a = bones[0].getWorldPosition(bones[0].position.clone()), b = bones[1].getWorldPosition(bones[1].position.clone()); gap.push(+a.add(b).multiplyScalar(0.5).distanceTo(L.pump.grip()).toFixed(3)); } }
  const at = { from, d: +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), fromPump: +Math.hypot(h.pos.x - L.pump.x, h.pos.z - L.pump.z).toFixed(2) };
  P.settle(); let strokes = 1;
  for (let i = 0; i < 6 && !f.l_pump; i++) { P.wait(0.5); P.use(U.x, U.z, { near: 1.0, kind: 'lpump' }); strokes++; }   // (as a player does: press again until it runs)
  const water = L.pump.running; const hp0 = h.hp = Math.max(1, h.maxHp - 4); P.wait(0.5); P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' });
  const clov0 = h.clovers; P.talk('bram'); const owed = f.l_oweClover || 0; P.wait(1.5);
  // the clover pops out by Bram: he picks it up (INPUT)
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'clover' && p.owe === 'l_oweClover') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle();
  return { strokes, pliers, pin, label, gap, at, pump: !!f.l_pump, water, healed: h.hp > hp0, thanks: !!f.l_bramThanks, owed, clovers: h.clovers - clov0, oweAfter: f.l_oweClover || 0, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines };
});
check('the boat box has the pliers; the pin comes out; three strokes and the pump runs (INPUT)', a3.pliers && a3.pin && a3.pump && a3.water && a3.label === 'p_pump', a3);
console.log('  hands to grip during the stroke (m): ' + JSON.stringify(a3.gap) + ' from ' + a3.at.from + ' m');
check('working the handle he stands at its grip, clear of the plinth, and his hands stay on the grip through the stroke (< 0.15 m) (REV-TY-1 D7)', a3.at.d < 0.05 && a3.at.fromPump > 1.2 && a3.gap.length >= 6 && Math.max(...a3.gap) < 0.15, { at: a3.at, gap: a3.gap });
check('the pump\'s water restores life; Bram thanks him with a clover (owed until picked up, then in his pocket); the journal tracks it', a3.healed && a3.thanks && a3.owed === 1 && a3.clovers === 1 && a3.oweAfter === 0 && a3.journal?.some((l) => l.key === 'l_j_pump0' && l.done), a3);

// ---- the lane's pipe and the new posts are solid (INPUT: walking into them)
iso('Twinsen put on the lane beside the pipe (exitRoom), then walks by holding Up');
const solid = await ev(() => { const L = game.world.life, h = game.hero, PH = game.physics, out = {}; const Pp = L.pump.pipe; out.px = Pp.x;
  game.exitRoom({ x: Pp.x - 1.2, z: L.pump.z - 4, a: Math.PI / 2 }, true); P.settle(); const y0 = h.pos.y;
  P.holdFor(['ArrowUp'], 2.0); out.pipe = { x: +h.pos.x.toFixed(2), maxRise: +(h.pos.y - y0).toFixed(2) };
  game.exitRoom({ x: Pp.x - 1.2, z: L.pump.z, a: Math.PI / 2 }, true); P.settle(); P.holdFor(['ArrowUp'], 1.6); out.gap = +h.pos.x.toFixed(2);
  const gy = (x, z) => PH.terrain.heightAt(x, z);
  out.trough = PH.groundInfo(L.trough.x, L.trough.z, gy(L.trough.x, L.trough.z) + 0.3).brick;
  const bp = L.customs.barrier.position; out.barrier = PH.blockedAt(bp.x, bp.z, gy(bp.x, bp.z), 0.1);
  out.sign = PH.blockedAt(L.pump.sign.x, L.pump.sign.z, gy(L.pump.sign.x, L.pump.sign.z), 0.1);
  out.pipeBlock = PH.blockedAt(Pp.x, L.pump.z - 4, gy(Pp.x, L.pump.z - 4), 0.1);
  out.valve = PH.blockedAt(L.pump.valve.x, L.pump.valve.z, gy(L.pump.valve.x, L.pump.valve.z), 0.1);
  return out; });
check('the copper pipe stops him (he is not lifted onto it); at the pump\'s footpath, where it runs under the ground, he walks across (REV-TY-1 D3)', solid.pipe.x < solid.px - 0.16 && solid.pipe.maxRise < 0.1 && solid.gap > solid.px + 0.3, solid);
check('the trough can\'t be stood on; the pump sign\'s post, the customs barrier\'s post, the pipe and its valve box are solid (REV-TY-1 D3)', !solid.trough && solid.barrier && solid.sign && solid.pipeBlock && solid.valve, solid);

// ---- the shipment: Odile → the crate → Nell → the bench → glow → the barrel → the bench → Odile → Nell
await setChapter('project', { c1_water: true });
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
const s2l = await said();
check('on the bench it runs and heats; left too long it trips and goes cold (a limited setback)', s2.knows && s2.placed === 'bench' && s2.after === 'tripped', s2);
check('Nell knows the coupler: Xil was getting her one from Zeelich (REV-TY-1 D8)', s2l.some((l) => /Xil was getting me one/.test(l)), s2l);
const s3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  P.wait(4.5);   // glowing
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = f.l_cs;
  P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); const cooled = f.l_cs;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  return { took, cooled, done: f.l_cs, coupler: !!f.l_coupler }; });
check('restarted, taken off while glowing, cooled in the barrel, set back: it settles and the engine runs (INPUT)', s3.took === 'hot' && s3.cooled === 'cooled' && s3.done === 'done' && s3.coupler, s3);
await said();
const s4 = await ev(() => { const f = game.flags, h = game.hero; P.talk('odile'); const c0 = h.coins; P.talk('nell'); const owed = f.l_oweFee || 0; P.wait(2); P.settle();
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'coin' && p.owe === 'l_oweFee') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle();
  return { cleared: !!f.l_cleared, paid: !!f.l_nellPaid, state: game.world.life.crate.state, owed, coins: h.coins - c0, oweAfter: f.l_oweFee || 0 }; });
const s4l = await said();
check('Odile clears the coupler\'s papers; the crate\'s tag reads CLEARED; Nell pays part of what she owes Xil for it (REV-TY-1 D8)', s4.cleared && s4.paid && s4.state === 'cleared' && s4l.some((l) => /Papers cleared/.test(l)) && s4l.some((l) => /what I owe Xil/.test(l)), { s4, s4l });
check('Nell\'s payment: three coins, owed until picked up, then his (INPUT)', s4.owed === 3 && s4.coins === 3 && s4.oweAfter === 0, s4);

// ---- save & Continue: the stories' state comes back
const file = path.join(os.tmpdir(), 'townlife-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const back = await ev(() => { P.settle(); const f = game.flags, L = game.world.life; return { pump: L.pump.running, crate: L.crate.state, cs: f.l_cs, nell: game.npcs.find((n) => n.def.id === 'nell').forceAnim }; });
check('save & quit → Continue: the pump runs, the crate is cleared, the engine is settled', back.pump && back.crate === 'cleared' && back.cs === 'done', back);

// ---- order B on a fresh flag set: the boat box first, the pump without asking Bram; and a save mid-heat
await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('l_')) delete f[k]; game.story.applyFlags(); });
await setChapter('project', { c1_water: true });
const b1 = await ev(() => { const L = game.world.life, f = game.flags, U = L.pump.use;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' });
  P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); for (let i = 0; i < 6 && !f.l_pump; i++) P.use(U.x, U.z, { near: 1.0, kind: 'lpump' });
  const pump = !!f.l_pump; const c0 = game.hero.clovers; P.talk('bram'); return { pump, thanks: !!f.l_bramThanks, ask: !!f.l_pumpAsk, owed: f.l_oweClover || 0, c0, lying: game.pickups.list.filter((p) => p.owe === 'l_oweClover').length }; });
check('other order: pliers first, the pump fixed before Bram asked; Bram still thanks him', b1.pump && b1.thanks, b1);
// a save straight away, the clover still on the ground: it is given on Continue
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const b1c = await ev(() => { const t = [...game.hud.toastEl.children].map((c) => c.textContent); P.settle(); return { clovers: game.hero.clovers, owed: game.flags.l_oweClover || 0, t }; });
await said();
check('saved before he picked Bram\'s clover up: on Continue it is in his pocket (a toast says so), nothing owed (REV-TY-1 D5)', b1.owed === 1 && b1.lying === 1 && b1c.clovers === Math.min(9, b1.c0 + 1) && b1c.owed === 0 && b1c.t.some((s) => /Bram's clover/.test(s)), { b1, b1c });
const b2 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(1); return f.l_cs; });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const b3 = await ev(() => { P.settle(); const f = game.flags; return { cs: f.l_cs, items: game.story.items().map((i) => i.id) }; });
check('a save made with the coupler heating comes back with it cold on the bench (restartable)', b2 === 'bench' && b3.cs === 'tripped', { b2, b3 });
// finish it, and save with Nell's coins still on the ground: they are given on Continue
const b4 = await ev(() => { const L = game.world.life, f = game.flags;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(4.5);
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  P.talk('odile'); const c0 = game.hero.coins; P.talk('nell'); return { done: f.l_cs, paid: !!f.l_nellPaid, owed: f.l_oweFee || 0, c0 }; });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const b4c = await ev(() => { const t = [...game.hud.toastEl.children].map((c) => c.textContent); P.settle(); return { coins: game.hero.coins, owed: game.flags.l_oweFee || 0, t }; });
await said();
check('saved before he picked Nell\'s coins up: on Continue the three kashes are his, nothing owed (REV-TY-1 D5)', b4.done === 'done' && b4.paid && b4.owed === 3 && b4c.coins - b4.c0 === 3 && b4c.owed === 0 && b4c.t.some((s) => /Nell's payment: 3 kashes/.test(s)), { b4, b4c });

// ---- the heat is on (chapter 2): the board and the meter show it
const st1 = await ev(() => { const G = game; G.enterRoom('house', G.rooms.house.spawn, true); P.settle(); G.step(0.2); const st = G.rooms.house.life.stage; G.exitRoom({ x: G.world.life.pump.x - 3, z: G.world.life.pump.z + 6, a: 0 }, true); P.settle(); return st; });
check('with the project\'s heat on, the board shows Bug Street green and the harbour row red, the meter\'s needle up with Zoé\'s note (stage 1) (REV-TY-1 D4)', st1 === 1, st1);

// ---- the evacuation: the pump is the street's water; Bram's line changes
await setChapter('evacuation', { c1_water: true, c1_plan: true });
const ev8 = await ev(() => { P.settle(); const r = P.talk('bram'); return { r, room: game.room?.id ?? 'citadel', at: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(1)) }; });
const ev8l = await said();
check('evacuation: Bram\'s line follows the dark posts', ev8l.some((l) => /dark|Pipes break/i.test(l)), { ev8, ev8l });
const desk = await ev(() => { const H = game.rooms.house.life; P.use(H.zoeDesk.x, H.zoeDesk.z, { near: 0.6, kind: 'lhome' }); return H.stage; });
const deskl = await said();
check('after Zoé found the plan, her board reads differently (the red pins are the houses left out) and shows her chalk ring round them (stage 2)', deskl.some((l) => /missing from Vesk/.test(l)) && desk === 2, { desk, deskl });

// ---- collision and access: walk from the square to each new place and back (INPUT; chapter 2: the square is open)
await setChapter('project', { c1_water: true });
const walk = await ev(() => { const W = game.world, L = W.life, out = [];
  game.exitRoom({ x: W.well.x + 2, z: W.well.z + 2, a: 0 }, true); P.settle();
  for (const [n, p] of [['pump', L.spots.bram], ['pump handle', L.pump.use], ['garden', L.boatBox], ['customs', L.customs], ['shop', L.shop.bench], ['barrel', L.shop.barrel], ['square', { x: W.well.x + 2, z: W.well.z + 3 }]]) { const r = P.go(p.x, p.z, { tol: 1.2, run: true, maxT: 120 }); out.push([n, r.r]); }
  return out; });
check('from the square he walks to the pump, its handle, the garden, customs, the repair shop and its barrel and back (INPUT)', walk.every(([, r]) => r === 'arrived'), walk);
// the shop and the garden's beds keep off the paths
const paths = await ev(() => { const W = game.world, L = W.life, d = (x, z) => +W.pathDist(x, z).toFixed(2);
  return { bench: d(L.shop.bench.x, L.shop.bench.z), barrel: d(L.shop.barrel.wx, L.shop.barrel.wz), engine: d(L.shop.engine.x, L.shop.engine.z), beds: L.beds.map((b) => d(b.x, b.z)) }; });
check('Nell\'s shop (bench, engine, barrel) and the garden\'s raised beds are off the dirt paths (> 2.3 m from a path\'s middle) (REV-TY-1 D1)', paths.bench > 2.3 && paths.barrel > 2.3 && paths.engine > 2.3 && paths.beds.every((v) => v > 2.3), paths);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
