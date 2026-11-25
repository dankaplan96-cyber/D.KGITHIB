// DEPTH wave 3 (docs/lba-maturity/WAVE3.md; cards in DEPTH-PLAN.md): H-6 = ZEE-1 the misrouted heat + ZEE-2 the project
// stores (Zeelich's street), H-7 = HAM-2 Pim's kite and the goats' way (Lhar, Kesh), H-8 = ISL-3 the doors across the
// clouds + HAM-4 the gorge's ice arch (the Esmer line's rings). src/game/story/depth.js. One suite for the three. Each part
// starts from a campaign fixture (tests/fixtures/campaign/, Continue as a player) and plays by input where it says INPUT
// (tests/lib/player.js: arrow keys, E, K, Space); a step it stages is logged ISO (the walk between two places, a later
// chapter by its flags, a tool the chapter gives):
//   - H-6 (base-05, chapter 3 on the street): Grumm's hook after his own line; Garn refuses without proof; the capped
//     riser (warm), a dark post's tag, the burrow's vent (hot); Garn lends his spanner (inventory); Save & quit →
//     Continue; the cap opened: the post lit, the vent quiet; Grumm pays 12 once; the spanner back; later chapters: lit;
//     the window closed in the network chapter (a fresh state: Grumm's line, no cap). The store: shut with its reason
//     before the pulse tool; (base-13, the network chapter) the pulse at the motor (INPUT, K): the shutter up; the ledger
//     and the kit; Mr Pelleck: 15 kashes once; Save & quit → Continue keeps it all;
//   - H-7 (base-09-trip1, chapter 6 after the fuse): Pim's torn kite (inventory); the ledges climbed by jumps (INPUT), the
//     ring: no rope; Lumi with the wind-catcher not done: the kite left, waits; with it done: mended; Pim in chapter 6:
//     the drone line, no path; chapter 8: the goats' way told; the rope tied and climbed (INPUT, E); Save & quit on the high
//     rock → Continue; on foot to the ridge by the observatory (INPUT); down the rope; a death on the ledges → Retry keeps
//     the rope; Pim's thanks; (fresh) Lumi with the wind-catcher done mends at once;
//   - H-8 (base-12, the council chapter; the Esmer line given as Nara does after her stamp): without the line the near
//     shore's look stays "no way over" and no ring is offered; with it: the barges' yard over its mooring rock and back
//     (INPUT, K), the crate (15 kashes once), the cargo store's door leads in; the west quay and its locker (a clover);
//     the honey islet over its plank bridge, its honey pot heals once a visit; Save & quit on the far yard → Continue →
//     back across; the gorge: from the tree bridge onto the rock stack, the chest (a clover and 12 kashes once), back to
//     the bank;
//   - an old save (format 6, base-14-gal, written before wave 3) loads with no wave 3 state made up; the journal.
// SERVE=1 answers this checkout's files by request routing. SHOTS=dir writes pictures. Automated runtime only (SwiftShader).
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ONLY = process.env.ONLY || '';
let browser, context, page;
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const has = (lines, re) => lines.some((l) => re.test(l));
const said = () => ev(() => { const s = window._said.slice(); window._said.length = 0; return s; });
const helpers = () => ev(() => {
  window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); };
  window.BASE = JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));   // (this suite's own state carries over)
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { chapterKey: key }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key);
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  window.toArea = (id, x, z, a = 0) => { const G = game; G.regions.ensure(id, 'test'); G.enterRoom(id, x == null ? null : { x, z, a }, true); P.settle(); G.story.refreshCast(); G.step(0.5); P.settle(); };
  window.tp = (x, z, y = null) => { const G = game, h = G.hero; h.pos.set(x, y ?? G.physics.groundAt(x, z, 60), z); h.onGround = true; h.vy = 0; h.vel?.set(0, 0); G.camRig.snap?.(); G.step(0.2); P.settle(); };
  window.D = () => game.story.depth;
  // (a walker on his round can step away as E is pressed: a player tries again, three times at most)
  window.talk = (id) => { let r; for (let k = 0; k < 3; k++) { r = P.talk(id); if (r.r === 'talked') break; game.step(1.0); } return r; };
  window.items = () => game.story.items().map((i) => i.id);
  window.waitIdle = (s = 8) => { const G = game, d = D(); for (let t = 0; t < s && (d.ht?.turnT > 0 || d.st?.rollT > 0 || d.climb || G.hero.actT > 0 || G.gadgets.tools.zip || G.gadgets.tools.cord); t += 0.1) { if (G.state !== 'play') P.settle(); G.step(0.1); } P.settle(); };
  window.pick = (flag, s = 6) => { const G = game; for (let i = 0; i < s * 10 && G.flags[flag]; i++) { if (G.state !== 'play') P.settle(); G.step(0.1); const p = G.pickups.list.find((q) => q.owe === flag); if (p && i > 8) P.go(p.pos.x, p.pos.z, { tol: 0.3, maxT: 6 }); } P.settle(); return !G.flags[flag]; };
  // the Esmer line cast at a point (INPUT: face it, K with the line in hand); where he ends
  window.cast = (tx, tz) => { const G = game, h = G.hero, TL = G.gadgets.tools; P.face(tx, tz); h.combat.equip('line', true); TL.castCool = 0; G.step(0.05); const z0 = TL.stats.zips; P.tap('KeyK', 0.03); for (let i = 0; i < 300 && (TL.cord || TL.zip); i++) G.step(1 / 60); G.step(0.3); P.settle(); return { zipped: TL.stats.zips - z0, at: [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)] }; };
});
// a fixture's save, at this page's origin (the fixtures were written on several ports)
const fixture = (name) => { const j = JSON.parse(fs.readFileSync(path.join(FIX, name + '.save.json'), 'utf8')); for (const o of j.origins || []) o.origin = new URL(URL0).origin; return j; };
const boot = async (name) => {
  if (browser) await browser.close();
  ({ browser, context, page } = await launch({ scale: 1, storageState: name ? fixture(name) : undefined }));
  await open(page, '?nocine'); await menu(page, name ? 'continue' : 'new');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
};
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
};
const retry = async () => {
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 300000 }), page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true })]);
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => P.settle());
  await helpers();
};

