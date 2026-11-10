// DEPTH first wave (docs/lba-maturity/DEPTH-PLAN.md): COL-1 (twelve singing crystals), ISL-1 (Old Jaspa's warm gems on
// Knartas), HAM-1 (the pilgrims' waystone on the monastery terrace). src/game/story/depth.js, src/game/crystals.js.
// Played by input where it says INPUT (the harness's arrow keys and E: tests/lib/player.js):
//   - ISL-1: the tray only looked at before Jaspa asks; Jaspa's own line, then his favour; stones taken from the tray
//     and set in the bins; a wrong attempt (a warm one in PROJECT: the lamp flashes, his line, all back on the tray);
//     a save half way → Save & quit → Continue: the bins as they were; the rest sorted; the crystal, +1 max life, once;
//     the fork's ring as the other way to tell (the fork given ISO);
//   - HAM-1: Tenpa's own line, then the pilgrims; the stone looked at, then turned by its grips (his hands on the face);
//     a wrong face says what it faces; Save & quit → Continue keeps the face; the dome turned to the observatory opens
//     the niche: the crystal, +1 max life, once; the dome's carving really faces the observatory (its world normal);
//   - COL-1: the count is out of 12; crystalsAll still means the six lying in the world; an owed crystal survives a save;
//     all twelve (ISO: the four not built yet cannot be had) and Sendell's catch in the core, once;
//   - old saves: a save written by the build before this change (tests/fixtures/pre-col1-save.json, chapter 7 on the Hamalayi with the
//     six crystals) loads with 16 max life, crystalsAll and 6 of 12.
// ISO (logged): chapters are set by their flags; he is put a few metres before a door or the stone and walks the rest.
// SHOTS=dir writes pictures (deviceScaleFactor 1). SwiftShader: Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = fileURLToPath(new URL('./fixtures/pre-col1-save.json', import.meta.url));
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
// a close look from a camera of our own (the game's camera put there for one frame; play goes on from its own after)
const closeup = async (n, which) => { if (!SHOTS) return; await ev((w) => {
  const c = game.renderer.camera, D = game.story.depth, set = (f, a) => { c.position.set(...f); c.lookAt(...a); c.updateMatrixWorld(); };
  if (w === 'tray') { const T = D.G.tray; set([T.x - 0.5, 1.45, T.z + 1.6], [T.x, 0.45, T.z]); }
  if (w === 'way') { const Y = D.way, a = Y.ry + Math.PI / 4 + Math.PI + 0.6; set([Y.cx + Math.sin(a) * 4.2, Y.gy + 3.4, Y.cz + Math.cos(a) * 4.2], [Y.cx, Y.gy + 2.3, Y.cz]); }
  if (w === 'wayobs') { const Y = D.way, o = game.rooms.hamalayi.observatory, b = Math.atan2(o.x - Y.cx, o.z - Y.cz), oy = game.physics.groundAt(o.x, o.z, 200); set([Y.cx - Math.sin(b) * 3.5, Y.gy + 3.6, Y.cz - Math.cos(b) * 3.5], [o.x, oy + 4, o.z]); }
  game.renderer.render(); }, which);
  await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); await ev(() => game.step(0.05)); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(async () => {
  const ZI = await import('/src/game/zislands.js'); window.ZI = ZI;
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));   // (this suite's own state carries over)
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  window.toIsle = (n) => { const G = game, reg = 'isle_' + n; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle(); G.story.refreshCast(); G.step(0.3); return R; };
  window.before = (x, z, fx, fz, d = 2.4) => { const G = game, h = G.hero, l = Math.hypot(fx, fz) || 1; const sx = x + fx / l * d, sz = z + fz / l * d; h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 8), sz); h.angle = Math.atan2(x - sx, z - sz); h.onGround = true; h.vy = 0; G.camRig.snap(); G.step(0.3); P.settle(); };
  window.walkIn = (rid) => { const G = game, d = G.story.doors().find((q) => q.room === rid); if (!d) return { r: 'no door' };
    const sd = G.room?.shutDoors?.find((q) => q.id === d.house); if (sd) { const a = sd.ry ?? 0; before(d.x, d.z, Math.sin(a), Math.cos(a), 2.2); }
    const t = P.through(d.x, d.z); P.settle(); G.step(0.5); return { r: t.r, room: G.room?.id }; };
  window.D = () => game.story.depth;
  window.crystals = () => { const G = game; return { n: G.crystalCount(), max: G.hero.maxHp, all: !!G.flags.crystalsAll, c12: !!G.flags.dx_crystals12, toast: document.querySelector('#toast')?.textContent || '' }; };
  // ISL-1: E on the tray (take the next stone), then E on a bin
  window.take = () => { const Gm = D().G; return P.use(Gm.tray.x, Gm.tray.z, { kind: 'dx_tray', near: 1.0 }).r; };
  window.put = (k) => { const B = D().G.bins[k]; return P.use(B.x, B.z, { kind: 'dx_bin' + k, near: 1.0 }).r; };
  window.held = () => D().held;
  window.gemsIn = () => { const Gm = D().G, v = new (game.hero.pos.constructor)(); return Gm.gems.map((s) => { s.m.getWorldPosition(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; }); };
});
// Esc → pause menu → Save & Quit (it saves, then reloads the page): as boot.mjs quitAndKeep, without waiting on the click
// for the reload's navigation (a loaded machine timed that out)
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 600000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {   // after quitAndKeep: the harness again, then Continue as a player clicks it
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();   // (the new page's lines are listened to from here)
};

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
const base = await ev(() => crystals());
check('a new game: no crystals, 10 max life; the layer counts out of 12 (crystals.js: 6 in the world, 6 from puzzles, 4 of them not built yet)', base.n === 0 && base.max === 10, base);
const reg = await ev(async () => { const C = await import('/src/game/crystals.js'); return { total: C.CRYSTAL_TOTAL, world: C.CRYSTAL_WORLD.length, built: Object.entries(C.CRYSTAL_QUEST).filter(([, q]) => q.built).map(([id]) => id), unbuilt: Object.entries(C.CRYSTAL_QUEST).filter(([, q]) => !q.built).map(([id, q]) => q.quest) }; });
check('the registry: 12 crystals; 6 in the world; ISL-1 and HAM-1 built; DES-1, DES-2, HAM-3, UND-1 slots only (unobtainable)', reg.total === 12 && reg.world === 6 && reg.built.join() === 'sc-jaspa,sc-waystone' && reg.unbuilt.join() === 'DES-1,DES-2,HAM-3,UND-1', reg);

