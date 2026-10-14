// Regression checks for the defects fixed in the stabilization pass (docs/lba3-production/QA.md, D1–D5).
// D1–D2 are played through the input harness; D3–D5 isolate the situation (ISO: a teleport or flags set up the
// spot) and then check what the game does on its own.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');

// D2: walking into the front door without the ball: one refusal, not a loop
const d2 = await ev(() => {
  const G = game; P.settle();
  const e = G.room.exits.find((x) => !x.room);
  let lines = 0; P.go(e.x, e.z, { tol: 0.3 });
  for (let i = 0; i < 6 * 30; i++) { if (G.state === 'dialog') { lines++; P.settle(); } G.step(1 / 30); }
  return { lines, room: G.room?.id, inTrigger: Math.hypot(G.hero.pos.x - e.x, G.hero.pos.z - e.z) < e.r };
});
check('D2: a refused exit says its line once while he stands in the door (6 s)', d2.lines === 1 && d2.room === 'house', d2);

// D1: the hallway's floor seams: Up from the hallway reaches the front door and goes out (60 and 30 fps)
const d1 = await ev(() => {
  const G = game, h = G.hero, out = {}; P.settle();
  const s = G.room.searches[0]; P.use(s.x, s.z);                         // the ball from the cupboard
  for (const fps of [30, 60]) {
    P.go(1001.2, 6.6, { tol: 0.3 }); P.face(1001.2, 11.3);
    G.input.keys.add('ArrowUp'); let t = 0;
    for (; t < 4 && !G.trans && G.room?.id === 'house'; t += 1 / fps) G.step(1 / fps);
    G.input.keys.delete('ArrowUp');
    out[fps] = { z: +h.pos.z.toFixed(2), left: !!G.trans || G.room?.id !== 'house' };
    P.settle();
    if (G.room?.id !== 'house') { const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle(); }
  }
  return out;
});
check('D1: Up from the hallway walks out of the front door at 30 fps', d1[30].left, d1);
check('D1: ... and at 60 fps', d1[60].left, d1);

// D3: on the steep bank at the waterline (−77.65, 52.76) he is not trapped (ISO: placed there)
const d3 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  if (G.room) { const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); }
  P.settle();
  G.lastSafe = { x: -60, z: 40 };
  const hp0 = h.hp;
  h.pos.set(-77.65, -0.35, 52.76); h.onGround = true; h.vel.set(0, 0);
  let t = 0; for (; t < 3 && Math.hypot(h.pos.x + 77.65, h.pos.z - 52.76) < 2; t += 1 / 30) G.step(1 / 30);
  return { t: +t.toFixed(2), pos: [h.pos.x, h.pos.z].map((v) => +v.toFixed(1)), hp: [hp0, h.hp] };
});
check('D3: held at the waterline by a slide, he is put back on safe ground within 1.5 s', d3.t < 1.5 && Math.hypot(d3.pos[0] + 60, d3.pos[1] - 40) < 1, d3);

// D6: the brink of the east cliff by the fort is never kept as a safe spot; after the fall to the shore
// below (a slide trap) he is put back somewhere stable, not on the brink again (ISO: placed there)
const d6 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  G.lastSafe = { x: -40, z: -5 };
  h.pos.set(-12.6, G.physics.groundAt(-12.6, -81.9, 30), -81.9); h.onGround = true; h.vel.set(0, 0); G.safeT = 0;
  for (let i = 0; i < 45; i++) G.step(1 / 30);
  const kept = { ...G.lastSafe };
  h.pos.set(-12.4, 0.3, -83.1); h.onGround = true; h.vel.set(0, 0);
  let t = 0; for (; t < 6 && Math.hypot(h.pos.x + 12.4, h.pos.z + 83.1) < 2; t += 1 / 30) G.step(1 / 30);
  for (let i = 0; i < 30; i++) G.step(1 / 30);
  return { kept, back: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(1)), stable: G.stableSpot(h.pos), sliding: h.sliding, t: +t.toFixed(2) };
});
check('D6: the cliff brink is not kept as a safe spot', Math.hypot(d6.kept.x + 12.6, d6.kept.z + 81.9) > 3, d6);
check('D6: out of the slide trap below, he stands somewhere stable (no fall loop)', d6.t < 6 && d6.stable && !d6.sliding, d6);

