// FRAME-1: which objects get a geometry the GPU has not seen before while a route plays (each is a buffer upload
// mid-play; a geometry rebuilt over and over is also garbage and a new GPU buffer every time). After a warm-up, every
// geometry drawn for the first time is logged with its object's path, per route.
//   GAME_URL=http://localhost:8171/ ROUTES=street,interior node newgeo.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
for (const id of (process.env.ROUTES || 'street,interior,combat').split(',')) {
  const r = await page.evaluate((id) => {
    const G = game, R = G.renderer.renderer, seen = new WeakSet(), log = new Map();
    const route = G.bench.routes().find((x) => x.id === id); G.state = 'play'; route.setup(); G.state = 'play';
    let t = 0, on = false, frame = 0;
    const rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (!seen.has(geometry)) { seen.add(geometry); if (on) { const p = []; for (let x = object; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); const k = p.slice(0, 4).join(' < ') + ` (${geometry.type})`; const e = log.get(k) || { n: 0, frames: [] }; e.n++; if (e.frames.length < 5) e.frames.push(frame); log.set(k, e); } }
      return rbd.call(this, camera, scene, geometry, material, object, group);
    };
    // warm-up 60 frames drawn, then 120 drawn frames logged (60 Hz)
    for (let i = 0; i < 180; i++) { t += 1 / 60; route.drive(t, 1 / 60); on = i >= 60; frame = i; G.frame(1 / 60, true); }
    R.renderBufferDirect = rbd;
    return [...log].sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([k, v]) => `${v.n}× ${k} frames ${v.frames.join(',')}`);
  }, id);
  console.log(id + ':'); for (const x of r) console.log('  ' + x);
}
await browser.close();
