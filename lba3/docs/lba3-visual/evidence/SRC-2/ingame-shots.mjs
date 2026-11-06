// SRC-2: Baldino in the game, from the normal cameras (1280x720, SwiftShader), the same frames before and after.
//   GAME_URL=http://127.0.0.1:8199/ node ingame-shots.mjs <outdir> [prefix] [workshop,council,network]   (default: all three)
// Scenes (each a full frame and a square crop round Baldino):
//   ws-room    chapter 3: Twinsen walks into the workshop (the play camera as he enters)
//   ws-near    in front of Baldino, facing him, the Talk prompt up
//   ws-talk    the first line of his chapter-3 explanation (the dialogue framing)
//   council    chapter 9: the council chamber after the hearing (Baldino at his place)
//   peg        chapter 10: after his briefing, Twinsen at the hop-pack's peg by the door (EQ-1)
//   peg-talk   E at the peg: Baldino explains the pack's limits
// Chapters are set by their flags, as tests/workshop.mjs, tests/chapter9.mjs and tests/jetpack.mjs do.
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const ONLY = process.argv[4], run = (k) => !ONLY || ONLY.split(',').includes(k);
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const snap = async (name) => {
  await ev(() => { game.step(1 / 60); game.renderer.render(); });
  await page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 });
  const c = await ev(() => {
    const b = P.npc('baldino'), rig = b?.rig; if (!rig || !b.present) return null;
    const V = game.hero.pos.constructor, top = new V(), feet = new V();
    rig.j.head.getWorldPosition(top); top.y += 0.55; rig.root.getWorldPosition(feet);
    const mid = top.clone().lerp(feet, 0.5);
    [top, feet, mid].forEach((q) => q.project(game.camera));
    if (Math.abs(mid.x) > 1.2 || Math.abs(mid.y) > 1.2 || mid.z > 1) return null;
    const h = Math.max(200, Math.min(600, Math.abs(top.y - feet.y) * 360 * 1.6));
    return { x: Math.round((mid.x + 1) / 2 * 1280 - h / 2), y: Math.round((1 - mid.y) / 2 * 720 - h / 2), w: Math.round(h) };
  });
  if (c) {
    c.x = Math.max(0, Math.min(1280 - c.w, c.x)); c.y = Math.max(0, Math.min(720 - c.w, c.y));
    await page.screenshot({ path: path.join(OUT, `${PRE}-${name}-crop.png`), clip: { x: c.x, y: c.y, width: c.w, height: c.w }, timeout: 180000 });
  }
  console.log('shot', name, JSON.stringify(await ev(() => ({ room: game.room?.id ?? 'out', state: game.state, prompt: document.querySelector('#prompt')?.textContent || '' }))));
};
const boot = async () => { await open(page, '?nocine'); await menu(page, 'new'); await ev(() => P.settle()); };
// stand d metres in front of Baldino, facing him
const front = (d) => ev((d) => { const b = P.npc('baldino'), h = game.hero;
  const x = b.pos.x + Math.sin(b.angle) * d, z = b.pos.z + Math.cos(b.angle) * d;
  P.go(x, z, { tol: 0.3, maxT: 20 }); P.face(b.pos.x, b.pos.z); for (let i = 0; i < 40; i++) game.step(1 / 30);
  return { d: +Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z).toFixed(2), target: P.target()?.id ?? P.target()?.kind ?? null }; }, d);

// ---- chapter 3: the workshop
if (run('workshop')) {
await boot();
await ev(() => { Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await ev(() => { P.enter('workshop'); for (let i = 0; i < 20; i++) game.step(1 / 30); });
await snap('ws-room');
console.log('near', JSON.stringify(await front(1.6)));
await snap('ws-near');
await ev(() => { P.tap('KeyE', 0.1); for (let i = 0; i < 24; i++) game.step(1 / 30); });
await snap('ws-talk');
await ev(() => P.settle());

}
// ---- chapter 9: the council chamber after the hearing
if (run('council')) {
await boot();
await ev(() => { const G = game; Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 7, chapterKey: 'evacuation', c1_water: true, c1_done: true, c2_shield: true, c2_mill_north: true, c8_started: true, c8_vesk: true, c8_done: true }); G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  Object.assign(G.flags, { c9_form: true, c9_clerk: true, c9_heard: true }); G.story.refreshCast(); P.settle(); });
const inC = await ev(() => { const G = game, Z = G.rooms.zeelich, h = G.hero;
  const tp = (x, z, y = null) => { h.pos.set(x, y == null ? G.physics.groundAt(x, z) : G.physics.groundAt(x, z, y + 1), z); h.onGround = true; h.vy = 0; h.vel?.set(0, 0); if (G.camRig.lba) G.camRig.lba.init = false; G.step(0.1); };
  const d = Z.councilDoor; tp(d.x, d.z + 1.5); G.step(1.2); tp(d.x, d.z); G.step(1.2); P.settle();   // (as tests/chapter9.mjs: into the council house)
  const e = G.room?.exits?.find((x) => x.to === 'up-council'); if (e) { tp(e.x, e.z, e.y ?? Math.max(h.pos.y, G.room.deckY ?? -1e9) + 0.5); G.step(1.6); P.settle(); }
  const b = P.npc('baldino'); for (let i = 0; i < 30; i++) G.step(1 / 30);
  return { room: G.room?.id, bal: b ? { present: b.present, d: +Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z).toFixed(1) } : null }; });
console.log('council room', JSON.stringify(inC));
await snap('council');
console.log('council near', JSON.stringify(await front(1.6)));
await snap('council-near');

}
// ---- chapter 10: the briefing, then the hop-pack's peg
if (run('network')) {
await boot();
await ev(() => { const G = game;
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
    c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); });
await ev(() => { const Pg = game.story.arsenal.jetPeg; P.go(Pg.x - 1.05, Pg.z, { tol: 0.3, maxT: 30, fight: false }); P.face(Pg.x, Pg.z); for (let i = 0; i < 30; i++) game.step(1 / 30); });
await snap('peg');
await ev(() => { P.tap('KeyE', 0.1); for (let i = 0; i < 40; i++) game.step(1 / 30); });
await snap('peg-talk');
await ev(() => P.settle());
console.log('front at ch10', JSON.stringify(await front(1.6)));
await snap('ch10-near');
}
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
