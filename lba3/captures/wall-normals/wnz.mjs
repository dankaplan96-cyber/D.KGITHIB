// WALL-NORMALS on Zeelich (the user's pick, 24.11): the dressed stone (`stone`, also Citadel's trims) and the corrugated
// sheet (`zrib`). From a save (SAVE, default base-05: Zeelich), the pieces wearing those maps are found in the scene and a
// few photographed close (3 m off their face) and from the play camera, off and on (Q). usage:
//   node wnz.mjs <OUT> <lba3 ROOT> "<query>" <tag> [save]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, Q = '', TAG = 'off', SAVE = 'base-05'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/campaign/${SAVE}.save.json`, 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st })).newPage();
await page.goto(server.url + (Q ? Q + '&' : '?') + 'nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
await page.waitForTimeout(2500);
for (let i = 0; i < 40 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
// the pieces with a stone or rib map near him (the same pieces off and on: found by their map's texture, not the normal map)
let spots = await page.evaluate(async () => {
  const G = game, T = (await import('./src/engine/textures.js')).textures(), h = G.hero.pos, out = { stone: [], zrib: [] };
  G.scene.updateMatrixWorld(true);
  G.scene.traverse((o) => {
    const m = o.material; if (!o.isMesh || !m || Array.isArray(m) || !m.map || !o.geometry) return;
    const kind = m.map.source === T.stone.source ? 'stone' : (m.map.name === 'zrib' || /zrib/.test(m.normalMap?.name || '') || (m.map.image?.width === 128 && m.map.image?.height === 128 && m.metalness > 0.1 && m.roughness < 0.7)) ? 'zrib' : null;
    if (!kind) return;
    o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), r = o.geometry.boundingSphere.radius;
    const d = Math.hypot(c.x - h.x, c.z - h.z); if (d > 90 || r > 25) return;
    out[kind].push([+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1), +r.toFixed(1), +d.toFixed(0)]);
  });
  for (const k in out) out[k] = out[k].sort((a, b) => a[4] - b[4]).filter((p, i, A) => !A.slice(0, i).some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 8)).slice(0, 3);
  return out;
});
if (process.env.SPOTS) Object.assign(spots, JSON.parse(fs.readFileSync(process.env.SPOTS, 'utf8')));
console.log('spots', JSON.stringify(spots));
let n = 0;
for (const kind of ['stone', 'zrib']) for (const [x, y, z, r] of spots[kind]) {
  const tag = `${kind}-${n++}`;
  // close: 3 m + its radius off it, toward the open side (the side the hero stands), a little above its middle
  await page.evaluate(({ x, y, z, r }) => { const G = game, h = G.hero.pos, C = G.camera; G.testFreeze = true;
    let dx = h.x - x, dz = h.z - z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; const D = Math.min(r, 4) + 2.6;
    C.position.set(x + dx * D + dz * 0.8, y + 0.6, z + dz * D - dx * 0.8); C.lookAt(x, y, z); C.updateMatrixWorld(); G.renderer.render(); }, { x, y, z, r });
  await page.screenshot({ path: `${OUT}/${tag}-close-${TAG}.jpg`, type: 'jpeg', quality: 88 });
  await page.evaluate(() => { game.testFreeze = false; });
}
// the play camera where he stands (the save's own spot) and 12 m on toward the first stone piece
await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/play-0-${TAG}.jpg`, type: 'jpeg', quality: 86 });
console.log('draw calls', TAG, await page.evaluate(() => { const G = game, R = G.renderer.renderer; G.perf?.beginFrame?.(); G.renderer.render(); return R.info.render.calls + (G.perf?.sub || 0); }));
fs.writeFileSync(`${OUT}/spots-${TAG}.json`, JSON.stringify(spots));
await browser.close(); server.close?.(); process.exit(0);
