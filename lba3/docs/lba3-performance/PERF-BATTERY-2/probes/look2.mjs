// Equivalent views for a before/after comparison between two builds (run once per build, GAME_URL pointing at it):
// the route's frame after NSTEP fixed 30 fps steps, at a preset, battery profile on or off. Writes OUT/TAG-ROUTE.jpg
// (the view) and OUT/TAG-ROUTE.raw (the drawing buffer's RGBA, for diff.mjs).
//   GAME_URL=… OUT=dir TAG=before Q=medium BATTERY=1 ROUTES=street,interior node look2.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT, Q = process.env.Q || 'medium', TAG = process.env.TAG || 'x';
fs.mkdirSync(OUT, { recursive: true });
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, res: 'full' })); } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.hud.el.style.visibility = 'hidden'; });
await ev(() => game.bench.prepareAreas());
await ev((b) => { if (b != null) game.setBattery(b === '1'); }, process.env.BATTERY ?? null);
for (const route of (process.env.ROUTES || 'street').split(',')) {
  const b64 = await ev(async ({ route, n }) => {
    const G = game;
    const r = route === 'hamalayi' && !G.bench.routes().find((x) => x.id === 'hamalayi')
      ? { setup: () => { G.enterRoom('hamalayi', null, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }, drive: (t, dt) => { G.camRig.yaw += dt * 0.35; } }
      : G.bench.routes().find((x) => x.id === route);
    G.state = 'play'; r.setup(); G.state = 'play';
    G.renderer.setAutoRes(false);
    // (the hamalayi route walks a loop from wherever he arrived: still here, both builds the same)
    const still = route === 'hamalayi';
    for (let i = 0; i < n; i++) { if (!still) r.drive((i + 1) / 30, 1 / 30); else G.camRig.yaw += 0.35 / 30; G.frame(1 / 30, i % 15 === 14 || i === n - 1); }
    const gl = G.renderer.renderer.getContext();
    G.renderer.render();
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, p = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p);
    let s = ''; for (let i = 0; i < p.length; i += 0x8000) s += String.fromCharCode.apply(null, p.subarray(i, i + 0x8000));
    return JSON.stringify({ W, H, data: btoa(s) });
  }, { route, n: +(process.env.NSTEP || 90) });
  const o = JSON.parse(b64);
  fs.writeFileSync(`${OUT}/${TAG}-${route}.raw`, Buffer.concat([Buffer.from(Int32Array.from([o.W, o.H]).buffer), Buffer.from(o.data, 'base64')]));
  await ev(() => game.renderer.render());
  await page.screenshot({ path: `${OUT}/${TAG}-${route}.jpg`, type: 'jpeg', quality: 85 });
  console.log('LOOK', TAG, route, o.W, o.H);
}
await browser.close();
