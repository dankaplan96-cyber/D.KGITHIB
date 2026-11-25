// KEYS-CLOVER (docs/lba-maturity/KEYS-CLOVER.md; story/keysclover.js, keyrooms.js): LBA's small keys and clover boxes,
// the user's answers of 25.11 (cap 13 with four boxes, a leaf in each box, the key stays with Twinsen, a fourth door in a
// late area, the key on the HUD). One covering suite, played by input where it says INPUT (tests/lib/player.js: arrow
// keys, E, F, Space) from the campaign's own chapter-14 save on Citadel (tests/fixtures/campaign/base-13-cit: format 5,
// made before the keys), loaded through Continue as a player would:
//   A  the old save: format 6 after the upgrade, no kc_ flag made up, the clover cap 9, its 4 leaves kept, no small key
//      on the HUD; a save with more leaves than its cap is clamped to the cap on load (ISO)
//   B  K1, Citadel: FunFrock's passage refused without the key, its tag names the yard's powder chest (INPUT E); the chest
//      (INPUT E): the key found; the HUD's small key with its count; the key KEPT across areas (Otringal and back) and
//      over Save & quit → Continue; the lock opened with it (INPUT E: the gate swings, the key spent, the HUD's key gone);
//      in by the door (INPUT); box B1 (INPUT E): cap 10, a leaf added; the trapdoor's bolt (INPUT E), up the ladder to
//      the yard (INPUT), down again by the trapdoor (INPUT E), out of the north mouth (INPUT)
//   C  K2, Otringal: the pump house refused (INPUT E, the note); the ball at the key on the fountain's top (INPUT F): it
//      falls by the basin; taken (INPUT E); the lock (INPUT E); in (INPUT); the HIGH JET wheel (INPUT E): the plaza's jet
//      runs; box B2 (INPUT E): cap 11; out (INPUT); the sweeper's remark once (TALK)
//   D  K3, Lhar: the goats' house refused (INPUT E, the hay rack named); the hay (INPUT E): the key; the lock; in; up the
//      stair to the loft (INPUT); box B3 (INPUT E): cap 12; Grandma's trunk and the window (INPUT E); out (INPUT)
//   E  K4, Zeelich (chapter 14): the mill room refused (INPUT E: SPARE KEY UP TOP); up the stair-stones (INPUT jumps,
//      P.climbOldMill) to the gallery, the key (INPUT E); at the door (ISO: put at its foot, the climb down is a fall);
//      the lock; in; Baldino's tin (INPUT E): 50 kashes; out
//   F  B4, Desert Island: the School's mask ledge reached on foot from the hollow's east bank (INPUT), box B4 (INPUT E):
//      cap 13; the behaviour menu draws 13 boxes, the inventory reads "n / 13"; Save & quit → Continue: cap 13 kept
// ISO (logged): the rides between areas are travel.mjs's (here: put on the area's spawn); the mill's climb down. ONLY=A..F
// for a part (the state before it set by its flags, logged). SHOTS=dir writes the pictures (the play camera, 960×540;
// docs/lba-maturity/KEYS-CLOVER.md lists them). SERVE=1 answers this checkout's files by request routing.
// Automated runtime only (SwiftShader, headless Chromium): no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/campaign/base-13-cit.save.json', import.meta.url));
const ONLY = process.env.ONLY || 'ABCDEF';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const { page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const KRm = await import('/src/game/keyrooms.js'); window.KR = KRm.KR;
  window.KC = () => game.story.kc;
  window.kc = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('kc_')));
  window.hud = () => { const e = document.querySelector('#smallkeys'); return { shown: !!e && !e.classList.contains('hidden'), n: e?.querySelector('b')?.textContent, stats: document.querySelector('#stats')?.classList.contains('show') }; };
  window.num = () => ({ cap: game.hero.cloverMax, clovers: game.hero.clovers, keys: game.hero.smallKeys, coins: game.hero.coins });
  window.toReg = (reg) => { const G = game; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R.id; };
  window.toCitadel = (x, z, a = 0) => { const G = game; G.exitRoom({ x, z, a }, true); G.step(0.3); P.settle(); };
  window.outOf = (to) => { const G = game, e = G.room?.exits?.find((x) => x.to === to || x.room === to); if (!e) return { r: 'no exit ' + to }; const t = P.through(e.x, e.z); P.settle(); return { r: t.r, room: G.room?.id ?? 'citadel' }; };
  window.doorTo = (room) => game.story.doors().find((d) => d.room === room);
  window.walkIn = (room, fx, fz, far = 2.2) => { const G = game, d = doorTo(room); if (!d) return { r: 'no door' }; const h = G.hero, sx = d.x + fx * far, sz = d.z + fz * far; P.go(sx, sz, { tol: 0.4 }); const t = P.through(d.x, d.z); P.settle(); G.step(0.4); return { r: t.r, room: G.room?.id ?? 'citadel' }; };
  window.setFlags = (o) => { const f = game.flags; Object.assign(f, o); game.story.applyFlags(); game.story.refreshCast(); game.step(0.3); P.settle(); };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};

