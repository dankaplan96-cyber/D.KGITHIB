// EQUIP-2b: Ilka's singing fork, the Esmer line, the heat flask (src/game/tools.js, story/kit2b.js). Each tool found by
// input (a purchase at Nara's case; a talk with Ilka, with Tashi), taught by its lesson (the cloud canal; Ilka's niche
// by the warm crack; the frozen winch), used in a puzzle (a crate hauled, a crust cracked and a crystal woken, the winch
// thawed — the chapter going on without the fuse — and later the mill's ring, the galleries' wheel, the monks' frozen
// chest) and in a fight (in the developer arena: mites and a crawler stagger, a sentry's guard drops for one hit; a mite
// and a drone hauled in, a guard too heavy, a sentry's shield yanked aside; 2 damage in front within 2.5 m, ice double),
// its limits (5 s between strikes, 14 m, a cold flask, the heat fading), the line's reel checked at 10 fps, interrupted,
// saved mid-reel; all kept through Save & quit → Continue; an old save without them loads with none (Nara's gift in
// chapter 9 then; nothing given twice).
// ISO (logged): chapters are entered by their flags (each has its own test); a hit after the fork's note is applied by
// its own call (ballHit); the fights are in the developer arena (never saved). Screenshots go to EQ2_SHOTS.
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
    jump(key, extra = {}) {
      const G = game, O = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'network', 'shell', 'core', 'home'], i = O.indexOf(key);
      P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, opening: true, c1_started: true, c1_radio: true, c1_veskGone: true, c1_done: true, c1_plan: true, chapter: i - 1, chapterKey: O[i - 1] }, extra);
      G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
      return { ch: G.flags.chapterKey, room: G.room?.id ?? 'citadel' };
    },
    K: () => game.story.kit2b, TL: () => game.gadgets.tools,
    reel(maxT = 6, dt = 1 / 30) { const G = game, TL = G.gadgets.tools; let t = 0; while (t < maxT && (TL.zip || TL.cord) && G.state === 'play') { G.step(dt, dt); t += dt; } return +t.toFixed(2); },
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();

// ================================================================ the Esmer line (chapter 3, Zeelich)
iso('chapters are entered by their flags (each has its own test)');
const l0 = await ev(() => { const r = T.jump('zeelich'); const G = game; return { ...r, A: T.A(), canal: !!T.K().canal, items: G.story.arsenal.shopItems('zeelich').map((i) => i.id + ':' + i.price) }; });
check('chapter 3 on Zeelich: no line yet; Nara\'s case offers it (25 kashes); the old cloud canal is built at the island\'s edge', l0.ch === 'zeelich' && l0.room === 'zeelich' && !l0.A.line && l0.items.includes('line:25') && l0.canal, l0);
const l1 = await ev(() => { const G = game, h = G.hero, C = G.story.arsenal.case; h.coins = 40;
  const r = P.use(C.x, C.z, { kind: 'a_case', near: 1.2 }); const shop = G.state; const items = [...document.querySelectorAll('#shop .item')].map((e) => e.textContent);
  const i = [...document.querySelectorAll('#shop .item')].findIndex((e) => /Esmer line/.test(e.textContent)); const pick = P.menuPick(i);
  P.tap('Escape', 0.2); P.settle(); G.step(0.5); P.settle();
  return { r: r.r, shop, items: items.length, i, pick: pick.r, coins: h.coins, A: T.A(), found: JSON.stringify(G.foundObj?.shown || []).includes('line'), wheel: h.combat.owned(), inv: G.inventory.items().map((x) => x.id), toast: T.toasts(), again: G.story.arsenal.shopItems('zeelich').some((x) => x.id === 'line') }; });
const l1l = await said();
check('Nara\'s case (WALK, E, pick): the line bought for 25; found box; on the wheel and in the inventory; not offered again', l1.shop === 'shop' && l1.i >= 0 && l1.coins === 15 && l1.A.line && l1.found && l1.wheel.includes('line') && l1.inv.includes('line') && !l1.again, { l1, l1l });
const l2 = await ev(() => { const G = game, C = G.story.arsenal.case; const r = P.use(C.x, C.z, { kind: 'a_case', near: 1.2 }); const st = G.state; P.tap('Escape', 0.2); P.settle(); return { r: r.r, st, tip: !!G.flags.e2b_tip, nara: !!P.npc('nara')?.present }; });
const l2l = await said();
check('…at her case again, Nara (when there) says where to try it: the old cloud canal', !l2.nara || (l2.tip && l2l.some((x) => /cloud canal/.test(x))), { l2, l2l });
// ---- its lesson: the cloud canal
const c1 = await ev(() => { const G = game, h = G.hero, C = T.K().canal; const r = P.use(C.sign.x, C.sign.z, { kind: 'e2b_sign', near: 0.9 });
  P.go(C.S.x, C.S.z, { tol: 0.35 }); P.settle(); const u = T.useItem('line'); G.step(0.3);
  // no way over the cloud on foot: walking straight out stops at the edge
  const y0 = h.pos.y; for (let i = 0; i < 60; i++) { G.physics.move(h, C.dx * 0.15, C.dz * 0.15); G.step(1 / 60); }
  const edge = { d: +Math.hypot(h.pos.x - C.L.x, h.pos.z - C.L.z).toFixed(2), y: +h.pos.y.toFixed(2), y0 };
  P.go(C.S.x, C.S.z, { tol: 0.35 }); P.settle();
  return { r: r.r, u, weapon: h.combat.weapon, model: !!G.weapons.models.line?.visible, edge, targets: T.K().lineTargets().map((x) => x.id) }; });
