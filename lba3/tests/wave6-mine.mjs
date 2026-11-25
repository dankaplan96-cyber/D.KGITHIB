// WAVE 6 · H-16 "The Lift Below" (docs/lba-maturity/WAVE6.md; card: CONTENT-15H.md §3, EXPANSION_PLAN.md OP-7):
// the reserved lift's key behind a bar tab, the ride down with its hand brake, the Wannies' deep seam (wanniemine.js),
// the glove, the Blow (gasblow.js). One covering suite, played by input where it says INPUT (tests/lib/player.js:
// arrow keys, E, F, K) from the campaign's own chapter-4 save (tests/fixtures/campaign/base-07-dig: format 5, made
// before wave 6), loaded through Continue as a player would:
//   A  the old save loads (format 6 after the upgrade, chapter 4, no zo_ state made up, the mine not built);
//      the Platform: Foreman Krum's and Mother Pudd's hook (TALK), the mine mouth's door in (INPUT) to the incline's
//      landing, the project's boards seen from behind and the deep shift's voice (E), out again (INPUT)
//   B  the Lift Dock: the lever without the key (E: the plate, Vash), Vash (TALK); Otringal: the hotel's register (E),
//      Old Haskel (TALK: the brake); the bar: Madam Orla's tab (TALK, the counter shut unpaid: 12 kashes), the ball at
//      the stage's winch (F): the curtain up, Lys sings, the key and the bill — the WINCH way;
//      then, from a fresh state (ISO), the PAY way: Orla (TALK), the tab paid at the counter (a pick): the key, 40 kashes less
//   C  the ride: the key in the lever (E); the motor coughs and he does NOT brake: the catch, wound back up to the dock,
//      Vash's line (a recoverable failure); again, the brake on the cough (E): eased down into the deep landing
//   D  the deep seam: Gant (TALK) keeps the project's rule and names the Dark Monk's temple, "Not now" (a pick) and he
//      sits; again, Sorrel's bill shown (a pick): a cheat, but no decision yet (the second round); Celebration: the
//      temple by its portal (INPUT), the Wannies' carving under the prophecy (E), the region read there; back at the
//      landing, the carving told (a pick): the turn, the Wannie GLOVE (the found box); Marl; the oil jar (E); into the gallery (INPUT); the boards' look in the
//      dark; the three lamp posts lit (E); Save & quit → Continue in the gallery: the lamps kept; a bare fist at a wedge
//      (K) does nothing; the glove (K) knocks both wedges: the boards slide into the sump; up the incline and out of the
//      old mouth (INPUT): the shift is home (Tull at his mother's, Gant at the mouth; their lines); back in through the
//      mouth (the shortcut, INPUT) and down the incline to the gallery floor
//   E  the Blow: in by its way (INPUT); a DEATH (ISO: 2 life, no clover leaf, no catch): Game Over → Retry: back at the
//      room's door with full life, the Blow asleep and whole; the ball through its gas (F: no harm); the fight by input:
//      the glove catches its fireballs (K) and throws them back (K) — three hits — beaten; the vents calm; the strongbox
//      (E): 40 kashes and a clover; the catch's reach (1.8 m: a fireball 2.2 m in front is not caught, 1.6 m is);
//      the ride back up from the landing (E) to the Lift Dock (the lift runs both ways)
// ISO (logged): the shuttle rides between the islands are travel.mjs's (here: put on the island's pad); the bar's and
// the hotel's doors are walked in from 2.2 m before their sill. ONLY=A..E for a part (the state before it is set by its
// flags, logged). SHOTS=dir writes the pictures (the play camera; WAVE6.md lists them). SERVE=1 answers this checkout's
// files by request routing. Automated runtime only (SwiftShader, headless Chromium): no listening, no hardware figure.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/campaign/base-07-dig.save.json', import.meta.url));
const ONLY = process.env.ONLY || 'ABCDE';
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const toasts = () => ev(() => [...document.querySelectorAll('#toast .toast, .toast')].map((e) => e.textContent));
const helpers = () => ev(async () => {
  const ZI = await import('/src/game/zislands.js'); window.ZI = ZI;
  const WMm = await import('/src/game/wanniemine.js'); window.WM = WMm.WM;
  const OB = await import('/src/game/otrbar.js'); window.BAR = OB.BAR;
  window.LB = () => game.story.lb;
  const TR = await import('/src/game/travel.js'); window.regionOf = () => TR.regionOf(game);
  const CT = await import('/src/game/celtemple.js'); window.TEMPLE = CT.TEMPLE;
  window.zo = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('zo_')));
  window.toIsle = (n) => { const G = game, reg = 'isle_' + n; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R; };
  window.before = (x, z, fx, fz, d = 2.2) => { const G = game, h = G.hero, l = Math.hypot(fx, fz) || 1; const sx = x + fx / l * d, sz = z + fz / l * d; h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 8), sz); h.angle = Math.atan2(x - sx, z - sz); h.onGround = true; h.vy = 0; G.camRig.snap(); G.step(0.3); P.settle(); };
  // into a room by its door, walked from 2.2 m before its sill (the islands' houses: their door's own facing)
  window.walkIn = (rid) => { const G = game, d = G.story.doors().find((q) => q.room === rid); if (!d) return { r: 'no door' };
    const sd = G.room?.shutDoors?.find((q) => q.id === d.house); if (sd) { const a = sd.ry ?? 0; before(d.x, d.z, Math.sin(a), Math.cos(a), 2.2); }
    const t = P.through(d.x, d.z); P.settle(); G.step(0.5); return { r: t.r, room: G.room?.id }; };
  window.outOf = (to) => { const G = game, e = G.room?.exits?.find((x) => (to ? x.to === to || x.room === to : /-out$/.test(x.to))); if (!e) return { r: 'no exit' }; const t = P.through(e.x, e.z); P.settle(); return { r: t.r, room: G.room?.id }; };
  window.toRoom = (rid) => { const G = game, e = G.room?.exits?.find((x) => x.room === rid); if (!e) return { r: 'no way to ' + rid }; const t = P.through(e.x, e.z); P.settle(); G.step(0.3); return { r: t.r, room: G.room?.id }; };
  window.setFlags = (o) => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('zo_')) delete f[k]; Object.assign(f, o); game.story.applyFlags(); game.story.refreshCast(); game.step(0.3); P.settle(); };
  window.waitRide = (until, maxS = 40) => { const G = game; let t = 0; while (t < maxS && !until()) { G.step(1 / 30); t += 1 / 30; } return +t.toFixed(2); };
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