// ================================================================ A · the old save at cap 9
const st = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
await helpers(); await said();
const a0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, room: game.room?.id ?? 'citadel', kc: Object.keys(kc()), ...num(), hud: hud(), boxes: KC() && game.story.kc.cap() }));
check('A: the campaign\'s chapter-14 save from before the keys (format 5) loads through Continue: format 6, chapter 14 on Citadel, no kc_ flag made up, the clover cap 9 with its 4 leaves kept, no small key, the HUD\'s small key hidden', a0.v === 6 && a0.state === 'play' && a0.chapter === 'network' && a0.kc.length === 0 && a0.cap === 9 && a0.clovers === 4 && a0.keys === 0 && !a0.hud.shown, a0);
iso('a save with 12 leaves and no box (edited in the page): the load\'s clamp');
const a1 = await ev(() => { const h = game.hero, was = h.clovers; h.clovers = 12; game.story.applyFlags(); const r = { clamped: h.clovers, cap: h.cloverMax }; h.clovers = was; game.story.applyFlags(); return { ...r, back: h.clovers }; });
check('A: a save holding more leaves than its cap loads with the cap\'s 9 (no box: cap 9)', a1.clamped === 9 && a1.cap === 9 && a1.back === 4, a1);

// ================================================================ B · K1 Citadel: FunFrock's old passage
if (ONLY.includes('B')) {
  const N = await ev(() => game.world.shutDoors.find((d) => d.id === 'passageN'));
  await ev(() => toCitadel(-29.0, -86.1, Math.PI / 2));
  await shot('kc-01-passage-barred');
  const b1 = await ev((N) => { const u = P.use(N.x, N.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); return { u: u.r, door: !!game.flags.kc_door_fort }; }, N);
  const b1l = await said();
  check('B: FunFrock\'s passage without its key (INPUT E): "Locked", the bars\' tag names the yard\'s powder chest; not opened', b1.u === 'used' && !b1.door && has(b1l, /POWDER CHEST, YARD/), { b1, b1l });
  iso('into the fort\'s yard (the walk round from the north face is the town\'s: camfollow/door-sweep): put by its north-east corner');
  await ev(() => { toCitadel(-19, -73.5, Math.PI); P.face(KC().chest.x, KC().chest.z - 0.85); game.step(0.4); });
  await shot('kc-01b-powder-chest');
  const b2 = await ev(() => { const C = KC().chest; const u = P.use(C.x, C.z, { kind: 'kc_chest', near: 0.9, match: 1.6 }); P.settle(); return { u: u.r, key: !!game.flags.kc_key_fort, ...num(), hud: hud() }; });
  const b2l = await said();
  check('B: the powder chest in the fort\'s yard (INPUT E): a small brass key (the found box), held: 1 small key', b2.u === 'used' && b2.key && b2.keys === 1 && has(b2l, /small brass key/), { b2, b2l });
  const b3 = await ev(() => { game.hero.coins += 0; game.hud.stats(game.hero); return hud(); });
  check('B: the HUD shows the small key (a round-bowed brass key) with its count, 1, beside the kashes', b3.shown && b3.n === '1', b3);
  await ev(() => { game.hud.forceStats = true; game.hud.stats(game.hero); });
  await shot('kc-02-hud-key');
  await ev(() => { game.hud.forceStats = false; game.inventory.show(true); game.step(0.1); });
  await shot('kc-02b-inventory-key');
  const b3i = await ev(() => { const it = game.inventory.items().find((q) => q.id === 'kc_key'); game.inventory.show(false); game.step(0.1); return { it: !!it }; });
  check('B: the inventory lists the Small key while it is held', b3i.it, b3i);
  iso('to Otringal and back (the rides are travel.mjs\'s): put on the island, then on Citadel');
  const b4 = await ev(() => { toReg('isle_otringal'); const there = { room: game.room?.id, ...num(), hud: hud() }; toCitadel(-29.0, -86.1, Math.PI / 2); return { there, back: { room: game.room?.id ?? 'citadel', ...num() } }; });
  check('B: the key STAYS with Twinsen out of its area: on Otringal still 1 small key on the HUD, and back on Citadel', b4.there.room === 'isle_otringal' && b4.there.keys === 1 && b4.there.hud.shown && b4.back.keys === 1, b4);
  await saveQuit(); await reboot();
  const b5 = await ev(() => ({ kc: kc(), ...num(), hud: hud() }));
  check('B: Save & quit → Continue with the key held: kc_key_fort kept, 1 small key, the HUD\'s key shown', b5.kc.kc_key_fort === true && !b5.kc.kc_door_fort && b5.keys === 1 && b5.hud.shown, b5);
  const b6 = await ev((N) => { toCitadel(-29.0, -86.1, Math.PI / 2); const u = P.use(N.x, N.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); P.settle(); return { u: u.r, door: !!game.flags.kc_door_fort, ...num(), hud: hud(), doorIn: !!doorTo('kc_tunnel') }; }, N);
  const b6l = await said();
  check('B: the lock with the key (INPUT E): the small key fits, the gate opens, the key spent (0 held, the HUD\'s key hidden), the passage a door now', b6.u === 'used' && b6.door && b6.keys === 0 && !b6.hud.shown && b6.doorIn && has(b6l, /small key fits/), { b6, b6l });
  await shot('kc-03-passage-open');
  const b7 = await ev(() => walkIn('kc_tunnel', 0, -1, 1.3));   // (from the landing before the mouth)
  check('B: in by the passage\'s mouth (INPUT): FunFrock\'s old passage', b7.room === 'kc_tunnel', b7);
  await shot('kc-04-tunnel');
  const b8 = await ev(() => { const K = KR.kc_tunnel, before = num(); const u = P.use(K.box.x, K.box.z, { kind: 'kc_box', near: 0.8, match: 1.5 }); return { u: u.r, before, after: num(), box: !!game.flags.kc_box_fort }; });
  const b8l = await said();
  check('B: clover box B1 in the side niche (INPUT E): the cap 9 → 10 and a leaf inside (4 → 5)', b8.u === 'used' && b8.box && b8.before.cap === 9 && b8.after.cap === 10 && b8.after.clovers === b8.before.clovers + 1 && has(b8l, /clover box/), { b8, b8l });
  const b9 = await ev(() => { const K = KR.kc_tunnel; const u = P.use(K.bolt.x, K.bolt.z, { kind: 'kc_bolt', near: 0.8, match: 1.5 }); const up = outOf('kc-fort-yard'); const h = game.hero.pos; return { u: u.r, bolt: !!game.flags.kc_bolt_fort, up, at: [+h.x.toFixed(1), +h.z.toFixed(1)] }; });
  check('B: the trapdoor\'s bolt drawn from below (INPUT E), up the ladder (INPUT): out in the fort\'s yard by the trapdoor', b9.u === 'used' && b9.bolt && b9.up.room === 'citadel' && Math.hypot(b9.at[0] + 27.8, b9.at[1] + 61.6) < 4, b9);
  const b10 = await ev(() => { const S = game.world.shutDoors.find((d) => d.id === 'passageS'); const u = P.use(S.x, S.z, { kind: 'kc_hatch', near: 0.8, match: 2.0 }); P.settle(); game.step(0.5); return { u: u.r, room: game.room?.id ?? 'citadel' }; });
  check('B: the two-way shortcut: from the yard the trapdoor climbs down (INPUT E) into the passage', b10.u === 'used' && b10.room === 'kc_tunnel', b10);
  const b11 = await ev(() => outOf('kc-fort-n'));
  check('B: out by the north mouth (INPUT): on Citadel\'s north face', b11.room === 'citadel', b11);
}

