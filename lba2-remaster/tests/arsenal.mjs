// The arsenal (WPN-1): every weapon and gadget obtained by input (walking, talking, buying at a stall, E on a thing,
// the inventory), used by input (the weapon wheel, the attack key, E in the inventory), its effect measured, the
// ammunition and costs counted, everything kept through Save & quit → Continue, an old (format 3) save migrated.
// Sources: src/game/weapons.js, gadgets.js, story/arsenal.js.
// ISO (logged): chapters are reached by setting their flags (as the chapter tests do); kashes are given for the
// purchases; journeys between islands use the room switch the ferry/shuttle/glider use (their flights: their own
// tests); the effects are measured in the developer arena (?arena's yard, never saved), with enemies placed there.
// SwiftShader draw calls where the new models stand are printed (renderer.info; no GPU claim).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
// page-side helpers: talk to someone until their stall opens; buy by the item's label (a real click); leave
const helpers = () => ev(() => {
  window.T = {
    A: () => ({ ...game.hero.arms }),
    // walk to a person or thing, press E, and advance the lines until the shop (or play) comes
    toShop(x, z, kind) {
      const G = game;
      const r = kind ? P.use(x, z, { kind, near: 1.0 }) : null;
      void r;
      for (let i = 0; i < 80 && G.state === 'dialog'; i++) P.tap('KeyE', 0.12);
      return G.state;
    },
    talkShop(id) {
      const G = game, n = P.npc(id);
      P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z);
      P.tap('KeyE', 0.1);
      for (let i = 0; i < 80 && G.state === 'dialog'; i++) P.tap('KeyE', 0.12);
      return G.state;
    },
    buy(label) {
      const b = [...document.querySelectorAll('#shop .item')].find((x) => x.textContent.includes(label));
      if (!b) return 'no item ' + label;
      if (b.disabled) return 'disabled';
      b.click(); game.step(0.1); return 'ok';
    },
    leave() { if (game.state === 'shop') { P.tap('Escape', 0.1); } P.settle(); return game.state; },
    // the inventory by keys: open (Classic: Shift), move to the item, E
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
    // the weapon wheel: hold the weapons key (Classic: G), push the arrows toward the slot, let go
    wheel(dirs) {
      const G = game, I = G.input;
      I.keys.add('KeyG'); G.step(0.1);
      for (const d of dirs) I.keys.add(d);
      G.step(0.15);
      for (const d of dirs) I.keys.delete(d);
      I.keys.delete('KeyG'); G.step(0.1);
      return G.hero.combat.weapon;
    },
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();
iso('chapter 1 finished by flags (as tests/chapter1.mjs): chapter 2 begins on Citadel; 120 kashes given for the purchases');
await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, opening: true }); G.hero.hasBall = true; G.story.nextChapter(); P.settle(); G.hero.coins = 120; G.step(0.5); });

// ---- Pippa's stall (Citadel): blowgun, penguins, lantern
const p1 = await ev(() => { const st = T.talkShop('pippa'); const out = { st, items: [...document.querySelectorAll('#shop .item span')].map((s) => s.textContent) };
  out.b1 = T.buy('Blowgun'); out.b2 = T.buy('Meca-Penguin'); out.b3 = T.buy('Meca-Penguin'); out.b4 = T.buy('lantern'); out.b5 = T.buy('Three darts');
  out.left = T.leave(); out.A = T.A(); out.coins = game.hero.coins; return out; });
check('Pippa\'s stall (TALK, CLICK): her own stock, then the blowgun, the penguin and the lantern', p1.st === 'shop' && p1.items.some((s) => /Blowgun/.test(s)) && p1.items.some((s) => /lantern/i.test(s)) && p1.items.some((s) => /Magic/i.test(s) || /magic/.test(s)), p1);
check('bought: the blowgun with 6 darts (+3 bought = 9), two penguins, the lantern; 15+4+4+10+4 = 37 kashes spent', p1.A.blowgun && p1.A.darts === 9 && p1.A.penguins === 2 && p1.A.lantern && p1.coins === 120 - 37, p1);

