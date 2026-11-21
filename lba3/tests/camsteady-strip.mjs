// CAM-STEADY: a 4-frame strip of the play camera on two of camsteady's routes, for the eye (not judged here): out of
// Twinsen's house door (the first frame out, then 0.7 s, 1.5 s and 3 s on: he stands 2 s and walks away) and down the
// west street (four moments of the walk), under the Follow camera at the default distance, Classic controls.
// SHOTS=<dir> (default captures/cam-steady); TAG=<name> prefixes the files (before / after). Prints the view's tilt and
// the camera's height at each frame. Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const { check, done } = checker();
const SHOTS = process.env.SHOTS || 'captures/cam-steady', TAG = process.env.TAG || 'run', DIST = process.env.DIST || 'medium';
fs.mkdirSync(SHOTS, { recursive: true });
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.evaluate((dist) => {
  const G = game, rig = G.camRig, h = G.hero, I = G.input;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true }); h.hasBall = true;
  G.settings.camera = 'follow'; rig.setMode('follow'); G.settings.camDist = dist; G.applySettings();
  window.S = {
    place(x, z, a) { G.exitRoom({ x, z, a }, true, true); G.step(0.3); h.angle = a; h.vel.set(0, 0); h.resetMotion?.(); rig.snap(); G.step(1.0); },
    pose() { const c = G.camera, L = rig.look, f = [L.x - c.position.x, L.y - c.position.y, L.z - c.position.z], n = Math.hypot(...f); return { t: +G.time.toFixed(2), room: G.room?.id ?? 'citadel', tilt: +(-Math.asin(f[1] / n) * 57.3).toFixed(1), camY: +c.position.y.toFixed(2), arm: +rig.dist.toFixed(2), hero: [h.pos.x, h.pos.z].map((v) => +v.toFixed(1)) }; },
  };
}, DIST);
const shot = async (name) => {
  await page.evaluate(() => game.renderer.render());
  const p = path.join(SHOTS, `${TAG}-${name}.jpg`);
  await page.screenshot({ path: p, type: 'jpeg', quality: 80, timeout: 240000 });
  const pose = await page.evaluate(() => S.pose());
  console.log('FRAME', p, JSON.stringify(pose));
  return pose;
};
// out of the house door
await page.evaluate(() => {
  const G = game, d = G.story.doors().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4) || G.story.townDoors?.().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4);
  window.D = d; S.place(d.x + 2.5, d.z, -Math.PI / 2); P.through(d.x, d.z); G.step(1.0);
  const e = G.room?.exits?.find((x) => !x.room) || G.room?.exits?.[0]; P.through(e.x, e.z);
  // (P.through returns once the scene has changed: step on until he stands in Citadel in play)
  for (let i = 0; i < 120 && (G.state !== 'play' || G.trans || G.room); i++) G.step(1 / 60);
});
const door = [await shot('door-0')];
await page.evaluate(() => game.step(0.7)); door.push(await shot('door-1'));
await page.evaluate(() => game.step(0.8)); door.push(await shot('door-2'));
await page.evaluate(() => { P.go(D.x + 6, D.z - 1, { tol: 0.8, maxT: 1.5, fight: false }); P.release(); }); door.push(await shot('door-3'));
check('door strip: four frames in Citadel', door.every((f) => f.room === 'citadel'), door);
// the west street (camsteady's "street and square", its first legs)
await page.evaluate(() => { S.place(-38, 4, Math.PI); });
const st = [await shot('street-0')];
for (const [i, [x, z]] of [[-42, -4], [-50, -6], [-58, -6]].entries()) {
  await page.evaluate(([x, z]) => { P.go(x, z, { tol: 0.8, maxT: 20, fight: false }); }, [x, z]);
  st.push(await shot('street-' + (i + 1)));
}
await page.evaluate(() => P.release());
check('street strip: four frames', st.length === 4, st);
await browser.close();
process.exit(done() ? 1 : 0);
