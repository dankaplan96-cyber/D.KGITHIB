// EQUIP-2a: Arthur's pocket set and Bram's pump lance (src/game/tools.js, story/kit2.js). Each tool found by input (walking,
// talking, E), taught by its lesson (the cellar's humming tin; the lane's trough and Bram's too-hot stop-cock), used in a
// puzzle (the tin, the stop-cock, Nell's coupler) and in a fight (drones lose their aim; a guard pushed 3 m; a mite frozen),
// its limits (the squeal's cooldown, an empty tank, people and animals unaffected), kept through Save & quit → Continue,
// and an old save without them loads with neither (Bram then gives the lance on the next talk; no reward twice).
// ISO (logged): chapter 1 is finished by flags (as tests/arsenal.mjs); The Old Pump is solved by its flags (its own
// test is tests/townlife.mjs); the coupler is put on Nell's bench by its state (its own test too); the fights are in the
// developer arena (never saved). Screenshots (two) go to EQ2_SHOTS (default /dev/shm/eq2-shots).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.EQ2_SHOTS || '/dev/shm/eq2-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const snap = async (name) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 180000 }); console.log('  shot ' + path.join(SHOTS, name + '.png')); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const helpers = () => ev(() => {
  window.T = {
    A: () => ({ ...game.hero.arms }),
    useItem(id) {
      const G = game;
      P.tap('KeyI', 0.1);
      if (G.state !== 'inventory') return 'no inventory';
      const items = G.inventory.items(), i = items.findIndex((x) => x.id === id);
      if (i < 0) { P.tap('KeyI', 0.1); return 'not carried: ' + id; }
      const n = items.length, cur = G.inventory.sel ?? 0;
      for (let k = 0; k < (i - cur + n) % n; k++) P.tap('ArrowRight', 0.05);
      const sel = G.inventory.items()[G.inventory.sel]?.id;
      P.tap('KeyE', 0.1);
      return sel === id ? 'used' : 'selected ' + sel;
    },
    toasts: () => [...document.querySelectorAll('.toast')].map((d) => d.textContent).join(' | '),
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();
iso('the prologue finished by flags (as tests/arsenal.mjs): chapter 2, The Joint Project, on Citadel; its radio scene by its flags');
await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, opening: true, c1_started: true, c1_radio: true, c1_veskGone: true }); G.hero.hasBall = true; G.story.nextChapter(); P.settle(); G.step(0.5); });
const s0 = await ev(() => ({ ch: game.flags.chapterKey, A: T.A(), wheel: game.hero.combat.owned() }));
check('chapter 2 (The Joint Project), after the radio scene: neither tool owned yet, the tank empty, neither on the wheel', s0.ch === 'project' && !s0.A.pocketset && !s0.A.lance && s0.A.water === 0 && !s0.wheel.includes('pocketset') && !s0.wheel.includes('lance'), s0);

// ================================================================ Arthur's pocket set
const p1 = await ev(() => { const G = game; G.regions.ensure('house', 'test'); P.enter('house'); G.step(1.5); P.settle(); return { room: G.room?.id, hint: !!G.flags.e2_setHint, arthur: !!P.npc('arthur')?.present, propShown: !!G.story.kit2.set?.grp.visible }; });
const p1l = await said();
check('home in chapter 2 (WALK through the door): the set lies on the rug in Arthur\'s toy corner; Arthur (when home) calls out to it', p1.room === 'house' && p1.propShown && (!p1.arthur || (p1.hint && p1l.some((l) => /made you something/.test(l)))), { p1, p1l });
const p2 = await ev(() => { const G = game, S = G.story.kit2.set; const c0 = G.hero.clovers; const r = P.use(S.x, S.z, { kind: 'e2_set', near: 0.9 }); P.settle(); return { r: r.r, own: G.hero.arms.pocketset, prop: S.grp.visible, found: JSON.stringify(G.foundObj?.shown || []).includes('pocketset'), wheel: G.hero.combat.owned(), inv: G.inventory.items().map((i) => i.id), clovers: G.hero.clovers - c0 }; });
const p2l = await said();
check('the pocket set (WALK, E): Arthur explains it, or his note does; found box; on the wheel and in the inventory', p2.own && !p2.prop && p2.found && p2.wheel.includes('pocketset') && p2.inv.includes('pocketset') && p2l.some((l) => /cellar hums|HUMS IN THE CELLAR/i.test(l)), { p2, p2l });
const p3 = await ev(() => { const G = game; const r = P.use(G.story.kit2.set.x, G.story.kit2.set.z, { kind: 'e2_set', near: 0.9 }); P.settle(); return { r: r.r, tg: P.target()?.kind || null, own: G.hero.arms.pocketset }; });
check('…taken once: no second prompt for it', p3.tg !== 'e2_set' && p3.own, p3);