const c1l = await said();
check('the cloud canal (WALK, E): its sign; the line in hand (INVENTORY, E); walking out stops at the edge — the mooring rock is across the cloud', c1.u === 'used' && c1.weapon === 'line' && c1.model && c1l.some((x) => /CLOUD CANAL/.test(x)) && c1.edge.d > 2.5 && Math.abs(c1.edge.y - c1.edge.y0) < 0.1 && c1.targets.includes('canalL'), { c1, c1l });
const c2 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); P.face(C.L.x, C.L.z); const z0 = TL.stats.zips; P.tap('KeyK', 0.03);
  const out = { cord: !!TL.cordMesh.visible || !!TL.cord }; G.step(0.25); out.zip = !!TL.zip; out.air = !h.onGround; out.save = G.snapshot().hero; out.lastSafe = { ...G.lastSafe };
  return out; });
await snap('eq2b-1-line-canal').catch(() => {});
const c2b = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); const t = T.reel(); P.settle(); return { t, on: T.K().onLanding(), ground: h.onGround, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), zips: TL.stats.zips, flag: !!G.flags.e2b_canal }; });
const c2l = await said();
check('a cast at the ring over the rock (K): the cord flies, catches and reels him across the cloud; mid-reel a save keeps him on the ground he left', c2.cord && c2.zip && c2.air && Math.hypot(c2.save.x - c2.lastSafe.x, c2.save.z - c2.lastSafe.z) < 0.01 && c2b.on && c2b.ground && c2b.flag && c2l.some((x) => /cord holds/.test(x)), { c2, c2b, c2l });
const c3 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); const k0 = h.clovers, m0 = h.coins; P.face(C.K.x, C.K.z); TL.castCool = 0; P.tap('KeyK', 0.03); T.reel(); for (let i = 0; i < 40; i++) G.step(1 / 30); P.settle();
  const got = { clovers: h.clovers - k0, coins: h.coins - m0, flag: !!G.flags.e2b_crate, things: TL.stats.things };
  TL.castCool = 0; P.face(C.K.x, C.K.z); const t0 = TL.stats.things, m1 = TL.stats.missed; P.tap('KeyK', 0.03); T.reel(); P.settle();
  return { ...got, again: TL.stats.things - t0, missed: TL.stats.missed - m1, coins2: h.coins - m0 }; });
const c3l = await said();
check('…from the rock, the crate on the further rock (K): it comes along the cord to his feet and cracks open: a clover and 12 kashes, once', c3.flag && c3.things >= 1 && ((c3.clovers === 1 && c3.coins === 12) || (c3.clovers === 0 && c3.coins === 22)) && c3.again === 0 && c3.missed === 1 && c3.coins2 === c3.coins && c3l.some((x) => /cracks open/.test(x)), { c3, c3l });
const c4 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); TL.castCool = 0; P.face(C.S.x, C.S.z); P.tap('KeyK', 0.03); T.reel(); P.settle(); return { on: T.K().onLanding(), d: +Math.hypot(h.pos.x - C.S.x, h.pos.z - C.S.z).toFixed(2), ground: h.onGround }; });
check('…and the ring at the shore reels him back (K)', !c4.on && c4.d < 0.3 && c4.ground, c4);
// ---- the reel at 10 fps: the route's every step outside anything solid; then an interrupted reel; then the odd save
const c5 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(), PH = G.physics; TL.castCool = 0; P.face(C.L.x, C.L.z); P.tap('KeyK', 0.02);
  let t = 0, solid = 0, maxStep = 0, prev = h.pos.clone();
  while (t < 6 && (TL.zip || TL.cord)) { G.step(0.1, 0.1); t += 0.1; if (PH.solidAt(h.pos.x, h.pos.z, h.pos.y + 1.0, 0.15)) solid++; maxStep = Math.max(maxStep, h.pos.distanceTo(prev)); prev = h.pos.clone(); if (G.state !== 'play') P.settle(); }
  return { on: T.K().onLanding(), solid, maxStep: +maxStep.toFixed(2), ground: h.onGround }; });
check('at 10 fps the reel lands him on the rock; never inside anything solid on the way', c5.on && c5.solid === 0 && c5.ground, c5);
const c6 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); TL.castCool = 0; P.face(C.S.x, C.S.z); P.tap('KeyK', 0.02); G.step(0.3);
  const mid = { zip: !!TL.zip, air: !h.onGround }; G.resetCombat(); const after = { zip: !!TL.zip, cord: !!TL.cord, cordShown: TL.cordMesh.visible };
  for (let i = 0; i < 150 && !(h.onGround && h.pos.y > 1); i++) G.step(1 / 30); P.settle();
  return { mid, after, ground: h.onGround, y: +h.pos.y.toFixed(2), safe: Math.abs(h.pos.y - C.y) < 0.6 }; });
check('interrupted mid-reel (a scene change): the cord and the reel end at once; he falls and is put back on firm ground', c6.mid.zip && !c6.after.zip && !c6.after.cord && !c6.after.cordShown && c6.ground && c6.safe, c6);
const c7 = await ev(() => { const G = game, h = G.hero, C = T.K().canal, TL = T.TL(); if (!T.K().onLanding()) { TL.castCool = 0; P.go(C.S.x, C.S.z, { tol: 0.35 }); P.face(C.L.x, C.L.z); P.tap('KeyK', 0.02); T.reel(); P.settle(); }
  const on = T.K().onLanding(); h.arms.line = false; G.step(0.3); const after = T.K().onLanding(); const d = Math.hypot(h.pos.x - C.S.x, h.pos.z - C.S.z); h.arms.line = true; h.combat.equip('line', true); G.step(0.1);
  return { on, after, d: +d.toFixed(2) }; });
