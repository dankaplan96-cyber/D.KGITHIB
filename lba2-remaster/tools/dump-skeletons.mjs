import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:8123/lookdev.html?c=twinsen&views=0&labels=0&props=0', { timeout: 180000 });
await p.waitForFunction(() => window.lookdev, null, { timeout: 180000 });
const r = await p.evaluate(async () => {
  const CH = await import('./src/game/characters.js'); const THREE = await import('three');
  const all = {};
  for (const name of Object.keys(CH.LOOKS)) {
    if (name === 'twinsenSculpt') continue;
    const L = CH.LOOKS[name];
    const rig = CH.createCharacter(name, { poly: null }); rig.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(rig.root.matrixWorld).invert();
    const out = {}; const v = new THREE.Vector3();
    rig.root.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); v.applyMatrix4(inv); out[o.name] = { p: [v.x, v.y, v.z].map((x) => +x.toFixed(4)), parent: o.parent?.isBone ? o.parent.name : null }; } });
    all[name] = { bones: out, armSpread: rig.armSpread, height: rig.height, look: L };
  }
  return all;
});
console.log(JSON.stringify(r)); await b.close(); // usage: node tools/dump-skeletons.mjs > skeletons.json (server on :8123)