// ---- Arthur's conch (house, E)
const c1 = await ev(() => { const S = game.story.arsenal.conch; const r = P.use(S.x, S.z, { kind: 'a_conch', near: 0.9 }); P.settle(); return { r: r.r, conch: game.hero.arms.conch, room: game.room?.id }; });
const c1l = await said();
check('Arthur\'s conch on the table by his radio (WALK, E): Arthur lends it, or his note does', c1.conch && c1l.some((l) => /DINO-FLY|Dino-Fly always answers/.test(l)), { c1, c1l });

// ---- the conch outdoors: the Dino-Fly answers, people look
const c2 = await ev(() => { const G = game; P.enter('citadel'); const df = G.scene.getObjectByName('dinofly'); P.go(df.position.x + 6, df.position.z + 2, { tol: 1.5 });
  const y0 = df.position.y; const r = T.useItem('conch'); let up = 0; for (let i = 0; i < 40; i++) { G.step(0.05); up = Math.max(up, df.position.y - y0); } P.settle(); return { r, up: +up.toFixed(2), last: G.gadgets.lastConch, cool: G.gadgets.conchCool > 0 }; });
check('the conch (INVENTORY, E) near the garden: the Dino-Fly lifts his head and rumbles', c2.r === 'used' && c2.up > 0.2 && c2.last?.dino, c2);
const c3 = await ev(() => { const G = game, n = P.npc('pippa'); P.go(n.pos.x + 3, n.pos.z + 3, { tol: 1.2 }); G.step(4.5); const r = T.useItem('conch'); G.step(0.2); const looks = G.npcs.filter((x) => x.present && x.listenTo === G.hero).map((x) => x.def.id); P.settle(); return { r, looks, last: G.gadgets.lastConch }; });
check('the conch in the street: people within earshot turn to look', c3.r === 'used' && c3.looks.length >= 1 && c3.last.folk >= 1, c3);

// ---- the house cellar: the gap in the old foundations (the lantern), the coal chute's boards (they need the glove)
const w1 = await ev(() => { const G = game, N = G.story.arsenal.nooks.find((n) => n.id === 'cellar'); P.enter('house'); P.enter('cellar'); const r = P.use(N.x, N.z, { kind: 'a_nook', near: 1.0 }); P.settle(); return { r: r.r, room: G.room?.id, taken: !!G.flags.a_nook_cellar, dark: !!G.flags.a_dark_cellar, journal: G.story.journal().find((j) => j.title === 'Odd jobs and gear')?.lines?.map((l) => l.key) }; });
const w1l = await said();
check('the cellar\'s gap in the foundations without a light (WALK, E): too dark, something glints; the journal remembers', w1.room === 'cellar' && !w1.taken && w1.dark && w1l.some((l) => /Too dark/.test(l)) && w1.journal?.includes('a_j_dark'), { w1, w1l });
const w2 = await ev(() => { const G = game, N = G.story.arsenal.nooks.find((n) => n.id === 'cellar'); const d0 = G.hero.arms.darts, c0 = G.hero.coins;
  const r0 = T.useItem('lantern'); G.step(0.3);
  const pool = G.lightPool.lights.some((l) => l.intensity > 1 && l.position.distanceTo(G.gadgets.light.position) < 0.01);
  const r = P.use(N.x, N.z, { kind: 'a_nook', near: 1.0 }); P.settle();
  return { r0, pool, lit: G.gadgets.lanternLit(), r: r.r, taken: !!G.flags.a_nook_cellar, darts: G.hero.arms.darts - d0, coins: G.hero.coins - c0 }; });
check('the lantern (INVENTORY, E) lights the cellar from Twinsen\'s hand (one of the light pool\'s lights)', w2.r0 === 'used' && w2.lit && w2.pool, w2);
check('lit, the gap shows an old tin (E): 6 darts and 8 kashes', w2.taken && w2.darts === 6 && w2.coins === 8, w2);
const w3 = await ev(() => { const G = game, B = G.story.arsenal.boards; const r = P.use(B.x, B.z, { kind: 'a_boards', near: 1.0 }); P.settle(); return { r: r.r, seen: !!G.flags.a_boardsSeen }; });
const w3l = await said();
check('the boarded coal chute in the cellar (E): nailed tight; a big punch might do it', w3.seen && w3l.some((l) => /big one/.test(l)), { w3, w3l });
const w4 = await ev(() => { const G = game, B = G.story.arsenal.boards; G.hero.combat.equip('fists', true); P.face(B.x, B.z); P.tap('KeyK', 0.6); P.settle(); return { broken: !!G.flags.a_boards }; });
check('fists (K) at the boards: a thud, no break', !w4.broken, w4);