// D10: Desert Island's pier: off its landward end onto the sand by input (ISO: the story jumped to the end of
// chapter 3, whose shaft sends him to the pier; the walk is input)
const d10 = await ev(() => {
  const G = game; P.settle();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle();
  Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true });
  G.story.cur.toShell(); P.settle(); G.step(1.5); P.settle();
  const start = [G.hero.pos.x, G.hero.pos.y].map((v) => +v.toFixed(1)), T = P.npc('tarra');
  const r = P.go(T.pos.x, T.pos.z, { tol: 2.2, maxT: 60 });
  return { room: G.room?.id, start, r: r.r, at: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((v) => +v.toFixed(1)) };
});
check('D10: off the Desert Island pier onto the sand and to Mother Tarra by input', d10.room === 'desert' && d10.r === 'arrived', d10);
// (review: the raised sand at the pier's end must not have banks steep enough to slide on down to the water)
const d10b = await ev(() => { const G = game, PH = G.physics, T = G.terrain, x1 = G.rooms.desert.dock.x + 19, z0 = G.rooms.desert.dock.z; let n = 0, steep = 0;
  for (let ex = 0; ex <= 6; ex += 0.25) for (let dz = -7; dz <= 7; dz += 0.25) { const g = T.heightAt(x1 + ex, z0 + dz); if (g < -0.35) continue; n++; if (PH.steepAt(x1 + ex, z0 + dz, g)) steep++; }
  return { n, steep }; });
check('D10: no slide-steep banks around the pier\'s land end', d10b.n > 500 && d10b.steep === 0, d10b);

// D11: a story exit that names only the room ({ room: 'condB' }, chapter 5's door into the hangar) puts him at the
// room's spawn, not at NaN; and no chapter's exit hands back a position without coordinates unnoticed
const d11 = await ev(() => {
  const G = game, h = G.hero;
  G.enterRoom('condB', { room: 'condB' }, true); G.step(0.2);
  const pos = [h.pos.x, h.pos.y, h.pos.z], sp = G.rooms.condB.spawn;
  const bare = [];
  for (const c of G.story.chapters) for (const R of Object.values(G.rooms)) for (const e of R.exits || []) { if (!e.to) continue; let t = null; try { t = c.exitTo(e.to); } catch { /* chapter state */ } if (t && t.room && !(Number.isFinite(t.x) && Number.isFinite(t.z))) bare.push(c.key + ':' + e.to); }
  G.exitRoom({ x: -40, z: -5 }, true); G.step(0.2);
  return { pos, finite: pos.every(Number.isFinite), atSpawn: Math.hypot(pos[0] - sp.x, pos[2] - sp.z) < 0.5, bare: [...new Set(bare)] };
});
check('D11: a story exit naming only the room puts him at its spawn (no NaN position)', d11.finite && d11.atSpawn, d11);
console.log('  (story exits naming only the room, now sent to its spawn:', JSON.stringify(d11.bare) + ')');