// ================================================================== H-6 · ZEE-1 the misrouted heat
if (!ONLY || ONLY === '6') {
  iso('fixture base-05: chapter 3, on Zeelich\'s street (Continue)');
  await boot('base-05');
  const a0 = await ev(() => { const H = D().ht, S = D().st; return { key: game.flags.chapterKey, room: game.room?.id, heat: !!H, gem: H?.gem.visible, store: !!S, roll: S?.roll.scale.y, dx: Object.keys(game.flags).filter((k) => /^dx_(heat|store)/.test(k)) }; });
  check('H-6: the riser under the west end\'s dark post and the store\'s shutter are there; the post dark, the shutter down; no state', a0.room === 'zeelich' && a0.heat && !a0.gem && a0.store && a0.roll === 1 && a0.dx.length === 0, a0);
  await shot('h6-01-street');
  const a1 = await ev(() => { const r = P.talk('zmole1').r; return { r, ask: !!game.flags.dx_heat_ask }; }); const a1l = await said();
  check('H-6: Old Grumm (TALK): his own line, then the hook (ask Garn why his posts are cold and the tunnels warm)', a1.r === 'talked' && a1.ask && has(a1l, /Ask him why his posts are cold/) && a1l.findIndex((l) => /Ask him why/.test(l)) > 0, { a1, a1l });
  const a2 = await ev(() => { const r = talk('zr_fennick').r; return { r, sp: !!game.flags.dx_heat_spanner }; }); const a2l = await said();
  check('H-6: Garn (TALK) without proof: show me where it\'s going; no spanner', a2.r === 'talked' && !a2.sp && has(a2l, /show me where/), { a2, a2l });
  const a3 = await ev(() => { const H = D().ht; const r = P.use(H.cap.x, H.cap.z, { kind: 'dx_heatcap', near: 0.9, match: 1.5 }).r; waitIdle(); return { r, pipe: !!game.flags.dx_heat_pipe }; }); const a3l = await said();
  check('H-6: the capped riser (INPUT, his hand on it): CAPPED, NEXT QUARTER; the pipe is warm', a3.r === 'used' && a3.pipe && has(a3l, /shouldn't be warm/), { a3, a3l });
  const a4 = await ev(() => { const p = game.rooms.zeelich.life.posts.find((q) => q.tag === 'burrow'); const r = P.use(p.x, p.z, { kind: 'zltag', near: 0.9 }).r; return { r, tag: !!game.flags.dx_heat_tag }; }); await said();
  const a5 = await ev(() => { const v = game.rooms.zeelich.life.burrow.vent; const r = P.use(v.x, v.z, { kind: 'zlburrow', near: 0.9 }).r; waitIdle(); return { r, grate: !!game.flags.dx_heat_grate }; }); const a5l = await said();
  check('H-6: a dark post\'s tag read (INPUT); the burrow\'s vent, his hand over it (INPUT): hotter than a burrow should breathe', a4.r === 'used' && a4.tag && a5.r === 'used' && a5.grate && has(a5l, /Hotter than a burrow/), { a4, a5, a5l });
  const a6 = await ev(() => { const r = talk('zr_fennick').r; P.settle(); return { r, sp: !!game.flags.dx_heat_spanner, inv: items() }; }); const a6l = await said();
  check('H-6: Garn (TALK) with both: the heat backs up into the ground; his valve spanner lent (inventory)', a6.r === 'talked' && a6.sp && a6.inv.includes('spanner') && has(a6l, /backing up into the ground/), { a6, a6l });
  iso('Save & quit with the spanner lent, then Continue');
  await saveQuit();
  const a7 = await ev(() => ({ room: game.room?.id, sp: !!game.flags.dx_heat_spanner, inv: items(), gem: D().ht.gem.visible }));
  check('H-6: after Continue: still lent (inventory), the post still dark', a7.room === 'zeelich' && a7.sp && a7.inv.includes('spanner') && !a7.gem, a7);
  const c0 = await ev(() => game.hero.coins);
  const a8 = await ev(() => { const H = D().ht; const r = P.use(H.cap.x, H.cap.z, { kind: 'dx_heatcap', near: 0.9, match: 1.5 }).r; waitIdle(); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { r, open: !!game.flags.dx_heat_open, gem: H.gem.visible, vent: +(game.story.zlife.ventT || 0).toFixed(2) }; }); const a8l = await said();
  check('H-6: the cap turned with the spanner (INPUT, his hands on the valve): a hiss, the post lit, the vent held quiet', a8.r === 'used' && a8.open && a8.gem && a8.vent >= 0.4 && has(a8l, /post lights up/), { a8, a8l });
  await shot('h6-02-post-lit');
  const a9 = await ev(() => { const r = P.talk('zmole1').r; P.settle(); const got = pick('dx_owe_heat'); const r2 = P.talk('zmole1').r; P.settle(); return { r, got, paid: !!game.flags.dx_heat_paid, coins: game.hero.coins, r2 }; }); const a9l = await said();
  check('H-6: Grumm (TALK): his tunnels cool, 12 kashes from the west end, once (a second talk pays nothing)', a9.r === 'talked' && a9.got && a9.paid && a9.coins === c0 + 12 && has(a9l, /Twelve kashes/) && a9l.filter((l) => /Twelve kashes/.test(l)).length === 1, { c0, a9, a9l });
  const a10 = await ev(() => { const r = talk('zr_fennick').r; P.settle(); return { r, back: !!game.flags.dx_heat_back, inv: items() }; }); const a10l = await said();
  check('H-6: Garn (TALK): "adjusted", the spanner back (out of the inventory)', a10.r === 'talked' && a10.back && !a10.inv.includes('spanner') && has(a10l, /adjusted/), { a10, a10l });
  iso('three chapters on (chapter 8 by its flags), on the street');
  const a11 = await ev(() => { setChapter('evacuation', { c7_done: true }); toArea('zeelich'); const H = D().ht; const r = P.use(H.cap.x, H.cap.z, { kind: 'dx_heatcap', near: 0.9, match: 1.5 }).r; waitIdle(); return { r, gem: H.gem.visible, vent: +(game.story.zlife.ventT || 0).toFixed(2) }; }); const a11l = await said();
  check('H-6 three chapters on: the post still lit, the vent quiet, the cap\'s look', a11.gem && a11.vent >= 0.4 && has(a11l, /cap stands open/), { a11, a11l });
  // the store before the pulse tool
  const a12 = await ev(() => { const S = D().st; const r = P.use(S.front.x, S.front.z, { kind: 'dx_store', near: 0.8, match: 1.6 }).r; const pulse = D().pulseHit({ x: S.motor.x, y: 7, z: S.motor.z - 2, fx: 0, fz: 1, range: 8, cone: 0.5 }); return { r, pulse, open: !!game.flags.dx_store_open }; }); const a12l = await said();
  check('H-6: the store before the network chapter: shut, a motor holds it (its look); nothing opens it', a12.r === 'used' && !a12.pulse && !a12.open && has(a12l, /A motor holds the shutter down/) && !has(a12l, /pulse tool/), { a12, a12l });
  iso('a fresh heat state: the hook asked but the cap never opened; the network chapter (14) by its flags');
  const a13 = await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (/^dx_heat|^dx_owe_heat/.test(k)) delete f[k]; f.dx_heat_ask = true; setChapter('network', { c7_done: true }); toArea('zeelich'); D().applyWorld(); const H = D().ht; let lab = null; D().heatInteractables((d, m, o) => { lab = o.label; }, () => 0); const r = P.talk('zmole1').r; P.settle(); return { r, late: !!f.dx_heat_late, lab, gem: H.gem.visible }; }); const a13l = await said();
  check('H-6: the window closes in the network chapter: the cap only looked at; Grumm: the council connects the west end now', a13.r === 'talked' && a13.late && a13.lab === 'p_feel' && !a13.gem && has(a13l, /connected properly now/), { a13, a13l });
}

