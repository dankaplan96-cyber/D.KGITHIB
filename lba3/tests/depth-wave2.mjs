// DEPTH wave 2 (docs/lba-maturity/WAVE2.md; cards in DEPTH-PLAN.md): H-3 = HAM-3 Yorna's brother's pack (the glacier
// basin: the heat flask OR the crew's signal mirror), H-4 = DES-1 where the figures look (west of Kesh: the figures'
// shared gaze, Brosk's shovel, the survey hatch), H-5 = UND-1 the source (the crystal galleries: the singing fork OR the
// lantern's crack and the ball). src/game/story/depth.js. One suite for the three, staged by flags (ISO, logged), played
// by input where it says INPUT (tests/lib/player.js: arrow keys, E, F, K) with game.step:
//   - H-3 the mirror way: the ice looked at (no Yorna yet), the ball skips off it (its line, nothing melts), Yorna's own
//     line then her brother; the mirror looked at, turned an eighth at a time (the light's spot moves: snow, rock); Save &
//     quit half way → Continue keeps the mirror's eighth; on the ice it melts; the pack by hand: the crystal, once; Yorna
//     gets it back; one line about it in a later chapter;
//   - H-3 the flask way, from a fresh state: heat drawn, let out at the ice; Save & quit while it melts → Continue: the
//     ice is gone, the pack still there; taken;
//   - H-4: not offered before the condenser hall is dug (Brosk says nothing of it); the figures' stares (both), the drift
//     wants a shovel; Brosk's saying and the shovel (in the inventory); the pocket set's hum (code-level: the hums list);
//     dug; Save & quit → Continue keeps the hatch; opened: the crystal, once; the shovel back; later the hatch stays open;
//   - H-5: nothing before the descent; the hum only with a crystal in his pocket; the ball skips off the crust; the
//     lantern shows the crack, the ball breaks it: the crystal; from a fresh state the fork cracks it: the crystal; the
//     epilogue: the cell still open, its own line;
//   - the registry: all twelve obtainable now; an old save (format 6, the campaign's chapter-15 galleries fixture) loads
//     with no dx_ state made up, the crust there and whole.
// SERVE=1 answers this checkout's files by request routing (no http.server). SHOTS=dir writes pictures
// (deviceScaleFactor 1). Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { serveLocal } from './lib/serve.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const OLD = fileURLToPath(new URL('./fixtures/campaign/base-14-gal.save.json', import.meta.url));
let { browser, context, page } = await launch({ scale: 1 });
if (process.env.SERVE) await serveLocal(context);
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(() => {
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));   // (this suite's own state carries over)
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  window.toArea = (id, x, z, a = 0) => { const G = game; G.regions.ensure(id, 'test'); G.enterRoom(id, x == null ? null : { x, z, a }, true); P.settle(); G.story.refreshCast(); G.step(0.5); P.settle(); };
  window.D = () => game.story.depth;
  window.crystals = () => { const G = game; return { n: G.crystalCount(), max: G.hero.maxHp, c12: !!G.flags.dx_crystals12, toast: document.querySelector('#toast')?.textContent || '' }; };
  // pick up a crystal lying near (by walking to it, as a player)
  window.pickUp = (id) => { const G = game; for (let i = 0; i < 80 && !G.collected.includes(id); i++) { if (G.state !== 'play') P.settle(); G.step(0.1); const p = G.pickups.list.find((q) => q.id === id); if (p && i > 12) P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 8 }); } P.settle(); return G.collected.includes(id); };
  window.count = (id) => game.collected.filter((i) => i === id).length;
  window.forget = (id, prefix) => { const G = game, f = G.flags; for (const k of Object.keys(f)) if (k.startsWith(prefix)) delete f[k]; delete f['dx_owe_' + id.replace(/-/g, '_')]; G.collected = G.collected.filter((i) => i !== id); G.applyCrystals(); D().applyWorld(); };
  window.waitIdle = (s = 6) => { const G = game; for (let t = 0; t < s && (D().pk?.meltT > 0 || D().pk?.turnT > 0 || D().gz?.digT > 0 || D().gz?.openT > 0 || D().src?.breakT > 0 || G.hero.actT > 0); t += 0.1) G.step(0.1); P.settle(); };
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

