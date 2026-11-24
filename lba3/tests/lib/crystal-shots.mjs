// CRYSTALS-ONE-LOOK: the crystal places from the play camera (or a fixed camera where the play camera cannot frame
// them), with the frame's draw calls counted (main pass + shadow pass, and the calls drawn with a crystal material).
//   SERVE=1 node tests/lib/crystal-shots.mjs <outdir> [only,names]
// One browser, 1280x720, a new game (?nocine), each place entered directly (no story). Writes <outdir>/<name>.png and
// <outdir>/drawcalls.json. A capture tool: its verdict covers only that each place was drawn and the page's errors.
import { launch, open, menu, checker } from './boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const { check, done } = checker();
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[3]?.split(',');
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
// spec: room (entered at its spawn, or at local lx/lz from the room's centre, or world x/z), a (facing),
// cam {p:[x,y,z], l:[x,y,z], fov} local to the room's centre (a fixed camera), pick: an expression for x/z
const SHOTS = [
  ['01-well-spawn', { room: 'well' }],
  ['02-well-clusters', { room: 'well', lx: -7.2, lz: -2.6, a: -2.2 }],
  ['03-well-film-shot', { room: 'well', cam: { p: [7.85, 1.6, -0.8], l: [8.0, 1.95, -6.2], fov: 48 } }],   // (opening.js shot 10, its end pose)
  ['04-shaft', { room: 'c3shaft' }],
  ['05-deep', { room: 'c3deep' }],
  ['06-gallery', { room: 'c3gallery' }],
  ['07-gallery-giants', { room: 'c3gallery', cam: { p: [-4, 9, 9], l: [-9, 1, -5], fov: 50 } }],
  ['08-sendell', { room: 'c3sendell' }],
  ['09-core', { room: 'c3core' }],
  ['10-citadel-singing-crystal', { pick: 'sc-east', dz: 2.2, a: Math.PI }],
  ['11-citadel-crystal-close', { pick: 'sc-east', dz: 6, cam: { p: [1.3, 1.3, 1.8], l: [0, 0.7, 0], fov: 40 } }],
  ['12-bay-warm-stones', { stones: true, cam: { p: [1.4, 1.5, 1.6], l: [0, 0.2, 0], fov: 40 } }],
  ['13-desert-dig-crust', { room: 'desert', crack: true }],
  ['14-observatory-shrine', { room: 'obsv', cam: { p: [2, 2.6, 1.8], l: [2, 1.5, -2.6], fov: 45 } }],
  ['15-desert-crack-close', { room: 'desert', crack: true, atCrack: true, cam: { p: [2.2, 1.6, 2.2], l: [0, 0.6, 0], fov: 45 } }],
  ['16-sendell-lamp-close', { room: 'c3sendell', cam: { p: [-5.6, 2.9, 0.5], l: [-7.2, 2.6, 0], fov: 40 } }],
];
const stats = {};
for (const [name, s] of SHOTS) {
  if (ONLY && !ONLY.includes(name)) continue;
  try {
    const r = await ev((s) => {
      const G = game, h = G.hero;
      let wx = null, wz = null, base = null;
      if (s.pick) { const c = G.crystalSpots().find((c) => c.id === s.pick); G.exitRoom({ x: c.x, z: c.z + (s.dz || 0), a: s.a ?? 0 }, true, true); base = { x: c.x, y: c.y - 0.75, z: c.z }; }
      else if (s.stones) { const S = G.story.cur?.stones || G.story.chapters?.well?.stones; G.exitRoom({ x: S.x + 1.5, z: S.z + 1.5, a: -2.4 }, true, true); base = { x: S.x, y: S.top, z: S.z }; }
      else {
        G.enterRoom(s.room, null, true, true);
        const R = G.rooms[s.room];
        if (s.crack) { const c = R.dig.crack, d = s.atCrack ? 4.5 : 1.2; wx = c.x + d; wz = c.z + d; }
        const C = R.center || { x: R.spawn.x, z: R.spawn.z };
        if (s.lx != null) { wx = C.x + s.lx; wz = C.z + s.lz; }
        if (wx != null) G.enterRoom(s.room, { x: wx, z: wz, a: s.a ?? 0 }, true, true);
        base = s.atCrack ? { x: R.dig.crack.x, y: R.dig.crack.y, z: R.dig.crack.z } : { x: C.x, y: 0, z: C.z };
      }
      if (s.a != null) h.angle = s.a;
      G.camRig.lba && (G.camRig.lba.init = false);
      G.step(1.5);
      if (s.cam) {
        const cam = G.camera, b = base;
        G.camRig.update = () => {};   // (a fixed camera for this frame: the rig is not stepped again)
        cam.position.set(b.x + s.cam.p[0], b.y + s.cam.p[1], b.z + s.cam.p[2]);
        cam.fov = s.cam.fov; cam.updateProjectionMatrix();
        cam.lookAt(b.x + s.cam.l[0], b.y + s.cam.l[1], b.z + s.cam.l[2]);
        cam.updateMatrixWorld();
      }
      // count the frame's draws (as tests/drawcalls.mjs): main / shadow, and those with a crystal material
      const R3 = G.renderer.renderer, orig = R3.renderBufferDirect.bind(R3), n = { main: 0, shadow: 0, crystalMain: 0 };
      R3.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
        if (scene) n.main++; else n.shadow++;
        if (scene && mat.userData?.crystal) n.crystalMain++;
        return orig(cam, scene, geo, mat, obj, grp);
      };
      G.renderer.render();
      R3.renderBufferDirect = orig;
      return { room: G.room?.id || 'citadel', n };
    }, s);
    stats[name] = r;
    await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 180000 });
    // (the fixed camera's rig back for the next place)
    await ev(() => { delete game.camRig.update; });
    console.log(name, JSON.stringify(r));
    check('shot ' + name, true);
  } catch (e) { check('shot ' + name, false, e.message.slice(0, 300)); }
}
fs.writeFileSync(path.join(OUT, 'drawcalls.json'), JSON.stringify(stats, null, 1));
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