// ================================================================ ISL-1 · Old Jaspa's warm gems (chapter 4)
iso('chapter 4 by its flags; on Knartas a few metres before the gem-sorting room\'s door');
await ev(() => setChapter('dig', { c4_started: true }));
await said();
const g0 = await ev(() => { toIsle('knartas'); const w = walkIn('ih_knartas_28_29'); P.settle(); const Gm = D().G; return { w, built: !!Gm, jaspa: !!P.npc('il_jaspa')?.present, bins: Object.keys(Gm?.bins || {}), gems: Gm?.gems.length, warm: Gm?.gems.filter((s) => s.warm).length }; });
check('ISL-1: the gem-sorting room by its door (INPUT); Jaspa at home; the bench with six stones (two warm) and the two bins', g0.w.room === 'ih_knartas_28_29' && g0.jaspa && g0.built && g0.gems === 6 && g0.warm === 2 && g0.bins.join() === 'P,K', g0);
await shot('depth-isl1-01-room');
const g1 = await ev(() => { const r = take(); return { r, held: held(), bins: game.flags.dx_jaspa_bins ?? null }; });
const g1l = await said();
check('ISL-1: before Jaspa asks, the tray is only looked at (INPUT): its line, no stone taken', g1.r === 'used' && g1.held == null && has(g1l, /PROJECT and KEEP/), { g1, g1l });
const g2 = await ev(() => ({ r: P.talk('il_jaspa').r, ask: !!game.flags.dx_jaspa_ask }));
const g2l = await said();
await closeup('depth-isl1-03-tray-close', 'tray');
check('ISL-1: Jaspa (TALK): his own line first, then the favour: cold stones for the project, warm ones fined; "warm ones sweat"', g2.r === 'talked' && g2.ask && has(g2l, /Blue for the project/) && has(g2l, /only takes cold stones/) && has(g2l, /warm ones sweat/) && g2l.findIndex((l) => /Blue for/.test(l)) < g2l.findIndex((l) => /only takes cold/.test(l)), { g2, g2l });
// a wrong attempt: the first (cold) to PROJECT, the second (warm) to PROJECT too
const g3 = await ev(() => { const G = game, h = G.hero, out = {};
  out.t0 = take(); out.h0 = held();
  // (his hand on the stone as he takes it: the stone now rides in his right hand)
  const v = new h.pos.constructor(); D().G.gems[0].m.getWorldPosition(v); const hv = new h.pos.constructor(); h.rig.j.armR.hand.getWorldPosition(hv); out.inHand = +v.distanceTo(hv).toFixed(2);
  out.p0 = put('P'); out.b0 = G.flags.dx_jaspa_bins;
  out.t1 = take(); out.h1 = held();
  let flash = 0; const L = D().G.bins.P.lamp;
  out.p1 = put('P');
  out.b1 = G.flags.dx_jaspa_bins; out.tries = G.flags.dx_jaspa_tries; out.lampNow = +L.material.emissiveIntensity.toFixed(2);
  out.onTray = D().G.gems.every((s) => s.m.parent === D().G.grp && Math.abs(s.m.position.y - s.slot.y) < 0.01);
  return out; });
