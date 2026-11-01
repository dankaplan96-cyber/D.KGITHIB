// WA-14: Citadel's old sewers (src/game/sewers.js, story/sewers.js), walked by INPUT (the player harness; no teleport
// in the walk), from a new game in chapter 1:
//   1. out of the house, along the lane to the grate by the pump: looked at (the knocking, Arthur's chalk), lifted
//   2. down the grate into the flooded hall (on the island, by the well-house door)
//   3. the gate at the back is shut: walking at it gets nowhere
//   4. the project's valve on the old winch: eased, the knocking stops, the gate rises
//   5. across the hall (island → pier → colonnade) and through the gate into the treasure room
//   6. the star chest: Arthur's map (the found-object ceremony), a clover (picked up); the barrel gives (a hop)
//   7. back out the same way: the gate, the hall, up the well-house ladder, back on Citadel beside the grate
//   8. home: Arthur is asked about the map (the item goes back to him)
//   9. Save → Continue keeps it all (the grate open, the gate up, the chest open, no map); an old save (no sw_ flags)
//      continues with the grate shut and nothing else changed
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const SHOTS = process.env.SHOTS;
const view = async (n) => { if (SHOTS) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.jpg`, type: 'jpeg', quality: 85, timeout: 300000 }); } };
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 480000 });
  await ev(() => { game.testFreeze = true; });
  if (mode) await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const items = () => ev(() => game.story.items().map((i) => i.id));
const flags = () => ev(() => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('sw_'))));
const where = () => ev(() => ({ room: game.room?.id ?? 'citadel', pos: [game.hero.pos.x, game.hero.pos.y, game.hero.pos.z].map((v) => +v.toFixed(2)), chapter: game.flags.chapterKey }));

await boot('new');
await said();
// out of the house, as a player starts (the opening's search, then the door)
await ev(() => { const s = game.room.searches[0]; P.use(s.x, s.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); });
let w = await where();
check('a new game: chapter 1, out of the house on Citadel', w.room === 'citadel' && w.chapter === 'well', w);

// ---------------------------------------------------------------- 1. the grate
let r = await ev(() => ({ doors: game.story.doors().filter((d) => d.room === 'sewer').length, hatch: { x: game.story.sewers.H.x, z: game.story.sewers.H.z } }));
check('the grate is there, shut: no way down yet', r.doors === 0 && Number.isFinite(r.hatch.x), r);
const HATCH = r.hatch;
r = await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
let s = await said();
check('the grate looked at: the knocking and Arthur\'s chalk; lifted (INPUT)', has(s, /knocks down there/) && has(s, /Arthur's writing/) && (await flags()).sw_hatch === true, { r, s });
r = await ev((H) => { const under = game.story.doors().some((d) => d.room === 'sewer'); P.go(H.x + 1.4, H.z + 0.6, { tol: 0.3 }); return { under, room: game.room?.id ?? 'citadel', door: game.story.doors().some((d) => d.room === 'sewer') }; }, HATCH);
check('the lifted grate is a door down, once he has stepped off it (not while he stands on it)', !r.under && r.room === 'citadel' && r.door, r);
await view('s1-grate');

// ---------------------------------------------------------------- 2. down into the hall
r = await ev(() => P.enter('sewer'));
w = await where();
const hall0 = await ev(() => { const R = game.room, c = R.center; return { built: game.regions.stateOf('sewer'), onFloor: game.hero.onGround, y: +game.hero.pos.y.toFixed(2), local: [+(game.hero.pos.x - c.x).toFixed(1), +(game.hero.pos.z - c.z).toFixed(1)] }; });
check('down the grate: in the flooded hall, standing on the island by the well-house (INPUT)', r.r === 'entered' && w.room === 'sewer' && hall0.onFloor && hall0.y > 0.3, { r, w, hall0 });
await view('s2-hall');
// the knock: the valve thumps every few seconds while it is open
r = await ev(() => { let n = 0; const sv = game.audio.play.bind(game.audio); game.audio.play = (k) => { if (k === 'clunk') n++; return sv(k); }; P.wait(6); game.audio.play = sv; return n; });
check('the knocking: the valve thumps every few seconds', r >= 2, r);

// ---------------------------------------------------------------- 3. the gate is shut
const GATE = await ev(() => { const g = game.story.sewers; return { gate: game.rooms.sewer.hall.gate, valve: game.rooms.sewer.hall.valve }; });
r = await ev((G) => { const out = P.go(G.gate.x, G.gate.z - 0.6, { tol: 0.3, maxT: 25 }); return { r: out.r, room: game.room?.id, z: +(game.hero.pos.z - G.gate.z).toFixed(2), x: +(game.hero.pos.x - G.gate.x).toFixed(2) }; }, GATE);
check('the gate at the back is shut: walking at it gets nowhere (INPUT)', r.room === 'sewer' && r.z > 0.3, r);
await view('s3-gate-shut');

// ---------------------------------------------------------------- 4. the valve
r = await ev((G) => P.use(G.valve.x, G.valve.z, { near: 0.9, kind: 'swvalve' }), GATE);
s = await said();
check("the project's valve on the old winch: eased, the knocking stops (INPUT)", (await flags()).sw_valve === true && has(s, /onto the old gate winch/) && has(s, /winch turns again/), { r, s });
r = await ev(() => { let n = 0; const sv = game.audio.play.bind(game.audio); game.audio.play = (k) => { if (k === 'clunk') n++; return sv(k); }; P.wait(4); game.audio.play = sv; return { knocks: n, open: game.rooms.sewer.hall.gateOpen }; });
check('quiet now, and the gate is up', r.knocks === 0 && r.open, r);

// ---------------------------------------------------------------- 5. across to the treasure room
r = await ev(() => { const t0 = game.time; const e = P.enter('sewervault'); return { ...e, t: +(game.time - t0).toFixed(1) }; });
w = await where();
check('across the hall and through the gate: the treasure room (INPUT)', r.r === 'entered' && w.room === 'sewervault', { r, w });
await view('s4-vault');

// ---------------------------------------------------------------- 6. the chest, the barrel
const cl0 = await ev(() => game.hero.clovers);
const CH = await ev(() => game.rooms.sewervault.vault.chest);
r = await ev((C) => { const shown = game.foundObj.shown.length; const u = P.use(C.x, C.z, { near: 0.8, kind: 'swchest' }); return { u, found: game.foundObj.shown.slice(shown) }; }, CH);
s = await said();
check("the star chest: Arthur's map (the found-object ceremony) (INPUT)", r.found.includes('sw_map') && has(s, /rolled-up map/) && (await items()).includes('sw_map'), { r, s, items: await items() });
r = await ev(() => { P.wait(1.5); const n = P.grab(6); P.wait(0.5); return { n, owed: game.flags.sw_oweClover || 0, clovers: game.hero.clovers }; });
check('and a clover, picked up', r.owed === 0 && r.clovers === Math.min(9, cl0 + 1), { ...r, cl0 });
r = await ev(() => { const c0 = game.hero.coins; const n = P.rummage ? P.rummage('sw_vbarrel') : null; P.wait(1); P.grab(6); return { n, coins: game.hero.coins - c0 }; });
check('the barrel gives kashes (a hop by it, as any container)', r.coins > 0, r);

// ---------------------------------------------------------------- 7. back out
r = await ev(() => P.enter('sewer'));
w = await where();
check('out of the treasure room: back in the hall at the gate (INPUT)', w.room === 'sewer', { r, w });
r = await ev(() => P.exitTo('sewer-out'));
w = await where();
r = await ev(() => { P.wait(0.5); return { ...game.story.sewers.H }; });
check('across the hall and up the well-house ladder: back on Citadel beside the grate, put back behind him (INPUT)', w.room === 'citadel' && Math.hypot(w.pos[0] - HATCH.x, w.pos[2] - HATCH.z) < 3 && r.open === false, { w, open: r.open });
await view('s5-back');

// ---------------------------------------------------------------- 8. Arthur
const arthur = await ev(() => { const n = P.npc('arthur'); return n ? { present: !!n.present, room: P.sceneOf(n.pos.x, n.pos.z) } : null; });
if (arthur?.present) {
  r = await ev(() => P.talk('arthur')); s = await said();
  check('home: Arthur asked about the map ("Lulu held the torch"); the map goes back to him (INPUT)', has(s, /Lulu held the torch/) && (await flags()).sw_arthur === true && !(await items()).includes('sw_map'), { r, s });
} else check('Arthur is somewhere to be asked (chapter 1)', false, arthur);

// ---------------------------------------------------------------- 9. Save → Continue; an old save
const before = await flags();
await ev(() => { P.settle(); game.save(false); });
await boot('continue');
r = await ev(() => ({ f: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('sw_'))), open: game.story.sewers.H.open, items: game.story.items().map((i) => i.id) }));
check('Save → Continue: the story kept (the grate shut, as he left it)', JSON.stringify(r.f) === JSON.stringify(before) && !r.open && !r.items.includes('sw_map'), { r, before });
await said();
r = await ev((H) => { const u = P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }); P.go(H.x + 1.4, H.z + 0.6, { tol: 0.3 }); const e = P.enter('sewer'); return { u: u.r, e: e.r, room: game.room?.id, gate: game.rooms.sewer?.hall.gateOpen }; }, HATCH);
s = await said();
check('lifted again without a word; below, the gate still up (INPUT)', r.room === 'sewer' && r.gate && !has(s, /knocks down there/), { r, s });
await ev(() => { P.settle(); for (const k of Object.keys(game.flags)) if (k.startsWith('sw_')) delete game.flags[k]; P.exitTo('sewer-out'); P.settle(); game.save(false); });
await boot('continue');
r = await ev(() => ({ room: game.room?.id ?? 'citadel', open: game.story.sewers.H.open, doors: game.story.doors().some((d) => d.room === 'sewer'), chapter: game.flags.chapterKey, state: game.state }));
check('an old save (no sw_ flags): it loads, the grate shut, the chapter as it was', r.state === 'play' && !r.open && !r.doors && r.chapter === 'well', r);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