// ---- its lesson: the cellar
const c1 = await ev(() => { const G = game, h = G.hero; G.regions.ensure('cellar', 'test'); P.enter('cellar'); P.settle(); const K = G.story.kit2.tin;
  h.combat.equip('ball', true); P.go(K.x - 0.9, K.z, { tol: 0.35 }); P.face(K.x, K.z); G.step(0.3);
  return { room: G.room?.id, prompt: P.target()?.kind || null, sense: G.gadgets.tools.sense, needle: G.gadgets.tools.needle.visible }; });
check('the cellar without the set in hand: no tile to lift, no whistle, no needle (nothing shows the tin)', c1.room === 'cellar' && c1.prompt !== 'e2_tin' && !c1.sense && !c1.needle, c1);
const c2 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools, K = G.story.kit2.tin; const r = T.useItem('pocketset'); G.step(0.3);
  const held = { r, weapon: h.combat.weapon, model: !!G.weapons.models.pocketset?.visible, inHand: G.weapons.models.pocketset?.parent?.name || '' };
  const far = (() => { P.go(K.x - 8.5, K.z - 6.5, { tol: 0.6 }); const p0 = TL.stats.pips; G.step(4); return { k: TL.sense ? +TL.sense.k.toFixed(2) : null, pips: TL.stats.pips - p0 }; })();
  const near = (() => { P.go(K.x - 0.7, K.z - 0.4, { tol: 0.35 }); const p0 = TL.stats.pips; G.step(4); const N = TL.needle, a = Math.atan2(N.position.x - h.pos.x, N.position.z - h.pos.z), want = Math.atan2(K.x - h.pos.x, K.z - h.pos.z);
    return { k: TL.sense ? +TL.sense.k.toFixed(2) : null, pips: TL.stats.pips - p0, needle: N.visible, off: +Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))).toFixed(3), prompt: P.target()?.kind || null }; })();
  return { held, far, near }; });
check('the set in hand (INVENTORY, E): held in Twinsen\'s right hand', c2.held.r === 'used' && c2.held.weapon === 'pocketset' && c2.held.model && /hand/i.test(c2.held.inHand), c2.held);
check('tuned: it whistles faster close to the hum than across the cellar, and the needle at his feet points to it', c2.far.k != null && c2.near.k > c2.far.k + 0.4 && c2.near.pips >= c2.far.pips * 2 && c2.near.needle && c2.near.off < 0.2, c2);
await ev(() => { const G = game, h = G.hero, K = G.story.kit2.tin; h.angle = Math.atan2(K.x - h.pos.x, K.z - h.pos.z) + 0.6; G.step(0.1); });
await snap('eq2-1-pocketset-cellar').catch(() => {});
const c3 = await ev(() => { const G = game, h = G.hero, K = G.story.kit2.tin; const k0 = h.clovers, c0 = h.coins; const r = P.use(K.x, K.z, { kind: 'e2_tin', near: 1.0 }); P.settle(); G.step(0.3);
  return { r: r.r, tin: !!G.flags.e2_tin, clovers: h.clovers - k0, coins: h.coins - c0, sense: G.gadgets.tools.sense, needle: G.gadgets.tools.needle.visible, journal: G.story.journal().flatMap((j) => j.lines).filter((l) => l.key === 'e2_j_set') }; });