// ---- Bersimon asks for the pearl
iso('to the plateau by the room switch (the long walk is the island\'s own tests)');
const b1 = await ev(() => { const G = game; G.exitRoom({ x: -96, z: -66, a: 0 }, true); P.settle(); G.hero.mp = 1; const r = P.talk('bersimon'); return { r: r.r, ask: !!G.flags.a_berAsk, mp: G.hero.mp === G.hero.mpMax }; });
const b1l = await said();
check('Bersimon (TALK): one pearl of incandescence short of a lightning spell; he still tops up the magic', b1.ask && b1.mp && b1l.some((l) => /pearl of incandescence/.test(l)), { b1, b1l });

// ---- chapter 3: Zeelich, Nara's case: the laser pistol
iso('chapter 2 finished by flags (as tests/chapter2.mjs): chapter 3 starts on Zeelich\'s dock; +100 kashes');
await ev(() => { const G = game; Object.assign(G.flags, { c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); G.story.nextChapter(); P.settle(); G.hero.coins += 100; });
const z1 = await ev(() => { const G = game, C = G.story.arsenal.case; const st = T.toShop(C.x, C.z, 'a_case'); const out = { room: G.room?.id, st, items: [...document.querySelectorAll('#shop .item span')].map((s) => s.textContent) };
  out.b1 = T.buy('laser pistol'); out.b2 = T.buy('Crystal cell'); out.b3 = T.buy('Three darts'); out.left = T.leave(); out.A = T.A(); return out; });
const z1l = await said();
check('Nara\'s case on Zeelich\'s street (WALK, E): Nara sells Esmer goods; the pistol runs on a crystal cell or magic', z1.room === 'zeelich' && z1.st === 'shop' && z1l.some((l) => /crystal cell/.test(l)), { z1, z1l });
check('bought: the laser pistol (5 shots of charge with it) and a cell (+5 = 10), three darts (9 + 6 from the cellar + 3 = 18); no Blowtron before chapter 6', z1.A.laser && z1.A.charge === 10 && z1.A.darts === 18 && !z1.items.some((s) => /Blowtron/.test(s)), z1);

// ---- chapter 4: the School of Magic (the pearl, the ward), Under Celebration's old mine (the glove)
iso('chapter 3 finished by flags (as tests/chapter4.mjs): chapter 4 starts on Desert Island');
await ev(() => { const G = game; Object.assign(G.flags, { c2_shield: true, c2_done: true }); G.story.nextChapter(); P.settle(); });
const s1 = await ev(() => { const G = game; const r = P.talk('magus'); return { room: G.room?.id, r: r.r, pearl: !!G.flags.a_pearl, items: G.story.items().map((i) => i.id) }; });
const s1l = await said();
check('Rector Hougo (TALK, School of Magic): a pearl of incandescence for Bersimon', s1.pearl && s1.items.includes('pearl') && s1l.some((l) => /jar's empty/.test(l)), { s1, s1l });
const s2 = await ev(() => { const G = game, h = G.hero, n = P.npc('keraooc'); const c0 = h.coins; P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1);
  for (let i = 0; i < 40 && G.state === 'dialog'; i++) P.tap('KeyE', 0.12);
  const menu = G.state; const pick = document.querySelector('#shop .item[data-i="0"]'); pick?.click(); G.step(0.1); P.settle();
  return { menu, protect: h.arms.protect, paid: c0 - h.coins }; });
check('Ker\'aooc (TALK, CLICK): teaches the ward for 20 kashes', s2.menu === 'shop' && s2.protect && s2.paid === 20, s2);
iso('Twinsen goes to Under Celebration by the room switch the Esmer shuttle uses (tests/zislands.mjs flies it)');
const u1 = await ev(() => { const G = game, U = G.rooms.isle_undergas; G.enterRoom('isle_undergas', U.spawn, true); P.settle(); G.step(1);
  const N = G.story.arsenal.nooks.find((n) => n.id === 'ug'); const r = P.use(N.x, N.z, { kind: 'a_nook', near: 1.0 }); P.settle(); return { r: r.r, room: G.room?.id, glove: G.hero.arms.glove, lit: G.gadgets.lanternLit() }; });
const u1l = await said();
check('the old Wannie mine on Under Celebration (WALK, E, the lantern lit): the Wannie glove', u1.room === 'isle_undergas' && u1.glove && u1l.some((l) => /glove/.test(l)), { u1, u1l });
const u2 = await ev(() => { const G = game, grp = G.story.arsenal.nooks.find((n) => n.id === 'ug').show.parent; let meshes = 0; grp.traverse((o) => { if (o.isMesh) meshes++; });
  const calls = (on) => { grp.visible = on; let c = 0; for (let i = 0; i < 3; i++) { G.renderer.renderer.info.reset(); G.renderer.render(); c = G.renderer.renderer.info.render.calls; } return c; };
  const out = { with: calls(true), without: calls(false), meshes }; grp.visible = true; return out; });
console.log('  draw calls at the Wannie mine (SwiftShader, renderer.info, the frame with / without the mine; its meshes): ' + JSON.stringify(u2));

// ---- back to Citadel: Bersimon's lightning
iso('back to Citadel by the room switch Hesk\'s glider uses');
const b2 = await ev(() => { const G = game; G.exitRoom({ x: -96, z: -66, a: 0 }, true); P.settle(); const r = P.talk('bersimon'); return { r: r.r, lightning: G.hero.arms.lightning, items: G.story.items().map((i) => i.id) }; });
const b2l = await said();
check('Bersimon with the pearl (TALK): the lightning spell; the pearl is used', b2.lightning && !b2.items.includes('pearl') && b2l.some((l) => /think of thunder/.test(l)), { b2, b2l });
// ---- chapter 6: the Blowtron at Nara's case
iso('chapters 4–5 finished by flags; chapter 6 reached (the Blowtron is sold from chapter 6); Zeelich by the shuttle\'s room switch');
const t1 = await ev(() => { const G = game; const i = G.story.chapters.findIndex((c) => c.key === 'pass'); G.flags.chapter = i; G.flags.chapterKey = 'pass'; G.story.applyFlags(); G.hero.coins += 40;
  const Z = G.rooms.zeelich; G.enterRoom('zeelich', Z.spawn, true); P.settle(); const C = G.story.arsenal.case; const st = T.toShop(C.x, C.z, 'a_case'); const b = T.buy('Blowtron'); T.leave(); return { st, b, tron: G.hero.arms.blowtron }; });
const t1l = await said();
const zc = await ev(() => { const G = game, grp = G.story.arsenal.case.grp; let meshes = 0; grp.traverse((o) => { if (o.isMesh) meshes++; });
  const calls = (on) => { grp.visible = on; let c = 0; for (let i = 0; i < 3; i++) { G.renderer.renderer.info.reset(); G.renderer.render(); c = G.renderer.renderer.info.render.calls; } return c; };
  const out = { with: calls(true), without: calls(false), meshes }; grp.visible = true; return out; });
console.log('  draw calls at Nara\'s case (SwiftShader, renderer.info, the frame with / without the case; its meshes): ' + JSON.stringify(zc));
check('chapter 6, Nara\'s case: the Blowtron (Mosquibee work), 35 kashes', t1.b === 'ok' && t1.tron && t1l.some((l) => /Mosquibee/.test(l)), { t1, t1l });

iso('the epilogue (free roam) reached by its flags: the town\'s doors are open again; back to Citadel by the shuttle\'s room switch');
await ev(() => { const G = game; const i = G.story.chapters.findIndex((c) => c.key === 'home'); G.flags.chapter = i; G.flags.chapterKey = 'home'; G.story.applyFlags(); });
const w5 = await ev(() => { const G = game, B = G.story.arsenal.boards, h = G.hero; G.exitRoom(G.story.chapters[0].exitTo('outdoor'), true); P.settle(); P.enter('house'); P.enter('cellar'); P.go(B.x, B.z + 1.3, { tol: 0.5 });
  const w = T.wheel(['ArrowDown', 'ArrowLeft']); P.face(B.x, B.z); const c0 = h.coins, k0 = h.clovers; P.tap('KeyK', 0.8); P.settle();
  return { w, broken: !!G.flags.a_boards, coins: h.coins - c0, clovers: h.clovers - k0, gloveShown: !!G.weapons.models.glove?.visible }; });
check('the weapon wheel (hold G, down-left): the Wannie glove in hand', w5.w === 'glove' && w5.gloveShown, w5);
check('the glove (K) breaks the boards: a clover and 12 kashes behind them', w5.broken && w5.coins === 12 && w5.clovers === 1, w5);


// ---- Save & quit → Continue keeps everything
const before = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('a_'))), weapon: game.hero.weapon }));
const keep = path.join(os.tmpdir(), 'arsenal-save-' + process.pid + '.json');
await quitAndKeep(page, context, keep);
await open(page, '?nocine'); await menu(page, 'continue'); await helpers();
const after = await ev(() => ({ A: game.hero.arms, flags: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('a_'))), weapon: game.hero.weapon, v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, room: game.room?.id }));
check('Save & quit → Continue: every weapon, gadget, count and errand flag kept (save format 4)', JSON.stringify(before.A) === JSON.stringify(after.A) && JSON.stringify(before.flags) === JSON.stringify(after.flags) && before.weapon === after.weapon && after.v === 4, { before, after });

