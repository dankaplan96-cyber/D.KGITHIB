// Travel between the regions (CONNECT; src/game/travel.js, src/game/story/islands.js) by input: he walks to a
// dock, pad or field, presses E, picks a destination in the menu and arrives there in play.
//   - the gates: nothing opens before its chapter (ferry from ch. 4 but not in ch. 5, the glider from ch. 6 between
//     Desert Island and the Hamalayi, from ch. 8 to Citadel; the spaceship and Zeelich's shuttles from ch. 4)
//   - after the main story: every Twinsun region from every other (ferry and glider), Citadel ⇄ Zeelich by
//     spaceship only, every Zeelich place from Zeelich's spaceport island and from each other by shuttle
//   - the menus: Citadel Spaceport lists only Zeelich Spaceport; Zeelich Spaceport only Citadel; Zeelich's shuttles
//     only Zeelich's places; no Twinsun stop on Zeelich, no Zeelich island on Twinsun
//   - the Holomap shows the planet he is on, with his dot, in every outdoor region
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
check('on Zeelich he walks from the spaceport deck over the footbridge to the shuttle pad; its menu: the spaceport island (here) and the 11 islands, nothing of Twinsun', zwalk.prompt === 'menu' && zwalk.items.length === 12 && zwalk.items[0].endsWith('*') && zwalk.items.every((t) => !/Twinsun|Citadel|Desert|Hamalayi/.test(t)), zwalk);
// every Zeelich place by shuttle: a chain from pad to pad, then back to the spaceport island
const NAME = { isle_otringal: 'Otringal', isle_knartas: 'Knartas Island', isle_mosquibee: 'Mosquibee Island', isle_celebration: 'Celebration Island', isle_undergas: 'Under Celebration', isle_cxislet: 'The CX Islet', isle_platform: 'The Platform', isle_liftdock: 'The Lift Dock', isle_tralu: 'Tralu Rock', isle_orchard: 'The Nectar Orchard', isle_oldwatch: 'The Old Watch' };
const ISLES = await ev(() => Object.keys(game.travel.points).filter((k) => k.startsWith('isle_')));
let from = 'zeelich_shuttle';
const zl = [];
for (const id of ISLES) {
  const r = await leg(from, NAME[id], id, id);
  zl.push({ from, to: id, ok: matrix.at(-1).ok, items: r.r.items?.length, twinsun: (r.r.items || []).some((t) => /Twinsun|Citadel/.test(t)) });
  from = id;
}
const back = await leg(from, 'Zeelich: the spaceport island', 'zeelich', 'zeelich_shuttle');
check('every Zeelich place reached by shuttle, pad to pad (11 islands), and back to the spaceport island; no Twinsun stop on any menu', zl.length === 11 && zl.every((z) => z.ok && !z.twinsun) && matrix.at(-1).ok, { zl, back: matrix.at(-1) });
const s2 = await take('zeelich_port', null);
check('Zeelich Spaceport\'s menu lists only Twinsun: Citadel Spaceport', JSON.stringify(s2.items) === JSON.stringify(['Twinsun: Citadel Spaceport']), s2);
const s3 = await leg('zeelich_port', 'Twinsun: Citadel Spaceport', 'citadel', 'citadel_port');
check('the spaceship flies back: Zeelich Spaceport → Citadel Spaceport, on the deck in play', matrix.at(-1).ok, s3);

// ---------------------------------------------------------------- the Holomap per planet
const holo = [];
for (const [region, pid] of [['citadel', 'citadel_port'], ['desert', 'desert_ferry'], ['hamalayi', 'hamalayi_glider'], ['zeelich', 'zeelich_port'], ['isle_tralu', 'isle_tralu'], ['isle_liftdock', 'isle_liftdock']]) {
  await near(pid);
  const r = await ev(() => { P.tap('KeyM', 0.3); const s = game.state, H = game.hud.holoHero, W = game.hud.holo.width, title = document.querySelector('#holomap .title').textContent; return { s, H, W, title }; });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/holomap-${region}.jpg`, type: 'jpeg', quality: 70 });
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
  holo.push({ region, open: r.s === 'map', ...r.H, dotIn: r.H && r.H.x > 0 && r.H.y > 0 && r.H.x < r.W && r.H.y < r.W, title: r.title });
}
check('the Holomap shows the planet he is on (Twinsun: Citadel, Desert Island, the Hamalayi; Zeelich: its spaceport island and islands) with his dot on the map', holo.every((o) => o.open && o.dotIn && o.region === o.region && o.planet === (['citadel', 'desert', 'hamalayi'].includes(o.region) ? 'twinsun' : 'zeelich')), holo);

if (process.env.MATRIX) fs.writeFileSync(process.env.MATRIX, JSON.stringify({ matrix, holo }, null, 1));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
