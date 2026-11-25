// WAVE 7 (docs/lba-maturity/WAVE7.md; CONTENT-15H.md §3 H-17, H-18; src/game/story/wave7.js, wave7world.js): Missing
// Deliveries (Citadel, chapters 8–14) and Dallan's Debt (Kesh, chapter 14 on). One covering suite, played by input where
// it says INPUT (tests/lib/player.js: walking, E, menu picks, a kick, the ball) from the campaign's own saves made before
// wave 7 (tests/fixtures/campaign/base-11-town: chapter 8 with Pippa's supplies; base-13-desert: chapter 14 on Desert
// Island with the bore's relay held; both format 5), loaded through Continue as a player would:
//   A  H-17: the old save loads (format 6, no w7 state made up; the lift stalled with Pippa's crate on the barge);
//      Pippa (TALK): the hook; her chalked crate (E); the cargo lift (E): the crates compared, the clamp's tag; Odile
//      (TALK): the ledger; the baggage claim (INPUT: by its door): Osk (TALK): what's in the crates — a wrong answer, then
//      the right one; the store's lever (E): seized; a kick (INPUT, K): freed; Run it in (the wrong way, nothing lost);
//      Run it out: the shutter up; inside: the lift's key (E, found); the back door unbolted (E); out through it (INPUT):
//      behind the house; back in by it (INPUT): in the store; a death in the store (damage to 0, no clover leaf): Game
//      Over, Retry: the store's state kept; Save & quit → Continue: kept; the lift (E): the clamp off, Swing first (the
//      barge heels, nothing moves), Hoist, Swing: the crate on the pier; Pippa (TALK): the delivery, a clover leaf; the
//      shelter's doorway stocked, the crate gone from the pier, the journal's section done; Tim at the shelter (TALK);
//      the ending (ISO: the chapter key 'home'): the lift as the opening left it, the back passage still open
//   B  H-18: the old save loads; Lumi's shade torn; Lumi (TALK): "Dallan should pay" (her answer, nothing gained), then
//      "What do you need?"; Dallan (TALK, INPUT: walked to him at the bore): "I can carry it." "No. I'll carry it.":
//      at the sail with the canvas, the low corners tied; Save & quit → Continue: kept; the ball (INPUT, F) at the high
//      ring's hook: the sail up, Lumi's "That's something", Dallan's knots; their lines after
//   S  the pieces shown only in a state (the stall's crate, the stencils, the store open, the back door open, the
//      shelter's stock, the shade torn and rigged) scanned with the overlap sweep's library (tests/lib/sweep.js): no
//      finding that names a wave-7 piece
// ISO (logged): a region reached by the travel network's own move; the ending's chapter key set. ONLY=A|B|S runs a part.
// SHOTS=dir writes the pictures (the play camera; before/after pairs: the before frame is the same frame with this wave's
// pieces hidden or in their old state). SERVE=1 answers this checkout's files by request routing.
// Automated runtime only (SwiftShader, headless Chromium): no listening, no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const SWEEP = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
const ONLY = process.env.ONLY || 'ABS';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let browser, page;
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 300000 }); };
const pair = async (n, hide) => { if (!SHOTS) return; await ev(hide, true); await shot(n + '-before'); await ev(hide, false); await shot(n + '-after'); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const m = await import('/src/game/wave7world.js'); window.W7 = m.W7;
  window.w7 = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('w7')));
  window.r2 = (v) => +(+v).toFixed(2);
  window.at = (id) => { const n = P.npc(id); return n?.present ? { x: r2(n.pos.x), z: r2(n.pos.z), room: P.sceneOf(n.pos.x, n.pos.z) } : null; };
  window.toCit = (x, z, a = 0) => { const G = game; if (G.room) G.exitRoom({ x, z, a }, true); else { G.hero.pos.set(x, G.physics.groundAt(x, z), z); G.hero.angle = a; } P.settle(); G.story.refreshCast(); G.step(0.3); P.settle(); };
  window.items = () => [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span')?.textContent || b.textContent);
  window.pick = (txt) => { const n = items().findIndex((s) => s.includes(txt)); return n >= 0 ? P.menuPick(n).r : 'no item ' + txt; };
  window.ctrl = () => P.use(W7.lift.ctrl.x, W7.lift.ctrl.z, { kind: 'w7m_ctrl', near: 0.9, match: 2 }).r;
  window.lever = () => { const S = W7.store; return P.use(S.lever.x, S.lever.z, { kind: 'w7m_lever', near: 0.5, match: 2 }).r; };
});
const boot = async (fixture) => {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fixture), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  if (await ev(() => game.state === 'title')) await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 60 && game.state !== 'play'; i++) game.step(0.1); for (let i = 0; i < 20; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded; await reboot();
};