const g3l = await said();
check('ISL-1: take a stone (INPUT, E): in his hand, his line says it is cold; into PROJECT (E)', g3.t0 === 'used' && g3.h0 === 0 && g3.inHand < 0.15 && g3.p0 === 'used' && g3.b0 === 'P.....' && has(g3l, /Cold in my hand/), { g3, g3l });
check('ISL-1: the wrong attempt (INPUT): a crusted, dusty stone into PROJECT: Jaspa\'s "That one sweats", every stone back on the tray, nothing lost', g3.h1 === 1 && g3.p1 === 'used' && g3.b1 === '......' && g3.tries === 1 && g3.onTray && has(g3l, /pale crust/) && has(g3l, /That one sweats/), { g3, g3l });
// half way: two right, then Save & quit
const g4 = await ev(() => { const out = {}; out.a = [take(), put('P'), take(), put('K')]; out.bins = game.flags.dx_jaspa_bins; out.where = gemsIn().slice(0, 2); out.room = game.room?.id; return out; });
check('ISL-1: half way (INPUT): the cold one in PROJECT, the warm one in KEEP', g4.a.every((r) => r === 'used') && g4.bins === 'PK....', g4);
iso('Save & quit through the pause menu, then Continue (as a player)');
await saveQuit();
await reboot();
const g5 = await ev(() => ({ room: game.room?.id, bins: game.flags.dx_jaspa_bins, ask: !!game.flags.dx_jaspa_ask, held: held(), where: gemsIn().slice(0, 2), state: game.state }));
check('ISL-1: after Continue: in the room, the bins as they were (the two stones in them), the favour still asked', g5.room === 'ih_knartas_28_29' && g5.bins === 'PK....' && g5.ask && g5.held == null && JSON.stringify(g5.where) === JSON.stringify(g4.where), { g4: g4.where, g5 });
// the fork as the other way to tell (the fork given ISO): the warm stone still on the tray rings
const g6 = await ev(() => { const G = game, h = G.hero; h.arms.fork = true; h.combat.equip('fork', true); G.gadgets.tools.forkCool = 0; const Gm = D().G;
  P.go(Gm.tray.x, Gm.tray.z + 1.0, { tol: 0.3 }); P.face(Gm.tray.x, Gm.tray.z); P.tap('KeyK', 0.05); P.settle();
  const ring = Gm.gems.filter((s) => s.ringT > 0).map((s) => s.i); h.combat.equip('ball', true); P.settle(); return { ring }; });
const g6l = await said();
check('ISL-1 (the other way): the singing fork struck by the tray (K): only the warm stone left on it rings', JSON.stringify(g6.ring) === '[4]' && has(g6l, /One stone on the tray rings/), { g6, g6l });
const before1 = await ev(() => crystals());
const g7 = await ev(() => { const out = {}; out.a = [take(), put('P'), take(), put('P'), take(), put('K'), take(), put('P')]; out.bins = game.flags.dx_jaspa_bins; out.sorted = !!game.flags.dx_jaspa_sorted;
  for (let i = 0; i < 60 && !game.collected.includes('sc-jaspa'); i++) { game.step(0.1); const p = game.pickups.list.find((q) => q.id === 'sc-jaspa'); if (p && i > 15) P.go(p.pos.x, p.pos.z, { tol: 0.5, maxT: 8 }); }
  P.settle(); out.got = game.collected.includes('sc-jaspa'); out.owe = game.flags.dx_owe_sc_jaspa ?? 0; return out; });