// ================================================================ A · the old save; the Platform's hooks and the mouth
const st = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
await helpers(); await said();
const a0 = await ev(() => ({ v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, room: game.room?.id, zo: Object.keys(zo()), mine: !!game.regions.built('wm_gallery'), coins: game.hero.coins, glove: !!game.hero.arms.glove, lb: !!LB(), open: LB().open() }));
check('A: the campaign\'s chapter-4 save from before wave 6 (format 5) loads through Continue: chapter 4, in play, no zo_ state made up, the mine not built yet, the quest open (the shuttles run)', a0.v === 6 && a0.state === 'play' && a0.chapter === 'dig' && a0.zo.length === 0 && !a0.mine && a0.lb && a0.open, a0);

if (ONLY.includes('A')) {
  iso('the shuttle to the Platform (travel.mjs covers the rides): put on its pad');
  const a1 = await ev(() => { toIsle('platform'); const k = P.talk('pf_foreman'); return { k: k.r, heard: !!game.flags.zo_heard }; });
  const a1l = await said();
  // (Mother Pudd's round takes her home now and then: talked to where she is, out or at home behind her door)
  const a2 = await ev(() => { const G = game; for (let i = 0; i < 60 && !P.npc('pf_vill1')?.present; i++) G.step(1); const k = P.talk('pf_vill1'); return { k: k.r }; });
  const a2l = await said();
  check('A: on the Platform, Foreman Krum (TALK): four miners down the deep seam in the project\'s cage, the incline boarded, ask Vash at the Lift Dock; Mother Pudd (TALK): her Tull below', a1.k === 'talked' && a1.heard && has(a1l, /deep seam in the project's cage/) && has(a1l, /Ask Vash at the Lift Dock/) && a2.k === 'talked' && has(a2l, /My Tull is down the deep seam/), { a1, a2, a1l, a2l });
  await shot('wave6-01-platform-mouth');
  const a3 = await ev(() => { const r = walkIn('wm_gallery'); const h = game.hero.pos; return { ...r, y: +h.y.toFixed(2), x: +(h.x - 12100).toFixed(1) }; });
  check('A: the Wannies\' mine mouth on the Platform is a door (INPUT): in at the old incline\'s head, up behind the project\'s boards (2.7–3 m up, the west end of the deep seam)', a3.room === 'wm_gallery' && a3.y > 2.5 && a3.x < -14, a3);
  await shot('wave6-02-incline-top');
  const a4 = await ev(() => { const G = WM.gallery; const u = P.use(G.back.x, G.back.z, { kind: 'zo_back', near: 1.6, match: 2.6 }); return { u: u.r }; });
  const a4l = await said();
  check('A: the boards from behind (E): the back of the project\'s boards, the deep shift\'s voice — don\'t knock them from up here, get the cage down, the buyer has the key', a4.u === 'used' && has(a4l, /back of the project's boards/) && has(a4l, /Get the cage down/), { a4, a4l });
  const a5 = await ev(() => outOf('wm-out'));
  check('A: out of the old mouth again (INPUT): on the Platform before the mine', a5.room === 'isle_platform', a5);
}

// ================================================================ B · the key: the winch way and the pay way
if (ONLY.includes('B')) {
  if (!ONLY.includes('A')) { iso('B alone: the hook heard (flags)'); await ev(() => setFlags({ zo_heard: true })); }
  iso('the shuttle to the Lift Dock: put on its pad');
  const b1 = await ev(() => { const R = toIsle('liftdock'), L = R.lift; const u = P.use(L.lever.x, L.lever.z, { kind: 'zo_lever', near: 1.1, match: 2.0 }); return { u: u.r, reserved: !!game.flags.zo_reserved, ride: !!LB().ride }; });
  const b1l = await said();
  check('B: the Lift Dock\'s lever without the key (E): LIFT RESERVED, PROJECT KEY ONLY; Vash by it names the buyer, Sorrel, and Otringal; no ride', b1.u === 'used' && b1.reserved && !b1.ride && has(b1l, /LIFT RESERVED/) && has(b1l, /Sorrel/) && has(b1l, /Try Otringal/), { b1, b1l });
  await shot('wave6-03-liftdock-lever');
  iso('the shuttle to Otringal: put on its pad');
  const b2 = await ev(() => { toIsle('otringal'); return walkIn('otrhotel'); });
  const b2b = await ev(async () => { const OH = await import('/src/game/otrhotel.js'); const r = OH.HOTEL.register; const u = P.use(r.x, r.z, { kind: 'zo_register', near: 0.9 }); return { u: u.r, reg: !!game.flags.zo_register }; });
  const b2l = await said();
  const b3 = await ev(() => { const k = P.talk('zo_explorer'); return { k: k.r }; });
  const b3l = await said();
  check('B: the Imperial Hotel by its door (INPUT): the register (E) — SORREL, project buyer, account at the harbour bar; Old Haskel (TALK) — the cage\'s motor coughs in the gas, brake on the cough', b2.room === 'otrhotel' && b2b.u === 'used' && b2b.reg && has(b2l, /SORREL, project buyer/) && b3.k === 'talked' && has(b3l, /Brake on the cough/), { b2, b2b, b3, b2l, b3l });
  const b4 = await ev(() => { outOf(); const r = walkIn('otrbar'); const lys = P.npc('zo_singer'); return { ...r, lys: !!lys?.present, onStage: lys ? +lys.pos.y.toFixed(2) : null, coins: game.hero.coins, curtain: +BAR.stage.x.toFixed(1), region: regionOf() }; });
  check('B: the harbour bar by its door (INPUT): Lys stands on the stage (0.9 m up), the curtains drawn; the map\'s region inside is Otringal (was \'citadel\')', b4.room === 'otrbar' && b4.lys && b4.onStage > 0.8 && b4.region === 'isle_otringal', b4);
  await shot('wave6-04-bar-curtain-shut');
  const b5 = await ev(() => { const k = P.talk('ot_boss'); const st0 = game.state; const shop = !!document.querySelector('#shop:not(.hidden)'); P.tap('Escape', 0.1); P.settle(); return { k: k.r, st0, shop, tab: !!game.flags.zo_tab, key: game.flags.zo_key ?? null, coins: game.hero.coins }; });
  const b5l = await said();
  check('B: Madam Orla (TALK): Sorrel\'s key behind her bar against his 40-kash tab — pay it, or get the stage\'s jammed curtain winch working; her counter opens, shut unpaid (12 kashes): no key', b5.k === 'talked' && b5.st0 === 'shop' && b5.shop && b5.tab && !b5.key && has(b5l, /Forty kashes/) && has(b5l, /curtain winch jammed/), { b5, b5l });
  const b6 = await ev(() => { const G = game, W = BAR.winch, h = G.hero; P.go(W.x - 2.2, W.z + 4.6, { tol: 0.4 }); P.settle(); const c0 = h.coins; P.throwAt(W.x, W.z); P.settle(); for (let i = 0; i < 30 && G.state !== 'play'; i++) P.settle(); G.step(4); P.settle();
    return { winch: !!G.flags.zo_winch, key: G.flags.zo_key ?? null, coins: h.coins - c0, keyItem: G.story.items().some((i) => i.id === 'zo_key'), lysAnim: P.npc('zo_singer')?.forceAnim ?? null }; });
  const b6l = await said();
  check('B: the ball at the winch high on the stage\'s frame (INPUT, F): the curtain rises, Lys: "Places, everyone", Orla calls the tab square — the key (the WINCH way) and Sorrel\'s bill, no kashes taken', b6.winch && b6.key === 'winch' && b6.coins === 0 && b6.keyItem && has(b6l, /Places, everyone/) && has(b6l, /pays Sorrel's tab/), { b6, b6l });
  await shot('wave6-05-bar-curtain-up');
  iso('a fresh state for the PAY way: the key, the winch and the tab forgotten (zo_ flags), 50 kashes given');
  const b7 = await ev(() => { setFlags({ zo_heard: true, zo_reserved: true }); const h = game.hero; h.coins = 50; const k = P.talk('ot_boss'); const shop = game.state === 'shop'; const pick = P.menuPick(0); P.settle(); return { k: k.r, shop, pick: pick.r, key: game.flags.zo_key ?? null, coins: h.coins, curtainShut: !game.flags.zo_winch }; });
  const b7l = await said();
  check('B: the PAY way (TALK, a pick at her counter): 40 kashes paid, Orla: "Paid in full", the key (zo_key = paid); the curtain stays drawn', b7.k === 'talked' && b7.shop && b7.key === 'paid' && b7.coins === 10 && b7.curtainShut && has(b7l, /Paid in full/), { b7, b7l });
  const b8 = await ev(() => { outOf(); return { room: game.room?.id }; });
  check('B: out of the bar onto Otringal\'s quay (INPUT)', b8.room === 'isle_otringal', b8);
}

// ================================================================ C · the ride: the catch, then the brake
if (ONLY.includes('C')) {
  if (!ONLY.includes('B')) { iso('C alone: the key (flags)'); await ev(() => setFlags({ zo_heard: true, zo_reserved: true, zo_tab: true, zo_key: 'paid' })); }
  const c1 = await ev(() => { const R = toIsle('liftdock'), L = R.lift; const u = P.use(L.lever.x, L.lever.z, { kind: 'zo_lever', near: 1.1, match: 2.0 }); const ph = LB().ride?.ph; const t = waitRide(() => LB().ride?.ph === 'cough'); return { u: u.r, ph, t, y: +game.hero.pos.y.toFixed(2), deck: +L.top.y.toFixed(2) }; });
  await shot('wave6-06-ride-cough');
  check('C: the key in the lever (E): the cage goes down the tower into the gas; on the last stretch the motor coughs (the brake\'s moment), well under the deck', c1.u === 'used' && c1.ph === 'down' && c1.ph !== undefined && c1.y < c1.deck - 8, c1);
  const c2 = await ev(() => { const G = game; const t = waitRide(() => LB().ride?.ph === 'back'); const caught = LB().ride?.ph; waitRide(() => !LB().ride, 30); P.settle(); return { caught, room: G.room?.id, miss: G.flags.zo_miss ?? 0, down: !!G.flags.zo_down, y: +G.hero.pos.y.toFixed(2) }; });
  const c2l = await said(); const c2t = await toasts();
  check('C: no brake on the cough: the safety catch stops the cage and it is wound back up to the dock; Vash: "brake on the cough, not after it" (a miss, no harm, try again)', c2.caught === 'back' && c2.room === 'isle_liftdock' && c2.miss === 1 && !c2.down && c2.y > 4 && has(c2l, /not after it/), { c2, c2l, c2t });
  const c3 = await ev(() => { const G = game, L = G.rooms.isle_liftdock.lift; const hp0 = G.hero.hp; P.use(L.lever.x, L.lever.z, { kind: 'zo_lever', near: 1.1, match: 2.0 }); waitRide(() => LB().ride?.ph === 'cough'); G.step(0.3); P.tap('KeyE', 0.05); const ph = LB().ride?.ph; waitRide(() => !LB().ride && !G.trans, 40); P.settle(); return { ph, room: G.room?.id, down: !!G.flags.zo_down, hp: G.hero.hp - hp0, y: +G.hero.pos.y.toFixed(2) }; });
  const c3l = await said();
  check('C: again, the brake on the cough (INPUT, E): eased down; into the deep landing on the cage\'s floor; Gant: "That\'s not the buyer"', c3.ph === 'braked' && c3.room === 'wm_landing' && c3.down && c3.hp === 0 && c3.y < 0.5 && has(c3l, /That's not the buyer/), { c3, c3l });
  await shot('wave6-07-deep-landing');
}

// ================================================================ D · the deep seam
if (ONLY.includes('D')) {
  if (!ONLY.includes('C')) { iso('D alone: down at the landing (flags)'); await ev(() => { setFlags({ zo_heard: true, zo_reserved: true, zo_tab: true, zo_key: 'paid', zo_down: true }); game.regions.ensure('wm_landing', 'test'); game.enterRoom('wm_landing', null, true); P.settle(); game.story.refreshCast(); }); }
  const d1 = await ev(() => { const k = P.talk('zo_gant'); const menu = game.state === 'shop'; const pick = P.menuPick(1); P.settle(); return { k: k.r, menu, pick: pick.r, gant: game.flags.zo_gant ?? 0, glove: !!game.hero.arms.glove }; });
  const d1l = await said();
  check('D: Gant (TALK): the deep shift; the plate says ore only, a Wannie in the cage and the week is docked; the incline boarded, their rule; their paper, and the old ones\' carving in the Dark Monk\'s temple on Celebration; a choice: "Not now" — "Then we sit"', d1.k === 'talked' && d1.menu && d1.gant === 1 && !d1.glove && has(d1l, /ore only/) && has(d1l, /Dark Monk's temple on Celebration/) && has(d1l, /Then we sit/), { d1, d1l });
  const d2a = await ev(() => { const k = P.talk('zo_gant'); const pick = P.menuPick(0); for (let i = 0; i < 12; i++) { P.settle(); game.step(0.5); } return { k: k.r, pick: pick.r, gant: game.flags.zo_gant ?? 0, glove: !!game.hero.arms.glove, bill: !!game.flags.zo_billShown, menu: game.state === 'shop', jr: game.story.lb.journal().map((j) => j.key) }; });
  const d2al = await said();
  check('D: Gant again, Sorrel\'s bill shown (a pick): "Forty kashes. While Marl rationed the lamp oil" — a cheat, but their paper still says the seam is theirs: no decision, no glove; he sends him to the temple; the journal lists the bill and the carving', d2a.gant === 1 && !d2a.glove && d2a.bill && !d2a.menu && has(d2al, /While Marl rationed/) && has(d2al, /A cheat, then/) && has(d2al, /Go and see what the old ones carved/) && d2a.jr.includes('zo_j_murals'), { d2a, d2al });
  iso('the shuttle to Celebration: put on its pad; before the temple\'s portal on the plaza (2.2 m), walked in');
  const d2b = await ev(() => { toIsle('celebration'); const d = game.story.doors().find((q) => q.room === 'celtemple'); before(d.x, d.z, 0, 1, 2.2); const t = P.through(d.x, d.z); P.settle(); game.step(0.5); const F = TEMPLE.frieze; const u = P.use(F.look.x, F.z, { kind: 'zo_murals', near: 1.2, match: 2.6 }); return { t: t.r, room: game.room?.id, region: regionOf(), u: u.r, seen: !!game.flags.zo_murals }; });
  const d2bl = await said();
  check('D: the Temple of the Dark Monk by its portal (INPUT): the map\'s region inside is Celebration (was \'citadel\'); the Wannies\' carving under the prophecy (E): the seam, the gas, their own incline, a Wannie hand over the mouth', d2b.room === 'celtemple' && d2b.region === 'isle_celebration' && d2b.u === 'used' && d2b.seen && has(d2bl, /older carving/) && has(d2bl, /Wannie hand/), { d2b, d2bl });
  iso('back down at the deep landing (the ride is C\'s): put at the cage');
  const d2 = await ev(() => { const G = game; outOf(); G.regions.ensure('wm_landing', 'test'); G.enterRoom('wm_landing', null, true); P.settle(); G.story.refreshCast(); const k = P.talk('zo_gant'); const items = [...document.querySelectorAll('#shop .item, #shop li, #shop button')].map((e) => e.textContent).join(' | '); const pick = P.menuPick(0); for (let i = 0; i < 12; i++) { P.settle(); G.step(0.5); } return { k: k.r, pick: pick.r, items, gant: G.flags.zo_gant ?? 0, glove: !!G.hero.arms.glove, how: G.flags.zo_glove }; });
  const d2l = await said();
  check('D: Gant again, the temple\'s carving told (a pick): "The seam was ours before their paper" — their rule holds nobody; the two wedges; his WANNIE GLOVE given (the found box)', d2.gant === 2 && d2.glove && d2.how === 'given' && has(d2l, /ours before their paper/) && has(d2l, /Take my glove/) && has(d2l, /Light the posts as you go/), { d2, d2l });
  const d3 = await ev(() => { const k = P.talk('zo_marl'); const O = WM.landing.oil; const u = P.use(O.x, O.z, { kind: 'zo_oil', near: 0.9 }); return { k: k.r, u: u.r, oil: !!game.flags.zo_oil }; });
  const d3l = await said();
  check('D: Marl (TALK): the oil jar by the rack, and the Blow — only its own fire hurts it, catch it in a glove; the jar (E): lamp oil for three posts', d3.k === 'talked' && d3.u === 'used' && d3.oil && has(d3l, /Only its own fire hurts it/) && has(d3l, /Enough for three posts/), { d3, d3l });
  const d4 = await ev(() => { const r = toRoom('wm_gallery'); const G = WM.gallery; const u = P.use(G.bulk.x, G.bulk.z, { kind: 'zo_bulk', near: 1.4, match: 2.5 }); return { ...r, u: u.r }; });
  const d4l = await said();
  check('D: into the deep seam by the tunnel (INPUT); the boards at the gallery\'s end looked at in the dark (E): too dark to see what holds them', d4.room === 'wm_gallery' && d4.u === 'used' && has(d4l, /Too dark to see what holds/), { d4, d4l });
  const d5 = await ev(() => { const G = WM.gallery, out = []; G.posts.forEach((p, i) => { const u = P.use(p.x, p.z, { kind: 'zo_post', near: 0.9 }); out.push(u.r); }); return { out, lamps: game.flags.zo_lamps, lit: G.lamps.map((l) => l.l.userData.base) }; });
  const d5l = await said();
  check('D: the three lamp posts down the gallery lit (E each): the seam glitters; the last shows the boards and their two wedges', d5.out.every((r) => r === 'used') && d5.lamps === 7 && d5.lit.every((b) => b > 0) && has(d5l, /two wedges at their foot/), { d5, d5l });
  await shot('wave6-08-gallery-lit');
  iso('Save & quit through the pause menu in the gallery, then Continue (as a player)');
  await saveQuit(); await reboot();
  const d6 = await ev(() => ({ room: game.room?.id, lamps: game.flags.zo_lamps, lit: WM.gallery.lamps.map((l) => l.l.userData.base), glove: !!game.hero.arms.glove, open: !!game.flags.zo_open, bulk: WM.gallery ? true : false }));
  check('D: after Continue: in the deep seam, the three lamps still lit, the glove in his pocket, the boards still up', d6.room === 'wm_gallery' && d6.lamps === 7 && d6.lit.every((b) => b > 0) && d6.glove && !d6.open, d6);
  const d7 = await ev(() => { const G = game, h = G.hero, W = WM.gallery.wedges[0]; P.go(W.x + 1.2, W.z, { tol: 0.25 }); P.face(W.x, W.z); h.combat.equip('fists', true); P.settle(); P.tap('KeyK', 0.05); G.step(0.8); P.settle(); return { w: G.flags.zo_wedges ?? 0 }; });
  const d7t = await toasts();
  check('D: a bare fist at a wedge (INPUT, K): it holds — "a Wannie glove would shift it"', d7.w === 0 && d7t.some((s) => /Wannie glove would shift it/.test(s)), { d7, d7t });
  const d8 = await ev(() => { const G = game, h = G.hero, out = []; h.combat.equip('glove', true); P.settle();
    for (const W of WM.gallery.wedges) { P.go(W.x + 1.2, W.z, { tol: 0.25 }); P.face(W.x, W.z); P.tap('KeyK', 0.05); G.step(0.8); out.push(G.flags.zo_wedges ?? 0); }
    for (let i = 0; i < 40 && LB().fall; i++) G.step(0.1); P.settle(); return { out, open: !!G.flags.zo_open, colOff: true }; });
  const d8l = await said();
  check('D: the glove (INPUT, K) knocks out one wedge, then the other: the project\'s boards slide into the sump, the incline open to daylight', d8.out[0] === 1 || d8.out[0] === 2 ? d8.out[1] === 3 && d8.open && has(d8l, /old incline is open/) : false, { d8, d8l });
  await shot('wave6-09-boards-down');
  const d9 = await ev(() => { const G = game, T = WM.gallery.landTop; const g1 = P.go(T.x, T.z, { tol: 0.6, maxT: 60 }); const y = +G.hero.pos.y.toFixed(2); const o = outOf('wm-out'); for (let i = 0; i < 10; i++) G.step(0.2); P.settle(); G.story.refreshCast(); const tull = P.npc('zo_tull'), gant = P.npc('zo_gant'); return { g1: g1.r, y, room: o.room, done: !!G.flags.zo_done, tull: !!tull?.present && G.room?.id === 'isle_platform', gant: !!gant?.present }; });
  check('D: up the old incline (INPUT, 3 m of timber steps) and out of the old mouth onto the Platform: the shift is home (zo_done), Tull by his mother\'s house, Gant at the mouth', d9.g1 === 'arrived' && d9.y > 2.8 && d9.room === 'isle_platform' && d9.done && d9.tull && d9.gant, d9);
  const d10 = await ev(() => { const a = P.talk('zo_tull'); const b = P.talk('pf_vill1'); const c = P.talk('zo_gant'); return { a: a.r, b: b.r, c: c.r }; });
  const d10l = await said();
  check('D: their lines after (TALK): Tull — fed and cried over; Mother Pudd — three loaves; Gant — "our mouth, our gems", the project\'s crates can wait', d10.a === 'talked' && has(d10l, /fed me again/) && has(d10l, /three loaves/) && has(d10l, /Our mouth, our gems/), { d10, d10l });
  await shot('wave6-10-platform-home');
  const d11 = await ev(() => { const r = walkIn('wm_gallery'); const G = game, B = WM.gallery.bulk; const g2 = P.go(B.x + 2.5, B.z, { tol: 0.6, maxT: 60 }); return { ...r, g2: g2.r, y: +G.hero.pos.y.toFixed(2), x: +(G.hero.pos.x - 12100).toFixed(1) }; });
  check('D: back in through the mouth (the shortcut, INPUT) and down the incline past where the boards stood to the gallery floor', d11.room === 'wm_gallery' && d11.g2 === 'arrived' && d11.y < 0.3 && d11.x > -8, d11);
}

// ================================================================ E · the Blow
if (ONLY.includes('E')) {
  if (!ONLY.includes('D')) { iso('E alone: the deep seam open, the glove (flags, arms)'); await ev(() => { setFlags({ zo_heard: true, zo_key: 'paid', zo_down: true, zo_gant: 2, zo_glove: 'given', zo_oil: true, zo_lamps: 7, zo_wedges: 3, zo_open: true, zo_done: true }); game.hero.arms.glove = true; game.regions.ensure('wm_gallery', 'test'); game.enterRoom('wm_gallery', null, true); P.settle(); game.story.refreshCast(); }); }
  const e1 = await ev(() => { const r = toRoom('wm_blow'); const B = LB().blow; return { ...r, st: B?.state, hp: B?.hp }; });
  check('E: into the Blow by its way off the gallery (INPUT): the gas pocket, the Blow asleep in its vent', e1.room === 'wm_blow' && e1.st === 'asleep' && e1.hp === 3, e1);
  iso('a death: 2 life, no clover leaf (set), the glove in hand, no catch');
  const e2 = await ev(() => { const G = game, h = G.hero; h.combat.equip('glove', true); h.hp = 2; h.clovers = 0; P.settle(); P.go(WM.blow.wake + 1.5, WM.blow.centre.z + 3, { tol: 0.4 }); let t = 0; while (t < 30 && !h.dead && G.state !== 'gameover') { G.step(0.1); t += 0.1; } let k = 0; while (k < 60 && G.state !== 'gameover') { G.step(0.1); k++; } return { st: LB().blow.state, dead: h.dead, state: G.state, burns: LB().blow.stats.burns }; });
  check('E: awake (the glove in hand), it winds up and spits; a fireball not caught burns 2 life: at 2 life with no clover leaf, Twinsen falls — Game Over', e2.dead && e2.state === 'gameover' && e2.burns >= 1, e2);
  await shot('wave6-11-gameover');
  iso('Retry from the Game Over screen (a click), the reload, then the play');
  { const reloaded = page.waitForEvent('load', { timeout: 600000 }); await page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true }); await reloaded;
    await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
    await ev(() => { game.testFreeze = true; }); await page.addScriptTag({ path: HARNESS });
    await ev(() => { for (let i = 0; i < 60 && game.state !== 'play'; i++) game.step(0.1); P.settle(); }); await helpers(); await said(); }
  const e3 = await ev(() => { const h = game.hero, B = LB().blow; return { state: game.state, room: game.room?.id, hp: h.hp, max: h.maxHp, st: B?.state, bhp: B?.hp, x: +(h.pos.x - 12200).toFixed(1) }; });
  check('E: Retry: back at the Blow\'s door (the room\'s autosave) with full life; the Blow asleep and whole again', (e3.state === 'play' || e3.state === 'title') && e3.room === 'wm_blow' && e3.hp === e3.max && e3.st === 'asleep' && e3.bhp === 3 && e3.x < -6, e3);
  const e4 = await ev(() => { const G = game, h = G.hero, B = LB().blow; h.combat.equip('glove', true); P.settle(); P.go(WM.blow.wake + 1.5, WM.blow.centre.z + 3, { tol: 0.4 }); for (let i = 0; i < 25 && B.state === 'wake'; i++) G.step(0.1);
    const hp0 = B.hp; P.face(B.pos.x, B.pos.z); P.tap('KeyF', 0.05); G.step(1.4); P.settle(); return { st: B.state, hp: B.hp, hp0 }; });
  const e4t = await toasts();
  check('E: awake again; the ball thrown at it (INPUT, F) goes straight through the gas: no harm, the hint', e4.hp === e4.hp0 && e4.hp === 3 && e4t.some((s) => /straight through the gas/.test(s)), { e4, e4t });
  // (the pictures: its wind-up once the toasts are gone, then a fireball on the glove)
  await ev(() => { const G = game, h = G.hero, B = LB().blow; for (let t = 0; t < 12 && !(B.state === 'windup' && B.swell > 0.75 && t > 3.6); t += 1 / 30) { G.step(1 / 30); if (h.hp < 5) h.hp = h.maxHp; if (B.state !== 'windup') P.face(B.pos.x, B.pos.z, 0.1); } });
  await shot('wave6-12-blow-windup');
  const e5a = await ev(() => { const G = game, h = G.hero, B = LB().blow; h.combat.equip('glove', true); P.release(); const d2 = (p) => Math.hypot(p.x - h.pos.x, p.z - h.pos.z);
    for (let t = 0; t < 30 && !B.held && !h.dead; t += 1 / 30) { if (h.hp < 5) h.hp = h.maxHp; const inc = B.balls.find((b) => !b.held && !b.back && d2(b.p) < 3.0 && d2(b.p) > 0.8); if (inc && !h.combat.move) P.tap('KeyK', 0.03); else G.step(1 / 30); }
    G.step(0.2); P.face(B.pos.x, B.pos.z, 0.6); return { held: !!B.held }; });
  await shot('wave6-13-blow-caught');
  const e5 = await ev(() => { const G = game, h = G.hero, B = LB().blow; let t = 0; h.combat.equip('glove', true); P.release();
    const d2 = (p) => Math.hypot(p.x - h.pos.x, p.z - h.pos.z);
    while (t < 240 && B.state !== 'gone' && !h.dead) {
      if (h.hp < 5) { h.hp = h.maxHp; }   // (not a test of his life: he is kept standing; burns are counted)
      if (B.held) { P.face(B.pos.x, B.pos.z, 1.5); P.tap('KeyK', 0.05); G.step(0.3); t += 0.4; continue; }
      const inc = B.balls.find((b) => !b.held && !b.back && d2(b.p) < 3.0 && d2(b.p) > 0.8);
      if (inc && !h.combat.move) { P.tap('KeyK', 0.03); t += 0.05; continue; }
      if (!inc && Math.abs(Math.atan2(B.pos.x - h.pos.x, B.pos.z - h.pos.z) - h.angle) % (Math.PI * 2) > 0.2) P.face(B.pos.x, B.pos.z, 0.2);
      G.step(1 / 30); t += 1 / 30;
    }
    for (let i = 0; i < 40 && B.state !== 'gone'; i++) G.step(0.1); P.settle();
    return { t: +t.toFixed(1), st: B.state, beaten: !!G.flags.zo_blow, stats: { ...B.stats }, hp: B.hp, calm: WM.blow.gas.visible === false }; });
  const e5l = await said();
  check('E: the fight by input: the glove catches its fireballs as they come (K) and throws them back at it (K): three hits, the Blow is gone; the vents calm, the gas thins (zo_blow)', e5a.held && e5.st === 'gone' && e5.beaten && e5.stats.hits === 3 && e5.stats.caught >= 3 && e5.stats.thrown >= 3 && e5.calm && has(e5l, /The vents breathe cool/), { e5a, e5, e5l });
  await shot('wave6-14-blow-beaten');
  const e6 = await ev(() => { const G = game, h = G.hero, B = WM.blow; const c0 = h.coins, k0 = h.clovers; const u = P.use(B.box.x, B.box.z, { kind: 'zo_box', near: 0.9 }); return { u: u.r, kashes: h.coins - c0, clovers: h.clovers - k0, box: !!G.flags.zo_box }; });
  check('E: the deep shift\'s strongbox in the corner (E): 40 kashes and a clover leaf', e6.u === 'used' && e6.box && e6.kashes === 40 && e6.clovers === 1, e6);
  // (second round: the catch's reach, 1.8 m in front of him; its own fight is done, so a Blow woken for the measure)
  const e6b = await ev(async () => { const GB = await import('/src/game/gasblow.js'); const h = game.hero, B = LB().blow; B.reset(); B.state = 'hover'; B.spit(); const b = B.balls[B.balls.length - 1];
    const at = (d) => { b.held = false; b.p.set(h.pos.x + Math.sin(h.angle) * d, h.pos.y + 1.0, h.pos.z + Math.cos(h.angle) * d); return B.catchFrom(h); };
    const r = { reach: GB.BLOW.catchReach, at22: at(2.2), at16: at(1.6) }; B.calm(); return r; });
  check('E: the catch\'s reach (the user, 25.11): a glove punch takes a fireball 1.6 m in front of him, not one 2.2 m away (1.8 m)', e6b.reach === 1.8 && e6b.at22 === false && e6b.at16 === true, e6b);
  const e7 = await ev(() => { const a = toRoom('wm_gallery'); const b = toRoom('wm_landing'); const L = WM.landing.lever; const u = P.use(L.x, L.z, { kind: 'zo_up', near: 0.9 }); for (let i = 0; i < 30 && game.trans; i++) game.step(0.1); P.settle(); return { a: a.room, b: b.room, u: u.r, room: game.room?.id, zo: zo() }; });
  check('E: back through the gallery to the landing (INPUT) and up in the cage (E): at the Lift Dock (the lift runs both ways)', e7.a === 'wm_gallery' && e7.b === 'wm_landing' && e7.u === 'used' && e7.room === 'isle_liftdock', e7);
  const e8 = await ev(() => { const k = P.talk('ld_op'); return { k: k.r }; });
  const e8l = await said();
  check('E: Vash afterwards (TALK): the cage runs for anyone now', e8.k === 'talked' && has(e8l, /runs for anyone now/), { e8, e8l });
}
await browser.close();
done();
