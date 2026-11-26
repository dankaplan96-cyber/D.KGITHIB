// EXPANSION WAVE 1 (docs/lba-maturity/WAVE1.md): before/after pictures from the play camera of the places H-1 and H-2 add
// props to (the deep installation's two relay brackets, the galleries' three, the core's three junction boxes).
//   SERVE=1 TAG=after node tools/wave1-shots.mjs            → captures/wave1/after-*.png
//   SERVE=1 TAG=before BEFORE_CH3=<chapter3.js from before the wave> node tools/wave1-shots.mjs
// (before: the page is given the old chapter3.js, which never loads story/relays.js: the rooms as they were)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, menu, URL0 } from '../tests/lib/boot.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TAG = process.env.TAG || 'after', OUT = path.join(ROOT, 'captures/wave1');
fs.mkdirSync(OUT, { recursive: true });
const { browser, context, page } = await launch({ width: 1280, height: 720 });
if (TAG === 'before') {
  const src = fs.readFileSync(process.env.BEFORE_CH3, 'utf8');
  await context.route(new URL('src/game/story/chapter3.js', URL0).href, (r) => r.fulfill({ status: 200, body: src, headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } }));
}
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); });
await ev(() => { const G = game; Object.assign(G.flags, { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_mills: true, c2_signal: true });
  G.story.cur.toShell?.(); G.step(1.5); P.settle(); for (let i = 0; i < 14 && G.story.cur.key !== 'shell'; i++) { G.story.nextChapter(); G.step(0.5); P.settle(); }
  // (the halls as a player leaves them: cooled, the ladder down, the stones up; the core with its fight's flag, no scene)
  Object.assign(G.flags, { c3_diagram: true, c3_ladder: true, c3_cooled: true, sh_held: true, sh_knock: true, sh_reply: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true, c3_gallerySeen: true, c3_deepSeen: true, c3_fight: true });
  G.story.applyFlags(); P.settle(); });
// [name, room, at (relays on brackets, after), hero (room frame) x, z, y?, facing point x, z]
const VIEWS = [
  ['deep-entrance', 'c3deep', 'D1,D2', -7.6, 4.9, 0, -8.8, 3.5],
  ['deep-catwalk', 'c3deep', 'D1,D2', -1.2, -6.9, 3, -0.2, -6.2],
  ['gallery-start', 'c3gallery', 'G1,G3', -8.4, -2.0, 3, -9.8, -3.2],
  ['gallery-far', 'c3gallery', 'G1,G3', 8.6, 0.6, 3, 7.6, 2.6],
  ['gallery-arch', 'c3gallery', 'G1,G3', 9.2, -6.8, 3, 10.4, -8.6],
  ['core-light', 'c3core', '', 0, 0, null, 0, 0, 0],
  ['core-mains', 'c3core', '', 0, 0, null, 0, 0, 1],
  ['core-mills', 'c3core', '', 0, 0, null, 0, 0, 2],
];
for (const [name, room, at, x, z, y, fx, fz, box] of VIEWS) {
  const where = await ev(([room, at, x, z, y, fx, fz, box]) => {
    const G = game, h = G.hero, f = G.flags;
    if (at && G.story._rl) { f.dx_relay_v = 1; f.dx_relay_at = at; }
    G.enterRoom(room, null, true, true); P.settle();
    const R = G.rooms[room], o = R.group.position;
    let px = o.x + x, pz = o.z + z, ax = o.x + fx, az = o.z + fz;
    if (box != null) {   // (the core: 1.8 m in front of the box, toward its pylon's plate; before the wave, where it will stand)
      const F = [[5.93, 7.3], [4.72, 6.9], [3.64, 7.2]][box], bx = o.x + Math.sin(F[0]) * F[1], bz = o.z + Math.cos(F[0]) * F[1];
      const pl = G.story.cur.plates().find((q) => q.i === box), dx = pl.x - bx, dz = pl.z - bz, d = Math.hypot(dx, dz) || 1;
      px = bx + dx / d * 1.8; pz = bz + dz / d * 1.8; ax = bx; az = bz;
    }
    G.story._rl?.applyRooms?.(); G.story._fd?.applyRooms?.();
    h.pos.set(px, G.physics.groundAt(px, pz, (y ?? 0) + 1.5), pz); h.angle = Math.atan2(ax - px, az - pz); h.onGround = true; h.vy = 0;
    if (G.camRig.lba) G.camRig.lba.init = false;
    for (let i = 0; i < 40; i++) G.step(1 / 30);
    G.renderer.render(); return G.room?.id;
  }, [room, at, x, z, y, fx, fz, box]);
  const file = path.join(OUT, `${TAG}-${name}.png`);
  await page.screenshot({ path: file, timeout: 180000 });
  console.log('shot', where, file);
}
await browser.close();
