// WA-14: Citadel's old sewers (src/game/sewers.js, story/sewers.js), walked by INPUT (the player harness; no teleport
// in the walk), from a new game in chapter 1:
//   1. out of the house, to the lower town's street hatch (DOORS-LBA2: LBA2's, railed, at (−28.5, 27.6)): looked at
//      (the knocking, Arthur's chalk), lifted
//   2. SEWER-LIFT: under it the lift's deck, flush with the street; on it, "Go down" (E): the deck goes down the shaft
//      with him planted on it (~1.5 s, the winch), then the flooded hall (by the lift's foot in the north-east corner)
//   3. the gate in the west wall is shut: walking at it gets nowhere
//   4. the project's valve on the old winch: eased, the knocking stops, the gate rises
//   5. across the hall (colonnade → north walkway → west stair → west walkway) and through the gate into the treasure room
//   6. the star chest: Arthur's map (the found-object ceremony), a clover (picked up); the barrel gives (a hop)
//   7. back out: the gate, the hall; the street lift's lever is padlocked (Fosse's) until Fosse, told the valve is
//      eased, takes it off; up the shaft: on the deck as it rises the last stretch, then free to walk off
//   8. home: Arthur is asked about the map (the item goes back to him)
//   9. Save → Continue keeps it all (the grate shut, as a loaded game finds it; the gate up, the chest open, no map);
//      lifted again without a word and ridden down; a load in the middle of the ride, and one during its fade, leave
//      nothing of it (he stands on the lane, plays on, rides again); death on the deck → Retry: the same; an old
//      save (no sw_ flags) continues with the grate shut and nothing else changed
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const SHOTS = process.env.SHOTS;
const view = async (n) => { if (SHOTS) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.jpg`, type: 'jpeg', quality: 85, timeout: 300000 }); } };
const ready = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 480000 });
};
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await ready();
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
// the lift as the game has it, and how he stands (on the lane: his height is the ground's there)
const lift = () => ev(() => {
  const S = game.story.sewers, H = S.H, h = game.hero;
  return { open: H.open, deck: +H.deckY.toFixed(2), ride: S.ride?.dir || null, state: game.state, room: game.room?.id ?? 'citadel', cut: !!game.cutscene, cam: !!game.camRig.override,
    off: +Math.hypot(h.pos.x - H.x, h.pos.z - H.z).toFixed(2), dy: +(h.pos.y - H.y).toFixed(2), onDeck: Math.abs(h.pos.y - H.deckTop()) < 0.02,
    ground: +(h.pos.y - game.physics.groundAt(h.pos.x, h.pos.z)).toFixed(2), sil: h.rig.silhouette ? h.rig.silhouette.visible : null };
});
// onto the deck and "Go down" (E), as a player: the prompt, then the key; returns once the ride has begun
const onDeck = (H) => ev((H) => { P.go(H.x + 0.12, H.z + 0.1, { tol: 0.15 }); P.wait(0.2); return { t: P.target(), prompt: document.querySelector('#prompt')?.textContent || '' }; }, H);
const pressDown = () => ev(() => {
  if (!window._snd) { window._snd = []; const sv = game.audio.play.bind(game.audio); game.audio.play = (k) => { window._snd.push(k); return sv(k); }; }
  window._snd.length = 0;
  P.tap('KeyE', 0.02); let k = 0; while (game.state !== 'cutscene' && k++ < 240) game.step(1 / 60);
  return { steps: k, state: game.state, snd: window._snd.slice() };
});

await boot('new');
await said();
// out of the house, as a player starts (the opening's search, then the door)
await ev(() => { const s = game.room.searches[0]; P.use(s.x, s.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); });
let w = await where();
check('a new game: chapter 1, out of the house on Citadel', w.room === 'citadel' && w.chapter === 'well', w);

// ---------------------------------------------------------------- 1. the grate
let r = await ev(() => ({ doors: game.story.doors().filter((d) => d.room === 'sewer' && !d.house).length, hatch: { x: game.story.sewers.H.x, z: game.story.sewers.H.z }, open: game.story.sewers.H.open }));
check('the grate is there, shut: no way down yet', r.doors === 0 && !r.open && Number.isFinite(r.hatch.x), r);
const HATCH = r.hatch;
r = await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
let s = await said();
check('the grate looked at: the knocking and Arthur\'s chalk; lifted (INPUT)', has(s, /knocks down there/) && has(s, /Arthur's writing/) && (await flags()).sw_hatch === true, { r, s });
await view('s1-grate');

// ---------------------------------------------------------------- 2. down on the lift
r = await onDeck(HATCH);
let L = await lift();
check('lifted: the lift\'s deck lies flush with the lane; standing on it, the prompt is "Go down" (no door to walk into)', L.open && L.deck === 0 && L.ground === 0 && L.off < 0.4 && r.t?.kind === 'swdown' && /Go down/.test(r.prompt) && !(await ev(() => game.story.doors().some((d) => d.room === 'sewer' && !d.house))), { r, L });
r = await pressDown();
check('E on the deck: he pulls the lever, the ride begins, the winch clanks (INPUT)', r.state === 'cutscene' && r.snd.includes('liftWinch'), r);
await ev(() => game.step(0.7));
L = await lift();
check('mid-ride: the deck down the shaft with him planted on it, in its middle; the camera follows', L.ride === 'down' && L.deck > 0.5 && L.deck < 1.6 && L.onDeck && L.off < 0.1 && L.dy < -0.4 && L.cam && L.sil !== true, L);
await view('s2-ride');
r = await ev(() => { const t0 = game.time; P.settle(); return { t: +(game.time - t0).toFixed(1) }; });
w = await where();
const hall0 = await ev(() => { const R = game.room, c = R.center, sp = R.spawn; return { built: game.regions.stateOf('sewer'), onFloor: game.hero.onGround, y: +game.hero.pos.y.toFixed(2), atSpawn: +Math.hypot(game.hero.pos.x - sp.x, game.hero.pos.z - sp.z).toFixed(2), local: [+(game.hero.pos.x - c.x).toFixed(1), +(game.hero.pos.z - c.z).toFixed(1)] }; });
L = await lift();
const NE = await ev(() => { const R = game.room, e = R.entries.street; return { d: +Math.hypot(game.hero.pos.x - e.x, game.hero.pos.z - e.z).toFixed(2), local: [+(e.x - R.center.x).toFixed(1), +(e.z - R.center.z).toFixed(1)] }; });
check('down the shaft: in the flooded hall, by the street lift\'s foot in the north-east corner (DOORS-LBA2 #2)', w.room === 'sewer' && hall0.onFloor && Math.abs(hall0.y) < 0.1 && hall0.atSpawn < 0.3 && NE.d < 0.3 && NE.local[0] > 9 && NE.local[1] < -8, { r, w, hall0, NE });
check('and the ride is over: play, the camera its own, the deck back at the top above', L.state === 'play' && !L.ride && !L.cut && !L.cam && L.deck === 0 && L.sil !== false, L);
await view('s2-hall');
// the knock: the valve thumps every few seconds while it is open
r = await ev(() => { let n = 0; const sv = game.audio.play.bind(game.audio); game.audio.play = (k) => { if (k === 'clunk') n++; return sv(k); }; P.wait(6); game.audio.play = sv; return n; });
check('the knocking: the valve thumps every few seconds', r >= 2, r);

// ---------------------------------------------------------------- 3. the gate is shut
const GATE = await ev(() => { const g = game.story.sewers; return { gate: game.rooms.sewer.hall.gate, valve: game.rooms.sewer.hall.valve }; });
r = await ev((G) => { P.go(G.gate.x + 1.6, G.gate.z, { tol: 0.3, maxT: 60 }); const out = P.go(G.gate.x - 0.6, G.gate.z, { tol: 0.3, maxT: 25 }); return { r: out.r, room: game.room?.id, z: +(game.hero.pos.z - G.gate.z).toFixed(2), x: +(game.hero.pos.x - G.gate.x).toFixed(2), local: [+(G.gate.x - game.room.center.x).toFixed(1), +(G.gate.z - game.room.center.z).toFixed(1)] }; }, GATE);
check('the gate in the west wall at mid-depth (DOORS-LBA2 #7) is shut: walking at it gets nowhere (INPUT)', r.room === 'sewer' && r.x > 0.3 && r.local[0] < -13 && Math.abs(r.local[1]) < 1, r);
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
// the street lift: Fosse's padlock on its lever; Fosse, told it's quiet, takes it off
const HL = await ev(() => game.rooms.sewer.hall);
r = await ev((H) => P.use(H.works.x, H.works.z, { near: 0.8, kind: 'swworks' }), HL);
s = await said();
check('the street lift\'s lever: padlocked, no way up yet (INPUT)', has(s, /Padlocked/) && !(await ev(() => game.room.exits.some((x) => x.to === 'sewer-out'))), { r, s });
r = await ev(() => P.talk('fosse')); s = await said();
await ev(() => P.wait(1.2));
check('Fosse: a quiet day; his padlock off the lift (INPUT)', has(s, /quiet day/) && (await flags()).sw_works === true && (await ev(() => game.room.exits.some((x) => x.to === 'sewer-out'))), { r, s });
// onto the lift's deck, by input; the scene changes; a moment later the deck is still rising
r = await ev(() => { const e = game.room.exits.find((x) => x.to === 'sewer-out'); const g = P.go(e.x, e.z, { tol: 0.25, stopOnTrans: true }); let k = 0; while (game.room && k++ < 600) game.step(1 / 60); game.step(0.2); return { g: g.r, k }; });
L = await lift();
check('up the north-east shaft: back on Citadel standing on the deck in the street hatch as it rises the last stretch (INPUT)', L.room === 'citadel' && L.ride === 'up' && L.deck > 0.1 && L.onDeck && L.off < 0.1 && L.state === 'cutscene', { r, L });
await view('s5-rise');
r = await ev(() => P.settle());
L = await lift();
check('at the top: play again, standing in the street, the lid still lifted, the deck flush', L.state === 'play' && !L.ride && !L.cut && L.open && L.deck === 0 && Math.abs(L.ground) < 0.02 && L.off < 0.1 && L.sil !== false, { r, L });
await view('s5-back');
r = await ev((H) => { const g = P.go(H.x - 2.4, H.z, { tol: 0.3 }); return { g: g.r, room: game.room?.id ?? 'citadel', d: +Math.hypot(game.hero.pos.x - H.x, game.hero.pos.z - H.z).toFixed(2), state: game.state }; }, HATCH);
check('and free to walk off it (INPUT)', r.g === 'arrived' && r.room === 'citadel' && r.d > 1.2 && r.state === 'play', r);

// ---------------------------------------------------------------- 8. Arthur
const arthur = await ev(() => { const n = P.npc('arthur'); return n ? { present: !!n.present, room: P.sceneOf(n.pos.x, n.pos.z) } : null; });
if (arthur?.present) {
  r = await ev(() => P.talk('arthur')); s = await said();
  check('home: Arthur asked about the map ("Lulu held the torch"); the map goes back to him (INPUT)', has(s, /Lulu held the torch/) && (await flags()).sw_arthur === true && !(await items()).includes('sw_map'), { r, s });
} else check('Arthur is somewhere to be asked (chapter 1)', false, arthur);

// ---------------------------------------------------------------- 9. Save → Continue; loads mid-ride; death; an old save
const before = await flags();
await ev(() => { P.settle(); game.save(false); });
await boot('continue');
r = await ev(() => ({ f: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('sw_'))), open: game.story.sewers.H.open, items: game.story.items().map((i) => i.id) }));
check('Save → Continue: the story kept (the grate shut, as a loaded game finds it)', JSON.stringify(r.f) === JSON.stringify(before) && !r.open && !r.items.includes('sw_map'), { r, before });
await said();
r = await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
const deck2 = await onDeck(HATCH);
const press2 = await pressDown();
r = await ev(() => { P.settle(); return { room: game.room?.id, gate: game.rooms.sewer?.hall.gateOpen }; });
s = await said();
check('lifted again without a word, ridden down; below, the gate still up (INPUT)', r.room === 'sewer' && r.gate && !has(s, /knocks down there/) && deck2.t?.kind === 'swdown' && press2.state === 'cutscene', { r, s, deck2, press2 });
// back up (the autosave is made on the lane, at the grate), then a load in the middle of a ride down
await ev(() => { P.exitTo('sewer-out'); P.settle(); });
L = await lift();
check('back up the north-east shaft onto the deck (INPUT)', L.room === 'citadel' && L.state === 'play' && L.open && L.off < 0.1, L);
await onDeck(HATCH);
await pressDown();
await ev(() => game.step(0.6));
const mid = await lift();
await ev(() => { game.startContinue(); game.step(0.3); });
L = await lift();
check('a load in the middle of the ride: nothing of it stays (play, on the lane, the camera its own, the grate shut)', mid.ride === 'down' && mid.deck > 0.2 && L.state === 'play' && !L.ride && !L.cut && !L.cam && !L.open && L.deck === 0 && Math.abs(L.ground) < 0.05 && L.room === 'citadel' && L.sil !== false, { mid, L });
// and one during the ride's fade to black
await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
await onDeck(HATCH);
await pressDown();
const fade = await ev(() => { game.step(1.6); return { trans: !!game.trans, state: game.state }; });
await ev(() => { game.startContinue(); P.settle(); });
L = await lift();
check('a load during the ride\'s fade: back on the lane at the save, playing (the scene change it began does nothing)', fade.trans && L.state === 'play' && L.room === 'citadel' && !L.ride && !L.cut && !L.cam && Math.abs(L.ground) < 0.05, { fade, L });
// it still works after all that
await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
await onDeck(HATCH);
r = await pressDown();
r = await ev(() => { P.settle(); return { room: game.room?.id, state: game.state }; });
check('and the lift still takes him down (no softlock) (INPUT)', r.room === 'sewer' && r.state === 'play', r);
await ev(() => { P.exitTo('sewer-out'); P.settle(); });
// death on the deck (the grate lifted) → Retry: the autosave, the grate shut, playing
const died = await ev(() => { const h = game.hero; h.clovers = 0; h.damage(999, null); for (let i = 0; i < 80 && game.state !== 'gameover'; i++) game.step(0.1); return game.state; });
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reloaded;
await ready();
await page.waitForFunction(() => window.game?.state === 'play', null, { timeout: 300000 }).catch(() => {});
await ev(() => { game.testFreeze = true; });
await page.addScriptTag({ path: HARNESS });
await ev(() => { game.step(0.2); P.settle(); });
L = await lift();
check('death on the deck → Retry: playing on the lane, the grate shut, no ride', died === 'gameover' && L.state === 'play' && L.room === 'citadel' && !L.ride && !L.open && Math.abs(L.ground) < 0.05, { died, L });
await ev((H) => P.use(H.x, H.z, { near: 1.0, kind: 'swhatch' }), HATCH);
await onDeck(HATCH);
await pressDown();
r = await ev(() => { P.settle(); return { room: game.room?.id, state: game.state }; });
check('and down again after the Retry (INPUT)', r.room === 'sewer' && r.state === 'play', r);
await ev(() => { P.settle(); for (const k of Object.keys(game.flags)) if (k.startsWith('sw_')) delete game.flags[k]; P.exitTo('sewer-out'); P.settle(); game.save(false); });
await boot('continue');
r = await ev(() => ({ room: game.room?.id ?? 'citadel', open: game.story.sewers.H.open, doors: game.story.doors().some((d) => d.room === 'sewer' && !d.house), chapter: game.flags.chapterKey, state: game.state, prompt: game.findInteractable()?.kind || null }));
check('an old save (no sw_ flags): it loads, the grate shut, the chapter as it was', r.state === 'play' && !r.open && !r.doors && r.chapter === 'well', r);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
