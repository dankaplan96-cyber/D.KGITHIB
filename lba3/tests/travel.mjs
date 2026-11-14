// Travel between the regions (CONNECT; src/game/travel.js, src/game/story/islands.js) by input: he walks to a
// dock, pad or field, presses E, picks a destination in the menu and arrives there in play.
//   - the gates: nothing opens before its chapter (ferry from ch. 4 but not in ch. 5, the glider from ch. 6 between
//     Desert Island and the Hamalayi, from ch. 8 to Citadel; the spaceship and Zeelich's shuttles from ch. 4)
//   - after the main story: every Twinsun region from every other (ferry and glider), Citadel ⇄ Zeelich by
//     spaceship only, every Zeelich place from Zeelich's spaceport island and from each other by shuttle
//   - the menus: Citadel Spaceport lists only Zeelich Spaceport; Zeelich Spaceport only Citadel; Zeelich's shuttles
//     only Zeelich's places; no Twinsun stop on Zeelich, no Zeelich island on Twinsun
//   - the Holomap shows the planet he is on, with his dot, in every outdoor region
//   - PLANET-1: every route touching Zeelich is the spaceship or a Zeelich shuttle; the story's crossings by input:
//     chapter 2 (Doran at the harbour → the project's ship at Citadel Spaceport → Zeelich Spaceport's deck), chapter 8
//     (no ship at the quay; the project ship at the spaceport), chapter 10 (no Hesk on Zeelich; the spaceship to
//     Citadel; Hesk's glider menu names only Twinsun)
//   - TRAVEL-1: with the journey films on, every route both ways by input: the craft's films played (the ship's with
//     its cabin and passengers), the landing on the spot, on the ground, in no collider, in play, Save → Continue;
//     the skip (hold E) in a departure, in the cabin, in an arrival; a short press does not skip; none mid-dialogue.
//     FILMS_ONLY=<substring of "from>to"> rides only those (and skips the skip checks).
// ISO (logged): the chapter is set by its flags; before walking to a travel point he is put ~8 m from it (the walk,
// the menu and the arrival are by input).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS || '';
await open(page, '?nocine'); await menu(page, 'new');
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key, ...extra }); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.refreshCast(); }, [key, extra]);
// put him ~8 m from a travel point (ISO), in its region
const near = (pid) => ev((pid) => {
  const G = game, p = G.travel.points[pid], L = p.landing || p;
  const a = Math.atan2(L.x - p.x, L.z - p.z), d = Math.min(8, Math.hypot(L.x - p.x, L.z - p.z) + 3), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
  if (p.region === 'citadel') G.exitRoom({ x, z, a: a + Math.PI }, true); else G.enterRoom(p.region, { x, z, a: a + Math.PI }, true);
  P.settle(); return { region: p.region, at: [x, z] };
}, pid);
// walk to the point (INPUT), E, read the menu; pick (a prefix) or close it
const take = (pid, pick) => ev(([pid, pick]) => {
  const G = game, h = G.hero, p = G.travel.points[pid];
  const here = () => { const it = G.findInteractable(); return it?.kind === 'isleShuttle' && it.point?.id === pid ? 'menu' : it?.kind === 'portGrounded' && pid === 'citadel_port' ? 'grounded' : null; };
  const r = P.go(p.x, p.z, { tol: Math.max(1.5, p.r - 1.2), run: true, stopWhen: () => !!here(), maxT: 150 }); P.face(p.x, p.z);
  // (someone to talk to standing by: step right up to the stop, as a player would)
  if (!here() && G.findInteractable()?.kind === 'npc') { P.go(p.x, p.z, { tol: 0.4, maxT: 30 }); }
  const prompt = here();
  if (prompt !== 'menu') { P.release(); return { prompt, r: r.r, target: P.target()?.kind ?? null, d: +Math.hypot(h.pos.x - p.x, h.pos.z - p.z).toFixed(1) }; }
  P.tap('KeyE', 0.1);
  const title = document.querySelector('#shop h2')?.textContent;
  const items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent + (b.disabled ? '*' : ''));
  if (pick == null) { document.querySelector('#shop .leave')?.click(); G.step(0.2); P.settle(); return { prompt, title, items }; }
  const i = items.findIndex((t) => t.startsWith(pick));
  if (i < 0) { document.querySelector('#shop .leave')?.click(); P.settle(); return { prompt, title, items, fail: 'no item ' + pick }; }
  P.menuPick(i); P.settle(30);
  return { prompt, title, items, room: G.room?.id ?? 'citadel', state: G.state, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(1)) };
}, [pid, pick]);
const landed = (res, region, pid) => ev(([region, pid]) => { const G = game, p = G.travel.points[pid], L = p.landing || p, h = G.hero; return { ok: (G.room?.id ?? 'citadel') === region && G.state === 'play' && Math.hypot(h.pos.x - L.x, h.pos.z - L.z) < 3 && h.pos.y > -0.3, d: +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(2), y: +h.pos.y.toFixed(2) }; }, [region, pid]);