await open(page, '?nocine'); await menu(page, 'new');
await helpers(); await said();
const reg = await ev(async () => { const C = await import('/src/game/crystals.js'); return { total: C.CRYSTAL_TOTAL, all: C.CRYSTAL_IDS.every((id) => C.obtainable(id)) }; });
check('the registry: 12 crystals, every one obtainable now (DES-1, HAM-3, UND-1 built)', reg.total === 12 && reg.all, reg);

// ================================================================ H-3 · Yorna's brother's pack, the mirror way
iso('chapter 10 (Borrowed Time) by its flags, the vent open (c7_vent); on the glacier, a few metres south of the ice');
const a0 = await ev(() => { setChapter('throttle', { c7_vent: true, c7_done: true }); toArea('hamalayi', 4254, -64, Math.PI); const K = D().pk; return { built: !!K, room: game.room?.id, vent: game.rooms.hamalayi.vent.open, ice: K?.ice.visible, pack: K?.pack.visible, k: D().mirK(), end: K?.end?.on }; });
check('H-3: the ice wall with the pack in it and the crew\'s mirror on its post, in the glacier basin (as found: its light on the snow)', a0.built && a0.room === 'hamalayi' && a0.vent && a0.ice && a0.pack && a0.k === 1 && a0.end === 'snow', a0);
await shot('wave2-h3-01-found');
const a1 = await ev(() => { const K = D().pk; const r = P.use(K.front.x, K.front.z, { kind: 'dx_pack', near: 1.6, match: 2.5 }).r; return { r, seen: !!game.flags.dx_pack_seen, ask: !!game.flags.dx_pack_ask }; });
const a1l = await said();
check('H-3: the ice looked at before Yorna asks (INPUT): someone\'s pack, too hard for the ball, it wants warmth', a1.r === 'used' && a1.seen && !a1.ask && has(a1l, /Someone's pack, frozen deep/), { a1, a1l });
const a2 = await ev(() => { const K = D().pk, h = game.hero; P.go(K.front.x + 0.4, K.front.z + 4.0, { tol: 0.4 }); P.settle(); P.throwAt(K.front.x, K.front.z); P.settle(); return { thawed: game.flags.dx_pack_thawed ?? null, ice: K.ice.visible, hp: h.hp }; });
const a2l = await said();
check('H-3: a ball thrown at the ice (INPUT, F) skips off it: his line, the ice whole', !a2.thawed && a2.ice && has(a2l, /skips off. This ice wants warmth/), { a2, a2l });
const a3 = await ev(() => { const r = P.talk('yorna'); return { r: r.r, ask: !!game.flags.dx_pack_ask }; });
const a3l = await said();
check('H-3: Yorna (TALK): her own line first, then her brother\'s pack', a3.r === 'talked' && a3.ask && has(a3l, /My brother crossed that glacier/) && a3l.findIndex((l) => /My brother crossed/.test(l)) > 0, { a3, a3l });
iso('back from the monastery yard (Yorna) to the basin: put 4 m south of the mirror (the walk down the ridge is not this suite\'s)');
const a4 = await ev(() => { const G = game, h = G.hero; h.pos.set(4257, G.physics.groundAt(4257, -63.5, h.pos.y + 40), -63.5); h.angle = Math.PI; G.camRig.snap(); G.step(0.3); P.settle(); const r = P.use(4256.67, -67.93, { kind: 'dx_mirror', near: 1.0, match: 1.6 }).r; return { r, seen: !!game.flags.dx_pack_mirSeen, k: D().mirK() }; });
const a4l = await said();
check('H-3: the mirror looked at (INPUT): a signal mirror, it turns; not turned yet', a4.r === 'used' && a4.seen && a4.k === 1 && has(a4l, /SIGNAL, OBSERVATORY/), { a4, a4l });
const turn = () => ev(() => { const r = P.use(4256.67, -67.93, { kind: 'dx_mirror', near: 1.0, match: 1.6 }).r; waitIdle(3); return { r, k: D().mirK(), on: D().pk.end.on, thawed: game.flags.dx_pack_thawed ?? null, yaw: +D().pk.yaw.rotation.y.toFixed(3), spot: [+D().pk.spot.position.x.toFixed(2), +D().pk.spot.position.z.toFixed(2)] }; });
const t1 = await turn(); const t1l = await said();
const t2 = await turn(); const t3 = await turn(); await said();
check('H-3: turned an eighth at a time (INPUT, E): the spot of light moves with it; the first turn says so; three turns, still not on the ice (snow, snow, rock)', t1.r === 'used' && t1.k === 2 && t2.k === 3 && t3.k === 4 && !t3.thawed && t3.on === 'rock' && t1.spot.join() !== t2.spot.join() && has(t1l, /sunlight goes where the mirror looks/), { t1, t2, t3, t1l });
await shot('wave2-h3-02-mirror-rock');
iso('Save & quit through the pause menu with the mirror half way, then Continue (as a player)');
await saveQuit(); await reboot();
const a5 = await ev(() => { const K = D().pk; return { room: game.room?.id, k: D().mirK(), yaw: +K.yaw.rotation.y.toFixed(3), on: K.end.on, ice: K.ice.visible, ask: !!game.flags.dx_pack_ask }; });
check('H-3: after Continue: the mirror where he left it (its eighth, its light on the rock), the ice whole, Yorna\'s favour still asked', a5.room === 'hamalayi' && a5.k === 4 && Math.abs(a5.yaw - t3.yaw) < 0.01 && a5.on === 'rock' && a5.ice && a5.ask, { t3, a5 });
const c0 = await ev(() => crystals());
const t4 = await turn(); const t4l = await said();
const a6 = await ev(() => { waitIdle(8); return { thawed: game.flags.dx_pack_thawed ?? null, ice: D().pk.ice.visible, puddle: D().pk.puddle.visible, pack: D().pk.pack.visible }; });
const a6l = await said();
check('H-3: the next eighth puts the light on the ice (INPUT): his line, it melts (the mirror way); the pack lies free', t4.k === 5 && t4.on === 'ice' && a6.thawed === 'mirror' && !a6.ice && a6.puddle && a6.pack && has(t4l, /Right on the ice/) && has([...t4l, ...a6l], /The ice gave it up/), { t4, a6, t4l, a6l });
await shot('wave2-h3-03-melted');
const a7 = await ev(() => { const K = D().pk; const r = P.use(K.front.x, K.front.z, { kind: 'dx_pack', near: 1.2, match: 2.5 }).r; const got = pickUp('sc-pack'); return { r, taken: !!game.flags.dx_pack_taken, got, n: count('sc-pack'), c: crystals() }; });
const a7l = await said();
check('H-3: the pack taken by hand (INPUT): the notebook, a singing crystal (+1 max life), once', a7.r === 'used' && a7.taken && a7.got && a7.n === 1 && a7.c.n === c0.n + 1 && a7.c.max === c0.max + 1 && has(a7l, /stiff with cold/) && has(a7l, /Nobody believes me/), { c0, a7, a7l });
const a8 = await ev(() => { const K = D().pk; const r = P.use(K.front.x, K.front.z, { kind: 'dx_pack', near: 1.2, match: 2.5 }).r; game.step(2); return { r, n: count('sc-pack'), lying: game.pickups.list.filter((p) => p.id === 'sc-pack').length }; });
const a8l = await said();
check('H-3: used again: the hollow\'s line, no second crystal', a8.r === 'used' && a8.n === 1 && a8.lying === 0 && has(a8l, /hollow where the pack lay/), { a8, a8l });
const a9 = await ev(() => { const r1 = P.talk('yorna').r; const given = game.flags.dx_pack_given; return { r1, given }; });
const a9l = await said();
const a10 = await ev(() => { const r = P.talk('yorna').r; return { r, later: !!game.flags.dx_pack_later }; });
const a10l = await said();
check('H-3: the pack back to Yorna (TALK): her brother\'s knots, his notebook kept, the pack by her door; no later line in the same chapter', a9.r1 === 'talked' && a9.given > 0 && has(a9l, /His knots/) && has(a9l, /peg by my door/) && !a10.later && !has(a10l, /hangs by my door/), { a9, a10, a9l, a10l });
iso('a later chapter (15, the descent) by its flags; back on the glacier');
const a11 = await ev(() => { setChapter('shell', { c7_vent: true, c7_done: true }); toArea('hamalayi', 4254, -64, Math.PI); const K = D().pk; const r = P.talk('yorna').r; return { r, later: !!game.flags.dx_pack_later, ice: K.ice.visible, puddle: K.puddle.visible, pack: K.pack.visible, k: D().mirK(), n: count('sc-pack') }; });
const a11l = await said();
check('H-3 three chapters on: the hollow and its meltwater, the mirror on the ice, no pack, still one crystal; Yorna: the pack hangs by her door', a11.later && !a11.ice && a11.puddle && !a11.pack && a11.k === 5 && a11.n === 1 && has(a11l, /hangs by my door/), { a11, a11l });

// ================================================================ H-3 · the flask way (a fresh state)
iso('the pack\'s state and its crystal cleared (a fresh state); chapter 10; the heat flask given (it comes in chapter 6)');
const b0 = await ev(() => { setChapter('throttle', { c7_vent: true, c7_done: true }); forget('sc-pack', 'dx_pack_'); toArea('hamalayi', 4250, -54, 0); const h = game.hero; h.arms.heatflask = true; h.arms.heat = 0; const K = D().pk; return { ice: K.ice.visible, pack: K.pack.visible, k: D().mirK(), n: count('sc-pack') }; });
check('H-3 (fresh): the ice whole again, the mirror as found, no pack crystal', b0.ice && b0.pack && b0.k === 1 && b0.n === 0, b0);
const b1 = await ev(() => { const G = game, M = G.rooms.hamalayi, V = M.vent, h = G.hero;
  const r = P.use(V.x + 4.1, V.z + 0.6, { kind: 'e2b_draw', near: 0.5, match: 2 }); const heat = h.arms.heat; return { r: r.r, kind: r.target?.kind ?? null, heat }; });
await said();
check('H-3 (fresh): heat drawn from the open vent (INPUT, E)', b1.heat > 30, b1);
const b2 = await ev(() => { const G = game, h = G.hero, K = D().pk; P.go(K.front.x, K.front.z + 2.2, { tol: 0.35, run: true }); P.face(K.front.x, K.front.z); h.combat.equip('heatflask', true); P.settle(); P.tap('KeyK', 0.05); G.step(0.4); return { thawed: G.flags.dx_pack_thawed ?? null, meltT: +D().pk.meltT.toFixed(2), heat: h.arms.heat }; });
check('H-3 (fresh): the flask let out at the ice (INPUT, K): it starts to melt (the flask way)', b2.thawed === 'flask' && b2.meltT > 0, b2);
iso('Save & quit while the ice is melting, then Continue');
await saveQuit(); await reboot();
const b3 = await ev(() => { const K = D().pk; return { thawed: game.flags.dx_pack_thawed ?? null, ice: K.ice.visible, puddle: K.puddle.visible, pack: K.pack.visible }; });
check('H-3 (fresh): after Continue the ice is gone, the pack still there to take (leaving mid-melt loses nothing)', b3.thawed === 'flask' && !b3.ice && b3.puddle && b3.pack, b3);
const b4 = await ev(() => { const K = D().pk; const r = P.use(K.front.x, K.front.z, { kind: 'dx_pack', near: 1.2, match: 2.5 }).r; const got = pickUp('sc-pack'); return { r, got, n: count('sc-pack') }; });
await said();
check('H-3 (fresh): the pack taken: the crystal, once', b4.r === 'used' && b4.got && b4.n === 1, b4);
await ev(() => { game.hero.combat.equip('ball', true); P.settle(); });

// ================================================================ H-4 · where the figures look
iso('chapter 4 (the dig) by its flags, on Desert Island near Kesh: before its window');
const d0 = await ev(() => { setChapter('dig', { c4_started: true }); toArea('desert', 3346, -6, Math.PI); const r = P.talk('dtrader').r; return { r, ask: !!game.flags.dx_gaze_ask, built: !!D().gz }; });
const d0l = await said();
check('H-4: before the condenser hall is dug, Brosk says nothing of it (his own talk only)', d0.built && d0.r === 'talked' && !d0.ask && !has(d0l, /stone people/), { d0, d0l });
iso('chapter 5 by its flags with the hall dug (c5_dug); west of Kesh between the two standing figures');
const d1 = await ev(() => { setChapter('steam', { c5_planned: true, c5_shovel: true, c5_dug: true }); toArea('desert', 3305, -40, Math.PI); const Z = D().gz; return { built: !!Z, gy: +Z.gy.toFixed(2), figs: Z.figs.map((F) => [+F.gaze.toFixed(3)]), hums: game.story.kit2.hums().filter((h) => h.id === 'dx_drift').length, shovel: game.story.items().filter((i) => i.id === 'shovel').length }; });
check('H-4: the drift on the sand flat, the two figures\' gazes aimed at it; the pocket set\'s hum list holds it (code-level); no shovel carried', d1.built && d1.hums === 1 && d1.shovel === 0, d1);
await shot('wave2-h4-01-drift');
const geo = await ev(() => { const Z = D().gz; return Z.figs.map((F) => { const b = Math.atan2(Z.x - F.x, Z.z - F.z); return +Math.abs(Math.atan2(Math.sin(b - F.gaze), Math.cos(b - F.gaze))).toFixed(4); }); });
check('H-4: each figure\'s painted face looks straight at the drift (bearing error 0)', geo.every((e) => e < 0.001), geo);
const d2 = await ev(() => { const Z = D().gz, out = []; for (const F of Z.figs) { const r = P.use(F.x, F.z, { kind: 'dx_fig', near: 2.6, match: 3.5 }).r; out.push(r); } return { out, f0: !!game.flags.dx_gaze_f0, f1: !!game.flags.dx_gaze_f1, seen: !!game.flags.dx_gaze_seen }; });
const d2l = await said();
check('H-4: both figures looked at (INPUT): painted eyes that stare at the sand; then: both stare at the same patch', d2.out.every((r) => r === 'used') && d2.seen && has(d2l, /painted eyes/) && has(d2l, /same patch of sand/), { d2, d2l });
const d3 = await ev(() => { const Z = D().gz; const r = P.use(Z.x, Z.z, { kind: 'dx_drift', near: 1.6, match: 2.6 }).r; return { r, drift: !!game.flags.dx_gaze_drift, dug: !!game.flags.dx_gaze_dug }; });
const d3l = await said();
check('H-4: the drift without a shovel (INPUT): it rings hollow, he needs a shovel; nothing dug', d3.r === 'used' && d3.drift && !d3.dug && has(d3l, /rings hollow/), { d3, d3l });
const d4 = await ev(() => { const r = P.talk('dtrader').r; return { r, ask: !!game.flags.dx_gaze_ask, lent: !!game.flags.dx_gaze_shovel, inv: game.story.items().filter((i) => i.id === 'shovel').length }; });
const d4l = await said();
check('H-4: Brosk (TALK): his own talk, his grandfather\'s saying, and the shovel lent (in the inventory)', d4.r === 'talked' && d4.ask && d4.lent && d4.inv === 1 && has(d4l, /dig where the stone people look/) && has(d4l, /sand in places sand shouldn't go/), { d4, d4l });
const d5 = await ev(() => { const Z = D().gz; P.go(Z.x + 1.5, Z.z + 2.6, { tol: 0.5, run: true }); P.settle(); const r = P.use(Z.x, Z.z, { kind: 'dx_drift', near: 1.6, match: 2.6 }).r; waitIdle(4); return { r, dug: !!game.flags.dx_gaze_dug, hatch: Z.hatch.visible, drift: Z.drift.visible, open: !!game.flags.dx_gaze_open, hums: game.story.kit2.hums().filter((h) => h.id === 'dx_drift').length }; });
const d5l = await said();
check('H-4: dug with the shovel (INPUT): an iron lid; the hatch shows, closed; the hum gone', d5.r === 'used' && d5.dug && d5.hatch && !d5.drift && !d5.open && d5.hums === 0 && has(d5l, /an iron lid/), { d5, d5l });
await shot('wave2-h4-02-hatch');
iso('Save & quit with the hatch dug and shut, then Continue');
await saveQuit(); await reboot();
const d6 = await ev(() => { const Z = D().gz; return { room: game.room?.id, dug: !!game.flags.dx_gaze_dug, hatch: Z.hatch.visible, drift: Z.drift.visible, lid: +Z.hinge.rotation.x.toFixed(2) }; });
check('H-4: after Continue: the hatch dug, still shut', d6.room === 'desert' && d6.dug && d6.hatch && !d6.drift && d6.lid === 0, d6);
const c1 = await ev(() => crystals());
const d7 = await ev(() => { const Z = D().gz; const r = P.use(Z.x, Z.z, { kind: 'dx_hatch', near: 1.2, match: 2.4 }).r; waitIdle(4); P.settle(); const got = pickUp('sc-figures'); return { r, open: !!game.flags.dx_gaze_open, got, n: count('sc-figures'), c: crystals() }; });
const d7l = await said();
check('H-4: the hatch opened (INPUT): SURVEY 7\'s dry box, the surveyors\' note, a singing crystal (+1 max life)', d7.r === 'used' && d7.open && d7.got && d7.n === 1 && d7.c.n === c1.n + 1 && d7.c.max === c1.max + 1 && has(d7l, /The ground SANG/), { c1, d7, d7l });
await shot('wave2-h4-03-open');
const d8 = await ev(() => { const Z = D().gz; const r = P.use(Z.x, Z.z, { kind: 'dx_hatch', near: 1.2, match: 2.4 }).r; game.step(2); return { r, n: count('sc-figures') }; });
const d8l = await said();
iso('from the hatch back toward Kesh: put by the plaza (the walk across the shore is not this suite\'s)');
const d9 = await ev(() => { toArea('desert', 3346, -6, Math.PI); const r = P.talk('dtrader').r; return { r, back: !!game.flags.dx_gaze_back, inv: game.story.items().filter((i) => i.id === 'shovel').length }; });
const d9l = await said();
check('H-4: used again: its line, no second crystal; the shovel back to Brosk (TALK): his line, out of the inventory', d8.r === 'used' && d8.n === 1 && has(d8l, /open to the sky/) && d9.r === 'talked' && d9.back && d9.inv === 0 && has(d9l, /Don't tell my grandfather/), { d8, d9, d8l, d9l });
iso('three chapters on (chapter 8, the evacuation) by its flags; at the figures');
const d10 = await ev(() => { setChapter('evacuation', { c5_dug: true }); toArea('desert', 3305, -40, Math.PI); const Z = D().gz; const F = Z.figs[1]; const r = P.use(F.x, F.z, { kind: 'dx_fig', near: 2.6, match: 3.5 }).r; return { r, hatch: Z.hatch.visible, lid: +Z.hinge.rotation.x.toFixed(2), n: count('sc-figures') }; });
const d10l = await said();
check('H-4 three chapters on: the hatch still open in its dug sand; the figures "pleased with themselves"; one crystal', d10.r === 'used' && d10.hatch && d10.lid < -1.9 && d10.n === 1 && has(d10l, /pleased with themselves/), { d10, d10l });

// ================================================================ H-5 · the source
iso('chapter 14 (the network) by its flags, in the galleries: before its window');
const e0 = await ev(() => { setChapter('network', { c10_pim: true }); toArea('c3gallery'); const S = D().src; let any = false; D().srcInteractables(() => { any = true; }, () => 0); return { built: !!S, open: D().srcOpen(), any }; });
check('H-5: before the descent (chapter 15) the crust is there but offers nothing', e0.built && !e0.open && !e0.any, e0);
iso('chapter 15 (the descent) by its flags; in the galleries with the crystals found so far in his pocket');
const e1 = await ev(() => { setChapter('shell', { c3_started: true }); toArea('c3gallery'); const S = D().src, G = game; const n = G.crystalCount(); P.go(S.front.x + 3.2, S.front.z + 1.5, { tol: 0.5 }); P.settle(); G.step(0.5); return { n, hum: !!G.flags.dx_src_hum, seam: +S.seamM.emissiveIntensity.toFixed(2) }; });
const e1l = await said();
check('H-5: a crystal in his pocket and the crust near: it hums (his line, once; the seams glow)', e1.n > 0 && e1.hum && has(e1l, /same note as my crystals/), { e1, e1l });
await shot('wave2-h5-01-crust');
const e2 = await ev(() => { const S = D().src; P.go(S.front.x + 3.2, S.front.z + 1.5, { tol: 0.4 }); P.settle(); P.throwAt(S.front.x, S.front.z); P.settle(); return { src: game.flags.dx_source ?? null }; });
const e2l = await said();
check('H-5: the ball thrown at the crust before the crack is found (INPUT, F): it skips off (his line), nothing opens', !e2.src && has(e2l, /skips off the crust/), { e2, e2l });
const e3 = await ev(() => { const G = game, h = G.hero, S = D().src; h.arms.lantern = true; h.arms.lanternOn = true; P.go(S.front.x + 2.4, S.front.z, { tol: 0.4 }); P.settle(); G.step(0.3); P.settle(); return { crack: !!G.flags.dx_src_crack, shown: S.crack.visible }; });
const e3l = await said();
check('H-5: the lantern lit near the crust: a crack low in it shows (his line)', e3.crack && e3.shown && has(e3l, /lantern shows a crack/), { e3, e3l });
await shot('wave2-h5-02-crack');
const c2 = await ev(() => crystals());
const e4 = await ev(() => { const S = D().src; P.go(S.front.x + 3.2, S.front.z + 1.5, { tol: 0.4 }); P.settle(); P.throwAt(S.front.x, S.front.z); P.settle(); waitIdle(3); const got = pickUp('sc-source'); return { src: game.flags.dx_source ?? null, open: S.cluster.visible && !S.crust.visible, got, n: count('sc-source'), c: crystals() }; });
const e4l = await said();
check('H-5: the ball at the crust once the crack is known (INPUT, F): the crust falls away, the cell; a singing crystal (+1 max life)', e4.src === 'ball' && e4.open && e4.got && e4.n === 1 && e4.c.n === c2.n + 1 && has(e4l, /crust falls away/), { c2, e4, e4l });
await shot('wave2-h5-03-open');
iso('the crust\'s state and its crystal cleared (a fresh state); the lantern off; the singing fork given (it comes in chapter 4)');
const f0 = await ev(() => { const G = game, h = G.hero; forget('sc-source', 'dx_src'); delete G.flags.dx_source; D().applyWorld(); h.arms.lanternOn = false; h.arms.fork = true; const S = D().src; return { crust: S.crust.visible, n: count('sc-source') }; });
const f1 = await ev(() => { const G = game, h = G.hero, S = D().src; P.go(S.front.x + 1.6, S.front.z, { tol: 0.35 }); P.face(S.front.x, S.front.z); h.combat.equip('fork', true); G.gadgets.tools.forkCool = 0; P.settle(); P.tap('KeyK', 0.05); G.step(0.3); waitIdle(3); h.combat.equip('ball', true); P.settle(); const got = pickUp('sc-source'); return { src: G.flags.dx_source ?? null, got, n: count('sc-source') }; });
const f1l = await said();
check('H-5 (fresh): the singing fork struck by the crust (INPUT, K): it cracks open; the crystal, once', f0.crust && f0.n === 0 && f1.src === 'fork' && f1.got && f1.n === 1 && has(f1l, /crust falls away/), { f0, f1, f1l });
iso('the epilogue by its flags (dinner over); back in the galleries');
const f2 = await ev(() => { setChapter('home', { ep_free: true }); toArea('c3gallery'); const S = D().src; const r = P.use(S.front.x, S.front.z, { kind: 'dx_src', near: 1.3, match: 2.5 }).r; return { r, open: S.cluster.visible && !S.crust.visible, n: count('sc-source') }; });
const f2l = await said();
check('H-5 in the epilogue: the cell still open and singing (its line), one crystal', f2.r === 'used' && f2.open && f2.n === 1 && has(f2l, /still sings/), { f2, f2l });
const j = await ev(() => { const J = game.story.journal(); const s = J.find((c) => /Singing crystals/.test(c.title)); return s?.lines.map((l) => [l.key, l.done]) || []; });
check('the journal: the pack, the figures and the source, each done', ['dx_j_pack', 'dx_j_gaze', 'dx_j_src'].every((k) => j.some(([kk, d]) => kk === k && d)), j);
await browser.close();

// ================================================================ an old save (format 6, written before wave 2)
({ browser, context, page } = await launch({ scale: 1 }));
if (process.env.SERVE) await serveLocal(context);
const st = JSON.parse(fs.readFileSync(OLD, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'lba3_save_v1')?.value;
await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
const o1 = await ev(() => { const S = game.story.depth.src; return { v: JSON.parse(localStorage.getItem('lba3_save_v1')).v, state: game.state, chapter: game.flags.chapterKey, room: game.room?.id, dx: Object.keys(game.flags).filter((k) => /^dx_(pack|gaze|src|source)/.test(k)), crust: !!S?.crust.visible, n: game.crystalCount() }; });
check('an old save (format 6, the galleries in chapter 15, before wave 2): loads into play, no new state made up, the crust there and whole', o1.v === 6 && o1.state === 'play' && o1.chapter === 'shell' && o1.room === 'c3gallery' && o1.dx.length === 0 && o1.crust, { o1, raw: !!raw });
await browser.close();
done();
