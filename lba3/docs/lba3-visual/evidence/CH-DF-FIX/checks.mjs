// CH-DF-FIX: interruption checks for the Dino-Fly's stretch (synthetic, in the real game; no screenshots).
//   GAME_URL=http://127.0.0.1:8182/ node checks.mjs
// A stretch interrupted by talking to him (dialogue), by the pause menu, by entering the house and coming back,
// and by talking twice in a row: no NaN in any bone, the stretch still lasts 2.6 s of simulated time (the pause
// menu: see below), and once it ends every wing and membrane bone is back exactly on the doze fold.
import { launch, open, menu, checker } from '../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const { check, done } = checker();
await open(page, '?nocine');
await menu(page, 'new');
const r = await page.evaluate(() => {
  const G = game, DF = { x: -50.5, z: 68.5 }, out = {};
  G.exitRoom({ x: DF.x + 1.5, z: DF.z + 6, a: Math.PI }, true, true); G.step(2);
  const df = G.scene.getObjectByName('dinofly'), S = df.userData.state, B = df.userData.model.bones;
  const WB = ['wing0L', 'wing1L', 'wing2L', 'mem0L', 'mem1L', 'mem2L', 'wing0R', 'wing1R', 'wing2R', 'mem0R', 'mem1R', 'mem2R'];
  const snap = () => WB.map((n) => B[n].quaternion.toArray());
  const finite = () => Object.values(B).every((b) => b.quaternion.toArray().every(Number.isFinite) && b.position.toArray().every(Number.isFinite));
  const dist = (a, b) => Math.max(...a.map((q, i) => 1 - Math.abs(q[0] * b[i][0] + q[1] * b[i][1] + q[2] * b[i][2] + q[3] * b[i][3])));
  S.nextStretch = 99; G.step(1);
  const doze = snap();
  const pet = (G.world.pets || []).find((p) => p.id === 'dinofly');
  const run = (name, mid) => {
    S.stretchT = 0; S.nextStretch = 0; G.step(1 / 60);
    let t = 0, peak = 0; const _p = new df.position.constructor();
    while (S.stretchT > 0 && t < 10) {
      if (Math.abs(t - 1) < 1e-6 + 1 / 120 && mid) mid();
      G.step(1 / 60); t += 1 / 60; peak = Math.max(peak, B.wing2L.getWorldPosition(_p).y);
      if (!finite()) return { name, nan: true, t };
    }
    S.nextStretch = 99; G.step(0.1);
    return { name, t: +t.toFixed(2), peak: +peak.toFixed(2), back: +dist(snap(), doze).toExponential(1), state: G.state, finite: finite() };
  };
  out.plain = run('plain');
  out.talk = run('talk', () => pet.talk(G));
  G.step(4);   // (let the talk run its course)
  out.talkTwice = run('talk twice', () => { pet.talk(G); pet.talk(G); });
  G.step(4);
  for (let i = 0; i < 200 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.1); }   // (close the talks)
  out.afterTalks = G.state;
  out.pause = (() => { S.stretchT = 0; S.nextStretch = 0; G.step(0.5); const a = S.stretchT; G.pause(); const ps = G.state; G.step(1); const b = S.stretchT; G.act ? G.act('resume') : null; G.step(0.05);
    S.nextStretch = 99; G.step(2.5);
    return { beforePause: +a.toFixed(2), afterPausedSecond: +b.toFixed(2), pausedState: ps, state: G.state, back: +dist(snap(), doze).toExponential(1) }; })();
  G.step(4);
  out.house = (() => { S.stretchT = 0; S.nextStretch = 0; G.step(0.8); G.enterRoom('house', null, true); G.step(3);
    G.exitRoom({ x: DF.x + 1.5, z: DF.z + 6, a: Math.PI }, true, true); S.nextStretch = 99; G.step(3.5);
    return { room: G.room?.id || 'citadel', stretchT: +S.stretchT.toFixed(2), back: +dist(snap(), doze).toExponential(1), finite: finite() }; })();
  return out;
});
console.log(JSON.stringify(r));
check('plain stretch lasts 2.6 s and folds back exactly', Math.abs(r.plain.t - 2.6) < 0.05 && r.plain.back < 1e-6 && r.plain.finite, r.plain);
check('stretch interrupted by talk: same length, folds back, no NaN', Math.abs(r.talk.t - 2.6) < 0.05 && r.talk.back < 1e-6 && r.talk.finite, r.talk);
check('stretch with two talks at once: folds back, no NaN', r.talkTwice.back < 1e-6 && r.talkTwice.finite, r.talkTwice);
// (the game keeps running the world's ambient updaters under the pause menu — dogs, flags, the Dino-Fly — as it did
// before CH-DF-FIX; src/main.js is not this task's. Recorded, not asserted: a stretch carries on behind the menu.)
console.log('pause: stretch time left', r.pause.beforePause, '→', r.pause.afterPausedSecond, 'after 1 s in state', r.pause.pausedState);
check('a stretch across the pause menu ends folded, game back in play', r.pause.state === 'play' && r.pause.back < 1e-6, r.pause);
check('a stretch across a house visit ends folded', r.house.back < 1e-6 && r.house.finite && r.house.stretchT <= 0, r.house);
process.exitCode = done(errs) ? 1 : 0;
await browser.close();
