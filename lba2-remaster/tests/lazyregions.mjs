// LAZY-REGIONS (docs/lba3-performance/LAZY_REGIONS.md): startup builds Citadel, the house and the well, and the areas
// the newest save stands in; every other area is built the first time it is needed and kept.
//   1. startup: what is built, what is not; data-only questions answered without a build (travel stops, the crystal
//      count, where a room stands)
//   2. a door into an area not built yet, in real time (the page's own frame loop): the loading card, the build,
//      the arrival, the cast placed there; a second visit builds nothing
//   3. a save in another area: the reload builds it at startup; Continue builds nothing more
//   4. Load Game from a slot in an area not built yet: built under the loading screen, then the load
//   5. no area built where something read it ("on access") in any of the above
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const cdp = await page.context().newCDPSession(page);
const heapMB = async () => { await cdp.send('HeapProfiler.collectGarbage'); return Math.round((await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576); };
const settle = () => ev(() => P.settle());
// wait for the page's own loop to finish a scene change (SwiftShader: seconds per frame)
const realTime = async (fn) => {
  await ev(() => { game.testFreeze = false; game.last = performance.now(); });
  await ev(fn);
  await page.waitForFunction(() => !game.trans, null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; });
};

// ---------------------------------------------------------------- 1. startup
await open(page, '?nocine');
const s1 = await ev(() => { const S = game.regions.summary(); return { startup: S.startup.map((x) => x.group), deferred: S.deferred, built: Object.keys(game.rooms) }; });
check('startup builds only the house and the well besides Citadel (no save yet)', s1.startup.join() === 'house,well' && s1.built.join() === 'house,well', s1);
check('every other area is left for later (Zeelich, Desert Island, the Hamalayi, the islands, the other interiors)', ['zeelich', 'desert', 'hamalayi', 'underground', 'upper', 'isle_otringal', 'workshop', 'arena'].every((g) => s1.deferred.includes(g)), s1.deferred);
const data = await ev(() => {
  const G = game, T = G.travel.points, R = G.regions;
  return {
    stops: ['desert_ferry', 'desert_glider', 'hamalayi_glider', 'zeelich_port'].map((k) => [k, Number.isFinite(T[k].x) && Number.isFinite(T[k].landing?.x)]),
    routes: G.travel.routes.length, isles: Object.keys(T).filter((k) => k.startsWith('isle_')).length,
    crystals: G.crystalSpots().length,
    has: ['zeelich', 'desert', 'isle_knartas', 'c3core'].every((id) => R.has(id) && id in G.rooms),
    centre: [R.centreOf('upper'), R.centreOf('desert'), R.sceneOf(4851, 1), R.sceneOf(2410, 30)],
    built: Object.keys(G.rooms),
  };
});
check('data-only questions need no build: travel stops and landings, the routes, the crystal count (6), where each room stands', data.stops.every(([, ok]) => ok) && data.routes > 20 && data.isles === 11 && data.crystals === 6 && data.has && data.centre[2] === 'council' && data.centre[3] === 'zeelich' && data.built.join() === 'house,well', data);
const heap0 = await heapMB();

// ---------------------------------------------------------------- 2. a door into an area not built yet
await menu(page, 'new');
await ev(() => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'zeelich', c2_started: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'zeelich'); G.hero.hasBall = true; G.story.refreshCast(); });
const before = await ev(() => ({ nara: game.npcs.find((n) => n.def.id === 'nara').present, built: game.regions.stateOf('zeelich') }));
await ev(() => { window._card = 0; window._obs = new MutationObserver(() => { const e = document.querySelector('#loading'); if (e.classList.contains('arrive') && !e.classList.contains('hidden')) window._card++; }); window._obs.observe(document.querySelector('#loading'), { attributes: true, attributeFilter: ['class'] }); });
await realTime(() => game.enterRoom('zeelich'));
const arr = await ev(() => { window._obs.disconnect(); const G = game, n = G.npcs.find((x) => x.def.id === 'nara'), sp = G.rooms.zeelich.npcSpots.esmer1;
  return { room: G.room?.id, state: G.regions.stateOf('zeelich'), why: G.regions.groups.get('zeelich').why, card: window._card, loadingHidden: document.querySelector('#loading').classList.contains('hidden'), nara: { present: n.present, d: +Math.hypot(n.pos.x - sp.x, n.pos.z - sp.z).toFixed(2) } }; });
