// SD-3 fixed-spot measurement in the Hamalayi: node perf.mjs <outdir> <tag>   (GAME_URL as the tests).
// 1280x720, quality high (default), new game. Each spot: enterRoom at the spot, 2.0 s game step (as tests/lib/shots.mjs),
// 3 warm-up renders, then 7 measured renders: renderer.info reset before each; render() wall time to return
// ("submit", CPU side of three + ANGLE) and to gl.finish() ("total"). SwiftShader = CPU rasteriser: no GPU claim.
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a5c22898755b8fc79/lba2-remaster/tests/lib/boot.mjs';
import fs from 'fs';
import path from 'path';
const [OUT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
await open(page, '?nocine'); await menu(page, 'new');
// spots from the region's contract (world coords); the same expressions for both builds
const SPOTS = [
  ['landing', 'R.landing', 0, 0, null],
  ['lhar', 'R.lhar', 0, 6, Math.PI],
  ['lift', 'R.lift.bottom', 0, 1.5, Math.PI],
  ['monastery', 'R.monastery.yard', 0, 4, Math.PI],
  ['observatory', 'R.observatory', 0, 7, Math.PI],
];
const results = {};
for (const [name, expr, dx, dz, a] of SPOTS) {
  const r = await page.evaluate(([expr, dx, dz, a]) => {
    const G = game, h = G.hero, R = G.rooms.hamalayi;
    const q = expr.split('.').slice(1).reduce((o, k) => o[k], R);
    const s = { x: q.x + dx, z: q.z + dz, a: a ?? q.a ?? Math.PI };
    G.enterRoom('hamalayi', s, true, true);
    h.angle = s.a; G.camRig.lba && (G.camRig.lba.init = false); G.step(2.0);
    const Rn = G.renderer, info = Rn.renderer.info, gl = Rn.renderer.getContext();
    for (let i = 0; i < 3; i++) { info.reset(); Rn.render(); }
    gl.finish();
    const calls = [], tris = [], sub = [], tot = [];
    for (let i = 0; i < 7; i++) { info.reset(); const t0 = performance.now(); Rn.render(); const t1 = performance.now(); gl.finish(); const t2 = performance.now(); sub.push(t1 - t0); tot.push(t2 - t0); calls.push(info.render.calls); tris.push(info.render.triangles); }
    Rn.render(); const img = Rn.canvas.toDataURL('image/jpeg', 0.86);
    const pct = (arr, p) => { const s2 = [...arr].sort((x, y) => x - y); return +s2[Math.min(s2.length - 1, Math.floor(p * s2.length))].toFixed(1); };
    // the region's static content: meshes and triangles in the hamalayi group
    let meshes = 0, gtris = 0, inst = 0;
    R.group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; const c = o.isInstancedMesh ? o.count : 1; gtris += n * c; if (o.isInstancedMesh) inst++; } });
    return { pos: [h.pos.x - 4300, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), calls: Math.max(...calls), callsMin: Math.min(...calls), tris: Math.max(...tris), submit50: pct(sub, 0.5), submit90: pct(sub, 0.9), total50: pct(tot, 0.5), total90: pct(tot, 0.9), geos: info.memory.geometries, texs: info.memory.textures, progs: info.programs.length, regionMeshes: meshes, regionInstanced: inst, regionTris: Math.round(gtris), quality: Rn.quality, img };
  }, [expr, dx, dz, a]);
  results[name] = r;
  fs.writeFileSync(path.join(OUT, `${TAG}-${name}.jpg`), Buffer.from(r.img.split(',')[1], 'base64')); delete r.img;
  console.log(name, JSON.stringify(r));
}
const lt = await page.evaluate(() => game.loadTimes);
console.log('loadTimes', JSON.stringify(lt));
fs.writeFileSync(path.join(OUT, `${TAG}-perf.json`), JSON.stringify({ results, loadTimes: lt, ua: await page.evaluate(() => navigator.userAgent) }, null, 1));
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