// ---- the effects, in the developer arena (never saved)
await ev(() => { const G = game; G.devArena(); P.settle();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.AR = {
    E,
    only(ids, at = [6194, 8], a = 0) { for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); } const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.mp = h.mpMax; h.invuln = 0; h.hurtT = 0; h.actT = 0; G.resetCombat(); G.combatDir.grace = 0; G.state = 'play'; G.targeting.release(); },
    put(id, x, z, a = 0) { const e = E(id); e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = a; e.kb?.set(0, 0); if (e.state === 'dead') { e.state = e.def.kind === 'gdog' ? 'guard' : 'patrol'; e.hp = e.maxHp; e.rig.root.visible = true; } e.sync?.(); return e; },
    fire(n = 1, wait = 0.8) { for (let i = 0; i < n; i++) { P.tap('KeyK', 0.05); G.step(wait); } },
  };
});
const e1 = await ev(() => { const G = game, h = G.hero; AR.only(['a_dummy'], [6194, 6], -Math.PI / 2); AR.put('a_dummy', 6188, 6); h.arms.blowtron = false; const w = T.wheel(['ArrowUp', 'ArrowRight']); const d = AR.E('a_dummy'); d.hits = 0; const n0 = h.arms.darts; AR.fire(3, 0.9); return { w, hits: d.hits, used: n0 - h.arms.darts, model: !!G.weapons.models.blowgun?.visible }; });
check('the blowgun (wheel: up-right; K ×3): three darts fly and strike the dummy six metres off; three darts spent', e1.w === 'blowgun' && e1.hits === 3 && e1.used === 3 && e1.model, e1);
const e2 = await ev(() => { const G = game, h = G.hero; AR.only(['a_guardG'], [6194, 6], -Math.PI / 2); const g = AR.put('a_guardG', 6188, 6, Math.PI / 2); g.state = 'patrol'; g.hp = g.maxHp;
  AR.fire(1, 0.6); const hp1 = g.hp; h.arms.blowtron = true; G.step(0.6); AR.fire(1, 0.6); return { hp0: g.maxHp, hp1, hp2: g.hp, name: document.querySelector('#weapon .name').textContent }; });