check('an odd save on the mooring rock without the line (as if loaded so): he is put back on the shore', c7.on && !c7.after && c7.d < 0.3, c7);
// ---- its later use: the old mill's gallery (the stair-stones stay)
const m1 = await ev(() => { const G = game, h = G.hero, K = T.K(), R = K.mill.ringT, mt = G.rooms.zeelich.millTop, TL = T.TL(); const cx = mt.x, cz = mt.z - 3.3;
  // (from the tower's far side the tower is in the way: the cord holds, he stays)
  P.go(cx + Math.sin(1.8) * 7, cz + Math.cos(1.8) * 7, { tol: 0.6 }); P.settle(); P.face(R.x, R.z); TL.castCool = 0; const b0 = TL.stats.blocked, z0 = TL.stats.zips; P.tap('KeyK', 0.02); T.reel(); P.settle();
  const blocked = { b: TL.stats.blocked - b0, z: TL.stats.zips - z0, y: +h.pos.y.toFixed(2), toast: T.toasts() };
  P.go(cx + Math.sin(4.9) * 8.5, cz + Math.cos(4.9) * 8.5, { tol: 0.5 }); P.settle(); P.face(R.x, R.z); TL.castCool = 0; P.tap('KeyK', 0.02); T.reel(); P.settle();
  return { blocked, y: +h.pos.y.toFixed(2), top: mt.y, ground: h.onGround, flag: !!G.flags.e2b_millUp }; });
const m1l = await said();
check('the old mill: from the gallery\'s far side the tower blocks the route (it says so, he stays); below the davit\'s ring one cast pulls him up onto the gallery', (m1.blocked.b === 1 || m1.blocked.z === 0) && m1.blocked.y < 7 && Math.abs(m1.y - m1.top) < 0.1 && m1.ground && m1.flag && m1l.some((x) => /one pull/.test(x)), { m1, m1l });

// ================================================================ Ilka's singing fork (chapter 4, The Dig)
const f0 = await ev(() => { const r = T.jump('dig'); const G = game, f = G.flags; Object.assign(f, { c4_pumpTask: true, c4_pump: true, c4_trust: true, c4_ilka: true, c4_notebook: true }); G.story.applyFlags(); G.story.refreshCast(); P.settle(); return { ...r, fork: T.A().fork, ilka: !!P.npc('ilka')?.present, niche: !!T.K().niche }; });
check('chapter 4: Ilka has her notebook back and waits at the dig; no fork yet; her old niche is by the warm crack', f0.ch === 'dig' && f0.ilka && !f0.fork && f0.niche, f0);
const f1 = await ev(() => { const G = game; const r = P.talk('ilka'); return { r: r.r, A: T.A(), found: JSON.stringify(G.foundObj?.shown || []).includes('fork'), wheel: G.hero.combat.owned() }; });
const f1l = await said();
const fi = f1l.findIndex((x) => /niche is by the warm crack/.test(x));
check('Ilka (TALK): she trusts him now: her singing fork; found box; then what the chapter has her say', f1.A.fork && f1.found && f1.wheel.includes('fork') && fi >= 0 && fi < f1l.length - 1, { f1, f1l });
const f2 = await ev(() => { const G = game; const r = P.talk('ilka'); return { r: r.r, fork: T.A().fork }; });
const f2l = await said();
check('…talked to again: no second fork', f2.fork && !f2l.some((x) => /singing fork/.test(x)), { f2, f2l });
const f3 = await ev(() => { const G = game, h = G.hero, f = G.flags, N = T.K().niche, D = G.rooms.desert.dig; f.c4_digOpen = true; G.story.applyFlags(); G.story.refreshCast(); G.step(0.2);
  const fx = N.x + Math.sin(N.face) * 1.7, fz = N.z + Math.cos(N.face) * 1.7; let r;
  for (let k = 0; k < 4 && Math.hypot(h.pos.x - fx, h.pos.z - fz) > 1.0; k++) { r = P.go(fx, fz, { tol: 0.6, maxT: 120 }); P.settle(); }
  const walked = Math.hypot(h.pos.x - fx, h.pos.z - fz) < 1.0;
  if (!walked) { h.pos.set(fx, G.physics.groundAt(fx, fz, D.bottomY + 1), fz); h.onGround = true; G.step(0.2); P.settle(); }
  h.combat.equip('ball', true); const u = P.use(N.x, N.z, { kind: 'e2b_niche', near: 1.5 });
  return { r: r?.r, walked, u: u.r, y: +h.pos.y.toFixed(2), bottom: D.bottomY, crust: !!f.e2b_crust }; });
