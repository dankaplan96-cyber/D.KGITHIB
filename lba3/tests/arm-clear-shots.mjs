// ARM-CLEAR pictures (P111): a cast member stood on the open quay by Gate 1 (Citadel), made with the game's own
// createCharacter and posed by the rig, from the play camera's distance and from dialogue distance, for a person to judge
// the hands against the body. Then (BRAM=1) the real conversation with Bram at his pump: the game's own talk camera.
// usage: OUT=dir TAG=before|after [OFF=1] [BRAM=1] LOOKS=bram,doran POSES=idle,talk2,walk node tests/arm-clear-shots.mjs
// SwiftShader, headless: Automated runtime only.
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUT = process.env.OUT || fileURLToPath(new URL('../captures/grobo-arm/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG ? process.env.TAG + '-' : '';
const LOOKS = (process.env.LOOKS || 'bram').split(',');
const POSES = (process.env.POSES || 'idle,talk2,listen').split(',');
const VIEWS = process.env.VIEWS ? process.env.VIEWS.split(',') : ['play', 'dlg', 'side'];
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
// OFF=1: the rig's arm clearance switched off (the pictures before P111)
if (process.env.OFF) await ev(async () => { const R = await import('./src/engine/rig.js'); R.Rig.prototype._armClear = () => {}; });
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play', null, { timeout: 600000 });
await ev(() => { const G = game; G.testFreeze = true; if (G.room) G.exitRoom({ x: -56, z: -30, a: 0 }, true); G.step(0.5); });
const SPOT = { x: 0, z: 30 };
// [name, distance, eye height, angle off the face, look-at height]
const V = { play: [8.0, 4.6, 0.55, 0.8], dlg: [2.3, 1.5, 0.45, 0.95], side: [2.3, 1.2, 1.35, 0.8] };
for (const look of LOOKS) {
  await ev(async ({ look, SPOT }) => {
    const G = game, C = await import('./src/game/characters.js');
    const rig = C.createCharacter(look); window.__R = rig;
    rig.root.position.set(SPOT.x, G.physics.groundAt(SPOT.x, SPOT.z), SPOT.z); rig.root.rotation.y = 0;
    G.scene.add(rig.root);
  }, { look, SPOT });
  for (const pose of POSES) {
    await ev(({ pose }) => {
      const r = window.__R, talk = /^talk\d$/.test(pose), anim = talk ? 'talk' : pose;
      const speed = pose === 'walk' ? 1.3 : pose === 'run' ? 3.8 : 0;
      r.play('idle'); r.noFidget = true; for (let i = 0; i < 40; i++) r.update(1 / 60, 0);
      r.play(anim);
      for (let t = 0; t < 1.3; t += 1 / 60) { if (talk) r.gesture = +pose.slice(4); r.update(1 / 60, speed); }
      const P = r.root.position; r.root.position.set(P.x, game.physics.groundAt(P.x, P.z), P.z);
    }, { pose });
    for (const vn of VIEWS) {
      const [d, h, a, lh] = V[vn];
      await ev(({ d, h, a, lh }) => { const G = game, p = window.__R.root.position, Cm = G.camera;
        Cm.position.set(p.x + Math.sin(a) * d, p.y + h, p.z + Math.cos(a) * d); Cm.lookAt(p.x, p.y + lh, p.z); Cm.updateMatrixWorld(); G.renderer.render(); }, { d, h, a, lh });
      await page.screenshot({ path: `${OUT}${TAG}${look}-${pose}-${vn}.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
    }
  }
  await ev(() => { game.scene.remove(window.__R.root); });
}
// the game's own cameras on Bram at his pump (Mill Lane): walked up to by input until his Talk prompt shows (the play
// camera), then E (the talk camera, two moments of the conversation)
if (process.env.BRAM) {
  const r = await ev(() => {
    const G = game, n = P.npc('bram');
    if (!n || !n.present) return { r: 'absent' };
    if (G.room) P.enter(P.sceneOf(n.pos.x, n.pos.z));
    const ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'bram'; };
    P.go(n.pos.x, n.pos.z, { tol: 1.6, stopWhen: ready, maxT: 240 }); P.face(n.pos.x, n.pos.z);
    for (let k = 0; k < 3 && !ready(); k++) { P.go(n.pos.x, n.pos.z, { tol: 1.1 - k * 0.15, maxT: 20 }); P.face(n.pos.x, n.pos.z); }
    G.step(1.5);
    return { r: ready() ? 'at bram' : 'no prompt', d: +Math.hypot(n.pos.x - G.hero.pos.x, n.pos.z - G.hero.pos.z).toFixed(2) };
  });
  console.log('BRAM', JSON.stringify(r));
  await ev(() => game.renderer.render());
  await page.screenshot({ path: `${OUT}${TAG}bram-game-play.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
  await ev(() => { P.tap('KeyE', 0.1); game.step(0.9); game.renderer.render(); });
  const st = await ev(() => game.state);
  await page.screenshot({ path: `${OUT}${TAG}bram-game-talk.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
  await ev(() => { game.step(0.6); game.renderer.render(); });
  await page.screenshot({ path: `${OUT}${TAG}bram-game-talk-b.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
  check('the talk with Bram opens by E (the talk camera pictures)', st === 'dialog', st);
}
check('pictures written', true, OUT);
await browser.close();
process.exitCode = done();
