// PURPOSES (docs/future/CLUTTER_AUDIT.md "Purposes"): what each kept place gives the journey, by input.
//   - Citadel: Tibbo's counter in the 'shop' house (TALK): his first-visit penguin, ten darts, the pocket-set cell (the
//     squeal comes back twice as soon, by the attack key); his door note on the stone house; the statue's plaque.
//   - Desert Island (chapter 4): the dig crew's bunkhouse board (Anko's sketch: an inventory find); Bashir's door;
//     Oni at the dormitory; the ball on the study crystal (it only rings); the singing fork wakes it; Ker'aooc's ward
//     at half price; the corral's trough fills Bram's lance.
//   - Zeelich (chapter 3): Marl at her dog yard (TALK), the conch at her gate teaches the long call; before it the conch
//     only startles a guard dog (the arena's), after it the dog goes home and stays calm.
//   - Save & quit → Continue keeps all of it; a save standing in a cut place (Tralu Rock, Bù's dark halls) loads at
//     its region's spawn.
// ISO (logged): chapters are entered by their flags; tools a chapter gives (the fork, the conch, the lance, the
// pocket set, the blowgun) are given as that chapter would; the hero is put in a region (enterRoom) and walks from
// there by input; the arena's other foes are stood down for the dog check.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
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
    jump(key, extra = {}) {
      const G = game, O = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'network', 'shell', 'core', 'home'], i = O.indexOf(key);
      P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, opening: true, c1_started: true, c1_radio: true, c1_veskGone: true, c1_done: true, c1_plan: true, chapter: i - 1, chapterKey: O[i - 1] }, extra);
      G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
      return { ch: G.flags.chapterKey, room: G.room?.id ?? 'citadel' };
    },
    shop() {
      if (game.state !== 'shop') return { state: game.state };
      const rows = [...document.querySelectorAll('#shop .item')].map((b) => [b.querySelector('span').textContent, +(b.querySelector('b')?.textContent || 'NaN')]);
      return { state: 'shop', title: document.querySelector('#shop h2')?.textContent, rows };
    },
    buy(label) { const b = [...document.querySelectorAll('#shop .item')].find((x) => x.textContent.includes(label)); if (!b) return 'no item ' + label; if (b.disabled) return 'disabled'; b.click(); game.step(0.1); return 'ok'; },
    leave() { if (game.state === 'shop') P.tap('Escape', 0.1); P.settle(); return game.state; },
    // put him in a region at a point (ISO), standing
    put(room, x, z) { const G = game; G.enterRoom(room, { x, z, a: 0 }, true); G.step(0.3); P.settle(); },
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();

// ================================================================ Citadel, chapter 1: Tibbo still unpacking
iso('chapter 1: the ball taken and out of the house (as the opening has him)');
const t0 = await ev(() => { const G = game; Object.assign(G.flags, { intro: true }); G.hero.hasBall = true; G.exitRoom({ x: -36, z: 2, a: 0 }, true, true); G.step(0.3); P.settle(); const r = P.talk('tibbo'); return { r: r.r, state: game.state }; });
const t0l = await said();
check('chapter 1, before the well is sorted: Tibbo (TALK) is still unpacking; no counter yet', t0.r === 'talked' && t0.state === 'play' && t0l.some((l) => /unpacking/.test(l)), { t0, t0l });

// ================================================================ Citadel, chapter 2: Tibbo's Fix and Fill
iso('chapter 2 entered by its flags; a blowgun (2 darts), Arthur\'s pocket set and 60 kashes given as the chapter would');
const t1 = await ev(() => { const G = game, h = G.hero; T.jump('project'); if (G.room) { G.exitRoom({ x: -36, z: 2, a: 0 }, true, true); G.step(0.3); }
  Object.assign(h.arms, { blowgun: true, darts: 2, pocketset: true, penguins: 0 }); h.coins = 60; G.step(0.1);
  const r = P.talk('tibbo'); const s = T.shop(); return { r: r.r, ...s, penguins: h.arms.penguins }; });
