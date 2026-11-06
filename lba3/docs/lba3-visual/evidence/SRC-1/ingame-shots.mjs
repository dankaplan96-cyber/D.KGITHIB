// SRC-1: Zoé in the game, from the normal cameras (1280x720, SwiftShader). After VP-1b's ingame-shots.mjs.
//   GAME_URL=http://127.0.0.1:8187/ node ingame-shots.mjs <outdir> [prefix] [play]   (play: skip the opening)
// Shots (each a full frame and a crop round Zoé): the opening at four of her lines; then Zoé as the player (the body
// swap her playable parts use): walking toward the camera in the house; idle, walking toward the camera, running and
// walking away outdoors. (After the opening Zoé is not in the house — OPEN-2's business — so no shot of her there.)
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const snap = async (name, who = 'npc') => {
  await ev(() => game.renderer.render());
  await page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 });
  const c = await ev((who) => {
    const z = who === 'hero' ? game.hero : (game.story?.cur?.npc?.('zoe') || P.npc('zoe'));
    const rig = z?.rig; if (!rig) return null;
    // a square round her whole figure: from above the bun to her feet
    const top = new game.hero.pos.constructor(); rig.j.head.getWorldPosition(top); top.y += 0.45;
    const feet = top.clone(); feet.y = rig.root.getWorldPosition(feet.clone()).y;
    const mid = top.clone().lerp(feet, 0.5);
    [top, feet, mid].forEach((q) => q.project(game.camera));
    const h = Math.max(160, Math.min(560, Math.abs(top.y - feet.y) * 360 * 1.25));
    return { x: Math.round((mid.x + 1) / 2 * 1280 - h / 2), y: Math.round((1 - mid.y) / 2 * 720 - h / 2), w: Math.round(h) };
  }, who);
  if (c) {
    c.x = Math.max(0, Math.min(1280 - c.w, c.x)); c.y = Math.max(0, Math.min(720 - c.w, c.y));
    await page.screenshot({ path: path.join(OUT, `${PRE}-${name}-zoe.png`), clip: { x: c.x, y: c.y, width: c.w, height: c.w }, timeout: 180000 });
  }
  console.log('shot', name, JSON.stringify(await ev(() => ({ room: game.room?.id ?? 'citadel', state: game.state, cine: game.cine ? +game.cine.t.toFixed(1) : null }))));
};
const PLAY_ONLY = process.argv[4] === 'play';   // (skip the opening: only Zoé as the player)
// ---- the opening (with the cinematic): four of her lines
if (PLAY_ONLY) { await open(page, '?nocine'); await menu(page, 'new'); await ev(() => { const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); P.settle(); }); }
else {
await open(page, '');
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 240000 });
await ev(() => { game.testFreeze = true; });
const runTo = (t) => ev((t) => { for (let i = 0; i < 9000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);
await page.addScriptTag({ path: new URL('../../../../tests/lib/player.js', import.meta.url).pathname });
await runTo(46.4); await snap('opening-46s');
await runTo(52.0); await snap('opening-52s');
await runTo(63.2); await snap('opening-63s');
await runTo(71.0); await snap('opening-71s');
// to the end of the opening: the house at the play camera
await ev(() => { for (let i = 0; i < 12000 && game.cine; i++) game.frame(1 / 30, false); for (let i = 0; i < 80 && game.state !== 'play'; i++) { game.input.taps.add('KeyE'); game.step(0.05); } game.step(0.5); P.settle(); });
}
// Zoé as the player (her playable parts swap the hero's body)
await ev(() => { game.hero.swapBody('zoe'); game.step(0.3); });
const towardCamera = (t, keys = ['ArrowUp']) => ev(([t, keys]) => { const h = game.hero, c = game.camera.position;
  h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); h.vel.set(0, 0); game.step(0.05);
  for (const k of keys) game.input.keys.add(k);
  for (let i = 0; i < Math.round(t * 30); i++) { h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); game.step(1 / 30); }
  for (const k of keys) game.input.keys.delete(k); h.rig.update(1e-4, h.speed); }, [t, keys]);
await ev(() => { const R = game.room; const e = R.exits.find((x) => !x.room) || R.exits[0]; P.go(e.x, e.z - 3, { tol: 1.2 }); P.settle(); });
await towardCamera(0.55);
await snap('house-zoe-walk', 'hero');
await ev(() => { game.exitRoom({ x: -40.5, z: 60, a: 0 }, true, true); game.step(2); P.settle(); P.tap('F1'); });
await towardCamera(0.15);
await ev(() => { const h = game.hero, c = game.camera.position; for (let i = 0; i < 36; i++) { h.angle = Math.atan2(c.x - h.pos.x, c.z - h.pos.z); game.step(1 / 30); } });
await snap('out-zoe-idle', 'hero');
await towardCamera(0.6);
await snap('out-zoe-walk', 'hero');
await ev(() => { P.settle(); game.exitRoom({ x: -40.5, z: 60, a: 0 }, true, true); game.step(1); P.tap('F2'); });
await towardCamera(0.6);
await snap('out-zoe-run', 'hero');
await ev(() => { P.settle(); P.tap('F1'); game.exitRoom({ x: -40.5, z: 56, a: 0 }, true, true); game.step(1); });
await ev(() => { const h = game.hero, c = game.camera.position; h.angle = Math.atan2(h.pos.x - c.x, h.pos.z - c.z); game.input.keys.add('ArrowUp'); for (let i = 0; i < 18; i++) game.step(1 / 30); game.input.keys.delete('ArrowUp'); h.rig.update(1e-4, h.speed); });
await snap('out-zoe-walk-away', 'hero');
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
