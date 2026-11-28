// ORDER 70.2: Zeelich's and the islands' stone (`stone`) and sheet (`zrib`) from the PLAY camera, off (the default now,
// ?wallnormals=1) and on (?wallnormals=all). The spots: Twinsen set down 4-6 m off a piece wearing the map, facing it;
// found in the first run and reused in the second (SPOTS file), so both pictures are the same place.
// usage: node wnplay.mjs <OUT> <lba3 ROOT> <save> <tag: off|on>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, SAVE, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const Q = TAG === 'on' ? '?wallnormals=all' : '?wallnormals=1';
const server = await serve(ROOT); const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/campaign/${SAVE}.save.json`, 'utf8').replaceAll('http://localhost:9201', origin)); for (const o of st.origins || []) o.origin = origin;
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st })).newPage();
await page.goto(server.url + Q + '&nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="continue"]'); await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
await page.waitForTimeout(2500);
for (let i = 0; i < 40 && (await page.evaluate(() => game.state)) !== 'play'; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
const SP = `${OUT}/spots-${SAVE}.json`;
let spots = fs.existsSync(SP) ? JSON.parse(fs.readFileSync(SP, 'utf8')) : null;
if (!spots) {
  spots = await page.evaluate(async () => {
    const G = game, T = (await import('./src/engine/textures.js')).textures(), h = G.hero.pos, P = G.physics, out = [];
    G.scene.updateMatrixWorld(true);
    G.scene.traverse((o) => {
      const m = o.material; if (!o.isMesh || !m || Array.isArray(m) || !m.map || !o.geometry) return;
      const kind = m.map.source === T.stone.source ? 'stone' : (m.map.image?.width === 128 && m.map.image?.height === 128 && m.metalness > 0.1 && m.roughness < 0.7) ? 'zrib' : null;
      if (!kind) return;
      o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), r = o.geometry.boundingSphere.radius;
      const d = Math.hypot(c.x - h.x, c.z - h.z); if (d > 120 || r > 30) return;
      out.push({ kind, x: c.x, y: c.y, z: c.z, r, d });
    });
    out.sort((a, b) => a.d - b.d);
    const pick = [];
    for (const k of ['stone', 'zrib']) for (const p of out.filter((q) => q.kind === k)) {
      if (pick.filter((q) => q.kind === k).length >= 2 || pick.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 15)) continue;
      // a place to stand 5 m off it, on the ground near its foot, toward where he is now
      let best = null; for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8, D = Math.min(p.r, 6) + 4, x = p.x + Math.sin(an) * D, z = p.z + Math.cos(an) * D, y = P.groundAt(x, z, p.y + 3);
        if (Math.abs(y - (p.y - Math.min(p.r, 3))) < 3.5 && (!best || Math.hypot(x - h.x, z - h.z) < best.dh)) best = { x, y, z, dh: Math.hypot(x - h.x, z - h.z) }; }
      if (best) pick.push({ kind: k, x: +p.x.toFixed(2), z: +p.z.toFixed(2), sx: +best.x.toFixed(2), sz: +best.z.toFixed(2) });
    }
    return pick;
  });
  fs.writeFileSync(SP, JSON.stringify(spots));
}
console.log('spots', JSON.stringify(spots));
for (const [i, p] of spots.entries()) {
  await page.evaluate((p) => { const G = game, h = G.hero; h.pos.set(p.sx, G.physics.groundAt(p.sx, p.sz), p.sz); h.angle = Math.atan2(p.x - p.sx, p.z - p.sz); G.camRig.snap?.(); }, p);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${SAVE}-${i}-${p.kind}-${TAG}.jpg`, type: 'jpeg', quality: 86 });
}
await browser.close(); server.close?.(); process.exit(0);