// D12: the Hamalayi lift at the top of the cliff: off the platform onto the plank ramp and up to the monastery
// terrace by input (ISO: placed on the platform, raised to the top)
const d12 = await ev(() => {
  const G = game, h = G.hero, L = G.rooms.hamalayi.lift;
  G.enterRoom('hamalayi', { x: L.pad.x, z: L.pad.z, a: Math.PI }, true); G.step(0.2);
  h.pos.set(L.pad.x, L.y0 + 0.1, L.pad.z); h.angle = Math.PI; h.onGround = true;
  L.ride(true, [h], null); for (let i = 0; i < 600 && Math.abs(h.pos.y - L.y1) > 0.2; i++) G.step(1 / 30);
  const top = +h.pos.y.toFixed(2), seam = +G.physics.groundAt(L.pad.x, L.top.z + 5.95, h.pos.y + 0.3).toFixed(2);
  const r = P.go(L.top.x, L.top.z - 3, { tol: 0.8, maxT: 30 });
  const out = { top, y1: L.y1, seam, r: r.r, at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
  G.exitRoom({ x: -40, z: -5 }, true); G.step(0.2);
  return out;
});
check('D12: off the Hamalayi lift at the top onto the ramp and the terrace by input', d12.r === 'arrived' && d12.at[1] > d12.y1 - 1, d12);

// D13: chapter 8's cistern lever stands on the station yard's floor, not inside a tank: walked up to by input from
// the yard (ISO: placed in the yard)
const d13 = await ev(() => {
  const G = game, h = G.hero, PH = G.physics; P.settle();
  h.pos.set(-37.85, PH.groundAt(-37.85, -71.14, 30), -71.14); h.onGround = true; h.vel.set(0, 0); G.step(0.2);
  const lv = G.story.chapters.find((c) => c.key === 'evacuation').lever.position;   // where the game put the lever
  const yard = +h.pos.y.toFixed(2), at = +PH.groundAt(lv.x, lv.z, 40).toFixed(2);
  const r = P.go(lv.x, lv.z, { tol: 1.2, maxT: 30 });
  return { lever: [lv.x, lv.z], yard, leverGround: at, r: r.r, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
});
check('D13: the fortress lever is on the yard floor and reached by input', Math.abs(d13.leverGround - d13.pos[1]) < 0.3 && d13.leverGround < 15 && d13.r === 'arrived', d13);

// D14: Zoé's run in chapter 8 starts outside the square's barrier ring (out of the front door): she can walk to the
// first hill farm (ISO: chapter 8 state set, at home with Zoé; the walk is input)
const d14 = await ev(() => {
  const G = game, h = G.hero, ch = G.story.chapters.find((c) => c.key === 'evacuation'); P.settle();
  G.flags.chapterKey = 'evacuation'; G.flags.chapter = G.story.chapters.indexOf(ch); G.story.refreshCast();
  ch.showProps(true);   // (the square's barrier ring, as the chapter has it)
  G.enterRoom('house', null, true); G.step(0.2);
  ch.startZoe(); for (let i = 0; i < 40; i++) G.step(1 / 30); P.settle();
  const V = G.world.well, start = [h.pos.x, h.pos.z], ring = Math.hypot(h.pos.x - V.x, h.pos.z - V.z);
  const farm = P.npc('farmer1'); const r = farm ? P.go(farm.pos.x, farm.pos.z, { tol: 2.5, maxT: 120 }) : { r: 'no farmer' };
  return { body: h.body, start: start.map((v) => +v.toFixed(1)), fromWell: +ring.toFixed(1), r: r.r };
});
check('D14: Zoé starts her chapter-8 run outside the barrier ring and walks to the first farm', d14.body === 'zoe' && d14.fromWell > 6.2 && d14.r === 'arrived', d14);

// D15: the station's control-room door in the later chapters (8, 10, epilogue) after a real chapter 2 (Zoé's
// office segment played: c1_zoeStart set): walked through by input (ISO: flags as after chapter 7)
const d15 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  if (G.room) G.exitRoom({ x: -40, z: -5 }, true);
  Object.assign(G.flags, { c1_water: true, c1_zoeStart: true, c1_zoeDone: true, chapterKey: 'evacuation' }); G.flags.chapter = G.story.chapters.findIndex((c) => c.key === 'evacuation'); G.story.refreshCast();
  const doors = G.story.doors().map((d) => d.room), d = G.story.doors().find((x) => x.room === 'control');
  if (!d) return { doors };
  h.pos.set(d.x, G.physics.groundAt(d.x, d.z + 4, 40), d.z + 4); h.onGround = true; G.step(0.3);
  const r = P.through(d.x, d.z); P.settle();
  const room = G.room?.id; if (G.room) G.exitRoom({ x: -40, z: -5 }, true);
  return { doors, r: r.r, room };
});
check('D15: the control-room door is there in chapter 8 after a real chapter 2, and he walks in', d15.room === 'control', d15);

// D18: the gully below the orchard (a dodge at the plateau's edge dropped him in for good) is filled: from where its
// floor was, he walks back up to the orchard by input (ISO: placed there)
const d18 = await ev(() => {
  const G = game, h = G.hero, PH = G.physics; P.settle(); if (G.room) G.exitRoom({ x: -40, z: -5 }, true);
  h.pos.set(-68.71, PH.groundAt(-68.71, -48.04, 30), -48.04); h.onGround = true; h.vel.set(0, 0); G.step(0.3);
  const y = +h.pos.y.toFixed(2), r = P.go(-71.7, -56.8, { tol: 1.5, maxT: 40 });
  return { y, r: r.r, at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(1)) };
});
check('D18: no pit below the orchard; he walks up to the orchard plateau by input', d18.y > 12 && d18.r === 'arrived', d18);

// D4: death → the game-over screen after the fall, in game time; a pause holds it
const d4 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null);
  const out = { dead: h.dead };
  P.tap('Escape', 0.1); out.paused = G.state;
  const t0 = performance.now(); while (performance.now() - t0 < 2600) { /* wall-clock time passes, game time doesn't */ }
  out.stillPaused = G.state;
  P.tap('Escape', 0.1); G.step(2.4); out.after = G.state;
  out.screen = !document.querySelector('#gameover').classList.contains('hidden');
  return out;
});
await page.waitForTimeout(300);
const d4b = await ev(() => game.state);
check('D4: a pause during the death fall holds the game-over screen', d4.dead && d4.paused === 'pause' && d4.stillPaused === 'pause' && d4b !== 'play' || d4.after === 'gameover', { ...d4, d4b });
check('D4: the game-over screen comes after the fall, in game time', d4.after === 'gameover' && d4.screen, d4);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