const c3l = await said();
check('…the tile lifted (E): Twinsen\'s old tin, a clover (once); the hum is gone, the journal line done', c3.tin && (c3.clovers === 1 || c3.coins === 10) && !c3.sense && !c3.needle && c3.journal[0]?.done && c3l.some((l) => /old hiding place/.test(l)), { c3, c3l });
const c4 = await ev(() => { const G = game; const K = G.story.kit2.tin; P.go(K.x - 0.7, K.z, { tol: 0.35 }); P.face(K.x, K.z); G.step(0.2); return { prompt: P.target()?.kind || null }; });
check('…and no second tin', c4.prompt !== 'e2_tin', c4);

// ================================================================ Bram's pump lance
iso('The Old Pump solved by its flags (its own test: tests/townlife.mjs)');
const b1 = await ev(() => { const G = game, f = G.flags; P.enter('house'); P.enter('citadel'); Object.assign(f, { l_pumpAsk: true, l_needPliers: true, l_pliers: true, l_pin: true, l_strokes: 3, l_pump: true }); G.story.life.applyFlags(); P.settle();
  const r = P.talk('bram'); return { r: r.r, thanks: !!f.l_bramThanks, A: T.A(), owed: f.l_oweClover || 0, found: JSON.stringify(G.foundObj?.shown || []).includes('lance') }; });
const b1l = await said();
check('Bram\'s thanks after The Old Pump (TALK): his clover, then his spare pump: the lance, its tank full (8)', b1.thanks && b1.A.lance && b1.A.water === 8 && b1.found && b1l.some((l) => /spare pump/.test(l)) && b1l.some((l) => /stop-cock/.test(l)), { b1, b1l });
const b2 = await ev(() => { const G = game, h = G.hero, cl = () => h.clovers + (G.flags.l_oweClover || 0); const k0 = cl(), w0 = h.arms.water; P.settle(); const r = P.talk('bram'); return { r: r.r, lance: h.arms.lance, water: h.arms.water - w0, clovers: cl() - k0, owed: G.flags.l_oweClover || 0 }; });
const b2l = await said();
check('…talked to again: no second lance, no second clover (the first one counted whether picked up or still owed)', b2.lance && b2.water === 0 && b2.clovers === 0 && !b2l.some((l) => /spare pump/.test(l)), { b2, b2l });

// ---- the wheel's small slots (the stick between down and a lower diagonal)
const w1 = await ev(() => { const G = game, h = G.hero, H = G.hud; const mv = (deg) => ({ move: () => ({ x: Math.sin(deg * Math.PI / 180), y: Math.cos(deg * Math.PI / 180) }), wheelSteps: 0 });
  const pick = (deg) => { H.wselOpen = false; H.weaponSelect(true, h, mv(deg)); const w = H.wselPick; H.weaponSelect(false, h, mv(deg)); return w; };
  const at157 = pick(157.5), at202 = pick(202.5);
  const slots = [...document.querySelectorAll('#wsel .slot')].map((s) => s.dataset.dir);
  return { at157, at202, slots, weapon: h.combat.weapon }; });
check('the weapon wheel: the pocket set and the lance in small slots beside the pulse tool (stick at 157.5° / 202.5°); the eight old slots stay', w1.at157 === 'pocketset' && w1.at202 === 'lance' && w1.slots.length === 10, w1);

// ---- its lesson: the lane's stop-cock, too hot to touch
const v1 = await ev(() => { const G = game, V = G.story.kit2.valve; G.hero.combat.equip('ball', true); const r = P.use(V.x, V.z, { kind: 'e2_valve', near: 1.0 }); P.settle(); return { r: r.r, open: !!G.flags.e2_valve, journal: G.story.journal().flatMap((j) => j.lines).map((l) => l.key) }; });
const v1l = await said();
check('Bram\'s stop-cock by the heat pipe (WALK, E): too hot to touch; the journal keeps it', !v1.open && v1l.some((l) => /Too hot|Hot as a kettle/.test(l)) && v1.journal.includes('e2_j_valve'), { v1, v1l });
const v2 = await ev(() => { const G = game, h = G.hero, V = G.story.kit2.valve, TL = G.gadgets.tools; const r = T.useItem('lance'); G.step(0.3);
  P.face(V.x, V.z); const w0 = h.arms.water; P.tap('KeyK', 0.12); const spraying = TL.sprays.length; G.step(0.5);
  return { r, weapon: h.combat.weapon, model: !!G.weapons.models.lance?.visible, level: +G.weapons.models.lance.userData.level.scale.y.toFixed(3), used: w0 - h.arms.water, cool: G.story.kit2.valveCool > 0, story: TL.stats.story, spraying, toast: T.toasts(), ammo: document.querySelector('#weapon .ammo')?.textContent }; });