// ================================================================ C · K2 Otringal: the pump house and the high jet
if (ONLY.includes('C')) {
  if (!ONLY.includes('B')) { iso('C alone: B\'s state (flags)'); await ev(() => setFlags({ kc_key_fort: true, kc_door_fort: true, kc_box_fort: true, kc_bolt_fort: true })); }
  iso('the ride to Otringal: put on its spawn');
  await ev(() => toReg('isle_otringal'));
  const D = await ev(() => game.room.shutDoors.find((d) => d.id === 'otringal-16-6'));
  const c1 = await ev((D) => { const u = P.use(D.x, D.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); return { u: u.r }; }, D);
  const c1l = await said();
  check('C: the fountain\'s pump house without its key (INPUT E): the note says the key is on the fountain\'s top', c1.u === 'used' && has(c1l, /KEY ON THE FOUNTAIN TOP/), { c1, c1l });
  await ev(() => { const K = KC(); P.go(K.fount.x + 3.5, K.fount.z + 3.5, { tol: 0.6 }); P.face(K.fount.x, K.fount.z); game.step(0.5); });
  await shot('kc-05-fountain-key');
  const c2 = await ev(() => { const K = KC(), T = K._fountT; const ok = P.hitTarget(T, 4.2); P.settle(); for (let i = 0; i < 20; i++) game.step(0.05); return { ok, drop: !!game.flags.kc_pump_drop, key: !!game.flags.kc_key_pump }; });
  const c2l = await said();
  check('C: the magic ball at the key glinting on the fountain\'s top bowl (INPUT F): it drops by the basin, not taken yet', c2.ok && c2.drop && !c2.key && has(c2l, /drops off the top bowl/), { c2, c2l });
  const c3 = await ev(() => { const L = KC().fountLand; const u = P.use(L.x, L.z, { kind: 'kc_take', near: 0.7, match: 1.5 }); P.settle(); return { u: u.r, key: !!game.flags.kc_key_pump, drop: !!game.flags.kc_pump_drop, ...num() }; });
  check('C: the key by the basin taken (INPUT E): 1 small key held', c3.u === 'used' && c3.key && !c3.drop && c3.keys === 1, c3);
  const c4 = await ev((D) => { const u = P.use(D.x, D.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); P.settle(); const w = walkIn('kc_pump', 0, -1); return { u: u.r, door: !!game.flags.kc_door_pump, room: w.room, ...num() }; }, D);
  check('C: the pump house\'s lock (INPUT E), the key spent; in by its door (INPUT)', c4.u === 'used' && c4.door && c4.keys === 0 && c4.room === 'kc_pump', c4);
  await shot('kc-06-pump-room');
  const c5 = await ev(() => { const K = KR.kc_pump; const u = P.use(K.valve.x, K.valve.z, { kind: 'kc_valve', near: 0.7, match: 1.5 }); const b = num(); const u2 = P.use(K.box.x, K.box.z, { kind: 'kc_box', near: 0.6, match: 1.5 }); return { u: u.r, on: !!game.flags.kc_pump_on, u2: u2.r, before: b, after: num(), box: !!game.flags.kc_box_pump }; });
  const c5l = await said();
  check('C: the HIGH JET wheel (INPUT E): "something starts to roar"; clover box B2 on the shelf (INPUT E): cap +1, a leaf', c5.u === 'used' && c5.on && has(c5l, /starts to roar/) && c5.box && c5.after.cap === c5.before.cap + 1 && c5.after.clovers === c5.before.clovers + 1, { c5, c5l });
  const c6 = await ev(() => { const o = outOf('kc_pump-out'); const K = KC(); return { ...o, jet: !!K.jet?.group.visible }; });
  check('C: out on the plaza (INPUT): the fountain\'s high jet runs', c6.room === 'isle_otringal' && c6.jet, c6);
  await ev(() => { const K = KC(); P.go(K.fount.x + 5, K.fount.z + 5, { tol: 0.6 }); P.face(K.fount.x, K.fount.z); game.step(0.5); });
  await shot('kc-07-fountain-jet');
  const c7 = await ev(() => { const G = game; for (let i = 0; i < 60 && !P.npc('ot_sweep')?.present; i++) G.step(1); const t = P.talk('ot_sweep'); return { t: t.r, said: !!game.flags.kc_sweep }; });
  const c7l = await said();
  check('C: the sweeper on the plaza (TALK) remarks on the high jet, once', c7.t === 'talked' && c7.said && has(c7l, /high jet/), { c7, c7l });
}