const g7l = await said();
const after1 = await ev(() => crystals());
check('ISL-1: the rest sorted right (INPUT): Jaspa\'s thanks; the crystal ("hums louder"), picked up', g7.a.every((r) => r === 'used') && g7.bins === 'PKPPKP' && g7.sorted && g7.got && !g7.owe && has(g7l, /hums louder than the rest/), { g7, g7l });
check('COL-1: the crystal: one more, +1 max life, the toast counts out of 12', after1.n === before1.n + 1 && after1.max === before1.max + 1 && /\/12\)/.test(after1.toast), { before1, after1 });
const g8 = await ev(() => { const n0 = game.collected.filter((i) => i === 'sc-jaspa').length; const r1 = P.talk('il_jaspa').r; const r2 = P.talk('il_jaspa').r; const t = take(); game.step(2); return { r1, r2, t, n0, n: game.collected.filter((i) => i === 'sc-jaspa').length, pick: game.pickups.list.filter((p) => p.id === 'sc-jaspa').length, c: crystals() }; });
const g8l = await said();
check('ISL-1: asked again: his line about the sweat, no second crystal; the tray says it is sorted', g8.n === 1 && g8.pick === 0 && g8.c.n === after1.n && has(g8l, /look for the sweat/) && has(g8l, /Sorted\./), { g8, g8l });
await shot('depth-isl1-02-sorted');

// ================================================================ HAM-1 · The pilgrims' waystone (chapter 6)
iso('chapter 6 by its flags (up the lift: c6_up); at the monastery hall\'s door, then a few metres from the waystone');
await ev(() => setChapter('pass', { c6_started: true, c6_up: true, c6_trip1: true, c6_trip2: true }));
await said();
const w0 = await ev(() => { const G = game; G.regions.ensure('hamalayi', 'test'); const M = G.rooms.hamalayi; G.enterRoom('hamalayi', { x: M.monastery.yard.x, z: M.monastery.yard.z, a: 0 }, true); P.settle(); G.step(0.5);
  const d = G.story.doors().find((q) => q.room === 'ham_hall'), sd = M.monastery.hall, a = sd.ry ?? 0; before(d.x, d.z, Math.sin(a), Math.cos(a), 2.6);
  const t = P.through(d.x, d.z); P.settle(); const r = P.talk('hl_monk').r; const out = P.through(...(() => { const e = G.room.exits.find((x) => !x.room); return [e.x, e.z]; })()); P.settle();
  return { inside: t.to, talk: r, out: out.to, ask: !!G.flags.dx_way_ask, built: !!D().way }; });
const w0l = await said();
check('HAM-1: Brother Tenpa (TALK, in the hall by its door): his own line, then the pilgrims who turned the waystone to face the shrine', w0.inside === 'ham_hall' && w0.talk === 'talked' && w0.ask && w0.built && has(w0l, /soup is on|Forty guests|old ones/) && has(w0l, /turned it to face the shrine/), { w0, w0l });
const geo = await ev(() => { const Y = D().way, G = game, M = G.rooms.hamalayi, o = M.observatory;
  const bear = (x, z) => Math.atan2(x - Y.cx, z - Y.cz), dn = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // the dome panel's real normal in the world, with the stone as it will be when solved (2 quarters)
  const v = new G.hero.pos.constructor(), n = new G.hero.pos.constructor(); const save = Y.turn.rotation.y; Y.turn.rotation.y = 2 * Math.PI / 2; Y.turn.updateMatrixWorld(true);
  const pl = Y.panels[0]; pl.getWorldPosition(v); n.set(0, 0, 1).transformDirection(pl.matrixWorld); Y.turn.rotation.y = save; Y.turn.updateMatrixWorld(true);
  const normal = Math.atan2(n.x, n.z);
  return { face: D().wayFace(), obs: +bear(o.x, o.z).toFixed(3), normal: +normal.toFixed(3), off: +Math.abs(dn(normal - bear(o.x, o.z))).toFixed(3), mon: +bear(M.monastery.hall.x, M.monastery.hall.z).toFixed(3) }; });
