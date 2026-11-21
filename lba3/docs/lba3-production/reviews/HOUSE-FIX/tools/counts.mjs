import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node counts.mjs — draw calls / triangles / geometries / textures in the house and the cellar, game camera, 1280×720,
// the same hero spots on baseline and candidate (GAME_URL). Counts only: SwiftShader timings say nothing about a GPU.
const URL0 = process.env.GAME_URL || 'http://localhost:8186/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => { const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
const out = await ev(() => {
  const G = game, res = {};
  const meshes = (R) => { let n = 0, tri = 0; R.group.traverse((o) => { if (o.isMesh) { n++; const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes: n, tris: Math.round(tri), colliders: R.colliders.length, lights: R.lights.length }; };
  for (const [room, spots] of [['house', [['family', -0.45, -0.25], ['reading', -9.6, 9.0], ['door', 1.2, 9.9]]], ['cellar', [['middle', 0, 0]]]]) {
    G.enterRoom(room, null, true); G.step(0.3);
    const R = G.room; res[room] = { group: meshes(R), views: {} };
    for (const [n, x, z] of spots) {
      G.hero.pos.set(R.center.x + x, 0, R.center.z + z); G.hero.vel?.set?.(0, 0);
      for (let i = 0; i < 40; i++) G.frame(0.05, false);
      const info = G.renderer.renderer.info; info.autoReset = false; info.reset();
      G.frame(1 / 30, true);
      res[room].views[n] = { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures };
      info.autoReset = true;
    }
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
