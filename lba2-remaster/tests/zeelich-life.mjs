// Zeelich twelve years on (src/game/zeelife.js, story/zeelife.js): the old watch house that is Mother Snuff's bakery,
// the project's heat posts (lit and promised), the moles' burrow hatch, Mr Pelleck's half re-tiled dome, Nara's
// flowers held by the pad; and The Second Bake, played by input (walking, the guards' stair, E, the magic ball,
// talking) in both ways (shove the crate off the flue on the roof, or knock it off from the street), with Save & quit
// → Continue in the middle; lines before and after the shield drops (chapter 3), in chapters 4–8, at the council
// (chapter 9) and in the network (chapter 10); the main story's people unchanged; the new places solid and the
// street's routes open. REV-TY-5 (0.28.1): Snuff not offered from her roof (D2); each way keeps its own lines, also
// after a Continue from a save made while the crate falls (D1); asked again, Snuff and Bzizz follow the phase (D3).
// ISO (logged): chapters are reached by setting their flags (as tests/chapter2.mjs, chapter9.mjs and chapter10.mjs
// do); the shield by its flag; a fresh zl_ flag set for the second way; in chapter 4 Twinsen is put on Zeelich by
// the room switch the shuttle uses (the shuttle flight itself: tests/zislands.mjs). Screenshots: SHOTS=1 writes them
// to captures/zeelich-ty/.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS ? fileURLToPath(new URL('../captures/zeelich-ty/', import.meta.url)) : null;
// a screenshot from the normal camera with Twinsen standing at Zeelich-local (x, z) facing a (or on the roof)
const shot = async (name, spec) => {
  if (!SHOTS) return;
  await ev((s) => { const G = game, h = G.hero, x = 2400 + s.x;
    h.pos.set(x, s.roof ? G.rooms.zeelich.life.watch.roofY : G.physics.groundAt(x, s.z, 30), s.z); h.angle = s.a;
    h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(1.2); G.renderer.render(); }, spec);
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 180000 });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const W = () => ev(() => { const w = game.rooms.zeelich.life.watch, f = game.flags; return { crate: w.crate, done: !!f.zl_done, paid: !!f.zl_paid, ask: !!f.zl_ask, flag: f.zl_crate || null, owe: f.zl_owe || 0 }; });

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 2 finished by flags (as tests/chapter2.mjs): story.nextChapter() starts chapter 3 on Zeelich\'s dock');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await said();
const at = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey, started: !!game.flags.c2_started, taken: !!game.flags.c2_planTaken }));
check('chapter 3 starts on Zeelich (the plan confiscated at the dock, as before)', at.room === 'zeelich' && at.ch === 'zeelich' && at.started && at.taken, at);

// ---- the places
const K0 = await ev(() => { const Z = game.rooms.zeelich, L = Z.life, w = L.watch, PH = game.physics, y0 = 6.0;
  const near = (id, s) => { const n = P.npc(id); return n.present && Math.hypot(n.pos.x - s.x, n.pos.z - s.z) < 0.3; };
  return {
    body: PH.blockedAt(w.hatch.x - 1.5, w.hatch.z - 3.2, y0, 0.1),
    stairSide: PH.blockedAt(w.stairMid.x - 0.62, w.stairMid.z, y0, 0.1),
    stairUnder: PH.blockedAt(w.stairMid.x, w.stairMid.z, y0, 0.1),
    posts: L.posts.map((p) => [p.lit, p.tag, PH.blockedAt(p.x, p.z, y0, 0.1)]),
    burrowWalk: PH.groundAt(L.burrow.x, L.burrow.z, y0 + 1) > y0 + 0.2,
    flowers: L.flowers && Z.group.visible !== undefined, flowersSolid: PH.blockedAt(L.flowers.x, L.flowers.z + 0.6, y0, 0.1),
    snuff: near('zmole2', w.snuff), bzizz: near('zbee1', w.bzizz), grumm: near('zmole1', L.grumm), pelleck: near('ztri1', L.pelleck),
    crate: w.crate, lamp: null,
  }; });