check('before Zeelich is built its people wait hidden (their spots are there)', before.nara === false && before.built === 'unloaded', before);
check('through a door into Zeelich: built behind the black under its loading card, then he is there', arr.room === 'zeelich' && arr.state === 'active' && arr.why === 'enter' && arr.card > 0 && arr.loadingHidden, arr);
check('Zeelich\'s people stand at their spots once it is built', arr.nara.present && arr.nara.d < 1.5, arr.nara);
const again = await ev(() => { const G = game, n0 = G.regions.log.length, grp = G.rooms.zeelich.group; G.exitRoom({ x: -42, z: 2, a: 0 }, true); G.enterRoom('zeelich', null, true); return { builds: G.regions.log.length - n0, same: G.rooms.zeelich.group === grp, state: G.regions.stateOf('zeelich') }; });
check('a second visit builds nothing (the area is kept)', again.builds === 0 && again.same && again.state === 'active', again);
const heap1 = await heapMB();

// ---------------------------------------------------------------- 3. a save in another area: startup builds it
await ev(() => { const G = game, f = G.flags; P.settle(); Object.assign(f, { chapterKey: 'dig', c4_started: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'dig'); G.story.refreshCast(); G.enterRoom('desert', null, true); G.step(0.2); G.save(false); });
await page.reload(); await open(page, '?nocine');
const s3 = await ev(() => game.regions.summary().startup.map((x) => x.group));
await menu(page, 'continue');
const c3 = await ev(() => { const G = game; for (let i = 0; i < 60; i++) G.step(1 / 30); P.settle(); const S = G.regions.summary(); return { room: G.room?.id, later: S.later, hesk: G.npcs.find((n) => n.def.id === 'hesk')?.present }; });
check('a save on Desert Island: the reload builds Desert Island (and the dig\'s temple) at startup', s3.includes('desert') && s3.includes('butemple') && !s3.includes('zeelich'), s3);
check('... Continue puts him there with Hesk about, and builds nothing more', c3.room === 'desert' && c3.later.length === 0 && c3.hesk, c3);

// ---------------------------------------------------------------- 4. Load Game: a slot in an area not built yet
await ev(() => {
  const G = game, f = G.flags; P.settle();
  Object.assign(f, { chapterKey: 'pass', c6_started: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'pass');
  G.enterRoom('hamalayi', null, true); G.step(0.2);
  const s = G.stamp(G.snapshot()); s.at = Date.now() - 3600e3;   // (an hour older than the autosave: Continue stays in the desert)
  localStorage.setItem('lba3_slot_2', JSON.stringify(s));
  // (and back to chapter 4 on Desert Island: the autosave, the newest save, stays there)
  f.chapterKey = 'dig'; f.chapter = G.story.chapters.findIndex((c) => c.key === 'dig'); G.story.refreshCast();
  G.enterRoom('desert', null, true); G.step(0.2);
});
await page.reload(); await open(page, '?nocine');
const s4 = await ev(() => game.regions.summary().startup.map((x) => x.group));
await page.click('#title [data-act="loadgame"]');
await ev(() => { game.testFreeze = false; game.last = performance.now(); window._card = 0; window._obs = new MutationObserver(() => { const e = document.querySelector('#loading'); if (e.classList.contains('arrive') && !e.classList.contains('hidden')) window._card++; }); window._obs.observe(document.querySelector('#loading'), { attributes: true, attributeFilter: ['class'] }); });
await page.click('#loadgame .slot[data-slot="2"]');
await page.waitForFunction(() => game.room?.id === 'hamalayi' && game.state === 'play', null, { timeout: 600000 }).catch(() => {});
const l4 = await ev(() => { window._obs.disconnect(); const G = game; G.testFreeze = true; const S = G.regions.summary(); return { room: G.room?.id, state: G.state, ham: S.later.find((x) => x.group === 'hamalayi'), card: window._card, yorna: G.npcs.find((n) => n.def.id === 'yorna')?.present, onAccess: S.later.filter((x) => x.why === 'access') }; });
check('Load Game, a slot in the Hamalayi (not built: the newest save is on Desert Island)', !s4.includes('hamalayi'), s4);
check('... the Hamalayi is built under the loading screen, then the save loads there, its people about', l4.room === 'hamalayi' && l4.state === 'play' && l4.ham?.why === 'load' && l4.card > 0 && l4.yorna, l4);

// ---------------------------------------------------------------- 5. nothing built "on access" in play
check('no area was built where something read it ("on access") in play', l4.onAccess.length === 0, l4.onAccess);
const all = await ev(() => { const t0 = performance.now(); game.regions.ensureAll('test'); return { ms: Math.round(performance.now() - t0), deferred: game.regions.summary().deferred }; });
const heapAll = await heapMB();
console.log('JS heap after GC (MB): at the title', heap0, '· after Zeelich', heap1, '· every area built', heapAll, '(the rest built in', all.ms, 'ms)');
check('every area can still be built (tests and tools: regions.ensureAll)', all.deferred.length === 0, all);
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