// ================================================================ D · K3 Lhar: Grandma's old house
if (ONLY.includes('D')) {
  iso('the glider to the Hamalayi: put on its spawn');
  await ev(() => toReg('hamalayi'));
  const Gd = await ev(() => KC().goat);
  const d1 = await ev((G) => { const u = P.use(G.door.x, G.door.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); return { u: u.r }; }, Gd);
  const d1l = await said();
  check('D: the goats\' house without its key (INPUT E): locked, the goats keep nosing at their hay rack', d1.u === 'used' && has(d1l, /hay rack/), { d1, d1l });
  await shot('kc-08-goathouse');
  const d2 = await ev((G) => { const u = P.use(G.hay.x, G.hay.z, { kind: 'kc_hay', near: 0.8, match: 1.6 }); P.settle(); return { u: u.r, key: !!game.flags.kc_key_goat, ...num() }; }, Gd);
  const d2l = await said();
  check('D: the hay rack (INPUT E): a small key, a little chewed; 1 held', d2.u === 'used' && d2.key && d2.keys === 1 && has(d2l, /little chewed/), { d2, d2l });
  const d3 = await ev((G) => { const u = P.use(G.door.x, G.door.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); P.settle(); const w = walkIn('kc_goats', 0, -1); return { u: u.r, door: !!game.flags.kc_door_goat, room: w.room, ...num() }; }, Gd);
  check('D: the lock (INPUT E), the key spent; in (INPUT): Grandma\'s old house', d3.u === 'used' && d3.door && d3.keys === 0 && d3.room === 'kc_goats', d3);
  await shot('kc-09-goats-room');
  const d4 = await ev(() => { const K = KR.kc_goats, b = num(), S = K.stair; P.go(S.foot.x, S.foot.z, { tol: 0.3 }); P.go(S.onto.x, S.onto.z, { tol: 0.15 }); P.face(S.top.x, S.top.z); P.holdFor(['ArrowUp'], 2.6); P.settle(); const u = P.use(K.box.x, K.box.z, { kind: 'kc_box', near: 0.6, match: 1.5 }); const y = game.hero.pos.y; return { u: u.r, y: +y.toFixed(2), before: b, after: num(), box: !!game.flags.kc_box_goat }; });
  check('D: up the stair to the loft (INPUT) and clover box B3 (INPUT E): cap +1, a leaf', d4.u === 'used' && d4.y > 2 && d4.box && d4.after.cap === d4.before.cap + 1 && d4.after.clovers === d4.before.clovers + 1, d4);
  const d5 = await ev(() => { const L = KR.kc_goats.looks; const t = L.find((l) => l.key === 'trunk'), w = L.find((l) => l.key === 'window'); const u1 = P.use(t.x, t.z, { kind: 'kc_look', near: 0.6, match: 1.5 }); const u2 = P.use(w.x, w.z, { kind: 'kc_look', near: 0.5, match: 1.5 }); return { u1: u1.r, u2: u2.r }; });
  const d5l = await said();
  check('D: Grandma\'s trunk and the loft window (INPUT E)', d5.u1 === 'used' && d5.u2 === 'used' && has(d5l, /NOT FOR PIM/) && has(d5l, /observatory/), { d5, d5l });
  await shot('kc-10-goats-loft');
  const d6 = await ev(() => { const S = KR.kc_goats.stair; P.go(S.top.x, S.top.z, { tol: 0.3 }); P.face(S.onto.x, S.onto.z); P.holdFor(['ArrowUp'], 2.4); P.settle(); P.go(S.foot.x, S.foot.z, { tol: 0.3 }); const y = +game.hero.pos.y.toFixed(2); return { ...outOf('kc_goats-out'), y }; });
  check('D: down the stair and out (INPUT): in Lhar before the house', d6.room === 'hamalayi' && d6.y < 0.3, d6);
}