check('a Grobo guard\'s armour shrugs off a blowgun dart (1); the Blowtron\'s (2) goes through', e2.hp1 === e2.hp0 && e2.hp2 === e2.hp0 - 2 && /Blowtron/.test(e2.name), e2);
const e3 = await ev(() => { const G = game, h = G.hero; AR.only(['a_target'], [6194, 8], Math.PI / 2); const d = AR.put('a_target', 6203, 8); d.hp = 30; h.mp = h.mpMax;
  const w = T.wheel(['ArrowDown', 'ArrowRight']); const c0 = h.arms.charge, hp0 = d.hp; AR.fire(1, 0.8); const one = hp0 - d.hp;
  const c1 = h.arms.charge; G.step(0.3); h.arms.charge = 0; const mp0 = h.mp; P.tap('KeyK', 1 / 60); const mp1 = h.mp; G.step(0.8); return { w, one, charge: c0 - c1, cellsLeft: h.arms.charge, mpCost: +(mp0 - mp1).toFixed(2), hp: d.hp, model: !!G.weapons.models.laser?.visible }; });
check('the laser pistol (wheel: down-right; K) hits a drone nine metres off for 3 (machines take 3, not 2)', e3.w === 'laser' && e3.one === 3 && e3.model, e3);
check('the pistol: a crystal-cell shot first (one charge); with no charge it burns 2 magic', e3.charge === 1 && e3.mpCost > 1.9 && e3.mpCost < 2.05, e3);
const e4 = await ev(() => { const G = game, h = G.hero; AR.only(['a_mite', 'a_guard', 'a_gdog'], [6194, 8], Math.PI / 2);
  const m = AR.put('a_mite', 6198, 8), gu = AR.put('a_guard', 6200.5, 9), dg = AR.put('a_gdog', 6201, 6.5); for (const e of [m, gu, dg]) e.hp = e.maxHp; const hp = [m.hp, gu.hp, dg.hp];
  const w = T.wheel(['ArrowUp', 'ArrowLeft']); h.mp = h.mpMax; const mp0 = h.mp; P.tap('KeyK', 0.05); G.step(0.1);
  return { w, chain: G.weapons.lastChain, hit: [hp[0] - m.hp, hp[1] - gu.hp, hp[2] - dg.hp], mp: +(mp0 - h.mp).toFixed(2), arcs: G.weapons.arcs.length }; });