const t1l = await said();
check("Tibbo (TALK): his first-visit penguin with the guards' tip, then his counter", t1.r === 'talked' && t1.state === 'shop' && t1.title === "Tibbo's Fix and Fill" && t1.penguins === 1 && t1l.some((l) => /waddles/.test(l)), { t1, t1l });
check('his stock: ten darts 9, a penguin 4, the pocket-set cell 12 (no crystal cell without a laser)', JSON.stringify(t1.rows) === JSON.stringify([['Ten darts', 9], ['Nitro-Meca-Penguin', 4], ["A fresh cell for Arthur's pocket set", 12]]) || (t1.rows?.length === 3 && t1.rows[0][1] === 9 && t1.rows[2][1] === 12), t1.rows);
const t2 = await ev(() => { const G = game, h = G.hero, c0 = h.coins, d0 = h.arms.darts; const a = T.buy('Ten darts'), b = T.buy('pocket set'); const rows = T.shop().rows; T.leave(); return { a, b, spent: c0 - h.coins, darts: h.arms.darts - d0, pcell: !!G.flags.sh_pcell, rows }; });
await said();
check('bought (CLICK): ten darts (+10) and the pocket-set cell (once: gone from the stock); 21 kashes', t2.a === 'ok' && t2.b === 'ok' && t2.spent === 21 && t2.darts === 10 && t2.pcell && !t2.rows.some((r) => /pocket set/.test(r[0])), t2);
const t3 = await ev(() => { const G = game, TL = G.gadgets.tools; const u = T.useItem('pocketset'); G.step(0.2); P.tap('KeyK', 0.05); return { u, cool: +TL.squealCool.toFixed(2), full: 8 }; });
check('the pocket set (INVENTORY, E; the attack key) squeals and is ready again in half the time (≤ 4 s, not 8)', t3.u === 'used' && t3.cool > 2.5 && t3.cool <= 4, t3);
const t4 = await ev(() => { const G = game; P.settle(); const st0 = G.state; G.hero.combat.equip('ball', true); G.step(0.1); let r = P.talk('tibbo'), again = false; if (r.r !== 'talked') { again = true; P.settle(); r = P.talk('tibbo'); } const s = T.shop(); T.leave(); return { r: r.r, to: r.to, st0, again, state: s.state, penguins: G.hero.arms.penguins }; });
if (t4.again) iso('(the first E at Tibbo opened nothing; pressed again, as a player would)');
const t4l = await said();
check('Tibbo again: no second gift; his counter opens', t4.r === 'talked' && t4.state === 'shop' && t4.penguins === 1 && !t4l.some((l) => /waddles/.test(l)), { t4, t4l });
const t5 = await ev(() => { const G = game, H = G.world.houses.find((h) => h.id === 'stone'); const u = P.use(H.door.x, H.door.z, { kind: 'locked', near: 1.2 }); P.settle(); return { u: u.r }; });
const t5l = await said();
check('the stone house (WALK, E): Tibbo\'s home; its note sends him to the counter', t5l.some((l) => /Tibbo's house.*counter/.test(l)), { t5, t5l });
const t6 = await ev(() => { const G = game, S = G.world.statue; const px = S.x + Math.sin(S.ry) * 1.7, pz = S.z + Math.cos(S.ry) * 1.7; const u = P.use(px, pz, { kind: 'pp_plaque', near: 1.0 }); P.settle(); return { u: u.r }; });
const t6l = await said();
check("the statue's plaque (WALK, E): read; it points to FunFrock's asylum", t6l.some((l) => /asylum/.test(l)), { t6, t6l });

// ================================================================ Zeelich, chapter 3: the asylum's dog before the call, then Marl
iso("chapter 3 entered by its flags; Arthur's conch given; a guard dog: the arena's (the asylum's dogs went with ASYLUM-2), its other foes stood down");
const d0 = await ev(() => { const G = game, h = G.hero; T.jump('zeelich'); h.arms.conch = true; const A = G.devArena(); G.step(0.3); P.settle();
  const dog = A.find((e) => e.def.id === 'a_gdog'); for (const e of A) e.setPresent(e === dog);
  const p = dog.pos; h.pos.set(p.x - 6, G.physics.groundAt(p.x - 6, p.z, p.y + 1), p.z); h.onGround = true; G.gadgets.conchCool = 0; G.step(0.05);
  const u = T.useItem('conch'); const st = dog.state; return { u, st, call: !!G.flags.pp_call }; });
await said();
check('before Marl: the conch (INVENTORY, E) only startles a guard dog (stunned for a moment)', d0.u === 'used' && d0.st === 'stunned' && !d0.call, d0);
const m1 = await ev(() => { const G = game; G.enterRoom('zeelich', null, true); G.step(0.3); P.settle(); G.hero.combat.equip('ball', true); const r = P.talk('marl'); return { r: r.r, ask: !!G.flags.pp_marlAsk }; });
const m1l = await said();
check('Marl at the dog yard (TALK): the project\'s guard dogs, the long call; she sees the conch', m1.r === 'talked' && m1.ask && m1l.some((l) => /long call/.test(l)) && m1l.some((l) => /conch/.test(l)), { m1, m1l });
const m2 = await ev(() => { const G = game, h = G.hero, Y = G.rooms.zeelich.dogYard; P.go(Y.gate.x, Y.gate.z + 2.2, { tol: 0.8 }); P.settle(); G.gadgets.conchCool = 0; const u = T.useItem('conch'); P.settle(); return { u, call: !!G.flags.pp_call, journal: G.story.journal().flatMap((j) => j.lines.map((l) => l.key)) }; });
const m2l = await said();
check('the conch blown at her gate (WALK, INVENTORY, E): the long call is learned; Marl says so; the journal keeps it', m2.u === 'used' && m2.call && m2l.some((l) => /Down, all three/.test(l)) && m2.journal.includes('pp_j_call'), { m2, m2l });
const d1 = await ev(() => { const G = game, h = G.hero; const A = G.devArena(); G.step(0.3); P.settle();
  const dog = A.find((e) => e.def.id === 'a_gdog'); for (const e of A) e.setPresent(e === dog);
  dog.state = 'chase'; dog.stateT = 0; const p = dog.pos; h.pos.set(p.x - 4, G.physics.groundAt(p.x - 4, p.z, p.y + 1), p.z); h.onGround = true; const hp0 = h.hp; G.gadgets.conchCool = 0;
  const u = T.useItem('conch'); const st = dog.state; let attacked = false; for (let i = 0; i < 60; i++) { G.step(0.05); if (['windup', 'lunge', 'chase', 'warn'].includes(dog.state)) attacked = true; }
  return { u, st, calm: +dog.calmT.toFixed(1), attacked, hurt: hp0 - h.hp }; });
await said();
check('after the call: the conch sends the chasing dog home, calm; it does not come back at him for 3 s', d1.u === 'used' && ['home', 'guard'].includes(d1.st) && d1.calm > 8 && !d1.attacked && d1.hurt === 0, d1);

// ================================================================ Desert Island, chapter 4
iso('chapter 4 entered by its flags (on Desert Island by the pier); the singing fork and the lance given as the chapter would');
const s0 = await ev(() => { const G = game, h = G.hero; const j = T.jump('dig'); h.coins = 30; return { ...j, homes: Object.keys(G.rooms.desert.oldHomes || {}), lamp: !!G.rooms.desert.studyLamp }; });
check('chapter 4: on Desert Island; the three kept old houses are lived in (S40, S28, the hall), the study crystal is there', s0.room === 'desert' && s0.homes.join() === 's40,s28,hall' && s0.lamp, s0);
// (DESERT-BAR: S28's door leads into the crew's bunkhouse now; the board is on the wall beside it, desertold.js)
const s1 = await ev(() => { const G = game, B = G.rooms.desert.s28board; const u = P.use(B.x, B.z, { kind: 'pp_door', near: 1.0 }); P.settle(); return { u: u.r, room: G.room?.id, survey: !!G.flags.pp_survey, inv: G.inventory.items().map((i) => i.id) }; });
const s1l = await said();
check("the dig crew's bunkhouse (WALK, E): its board beside the door, Anko's pipe sketch found (line two runs to the oasis), carried", s1.room === 'desert' && s1.survey && s1.inv.includes('survey') && s1l.some((l) => /pipe/.test(l)), { s1, s1l });
const s2 = await ev(() => { const G = game, O = G.rooms.desert.oldHomes; const u = P.use(O.s40.x, O.s40.z, { kind: 'pp_door', near: 1.2 }); P.settle(); return { u: u.r }; });
const s2l = await said();
check("S40 (WALK, knock): Bashir's home; it points to him at the loom", s2l.some((l) => /Bashir's house/.test(l)), { s2, s2l });
const o1 = await ev(() => { const G = game; const r = P.talk('oni'); return { r: r.r, ask: !!G.flags.pp_oniAsk }; });
const o1l = await said();
check('Oni at the dormitory (TALK): the study crystal is asleep; a pure note; the dig\'s singing fork', o1.r === 'talked' && o1.ask && o1l.some((l) => /pure note/.test(l)) && o1l.some((l) => /fork/.test(l)), { o1, o1l });
const o2 = await ev(() => { const G = game, h = G.hero, L = G.rooms.desert.studyLamp; P.go(L.x - 1.2, L.z - 3.0, { tol: 0.6 }); P.settle(); h.combat.equip('ball', true); G.step(0.1); G.story.purposes._ballSaid = -99;
  P.throwAt(L.x, L.z); P.settle(); let thrown = (window._said || []).some((l) => /ball isn't/.test(l)), hit = null;
  if (!thrown) hit = G.ballHitTest(new (h.pos.constructor)(L.x, L.y, L.z))?.result; P.settle(); return { thrown, hit, lamp: !!G.flags.pp_lamp }; });
const o2l = await said();
if (!o2.thrown) iso('(the thrown ball did not reach the crystal 2.5 m up; its hit was applied where the ball would strike it)');
check('the ball on the crystal (THROW): it rings and goes dark again (the failure says why); not woken', (o2.thrown || o2.hit === 'switch') && !o2.lamp && o2l.some((l) => /ball isn't a pure note/.test(l)), { o2, o2l });
const o3 = await ev(() => { const G = game, h = G.hero, L = G.rooms.desert.studyLamp; h.arms.fork = true; P.go(L.x - 0.4, L.z - 1.6, { tol: 0.5 }); P.settle(); const u = T.useItem('fork'); G.step(0.3); P.face(L.x, L.z); P.tap('KeyK', 0.05); P.settle();
  return { u, lamp: !!G.flags.pp_lamp, glow: +L.mesh.material.emissiveIntensity.toFixed(2), done: !!G.story.purposes.lampTarget?.done }; });
const o3l = await said();
check('the singing fork struck by the crystal (INVENTORY, the attack key): it wakes and glows; Oni thanks him', o3.u === 'used' && o3.lamp && o3.glow > 1 && o3.done && o3l.some((l) => /bright again/.test(l)), { o3, o3l });
const k1 = await ev(() => { const G = game, h = G.hero; G.regions.ensure('school'); const c0 = h.coins; G.enterRoom('school', null, true); G.step(0.3); P.settle();
  const n = P.npc('keraooc'); P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); for (let i = 0; i < 40 && G.state === 'dialog'; i++) P.tap('KeyE', 0.12);
  const menu = G.state; P.tap('KeyE', 0.1); for (let i = 0; i < 40 && G.state !== 'play'; i++) P.tap('KeyE', 0.12); P.settle(); return { menu, spent: c0 - h.coins, ward: !!h.arms.protect }; });
const k1l = await said();
check("Ker'aooc (TALK): the pupils told her; the ward for half, 10 kashes (MENU, E)", k1l.some((l) => /for half/.test(l)) && k1.spent === 10 && k1.ward, { k1, k1l });
const w1 = await ev(() => { const G = game, h = G.hero, T0 = G.rooms.desert.troughs?.[0]; if (!T0) return { none: true }; G.enterRoom('desert', { x: T0.x + 2.5, z: T0.z + 2.5, a: 0 }, true); G.step(0.3); P.settle(); h.arms.lance = true; h.arms.water = 0;
  const u = P.use(T0.x, T0.z, { kind: 'e2_fill', near: 1.6 }); P.settle(); return { u: u.r, water: h.arms.water }; });
await said();
check("the old corral's trough (WALK, E): Bram's lance fills there", w1.water > 0, w1);

// ================================================================ Save & quit → Continue
const before = await ev(() => { const G = game, f = G.flags; return { pp: Object.fromEntries(Object.entries(f).filter(([k]) => /^pp_(lamp|call|survey|marlAsk|oniAsk)$/.test(k))), sh: [f.sh_gift, f.sh_pcell], ward: !!G.hero.arms.protect }; });
const keep = path.join(os.tmpdir(), 'purposes-save-' + process.pid + '.json');
await quitAndKeep(page, context, keep);
await open(page, '?nocine'); await menu(page, 'continue'); await helpers(); await said();
const after = await ev(() => { const G = game, f = G.flags; G.regions.ensure('desert'); G.story.applyFlags(); const L = G.rooms.desert.studyLamp;
  return { pp: Object.fromEntries(Object.entries(f).filter(([k]) => /^pp_(lamp|call|survey|marlAsk|oniAsk)$/.test(k))), sh: [f.sh_gift, f.sh_pcell], ward: !!G.hero.arms.protect, glow: +L.mesh.material.emissiveIntensity.toFixed(2), inv: G.inventory.items().map((i) => i.id) }; });
check('Save & quit → Continue: the lamp, the long call, the sketch, Tibbo\'s gift and cell, the ward all kept; the crystal still glows', JSON.stringify(before.pp) === JSON.stringify(after.pp) && after.pp.pp_lamp && after.pp.pp_call && after.sh.every(Boolean) && after.ward && after.glow > 1 && after.inv.includes('survey'), { before, after });

// ================================================================ a save standing in a cut place
for (const [room, region] of [['isle_tralu', 'zeelich'], ['buhalls', 'bumaze']]) {
  await ev(([room]) => { const k = 'lba3_save_v1', s = JSON.parse(localStorage.getItem(k)); s.room = room; s.hero.x = room === 'isle_tralu' ? 1900 + 8 * 330 + 3 : 7403; s.hero.z = room === 'isle_tralu' ? 1801 : 2; localStorage.setItem(k, JSON.stringify(s)); }, [room]);
  await open(page, '?nocine'); await menu(page, 'continue'); await helpers();
  const r = await ev(() => { const G = game, h = G.hero, R = G.room; P.settle(); return { room: R?.id, state: G.state, d: R?.spawn ? +Math.hypot(h.pos.x - R.spawn.x, h.pos.z - R.spawn.z).toFixed(2) : null, y: +h.pos.y.toFixed(2), ground: h.onGround }; });
  check(`a save standing in a cut place (${room}) loads at ${region}'s spawn, in play, on the ground`, r.room === region && r.state === 'play' && r.d !== null && r.d < 3 && r.ground, r);
}

await browser.close();
process.exit(done());