// ---------------------------------------------------------------- the gates
await setChapter('project');
const g0 = {};
for (const pid of ['citadel_ferry', 'citadel_glider', 'citadel_port', 'zeelich_shuttle', 'zeelich_port', 'desert_ferry', 'hamalayi_glider']) { await near(pid); g0[pid] = (await take(pid, null)).prompt ?? null; }
check('chapter 2: no travel menu anywhere (the spaceport\'s shuttle reads the grounded notice; ferry, gliders, Zeelich\'s pads closed)', g0.citadel_port === 'grounded' && Object.entries(g0).every(([k, v]) => k === 'citadel_port' || v == null), g0);
await setChapter('dig');
const g4 = {};
for (const pid of ['citadel_ferry', 'citadel_glider', 'desert_glider', 'hamalayi_glider']) { await near(pid); const r = await take(pid, null); g4[pid] = r.items || null; }
check('chapter 4: the ferry runs (Citadel → Desert Island only); every glider field is closed', JSON.stringify(g4.citadel_ferry) === JSON.stringify(['Desert Island: the pier']) && !g4.citadel_glider && !g4.desert_glider && !g4.hamalayi_glider, g4);
await setChapter('steam');
await near('desert_ferry');
const g5 = await take('desert_ferry', null);
check('chapter 5: the project has taken the ferry: no ferry menu on Desert Island\'s pier', g5.prompt == null, g5);
await setChapter('pass');
const g6 = {};
for (const pid of ['desert_glider', 'hamalayi_glider', 'citadel_glider']) { await near(pid); const r = await take(pid, null); g6[pid] = r.items || null; }
check('chapter 6: the glider joins Desert Island and the Hamalayi; Citadel\'s field still closed', JSON.stringify(g6.desert_glider) === JSON.stringify(['The Hamalayi: the foothills']) && JSON.stringify(g6.hamalayi_glider) === JSON.stringify(['Desert Island: the glider field']) && !g6.citadel_glider, g6);

// ---------------------------------------------------------------- PLANET-1: the story's crossings are spaceship flights
// (the user: "Twinsun and Zeelich are two separate planets, so the crossing between them is a spaceship")
const routesPlanet = await ev(() => { const T = game.travel, pl = (id) => (T.points[id].region.startsWith('isle_') || T.points[id].region === 'zeelich' ? 'zeelich' : 'twinsun');
  return T.routes.map((r) => ({ a: r.a, b: r.b, mode: r.mode, pa: pl(r.a), pb: pl(r.b) })); });
check('PLANET-1: every travel route that touches Zeelich is the spaceship (Citadel ⇄ Zeelich Spaceport) or a Zeelich shuttle; no ferry, glider or boat route reaches Zeelich',
  routesPlanet.every((r) => (r.pa !== r.pb ? r.mode === 'ship' : r.pa === 'zeelich' ? r.mode === 'shuttle' : ['ferry', 'glider'].includes(r.mode))) && routesPlanet.filter((r) => r.pa !== r.pb).length === 1, routesPlanet.filter((r) => r.pa !== r.pb || r.mode === 'ship'));
await ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines.map((l) => String(l).slice(0, 60))); return sv.call(this, n, lines, ...a); }; } });
const said = () => ev(() => window._said.splice(0));
// chapter 2 → 3 by input: Doran at the harbour agrees and goes ahead; the project's ship at Citadel Spaceport flies him over
const C1 = { c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_water: true, c1_tour: true, c1_needZoe: true, c1_zoeStart: true, c1_zoeDone: true, c1_plan: true, c1_veskGone: true, c1_radio: true };
await setChapter('project', C1);
await near('citadel_ferry');
// (STAGING-1: he sets off up the quay on foot and is put by the ship once neither he nor it is in view, so he is
//  checked at the spaceport when Twinsen gets there, not the moment the talk ends: he is still on the quay then)
const p2a = await ev(() => { const r = P.talk('doran', { run: true }); const d = P.npc('doran'), sp = game.world.spaceport; return { r: r.r, ship: !!game.flags.c1_ship, ch: game.flags.chapterKey, room: game.room?.id ?? 'citadel', walking: !!game.story.cur.walkers?.doran, doranAtPortNow: Math.hypot(d.pos.x - sp.pad.x, d.pos.z - sp.pad.z) < 8, obj: document.querySelector('#objective')?.textContent }; });
await said();
p2a.there = await ev(() => { const sp = game.world.spaceport, d = P.npc('doran'); let g; for (let k = 0; k < 3 && Math.hypot(game.hero.pos.x - sp.pad.x, game.hero.pos.z - sp.pad.z) > 9; k++) { g = P.go(sp.pad.x - 7, sp.pad.z, { tol: 1.5, run: true, maxT: 200 }); P.settle(); }
  return { go: g?.r, present: d.present, walking: !!game.story.cur.walkers?.doran, d: +Math.hypot(d.pos.x - sp.landing.x, d.pos.z - sp.landing.z).toFixed(1), dPad: +Math.hypot(d.pos.x - sp.pad.x, d.pos.z - sp.pad.z).toFixed(1) }; });
check('chapter 2: Doran at the harbour takes Baldino\'s start code and sets off for the spaceport; no crossing from the harbour; when Twinsen gets to the spaceport Doran is waiting by the ship (INPUT)', p2a.r === 'talked' && p2a.ship && p2a.ch === 'project' && p2a.room === 'citadel' && /spaceport/i.test(p2a.obj || '') && p2a.there.present && !p2a.there.walking && p2a.there.dPad < 8, p2a);
// (a remark on the way — someone in town calling out — stops the walk; a player walks on: up to three tries)
await said();
const p2b = await ev(() => { const sp = game.world.spaceport; let r; for (let k = 0; k < 3 && game.flags.chapterKey === 'project'; k++) { r = P.use(sp.pad.x - 4.2, sp.pad.z, { run: true, kind: 'c1ship' }); P.settle(60); } const Z = game.rooms.zeelich, L = Z.spaceport.landing, h = game.hero;
  return { r: r.r, kind: r.target?.kind, ch: game.flags.chapterKey, room: game.room?.id, state: game.state, onPortDeck: Math.hypot(h.pos.x - L.x, h.pos.z - L.z) < 4, ferry: Z.ferry?.group?.visible ?? null, taken: !!game.flags.c2_planTaken }; });
p2b.said = await said();
check('chapter 2 → 3: E at the project\'s ship on Citadel Spaceport\'s pad (INPUT) flies him to Zeelich: chapter 3 starts on Zeelich Spaceport\'s deck, the plan confiscated there; no sky-ferry at Zeelich\'s dock', p2b.kind === 'c1ship' && p2b.ch === 'zeelich' && p2b.room === 'zeelich' && p2b.state === 'play' && p2b.onPortDeck && p2b.ferry === false && p2b.taken, p2b);
// chapter 8 → 9 by input: the project ship boards at the spaceport, not at the harbour
await setChapter('evacuation', { c8_started: true, c8_home: true, c8_relay: true, c8_vesk: true, c8_zoeDone: true });
await near('citadel_ferry');
const p8a = await ev(() => { const Q = game.world.pierStart; P.go(Q.x - 6, Q.z, { tol: 1.0, run: true }); P.face(Q.x - 7, Q.z); return { kind: P.target()?.kind ?? null }; });
await said();
const p8b = await ev(() => { const sp = game.world.spaceport; let r; for (let k = 0; k < 3 && game.flags.chapterKey === 'evacuation'; k++) { r = P.use(sp.pad.x - 4.2, sp.pad.z, { run: true, kind: 'c8ship' }); P.settle(60); } const L = game.rooms.zeelich.spaceport.landing, h = game.hero;
  return { r: r.r, kind: r.target?.kind, ch: game.flags.chapterKey, room: game.room?.id, onPortDeck: Math.hypot(h.pos.x - L.x, h.pos.z - L.z) < 4 }; });