const f3l = await said();
if (!f3.walked) iso('(the walk down the terraces did not reach the niche in time; placed in front of it)');
check('down to the bottom of the dig (WALK): the niche by the warm crack, crusted over (E: its line; nothing cracks by hand)', Math.abs(f3.y - f3.bottom) < 0.4 && !f3.crust && f3l.some((x) => /warm crystal|crack it/.test(x)), { f3, f3l });
const f4 = await ev(() => { const G = game, h = G.hero, f = G.flags, N = T.K().niche, TL = T.TL(); const u = T.useItem('fork'); G.step(0.3); P.face(N.x, N.z);
  const r0 = TL.stats.rings; P.tap('KeyK', 0.05); P.settle(); const first = { crust: !!f.e2b_crust, crustShown: N.crust.visible, lamp: !!f.e2b_lamp, rings: TL.stats.rings - r0, cool: +TL.forkCool.toFixed(2) };
  P.tap('KeyK', 0.05); P.settle(); const early = { rings: TL.stats.rings - r0, lamp: !!f.e2b_lamp };
  const dark = P.use(N.x, N.z, { kind: 'e2b_niche', near: 1.5 }).r;
  G.step(5.2); P.face(N.x, N.z); P.tap('KeyK', 0.05); P.settle();
  return { u, weapon: h.combat.weapon, model: !!G.weapons.models.fork?.visible, first, early, dark, lamp: !!f.e2b_lamp, glow: +N.sleeper.material.emissiveIntensity.toFixed(2), tin: N.tin.visible }; });
const f4l = await said();
check('the fork in hand (INVENTORY, E); struck (K): the crust sings and falls away; struck again at once: still ringing, nothing (5 s)', f4.u === 'used' && f4.weapon === 'fork' && f4.model && f4.first.crust && !f4.first.crustShown && f4.first.rings === 1 && f4.first.cool > 4 && f4.early.rings === 1 && !f4.early.lamp, f4);
check('…too dark inside (E); after 5 s a second strike wakes the sleeping crystal: a lamp, and the tin in its light', f4l.some((x) => /Too dark/.test(x)) && f4.lamp && f4.glow > 1 && f4.tin && f4l.some((x) => /wakes and glows/.test(x)), { f4, f4l });
await snap('eq2b-2-fork-niche').catch(() => {});
const f5 = await ev(() => { const G = game, h = G.hero, N = T.K().niche; const k0 = h.clovers, m0 = h.coins; const u = P.use(N.x, N.z, { kind: 'e2b_niche', near: 1.5 }); const got = { clovers: h.clovers - k0, coins: h.coins - m0 };
  P.face(N.x, N.z); G.step(0.2); const again = P.target()?.kind === 'e2b_niche'; return { u: u.r, got, again, flag: !!G.flags.e2b_dtin, journal: G.story.journal().flatMap((j) => j.lines).filter((l) => l.key === 'e2b_j_niche') }; });
const f5l = await said();
check('…Ilka\'s old tin (E): a clover (or 10 kashes with nine), once; the journal line done', f5.flag && (f5.got.clovers === 1 || f5.got.coins === 10) && !f5.again && f5.journal[0]?.done && f5l.some((x) => /FOR LUCK/.test(x)), { f5, f5l });

// ================================================================ the heat flask (chapter 6, The Pass)
const h0 = await ev(() => { const r = T.jump('pass', { c5_planned: true, c5_vent: true, c5_glider: true, c5_done: true }); const G = game, f = G.flags; Object.assign(f, { c6_started: true, c6_bridge: true, c6_lhar: true }); G.story.applyFlags(); G.story.refreshCast(); P.settle();
  const before = P.talk('lhar1'); return { ...r, before: before.r, flask: T.A().heatflask, frozen: G.rooms.hamalayi.lift.frozen, crack: !!T.K().crack }; });
const h0l = await said();
check('chapter 6 in Lhar: Tashi before Yorna has asked about the winch: only his own line; no flask yet', h0.ch === 'pass' && !h0.flask && h0.frozen && h0.crack && !h0l.some((x) => /heat flask/.test(x)), { h0, h0l });
const h1 = await ev(() => { const G = game; P.talk('yorna'); P.settle(); const r = P.talk('lhar1'); return { yorna: !!G.flags.c6_yorna, r: r.r, A: T.A(), found: JSON.stringify(G.foundObj?.shown || []).includes('heatflask'), wheel: G.hero.combat.owned() }; });
const h1l = await said();
check('…Yorna tells of the frozen winch (TALK); then Tashi, the smith (TALK): the heat flask from Baldino\'s radioed drawing; found box; on the wheel', h1.yorna && h1.A.heatflask && h1.A.heat === 0 && h1.found && h1.wheel.includes('heatflask') && h1l.some((x) => /Baldino/.test(x)) && h1l.some((x) => /minute and a half/.test(x)), { h1, h1l });
const h2 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); const u = T.useItem('heatflask'); G.step(0.3); const b0 = TL.stats.blasts; P.tap('KeyK', 0.1);
  return { u, weapon: h.combat.weapon, model: !!G.weapons.models.heatflask?.visible, blasts: TL.stats.blasts - b0, cold: TL.stats.cold, toast: T.toasts(), ammo: document.querySelector('#weapon .ammo')?.textContent, grey: document.querySelector('#weapon .ready')?.classList.contains('cool') }; });
check('the flask in hand (INVENTORY, E), cold: the attack key only clicks (it says so, the pill greys)', h2.u === 'used' && h2.weapon === 'heatflask' && h2.model && h2.blasts === 0 && h2.cold >= 1 && /flask is cold/.test(h2.toast) && h2.grey && h2.ammo === '—', h2);
const h3 = await ev(() => { const G = game, h = G.hero, cr = T.K().crack; const u = P.use(cr.x, cr.z, { kind: 'e2b_draw', near: 1.5 }); G.step(0.2);
  const full = { heat: +h.arms.heat.toFixed(1), toast: T.toasts(), ammo: document.querySelector('#weapon .ammo')?.textContent, glow: +G.weapons.models.heatflask.userData.cell.material.emissiveIntensity.toFixed(2) };
  h.arms.heat = 1.0; G.step(1.4); const faded = { heat: h.arms.heat, toast: T.toasts(), glow: G.weapons.models.heatflask.userData.cell.material.emissiveIntensity };
  P.use(cr.x, cr.z, { kind: 'e2b_draw', near: 1.5 }); G.step(0.2);
  return { u: u.r, full, faded, again: +h.arms.heat.toFixed(1) }; });