// ================================================================ E · K4 Zeelich: Baldino's old mill room (chapter 14)
if (ONLY.includes('E')) {
  iso('the ship to Zeelich: put on its spawn');
  await ev(() => toReg('zeelich'));
  const M = await ev(() => KC().mill);
  const e1 = await ev((M) => { const u = P.use(M.door.x, M.door.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); return { u: u.r }; }, M);
  const e1l = await said();
  check('E: Baldino\'s old mill room without its key (INPUT E): SPARE KEY UP TOP scratched in the frame', e1.u === 'used' && has(e1l, /SPARE KEY UP TOP/), { e1, e1l });
  const e2 = await ev(() => { const r = P.climbOldMill(); return r; });
  check('E: up the old mill\'s stair-stones (INPUT jumps) to the gallery', e2.top, e2);
  const e3 = await ev((M) => { const u = P.use(M.key.x, M.key.z, { kind: 'kc_take', near: 0.7, match: 1.6 }); P.settle(); return { u: u.r, key: !!game.flags.kc_key_mill, ...num() }; }, M);
  const e3l = await said();
  check('E: on the gallery, the key on its nail (INPUT E): Baldino\'s tag, MILL ROOM; 1 held', e3.u === 'used' && e3.key && e3.keys === 1 && has(e3l, /MILL ROOM/), { e3, e3l });
  await shot('kc-11-mill-gallery');
  iso('down from the gallery (a fall): put at the mill door\'s foot');
  const e4 = await ev((M) => { const G = game, h = G.hero, ux = M.door.x - M.centre.x, uz = M.door.z - M.centre.z, l = Math.hypot(ux, uz); h.pos.set(M.centre.x + ux / l * 5, M.door.y, M.centre.z + uz / l * 5); h.vy = 0; h.onGround = true; G.camRig.snap?.(); G.step(0.3); P.settle(); const u = P.use(M.door.x, M.door.z, { kind: 'kc_lock', near: 1.0, match: 2.2 }); P.settle(); const w = walkIn('kc_mill', ux / l, uz / l); return { u: u.r, door: !!G.flags.kc_door_mill, room: w.room, ...num() }; }, M);
  check('E: the lock (INPUT E), the key spent; in (INPUT): Baldino\'s mill room', e4.u === 'used' && e4.door && e4.keys === 0 && e4.room === 'kc_mill', e4);
  await shot('kc-12-mill-room');
  const e5 = await ev(() => { const K = KR.kc_mill, b = num(); const u = P.use(K.tin.x, K.tin.z, { kind: 'kc_tin', near: 0.6, match: 1.5 }); return { u: u.r, coins: num().coins - b.coins, tin: !!game.flags.kc_tin_mill }; });
  const e5l = await said();
  check('E: Baldino\'s biscuit tin (INPUT E): 50 kashes and his note', e5.u === 'used' && e5.tin && e5.coins === 50 && has(e5l, /Buy Oku a drink/), { e5, e5l });
  const e6 = await ev(() => outOf('kc_mill-out'));
  check('E: out (INPUT): on Zeelich by the mill', e6.room === 'zeelich', e6);
}