check('HAM-1: as found the stone is turned 3 quarters; solved (2), the dome carving\'s world normal points at the observatory (within 3°)', geo.face === 3 && geo.off < 0.05, geo);
// walk up onto the plinth's top step at a corner (INPUT) and look, then turn
const w1 = await ev(() => { const G = game, Y = D().way, h = G.hero; const a = Y.ry + Math.PI / 4 + Math.PI;   // (the corner on the observatory's side)
  before(Y.cx + Math.sin(a) * 1.1, Y.cz + Math.cos(a) * 1.1, Math.sin(a), Math.cos(a), 4.5);
  const g = P.go(Y.cx + Math.sin(a) * 1.1, Y.cz + Math.cos(a) * 1.1, { tol: 0.2 }); const up = +(h.pos.y - Y.gy).toFixed(2);
  const lk = P.use(Y.cx, Y.cz, { kind: 'dx_way', near: 1.3, match: 2 }).r; const seen = !!G.flags.dx_way_seen;
  return { g: g.r, up, lk, seen }; });
const w1l = await said();
check('HAM-1: up the plinth onto its top step at a corner (INPUT); a look: the upper stone turns, carved dome, roof, houses, ice', w1.g === 'arrived' && w1.up > 1.25 && w1.lk === 'used' && w1.seen && has(w1l, /carved on four sides/), { w1, w1l });
await shot('depth-ham1-01-stone');
await closeup('depth-ham1-03-stone-close', 'way');
await closeup('depth-ham1-04-toward-observatory', 'wayobs');
const w2 = await ev(() => { const G = game, Y = D().way, h = G.hero, out = {};
  const tg = P.target(); out.label = tg?.label;
  const B = 0.62; let hand = null;
  // E: he steps to the corner's mark, both hands on the face's grips, and pushes; the hands' distance to the face measured mid-push
  P.tap('KeyE', 0.1); let k = 0;
  for (; k < 200 && !(h.actT > 0 && h.actAnim === 'pumpGrip'); k++) G.step(1 / 30);
  G.step(0.5);
  const v = new h.pos.constructor(); const lp = new h.pos.constructor();
  const dist = []; for (const s of ['armR', 'armL']) { h.rig.j[s].hand.getWorldPosition(v); lp.copy(v); const lx = v.x - Y.cx, lz = v.z - Y.cz, a = Y.ry + Math.PI / 4 + Y.turn.rotation.y;
    const c = Math.cos(a), sn = Math.sin(a), qx = c * lx - sn * lz, qz = sn * lx + c * lz; dist.push(+(Math.max(Math.abs(qx), Math.abs(qz)) - B).toFixed(3)); out.handY = +(v.y - Y.gy - Y.top).toFixed(2); }
  out.handGap = dist; out.anim = h.actAnim;
  for (let i = 0; i < 150 && (h.actT > 0 || Y.turnT > 0); i++) G.step(1 / 30); P.settle(); out.face = G.flags.dx_way_face; out.turns = G.flags.dx_way_turns; out.open = !!G.flags.dx_way_open; return out; });