// ================================================================ A · H-17 Missing Deliveries
if (ONLY.includes('A') || ONLY.includes('S')) await boot('base-11-town');
if (ONLY.includes('A')) {
  const a0 = await ev(() => { const L = W7.lift.L; return { v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, ch: game.flags.chapterKey, pippa: !!game.flags.c8_pippa, w7: Object.keys(w7()), crateOnBarge: r2(W7.lift.crateA().y) < 1.2, stencil: true, osk: true }; });
  check('A: the campaign\'s chapter-8 save from before wave 7 (format 5) loads through Continue: format 6, chapter 8 after Pippa\'s supplies, in play, no w7 state made up; the cargo lift stalled, its hook down on a crate aboard the barge', a0.v === 6 && a0.state === 'play' && a0.ch === 'evacuation' && a0.pippa && a0.w7.length === 0 && a0.crateOnBarge, a0);
  // the pictures' before/after of the harbour: the lift as the opening left it (before) and stalled with its stencils
  await ev(() => { toCit(-122.6, 51.6, 2.7); for (let i = 0; i < 30; i++) game.step(0.05); });
  await pair('wave7-01-lift', (h) => { const L = W7.lift.L; if (h) { L.pose(1); W7.lift.setOn(false); W7.lift.setPin(false); } else game.story.w7.applyWorld(); });
  const a1 = await ev(() => { toCit(-44.0, 3.5, -2.4); const k = P.talk('pippa'); return { k: k.r, hook: !!game.flags.w7m_hook }; });
  const a1l = await said();
  check('A: Pippa at her stall (TALK): her second cart for the depot shelter never came; blankets and water casks; SHELTER chalked on every crate, "look at that one by my stall"', a1.k === 'talked' && a1.hook && has(a1l, /second cart never came/) && has(a1l, /chalked SHELTER/), { a1, a1l });
  const a2 = await ev(() => { const S = W7.stall; return P.use(S.at.x, S.at.z, { kind: 'w7m_stall', near: 0.9, match: 2 }).r; });
  const a2l = await said();
  check('A: her crate beside the stall (E): SHELTER in chalk, a loop on the S', a2 === 'used' && has(a2l, /loop on the S/), { a2, a2l });
  await ev(() => { const S = W7.stall; P.go(S.at.x + 2.2, S.at.z + 2.0, { tol: 0.4 }); P.face(S.at.x, S.at.z); for (let i = 0; i < 20; i++) game.step(0.05); });
  await pair('wave7-02-stall-crate', (h) => W7.stall.setOn(!h));
  const a3 = await ev(() => { const r = ctrl(); return { r, tag: !!game.flags.w7m_tag, labels: !!game.flags.w7m_labels, pos: [r2(game.hero.pos.x), r2(game.hero.pos.z)], j: game.story.journal().find((s) => /Missing deliveries/.test(s.title))?.lines.length }; });
  const a3l = await said();
  check('A: the harbour\'s cargo lift (INPUT: walked to the pier, E at its control): the crate under the hook — STATION stencilled over Pippa\'s chalk SHELTER; the other crate aboard — nothing under its stencil; the clamp\'s tag: KEY AT THE BAGGAGE CLAIM; the journal has the story', a3.r === 'used' && a3.tag && a3.labels && has(a3l, /chalk: SHELTER/) && has(a3l, /nothing under the paint/) && has(a3l, /KEY AT THE BAGGAGE CLAIM/) && a3.j >= 3, { a3, a3l });
  const a4 = await ev(() => { const k = P.talk('odile'); return { k: k.r, ledger: !!game.flags.w7m_ledger }; });
  const a4l = await said();
  check('A: Officer Odile (TALK): her ledger — relabelled STATION by the lift crew, never collected, the paper and the key with Osk', a4.k === 'talked' && a4.ledger && has(a4l, /relabelled STATION/) && has(a4l, /Osk has them/), { a4, a4l });
  const a5 = await ev(() => { const e = P.enter('baggage'); const k = P.talk('osk'); const menu = game.state === 'shop' ? items() : []; const p = pick('Drill parts'); P.settle(); return { e: e.r, k: k.r, menu, p, claim: !!game.flags.w7m_claim, wrong: game.flags.w7m_wrong }; });
  const a5l = await said();
  check('A: the baggage claim (INPUT: by its door in Bug Street): Osk upstairs (TALK, he stays in the evacuation): held for the station — what\'s in them? A wrong answer (drill parts): "What would Pippa chalk on a crate?", nothing lost', a5.e === 'entered' && a5.k === 'talked' && a5.menu.includes('Blankets and water casks') && !a5.claim && a5.wrong === 1 && has(a5l, /What would Pippa chalk/), { a5, a5l });
  const a6 = await ev(() => { const k = P.talk('osk'); const p = pick('Blankets'); P.settle(); return { k: k.r, p, claim: !!game.flags.w7m_claim }; });
  const a6l = await said();
  check('A: Osk again (TALK), blankets and water casks: never the station\'s; the back store downstairs opens off the old conveyor\'s lever, which only listens to a kick', a6.claim && has(a6l, /never the station's/) && has(a6l, /only listens to a kick/), { a6, a6l });
  await ev(() => { const R = game.rooms.baggage, c = R.center; P.go(c.x - 1.2, c.z + 8.6, { tol: 0.4 }); P.face(c.x - 4, c.z + 7.4); for (let i = 0; i < 20; i++) game.step(0.05); });
  await shot('wave7-03-back-store-shut');
  const a7 = await ev(() => { const r = lever(); return { r, free: !!game.flags.w7m_free }; });
  const a7l = await said();
  const a8 = await ev(() => { const G = game, S = W7.store; G.hero.combat.equip('fists', true); P.face(S.leverAt.x, S.leverAt.z); P.settle(); P.tap('KeyK', 0.05); G.step(0.8); P.settle(); return { free: !!G.flags.w7m_free }; });
  const a8l = await said();
  check('A: the store\'s lever (E): seized solid; a kick at it (INPUT: fists, K): it gives', a7.r === 'used' && !a7.free && has(a7l, /Seized solid/) && a8.free && has(a8l, /lever moves now/), { a7, a7l, a8, a8l });
  const a9 = await ev(() => { lever(); const m = items(); pick('Run it in'); game.step(2); P.settle(); return { m, store: !!game.flags.w7m_store, sh: W7.store.u }; });
  const a9l = await said();
  check('A: the lever (E, "Run it in"): the wrong way — the bales bump the back door, the shutter stays down; nothing lost', a9.m.includes('Run it out') && !a9.store && a9.sh === 0 && has(a9l, /wrong way/), { a9, a9l });
  const a10 = await ev(() => { lever(); pick('Run it out'); game.step(2.6); P.settle(); return { store: !!game.flags.w7m_store, sh: W7.store.u }; });
  const a10l = await said();
  check('A: the lever (E, "Run it out"): the shutter rolls up, the conveyor brings the bales out', a10.store && a10.sh === 1 && has(a10l, /shutter rolls up/), { a10, a10l });
  await shot('wave7-04-back-store-open');
  const a11 = await ev(() => { const S = W7.store; const u1 = P.use(S.pin.x, S.pin.z, { kind: 'w7m_key', near: 0.5, match: 2 }).r; P.settle(); const key = !!game.flags.w7m_key, inv = game.story.items().some((i) => i.id === 'w7m_key'); const u2 = P.use(S.door.x, S.door.z, { kind: 'w7m_bolt', near: 0.5, match: 2 }).r; return { u1, key, inv, u2, back: !!game.flags.w7m_back, exits: game.room.exits.map((e) => e.to || e.room) }; });
  const a11l = await said();
  check('A: into the store (INPUT, under the shutter): the lift\'s key on its hook (E, found, carried); the back door (E): unbolted — a passage behind the houses', a11.u1 === 'used' && a11.key && a11.inv && a11.u2 === 'used' && a11.back && a11.exits.includes('w7-back-out') && has(a11l, /CARGO LIFT 1/) && has(a11l, /back door unbolts/), { a11, a11l });
  const a12 = await ev(() => { const e = game.room.exits.find((x) => x.to === 'w7-back-out'); const r1 = P.through(e.x, e.z).r; const out = { room: game.room?.id ?? 'citadel', x: r2(game.hero.pos.x), z: r2(game.hero.pos.z) }; game.step(1.6); const r2_ = P.enter('baggage').r; return { r1, out, r2: r2_, room: game.room?.id, inStore: W7.store.inside(game.hero.pos.x, game.hero.pos.z) }; });
  check('A: out by the back door (INPUT): behind the \'bug\' house, by the sea wall\'s stair; back in by that door (INPUT): in the store again — the back passage', a12.out.room === 'citadel' && a12.out.x < -66 && a12.r2 === 'entered' && a12.room === 'baggage' && a12.inStore, a12);
  await ev(() => { game.exitRoom(W7.backDoor.out, true); P.settle(); const D = W7.backDoor; P.go(D.door.x - 3.2, D.door.z + 2.4, { tol: 0.5 }); P.face(D.door.x, D.door.z); for (let i = 0; i < 20; i++) game.step(0.05); });
  await pair('wave7-05-back-door', (h) => { W7.backDoor.group.visible = !h; });
  iso('a death in the baggage claim (damage to 0, no clover leaf: nothing there hurts him), then Retry');
  const a13 = await ev(() => { const G = game, h = G.hero; P.enter('baggage'); h.clovers = 0; h.hp = 1; h.invuln = 0; h.damage(5, null); let k = 0; while (k < 80 && G.state !== 'gameover') { G.step(0.1); k++; } return { dead: h.dead, state: G.state }; });
  { const reloaded = page.waitForEvent('load', { timeout: 600000 }); await page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true }); await reloaded; await reboot(); }
  const a14 = await ev(() => ({ state: game.state, room: game.room?.id, hp: game.hero.hp, max: game.hero.maxHp, w7: w7(), sh: W7.store?.u, back: game.room?.exits?.some((e) => e.to === 'w7-back-out') }));
  check('A: Game Over, Retry: back in the baggage claim with full life; the store open, the key carried, the back door open (all kept)', a13.dead && a13.state === 'gameover' && a14.room === 'baggage' && a14.hp === a14.max && a14.w7.w7m_store && a14.w7.w7m_key && a14.w7.w7m_back && a14.sh === 1 && a14.back, { a13, a14 });
  const a15 = await ev(() => { const r = ctrl(); const m = items(); const p = pick('Swing'); P.settle(); return { r, m, p, hoist: !!game.flags.w7m_hoist, unclamp: !!game.flags.w7m_unclamp, y: r2(W7.lift.crateA().y) }; });
  const a15l = await said();
  check('A: back at the lift (INPUT): the key frees the clamp; "Swing over and lower" first: the boom pulls, the barge heels, nothing moves', a15.r === 'used' && a15.unclamp && a15.m.includes('Hoist') && !a15.hoist && a15.y < 1.2 && has(a15l, /clamp comes off/) && has(a15l, /Hoist it first/), { a15, a15l });
  iso('Save & quit by the lift, then Continue');
  await saveQuit();
  const a16 = await ev(() => ({ room: game.room?.id ?? 'citadel', w7: w7(), pin: W7.lift.L.lever.parent.children.some((c) => c.visible === false) }));
  check('A: Save & quit → Continue: the clamp off, the key used, nothing hoisted (all as left)', a16.room === 'citadel' && a16.w7.w7m_unclamp && !a16.w7.w7m_hoist, a16);
  const a17 = await ev(() => { ctrl(); pick('Hoist'); game.step(2.8); P.settle(); const up = r2(W7.lift.crateA().y); ctrl(); pick('Swing'); game.step(1.6); return { up, hoist: !!game.flags.w7m_hoist }; });
  await shot('wave7-06-lift-swinging');
  const a17b = await ev(() => { game.step(2.4); P.settle(); const c = W7.lift.crateA(); return { lift: !!game.flags.w7m_lift, pier: r2(c.y), x: r2(c.x), z: r2(c.z) }; });
  const a17l = await said();
  check('A: Hoist: the crate rises off the barge; Swing over and lower: it swings over and down onto the pier', a17.hoist && a17.up > 2.2 && a17b.lift && Math.abs(a17b.pier - 2.16) < 0.1 && has(a17l, /It's up/) && has(a17l, /On the pier/), { a17, a17b, a17l });
  const a18 = await ev(() => { const c0 = game.hero.clovers, k0 = game.hero.coins; const k = P.talk('pippa'); P.settle(); return { k: k.r, done: !!game.flags.w7m_done, dc: game.hero.clovers - c0, dk: game.hero.coins - k0, crate: W7.lift.L.crate.visible, stock: !!W7.stock && game.world.root.children.find((o) => o.name === 'wave7 shelter stock')?.visible, j: game.story.journal().find((s) => /Missing deliveries/.test(s.title))?.lines.map((l) => l.done) }; });
  const a18l = await said();
  check('A: Pippa (TALK): "Tim! Lulu! Take the cart"; a clover leaf (or kashes at nine); the crate gone from the pier; the shelter\'s doorway stocked; the journal\'s section done', a18.k === 'talked' && a18.done && (a18.dc === 1 || a18.dk === 15) && a18.crate === false && a18.stock && a18.j?.every(Boolean) && has(a18l, /Take the cart/), { a18, a18l });
  const a19 = await ev(() => { const k = P.talk('tim', { run: true }); return { k: k.r, after: !!game.flags.w7m_timAfter, tim: at('tim') }; });
  const a19l = await said();
  check('A: Tim by the depot shelter (TALK, INPUT: up to the plateau): they wheeled the blankets up themselves', a19.k === 'talked' && a19.after && has(a19l, /wheeled the blankets/), { a19, a19l });
  await ev(() => { const p = W7.stock.at; P.go(p.x + 2.5, p.z + 3.2, { tol: 0.5 }); P.face(p.x, p.z); for (let i = 0; i < 20; i++) game.step(0.05); });
  await pair('wave7-07-shelter-stock', (h) => W7.stock.setOn(!h));
  iso('the ending (the chapter key set to home)');
  const a20 = await ev(() => { Object.assign(game.flags, { chapterKey: 'home', chapter: game.story.chapters.findIndex((c) => c.key === 'home'), ep_dinner: true }); game.story.applyFlags(); game.step(0.2); const L = W7.lift.L; return { crate: L.crate.visible, u: L.u, stencil: W7.lift.L.crate.children.some((c) => c.isGroup && c.visible === false), doors: game.story.doors().filter((d) => d.room === 'baggage').length, stock: game.world.root.children.find((o) => o.name === 'wave7 shelter stock')?.visible }; });
  check('A: the ending (ISO): the lift as the opening left it (its crate back on the pier, no stencil); the back passage still open (two doors into the baggage claim); the shelter\'s stock gone with the shelters', a20.crate && a20.u === 1 && a20.doors === 2 && a20.stock === false, a20);
}

// ================================================================ S · the pieces shown in a state, scanned
if (ONLY.includes('S')) {
  if (!ONLY.includes('A')) iso('S alone: the chapter-8 save, the states set by flags');
  await page.addScriptTag({ path: SWEEP }); await ev(() => SW.init());
  const s1 = await ev(async () => {
    const G = game, f = G.flags, out = {};
    if (G.room) G.exitRoom({ x: -60, z: -2, a: 0 }, true);
    Object.assign(f, { chapterKey: 'evacuation', chapter: G.story.chapters.findIndex((c) => c.key === 'evacuation') }); f.c8_pippa = true; f.w7m_hook = true; f.w7m_back = true; f.w7m_store = true; delete f.w7m_done; delete f.w7m_lift; delete f.w7m_hoist;
    G.story.applyFlags(); G.step(0.2);
    W7.stock.setOn(true);
    const keep = (r) => { const all = [...(r.interp || []), ...(r.zf || []), ...(r.floats || []), ...(r.sunk || []), ...(r.buried || []), ...(r.decals || []), ...(r.rockCut || [])]; return all.filter((x) => /wave7/.test(JSON.stringify(x))).map((x) => JSON.stringify(x).slice(0, 300)); };
    const box = (x, z, r) => ({ bounds: { x0: x - r, x1: x + r, z0: z - r, z1: z + r } });
    const L = W7.lift.crateA(), St = W7.stall.at, D = W7.backDoor.door, K = W7.stock.at;
    out.lift = keep(SW.scan(box(L.x, L.z, 3), { step: 0.2 })); SW.free();
    out.stall = keep(SW.scan(box(St.x, St.z, 2.5), { step: 0.2 })); SW.free();
    out.back = keep(SW.scan(box(D.x, D.z, 2.5), { step: 0.2 })); SW.free();
    out.stock = keep(SW.scan(box(K.x, K.z, 3), { step: 0.2 })); SW.free();
    G.regions.ensure('baggage', 'test'); G.enterRoom('baggage', null, true); P.settle(); G.step(0.2);
    out.store = keep(SW.scan({ room: 'baggage' }, { step: 0.2 })); SW.free();
    return out;
  });
  check('S: the pieces shown only in a state — the lift\'s stencils, the stall\'s crate, the back door open, the shelter\'s stock, the baggage claim with its store open — scanned (overlap sweep library): no finding names a wave-7 piece', Object.values(s1).every((a) => a.length === 0), s1);
}

// ================================================================ B · H-18 Dallan's Debt
if (ONLY.includes('B')) {
  if (browser) await browser.close();
  await boot('base-13-desert');
  const b0 = await ev(() => { const G = game; if (G.room?.id !== 'desert') { G.regions.ensure('desert', 'test'); G.enterRoom('desert', G.rooms.desert.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); } return { v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, ch: game.flags.chapterKey, bore: !!game.flags.c10_bore, room: game.room?.id, w7: Object.keys(w7()), shade: W7.shade?.state }; });
  check('B: the campaign\'s chapter-14 save on Desert Island (format 5, the bore\'s relay held) loads: format 6, no w7 state made up; Lumi\'s shade torn by the vent', b0.v === 6 && b0.ch === 'network' && b0.bore && b0.room === 'desert' && b0.w7.length === 0 && b0.shade === 'torn', b0);
  await ev(() => { const L = P.npc('weaver'); P.go(L.pos.x + 3.5, L.pos.z + 4.5, { tol: 0.5 }); P.face(L.pos.x - 1, L.pos.z - 1); for (let i = 0; i < 20; i++) game.step(0.05); });
  await pair('wave7-08-shade-torn', (h) => W7.shade.setState(h ? 'whole' : 'torn'));
  const b1 = await ev(() => { const k = P.talk('weaver'); const m = items(); const p = pick('should pay'); P.settle(); return { k: k.r, m, p, need: !!game.flags.w7d_need }; });
  const b1l = await said();
  check('B: Lumi (TALK): the vent took her shade; "Dallan should pay for this": "I\'ve had the project\'s apology. It was a form." — nothing gained', b1.k === 'talked' && b1.m.length === 3 && !b1.need && has(b1l, /It was a form/), { b1, b1l });
  const b2 = await ev(() => { P.talk('weaver'); const p = pick('What do you need'); P.settle(); return { p, need: !!game.flags.w7d_need }; });
  const b2l = await said();
  check('B: Lumi again, "What do you need?": canvas, two poles, the top ring back on its hook; the project\'s store has the canvas', b2.need && has(b2l, /top ring/), { b2, b2l });
  const b3 = await ev(() => { const d0 = at('dallan'); const k = P.talk('dallan', { run: true }); P.settle(); return { d0, k: k.r, dal: !!game.flags.w7d_dallan, d1: at('dallan'), shade: W7.shade.state, sail: W7.shade.dallan }; });
  const b3l = await said();
  check('B: Dallan at the bore (TALK, INPUT: walked there): "I can carry it." — "No. I\'ll carry it."; he is at the sail with the canvas, the low corners tied', b3.k === 'talked' && b3.dal && b3.shade === 'rigged' && Math.hypot(b3.d1.x - b3.sail.x, b3.d1.z - b3.sail.z) < 0.6 && has(b3l, /No\. I'll carry it/) && !has(b3l, /sorry|apolog/i), { b3, b3l });
  iso('Save & quit in Kesh, then Continue');
  await saveQuit();
  const b4 = await ev(() => { const S = W7.shade; const d = at('dallan'); return { shade: S?.state, near: d ? r2(Math.hypot(d.x - S.dallan.x, d.z - S.dallan.z)) : null, w7: w7() }; });
  check('B: Save & quit → Continue: the shade rigged, Dallan still by it', b4.shade === 'rigged' && b4.near != null && b4.near < 0.6, b4);
  await ev(() => { const L = P.npc('weaver'); P.go(L.pos.x + 3.5, L.pos.z + 4.5, { tol: 0.5 }); P.face(L.pos.x - 1, L.pos.z - 1); for (let i = 0; i < 20; i++) game.step(0.05); });
  await shot('wave7-09-shade-rigged');
  const b5 = await ev(() => { const k = P.talk('dallan'); return { k: k.r }; });
  const b5l = await said();
  const b6 = await ev(() => { const S = W7.shade, tg = game.rooms.desert.ballTargets.find((t) => t.onHit && Math.abs(t.x - S.hook.x) < 0.01); const before = tg.done; const ok = P.hitTarget(tg, 4); P.settle(); return { before, ok, up: !!game.flags.w7d_up, shade: S.state }; });
  const b6l = await said();
  check('B: Dallan by the sail (TALK): the third ring is Twinsen\'s; the ball at the high pole\'s hook (INPUT, F): the ring on it, the sail up — Lumi: "The sail\'s straight. That\'s something." Dallan: the knots, after the next wind', b5.k === 'talked' && has(b5l, /That's yours/) && b6.before === false && b6.up && b6.shade === 'whole' && has(b6l, /That's something/) && has(b6l, /check the knots/), { b5, b5l, b6, b6l });
  await shot('wave7-10-shade-up');
  const b7 = await ev(() => { const k1 = P.talk('weaver'); const k2 = P.talk('dallan', { run: true }); return { k1: k1.r, k2: k2.r, j: game.story.journal().find((s) => /Lumi's shade/.test(s.title))?.lines.map((l) => l.done) }; });
  const b7l = await said();
  check('B: after: Lumi checks it every morning anyway; Dallan (back at the bore): "Knots held."; the journal\'s section done', has(b7l, /every morning anyway/) && has(b7l, /Knots held/) && b7.j?.every(Boolean), { b7, b7l });
}

if (browser) await browser.close();
done();