p8b.said = await said();
check('chapter 8 → 9: no ship at the harbour\'s quay; E at the project ship on Citadel Spaceport\'s pad (INPUT) → chapter 9 on Zeelich Spaceport\'s deck', p8a.kind !== 'c8ship' && p8b.kind === 'c8ship' && p8b.ch === 'council' && p8b.room === 'zeelich' && p8b.onPortDeck, { p8a, p8b });
// chapter 10: Hesk's glider is Twinsun's only; Zeelich ⇄ Citadel by the spaceship
await setChapter('network', { c10_started: true, c10_pulse: true });
await near('zeelich_port');
const h10a = await ev(() => ({ room: game.room?.id, hesk: !!P.npc('hesk')?.present }));
const h10b = await take('zeelich_port', 'Twinsun');
const h10c = await ev(() => { const G = game, n = P.npc('hesk'); if (!n?.present) return { r: 'absent' }; const g = P.go(n.pos.x, n.pos.z, { tol: 1.6, run: true }); P.face(n.pos.x, n.pos.z); const tk = P.target()?.kind; P.tap('KeyE', 0.1);
  for (let k = 0; k < 40 && G.state === 'dialog'; k++) P.tap('KeyE', 0.12); const r = { r: G.state === 'shop' && tk === 'npc' ? 'talked' : 'no menu: ' + G.state + '/' + tk + '/' + g.r }; const title = document.querySelector('#shop h2')?.textContent, items = [...document.querySelectorAll('#shop .item')].map((b) => b.querySelector('span').textContent + (b.disabled ? '*' : '')); document.querySelector('#shop .leave')?.click(); game.step(0.2); P.settle(); return { r: r.r, title, items }; });
check('chapter 10: no Hesk on Zeelich; the spaceship takes him to Citadel; Hesk\'s glider menu there names only Twinsun (Citadel, Desert Island, the Hamalayi), never Zeelich (INPUT)', !h10a.hesk && h10b.room === 'citadel' && h10c.r === 'talked' && h10c.items.length === 3 && h10c.items.every((x) => !/Zeelich/i.test(x)) && /Citadel/.test(h10c.items[0]) && /Desert/.test(h10c.items[1]) && /Hamalayi/.test(h10c.items[2]), { h10a, h10b: { room: h10b.room, items: h10b.items }, h10c });

