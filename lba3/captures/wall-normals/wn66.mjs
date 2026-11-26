// ORDER 67 WALL-NORMALS: pictures of the walls, off and on (?wallnormals=...), in the morning and at golden hour, from
// the play camera (Follow, Far, Twinsen by the wall) and close up along the wall's face; and one frame's draw calls in each
// play view (a count, not a timing). usage: node wn66.mjs <OUT> <lba3 ROOT> "<query>" <tag> [view,view]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT, Q = '', TAG = 'off', ONLY] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
// [name, hero x, z, facing, close camera [x, y, z] → [x, y, z] (y over the ground there)]
const VIEWS = [
  ['stairwall', -66.5, 1.5, -1.5708, [-69.7, 1.5, 1.2], [-71.3, 1.3, 7.5]],          // fortStone: the inland wall by the flight
  ['seawall', -73.7, 2, -1.5708, [-79.5, 4.6, -4], [-76.1, 4.2, 4]],                 // fortStone: the sea wall from the water's side (y absolute)
  ['fort', -36.5, -59.5, -2.2, [-37.6, 1.6, -57.6], [-40.4, 1.7, -63.5]],             // fortStone: the station's walls
  ['twinsenhouse', -44.2, 79.8, -1.5708, [-43.4, 1.6, 74.2], [-46.95, 1.4, 79.8]],   // rubbleHouse: Twinsen's house
  ['nbrhouse', -29.5, 75.3, -1.5708, [-28.8, 1.6, 71.2], [-31.1, 1.4, 75.3]],          // rubbleHouse: the neighbours'
  ['nbrwest', -39.5, 75.3, 1.5708, [-38.8, 1.6, 71.0], [-36.1, 1.4, 75.3]],             // rubbleHouse: the neighbours' sunlit west wall
].filter((v) => !ONLY || ONLY.split(',').includes(v[0]));
const ABS = new Set(['seawall']);
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(server.url + (Q ? Q + '&' : '?') + 'weather=1&nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(900);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 120 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.flags.pr_tut2 = false; if (G.room) G.exitRoom({ x: -42, z: 0, a: 0 }, true); G.step(0.5); G.testFreeze = false;
  const C = G.camRig; C.setMode('follow'); C.setFollowDistance?.('far'); });
const info = await page.evaluate(() => { const W = game.weather; return { weather: !!W, keys: W ? Object.keys(W).slice(0, 30) : [] }; });
console.log('weather', JSON.stringify(info));
const setPhase = (ph) => page.evaluate((ph) => { const W = game.weather; if (!W) return 'no weather';
  const P = W.P || W.planets || W.state || {}; let n = 0; for (const k in P) if (P[k] && 'phase' in P[k]) { P[k].phase = ph; P[k].pinned = true; n++; }
  try { W.force?.('clear'); } catch {} return n; }, ph);
const counts = {};
console.log('materials with a normal map:', await page.evaluate(() => { const S = new Set(); game.scene.traverse((o) => { const m = o.material; if (m && !Array.isArray(m) && m.normalMap) S.add(m.normalMap.name || 'n'); }); return [...S].join(',') || 'none'; }));
for (const [light, ph] of [['morning', 0.04], ['golden', 0.79]]) {
  console.log('phase set', light, await setPhase(ph));
  for (const [name, hx, hz, ha, cam, look] of VIEWS) {
    await page.evaluate(({ hx, hz, ha }) => { const G = game, h = G.hero; G.testFreeze = false; h.pos.set(hx, G.physics.groundAt(hx, hz), hz); h.angle = ha; G.camRig.snap?.(); }, { hx, hz, ha });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${OUT}/${name}-${light}-play-${TAG}.jpg`, type: 'jpeg', quality: 88 });
    if (light === 'morning') counts[name] = await page.evaluate(() => { const G = game, R = G.renderer.renderer; G.perf?.beginFrame?.(); G.renderer.render(); return R.info.render.calls + (G.perf?.sub || 0); });
    await page.evaluate(({ cam, look, abs }) => { const G = game; G.testFreeze = true; const g = (x, z) => (abs ? 0 : G.physics.groundAt(x, z)), Cm = G.camera;
      Cm.position.set(cam[0], g(cam[0], cam[2]) + cam[1], cam[2]); Cm.lookAt(look[0], g(look[0], look[2]) + look[1], look[2]); Cm.updateMatrixWorld(); G.renderer.render(); }, { cam, look, abs: ABS.has(name) });
    await page.screenshot({ path: `${OUT}/${name}-${light}-close-${TAG}.jpg`, type: 'jpeg', quality: 90 });
    await page.evaluate(() => { game.testFreeze = false; });
  }
}
fs.writeFileSync(`${OUT}/drawcalls-${TAG}.json`, JSON.stringify(counts));
console.log('draw calls', TAG, JSON.stringify(counts));
console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