check('the lance in hand (INVENTORY, E); a jet at the stop-cock (K): it hisses and cools; one jet of eight spent; the HUD shows 7/8 and the sight-tube drops', v2.r === 'used' && v2.weapon === 'lance' && v2.model && v2.used === 1 && v2.cool && v2.story >= 1 && v2.spraying === 1 && v2.ammo === '7/8' && v2.level < 0.9 && /cools/.test(v2.toast), v2);
await ev(() => { const G = game, h = G.hero, V = G.story.kit2.valve; P.go(V.x + 1.3, V.z + 0.4, { tol: 0.3 }); P.face(V.x, V.z); G.camRig.recenter?.(); G.step(1.2); G.gadgets.tools.jetCool = 0; P.tap('KeyK', 0.1); });
await snap('eq2-2-lance-valve').catch(() => {});
const v3 = await ev(() => { const G = game, h = G.hero, V = G.story.kit2.valve; const c0 = h.coins; const r = P.use(V.x, V.z, { kind: 'e2_valve', near: 1.0 }); P.settle(); return { r: r.r, open: !!G.flags.e2_valve, coins: h.coins - c0, owes: !!G.flags.e2_bramOwes, water: V.water.visible }; });
const v3l = await said();
if (v3.owes) { await ev(() => { P.talk('bram'); }); }
const v3b = await ev(() => ({ coins: game.hero.coins, owes: !!game.flags.e2_bramOwes }));
check('…cooled, it turns (E): Bram\'s basin fills; 5 kashes from Bram (once)', v3.open && v3.water && (v3.coins === 5 || (v3.owes && !v3b.owes)) && v3l.some((l) => /turns/.test(l)), { v3, v3l, v3b });
const v4 = await ev(() => { const G = game, h = G.hero, V = G.story.kit2.valve; const c0 = h.coins; P.use(V.x, V.z, { kind: 'e2_valve', near: 1.0 }); P.settle(); P.face(V.x, V.z); P.tap('KeyK', 0.6); return { coins: h.coins - c0, open: !!G.flags.e2_valve }; });
check('…open for good: no second reward, a jet at it does nothing more', v4.coins === 0 && v4.open, v4);
const f1 = await ev(() => { const G = game, h = G.hero, L = G.world.life; h.arms.water = 3; const r = P.use(L.trough.x + 0.75, L.trough.z, { kind: 'e2_fill', near: 0.6 }); P.settle(); return { r: r.r, water: h.arms.water, fills: G.gadgets.tools.stats.fills, toast: T.toasts() }; });
check('filled at Bram\'s trough (WALK, E): 8 jets again', f1.water === 8 && f1.fills >= 1 && /Tank filled/.test(f1.toast), f1);
const f2 = await ev(() => { const G = game, h = G.hero; h.arms.water = 0; G.gadgets.tools.jetCool = 0; G.step(0.2); const j0 = G.gadgets.tools.stats.jets; P.tap('KeyK', 0.3); return { water: h.arms.water, jets: G.gadgets.tools.stats.jets - j0, toast: T.toasts(), cool: document.querySelector('#weapon .ready')?.classList.contains('cool') }; });
check('an empty tank: no jet, it says so, the weapon pill greys', f2.water === 0 && f2.jets === 0 && /tank is empty/.test(f2.toast) && f2.cool, f2);
const f3 = await ev(() => { const G = game, h = G.hero, V = G.story.kit2.valve; const r = P.use(V.basin.x, V.basin.z, { kind: 'e2_fill', near: 0.9 }); P.settle(); return { r: r.r, water: h.arms.water }; });
check('…and Bram\'s basin, full now, is water to fill from too', f3.water === 8, f3);

