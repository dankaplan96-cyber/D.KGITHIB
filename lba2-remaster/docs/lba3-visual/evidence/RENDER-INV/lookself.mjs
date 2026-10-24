// RENDER-INV: an exact look check of the draw batches and the lamp skip: one page, one frozen moment, drawn three
// ways — as shipped, draw batches off (every piece on its own), lamp skip off (three's original lights chunk, the
// materials recompiled) — and captured; lookdiff.py then compares them pixel for pixel (no run-to-run variation:
// nothing is simulated between the captures).
//   GAME_URL=http://localhost:8176/ QUALITY=medium OUT=dir [VIEWS=...] node lookself.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const quality = process.env.QUALITY || 'medium', OUT = process.env.OUT;
for (const d of ['shipped', 'nobatch', 'nolampskip']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, camera: 'free', res: 'full' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.renderer.setAutoRes(false); });
const all = [
  { id: 'square-a', x: -42, z: 2, yaw: 1.4 }, { id: 'square-b', x: -42, z: 2, yaw: 2.2 }, { id: 'harbour', x: -70, z: -4, yaw: 1.6 }, { id: 'house-door', x: -45, z: 76, yaw: 0.8 }, { id: 'lane', x: -36, z: 30, yaw: 3.0 },
  { id: 'house', room: 'house', yaw: 0.8 }, { id: 'workshop', room: 'workshop', yaw: 0.8 }, { id: 'zeelich', room: 'zeelich', yaw: 2.0 }, { id: 'desert', room: 'desert', yaw: 1.0 }, { id: 'hamalayi', room: 'hamalayi', yaw: 3.5 }, { id: 'otringal', room: 'isle_otringal', yaw: 0.5 },
];
const want = process.env.VIEWS?.split(',');
const draw = () => page.evaluate(() => { const G = game; G.time = 100; G.renderer.render(); G.renderer.render(); });
for (const v of all.filter((x) => !want || want.includes(x.id))) {
  await page.evaluate((v) => {
    const G = game;
    if (v.room) G.enterRoom(v.room, null, true, true); else G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true);
    G.state = 'play';
    G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
    for (let i = 0; i < 40; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, i % 10 === 9); }
    G.camRig.yaw = v.yaw; G.frame(0, true);
  }, v);
  await draw(); await page.screenshot({ path: `${OUT}/shipped/${quality}-${v.id}.png`, timeout: 300000 });
  // draw batches off: every batched piece back on its own
  await page.evaluate(() => { game.drawBatch.enabled = false; });
  await draw(); await page.screenshot({ path: `${OUT}/nobatch/${quality}-${v.id}.png`, timeout: 300000 });
  await page.evaluate(() => { game.drawBatch.enabled = true; });
  // lamp skip off: three's own chunk, every material recompiled
  await page.evaluate(async () => {
    const G = game, C = window.__chunks ??= await import(new URL('vendor/three/build/three.module.min.js', location.href).href).then((T) => T.ShaderChunk);
    const cur = C.lights_fragment_begin, plain = cur.replace(/\t\t#ifndef TOON\n\t\tif \( directLight\.visible \)\n\t\t#endif\n/g, '');
    window.__patched = cur; C.lights_fragment_begin = plain;
    G.scene.traverse((o) => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; });
  });
  await draw(); await page.screenshot({ path: `${OUT}/nolampskip/${quality}-${v.id}.png`, timeout: 300000 });
  await page.evaluate(() => { const G = game; window.__chunks.lights_fragment_begin = window.__patched; G.scene.traverse((o) => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; }); G.renderer.render(); });
}
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
