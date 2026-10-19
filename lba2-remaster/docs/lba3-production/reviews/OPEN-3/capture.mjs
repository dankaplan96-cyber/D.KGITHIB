// OPEN-3 review capture: plays the opening on the game's own clock (deterministic 30 fps steps, the same picture
// a player sees at normal speed) and saves a frame every STEP seconds plus a per-frame log of the cast.
//   node docs/lba3-production/reviews/OPEN-3/capture.mjs <outdir> [width height step t0 t1]
//   GAME_URL (default http://localhost:8211/)
// <outdir>/f_<t>.jpg   the frame at t (subtitles, captions and the fade included: it is a page screenshot)
// <outdir>/log.json    per frame: t, shot, room, fade, camera, and per actor pos/angle/anim/visible, the feet's
//                      height over the floor, the hands, and every solid collider the actor's circle overlaps
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, W = 1280, H = 720, STEP = 0.2, T0 = 0, T1 = 89] = [process.argv[2], ...process.argv.slice(3).map(Number)];
fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.GAME_URL || 'http://localhost:8211/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
await ev(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
await ev(() => {
  // the sampler: one record per frame
  const G = game, c = G.cine, v = new G.camera.position.constructor();
  const cast = () => {
    return { twinsen: G.hero, zoe: G.npcs.find((n) => n.def.id === 'zoe'), arthur: G.npcs.find((n) => n.def.id === 'arthur'), ...(c.extras || {}) };
  };
  window.__rec = [];
  window.__sample = () => {
    const P = G.physics, shots = c.def.shots, t = c.t;
    const si = shots.findIndex((s) => t >= s.t0 && t < s.t1);
    const cam = G.camera;
    const r = { t: +t.toFixed(3), shot: si, room: G.room?.id || 'out', fade: document.querySelector('#fade').classList.contains('on'), cam: [cam.position.x, cam.position.y, cam.position.z].map((x) => +x.toFixed(2)), a: {} };
    for (const [id, a] of Object.entries(cast())) {
      const rig = a.rig, vis = rig.root.visible && (id !== 'zoe' || a.present);
      const fl = P.groundAt(a.pos.x, a.pos.z, a.pos.y + 0.3);
      const feet = ['legL', 'legR'].map((s) => { rig.j[s].foot.getWorldPosition(v); return +(v.y - fl).toFixed(3); });
      const hands = ['armL', 'armR'].map((s) => { rig.j[s].hand.getWorldPosition(v); return [v.x, v.y, v.z].map((x) => +x.toFixed(3)); });
      const hits = [];
      for (const k of P.near(a.pos.x, a.pos.z)) {
        if (!k.enabled || k.top < a.pos.y + 0.25 || k.bottom > a.pos.y + 1.6) continue;
        if (P._inside(k, a.pos.x, a.pos.z, 0.18)) hits.push({ type: k.type, x: +k.x.toFixed(2), z: +k.z.toFixed(2), top: +k.top.toFixed(2), hw: k.hw, hd: k.hd, r: k.r, tag: k.tag || k.name || k.kind || '' });
      }
      r.a[id] = { pos: [a.pos.x, a.pos.y, a.pos.z].map((x) => +x.toFixed(3)), ang: +a.angle.toFixed(3), anim: rig.anim, vis, floor: +fl.toFixed(3), feet, hands, hits };
    }
    window.__rec.push(r);
  };
});
const fmt = (t) => t.toFixed(2).padStart(6, '0');
let next = T0;
for (;;) {
  const st = await ev(() => { if (!game.cine) return null; return game.cine.t; });
  if (st == null || st > T1) break;
  if (st + 1 / 30 >= next - 1e-6) {
    // the next frame lands on (or just past) the sample time: render it and save the picture
    await ev(() => { game.frame(1 / 30, true); window.__sample(); });
    const t = await ev(() => game.cine?.t ?? 999);
    await page.screenshot({ path: path.join(OUT, `f_${fmt(t)}.jpg`), type: 'jpeg', quality: 82, timeout: 120000 });
    while (next <= t + 1e-6) next += STEP;
  } else {
    // step without rendering until the frame before the next sample (at least one step)
    await ev((n) => { let i = 0; do { game.frame(1 / 30, false); window.__sample(); i++; } while (i < 300 && game.cine && game.cine.t + 2 / 30 < n - 1e-6); }, next);
  }
}
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(await ev(() => window.__rec)));
console.log('frames done', errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
await browser.close();