// ---------------------------------------------------------------- after the main story: the matrix by input
await setChapter('home', { ep_free: true });
const matrix = [];
const leg = async (from, pick, toRegion, toPid) => {
  await near(from);
  const r = await take(from, pick), l = r.room ? await landed(r, toRegion, toPid) : { ok: false };
  matrix.push({ from, to: toPid, menu: r.items, ok: !!(r.room === toRegion && l.ok), d: l.d });
  return { r, l };
};
// Twinsun: every region from every other, by ferry and by glider
await leg('citadel_ferry', 'Desert Island', 'desert', 'desert_ferry');
await leg('desert_ferry', 'Citadel', 'citadel', 'citadel_ferry');
await leg('citadel_glider', 'The Hamalayi', 'hamalayi', 'hamalayi_glider');
await leg('hamalayi_glider', 'Desert Island', 'desert', 'desert_glider');
await leg('desert_glider', 'The Hamalayi', 'hamalayi', 'hamalayi_glider');
await leg('hamalayi_glider', 'Citadel', 'citadel', 'citadel_glider');
await leg('citadel_glider', 'Desert Island', 'desert', 'desert_glider');
await leg('desert_glider', 'Citadel', 'citadel', 'citadel_glider');
const tw = matrix.slice();
check('Twinsun: Citadel ⇄ Desert Island ⇄ the Hamalayi, every region from every other by ferry or glider, by input (8 legs)', tw.length === 8 && tw.every((m) => m.ok), tw);
const twMenus = tw.flatMap((m) => m.menu || []);
check('Twinsun\'s ferry and glider menus name only Twinsun places (no Zeelich, no spaceship)', twMenus.length > 0 && twMenus.every((t) => /^(Citadel|Desert|The Hamalayi)/.test(t)), twMenus);
// the planets: by spaceship only
const s1 = await leg('citadel_port', 'Zeelich Spaceport', 'zeelich', 'zeelich_port');
check('Citadel Spaceport\'s menu lists only Zeelich Spaceport; the spaceship lands him on Zeelich\'s spaceport deck', JSON.stringify(s1.r.items) === JSON.stringify(['Zeelich Spaceport']) && matrix.at(-1).ok, { r: s1.r, l: s1.l });
// from the spaceport deck over the footbridge to the shuttle pad (INPUT, no ISO), and the shuttle's menu
const zwalk = await take('zeelich_shuttle', null);
check('on Zeelich he walks from the spaceport deck over the footbridge to the shuttle pad; its menu: the spaceport island (here) and the 9 islands, nothing of Twinsun', zwalk.prompt === 'menu' && zwalk.items.length === 10 && zwalk.items[0].endsWith('*') && zwalk.items.every((t) => !/Twinsun|Citadel|Desert|Hamalayi/.test(t)), zwalk);
// every Zeelich place by shuttle: a chain from pad to pad, then back to the spaceport island
const NAME = { isle_otringal: 'Otringal', isle_knartas: 'Knartas Island', isle_mosquibee: 'Mosquibee Island', isle_celebration: 'Celebration Island', isle_undergas: 'Under Celebration', isle_platform: 'The Platform', isle_liftdock: 'The Lift Dock', isle_orchard: 'The Nectar Orchard', isle_oldwatch: 'The Old Watch' };
const ISLES = await ev(() => Object.keys(game.travel.points).filter((k) => k.startsWith('isle_')));
let from = 'zeelich_shuttle';
const zl = [];
for (const id of ISLES) {
  const r = await leg(from, NAME[id], id, id);
  zl.push({ from, to: id, ok: matrix.at(-1).ok, items: r.r.items?.length, twinsun: (r.r.items || []).some((t) => /Twinsun|Citadel/.test(t)) });
  from = id;
}
const back = await leg(from, 'Zeelich: the spaceport island', 'zeelich', 'zeelich_shuttle');
check('every Zeelich place reached by shuttle, pad to pad (9 islands: DECLUTTER cut the CX islet and Tralu Rock), and back to the spaceport island; no Twinsun stop on any menu', zl.length === 9 && zl.every((z) => z.ok && !z.twinsun) && matrix.at(-1).ok, { zl, back: matrix.at(-1) });
const s2 = await take('zeelich_port', null);
check('Zeelich Spaceport\'s menu lists only Twinsun: Citadel Spaceport', JSON.stringify(s2.items) === JSON.stringify(['Twinsun: Citadel Spaceport']), s2);
const s3 = await leg('zeelich_port', 'Twinsun: Citadel Spaceport', 'citadel', 'citadel_port');
check('the spaceship flies back: Zeelich Spaceport → Citadel Spaceport, on the deck in play', matrix.at(-1).ok, s3);