// ================================================================ F · B4 Desert Island: the School's mask ledge; the cap 13
if (ONLY.includes('F')) {
  if (!ONLY.includes('B') || !ONLY.includes('C') || !ONLY.includes('D')) { iso('F alone: the three boxes behind the doors (flags)'); await ev(() => setFlags({ kc_box_fort: true, kc_box_pump: true, kc_box_goat: true })); }
  iso('the glider to Desert Island: put on its spawn');
  await ev(() => toReg('desert'));
  const f1 = await ev(() => { const K = KC(), M = K.mask, b = num(); const u = P.use(M.box.x, M.box.z, { kind: 'kc_box', near: 0.6, match: 1.5 }); const y = game.hero.pos.y; return { u: u.r, y: +y.toFixed(2), ledge: M.y, before: b, after: num(), box: !!game.flags.kc_box_mask }; });
  check('F: the School\'s mask ledge reached on foot from the hollow\'s east bank (INPUT) and clover box B4 (INPUT E): cap 13, a leaf', f1.u === 'used' && Math.abs(f1.y - f1.ledge) < 0.4 && f1.box && f1.after.cap === 13 && f1.after.clovers === f1.before.clovers + 1, f1);
  await shot('kc-13-mask-ledge');
  const f2 = await ev(() => { const G = game; G.behMenu?.show?.(true); const B = document.querySelectorAll('#behmenu .clovers span, .behmenu .clovers span'); const full = [...B].filter((e) => e.classList.contains('full')).length; const r = { boxes: B.length, full }; return r; });
  await shot('kc-14-behaviour-boxes');
  const f3 = await ev(() => { const G = game; G.behMenu?.show?.(false); const c = G.inventory?.counters?.() || G.inv?.counters?.(); return { c: c?.find((q) => q.id === 'clovers')?.n ?? null }; });
  check('F: the behaviour menu draws the cap\'s 13 boxes with the leaves filled; the inventory\'s Clover Leaves read "n / 13"', f2.boxes === 13 && f2.full === (await ev(() => game.hero.clovers)) && typeof f3.c === 'string' && /\/ 13$/.test(f3.c), { f2, f3 });
  await saveQuit(); await reboot();
  const f4 = await ev(() => ({ ...num(), kc: Object.keys(kc()).length }));
  check('F: Save & quit → Continue: cap 13 kept (from the boxes\' flags), the leaves kept', f4.cap === 13 && f4.clovers >= 5, f4);
}

done();
process.exit(process.exitCode || 0);