// ---- its second chapter-2 use: Nell's coupler, glowing on the bench
iso('the coupler is put on Nell\'s bench by its state (The Mislabelled Shipment\'s own test: tests/townlife.mjs)');
const n1 = await ev(() => { const G = game, f = G.flags, LF = G.story.life, L = G.world.life, C = L.shop.coupler, W = L.shop.work; Object.assign(f, { l_crateAsk: true, l_crateOpen: true }); LF.cs = 'hand'; L.crate.setState('open');
  P.go(W.x, W.z, { tol: 0.3 }); P.settle(); G.hero.angle = W.a; LF.cs = 'bench'; LF.heat = 0; C.setVisible(true);
  P.face(C.x, C.z); P.tap('KeyK', 0.3); const early = { cs: LF.cs, toast: T.toasts() }; P.settle();
  LF.heat = 0.7; G.step(0.6); P.face(C.x, C.z); P.tap('KeyK', 0.3); P.settle();
  return { early, cs: LF.cs, coupler: !!f.l_coupler, jet: !!f.e2_couplerJet }; });
const n1l = await said();
check('Nell\'s coupler on the bench: still cold, a jet only runs off; glowing, one jet settles it where it stands (the barrel\'s dip not needed)', n1.early.cs === 'bench' && /isn't hot yet/.test(n1.early.toast) && n1.cs === 'done' && n1.coupler && n1.jet && n1l.some((l) => /settles right there/.test(l)), { n1, n1l });

// ================================================================ Save & quit → Continue
const before = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('e2_'))), weapon: game.hero.weapon }));
const keep = path.join(os.tmpdir(), 'equip2-save-' + process.pid + '.json');
await quitAndKeep(page, context, keep);
await open(page, '?nocine'); await menu(page, 'continue'); await helpers();
const after = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('e2_'))), weapon: game.hero.weapon, held: game.hero.combat.weapon, basin: !!game.story.kit2.valve?.water.visible }));
check('Save & quit → Continue: both tools, the tank, the lessons\' flags and the tool in hand kept; the basin stays full', JSON.stringify(before.A) === JSON.stringify(after.A) && JSON.stringify(before.flags) === JSON.stringify(after.flags) && after.weapon === before.weapon && after.held === 'lance' && after.basin && after.A.pocketset && after.A.lance, { before, after });
try { fs.unlinkSync(keep); } catch { /* */ }

// ================================================================ the fights, in the developer arena (never saved)
await ev(() => { const G = game; G.devArena(); P.settle();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.AR = {
    E,
    only(ids, at = [6194, 8], a = 0) { for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); } const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.mp = h.mpMax; h.invuln = 0; h.hurtT = 0; h.actT = 0; G.resetCombat(); G.combatDir.grace = 0; G.state = 'play'; G.targeting.release(); },
    put(id, x, z, a = 0) { const e = E(id); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); if (e.state === 'dead') { e.state = e.def.kind === 'gdog' ? 'guard' : 'patrol'; e.hp = e.maxHp; e.rig.root.visible = true; } e.frozenT = 0; e.deafT = 0; e.sync?.(); return e; },
  };
});
const d1 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only(['a_drone', 'a_gdog'], [6194, 8], Math.PI / 2); const d = AR.put('a_drone', 6200, 8, -Math.PI / 2), dog = AR.put('a_gdog', 6197, 10.5); d.hp = d.maxHp; dog.state = 'guard';
  h.combat.equip('pocketset', true); TL.squealCool = 0;
  d.state = 'chase'; d.stateT = 0; d.coolT = 0; G.step(0.3); const wound = d.state;
  G.bolts.clear?.(); const b0 = G.bolts.list.length; P.tap('KeyK', 0.05);
  const deaf = +(d.deafT || 0).toFixed(2), st = d.state, dogSt = dog.state; let fired = 0, winds = 0; const a0 = d.angle; let turn = 0;
  for (let i = 0; i < 150; i++) { G.step(1 / 60); if (d.state === 'windup') winds++; turn = Math.max(turn, Math.abs(Math.atan2(Math.sin(d.angle - a0), Math.cos(d.angle - a0)))); }
  fired = G.bolts.list.length - b0;
  const t0 = TL.stats.squeals; G.step(0.2); P.tap('KeyK', 0.05); const again = TL.stats.squeals - t0, coolNow = +TL.squealCool.toFixed(2);
  let after = false; for (let i = 0; i < 180 && !after; i++) { G.step(1 / 60); after = d.state === 'windup' || G.bolts.list.length > b0; }
  return { wound, deaf, st, dogSt, dogNow: dog.state, fired, winds, turn: +turn.toFixed(2), again, after, cool: coolNow, n: TL.lastSqueal?.n, hp: d.hp === d.maxHp }; });