check('the watch house, its stair (solid from the side and underneath), the heat posts and Nara\'s crates are solid; the burrow lid can be stood on', K0.body && K0.stairSide && K0.stairUnder && K0.posts.every((p) => p[2]) && K0.burrowWalk && K0.flowersSolid, K0);
check('three lit heat posts and three dark ones with tags (Pelleck\'s house, the south-west house, the burrow)', K0.posts.filter((p) => p[0]).length === 3 && K0.posts.filter((p) => !p[0] && p[1]).length === 3, K0.posts);
check('Snuff at her counter, Bzizz by the stair, Old Grumm by the burrow, Mr Pelleck under his scaffold; the crate on the flue', K0.snuff && K0.bzizz && K0.grumm && K0.pelleck && K0.crate === 'flue', K0);
await shot('01-street-watchhouse', { x: 11.6, z: -3.2, a: Math.PI });

// the street's routes stay open: from the dock past the new places to the mills, the depot gate and the platform gate
const routes = await ev(() => { const Z = game.rooms.zeelich, out = [];
  for (const [n, x, z] of [['north mill (end of its track)', 2397.8, -15.4], ['east mill (end of its track)', 2421.9, -14.0], ['depot gate', 2412, 8.0], ['the bakery counter', Z.life.watch.hatch.x, Z.life.watch.hatch.z + 0.3], ['the burrow', Z.life.burrow.x + 1.6, Z.life.burrow.z - 1.4], ['Pelleck\'s door', 2400 - 40.5, -6.6], ['the platform gate', 2433.5, 0]]) { const r = P.go(x, z, { tol: 0.7, maxT: 90 }); out.push([n, r.r]); }
  return out; });
check('collision and access: Twinsen walks from the street to the mills, the depot gate, the new places and the platform gate (INPUT)', routes.every(([, r]) => r === 'arrived'), routes);