const w2l = await said();
check('HAM-1: turned (INPUT, E): both his hands on the stone\'s face at its grips while it turns (within 8 cm of the face, at grip height)', w2.label === 'p_turn' && w2.anim === 'pumpGrip' && w2.handGap.every((d) => Math.abs(d) < 0.08) && Math.abs(w2.handY - 1.12) < 0.15, w2);
check('HAM-1: a wrong face says what it faces: the ice faces the glacier; no niche', w2.face === 0 && w2.turns === 1 && has(w2l, /ice faces the glacier/) && !w2.open, { w2, w2l });
iso('Save & quit, then Continue');
await saveQuit();
await reboot();
const w3 = await ev(() => { const Y = D().way; return { room: game.room?.id, face: game.flags.dx_way_face, rot: +(Y.turn.rotation.y / (Math.PI / 2)).toFixed(2), open: !!game.flags.dx_way_open, slab: +(Y.slab.position.y - Y.slabY).toFixed(2) }; });
check('HAM-1: after Continue the stone keeps its face (turned 0 quarters: the ice to the glacier), the niche still shut', w3.room === 'hamalayi' && w3.face === 0 && Math.abs(w3.rot) < 0.01 && !w3.open && w3.slab === 0, w3);
const before2 = await ev(() => crystals());
const w4 = await ev(() => { const G = game, Y = D().way, h = G.hero, out = {}; const a = Y.ry + Math.PI / 4 + Math.PI;
  if (Math.hypot(h.pos.x - Y.cx, h.pos.z - Y.cz) > 1.5 || h.pos.y < Y.gy + 1.2) { before(Y.cx + Math.sin(a) * 1.1, Y.cz + Math.cos(a) * 1.1, Math.sin(a), Math.cos(a), 4.5); P.go(Y.cx + Math.sin(a) * 1.1, Y.cz + Math.cos(a) * 1.1, { tol: 0.2 }); }
  out.u1 = P.use(Y.cx, Y.cz, { kind: 'dx_way', near: 1.3, match: 2 }).r; out.f1 = G.flags.dx_way_face;
  out.u2 = P.use(Y.cx, Y.cz, { kind: 'dx_way', near: 1.3, match: 2 }).r; out.f2 = G.flags.dx_way_face; out.open = !!G.flags.dx_way_open;
  for (let i = 0; i < 80 && !G.collected.includes('sc-waystone'); i++) { P.settle(); G.step(0.1); }
  P.settle(); out.got = G.collected.includes('sc-waystone'); out.slab = +(Y.slab.position.y - Y.slabY).toFixed(2); out.owe = G.flags.dx_owe_sc_waystone ?? 0; return out; });
