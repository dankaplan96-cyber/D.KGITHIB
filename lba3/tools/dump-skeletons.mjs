import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
// usage: node tools/dump-skeletons.mjs > skeletons.json                      (every look; server on :8123)
//        node tools/dump-skeletons.mjs baldino art/characters/skeletons.json  (one look, merged into the file; SRC-2)
//        GAME_URL=http://127.0.0.1:8199/ … (another server)
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const [ONLY, FILE] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto(URL0 + 'lookdev.html?c=twinsen&views=0&labels=0&props=0', { timeout: 180000 });
await p.waitForFunction(() => window.lookdev, null, { timeout: 180000 });
const r = await p.evaluate(async (only) => {
  const CH = await import('./src/game/characters.js'); const THREE = await import('three');
  const all = {};
  for (const name of Object.keys(CH.LOOKS)) {
    if (name === 'twinsenSculpt' || (only && name !== only)) continue;
    const L = CH.LOOKS[name];
    const rig = CH.createCharacter(name, { poly: null }); rig.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(rig.root.matrixWorld).invert();
    const out = {}; const v = new THREE.Vector3();
    rig.root.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); v.applyMatrix4(inv); out[o.name] = { p: [v.x, v.y, v.z].map((x) => +x.toFixed(4)), parent: o.parent?.isBone ? o.parent.name : null }; } });
    all[name] = { bones: out, armSpread: rig.armSpread, height: rig.height, look: L };
  }
  return all;
}, ONLY || null);
await b.close();
if (ONLY) {
  const file = FILE || 'art/characters/skeletons.json';
  const all = JSON.parse(fs.readFileSync(file, 'utf8'));
  all[ONLY] = r[ONLY];
  fs.writeFileSync(file, JSON.stringify(all));
  console.error('merged', ONLY, 'into', file);
} else console.log(JSON.stringify(r));