check('the pocket set\'s squeal (K) at a drone 6 m off: it loses its aim for 3 s — no wind-up, no shot, its head wanders — and takes no damage', d1.deaf > 2.9 && d1.st !== 'windup' && d1.winds === 0 && d1.fired === 0 && d1.turn > 0.5 && d1.n === 1 && d1.hp, d1);
check('…the guard dog (an animal) beside it doesn\'t mind; the squeal needs 8 s before the next; after 3 s the drone aims again', d1.dogSt === d1.dogNow && d1.again === 0 && d1.cool > 5 && d1.after, d1);
const d2 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only(['a_guard'], [6194, 8], Math.PI / 2); const gu = AR.put('a_guard', 6196.5, 8, -Math.PI / 2); gu.state = 'patrol'; gu.hp = gu.maxHp;
  h.combat.equip('lance', true); h.arms.water = 8; TL.jetCool = 0; G.step(0.1); const x0 = gu.pos.x; P.tap('KeyK', 0.05); G.step(0.8);
  return { pushed: +(gu.pos.x - x0).toFixed(2), hp: gu.hp === gu.maxHp, water: h.arms.water }; });
check('the lance (K) at a guard 2.5 m off: pushed about 3 m back, no damage', d2.pushed > 2.6 && d2.pushed < 3.3 && d2.hp && d2.water === 7, d2);
const d3 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only(['a_guard'], [6197, 0], Math.PI / 2); const gu = AR.put('a_guard', 6199.6, 0, -Math.PI / 2); gu.state = 'patrol'; gu.hp = gu.maxHp; TL.jetCool = 0; G.step(0.1);
  // ~10 fps: one frame of 0.1 s at a time, the wall (x 6200.8–6201.2) 0.8 m behind him
  P.tap('KeyK', 0.02); let maxX = -1e9; for (let i = 0; i < 12; i++) { G.step(0.1, 0.1); maxX = Math.max(maxX, gu.pos.x); }
  return { maxX: +maxX.toFixed(2), wallFace: 6200.8 }; });
check('…at 10 fps against a wall: the push stops at the wall (collision decides; no tunnelling)', d3.maxX < d3.wallFace, d3);
const d4 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only(['a_mite'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6197, 8); m.state = 'chase'; m.hp = m.maxHp; TL.jetCool = 0; G.step(0.05);
  const p0 = m.pos.clone(); P.tap('KeyK', 0.05); const fz = +(m.frozenT || 0).toFixed(2); G.step(1.5); const still = +m.pos.distanceTo(p0).toFixed(2); const bit = h.hp < h.maxHp;
  G.step(1.2); const moved = +m.pos.distanceTo(p0).toFixed(2);
  return { fz, still, bit, moved, hp: m.hp === m.maxHp, frozen: TL.stats.frozen }; });