const w4l = await said();
const after2 = await ev(() => crystals());
check('HAM-1: the roof faces the monastery\'s roof (INPUT), then the dome faces the dome on the ridge: the slab sinks, the niche opens', w4.u1 === 'used' && w4.f1 === 1 && w4.u2 === 'used' && w4.f2 === 2 && w4.open && w4.slab < -0.45 && has(w4l, /monastery's roof/) && has(w4l, /dome on the ridge/), { w4, w4l });
check('HAM-1: the crystal from the niche, the words cut inside it; +1 max life', w4.got && !w4.owe && after2.n === before2.n + 1 && after2.max === before2.max + 1 && has(w4l, /FOR THE LAST PILGRIM/), { before2, after2, w4l });
await shot('depth-ham1-02-open');
await closeup('depth-ham1-05-open-close', 'way');
const w5 = await ev(() => { const G = game, Y = D().way; const u = P.use(Y.cx, Y.cz, { kind: 'dx_way', near: 1.3, match: 2 }).r; G.step(1); return { u, face: G.flags.dx_way_face, n: G.collected.filter((i) => i === 'sc-waystone').length, c: crystals() }; });
const w5l = await said();
check('HAM-1: used again: it stays facing the dome, no second crystal', w5.u === 'used' && w5.face === 2 && w5.n === 1 && w5.c.n === after2.n && has(w5l, /Facing the dome/), { w5, w5l });

// ================================================================ COL-1 · the layer
const j = await ev(() => { const J = game.story.journal(); const s = J.find((c) => /Singing crystals/.test(c.title)); return { title: s?.title, lines: s?.lines.map((l) => [l.key, l.done]) }; });
check('COL-1: the journal\'s section counts the crystals out of 12, with both favours done', /\(2 of 12\)/.test(j.title || '') && j.lines.some(([k, d]) => k === 'dx_j_jaspa' && d) && j.lines.some(([k, d]) => k === 'dx_j_way' && d), j);
const c1 = await ev(() => { const G = game; const out = { all0: !!G.flags.crystalsAll };
  // the six in the world (ISO: their ids, as their pick-ups would): crystalsAll keeps meaning them
  for (const id of ['sc-lighthouse', 'sc-orchard', 'sc-pier', 'sc-east', 'sc-north']) G.collected.push(id);
  const p = G.pickups.spawn('crystal', G.hero.pos.x, G.hero.pos.y + 0.8, G.hero.pos.z, { id: 'sc-mill' }); for (let i = 0; i < 10 && G.pickups.list.includes(p); i++) G.step(0.1); P.settle();
  out.all = !!G.flags.crystalsAll; out.c = crystals(); return out; });
const c1l = await said();
check('COL-1: crystalsAll still means the six lying in the world: set when the sixth of them is taken (8 of 12 then, 18 max life)', !c1.all0 && c1.all && c1.c.n === 8 && c1.c.max === 18 && !c1.c.c12 && has(c1l, /hum together/), { c1, c1l });
// an owed crystal survives a save: given (ISO, as a quest would) far from him, saved, loaded
const c2 = await ev(() => { const G = game, h = G.hero; D().giveCrystal('sc-figures', h.pos.x + 30, h.pos.y + 1, h.pos.z, 'hamalayi'); const owe = G.flags.dx_owe_sc_figures; G.save(false);
  const s = JSON.parse(localStorage.getItem('lba3_save_v1')); return { owe, saved: s.flags.dx_owe_sc_figures, v: s.v }; });
await page.reload({ waitUntil: 'load' }); await reboot();
const c3 = await ev(() => ({ c: crystals(), owe: game.flags.dx_owe_sc_figures ?? 0, got: game.collected.includes('sc-figures') }));
check('COL-1: an owed quest crystal (given, not yet picked up) survives a save: after Continue it is in hand (save format unchanged)', c2.owe === 1 && c2.saved === 1 && c2.v === 5 && c3.got && !c3.owe && c3.c.n === 9, { c2, c3 });
// all twelve (ISO: the three still unbuilt slots) and Sendell's catch in the core, once
iso('the three crystals no quest gives yet: their ids pushed; chapter 12 by its flags, the fight on');
const c4 = await ev(() => { const G = game, h = G.hero; for (const id of ['sc-trial', 'sc-pack']) G.collected.push(id);
  const p = G.pickups.spawn('crystal', h.pos.x, h.pos.y + 0.8, h.pos.z, { id: 'sc-source' }); for (let i = 0; i < 10 && G.pickups.list.includes(p); i++) G.step(0.1); P.settle();
  return { c: crystals() }; });
const c4l = await said();
check('COL-1: all twelve: 22 max life, dx_crystals12, the twelfth\'s line', c4.c.n === 12 && c4.c.max === 22 && c4.c.c12 && has(c4l, /Twelve\./), { c4, c4l });
const c5 = await ev(() => { const G = game, h = G.hero, f = G.flags;
  const keep = [...G.collected]; setChapter('core', { c3_started: true, c3_fight: true }); for (const id of keep) if (!G.collected.includes(id)) G.collected.push(id); G.applyCrystals(); f.dx_crystals12 = true;
  G.regions.ensure('c3core', 'test'); G.enterRoom('c3core', null, true); P.settle(); G.step(0.5);
  const out = { room: G.room?.id, max: h.maxHp }; h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(3, null); out.hp1 = h.hp; out.dead1 = !!h.dead; out.caught = !!f.dx_c12_caught; P.settle();
  h.invuln = 0; h.hp = 1; h.damage(3, null); out.dead2 = !!h.dead; return out; });
const c5l = await said();
check('COL-1: in the core fight with all twelve, his life at zero: Sendell catches him once (full life, her line); the next time he falls as before', c5.room === 'c3core' && c5.hp1 === c5.max && !c5.dead1 && c5.caught && c5.dead2 && has(c5l, /Twelve of my splinters/), { c5, c5l });
await browser.close();

// ================================================================ old saves
// a save written by the build before this change (db3707df: chapter 7 on the Hamalayi with the six world crystals)
({ browser, page } = await launch({ scale: 1 }));
const raw = fs.readFileSync(FIX, 'utf8');
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
const o1 = await ev(() => ({ state: game.state, chapter: game.flags.chapterKey, room: game.room?.id, n: game.crystalCount(), max: game.hero.maxHp, all: !!game.flags.crystalsAll, c12: !!game.flags.dx_crystals12, dx: Object.keys(game.flags).filter((k) => k.startsWith('dx_') && k !== 'dx_way_face') }));
check('an old save (from the build before COL-1, 6 crystals): loads into play with 16 max life, crystalsAll, 6 of 12, no dx_ state made up', o1.state === 'play' && o1.chapter === 'observatory' && o1.n === 6 && o1.max === 16 && o1.all && !o1.c12 && o1.dx.length === 0, o1);
const o2 = await ev(() => { const J = game.story.journal(); return J.find((c) => /Singing crystals/.test(c.title))?.title || null; });
check('…and its journal counts 6 of 12', /\(6 of 12\)/.test(o2 || ''), { o2 });
await browser.close();
done();
