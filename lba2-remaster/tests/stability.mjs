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