check('the steam crack by the falls (WALK, E: draw heat): 90 s of heat, the cell glows, the HUD counts it; let fade, it goes cold and says so; drawn again', h3.full.heat > 89 && /90 s/.test(h3.full.toast) && h3.full.glow > 1 && /^\d+s$/.test(h3.full.ammo) && h3.faded.heat === 0 && /gone cold/.test(h3.faded.toast) && h3.faded.glow === 0 && h3.again > 89, h3);
const h4 = await ev(() => { const G = game, h = G.hero, f = G.flags, M = G.rooms.hamalayi, W = M.lift.winch, TL = T.TL(); const t0 = G.time;
  // (a free spot 2.2 m from the winch's ice, on the lift's level)
  const PH = G.physics, ix = W.x, iz = W.z - 1.0; let sx = ix - 2.2, sz = iz;
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, x = ix + Math.sin(a) * 2.2, z = iz + Math.cos(a) * 2.2, gy = PH.groundAt(x, z, M.lift.y0 + 1); if (Math.abs(gy - M.lift.y0) < 0.4 && !PH.blockedAt(x, z, gy, 0.5) && Math.hypot(x - M.lift.pad.x, z - M.lift.pad.z) > 2.2) { sx = x; sz = z; break; } }
  const r = P.go(sx, sz, { tol: 0.5 }); P.settle(); P.face(ix, iz); const took = +(G.time - t0).toFixed(1), heat = +h.arms.heat.toFixed(1);
  P.tap('KeyK', 0.1); const blast = { story: TL.lastBlast?.story, heat: h.arms.heat }; G.step(1.5); P.settle();
  return { r: r.r, took, heat, blast, thawed: !!f.c6_thawed, frozen: M.lift.frozen, fuse: !!f.c6_heat, flag: !!f.e2b_flaskWinch, obj: document.querySelector('#pause-objective')?.textContent || '' }; });
const h4l = await said();
check('…carried to the frozen winch on foot (WALK, well within 90 s) and let out at its ice (K): it thaws — no fuse, no kite — and the chapter goes on', h4.took < 80 && h4.heat > 0 && h4.blast.story && h4.blast.heat === 0 && h4.thawed && !h4.frozen && !h4.fuse && h4.flag && h4l.some((x) => /winch is free/.test(x)), { h4, h4l });
await snap('eq2b-3-flask-winch').catch(() => {});
const h5 = await ev(() => { const G = game; P.talk('yorna'); P.settle(); return { lift: !!G.flags.c6_liftReady, sword: !!G.flags.c6_sword }; });
check('…Yorna then readies the lift (the main path goes on unchanged)', h5.lift && h5.sword, h5);
// ---- its later use: the monks' chest frozen into the ice by the monastery yard (chapter 7)
const h6 = await ev(() => { const r = T.jump('observatory', { c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true }); const G = game, h = G.hero, K = T.K(), H = K.chest, B = K.brazier, TL = T.TL();
  const look = P.use(H.x, H.z, { kind: 'e2b_chest', near: 1.3 }).r; const k0 = h.clovers, m0 = h.coins;
  h.arms.heat = 0; P.use(B.x, B.z, { kind: 'e2b_draw', near: 1.2 }); G.step(0.2); const drawn = +h.arms.heat.toFixed(1);
  h.combat.equip('heatflask', true); P.go(H.x + (B.x - H.x) * 0.45, H.z + (B.z - H.z) * 0.45, { tol: 0.4 }); P.face(H.x, H.z); P.tap('KeyK', 0.1); P.settle(); G.step(2); P.settle();
  const free = !!G.flags.e2b_chestFree, ice = H.ice.visible;
  const take = P.use(H.x, H.z, { kind: 'e2b_chest', near: 1.3 }).r; const got = { clovers: h.clovers - k0, coins: h.coins - m0 };
  P.face(H.x, H.z); G.step(0.2); const again = P.target()?.kind === 'e2b_chest';
  return { ...r, look, drawn, free, ice, take, got, again, flag: !!G.flags.e2b_chest }; });
const h6l = await said();
check('chapter 7, the monastery yard: a chest frozen into the ice (E); heat drawn at the monks\' brazier (E), let out at it (K): the ice runs off; opened (E): a clover and 10 kashes, once', h6.ch === 'observatory' && h6.drawn > 89 && h6.free && !h6.ice && h6.flag && ((h6.got.clovers === 1 && h6.got.coins === 10) || (h6.got.clovers === 0 && h6.got.coins === 20)) && !h6.again && h6l.some((x) => /frozen into the ice/.test(x)) && h6l.some((x) => /ice slumps/.test(x)), { h6, h6l });

