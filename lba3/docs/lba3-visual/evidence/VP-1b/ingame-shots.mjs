// VP-1b: Twinsen's hair in the game, from the normal play camera (1280x720, high quality, SwiftShader).
//   GAME_URL=http://127.0.0.1:8184/ node ingame-shots.mjs <outdir> [prefix]
// Shots (each a full frame and a 160 px crop round his head): the house — talking to Arthur (the dialogue frame) and
// walking toward the camera; outdoors on the grass by the village — idle, walking and running toward the camera, and
// walking away from it.
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const snap = async (name) => {
  await ev(() => game.renderer.render());
  await page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 });
  const c = await ev(() => { const h = game.hero, v = new h.pos.constructor(); h.rig.j.head.getWorldPosition(v); v.y += 0.12; v.project(game.camera);
    return { x: Math.round((v.x + 1) / 2 * 1280 - 80), y: Math.round((1 - v.y) / 2 * 720 - 80) }; });
  c.x = Math.max(0, Math.min(1280 - 160, c.x)); c.y = Math.max(0, Math.min(720 - 160, c.y));
  await page.screenshot({ path: path.join(OUT, `${PRE}-${name}-head.png`), clip: { ...c, width: 160, height: 160 }, timeout: 180000 });
  console.log('shot', name, JSON.stringify(await ev(() => ({ room: game.room?.id ?? 'citadel', anim: game.hero.rig.anim, spd: +(game.hero.speed || 0).toFixed(2), st: game.state }))));
};
// face the camera (ground direction from the hero to the camera), then walk toward it for `t` seconds
const towardCamera = (t, keys = ['ArrowUp']) => ev(([t, keys]) => { const h = game.hero, c = game.camera.position;
  h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); h.vel.set(0, 0); game.step(0.05);
  for (const k of keys) game.input.keys.add(k);
  for (let i = 0; i < Math.round(t * 30); i++) { h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); game.step(1 / 30); }
  for (const k of keys) game.input.keys.delete(k); h.rig.update(1e-4, h.speed); }, [t, keys]);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); P.settle(); });
// the house: talk to Arthur, the first exchange (the dialogue frame)
console.log('talk', JSON.stringify(await ev(() => { const n = P.npc('arthur'); if (!n) return 'no arthur'; P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); game.step(0.6); return game.state; })));
await snap('house-dialogue');
await ev(() => { for (let i = 0; i < 20 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.3); } P.settle(); });
// the house: walk toward the camera from the room's middle
await ev(() => { const h = game.hero, R = game.room; const e = R.exits.find((x) => !x.room) || R.exits[0]; P.go(e.x, e.z - 3, { tol: 1.2 }); P.settle(); });
await towardCamera(0.55);
await snap('house-walk-toward');
// outdoors: the grass by the village
await ev(() => { game.exitRoom({ x: -40.5, z: 60, a: 0 }, true, true); game.step(2); P.settle(); P.tap('F1'); });
await towardCamera(0.15);
await ev(() => { const h = game.hero, c = game.camera.position; for (let i = 0; i < 36; i++) { h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); game.step(1 / 30); } });
await snap('out-idle-facing');
await towardCamera(0.6);
await snap('out-walk-toward');
await ev(() => { P.settle(); game.exitRoom({ x: -40.5, z: 60, a: 0 }, true, true); game.step(1); P.tap('F2'); });
await towardCamera(0.6);
await snap('out-run-toward');
await ev(() => { P.settle(); P.tap('F1'); game.exitRoom({ x: -40.5, z: 56, a: 0 }, true, true); game.step(1); });
await ev(() => { const h = game.hero, c = game.camera.position; h.angle = Math.atan2(h.pos.x - c.x, h.pos.z - c.z); game.input.keys.add('ArrowUp'); for (let i = 0; i < 18; i++) game.step(1 / 30); game.input.keys.delete('ArrowUp'); h.rig.update(1e-4, h.speed); });
await snap('out-walk-away');
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
