// ORDER 66.4: what place-scan doesn't group — the instanced things (trees, bushes, lamps, flowers, rocks …) — each
// instance's lowest point against the ground under its middle, in Citadel. Lists the instances floating > FLOAT m or
// sunk > SINK m (their own lowest point under the ground by that much at every one of 5 points under it), by mesh.
// usage: node instground.mjs <OUT.json> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUTF, ROOT] = process.argv.slice(2);
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
const res = await page.evaluate(() => {
  const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); G.step(0.5);
  const g = (x, z) => G.physics.groundAt(x, z);
  const M = G.camera.matrixWorld.constructor, V = G.camera.position.constructor;
  const m = new M(), w = new M(), v = new V(), out = {}, seen = {};
  G.scene.updateMatrixWorld(true);
  G.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.geometry || o.count > 20000) return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; const name = (o.name || o.geometry.name || o.material?.name || 'inst') + '·' + o.count;
    seen[name] = o.count;
    const pts = [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m); w.multiplyMatrices(o.matrixWorld, m);
      v.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2).applyMatrix4(w);
      if (v.x < -135 || v.x > 30 || v.z < -125 || v.z > 105) continue;   // (Citadel's island)
      const sc = new V(); w.decompose(new V(), new (G.camera.quaternion.constructor)(), sc); const rx = (bb.max.x - bb.min.x) / 2 * sc.x * 0.6, rz = (bb.max.z - bb.min.z) / 2 * sc.z * 0.6;
      const ds = pts.map(([a, b]) => v.y - g(v.x + a * rx, v.z + b * rz));
      const lo = Math.min(...ds), hi = Math.max(...ds);
      if (lo > 0.12) (out[name] ??= []).push(['float', +lo.toFixed(2), +v.x.toFixed(2), +v.z.toFixed(2)]);
      else if (hi < -0.35 && (bb.max.y - bb.min.y) * sc.y < 3) (out[name] ??= []).push(['sunk', +hi.toFixed(2), +v.x.toFixed(2), +v.z.toFixed(2)]);
    }
  });
  return { seen, out };
});
fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res.out)) console.log(k.padEnd(40), v.length, JSON.stringify(v.slice(0, 4)));
console.log('instanced meshes looked at:', Object.keys(res.seen).length);
await browser.close(); server.close?.(); process.exit(0);