// ================================================================ the fork's later use: the crystal galleries (chapter 11)
const g1 = await ev(() => { const r = T.jump('shell'); const G = game, h = G.hero; G.regions.ensure('underground', 'test'); G.step(0.2); const W = T.K().wheel;
  G.enterRoom('c3gallery', { x: W.x, z: W.z + 1.6, a: Math.PI }, true); G.step(0.5); P.settle(); const look = P.use(W.x, W.z, { kind: 'e2b_wheel', near: 1.2 }).r;
  h.combat.equip('fork', true); G.gadgets.tools.forkCool = 0; P.face(W.x, W.z); P.tap('KeyK', 0.05); P.settle(); G.step(2); P.settle();
  const m0 = h.coins; const take = P.use(W.x, W.z, { kind: 'e2b_wheel', near: 1.2 }).r; const got = h.coins - m0; G.step(0.2); const again = P.target()?.kind === 'e2b_wheel';
  return { ...r, room: G.room?.id, look, turned: !!G.flags.e2b_wheel, slab: +W.slab.position.y.toFixed(2), take, got, again }; });
const g1l = await said();
check('chapter 11, the crystal galleries: a slab with a stuck crystal wheel (E); struck (K): it turns, the slab sinks; Vesk\'s crew\'s tin (E): 20 kashes, once', g1.room === 'c3gallery' && g1.turned && g1.slab < -1.4 && g1.got === 20 && !g1.again && g1l.some((x) => /stuck fast/.test(x)) && g1l.some((x) => /wheel sings/.test(x)), { g1, g1l });

// ---- the wheel's small slots for the three
const w1 = await ev(() => { const G = game, h = G.hero, H = G.hud; const mv = (deg) => ({ move: () => ({ x: Math.sin(deg * Math.PI / 180), y: Math.cos(deg * Math.PI / 180) }), wheelSteps: 0 });
  const pick = (deg) => { H.wselOpen = false; H.weaponSelect(true, h, mv(deg)); const w = H.wselPick; H.weaponSelect(false, h, mv(deg)); return w; };
  const at = { 67.5: pick(67.5), 112.5: pick(112.5), 247.5: pick(247.5), 0: pick(0) };
  return { at, slots: [...document.querySelectorAll('#wsel .slot')].map((s) => s.dataset.dir) }; });
check('the weapon wheel: the line, the fork and the flask in small slots (stick at 67.5° / 112.5° / 247.5°); the ball keeps the top; 13 slots', w1.at[67.5] === 'line' && w1.at[112.5] === 'fork' && w1.at[247.5] === 'heatflask' && w1.at[0] === 'ball' && w1.slots.length === 13, w1);

// ================================================================ Save & quit → Continue
await ev(() => { const G = game; P.settle(); G.hero.combat.equip('heatflask', true); G.hero.arms.heat = 47; G.step(0.1); });
const before = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('e2b_'))), weapon: game.hero.weapon }));
const keep = path.join(os.tmpdir(), 'equip2b-save-' + process.pid + '.json');
await quitAndKeep(page, context, keep);
await open(page, '?nocine'); await menu(page, 'continue'); await helpers();
const after = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('e2b_'))), weapon: game.hero.weapon, held: game.hero.combat.weapon }));
const sameA = ['fork', 'line', 'heatflask'].every((k) => after.A[k] === true) && Math.abs(after.A.heat - before.A.heat) < 1;
check('Save & quit → Continue: the three tools, the flask\'s heat, the lessons\' flags and the tool in hand kept', sameA && JSON.stringify(before.flags) === JSON.stringify(after.flags) && after.held === 'heatflask', { before, after });
try { fs.unlinkSync(keep); } catch { /* */ }

// ================================================================ the fights, in the developer arena (never saved)
await ev(() => { const G = game; G.devArena(); P.settle();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.AR = {
    E,
    only(ids, at = [6194, 8], a = 0) { for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); } const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.mp = h.mpMax; h.invuln = 0; h.hurtT = 0; h.actT = 0; G.resetCombat(); G.combatDir.grace = 0; G.state = 'play'; G.targeting.release(); },
    put(id, x, z, a = 0) { const e = E(id); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); if (e.state === 'dead') { e.state = e.def.kind === 'gdog' ? 'guard' : 'patrol'; e.hp = e.maxHp; e.rig.root.visible = true; } e.frozenT = 0; e.ringT = 0; e.deafT = 0; e.hp = e.maxHp; e.sync?.(); return e; },
  };
});
const a1 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_mite', 'a_crawler'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6198, 8), c = AR.put('a_crawler', 6197, 11); m.state = 'chase'; c.state = 'chase';
  h.combat.equip('fork', true); TL.forkCool = 0; G.step(0.05); const pm = m.pos.clone(), pc = c.pos.clone(); P.tap('KeyK', 0.03);
  const rung = { m: +(m.ringT || 0).toFixed(2), c: +(c.ringT || 0).toFixed(2) }; let bit = false; const hp0 = h.hp;
  for (let i = 0; i < 80; i++) { G.step(1 / 60); } bit = h.hp < hp0; const still = { m: +m.pos.distanceTo(pm).toFixed(2), c: +c.pos.distanceTo(pc).toFixed(2) };
  G.step(0.5); const later = { m: +(m.ringT || 0).toFixed(2), mHp: m.hp === m.maxHp }; const r0 = TL.stats.rings; P.tap('KeyK', 0.03); const again = TL.stats.rings - r0;
  G.step(1.2); const moved = +m.pos.distanceTo(pm).toFixed(2);
  return { rung, still, bit, later, again, moved, cool: +TL.forkCool.toFixed(2) }; });