// ---------------------------------------------------------------- the Holomap per planet
const holo = [];
for (const [region, pid] of [['citadel', 'citadel_port'], ['desert', 'desert_ferry'], ['hamalayi', 'hamalayi_glider'], ['zeelich', 'zeelich_port'], ['isle_orchard', 'isle_orchard'], ['isle_liftdock', 'isle_liftdock']]) {
  await near(pid);
  const r = await ev(() => { P.tap('KeyM', 0.3); const s = game.state, H = game.hud.holoHero, W = game.hud.holo.width, title = document.querySelector('#holomap .title').textContent; return { s, H, W, title }; });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/holomap-${region}.jpg`, type: 'jpeg', quality: 70 });
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
  holo.push({ region, open: r.s === 'map', ...r.H, dotIn: r.H && r.H.x > 0 && r.H.y > 0 && r.H.x < r.W && r.H.y < r.W, title: r.title });
}
check('the Holomap shows the planet he is on (Twinsun: Citadel, Desert Island, the Hamalayi; Zeelich: its spaceport island and islands) with his dot on the map', holo.every((o) => o.open && o.dotIn && o.region === o.region && o.planet === (['citadel', 'desert', 'hamalayi'].includes(o.region) ? 'twinsun' : 'zeelich')), holo);

// ---------------------------------------------------------------- TRAVEL-1: every journey shows its craft
// (the user: "every passage from planet to planet is only by spaceship ... the ship flying, seen from outside, and from
// inside with the people there; every kind of vehicle must work"). The films are on here (?nocine turns them off for
// the other suites). Every route of the network, both ways, by input: walk to the stop, E, pick the destination in
// the menu, the films play out; then the craft's shots were played, he stands on the landing spot, on the ground and
// in no collider, in the right region, in play, nothing of the films is left in the scene, and Save → Continue puts
// him back there. Then the skip (hold E) in each film, a short press that does not skip, and no journey mid-dialogue.
const FILMS_ONLY = process.env.FILMS_ONLY;   // (a route filter for quick runs: a substring of "from>to")
await setChapter('home', { ep_free: true });
await ev(() => {
  const G = game; G.travel.films.on = true; G.travel.films.log.length = 0;
  // (the menu's own items, to pick a destination by its point and not its label)
  if (!G._menuSpy) { G._menuSpy = true; const om = G.openMenu; G.openMenu = function (k, items, cb) { window._menuItems = items; return om.call(this, k, items, cb); }; }
});
const ROUTES = await ev(() => game.travel.routes.map((r) => ({ a: r.a, b: r.b, mode: r.mode })));
// one journey by input; hold: { at: 'depart' | 'arrive', t } holds E from that film's time t (skip), else it plays out
const ride = async (from, to, hold = null) => {
  const r0 = await ev(([from, to]) => {
    const G = game, T = G.travel, p = T.points[from];
    const here = () => { const it = G.findInteractable(); return it?.kind === 'isleShuttle' && it.point?.id === from; };
    if (!here()) {
      const L = p.landing || p, a = Math.atan2(L.x - p.x, L.z - p.z), d = Math.min(8, Math.hypot(L.x - p.x, L.z - p.z) + 3);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if ((G.room?.id ?? 'citadel') !== p.region) { if (p.region === 'citadel') G.exitRoom({ x, z, a: a + Math.PI }, true); else G.enterRoom(p.region, { x, z, a: a + Math.PI }, true); P.settle(); }
      P.go(p.x, p.z, { tol: Math.max(1.5, p.r - 1.2), run: true, stopWhen: here, maxT: 150 }); P.face(p.x, p.z);
      if (!here() && G.findInteractable()?.kind === 'npc') P.go(p.x, p.z, { tol: 0.4, maxT: 30 });
    }
    if (!here()) { P.release(); return { fail: 'no menu at ' + from, near: G.findInteractable()?.kind ?? null }; }
    window._menuItems = null; P.tap('KeyE', 0.1);
    const i = (window._menuItems || []).findIndex((it) => it.point?.id === to);
    if (i < 0) { document.querySelector('#shop .leave')?.click(); G.step(0.2); return { fail: 'no menu item ' + to }; }
    window._ride = { n0: T.films.n || 0, kids: G.scene.children.length, cabin: false, cast: 0, states: [] };
    document.querySelector(`#shop .item[data-i="${i}"]`).click();
    return { ok: true, state: G.state };
  }, [from, to]);
  if (r0.fail) return r0;
  if (hold) {
    // play to the time, then hold the skip key the way a player does (the skip's dip to black runs on the clock)
    await ev((hold) => { const G = game, F = G.travel.films; for (let k = 0; k < 2000; k++) { const e = F.log.at(-1); if (G.cine && e?.part === hold.at && G.cine.t >= hold.t && (F.n || 0) > window._ride.n0) break; G.step(1 / 30); } }, hold);
    await page.keyboard.down('KeyE');
    await ev(() => { for (let i = 0; i < 36; i++) game.frame(1 / 30, false); });
    await page.keyboard.up('KeyE');
    await page.waitForTimeout(700);
  }
  return ev(([from, to]) => {
    const G = game, T = G.travel, F = T.films, q = T.points[to], h = G.hero, PH = G.physics, R = window._ride;
    for (let k = 0; k < 900 && !(G.state === 'play' && !G.trans && !G.cine); k++) {
      G.step(1 / 30);
      if (!R.states.includes(G.state)) R.states.push(G.state);
      const cab = G.scene.getObjectByName('shipCabin'); if (cab?.visible) { R.cabin = true; R.cast = Math.max(R.cast, cab.children.filter((o) => o.type === 'Group' && o.children.some((c) => c.isSkinnedMesh)).length); }
    }
    G.step(0.3);
    const parts = F.log.filter((e) => e.n > R.n0), L = q.landing || q, x = h.pos.x, z = h.pos.z;
    const gy = PH.groundAt(x, z, h.pos.y + 0.5);
    const inside = PH.near(x, z).filter((c) => c.enabled !== false && c.top > h.pos.y + 0.3 && (c.bottom == null || c.bottom < h.pos.y + 1.6) && PH._inside(c, x, z, -0.1)).map((c) => [c.type, +c.x.toFixed(1), +c.z.toFixed(1)]);
    const out = {
      parts: parts.map((e) => ({ part: e.part, mode: e.mode, len: e.length, t: e.t, skipped: e.skipped, parked: e.parked })),
      region: G.room?.id ?? 'citadel', want: q.region, state: G.state, trans: !!G.trans, cine: !!G.cine,
      d: +Math.hypot(x - L.x, z - L.z).toFixed(2), dy: +(h.pos.y - gy).toFixed(2), inside,
      heroShown: h.rig.root.visible, hud: !document.querySelector('#hud').classList.contains('hidden'), fade: getComputedStyle(document.querySelector('#fade')).opacity,
      left: ['filmCraft', 'shipCabin', 'filmSpace'].filter((n) => G.scene.getObjectByName(n)), kids: G.scene.children.length - R.kids,
      cabin: R.cabin, cast: R.cast, states: R.states,
    };
    // Save → Continue: he is back on the landing spot, in that region, in play
    G.save(false); G.startContinue(); G.step(0.5); P.settle();
    out.cont = { region: G.room?.id ?? 'citadel', state: G.state, d: +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(2) };
    G.travel.films.on = true;
    return out;
  }, [from, to]);
};
const landedOK = (r) => r.region === r.want && r.state === 'play' && !r.trans && !r.cine && r.d < 1.5 && Math.abs(r.dy) < 0.3 && !r.inside.length && r.heroShown && r.hud
  && !r.left.length && r.cont.region === r.want && r.cont.state === 'play' && r.cont.d < 1.5;
