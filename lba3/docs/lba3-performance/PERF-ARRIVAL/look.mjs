// PERF-ARRIVAL (copy of RENDER-INV look.mjs with the cloud-puff views): same-frame captures for a before/after look comparison (PERF-2's views on Citadel, plus an interior and
// regions), drawn at one preset after the same deterministic steps; PNGs to OUT. Compare with lookdiff.py.
//   GAME_URL=... QUALITY=medium OUT=dir [VIEWS=...] node look.mjs
import { launch, open } from '../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const quality = process.env.QUALITY || 'medium', OUT = process.env.OUT;
fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, camera: 'free', res: 'full' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.renderer.setAutoRes(false); });
const all = [
  { id: 'square-a', x: -42, z: 2, yaw: 1.4 }, { id: 'square-b', x: -42, z: 2, yaw: 2.2 }, { id: 'square-c', x: -42, z: 2, yaw: 4.0 }, { id: 'square-d', x: -42, z: 2, yaw: 5.5 },
  { id: 'harbour', x: -70, z: -4, yaw: 1.6 }, { id: 'house-door', x: -45, z: 76, yaw: 0.8 }, { id: 'lane', x: -36, z: 30, yaw: 3.0 },
  { id: 'house', room: 'house', yaw: 0.8 }, { id: 'zeelich', room: 'zeelich', yaw: 2.0 }, { id: 'desert', room: 'desert', yaw: 1.0 }, { id: 'hamalayi', room: 'hamalayi', yaw: 3.5 }, { id: 'otringal', room: 'isle_otringal', yaw: 0.5 },
  { id: 'zeelich-arrival', room: 'zeelich', yaw: Math.PI * 0.85 }, { id: 'zeelich-c', room: 'zeelich', yaw: 4.5 }, { id: 'otringal-b', room: 'isle_otringal', yaw: 3.0 }, { id: 'knartas', room: 'isle_knartas', yaw: 1.5 },
];
const want = process.env.VIEWS?.split(',');
for (const v of all.filter((x) => !want || want.includes(x.id)).map((x) => ({ ...x, noActors: !!process.env.NOACTORS }))) {
  await page.evaluate((v) => {
    const G = game;
    if (v.room) G.enterRoom(v.room, null, true, true); else G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true);
    G.state = 'play';
    G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
    G.time = 100; // (the same moment for the sway and the water)
    for (let i = 0; i < 40; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, i % 10 === 9); }
    G.camRig.yaw = v.yaw; G.time = 100; G.frame(0, true); G.frame(0, true);
    // (NOACTORS=1: Twinsen and the people hidden for the final frame: their idle poses are not the same from run to run)
    if (v.noActors) { for (const a of [G.hero, ...G.npcs, ...G.enemies]) { const r = a.rig?.root; if (r) r.visible = false; } G.renderer.render(); }
  }, v);
  await page.screenshot({ path: `${OUT}/${quality}-${v.id}.png`, timeout: 300000 });
}
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
