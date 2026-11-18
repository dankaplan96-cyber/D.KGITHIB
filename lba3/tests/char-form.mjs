// CHAR-FORM (REPAIR-PASS-18-11 phase 3, docs/lba-maturity/CHAR-FORM.md): a short look at Twinsen and Zoé in the game, from
// the play camera and close up, for a person to judge; plus the few things a script can tell about the models.
// New game → out of the house into the yard (by input: tests/lib/player.js), where Zoé waits:
//   play camera  standing · walking (Normal) · running (Athletic, F2) · the talk with Zoé (E) · back to Normal (F1)
//   close-ups    game.camRig.override (a fixed camera beside them; the only thing set that a player cannot do)
// Checks: both models load from assets/poly (not the sculpt fallback), their bones are the skeleton's, the eyes and the
// talking mouth are there, the ball is in his hand bone's hierarchy. OUT=dir (default captures/char-form/game-<TAG>),
// TAG=before|after names the set. SwiftShader, headless: Automated runtime only.
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const TAG = process.env.TAG || 'after';
const CAP = process.env.OUT || fileURLToPath(new URL(`../captures/char-form/game-${TAG}/`, import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: CAP + n + '.jpg', type: 'jpeg', quality: 85, timeout: 180000 }); };

await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });

// the models: loaded from the poly files, the skeleton's bones, the face's parts
const info = await ev(() => {
  const H = game.hero.rig, bones = [];
  H.root.traverse((o) => { if (o.isBone) bones.push(o.name); });
  let skinned = 0, tris = 0;
  H.root.traverse((o) => { if (o.isSkinnedMesh) { skinned++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  return { poly: !!H.poly || !!H.isPoly || skinned > 0, skinned, tris, bones: bones.length, eyes: !!(H.eyes?.length || H.j?.eyes), mouth: !!(H.mouth || H.mouths?.length) };
});
check('Twinsen is the polygon model (skinned meshes), with its bones', info.skinned > 0 && info.bones >= 19, info);

// in the house (its own camera): the magic ball from the cupboard (E, as the steps ask), then out into the yard (by input)
await shot('00-house-standing');
const got = await ev(() => {
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  game.step(1.0); return game.hero.hasBall;
});
check('the ball from the cupboard (the house step)', got, got);
await ev(() => { P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); });
const outside = await ev(() => !game.room);
check('out in the yard', outside, outside);
const zoe = await ev(() => { const z = P.npc('zoe'); return z ? { present: z.present !== false, at: [+z.pos.x.toFixed(2), +z.pos.z.toFixed(2)], skinned: (() => { let n = 0; z.rig.root.traverse((o) => { if (o.isSkinnedMesh) n++; }); return n; })() } : null; });
check('Zoé is in the yard, the polygon model', !!zoe && zoe.skinned > 0, zoe);
// walk toward her and stop a few metres short, so both are in the play camera
await ev(() => { const z = P.npc('zoe'); const h = game.hero.pos; const dx = z.pos.x - h.x, dz = z.pos.z - h.z, d = Math.hypot(dx, dz); if (d > 3.2) P.go(h.x + dx * (1 - 3 / d), h.z + dz * (1 - 3 / d), { tol: 0.5, maxT: 60 }); P.settle(); game.step(1.0); });
await shot('01-play-standing');
// walking (Normal): the arrow held, the picture mid-stride
// (away from the front door: the yard's middle is between him and Zoé)
await ev(() => { const z = P.npc('zoe'); window.CF_A = Math.atan2(z.pos.x - game.hero.pos.x, z.pos.z - game.hero.pos.z); P.face(game.hero.pos.x + Math.sin(CF_A + 1.2) * 6, game.hero.pos.z + Math.cos(CF_A + 1.2) * 6); game.input.keys.add('ArrowUp'); game.step(0.9); });
await shot('02-play-walk');
await ev(() => { game.step(0.27); });
await shot('03-play-walk-b');
await ev(() => { game.input.keys.delete('ArrowUp'); game.step(0.6); });
// running (Athletic)
await ev(() => { P.tap('F2', 0.2); P.face(game.hero.pos.x + Math.sin(CF_A - 1.2) * 6, game.hero.pos.z + Math.cos(CF_A - 1.2) * 6); game.input.keys.add('ArrowUp'); game.step(0.8); });
const beh = await ev(() => game.hero.behaviour);
await shot('04-play-run-athletic');
await ev(() => { game.step(0.13); });
await shot('05-play-run-athletic-b');
await ev(() => { game.input.keys.delete('ArrowUp'); game.step(0.8); P.tap('F1', 0.2); P.settle(); if (game.room) { const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); } });
check('Athletic by its key (F2) for the run pictures, Normal again after (F1)', beh === 'athletic', beh);

// close-ups: a fixed camera beside them (the play camera's light), standing, mid-walk and running
const near = async (name, who, yaw, d, lift, extra) => {
  await ev(({ who, yaw, d, lift }) => {
    const r = (who === 'hero' ? game.hero : P.npc(who)).rig.root, p = r.position, a = r.rotation.y + yaw;
    game.camRig.override = { pos: p.clone().add({ x: Math.sin(a) * d, y: 1.15 + lift, z: Math.cos(a) * d }), look: p.clone().add({ x: 0, y: 1.0, z: 0 }) };
    game.step(2.5);   // (the override is eased into: let it arrive)
  }, { who, yaw, d, lift });
  if (extra) await ev(extra);
  await shot(name);
};
await ev(() => { P.settle(); game.step(0.5); });
check('still outdoors for the close-ups', await ev(() => !game.room), await ev(() => game.room?.id ?? 'out'));
await near('06-close-twinsen-34', 'hero', 0.6, 3.4, 0.3);
await near('07-close-twinsen-back', 'hero', Math.PI + 0.3, 3.4, 0.5);
await near('08-close-zoe-34', 'zoe', 0.6, 3.4, 0.3);
await near('09-close-zoe-side', 'zoe', 1.57, 3.4, 0.2);
await ev(() => { game.camRig.override = null; game.step(0.2); });

// throwing the ball (its key, F in Classic), the picture as it leaves the hand
await ev(() => { P.settle(); game.step(0.3); });
const thr = await ev(async () => { const inp = await import('./src/engine/input.js'); const k = inp.keyFor('ball') || 'KeyF'; game.input.keys.add(k); game.input.taps.add(k); game.step(0.12); return k; });
await shot('12-play-throw');
await ev((k) => { game.input.keys.delete(k); game.step(1.5); P.settle(); }, thr);
// talking: E by Zoé (as a player does: walk up until the Talk prompt is hers, face her, E), the picture in the talk
await ev(() => {
  const z = P.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
  P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
  for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
  P.tap('KeyE', 0.1); game.step(0.8);
});
const st = await ev(() => game.state);
await shot('10-play-talk-zoe');
await ev(() => { game.step(0.35); });
await shot('11-play-talk-zoe-b');
check('the talk with Zoé opens by E (pictures of the talking poses)', st === 'dialog', st);
await ev(() => { P.settle(); });
await browser.close();
process.exitCode = done();