check('lightning (wheel: up-left; K): strikes the mite and jumps to the guard and the dog close by (2, then 1 each); 3 magic', e4.w === 'lightning' && e4.chain === 3 && e4.hit[0] >= 2 && e4.hit[1] >= 1 && e4.hit[2] >= 1 && e4.mp > 2.9 && e4.mp < 3.1 && e4.arcs > 0, e4);
const e5 = await ev(() => { const G = game, h = G.hero; const out = {};
  for (const w of ['fists', 'glove']) { AR.only(['a_guard'], [6194, 8], Math.PI / 2); const g = AR.put('a_guard', 6195.3, 8, -Math.PI / 2); g.hp = 99; g.state = 'patrol'; h.combat.equip(w, true); P.tap('KeyK', 0.05); G.step(0.9); out[w] = +Math.hypot(g.pos.x - 6195.3, g.pos.z - 8).toFixed(2); g.hp = g.maxHp; }
  return out; });
check('the Wannie glove throws a guard back further than the fists do', e5.glove > e5.fists * 1.5 && e5.glove > 1.2, e5);
const e6 = await ev(() => { const G = game, h = G.hero; AR.only(['a_drone'], [6194, 8], Math.PI / 2); const d = AR.put('a_drone', 6202, 8); d.hp = d.maxHp; const hp0 = d.hp; h.combat.equip('glove', true);
  const T3 = (x, y, z) => ({ x, y, z, clone() { return T3(x, y, z); }, add(o) { return T3(x + o.x, y + o.y, z + o.z); } });
  void T3; const from = G.hero.pos.clone(); from.x += 3; from.y += 1.2; const dir = from.clone().set(-1, 0, 0); G.bolts.fire(from, dir, 6, 1);
  G.step(0.12); P.tap('KeyK', 0.05); let ref = false; for (let i = 0; i < 90; i++) { G.step(1 / 30); if (G.bolts.list.some((b) => b.reflected)) ref = true; }
  return { ref, returned: G.weapons.returned || 0, droneHit: hp0 - d.hp, hp: h.hp, max: h.maxHp }; });
check('the glove knocks an enemy bolt back the way it came, and it strikes the drone', e6.ref && e6.returned >= 1 && e6.droneHit >= 1, e6);
const e7 = await ev(() => { const G = game, h = G.hero; AR.only(['a_mite'], [6194, 8], Math.PI / 2); const m = AR.put('a_mite', 6200.5, 10.5); m.hp = m.maxHp; m.state = 'idle'; G.step(0.3);
  const n0 = h.arms.penguins; const r = T.useItem('penguin'); const pg = G.gadgets.penguin; if (!pg) return { r, fail: 'no penguin' };
  const start = [pg.pos.x, pg.pos.z]; let toPg = 1e9, toHero = 0, lured = false, popped = false;
  for (let i = 0; i < 300; i++) { G.step(1 / 30); if (G.gadgets.penguin) { toPg = Math.min(toPg, Math.hypot(m.pos.x - pg.pos.x, m.pos.z - pg.pos.z)); toHero = Math.hypot(m.pos.x - h.pos.x, m.pos.z - h.pos.z); lured ||= m._lured; } else { popped = true; break; } }
  return { r, used: n0 - h.arms.penguins, walked: +Math.hypot(pg.pos.x - start[0], pg.pos.z - start[1]).toFixed(2), toPg: +toPg.toFixed(2), lured, popped, pops: G.gadgets.stats.pops, miteHp: m.hp, miteMax: m.maxHp, hpHero: h.hp, maxHero: h.maxHp }; });