// ================================================================== H-6 · ZEE-2 the project stores
if (!ONLY || ONLY === '6') {
  iso('fixture base-13: the network chapter (Continue); the pulse tool is his (Baldino gave it at the chapter\'s start); on the street by the depot');
  await boot('base-13');
  const b0 = await ev(() => { game.hero.hasPulse = true; toArea('zeelich'); const S = D().st; tp(S.front.x, S.front.z - 0.4); const r = P.use(S.front.x, S.front.z, { kind: 'dx_store', near: 0.8, match: 1.6 }).r; return { key: game.flags.chapterKey, r, seen: !!game.flags.dx_store_seen }; }); const b0l = await said();
  check('H-6 store: its look in the network chapter: the motor, and the pulse tool\'s rule', b0.key === 'network' && b0.r === 'used' && b0.seen && has(b0l, /pulse tool stalls machinery/), { b0, b0l });
  const b1 = await ev(() => { const S = D().st, h = game.hero; tp(S.front.x - 1.5, S.front.z - 3.5); P.face(S.motor.x, S.motor.z); h.combat.equip('pulse', true); P.settle(); P.tap('KeyK', 0.05); game.step(0.4); waitIdle(); h.combat.equip('ball', true); P.settle(); return { open: !!game.flags.dx_store_open, roll: +S.roll.scale.y.toFixed(2), back: S.back.visible }; }); const b1l = await said();
  check('H-6 store: the pulse at the motor (INPUT, K): it stalls, the shutter rolls up, the store inside shows', b1.open && b1.roll < 0.1 && b1.back && has(b1l, /shutter rolls up/), { b1, b1l });
  await shot('h6-03-store-open');
  const b2 = await ev(() => { const S = D().st; const r = P.use(S.front.x, S.front.z, { kind: 'dx_store', near: 0.8, match: 1.6 }).r; for (let i = 0; i < 60; i++) { game.step(0.1); P.settle(); } return { r, ledger: !!game.flags.dx_store_ledger, kit: !!game.flags.dx_store_kit, inv: items() }; }); const b2l = await said();
  check('H-6 store: looked in (INPUT): the ledger (RESERVED, UPPER DISTRICTS), the kit with PELLECK on it taken (inventory)', b2.r === 'used' && b2.ledger && b2.kit && b2.inv.includes('radkit') && has(b2l, /RESERVED, UPPER DISTRICTS/), { b2, b2l });
  const c1 = await ev(() => game.hero.coins);
  const b3 = await ev(() => { const r = P.talk('ztri1').r; P.settle(); const got = pick('dx_owe_store'); const r2 = P.talk('ztri1').r; P.settle(); return { r, got, coins: game.hero.coins, given: game.flags.dx_store_given, inv: items(), r2 }; }); const b3l = await said();
  check('H-6 store: the kit to Mr Pelleck (TALK): Form 7-B, 15 kashes and a receipt, once', b3.r === 'talked' && b3.got && b3.coins === c1 + 15 && b3.given > 0 && !b3.inv.includes('radkit') && b3l.filter((l) => /Fifteen kashes/.test(l)).length === 1, { c1, b3, b3l });
  iso('Save & quit, then Continue');
  await saveQuit();
  const b4 = await ev(() => { const S = D().st; return { roll: +S.roll.scale.y.toFixed(2), back: S.back.visible, kit: !!game.flags.dx_store_kit, given: game.flags.dx_store_given, coins: game.hero.coins }; });
  check('H-6 store: after Continue the shutter is up, the kit\'s place empty, nothing paid twice', b4.roll < 0.1 && b4.back && b4.kit && b4.given > 0 && b4.coins === c1 + 15, { c1, b4 });
}