check('the lance at a crystal mite: frozen in place for 2 s (no bite), then it moves again; no damage', d4.fz > 1.9 && d4.still < 0.15 && !d4.bit && d4.moved > 0.3 && d4.hp, d4);
// interruption: a jet in the air and a push under way, then a scene change; the needle out of play
const i1 = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only(['a_guard'], [6194, 8], Math.PI / 2); const gu = AR.put('a_guard', 6196.5, 8, -Math.PI / 2); gu.state = 'patrol'; TL.jetCool = 0; G.step(0.1);
  P.tap('KeyK', 0.02); const mid = { sprays: TL.sprays.length, pushes: TL.pushes.length }; G.resetCombat(); const x = gu.pos.x; G.step(0.5);
  return { mid, after: { sprays: TL.sprays.length, pushes: TL.pushes.length }, still: +Math.abs(gu.pos.x - x).toFixed(2) }; });
check('interrupted (a scene change mid-jet): the spray and the push end at once', i1.mid.sprays === 1 && i1.mid.pushes === 1 && i1.after.sprays === 0 && i1.after.pushes === 0, i1);
// performance: the tools' own frame cost with the set listening and a jet spraying, and the draw calls they add
const pf = await ev(() => { const G = game, h = G.hero, TL = G.gadgets.tools; AR.only([], [6194, 8], Math.PI / 2);
  const calls = () => { let c = 0; for (let i = 0; i < 3; i++) { G.renderer.renderer.info.reset(); G.renderer.render(); c = G.renderer.renderer.info.render.calls; } return c; };
  h.combat.equip('fists', true); G.step(0.2); const c0 = calls(); const hadLaser = h.arms.laser; h.arms.laser = true; h.combat.equip('laser', true); G.step(0.2); const cL = calls(); h.arms.laser = hadLaser; h.combat.equip('lance', true); G.step(0.2); TL.jetCool = 0; h.arms.water = 8; P.tap('KeyK', 0.02); const c1 = calls();
  const t0 = performance.now(); for (let i = 0; i < 2000; i++) TL.update(1 / 60); const ms = (performance.now() - t0) / 2000;
  return { callsFists: c0, callsLaser: cL, callsLanceSpraying: c1, updateMs: +ms.toFixed(4) }; });
console.log('  perf (SwiftShader; renderer.info; tools.update averaged over 2000 calls): ' + JSON.stringify(pf));
check('performance: the lance in hand, spraying, draws no more than the laser pistol in hand (+1, the spray\'s shared particle pool); the tools\' update costs under 0.05 ms', pf.callsLanceSpraying <= pf.callsLaser + 1 && pf.updateMs < 0.05, pf);

// ================================================================ an old save, from before EQUIP-2a
await ev(() => { const G = game, s = JSON.parse(localStorage.getItem('lba3_save_v1')); for (const k of ['pocketset', 'lance', 'water']) delete s.hero.arms[k]; for (const k of Object.keys(s.flags)) if (k.startsWith('e2_')) delete s.flags[k]; s.hero.weapon = 'lance'; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); void G; });
await page.evaluate(() => game.reloadInto('continue'));
await page.waitForEvent('load', { timeout: 300000 }).catch(() => {});
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'loading', null, { timeout: 300000 });
await page.evaluate(() => { game.testFreeze = true; game.step(0.5); });
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/player.js', import.meta.url)) });
await helpers(); await said();
const o1 = await ev(() => ({ state: game.state, A: T.A(), held: game.hero.combat.weapon, wheel: game.hero.combat.owned(), thanks: !!game.flags.l_bramThanks }));
check('an old save without the tools continues: neither owned, the tank empty, the hand falls back to a weapon it has', o1.state === 'play' && !o1.A.pocketset && !o1.A.lance && o1.A.water === 0 && !['pocketset', 'lance'].includes(o1.held) && !o1.wheel.includes('lance'), o1);
const o2 = await ev(() => { const G = game, h = G.hero; const k0 = h.clovers; if (G.room) { P.enter('house'); P.enter('citadel'); } const r = P.talk('bram'); return { r: r.r, lance: h.arms.lance, water: h.arms.water, clovers: h.clovers - k0 }; });
const o2l = await said();
check('…Bram, thanks long said, gives the lance on the next talk (no second clover)', o2.lance && o2.water === 8 && o2.clovers === 0 && o2l.some((l) => /meant to give you this/.test(l)), { o2, o2l });

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
