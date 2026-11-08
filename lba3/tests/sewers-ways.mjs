// SEWERS-1 (CONNECTIONS_AUDIT.md S-1…S-5, C-2): LBA2's ways into Citadel's old sewer hall, walked by INPUT from a new
// game in chapter 1 (the player harness; the only state set by hand is Twinsen's magic, emptied to see Bersimon fill it):
//   1. the tavern: Old Fenn warns about the hole in Luc's cellar; Luc points at Raph's guitar in Tralu's cave
//   (DOORS-LBA2, 8.11: every way where LBA2 has it: tools/testlab/WORLD_ART_REQUESTS.md "## DOORS-LBA2" (d))
//   2. S-2 the cellar: through the gap in the walkway's railing, a drop through the hall's ceiling onto the island's
//      platform (one way)
//   3. S-4 the street lift's lever: Fosse's padlock; Fosse the sewer man wants the knocking stopped; the valve eased, he
//      takes it off: up the north-east shaft to the lower town's street hatch, and back down it
//   4. S-3 the terrace lift's catch at the raised walkway's west end: drawn, the terrace hatch behind the school works
//      both ways (shut from above before)
//   5. S-1 the stair in the hall's south-west: up into Bersimon's tent through the trapdoor under his rug; Bersimon
//      sends Twinsen to look and gives the key; down the trapdoor again
//   6. S-5 the well-house's little blue door (locked, then the key): the globe's room; the globe fogged; the bleed cock
//      shut, it clears and shows the sky; Bersimon explains his magic top-up and fills it
//   7. C-2 Tralu's cave: the guitar case; the cache under the lantern (a clover, picked up)
//   8. Save → Continue keeps every door; an old save (no sw_ flags) loads with them all shut
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const SHOTS = process.env.SHOTS;
const view = async (n) => { if (SHOTS) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${n}.jpg`, type: 'jpeg', quality: 85, timeout: 300000 }); } };
const ready = () => page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 480000 });
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await ready();
  await ev(() => { game.testFreeze = true; });
  await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const flags = () => ev(() => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('sw_'))));
// where he is: the room, and how far from a named arrival spot of the hall (R.entries) or a house's door outside
const at = (entry) => ev((entry) => { const R = game.room, h = game.hero.pos, p = R?.entries?.[entry]; return { room: R?.id ?? 'citadel', y: +h.y.toFixed(2), d: p ? +Math.hypot(h.x - p.x, h.z - p.z).toFixed(2) : null, state: game.state }; }, entry);
const nearHatch = (id) => ev((id) => { const H = game.story.sewers.hatches.find((x) => x.id === id), h = game.hero.pos; return { room: game.room?.id ?? 'citadel', d: +Math.hypot(h.x - H.x, h.z - H.z).toFixed(2), y: +h.y.toFixed(2), state: game.state }; }, id);
// lift a hatch's lid and ride its lift down, as a player: to the lid, Lift (E), onto the deck, Go down (E)
const rideDown = (id) => ev((id) => {
  const H = game.story.sewers.hatches.find((x) => x.id === id);
  const u = P.use(H.x, H.z, { near: 1.1, kind: 'swhatch' }); P.settle();
  P.go(H.x + 0.1, H.z + 0.05, { tol: 0.2 }); P.wait(0.2);
  const t = P.target(); P.tap('KeyE', 0.02); let k = 0; while (game.state !== 'cutscene' && k++ < 240) game.step(1 / 60);
  P.settle(); return { u: u.r || u, t: t?.kind, room: game.room?.id ?? 'citadel' };
}, id);
const exitsHere = () => ev(() => game.room.exits.map((x) => x.to || x.room));
// talk to someone until a line matching re is heard (a resident's lines come in turn), at most n times
const talkFor = async (id, re, n = 7) => { let all = []; for (let i = 0; i < n; i++) { await ev((id) => P.talk(id), id); const s = await said(); all = all.concat(s); if (has(s, re)) return { ok: true, i, all }; } return { ok: false, all }; };

await boot('new');
await said();
await ev(() => { const s = game.room.searches[0]; P.use(s.x, s.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); });
let w = await ev(() => ({ room: game.room?.id ?? 'citadel', chapter: game.flags.chapterKey }));
check('a new game: chapter 1, out of the house', w.room === 'citadel' && w.chapter === 'well', w);
let r = await ev(() => ({ doors: game.story.doors().filter((d) => d.room === 'sewer').length, hatches: game.story.sewers.hatches.map((h) => h.id).sort().join(), open: game.story.sewers.hatches.some((h) => h.open) }));
check('from the start: two hatches (the lower town\'s, the terrace\'s), both shut; no house door leads down', r.doors === 0 && r.hatches === 'street,terrace' && !r.open, r);

// ---------------------------------------------------------------- 1. the tavern
r = await ev(() => P.enter('tavern'));
let t = await talkFor('fenn', /hole in Luc's cellar/);
check('the tavern: Old Fenn warns about the hole in Luc\'s cellar (INPUT)', r.r === 'entered' && t.ok, { r, t: t.all.slice(-3) });
t = await talkFor('luc', /guitar in that cave/);
check('Luc: Raph left his guitar in the cave behind the depot (C-2\'s pointer)', t.ok, t.all.slice(-3));

// ---------------------------------------------------------------- 2. S-2 the cellar's drop
r = await ev(() => P.enter('tavcellar'));
check('down the arched door into the cellar (INPUT)', r.r === 'entered', r);
r = await ev(() => {
  const D = game.room.drop; P.go(D.edge.x, D.edge.z, { tol: 0.25 }); P.face(D.edge.x + 5, D.edge.z);
  const y0 = game.hero.pos.y; let k = 0;
  while (game.room?.id === 'tavcellar' && !game.story.sewers.falling && k++ < 60) P.holdFor(['ArrowUp'], 0.1);
  P.release(); P.settle();
  return { y0: +y0.toFixed(2), k };
});
w = await at('fall');
let s = await said();
check('S-2: through the gap in the railing he drops into the dark, and lands on the hall\'s island platform (INPUT)', r.y0 > 2 && w.room === 'sewer' && w.d < 0.8 && Math.abs(w.y - 1.15) < 0.1 && w.state === 'play' && has(s, /Fenn wasn't joking/) && (await flags()).sw_fell === true, { r, w, s });
check('one way: no exit from the hall back to the cellar', !(await exitsHere()).includes('tavcellar'));
await view('w1-fall');

// ---------------------------------------------------------------- 3. S-4 the street lift and Fosse
const H = await ev(() => { const h = game.rooms.sewer.hall; return { works: h.works, bolt: h.bolt, gdoor: h.gdoor, valve: h.valve }; });
r = await ev((H) => P.use(H.works.x, H.works.z, { near: 0.8, kind: 'swworks' }), H);
s = await said();
check('the street lift\'s foot in the north-east corner: its lever padlocked, no way up yet (INPUT)', has(s, /Padlocked/) && !(await exitsHere()).includes('sewer-out'), { r, s });
t = await talkFor('fosse', /pipe down my well-house/, 1);
check('Fosse, the sewer man: the project\'s knocking, the valve on the old winch (INPUT)', t.ok && has(t.all, /padlock off the lift/) && (await flags()).sw_fosse === true, t.all);
r = await ev((H) => P.use(H.valve.x, H.valve.z, { near: 0.9, kind: 'swvalve' }), H);
s = await said();
check('the valve eased (INPUT)', (await flags()).sw_valve === true && has(s, /winch turns again/), s);
t = await talkFor('fosse', /quiet day/, 1);
await ev(() => P.wait(1.2));
r = await ev(() => ({ open: game.rooms.sewer.hall.doorOpen('works'), exits: game.room.exits.map((x) => x.to || x.room) }));
check('Fosse after: the quiet, and his padlock off the lift (INPUT)', t.ok && (await flags()).sw_works === true && r.open && r.exits.includes('sewer-out'), { t: t.all, r });
r = await ev(() => P.exitTo('sewer-out'));
await ev(() => P.settle());
w = await nearHatch('street');
check('S-4: up the north-east shaft: on the street hatch in the lower town (INPUT)', w.room === 'citadel' && w.d < 0.3 && w.y < 3 && w.state === 'play', { r, w });
r = await rideDown('street');
w = await at('street');
check('and back down its lift: in the hall at the lift\'s foot (INPUT)', r.t === 'swdown' && w.room === 'sewer' && w.d < 0.9, { r, w });

// ---------------------------------------------------------------- 4. S-3 the terrace lift's catch
r = await ev((H) => P.use(H.bolt.x, H.bolt.z, { near: 0.7, kind: 'swbolt' }), H);
s = await said();
await ev(() => P.wait(1.2));
r = { r, open: await ev(() => game.rooms.sewer.hall.doorOpen('bolt')), exits: await exitsHere() };
check('S-3: up on the raised walkway\'s west end, the terrace lift\'s catch drawn: its deck leads up (INPUT)', (await flags()).sw_bolt === true && has(s, /terrace behind the school/) && r.open && r.exits.includes('sewer-stoneup'), { r, s });
r = await ev(() => P.exitTo('sewer-stoneup'));
await ev(() => P.settle());
w = await nearHatch('terrace');
check('up the north-west shaft: on the terrace hatch behind the school (INPUT)', w.room === 'citadel' && w.d < 0.3 && w.y > 9 && w.state === 'play', { r, w });
r = await rideDown('terrace');
w = await at('terrace');
check('and back down by its lift: on the raised walkway at its foot (INPUT)', r.t === 'swdown' && w.room === 'sewer' && w.d < 0.9 && w.y > 1.4, { r, w });

// ---------------------------------------------------------------- 5. the little blue door (locked), S-1 the tent
r = await ev((H) => P.use(H.gdoor.x, H.gdoor.z, { near: 0.8, kind: 'swgdoor' }), H);
s = await said();
check('the well-house\'s little blue door: locked, a brass star on it (INPUT)', has(s, /brass star/) && !(await exitsHere()).includes('sewerglobe') && !(await flags()).sw_gdoor, s);
r = await ev(() => P.enter('wtent'));
w = await at('sewer');
r = { r, w, f: (await flags()).sw_trap, exits: await exitsHere() };
check('S-1: up the stair in the hall\'s south-west, through the trapdoor under the rug into Bersimon\'s tent (INPUT)', r.w.room === 'wtent' && r.w.d < 1.0 && r.f === true && r.exits.includes('sewer'), r);
await ev(() => { game.hero.mp = 0; });
t = await talkFor('bersimon', /Warm air/, 3);
r = await ev(() => ({ mp: game.hero.mp, max: game.hero.mpMax, items: game.story.items().map((i) => i.id) }));
check('Bersimon: warm air rising under the town, his globe down there; the key (INPUT)', t.ok && (await flags()).sw_ber === true && r.items.includes('sw_key') && r.mp === r.max, { t: t.all, r });
r = await ev(() => P.enter('sewer'));
w = await at('wtent');
r = { r, loc: await ev(() => [+(game.hero.pos.x - game.room.center.x).toFixed(2), +(game.hero.pos.z - game.room.center.z).toFixed(2)]) };
check('down the trapdoor: in the hall\'s south-west, by the west wall at z ≈ 10 (INPUT)', w.room === 'sewer' && w.d < 1.0 && r.loc[0] < -11.6 && Math.abs(r.loc[1] - 10) < 1, { r, w });

// ---------------------------------------------------------------- 6. S-5 the globe
r = await ev((H) => P.use(H.gdoor.x, H.gdoor.z, { near: 0.8, kind: 'swgdoor' }), H);
s = await said();
await ev(() => P.wait(1.2));
r = { r, items: await ev(() => game.story.items().map((i) => i.id)), exits: await exitsHere() };
check('the key unlocks the little blue door (INPUT)', has(s, /key fits/) && (await flags()).sw_gdoor === true && !r.items.includes('sw_key') && r.exits.includes('sewerglobe'), { r, s });
r = await ev(() => P.enter('sewerglobe'));
check('through it: the globe\'s room (INPUT)', r.r === 'entered', r);
const G = await ev(() => game.rooms.sewerglobe.globe);
await ev((G) => P.use(G.globe.x, G.globe.z, { near: 0.9, kind: 'swglobe' }), G);
s = await said();
check('the globe: fogged up by warm air from the pipe (INPUT)', has(s, /fogged up/) && !G.clear, s);
await ev((G) => P.use(G.cock.x, G.cock.z, { near: 0.8, kind: 'swcock' }), G);
s = await said();
await ev(() => P.wait(3));
r = await ev(() => ({ clear: game.rooms.sewerglobe.globe.clear }));
check('the bleed cock shut: the globe clears and shows the sky over Citadel (INPUT)', (await flags()).sw_globe === true && r.clear && has(s, /over Citadel/) && has(s, /reads the sky/), { r, s });
await view('w2-globe');
await ev(() => P.enter('sewer'));
r = await ev(() => P.enter('wtent'));
await ev(() => { game.hero.mp = 0; });
t = await talkFor('bersimon', /jar I dip into/, 2);
r = await ev(() => ({ mp: game.hero.mp, max: game.hero.mpMax }));
check('Bersimon: the globe is where his magic for Twinsen comes from; he tops it up (INPUT)', t.ok && (await flags()).sw_berGlobe === true && r.mp === r.max, { t: t.all, r });

// ---------------------------------------------------------------- 7. C-2 Tralu's cave
r = await ev(() => { P.exitTo('wtent-out'); return P.enter('tralucave'); });
check('out of the tent onto the plateau, into Tralu\'s cave (INPUT)', r.r === 'entered', r);
const C = await ev(() => game.room.cache);
await ev((C) => P.use(C.case.x, C.case.z, { near: 0.8, kind: 'swcase' }), C);
s = await said();
check('Raph\'s guitar case (INPUT)', has(s, /RAPH/), s);
const cl0 = await ev(() => game.hero.clovers);
await ev((C) => P.use(C.crate.x, C.crate.z, { near: 0.8, kind: 'swcache' }), C);
s = await said();
r = await ev(() => { P.wait(1.5); P.grab(6); P.wait(0.5); return { owed: game.flags.sw_oweClover2 || 0, clovers: game.hero.clovers }; });
check('the cache under the lantern: a clover, picked up (INPUT)', has(s, /clover/) && (await flags()).sw_cache === true && r.owed === 0 && r.clovers === Math.min(9, cl0 + 1), { r, cl0, s });

// ---------------------------------------------------------------- 8. Save → Continue; an old save
const before = await flags();
await ev(() => { P.exitTo('tralucave-out'); P.settle(); game.save(false); });
await boot('continue');
r = await ev(() => ({ f: Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('sw_'))), open: game.story.sewers.hatches.map((h) => h.open) }));
check('Save → Continue: the story kept; both hatches shut, as a loaded game finds them', JSON.stringify(r.f) === JSON.stringify(before) && r.open.every((o) => !o), { r, before });
r = await ev(() => P.enter('wtent'));
r = { r, exits: await exitsHere() };
check('after the load: the trapdoor in the tent is still open (INPUT)', r.r.r === 'entered' && r.exits.includes('sewer'), r);
r = await ev(() => P.enter('sewer'));
r = await ev(() => { const h = game.rooms.sewer.hall; return { room: game.room?.id, bolt: h.doorOpen('bolt'), works: h.doorOpen('works'), globe: h.doorOpen('globe'), exits: game.room.exits.map((x) => x.to || x.room) }; });
check('and below: the terrace lift\'s catch, Fosse\'s padlock and the blue door as left (INPUT)', r.room === 'sewer' && r.bolt && r.works && r.globe && ['sewer-stoneup', 'sewer-out', 'sewerglobe', 'wtent'].every((x) => r.exits.includes(x)), r);
await ev(() => { P.exitTo('sewer-out'); P.settle(); for (const k of Object.keys(game.flags)) if (k.startsWith('sw_')) delete game.flags[k]; game.save(false); });
await boot('continue');
r = await ev(() => ({ room: game.room?.id ?? 'citadel', state: game.state, chapter: game.flags.chapterKey, doors: game.story.doors().filter((d) => d.room === 'sewer').length, items: game.story.items().map((i) => i.id) }));
check('an old save (no sw_ flags) loads: on the street, no door leads down, nothing owed', r.state === 'play' && r.chapter === 'well' && r.doors === 0 && !r.items.includes('sw_key'), r);
r = await ev(() => { const H = game.story.sewers.hatches.find((x) => x.id === 'terrace'); game.exitRoom({ x: H.x + 2.2, z: H.z, a: -Math.PI / 2 }, true, true); P.settle(); return P.use(H.x, H.z, { near: 1.2 }); });
s = await said();
check('the terrace hatch shut from above again (its catch not drawn) (INPUT)', has(s, /holds it from below/), { r, s });
r = await ev(() => { const H = game.story.sewers.hatches.find((x) => x.id === 'street'); game.exitRoom({ x: H.x - 2.2, z: H.z, a: Math.PI / 2 }, true, true); P.settle(); return true; });
r = await rideDown('street');
r = { r, ...(await ev(() => { const h = game.rooms.sewer.hall; return { room: game.room?.id, bolt: h.doorOpen('bolt'), works: h.doorOpen('works'), globe: h.doorOpen('globe'), exits: game.room.exits.map((x) => x.to || x.room) }; })) };
check('in by the street hatch: the terrace catch, the padlock and the blue door shut (INPUT)', r.room === 'sewer' && !r.bolt && !r.works && !r.globe && !['sewer-stoneup', 'sewer-out', 'sewerglobe'].some((x) => r.exits.includes(x)), r);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