const played = (r, mode) => {
  const dep = r.parts.find((e) => e.part === 'depart'), arr = r.parts.find((e) => e.part === 'arrive');
  return !!dep && !!arr && dep.mode === mode && !dep.skipped && !arr.skipped && dep.t >= dep.len - 0.05 && arr.t >= arr.len - 0.05 && dep.parked && arr.parked
    && dep.len >= 2 && arr.len >= 2 && (mode !== 'ship' || (r.cabin && r.cast >= 2 && dep.len >= 6));
};
const legs = [];
for (const rt of ROUTES) for (const [a, b] of [[rt.a, rt.b], [rt.b, rt.a]]) if (!FILMS_ONLY || `${a}>${b}`.includes(FILMS_ONLY)) legs.push({ a, b, mode: rt.mode });
const results = [];
for (const L of legs) {
  const r = await ride(L.a, L.b);
  const ok = !r.fail && played(r, L.mode) && landedOK(r);
  results.push({ ...L, ok });
  if (!ok) console.log('ride', `${L.a}>${L.b}`, JSON.stringify(r).slice(0, 900));
}
const byMode = (m) => results.filter((x) => x.mode === m);
for (const m of ['ship', 'ferry', 'glider', 'shuttle']) {
  const rs = byMode(m);
  if (!rs.length && FILMS_ONLY) continue;
  check(`TRAVEL-1 ${m}: every route both ways shows its craft leaving and arriving${m === 'ship' ? ' (with the cabin and its passengers)' : ''}; he lands on the landing spot, on the ground, in no collider, in the right region, in play; Save → Continue keeps it (${rs.length} rides)`,
    rs.length > 0 && rs.every((x) => x.ok), rs.filter((x) => !x.ok).map((x) => `${x.a}>${x.b}`));
}
check('TRAVEL-1: every route of the network was ridden both ways', FILMS_ONLY || results.length === ROUTES.length * 2, { routes: ROUTES.length, rides: results.length });
// the skip: in the ship's cabin (the whole journey's film ends: the plain transition follows), in an arrival
if (!FILMS_ONLY) {
  const sk1 = await ride('citadel_port', 'zeelich_port', { at: 'depart', t: 4.0 });
  check('TRAVEL-1 skip: holding E in the ship\'s cabin ends the journey\'s film (no arrival film); he lands on Zeelich Spaceport\'s deck in play, nothing of the film left',
    !sk1.fail && sk1.parts.length === 1 && sk1.parts[0].skipped && sk1.parts[0].t < sk1.parts[0].len && landedOK(sk1), sk1);
  const sk2 = await ride('zeelich_port', 'citadel_port', { at: 'arrive', t: 1.0 });
  check('TRAVEL-1 skip: holding E during the arrival puts him on the landing spot at once, in play',
    !sk2.fail && sk2.parts.length === 2 && !sk2.parts[0].skipped && sk2.parts[1].skipped && landedOK(sk2), sk2);
  const sk3 = await ride('citadel_ferry', 'desert_ferry', { at: 'depart', t: 0.5 });
  check('TRAVEL-1 skip: holding E as the ferry leaves the quay: he lands on Desert Island\'s pier in play',
    !sk3.fail && sk3.parts.length === 1 && sk3.parts[0].skipped && landedOK(sk3), sk3);
  // a short press does not skip
  const sp = await ev(() => { const G = game, T = G.travel, p = T.points.desert_ferry; P.go(p.x, p.z, { tol: Math.max(1.5, p.r - 1.2), run: true, maxT: 60, stopWhen: () => G.findInteractable()?.point?.id === 'desert_ferry' }); P.face(p.x, p.z); window._menuItems = null; P.tap('KeyE', 0.1); const i = (window._menuItems || []).findIndex((it) => it.point?.id === 'citadel_ferry'); document.querySelector(`#shop .item[data-i="${i}"]`)?.click(); G.step(0.5); return { state: G.state }; });
  await page.keyboard.down('KeyE'); await ev(() => { for (let i = 0; i < 9; i++) game.frame(1 / 30, false); }); await page.keyboard.up('KeyE'); await ev(() => { for (let i = 0; i < 6; i++) game.frame(1 / 30, false); });
  const sp2 = await ev(() => ({ state: game.state, run: game.cine?.state, t: game.cine?.t }));
  check('TRAVEL-1: a short press (0.3 s) does not skip the film', sp.state === 'cinematic' && sp2.state === 'cinematic' && sp2.run === 'run', { sp, sp2 });
  await ev(() => P.settle(60));
  // no journey mid-dialogue: at the stop with a line on screen, E reads on; no menu, no film
  const dl = await ev(() => {
    const G = game, T = G.travel, p = T.points.citadel_ferry, F = T.films, n0 = F.n || 0;
    if ((G.room?.id ?? 'citadel') !== 'citadel') { G.exitRoom(p.landing, true); P.settle(); }
    P.go(p.x, p.z, { tol: Math.max(1.5, p.r - 1.2), run: true, maxT: 60, stopWhen: () => G.findInteractable()?.point?.id === 'citadel_ferry' });
    G.say('', ['A test line.', 'And another.']);
    const s0 = G.state, seen = new Set();
    for (let k = 0; k < 10 && G.state === 'dialog'; k++) { P.tap('KeyE', 0.15); seen.add(G.state); }
    G.step(0.5); seen.add(G.state);
    return { s0, seen: [...seen], films: (F.n || 0) - n0, menu: !document.querySelector('#shop').classList.contains('hidden') };
  });
  check('TRAVEL-1: no journey starts mid-dialogue (E at the stop reads the line on; no menu, no film)', dl.s0 === 'dialog' && !dl.seen.includes('shop') && !dl.seen.includes('cinematic') && dl.films === 0, dl);
  await ev(() => P.settle());
}

if (process.env.MATRIX) fs.writeFileSync(process.env.MATRIX, JSON.stringify({ matrix, holo }, null, 1));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