check('the fork (K) by a crystal mite and a crawler within 6 m: both shudder 1.5 s (no bite, they stay put, no damage); then the mite moves on; 5 s before the next note', a1.rung.m > 1.4 && a1.rung.c > 1.4 && a1.still.m < 0.15 && a1.still.c < 0.15 && !a1.bit && a1.later.m === 0 && a1.later.mHp && a1.again === 0 && a1.moved > 0.3 && a1.cool > 1, a1);
const a2 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_sentry'], [6194, 8], Math.PI / 2); const s = AR.put('a_sentry', 6197.5, 8, -Math.PI / 2); s.state = 'idle'; s.stateT = 0;
  const hp0 = s.hp; const blocked0 = s.ballHit({ damage: 1, charged: false }, s.pos.clone());   // (the shield turns a plain hit from the front)
  h.combat.equip('fork', true); TL.forkCool = 0; G.step(0.05); P.tap('KeyK', 0.03); const st = s.state, rung = !!s.rung;
  const first = s.ballHit({ damage: 1, charged: false }, s.pos.clone()), hp1 = s.hp, st1 = s.state;
  s.angle = Math.atan2(h.pos.x - s.pos.x, h.pos.z - s.pos.z); const second = s.ballHit({ damage: 1, charged: false }, s.pos.clone());
  return { blocked0, st, rung, first, lost: hp0 - hp1, st1, second }; });
iso('the hits after the note are the sentry\'s own ballHit calls (a thrown ball\'s result)');
check('…by a sentry (crystal cells in its armour): its guard drops (open); one frontal hit lands, then the guard is back and the next is turned', a2.blocked0 === 'blocked' && a2.st === 'open' && a2.rung && a2.first === 'hit' && a2.lost === 1 && a2.st1 === 'chase' && a2.second === 'blocked', a2);
const a3 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_mite'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6202, 8); m.state = 'idle';
  h.combat.equip('line', true); TL.castCool = 0; G.step(0.05); const d0 = +m.pos.distanceTo(h.pos).toFixed(2); P.tap('KeyK', 0.03); for (let i = 0; i < 70; i++) G.step(1 / 60);
  const d1 = +Math.hypot(m.pos.x - h.pos.x, m.pos.z - h.pos.z).toFixed(2); return { d0, d1, hauled: TL.stats.hauled, hp: m.hp === m.maxHp }; });
check('the line (K) at a mite 8 m off: hauled in to his feet (within the ball\'s and the glove\'s reach), no damage', a3.d0 > 7.5 && a3.d1 < 2.4 && a3.hauled >= 1 && a3.hp, a3);
const a4 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_drone'], [6194, 8], Math.PI / 2); const d = AR.put('a_drone', 6203, 8, -Math.PI / 2); d.state = 'patrol';
  TL.castCool = 0; G.step(0.05); const d0 = +Math.hypot(d.pos.x - h.pos.x, d.pos.z - h.pos.z).toFixed(2); P.tap('KeyK', 0.03); let d1 = d0;
  for (let i = 0; i < 80; i++) { G.step(1 / 60); d1 = Math.min(d1, +Math.hypot(d.pos.x - h.pos.x, d.pos.z - h.pos.z).toFixed(2)); }
  return { d0, d1, hauled: TL.stats.hauled }; });
check('…at a drone 9 m off: hauled in too (a light machine)', a4.d0 > 8.5 && a4.d1 < 4, a4);
const a5 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_guard'], [6194, 8], Math.PI / 2); const g = AR.put('a_guard', 6200, 8, -Math.PI / 2); g.state = 'patrol';
  TL.castCool = 0; G.step(0.05); const p0 = g.pos.clone(); const k0 = TL.stats.heavy; P.tap('KeyK', 0.03); for (let i = 0; i < 40; i++) G.step(1 / 60);
  return { heavy: TL.stats.heavy - k0, moved: +Math.hypot(g.pos.x - p0.x, g.pos.z - p0.z).toFixed(2), toast: T.toasts() }; });
check('…at a guard (a person in armour): too heavy, the cord only twangs (it says so)', a5.heavy === 1 && /Too heavy/.test(a5.toast), a5);
const a6 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_sentry'], [6194, 8], Math.PI / 2); const s = AR.put('a_sentry', 6199, 8, -Math.PI / 2); s.state = 'idle'; s.openFor = 0; s.rung = false;
  TL.castCool = 0; G.step(0.05); P.tap('KeyK', 0.03); for (let i = 0; i < 20; i++) G.step(1 / 60); const st = s.state; const r = s.ballHit({ damage: 1, charged: false }, s.pos.clone()); return { st, r, yanked: TL.stats.yanked }; });
check('…at a sentry: its shield yanked aside (open: a frontal hit lands)', a6.st === 'open' && a6.r === 'hit' && a6.yanked >= 1, a6);
const a7 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_mite'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6210.5, 8); m.state = 'idle';
  TL.castCool = 0; G.step(0.05); const p0 = m.pos.clone(), x0 = TL.stats.missed, k0 = TL.stats.hauled; P.tap('KeyK', 0.03); for (let i = 0; i < 30; i++) G.step(1 / 60); return { missed: TL.stats.missed - x0, hauled: TL.stats.hauled - k0, moved: +Math.hypot(m.pos.x - p0.x, m.pos.z - p0.z).toFixed(2) }; });
check('…at a mite 16.5 m off: out of the line\'s 14 m: nothing caught (it only walks on as a mite does)', a7.missed === 1 && a7.hauled === 0 && a7.moved < 1.5, a7);
const a8 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_mite'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6201, 8); m.state = 'idle';
  TL.castCool = 0; G.step(0.05); P.tap('KeyK', 0.02); for (let i = 0; i < 9; i++) G.step(1 / 60); const mid = { hauls: TL.hauls.length, cord: !!TL.cord }; G.resetCombat(); const x = m.pos.x; G.step(0.3);
  return { mid, after: { hauls: TL.hauls.length, cord: !!TL.cord, shown: TL.cordMesh.visible }, still: +Math.abs(m.pos.x - x).toFixed(2) }; });