check('the meca-penguin (INVENTORY, E): set down, it waddles off; the mite goes for it, not Twinsen; it pops and hurts the mite', e7.r === 'used' && e7.used === 1 && e7.walked > 1 && e7.lured && e7.toPg < 3 && e7.popped && e7.miteHp < e7.miteMax && e7.hpHero === e7.maxHero, e7);
const e8 = await ev(() => { const G = game, h = G.hero; AR.only([], [6194, 8], 0); const out = {};
  h.invuln = 0; h.hp = 10; h.damage(2, null); out.plain = 10 - h.hp; h.invuln = 0; h.hurtT = 0; G.step(0.5); h.actT = 0;
  h.mp = h.mpMax; const mp0 = h.mp; out.r = T.useItem('protect'); out.mp = +(mp0 - h.mp).toFixed(2); out.shell = G.gadgets.shell.visible; h.invuln = 0; h.hp = 10; h.damage(2, null); out.prot = 10 - h.hp;
  G.step(16); out.after = G.gadgets.protectT; h.invuln = 0; h.hp = 10; h.damage(2, null); out.later = 10 - h.hp; return out; });
check('protection (INVENTORY, E): 3 magic; a 2-point blow takes 1 while it lasts, 2 again after 15 s', e8.r === 'used' && e8.mp > 2.9 && e8.mp < 3.1 && e8.shell && e8.plain === 2 && e8.prot === 1 && e8.after === 0 && e8.later === 2, e8);
const e9 = await ev(() => { const G = game, h = G.hero; AR.only(['a_gdog'], [6194, 8], 0); const d = AR.put('a_gdog', 6198, 10); d.state = 'guard'; G.gadgets.conchCool = 0; h.actT = 0; const r = T.useItem('conch'); G.step(0.2); return { r, dog: d.state, dogs: G.gadgets.lastConch?.dogs }; });
check('the conch (INVENTORY, E) makes a guard dog close by cower', e9.r === 'used' && e9.dog === 'stunned' && e9.dogs === 1, e9);
const e10 = await ev(() => { const G = game, h = G.hero; AR.only([], [6194, 8], 0); h.arms.darts = 0; h.combat.equip('blowgun', true); G.step(0.5); P.tap('KeyK', 0.05); G.step(0.3); return { flying: G.weapons.shots.list.length, toast: [...document.querySelectorAll('.toast')].map((d) => d.textContent).join(' | ') }; });
check('no darts: the blowgun doesn\'t fire, and says so', e10.flying === 0 && /No darts/.test(e10.toast || ''), e10);

// ---- an old save (format 3, before the arsenal) migrates
const m1 = await ev(() => { const G = game, s = G.snapshot(); s.v = 3; delete s.hero.arms; for (const k of Object.keys(s.flags)) if (k.startsWith('a_')) delete s.flags[k]; s.room = null; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); return true; });
void m1;
await page.evaluate(() => game.reloadInto('continue'));
await page.waitForEvent('load', { timeout: 300000 }).catch(() => {});
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'loading', null, { timeout: 300000 });
await page.evaluate(() => { game.testFreeze = true; game.step(0.5); });
const m2 = await ev(() => ({ state: game.state, arms: game.hero.arms, v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, backup: !!localStorage.getItem('lba3_save_v1_backup_v3'), wheel: game.hero.combat.owned() }));
check('a format-3 save (no arsenal) continues: empty arsenal, the save rewritten as format 4, the old one kept', m2.state === 'play' && m2.arms && !m2.arms.blowgun && m2.arms.darts === 0 && m2.backup && m2.wheel.every((w) => ['ball', 'sword', 'pulse', 'fists'].includes(w)), m2);
await ev(() => game.save(false));
const m3 = await ev(() => JSON.parse(localStorage.getItem('lba3_save_v1')).v);
check('…and saved again it is format 4', m3 === 4, m3);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
