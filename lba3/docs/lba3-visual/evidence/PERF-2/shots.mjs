// PERF-2: same-frame captures for a before/after look comparison. Fixed views on Citadel (free camera at given
// headings around the square, the harbour, the house door), drawn at one preset; PNGs to OUT.
//   GAME_URL=... QUALITY=medium OUT=dir node shots.mjs
import { launch, open } from '/home/user/geriatrics-course/.claude/worktrees/agent-aeb700a18e33d78c7/lba2-remaster/tests/lib/boot.mjs';
import fs from 'node:fs';
const quality = process.env.QUALITY || 'medium', OUT = process.env.OUT;
fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, camera: 'free' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const views = [
  { id: 'square-a', x: -42, z: 2, yaw: 1.4 }, { id: 'square-b', x: -42, z: 2, yaw: 2.2 }, { id: 'square-c', x: -42, z: 2, yaw: 4.0 }, { id: 'square-d', x: -42, z: 2, yaw: 5.5 },
  { id: 'harbour', x: -70, z: -4, yaw: 1.6 }, { id: 'house-door', x: -45, z: 76, yaw: 0.8 }, { id: 'lane', x: -36, z: 30, yaw: 3.0 },
];
for (const v of views) {
  await page.evaluate((v) => {
    const G = game; G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true); G.state = 'play';
    G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
    G.time = 100; // (the same moment for the sway and the water)
    for (let i = 0; i < 40; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, false); }
    G.camRig.yaw = v.yaw; G.time = 100; G.frame(0, true); G.frame(0, true);
  }, v);
  await page.screenshot({ path: `${OUT}/${quality}-${v.id}.png`, timeout: 180000 });
}
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
