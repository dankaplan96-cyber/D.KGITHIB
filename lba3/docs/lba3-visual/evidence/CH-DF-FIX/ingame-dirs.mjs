// CH-DF-FIX: the Dino-Fly in the garden from the normal play camera (1280x720), the hero placed S, N, E and W of
// him (world +z, -z, +x, -x of the spot) at 5 m and 12 m, facing him, the camera re-centred behind the hero.
// For each placement three states are held through root.userData.hold (the game never sets it):
//   doze (alert 0, wings folded), look (alert 1, the head turned to the hero), stretch (alert 1, wings fully open).
// Plus a playback strip (frames of the real updater, no hold): a full wing stretch at 6 m, sampled every 0.2 s, and
// the same stretch stepped at 30/60/120 Hz, to check its timing is rate-free. (The wake-up, doze → look, is a
// strip of dinofly-lookdev.html frames: a fixed camera; here the play camera follows the walking hero.)
//   GAME_URL=http://127.0.0.1:8182/ node ingame-dirs.mjs <outdir> <prefix> [strips|rates]   (rates: only the 30/60/120 Hz check)
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const STRIPS = process.argv[4] === 'strips', RATES = process.argv[4] === 'rates';
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
const DF = { x: -50.5, z: 68.5 };
const DIRS = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
const place = (s) => ev((s) => { const G = game, h = G.hero;
  const df = G.scene.getObjectByName('dinofly');
  df.userData.hold = s.hold;
  G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); h.angle = s.a;
  G.camRig.lba && (G.camRig.lba.init = false); G.step(s.t); G.renderer.render();
  return { hero: [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)], d: +Math.hypot(h.pos.x - df.position.x, h.pos.z - df.position.z).toFixed(2) }; }, s);
const face = (x, z) => Math.atan2(DF.x - x, DF.z - z);
const HOLD = { doze: { alert: 0, open: 0 }, look: { alert: 1, open: 0 }, stretch: { alert: 1, open: 1 } };
for (const [dn, [dx, dz]] of Object.entries(RATES ? {} : DIRS)) for (const dist of [5, 12]) {
  const x = DF.x + dx * dist, z = DF.z + dz * dist;
  for (const [hn, hold] of Object.entries(HOLD)) {
    const r = await place({ x, z, a: face(x, z), t: 2.5, hold });
    const f = path.join(OUT, `${PRE}-${dn}${dist}-${hn}.png`);
    await page.screenshot({ path: f, timeout: 180000 });
    console.log(dn, dist, hn, JSON.stringify(r));
  }
}
if (RATES) await place({ x: DF.x + 1.5, z: DF.z + 6, a: face(DF.x + 1.5, DF.z + 6), t: 3, hold: null });
if (STRIPS) {
  // the stretch at 6 m S, the head up (real updater): start it now, a frame every 0.2 s for 2.8 s
  await place({ x: DF.x + 1.5, z: DF.z + 6, a: face(DF.x + 1.5, DF.z + 6), t: 3, hold: null });
  await ev(() => { const s = game.scene.getObjectByName('dinofly').userData.state; s.nextStretch = 0; });
  for (let i = 0; i <= 14; i++) {
    await ev((i) => { const G = game; G.step(i ? 0.2 : 0.01); G.renderer.render(); }, i);
    await page.screenshot({ path: path.join(OUT, `${PRE}-stretch-${String(i).padStart(2, '0')}.png`), timeout: 180000 });
  }
}
if (STRIPS || RATES) {
  // the same stretch stepped at 30, 60 and 120 Hz: the wing tip's height at the same instants must agree
  const rates = await ev(() => { const G = game, df = G.scene.getObjectByName('dinofly'), M = df.userData.model, out = {};
    const _p = new df.position.constructor();
    for (const hz of [30, 60, 120]) {
      df.userData.state.stretchT = 0; df.userData.state.nextStretch = 0; const rows = [];
      for (let i = 0; i < Math.round(2.8 * hz); i++) { G.step(1 / hz, 1 / hz); if (i % Math.round(hz * 0.4) === 0) rows.push(+M.bones.wing2L.getWorldPosition(_p).y.toFixed(3)); }
      out[hz] = rows;
    }
    return out; });
  console.log('stretch wing-tip height every 0.4 s at 30/60/120 Hz', JSON.stringify(rates));
  // the draw calls and triangles at the garden, 5 m from him
  const perf = await ev(() => { const G = game; G.perf.reset(); for (let i = 0; i < 30; i++) G.advance(1 / 30); const s = G.perf.stats(); return { calls: s.calls, tris: s.tris }; });
  console.log('perf at the garden:', JSON.stringify(perf));
}
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