// ================================================================== H-7 · HAM-2 Pim's kite and the goats' way
if (!ONLY || ONLY === '7') {
  iso('fixture base-09-trip1: chapter 6, the fuse swapped (Continue); in Lhar by Pim (he waits by the lift for the trips)');
  await boot('base-09-trip1');
  const c0 = await ev(() => { const n = P.npc('pim'); tp(n.pos.x + 1.4, n.pos.z + 0.6); const r = P.talk('pim').r; P.settle(); return { key: game.flags.chapterKey, fuse: !!game.flags.c6_fuse, r, kite: game.flags.dx_kite ?? null, inv: items(), led: D().gt?.ledges.length }; }); const c0l = await said();
  check('H-7: Pim (TALK) after the fuse: his own line, then the torn kite; Twinsen carries it (inventory); six ledges by the icefall', c0.key === 'pass' && c0.fuse && c0.r === 'talked' && c0.kite === 'torn' && c0.inv.includes('kite_torn') && c0.led === 6 && has(c0l, /sail split/), { c0, c0l });
  iso('the lift\'s ice mites of chapter 6 set aside for the climb (that fight is tests/chapter6\'s)');
  const c1 = await ev(() => { const foes = game.enemies.filter((e) => e.present && e.alive).map((e) => e.def?.id); for (const e of game.enemies) if (e.present && e.alive && /mite/.test(e.def?.id || '')) e.present = false; const G = D().gt, h = game.hero, L = G.ledges; tp(L[0].x + 1.2, L[0].z + 2.2); const climb = (L) => { const h = game.hero, ys = []; let fell = 0; const on = () => L.findIndex((q) => Math.abs(h.pos.y - q.y) < 0.3 && Math.hypot(h.pos.x - q.x, h.pos.z - q.z) < q.r + 0.1); for (let att = 0; att < 4; att++) { let i = on(); while (i < L.length - 1) { const s = L[i + 1], prev = i >= 0 ? L[i] : null; if (prev) { const dl = Math.hypot(s.x - prev.x, s.z - prev.z), e = Math.max(0, prev.r - 0.35); P.go(prev.x + (s.x - prev.x) / dl * e, prev.z + (s.z - prev.z) / dl * e, { tol: 0.12, maxT: 3 }); } const y = P.hopTo(s.x, s.z, s.y, { walk: !prev }); ys.push(+y.toFixed(2)); if (Math.abs(y - s.y) > 0.3) { fell++; break; } i++; } if (on() === L.length - 1) break; } return { ys, fell, top: on() === L.length - 1 }; }; const cl = climb(L);
    const r = P.use(G.ring.x, G.ring.z, { kind: 'dx_goatring', near: 0.4, match: 1.4 }).r; let lab = null; return { foes, cl, r, ring: !!game.flags.dx_goat_ring, rope: G.rope[0].visible || G.rope[1].visible }; }); const c1l = await said();
  check('H-7: up the six ledges by Athletic jumps (INPUT, Space) in chapter 6; the ring at the top: goat tracks, not without a rope (no rope there)', c1.cl.top && c1.r === 'used' && c1.ring && !c1.rope && has(c1l, /Not without a rope/), { c1, c1l });
  await shot('h7-01-ledges-ch6');
  iso('to Desert Island and Kesh (the glider\'s flight is travel.mjs\'s): by Lumi');
  const c2 = await ev(() => { toArea('desert', 3349, -1.5, Math.PI); const kd = !!game.flags.k_done; const r = P.talk('weaver').r; P.settle(); const r2 = P.talk('weaver').r; P.settle(); return { kd, r, r2, kite: game.flags.dx_kite, left: game.flags.dx_kite_left, inv: items() }; }); const c2l = await said();
  check('H-7: Lumi (TALK) with Kesh\'s wind-catcher not yet done: the cool room first; the kite stays with her (out of the inventory); asked again: it waits', !c2.kd && c2.r === 'talked' && c2.kite === 'left' && c2.left > 0 && !c2.inv.includes('kite_torn') && has(c2l, /wind-catcher comes first/) && has(c2l, /kite waits behind the cool room/), { c2, c2l });
  iso('the wind-catcher done (k_done: story/kesh.js has its own suite)');
  const c3 = await ev(() => { game.flags.k_done = true; const r = P.talk('weaver').r; P.settle(); return { r, kite: game.flags.dx_kite, inv: items() }; }); const c3l = await said();
  check('H-7: Lumi (TALK) once the wind-catcher is done: mended (new cloth, a new spar), back in the inventory', c3.r === 'talked' && c3.kite === 'mended' && c3.inv.includes('kite') && has(c3l, /New cloth, a new spar/), { c3, c3l });
  iso('back to Lhar (the flight is not this suite\'s), still chapter 6: by Pim');
  const c4 = await ev(() => { toArea('hamalayi'); const n = P.npc('pim'); tp(n.pos.x + 1.4, n.pos.z + 0.6); const r = P.talk('pim').r; P.settle(); return { r, kite: game.flags.dx_kite, path: !!game.flags.dx_goatpath, rope: D().gt.rope[0].visible }; }); const c4l = await said();
  check('H-7: the kite back to Pim (TALK) in chapter 6: it flies; not while the drone is up on the peak: no goats\' way yet, no rope', c4.r === 'talked' && c4.kite === 'given' && !c4.path && !c4.rope && has(c4l, /It flies/) && has(c4l, /not while that drone/), { c4, c4l });
  iso('chapter 8 (the evacuation) by its flags, chapter 7 done; Pim at the monastery camp');
  const c5 = await ev(() => { setChapter('evacuation', { c7_done: true }); toArea('hamalayi'); const n = P.npc('pim'); tp(n.pos.x + 1.4, n.pos.z + 0.6); const r = P.talk('pim').r; P.settle(); const G = D().gt; return { r, path: !!game.flags.dx_goatpath, rope: G.rope[0].visible, coil: G.coil.visible }; }); const c5l = await said();
  check('H-7: Pim (TALK) once the drone is down: the goats\' way, a rope he ties at the top (the rope hangs, its end coiled by the ring)', c5.r === 'talked' && c5.path && c5.rope && c5.coil && has(c5l, /goats don't take the lift/), { c5, c5l });
  const c6 = await ev(() => { const G = D().gt, L = G.ledges.at(-1); tp(L.x, L.z, L.y); const r = P.use(G.ring.x, G.ring.z, { kind: 'dx_goatring', near: 0.3, match: 1.4 }).r; waitIdle(); return { r, tied: !!game.flags.dx_goat_tied, tiedRope: G.rope[1].visible }; }); const c6l = await said();
  check('H-7: the rope\'s end tied to the iron ring (INPUT, E: his hands on rope and ring)', c6.r === 'used' && c6.tied && c6.tiedRope && has(c6l, /It holds/), { c6, c6l });
  const c7 = await ev(() => { const G = D().gt, h = game.hero; const r = P.use(G.ring.x, G.ring.z, { kind: 'dx_goatring', near: 0.3, match: 1.4 }).r; waitIdle(10); return { r, up: !!game.flags.dx_goat_up, y: +h.pos.y.toFixed(2), top: +G.top.y.toFixed(2), d: +Math.hypot(h.pos.x - G.top.x, h.pos.z - G.top.z).toFixed(2) }; }); const c7l = await said();
  check('H-7: climbed (INPUT, E): on the high rock at the rope\'s top', c7.r === 'used' && c7.up && Math.abs(c7.y - c7.top) < 0.3 && c7.d < 0.6 && has(c7l, /The high rock/), { c7, c7l });
  await shot('h7-02-high-rock');
  iso('Save & quit on the high rock, then Continue');
  await saveQuit();
  const c8 = await ev(() => { const G = D().gt, h = game.hero; return { room: game.room?.id, y: +h.pos.y.toFixed(2), tied: G.rope[1].visible, path: !!game.flags.dx_goatpath }; });
  check('H-7: after Continue: the rope still tied, the way still open', c8.room === 'hamalayi' && c8.tied && c8.path, c8);
  const c9 = await ev(() => { const G = D().gt, h = game.hero; tp(G.top.x, G.top.z); const t0 = game.time; const r = P.go(4298, -56, { tol: 0.6, maxT: 80 }); const r2 = P.go(4292, -63, { tol: 0.6, maxT: 40 }); const door = game.rooms.hamalayi.observatory.door; return { r: r.r, r2: r2.r, s: +(game.time - t0).toFixed(1), d: +Math.hypot(h.pos.x - door.x, h.pos.z - door.z).toFixed(1), y: +h.pos.y.toFixed(1) }; });
  check('H-7: from the rope\'s top on foot (INPUT) along the high rock to the ridge\'s upper end by the observatory\'s door', c9.r === 'arrived' && c9.r2 === 'arrived' && c9.d < 9 && c9.y > 28, c9);
  const c10 = await ev(() => { const G = D().gt, h = game.hero; tp(G.top.x, G.top.z); const r = P.use(G.stakeAt.x, G.stakeAt.z, { kind: 'dx_goatdown', near: 0.6, match: 1.5 }).r; waitIdle(10); const L = G.ledges.at(-1); return { r, y: +h.pos.y.toFixed(2), ly: L.y }; });
  check('H-7: down the rope (INPUT, E at the stake): back on the top ledge', c10.r === 'used' && Math.abs(c10.y - c10.ly) < 0.3, c10);
  iso('a death on the ledges (no clover, a heavy blow), then Retry');
  const c11 = await ev(() => { const G = game, h = G.hero; h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null); for (let i = 0; i < 200 && G.state !== 'gameover'; i++) G.step(0.05); return G.state; });
  await retry();
  const c12 = await ev(() => { toArea('hamalayi'); const G = D().gt, h = game.hero; return { state: game.state, hp: [h.hp, h.maxHp], tied: G.rope[1].visible, path: !!game.flags.dx_goatpath, up: !!game.flags.dx_goat_up }; });
  check('H-7: game over, then Retry: full life, the rope still tied, the way still open', c11 === 'gameover' && c12.hp[0] === c12.hp[1] && c12.tied && c12.path && c12.up, { c11, c12 });
  const c13 = await ev(() => { const n = P.npc('pim'); tp(n.pos.x + 1.4, n.pos.z + 0.6); const r = P.talk('pim').r; P.settle(); return { r, thx: !!game.flags.dx_goat_thx }; }); const c13l = await said();
  check('H-7: Pim (TALK) after the climb: Grandma\'s goats say hello', c13.r === 'talked' && c13.thx && has(c13l, /goats say hello/), { c13, c13l });
  iso('a fresh kite state, the wind-catcher already done (k_done): Lumi mends it at once');
  const c14 = await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (/^dx_kite/.test(k)) delete f[k]; f.dx_kite = 'torn'; f.k_done = true; toArea('desert', 3349, -1.5, Math.PI); const r = P.talk('weaver').r; P.settle(); return { r, kite: f.dx_kite }; }); const c14l = await said();
  check('H-7 (fresh): Lumi (TALK) with the wind-catcher done: "You fixed our cool room", mended at once', c14.r === 'talked' && c14.kite === 'mended' && has(c14l, /You fixed our cool room/), { c14, c14l });
}

