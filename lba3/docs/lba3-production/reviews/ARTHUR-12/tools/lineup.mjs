import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// usage: node lineup.mjs <out.png> <query> [w h]   — renders lookdev.html?<query>; prints measurements
const [out, query, w = 1280, h = 720] = process.argv.slice(2);
const URL0 = process.env.GAME_URL || 'http://localhost:8176/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
let bad = 0; p.on('console', (m) => { if (m.type() === 'error') { bad++; console.log('console', m.text()); } });
await p.goto(URL0 + 'lookdev.html?' + query, { timeout: 180000 });
await p.waitForFunction(() => window.lookdev, null, { timeout: 180000 });
await p.waitForTimeout(500);
const m = await p.evaluate(async () => {
  const THREE = await import('three');
  window.lookdev.render();
  const out = [];
  for (const rig of window.lookdev.rigs) {
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root, true);
    const v = new THREE.Vector3();
    const wp = (o) => { o.getWorldPosition(v); return +v.y.toFixed(3); };
    const j = rig.j;
    const eye = j.eyes?.length ? wp(j.eyes[0]) : null;
    out.push({ top: +box.max.y.toFixed(3), eye, head: wp(j.head), neck: wp(j.neck), sh: wp(j.armL.sh), hand: wp(j.armL.hand), hips: wp(j.hips), knee: wp(j.legL.knee), scale: +rig.root.scale.y.toFixed(3) });
  }
  return out;
});
console.log(JSON.stringify(m));
await p.screenshot({ path: out });
await b.close();
if (bad) { console.log('BAD', bad); process.exit(3); }