// ---- chapter 3, before the shield: Snuff, Bzizz, the heat box
const s1 = await ev(() => { const r = P.talk('zmole2'); return { r: r.r, ask: !!game.flags.zl_ask }; });
const s1l = await said();
check('Snuff (INPUT): her oven is cold, she sold her charcoal cart for the project\'s heat; something sits on her flue', s1.r === 'talked' && s1.ask && s1l.some((l) => /charcoal cart/.test(l)) && s1l.some((l) => /sitting on my flue/.test(l)), { s1, s1l });
const s2 = await ev(() => { const r = P.talk('zbee1'); return { r: r.r, bz: !!game.flags.zl_bz }; });
const s2l = await said();
check('Bzizz (INPUT): the roof is his landing stage; his crate waits for the depot\'s signature', s2.bz && s2l.some((l) => /flattest landing/.test(l)) && s2l.some((l) => /sign for it/.test(l)), { s2, s2l });
const s3 = await ev(() => { const w = game.rooms.zeelich.life.watch; const r = P.use(w.heatbox.x, w.heatbox.z, { kind: 'zlbox', near: 0.8 }); return { r: r.r, label: r.target?.label }; });
const s3l = await said();
check('the heat box on the east wall (INPUT): red lamp, SAFETY CUT-OUT', s3.r === 'used' && s3l.some((l) => /SAFETY CUT-OUT/.test(l)), { s3, s3l });
const s4 = await ev(() => { const w = game.rooms.zeelich.life.watch; const r = P.use(w.hatch.x, w.hatch.z, { kind: 'zlhatch', near: 0.8 }); return { r: r.r }; });
const s4l = await said();
check('the hatch (INPUT): an old watch house, its crest chiselled off; the oven cold', s4.r === 'used' && s4l.some((l) => /chiselled the crest/.test(l)) && s4l.some((l) => /cold/.test(l)), { s4, s4l });
const pe = await ev(() => { P.talk('ztri1'); P.talk('zmole1'); return 1; });
const pel = await said();
check('Mr Pelleck (his dome, his wages, his filed form) and Old Grumm (the dark post over a burrow that sweats already)', pel.some((l) => /depot's books|old violet|Form 7-B/.test(l)) && pel.some((l) => /burrow|vents/.test(l)), pel);
const fl = await ev(() => { const L = game.rooms.zeelich.life; const r = P.use(L.flowers.x, L.flowers.z, { kind: 'zlnara', near: 0.8 }); return { r: r.r }; });
const fll = await said();
check('Nara\'s cloud flowers by the pad, crated for Citadel and HELD while the shuttles are grounded (INPUT)', fl.r === 'used' && fll.some((l) => /HELD/.test(l)), { fl, fll });

// ---- way A: up the guards' stair, shove the crate off the flue
const a1 = await ev(() => { const w = game.rooms.zeelich.life.watch, h = game.hero;
  const r = P.use(w.flue.x, w.flue.z, { kind: 'zlshove', near: 0.9 });
  const onRoof = h.pos.y > w.roofY - 0.3;
  P.wait(1.5);
  return { r: r.r, label: r.target?.label, onRoof, y: +h.pos.y.toFixed(2), crate: w.crate, trace: P.trace.slice(-6) }; });
const a1l = await said();
const a1s = await W();
check('up the guards\' stair to the roof by walking; a shove moves the crate off the flue (INPUT)', a1.onRoof && a1.label === 'p_shove' && a1s.crate === 'shoved' && a1s.done && a1s.flag === 'shoved', { a1, a1s });
check('…the heat box resets (green) and Snuff calls out: the oven is warm', a1l.some((l) => /lamp turns green/.test(l)) && a1l.some((l) => /oven's warm/.test(l)), a1l);
const a2 = await ev(() => { const w = game.rooms.zeelich.life.watch, h = game.hero; const out = {};
  for (const [n, ang] of [['south', 0], ['east', Math.PI / 2], ['north', Math.PI]]) { P.go(w.use.x, w.use.z, { tol: 0.4, maxT: 10 }); h.angle = ang; P.holdFor(['ArrowUp'], 1.6); out[n] = +h.pos.y.toFixed(2); }
  P.go(w.use.x - 1.4, w.use.z + 0.6, { tol: 0.4, maxT: 10 }); h.angle = -Math.PI / 2; P.holdFor(['ArrowUp'], 1.6); out.west = +h.pos.y.toFixed(2);
  return { ...out, roofY: w.roofY }; });
check('the parapet keeps him on the roof (south, east, north and the west side south of the stair, INPUT)', ['south', 'east', 'north', 'west'].every((k) => Math.abs(a2[k] - a2.roofY) < 0.05), a2);
await shot('03-roof-after-shove', { x: 11.2, z: -10.4, a: 0.9, roof: true });
const a3 = await ev(() => { const r = P.talk('zbee1'); return r.r; });
const a3l = await said();
check('Bzizz: that was a flue? (the crate stays on his stage)', a3l.some((l) => /That was a flue/.test(l)), a3l);

// save & Continue before Snuff has paid
let file = path.join(os.tmpdir(), 'zeelife-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const a4 = await ev(() => { P.settle(); const L = game.rooms.zeelich.life, w = L.watch, f = game.flags; return { room: game.room?.id, crate: w.crate, done: !!f.zl_done, tavo: Math.hypot(P.npc('ztri2').pos.x - w.tavo.x, P.npc('ztri2').pos.z - w.tavo.z) < 0.3, journal: game.story.journal().find((j) => j.title === 'Zeelich')?.lines }; });
check('Save & quit → Continue: the crate still on the stage, the oven hot, Tavo at the counter; the journal has it', a4.room === 'zeelich' && a4.crate === 'shoved' && a4.done && a4.tavo && a4.journal?.some((l) => l.key === 'zl_j_oven' && l.done), a4);

const hp0 = await ev(() => { const h = game.hero; h.hp = Math.max(1, h.maxHp - 4); return h.hp; });
const b1 = await ev(() => { const f = game.flags, h = game.hero; const c0 = h.coins; P.talk('zmole2'); const owed = f.zl_owe || 0; P.wait(1.5); P.settle();
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'coin' && p.owe === 'zl_owe') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle(); return { paid: !!f.zl_paid, owed, coins: h.coins - c0, oweAfter: f.zl_owe || 0, journal: game.story.journal().find((j) => j.title === 'Zeelich')?.lines }; });
const b1l = await said();
check('Snuff pays five kashes (one coin, owed until picked up by walking to it); the journal closes', b1.paid && b1.owed === 1 && b1.coins === 5 && b1.oweAfter === 0 && b1.journal?.every((l) => l.done) && b1l.some((l) => /Five kashes/.test(l)), { b1, b1l });
const b2 = await ev(() => { const w = game.rooms.zeelich.life.watch, h = game.hero; const hp = h.hp; const r = P.use(w.hatch.x, w.hatch.z, { kind: 'zlhatch', near: 0.8 }); return { label: r.target?.label, healed: h.hp > hp }; });
check('a warm roll at the hatch restores life (INPUT)', b2.label === 'p_roll' && b2.healed, { b2, hp0 });
await shot('02-bakery-hot', { x: 12.8, z: -5.2, a: Math.PI + 0.25 });
const b3 = await ev(() => { for (const id of ['zmole2', 'ztri2', 'zbee1']) P.talk(id); return 1; });
const b3l = await said();
check('afterwards: Snuff on who buys her bread, Tavo carries the rolls to the depot, Bzizz on twice the flowers', b3l.some((l) => /rolls to the depot|built for watching/.test(l)) && b3l.some((l) => /Everybody's paid|warm bread/.test(l)) && b3l.some((l) => /bloom twice|stage now/.test(l)), b3l);

// chapter 3's own lines for Nara and Oku are untouched
const n1 = await ev(() => { P.talk('nara'); P.talk('oku'); return 1; });
const n1l = await said();
check('Nara and Oku keep chapter 3\'s lines (the main story first)', n1l.some((l) => /cloud flower|Baldino\?|Vesk's people/.test(l)) && n1l.some((l) => /Before the project, these mills|Three mills/.test(l)), n1l);

// after the shield drops (ISO): the lines move on
iso('chapter 3: the shield brought down by its flag (c2_plan, c2_key, c2_broadcast, the three mills, c2_shield)');
await ev(() => { const f = game.flags; Object.assign(f, { c2_plan: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c2_shield: true }); game.story.applyFlags(); P.settle(); });
await said();

// ---- way B (a fresh set of zl_ flags): Bzizz's crate knocked off from the street with the magic ball
iso('way B: the zl_ flags cleared (a fresh story), the crate back on the flue');
await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('zl_')) delete f[k]; game.story.applyFlags(); P.settle(); });
// REV-TY-5 D2: from the roof, right above her counter (in talk range on the map, 4 m up), Snuff is not offered: no
// Talk prompt, and E plays none of her lines (her first talk, which sends him to the stair, waits for the street)
const r0 = await ev(() => { const w = game.rooms.zeelich.life.watch, h = game.hero, n = P.npc('zmole2');
  const g1 = P.go(w.use.x, w.use.z, { tol: 0.5, maxT: 60 });
  const g2 = P.go(n.pos.x, w.flue.z - 0.1, { tol: 0.3, maxT: 10 });
  P.face(n.pos.x, n.pos.z);
  const tg = P.target(), onRoof = h.pos.y > w.roofY - 0.3, dh = Math.hypot(h.pos.x - n.pos.x, h.pos.z - n.pos.z), dy = h.pos.y - n.pos.y;
  if (tg?.kind !== 'zlshove') P.tap('KeyE', 0.1);
  P.settle();
  return { g1: g1.r, g2: g2.r, onRoof, dh: +dh.toFixed(2), dy: +dy.toFixed(2), tg, ask: !!game.flags.zl_ask, crate: w.crate }; });
const r0l = await said();
check('from the roof above her counter Snuff is not offered: no Talk prompt, E plays none of her lines (INPUT)', r0.onRoof && r0.dh < 2.6 && r0.tg?.kind !== 'npc' && !r0.ask && r0.crate === 'flue' && !r0l.some((l) => /stair is round the side|Oven's cold/.test(l)), { r0, r0l });
const c0 = await ev(() => { const r = P.talk('zmole2'); return { ask: !!game.flags.zl_ask, crate: game.rooms.zeelich.life.watch.crate }; });
const c0l = await said();
check('after the shield drops, Snuff\'s problem in its own words (the heat still comes up the pipe)', c0.ask && c0.crate === 'flue' && c0l.some((l) => /heat still comes/.test(l)), { c0, c0l });
// REV-TY-5 D3: asked again, Snuff and Bzizz talk about the street's news of the moment, then the crate
await ev(() => { P.talk('zmole2'); P.talk('zbee1'); P.talk('zbee1'); return 1; });
const d3a = await said();
check('asked again (chapter 3, shield down): Snuff on the heat in the pipe, then the stair; Bzizz once met, then on everything waiting on his stage', d3a.some((l) => /heat still comes/.test(l)) && d3a.some((l) => /Up the guards' stair/.test(l)) && d3a.some((l) => /flattest landing/.test(l)) && d3a.some((l) => /waits on my stage/.test(l)) && d3a.some((l) => /hasn't signed/.test(l)), d3a);
const c1 = await ev(() => { const w = game.rooms.zeelich.life.watch, f = game.flags, h = game.hero;
  const tg = game.rooms.zeelich.ballTargets.find((t) => t.zl);
  const inAim = game.ballAimTargets().includes(tg);
  P.go(w.hatch.x + 0.45, w.hatch.z + 3.4, { tol: 0.5 });
  let tries = 0;
  for (; tries < 6 && w.crate === 'flue'; tries++) { P.tap('F1'); P.throwAt(w.flue.x, w.flue.z); P.wait(0.4); }
  P.wait(1.5); P.settle();
  return { inAim, tries, crate: w.crate, flag: f.zl_crate, done: !!f.zl_done, y: +h.pos.y.toFixed(2), aimAfter: game.ballAimTargets().includes(tg) }; });
const c1l = await said();
check('from the street the magic ball knocks the crate off the flue: it falls and breaks on the grass (INPUT)', c1.inAim && c1.crate === 'broken' && c1.flag === 'broken' && c1.done && !c1.aimAfter, c1);
check('…Bzizz: "My nectar!"; the heat box resets; Snuff calls out', c1l.some((l) => /My nectar/.test(l)) && c1l.some((l) => /lamp turns green/.test(l)), c1l);
check('…from the street, Twinsen sees the heat box on the wall click (not the roof\'s "Somewhere below", REV-TY-5 D1)', c1.y < 7.5 && c1l.some((l) => /heat box on the wall clicks/.test(l)) && !c1l.some((l) => /Somewhere below/.test(l)), { y: c1.y, c1l });
await shot('04-nectar', { x: 16.6, z: -7.5, a: -Math.PI / 2 - 0.5 });
const c2 = await ev(() => { const h = game.hero, f = game.flags; const c = h.coins; P.talk('zbee1'); P.talk('zmole2'); return { c, owed: f.zl_owe || 0, lying: game.pickups.list.filter((p) => p.owe === 'zl_owe').length }; });
const c2l = await said();
check('Bzizz: the depot can sign for a puddle; Snuff pays (sticky grass, one sad Mosquibee)', c2l.some((l) => /sign for a puddle/.test(l)) && c2l.some((l) => /sad Mosquibee/.test(l)) && c2.owed === 1, { c2, c2l });
file = path.join(os.tmpdir(), 'zeelife2-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const c3 = await ev(() => { const t = (game.hud.toastLog || []).slice(); P.settle(); const w = game.rooms.zeelich.life.watch, f = game.flags; return { coins: game.hero.coins, owed: f.zl_owe || 0, t, crate: w.crate, done: !!f.zl_done }; });
await said();
check('saved before he picked Snuff\'s coin up: on Continue the five kashes are his (a toast says so); the crate still broken, the oven hot', c3.coins === c2.c + 5 && c3.owed === 0 && c3.t.some((s) => /Snuff's payment/.test(s)) && c3.crate === 'broken' && c3.done, { c2, c3 });

// ---- the ball way again, Snuff never asked, saved while the crate falls (REV-TY-5 D1)
iso('the zl_ flags cleared again (a fresh story): Snuff never asked; Save & quit while the crate falls');
const e1 = await ev(() => { const f = game.flags, w = game.rooms.zeelich.life.watch; for (const k of Object.keys(f)) if (k.startsWith('zl_')) delete f[k]; game.story.applyFlags(); P.settle();
  P.go(w.hatch.x + 0.45, w.hatch.z + 3.4, { tol: 0.5 });
  let tries = 0, st = w.crate;
  for (; tries < 6 && w.crate === 'flue'; tries++) { P.tap('F1'); P.face(w.flue.x, w.flue.z); P.tap('KeyF', 0.05); for (let k = 0; k < 120 && w.crate === 'flue'; k++) game.step(1 / 60); if (w.crate === 'flue') P.wait(0.6); }
  st = w.crate; return { tries, st, flag: f.zl_crate, ask: !!f.zl_ask }; });
check('the ball knocks the crate off (Snuff never asked); it is still falling when he quits', e1.st === 'falling' && e1.flag === 'broken' && !e1.ask, e1);
file = path.join(os.tmpdir(), 'zeelife3-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const e2 = await ev(() => { P.settle(); const w = game.rooms.zeelich.life.watch, f = game.flags; const r = P.talk('zmole2'); return { crate: w.crate, done: !!f.zl_done, paid: !!f.zl_paid, owed: f.zl_owe || 0, r: r.r }; });
const e2l = await said();
check('Continue from the mid-fall save: the crate broken on the grass, the oven hot; Snuff asks about his ball, not her roof, and pays', e2.crate === 'broken' && e2.done && e2.paid && e2l.some((l) => /Was that your ball/.test(l)) && !e2l.some((l) => /on my roof/.test(l)), { e2, e2l });
await ev(() => { P.settle(); for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'coin' && p.owe === 'zl_owe') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 }); P.talk('zbee1'); P.settle(); return 1; });
await said();

// REV-TY-5 D3: Snuff and Bzizz asked, the crate still on the flue, in a later phase (ISO: the zl_ flags of "asked,
// not done" for one talk each, then the street's own flags back)
const askedAgain = () => ev(() => { const f = game.flags, keep = {};
  for (const k of Object.keys(f)) if (k.startsWith('zl_')) keep[k] = f[k];
  for (const k of ['zl_crate', 'zl_done', 'zl_paid', 'zl_bzThanks', 'zl_owe']) delete f[k];
  Object.assign(f, { zl_ask: true, zl_bz: true }); game.story.applyFlags(); P.settle();
  const crate = game.rooms.zeelich.life.watch.crate;
  P.talk('zmole2'); P.talk('zbee1');
  for (const k of Object.keys(f)) if (k.startsWith('zl_')) delete f[k];
  Object.assign(f, keep); game.story.applyFlags(); P.settle();
  return { crate, after: game.rooms.zeelich.life.watch.crate }; });

// ---- chapter 4–8: the shuttles fly again
iso('chapter 3 finished by flags (toShell → chapter 4 on Desert Island, as tests/chapter4.mjs); Twinsen put on Zeelich by the shuttle\'s room switch (tests/zislands.mjs flies it)');
await ev(() => { const f = game.flags; Object.assign(f, { c2_veskDown: true }); game.story.cur.toShell(); P.settle(); game.step(1.5); P.settle();
  const l = game.story.isles.landing('zeelich'); game.enterRoom('zeelich', l, true); game.story.refreshCast(); P.settle(); });
await said();
const m1 = await ev(() => { const f = game.flags, L = game.rooms.zeelich.life; P.talk('nara'); P.talk('oku'); P.talk('ztri1'); P.talk('zmole1'); P.talk('zbee1'); return { ch: f.chapterKey, room: game.room?.id, flowers: L.flowers && game.physics.blockedAt(L.flowers.x, L.flowers.z, 6.0, 0.1) }; });
const m1l = await said();
check('chapter 4 on Zeelich: Nara\'s crates are gone (the shuttles fly again); Nara on Xil selling her flowers at Citadel, Oku on his mills\' new sails', m1.ch === 'dig' && m1.room === 'zeelich' && !m1.flowers && m1l.some((l) => /Xil sells them|People buy flowers/.test(l)) && m1l.some((l) => /new sails|complained less/.test(l)), { m1, m1l });
check('…Pelleck, Grumm and Bzizz in chapter 4–8\'s words', m1l.some((l) => /tilers|last quarter/.test(l)) && m1l.some((l) => /warmer every week|open the vents/.test(l)) && m1l.some((l) => /shuttles fly again|stage now/.test(l)), m1l);
iso('chapter 4: the bake set back to "asked, not done" for one talk each');
const m2 = await askedAgain();
const m2l = await said();
check('asked, not done, chapter 4–8: Snuff on Bzizz flying twice as much; Bzizz on forty crates a day; then the flue and the signature', m2.crate === 'flue' && m2.after === 'broken' && m2l.some((l) => /twice as much/.test(l)) && m2l.some((l) => /Up the guards' stair/.test(l)) && m2l.some((l) => /Forty crates a day/.test(l)) && m2l.some((l) => /hasn't signed/.test(l)), { m2, m2l });

// ---- chapter 9: the council
iso('chapters 4–8 skipped by flags; story.nextChapter() into chapter 9 (as tests/chapter9.mjs)');
await ev(() => { const f = game.flags; Object.assign(f, { chapter: 7, chapterKey: 'evacuation' }); game.story.nextChapter(); P.settle(); });
await said();
const k1 = await ev(() => { const f = game.flags; P.talk('baldino'); const form = !!f.c9_form; if (game.room?.id === 'workshop') { const e = game.room.exits[0]; P.through(e.x, e.z); } const rn = P.talk('nara'); const stamp = !!f.c9_nara; P.talk('ztri1'); P.talk('zmole2'); P.talk('zmole1'); return { ch: f.chapterKey, room: game.room?.id, form, stamp, rn: rn.r }; });
const k1l = await said();
check('chapter 9: Baldino\'s petition and Nara\'s stamp work as before (the chapter first)', k1.ch === 'council' && k1.form && k1.stamp && k1l.some((l) => /coral flower/.test(l)), { k1, k1l: k1l.slice(0, 6) });
check('…and the street argues about the council: Pelleck (who pays the tilers?), Snuff (who buys the bread?), Grumm (the moles say stop)', k1l.some((l) => /tilers|I file/.test(l)) && k1l.some((l) => /who buys it|charcoal cart/.test(l)) && k1l.some((l) => /moles say stop|warmer every week/.test(l)), k1l);
iso('chapter 9: the bake set back to "asked, not done" for one talk each');
const k2 = await askedAgain();
const k2l = await said();
check('asked, not done, at the council: Snuff wants her charcoal cart back if the bore stops; Bzizz waits on the council', k2.crate === 'flue' && k2l.some((l) => /charcoal cart back/.test(l)) && k2l.some((l) => /waits for the council/.test(l)), { k2, k2l });

// ---- chapter 10: the network
iso('chapter 9 done by flags (c9_vote); story.nextChapter() into chapter 10 (as tests/chapter10.mjs)');
await ev(() => { const f = game.flags; Object.assign(f, { c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true, c9_plans: true, c9_vote: true }); game.story.nextChapter(); P.settle(); });
await said();
const w1 = await ev(() => { const f = game.flags; if (game.room?.id === 'workshop') { const e = game.room.exits[0]; P.through(e.x, e.z); P.settle(); } P.talk('oku'); const ask = !!f.c10_okuAsk; P.talk('zmole2'); P.talk('zbee1'); P.talk('ztri1'); return { ch: f.chapterKey, room: game.room?.id, ask }; });
const w1l = await said();
check('chapter 10: Oku\'s station errand as before (the chapter first)', w1.ch === 'network' && w1.room === 'zeelich' && w1.ask, { w1, w1l: w1l.slice(0, 4) });
check('…and the street on the bore turned into a shield (Snuff\'s heat box, Bzizz\'s heat, Pelleck\'s missing form)', w1l.some((l) => /heat box alone|built for watching/.test(l)) && w1l.some((l) => /Nobody can tell me|stage now/.test(l)) && w1l.some((l) => /isn't one yet|still a dome/.test(l)), w1l);
await shot('05-pelleck-dome', { x: -39.5, z: -1.2, a: Math.PI });
await shot('06-burrow-posts', { x: -31, z: 3.4, a: 0 });

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