// ================================================================== H-8 · ISL-3 the doors across the clouds, HAM-4 the arch
if (!ONLY || ONLY === '8') {
  iso('fixture base-12: the council chapter (Continue); on Otringal at the near shore by the barges\' yard, the line not in hand');
  await boot('base-12');
  const d0 = await ev(() => { game.hero.arms.line = false; toArea('isle_otringal'); const C = D().far.yard; tp(C.N.x, C.N.z); const tg = game.story.lineTargets().filter((t) => /^dx_/.test(t.id)).length; const r = P.use(C.def.nPost.x, C.def.nPost.z, { kind: 'dx_farlook', near: 0.9, match: 1.4 }).r; return { key: game.flags.chapterKey, tg, r }; }); const d0l = await said();
  check('H-8: without the line: no ring offered, the davit\'s look says no way over on foot', d0.key === 'council' && d0.tg === 0 && d0.r === 'used' && has(d0l, /No way over on foot/), { d0, d0l });
  iso('the Esmer line in hand (Nara gives it after her stamp in this chapter if it was never bought: kit2b.js)');
  const d1 = await ev(() => { game.hero.arms.line = true; const C = D().far.yard; tp(C.N.x, C.N.z); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.fRing.x, C.fRing.z); return { a, b, side: D().farSide(C), over: !!game.flags.dx_far_yard }; }); const d1l = await said();
  check('H-8: the barges\' yard (INPUT, K twice): onto the mooring rock, then over to the far yard', d1.a.zipped === 1 && d1.b.zipped === 1 && d1.side === 'F' && d1.over && has(d1l, /cargo store is round the front/), { d1, d1l });
  await shot('h8-01-yard-over');
  const c0 = await ev(() => game.hero.coins);
  const d2 = await ev(() => { const T = D().far.yard.thing; const r = P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }).r; for (let i = 0; i < 30; i++) { game.step(0.1); P.settle(); } const got = pick('dx_owe_far_yard'); const r2 = P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }).r; return { r, got, coins: game.hero.coins, r2 }; }); const d2l = await said();
  check('H-8: the barge crate searched (INPUT): Madam Orla\'s lens came from here; 15 kashes, once', d2.r === 'used' && d2.got && d2.coins === c0 + 15 && has(d2l, /Madam Orla's lens/) && has(d2l, /no kashes/), { c0, d2, d2l });
  iso('Save & quit on the far yard, then Continue');
  await saveQuit();
  const d3 = await ev(() => { const C = D().far.yard; const side = D().farSide(C); P.go(C.F.x, C.F.z, { tol: 0.6, maxT: 20 }); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.nRing.x, C.nRing.z); return { side, a, b, end: D().farSide(C) }; });
  check('H-8: after Continue on the far yard (by the crate): to its landing on foot, back across (INPUT, K twice) to the near shore', d3.side === 'F' && d3.a.zipped === 1 && d3.b.zipped === 1 && d3.end === 'N', d3);
  const d4 = await ev(() => { const C = D().far.yard; tp(C.N.x, C.N.z); cast(C.mRing.x, C.mRing.z); cast(C.fRing.x, C.fRing.z); const dd = game.story.ihomes.doors().find((q) => q.house === 'otringal-40-43'); const r = P.go(dd.x, dd.z, { tol: 0.3, maxT: 40 }); for (let i = 0; i < 30 && game.trans; i++) game.step(0.1); P.settle(); return { r: r.r, room: game.room?.id }; });
  check('H-8: from the far yard on foot (INPUT) round to the cargo store\'s door: it leads in', /ih_otringal_40_43/.test(d4.room || ''), d4);
  const d5 = await ev(() => { toArea('isle_otringal'); const C = D().far.quay; tp(C.N.x, C.N.z); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.fRing.x, C.fRing.z); const T = C.thing; const r = P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }).r; for (let i = 0; i < 30; i++) { game.step(0.1); P.settle(); } const cl0 = game.hero.clovers; const got = pick('dx_owe_far_quay'); return { a, b, over: !!game.flags.dx_far_quay, r, got, cl: game.hero.clovers - cl0 }; }); const d5l = await said();
  check('H-8: the west quay over its mooring rock (INPUT, K twice); the dock worker\'s locker (INPUT): his note, a clover', d5.a.zipped === 1 && d5.b.zipped === 1 && d5.over && d5.r === 'used' && d5.got && has(d5l, /Esmer or mad/), { d5, d5l });
  const d6 = await ev(() => { const C = D().far.quay; P.go(C.F.x, C.F.z, { tol: 0.6, maxT: 20 }); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.nRing.x, C.nRing.z); return { a, b, end: D().farSide(C) }; });
  check('H-8: back from the west quay (INPUT, K twice)', d6.a.zipped === 1 && d6.b.zipped === 1 && d6.end === 'N', d6);
  const d7 = await ev(() => { toArea('isle_mosquibee'); const C = D().far.honey, h = game.hero; tp(C.N.x, C.N.z); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.fRing.x, C.fRing.z); h.hp = 3; const T = C.thing; const r = P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }).r; for (let i = 0; i < 20; i++) { game.step(0.1); P.settle(); } const hp1 = h.hp; h.hp = 3; const r2 = P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }).r; for (let i = 0; i < 20; i++) { game.step(0.1); P.settle(); } return { a, b, over: !!game.flags.dx_far_honey, r, hp1, max: h.maxHp, r2, hp2: h.hp }; }); const d7l = await said();
  check('H-8: the honey islet over its plank bridge (INPUT, K twice); the honey pot (INPUT): full life; again the same visit: none', d7.a.zipped === 1 && d7.b.zipped === 1 && d7.over && d7.hp1 === d7.max && d7.hp2 === 3 && has(d7l, /feel brand new/) && has(d7l, /had my spoonful/), { d7, d7l });
  await shot('h8-02-honey-islet');
  const d8 = await ev(() => { const C = D().far.honey, h = game.hero; P.go(C.F.x, C.F.z, { tol: 0.6, maxT: 20 }); const a = cast(C.mRing.x, C.mRing.z); const b = cast(C.nRing.x, C.nRing.z); toArea('isle_otringal'); toArea('isle_mosquibee'); tp(C.N.x, C.N.z); cast(C.mRing.x, C.mRing.z); cast(C.fRing.x, C.fRing.z); h.hp = 3; const T = C.thing; P.use(T.x, T.z, { kind: 'dx_farthing', near: 0.9, match: 1.6 }); for (let i = 0; i < 20; i++) { game.step(0.1); P.settle(); } return { a, b, hp: h.hp, max: h.maxHp }; }); const d8l = await said();
  check('H-8: back over the bridge (INPUT); another visit: the honey pot again', d8.a.zipped === 1 && d8.b.zipped === 1 && d8.hp === d8.max && has(d8l, /Brand new again/), { d8, d8l });
  iso('the Hamalayi (chapter 9, the bridge across the gorge felled in chapter 6): on the tree bridge');
  const c1 = await ev(() => ({ c: game.hero.coins, cl: game.hero.clovers }));
  const d9 = await ev(() => { toArea('hamalayi'); const A = D().ar; tp(4294, 42.5, 2.8); const look = A.look; const a = cast(A.toStack.x, A.toStack.z); const on = Math.hypot(game.hero.pos.x - A.S.x, game.hero.pos.z - A.S.z) < 1.2; return { bridge: !!game.flags.c6_bridge, a, on, arch: !!game.flags.dx_arch }; }); const d9l = await said();
  check('H-8: from the tree bridge the ring in the ice arch\'s crown (INPUT, K): onto the rock stack in the gorge', d9.a.zipped === 1 && d9.on && d9.arch && has(d9l, /ring in the arch's foot/), { d9, d9l });
  await shot('h8-03-arch-stack');
  const d10 = await ev(() => { const A = D().ar; const r = P.use(A.chest.x, A.chest.z, { kind: 'dx_archchest', near: 0.5, match: 1.4 }).r; for (let i = 0; i < 30; i++) { game.step(0.1); P.settle(); } const g1 = pick('dx_owe_arch'), g2 = pick('dx_owe_arch_clover'); const r2 = P.use(A.chest.x, A.chest.z, { kind: 'dx_archchest', near: 0.5, match: 1.4 }).r; return { r, g1, g2, coins: game.hero.coins, cl: game.hero.clovers, r2 }; }); const d10l = await said();
  check('H-8: the old gate crew\'s chest (INPUT): 12 kashes and a clover, once; again: empty', d10.r === 'used' && d10.g1 && d10.g2 && d10.coins === c1.c + 12 && (d10.cl === c1.cl + 1 || c1.cl >= 9) && has(d10l, /OLD GATE CREW/) && has(d10l, /Empty, apart from the joke/), { c1, d10, d10l });
  const d11 = await ev(() => { const A = D().ar, h = game.hero; const a = cast(A.toBank.x, A.toBank.z); const look = P.use(A.look.x, A.look.z, { kind: 'dx_archlook', near: 1.2, match: 2.2 }).r; return { a, y: +h.pos.y.toFixed(2), look }; }); const d11l = await said();
  check('H-8: back to the north bank by the ring in the arch\'s foot (INPUT, K); the arch\'s look from the bank', d11.a.zipped === 1 && d11.y > 2.5 && d11.look === 'used' && has(d11l, /Within reach of the line/), { d11, d11l });
  const j = await ev(() => { const J = game.story.journal(); const s = J.find((c) => /Singing crystals/.test(c.title)); return s?.lines.map((l) => l.key) || []; });
  check('the journal: the far yard, the quay, the honey islet and the arch', ['dx_j_far_yard', 'dx_j_far_quay', 'dx_j_far_honey', 'dx_j_arch'].every((k) => j.includes(k)), j);
}

// ================================================================== an old save (format 6, written before wave 3)
if (!ONLY || ONLY === 'old') {
  iso('fixture base-14-gal: the galleries in chapter 15 (written before wave 3), Continue');
  await boot('base-14-gal');
  const o1 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, room: game.room?.id, dx: Object.keys(game.flags).filter((k) => /^dx_(heat|store|kite|goat|far|arch|owe_far|owe_arch|owe_heat|owe_store)/.test(k)) }));
  const o2 = await ev(() => { toArea('hamalayi'); toArea('zeelich'); return { ledges: D().gt?.ledges.length, rope: D().gt?.rope.some((r) => r.visible), gem: D().ht?.gem.visible, roll: D().st?.roll.scale.y, items: items().filter((i) => /kite|spanner|radkit/.test(i)) }; });
  check('an old save (format 6, chapter 15, before wave 3): loads into play, no wave 3 state made up; the ledges there, no rope, the post dark, the shutter down', o1.v === 6 && o1.state === 'play' && o1.chapter === 'shell' && o1.dx.length === 0 && o2.ledges === 6 && !o2.rope && !o2.gem && o2.roll === 1 && o2.items.length === 0, { o1, o2 });
}
await browser?.close();
done();
