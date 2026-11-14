// fixed-spot measurement: node perf.mjs <outdir> <tag>   (GAME_URL as the tests). 1280x720, quality high, new game.
// Each spot: placed like tests/lib/shots.mjs, 1.5 s settle, 3 warm-up renders, then 7 measured renders
// (renderer.info reset before each; render() wall time incl. gl.finish — SwiftShader, CPU-only, no GPU claim).
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a1c4957c846e50461/lba2-remaster/tests/lib/boot.mjs';
import fs from 'fs';
import path from 'path';
const [OUT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
await open(page, '?nocine'); await menu(page, 'new');
const SPOTS = [
  ['deck', { spaceport: 'landing' }],
  ['deck-wait', { x: -6.5, z: 36.5, a: 0, deckY: true }],
  ['bridge', { x: -30.5, z: 40, a: Math.PI / 2 }],
  ['square', { x: -42, z: -2, a: 0.6 }],
  ['quay', { x: -107, z: 37, a: -1.2 }],
  ['pier', { x: -116, z: 46, a: -1.6 }],
  ['lane', { x: -45.5, z: 52, a: Math.PI }],
  ['harbour-lane', { x: -80, z: 37, a: -1.5 }],
];
const results = {};
for (const [name, s0] of SPOTS) {
  const r = await page.evaluate(([name, s]) => {
    const G = game, h = G.hero, W = G.world;
    if (s.spaceport) { const L = W.spaceport.landing; s = { x: L.x, z: L.z, a: L.a }; }
    G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true);
    if (s.deckY) h.pos.y = W.spaceport.deck.y;
    h.angle = s.a; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.5);
    const R = G.renderer, info = R.renderer.info, gl = R.renderer.getContext();
    for (let i = 0; i < 3; i++) { info.reset(); R.render(); }
    gl.finish();
    const calls = [], tris = [], ms = [];
    for (let i = 0; i < 7; i++) { info.reset(); const t0 = performance.now(); R.render(); gl.finish(); ms.push(performance.now() - t0); calls.push(info.render.calls); tris.push(info.render.triangles); }
    R.render(); const img = R.canvas.toDataURL('image/jpeg', 0.86);
    ms.sort((a, b) => a - b);
    const pct = (p) => +ms[Math.min(ms.length - 1, Math.floor(p * ms.length))].toFixed(1);
    return { pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), calls: Math.max(...calls), callsMin: Math.min(...calls), tris: Math.max(...tris), ms50: pct(0.5), ms90: pct(0.9), geos: info.memory.geometries, texs: info.memory.textures, progs: info.programs.length, img };
  }, [name, s0]);
  results[name] = r;
  fs.writeFileSync(path.join(OUT, `${TAG}-${name}.jpg`), Buffer.from(r.img.split(',')[1], 'base64')); delete r.img;
  console.log(name, JSON.stringify(r));
}
const lt = await page.evaluate(() => game.loadTimes);
console.log('loadTimes', JSON.stringify(lt));
fs.writeFileSync(path.join(OUT, `${TAG}-perf.json`), JSON.stringify({ results, loadTimes: lt, ua: await page.evaluate(() => navigator.userAgent) }, null, 1));
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
