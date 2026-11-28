// STABILIZATION (the user, 0.41.0: stutters on the start screen): how heavy is the title's live view — the camera going
// round Citadel at 110 m — against play? Draw calls and triangles of every pass at points of its circle (exact here),
// at the preset the title runs at (Q, else as started), and how often
// the world's detail tiles switch as it goes round (each switch refills the grass/flower pools: their instance buffers
// go to the GPU again), with the bytes that refill re-sends.
//   GAME_URL=http://localhost:8351/ [Q=high] node titleview.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env;
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '');
if (E.Q) await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, E.Q);
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 900000, polling: 500 });
const r = await ev(() => {
  const G = game, R = G.renderer.renderer, W = G.world, out = [];
  R.info.autoReset = false;
  const SM = R.shadowMap, smr = SM.render.bind(SM); let sc = 0, st = 0;
  SM.render = (...a) => { const c0 = R.info.render.calls, t0 = R.info.render.triangles; smr(...a); sc += R.info.render.calls - c0; st += R.info.render.triangles - t0; };
  const one = () => { R.info.reset(); sc = st = 0; G.renderer.render(); const i = R.info.render; const p = G.camera.position;
    return { q: G.settings.quality, calls: i.calls, tris: Math.round(i.triangles / 1000) + 'k', shadowCalls: sc, shadowTris: Math.round(st / 1000) + 'k', cam: [p.x, p.y, p.z].map((v) => Math.round(v)).join(','), shadowMap: SM.enabled ? (G.renderer.sun?.shadow?.mapSize?.x ?? '?') : 'off' }; };
  // the title's circle: a = time·0.05 + 2.2 (main.js titleCamera)
  for (const s of [0, 20, 40, 60, 80, 100]) {
    G.time = s; G.titleCamera(0); G.camera.position.copy(G.camRig.override.pos); G.camera.lookAt(G.camRig.override.look); G.camera.updateMatrixWorld(); W.updateLod(G.camera.position); G.lightPool.update(G.camera.position, G.time);
    G.shadowCull.update(G.world.root, G.camera, G.camera.position);
    out.push(`title at ${s} s: ${JSON.stringify(one())}`);
  }
  // the detail tiles' switches over one full circle (126 s) at 60 steps a second, and the pool bytes re-sent
  const pools = W.smallPools || [];
  for (const P of pools) P._v = P.im.instanceMatrix.version;
  let sw = 0, refills = 0, sent = 0, worst = 0; const pos = { x: 0, y: 0, z: 0 };
  for (let k = 0; k < 126 * 60; k++) {
    const a = (k / 60) * 0.05 + 2.2; pos.x = Math.cos(a) * 110; pos.z = Math.sin(a) * 110;
    const near0 = W.lodTiles.map((T) => T.near + 2 * (T.hi?.visible ? 1 : 0)).join('');
    W.updateLod(pos);
    const near1 = W.lodTiles.map((T) => T.near + 2 * (T.hi?.visible ? 1 : 0)).join('');
    if (near1 !== near0) { sw++; let b = 0, n = 0; for (const P of pools) { if (P.im.instanceMatrix.version !== P._v) { n++; b += P.im.instanceMatrix.array.byteLength + (P.im.instanceColor?.array.byteLength || 0); } } refills += n; sent += b; worst = Math.max(worst, b); }
    for (const P of pools) P._v = P.im.instanceMatrix.version;
  }
  out.push(`one title circle (126 s): ${sw} detail-tile switches · ${refills} pool refills · ${(sent / 1048576).toFixed(1)} MB re-sent · the largest in one frame ${(worst / 1048576).toFixed(2)} MB · pools ${pools.length}, ${(pools.reduce((a, P) => a + P.im.instanceMatrix.array.byteLength, 0) / 1048576).toFixed(2)} MB of matrices in all`);
  return out.join('\n');
});
console.log(r);
await browser.close();
