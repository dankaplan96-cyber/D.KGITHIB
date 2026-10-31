// FRAME-1: shadow batches (engine/shadowcull.js) rebuilt while a route plays: which pieces leave their batch (moved,
// hidden or shown), when, and how big the rebuilt cell is (a new merged depth geometry: garbage + a GPU upload).
//   GAME_URL=http://localhost:8171/ Q=medium ROUTES=street,transition node shadowrebuild.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'medium';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 900000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
for (const id of (process.env.ROUTES || 'street,transition').split(',')) {
  const r = await page.evaluate((id) => {
    const G = game, log = [];
    const route = G.bench.routes().find((x) => x.id === id); G.state = 'play'; route.setup(); G.state = 'play';
    let frame = 0, hooked = false;
    const hook = () => {
      const A = G.shadowCull.area; if (!A || hooked) return; hooked = true;
      const P = Object.getPrototypeOf(A), b = P.build;
      P.build = function (cell) { const n = cell.list.reduce((s, C) => s + C.o.geometry.attributes.position.count, 0); log.push({ frame, cell: cell.key, verts: n, KB: Math.round((n * 12 + n * 2) / 1024) }); return b.call(this, cell); };
      const w = P.watch;
      P.watch = function () { const before = new Set(this.solo); const r = w.call(this); for (const C of this.solo) if (!before.has(C)) { const p = []; for (let x = C.o; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); log.push({ frame, left: p.slice(0, 5).join(' < '), visible: C.o.visible, moved: !C.o.matrixWorld.equals(C.mat) }); } return r; };
    };
    for (let i = 0; i < 300; i++) { frame = i; route.drive(i / 60, 1 / 60); hook(); G.frame(1 / 60, i % 10 === 0); }
    return log.slice(0, 40);
  }, id);
  console.log(id + ':'); for (const x of r) console.log('  ' + JSON.stringify(x));
}
await browser.close();