check('interrupted mid-haul (a scene change): the cord and the haul end at once', a8.mid.cord && a8.after.hauls === 0 && !a8.after.cord && !a8.after.shown, a8);
const a9 = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only(['a_crawler'], [6194, 8], Math.PI / 2); const c = AR.put('a_crawler', 6196, 8); c.state = 'idle';
  h.combat.equip('heatflask', true); h.arms.heat = 60; TL.blastCool = 0; G.step(0.05); let hp = c.hp; P.tap('KeyK', 0.03); const plain = hp - c.hp; G.step(0.8);
  c.def.ice = true; h.arms.heat = 60; TL.blastCool = 0; hp = c.hp; P.tap('KeyK', 0.03); const ice = hp - c.hp; delete c.def.ice; G.step(0.8);
  AR.put('a_crawler', 6198.2, 8); h.arms.heat = 60; TL.blastCool = 0; hp = c.hp; P.tap('KeyK', 0.03); const far = hp - c.hp; G.step(0.8);
  AR.put('a_crawler', 6192.5, 8); h.angle = Math.PI / 2; h.arms.heat = 60; TL.blastCool = 0; hp = c.hp; G.step(0.02); h.angle = Math.PI / 2; P.tap('KeyK', 0.03); const behind = hp - c.hp;
  return { plain, ice, far, behind, heat: h.arms.heat }; });
check('the flask (K) let out at a crawler 2 m in front: 2 damage; an ice creature 4; 4.2 m off nothing; behind him nothing; each blast spends the charge', a9.plain === 2 && a9.ice === 4 && a9.far === 0 && a9.behind === 0 && a9.heat === 0, a9);
// performance: the three tools' frame cost with the cord out and the flask warm, and the draw calls they add
const pf = await ev(() => { const G = game, h = G.hero, TL = T.TL(); AR.only([], [6194, 8], Math.PI / 2);
  const calls = () => { let c = 0; for (let i = 0; i < 3; i++) { G.renderer.renderer.info.reset(); G.renderer.render(); c = G.renderer.renderer.info.render.calls; } return c; };
  const had = h.arms.laser; h.arms.laser = true; h.combat.equip('laser', true); G.step(0.2); const cL = calls(); h.arms.laser = had;
  const per = {}; for (const w of ['fork', 'line', 'heatflask']) { h.combat.equip(w, true); h.arms.heat = 60; G.step(0.2); per[w] = calls(); }
  TL.castCool = 0; P.tap('KeyK', 0.02); G.step(0.05); const cCord = calls();
  const t0 = performance.now(); for (let i = 0; i < 2000; i++) TL.update(1 / 60); const ms = (performance.now() - t0) / 2000;
  return { callsLaser: cL, ...per, callsCordOut: cCord, updateMs: +ms.toFixed(4) }; });
console.log('  perf (SwiftShader; renderer.info; tools.update averaged over 2000 calls): ' + JSON.stringify(pf));
check('performance: each tool in hand draws no more than the laser pistol in hand +1 (the cord out: +2, its tube and tip); the tools\' update costs under 0.05 ms', pf.fork <= pf.callsLaser + 1 && pf.line <= pf.callsLaser + 1 && pf.heatflask <= pf.callsLaser + 1 && pf.callsCordOut <= pf.line + 2 && pf.updateMs < 0.05, pf);

// ================================================================ an old save, from before EQUIP-2b
await ev(() => { const s = JSON.parse(localStorage.getItem('lba3_save_v1')); for (const k of ['fork', 'line', 'heatflask', 'heat']) delete s.hero.arms[k]; for (const k of Object.keys(s.flags)) if (k.startsWith('e2b_')) delete s.flags[k]; s.hero.weapon = 'fork'; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); });
await page.evaluate(() => game.reloadInto('continue'));
await page.waitForEvent('load', { timeout: 300000 }).catch(() => {});
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'loading', null, { timeout: 300000 });
await page.evaluate(() => { game.testFreeze = true; game.step(0.5); });
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/player.js', import.meta.url)) });
await helpers(); await said();
const o1 = await ev(() => ({ state: game.state, A: T.A(), held: game.hero.combat.weapon, wheel: game.hero.combat.owned() }));
check('an old save without the three continues: none owned, no heat, the hand falls back to a weapon it has', o1.state === 'play' && !o1.A.fork && !o1.A.line && !o1.A.heatflask && o1.A.heat === 0 && !['fork', 'line', 'heatflask'].includes(o1.held) && !o1.wheel.includes('line'), o1);
const o2 = await ev(() => { const r = T.jump('council', { c8_started: true, c8_vesk: true, c8_done: true, c9_form: true, c9_nara: true }); const G = game; const t1 = P.talk('nara'); const A1 = T.A().line; const t2 = P.talk('nara'); return { ...r, t1: t1.r, A1, A2: T.A().line, found: JSON.stringify(G.foundObj?.shown || []).includes('line') }; });
const o2l = await said();
check('…in chapter 9, after her stamp, the line never bought: Nara gives it (TALK), once', o2.ch === 'council' && o2.A1 && o2.found && o2l.filter((x) => /Take this, from my case/.test(x)).length === 1, { o2, o2l });

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
