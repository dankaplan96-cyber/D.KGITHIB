// mergeStatic's PERF-IGPU options and the Kit colour merge (no game boot: the modules on their own).
//   1. recolor: six plain-coloured parts in two colours merge into one vertex-coloured mesh with the right colours;
//      a textured part, an emissive part and a part marked keep stay as they are
//   2. cell: a 60 m long group merged with cell 20 gives one mesh per cell
//   3. Kit: MAT.flat / MAT.paint colours merge into one mesh per kind, MAT.glow keeps its own
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)); };
// a blank page on the game's origin, with its import map
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + 'ASSET_MANIFEST.md');
await page.setContent(`<script type="importmap">{ "imports": { "three": "${(process.env.GAME_URL || 'http://localhost:8123/')}vendor/three/build/three.module.min.js" } }</script>`);
const base = process.env.GAME_URL || 'http://localhost:8123/';
const r = await page.evaluate(async (base) => {
  const THREE = await import('three');
  const { mergeStatic } = await import(base + 'src/engine/merge.js');
  const out = {};
  {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: '#ff0000', roughness: 0.6 }), blue = new THREE.MeshStandardMaterial({ color: '#0000ff', roughness: 0.6 });
    const tex = new THREE.MeshStandardMaterial({ map: new THREE.Texture() }), glow = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ff0000' });
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i % 2 ? red : blue); m.position.x = i * 2; g.add(m); }
    for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), tex); t.position.z = 3 + i; g.add(t); }
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glow));
    const kept = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), red); kept.userData.keep = true; g.add(kept);
    mergeStatic(g, { recolor: true });
    const meshes = g.children.filter((o) => o.isMesh);
    const vc = meshes.find((m) => m.material.vertexColors);
    const col = vc?.geometry.attributes.color;
    const seen = new Set(); if (col) for (let i = 0; i < col.count; i++) seen.add([col.getX(i), col.getY(i), col.getZ(i)].map((v) => v.toFixed(2)).join(','));
    out.recolor = { meshes: meshes.length, vcVerts: vc?.geometry.attributes.position.count, colours: [...seen], keptStays: g.children.includes(kept) && kept.material === red, glowStays: meshes.some((m) => m.material === glow), texMerged: meshes.filter((m) => m.material === tex).length };
  }
  {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial();
    for (let x = 0; x < 60; x += 2) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m); b.position.x = x + 0.5; g.add(b); }
    mergeStatic(g, { cell: 20 });
    out.cell = g.children.filter((o) => o.isMesh).length;
  }
  {
    const P = await import(base + 'src/game/props.js');
    const g = new THREE.Group(), k = new P.Kit(g);
    for (const c of ['#ff0000', '#00ff00', '#0000ff']) k.add(P.rbox(0.5, 0.5, 0.5), P.MAT.flat(c, 0.7), 0, 0, 0);
    for (const c of ['#ff0000', '#00ff00']) k.add(P.rbox(0.5, 0.5, 0.5), P.MAT.paint(c, 0.5), 1, 0, 0);
    k.add(P.rbox(0.5, 0.5, 0.5), P.MAT.glow('#fff', '#f80'), 2, 0, 0);
    k.flush();
    out.kit = g.children.map((m) => [m.material.vertexColors, !!m.material.map, m.material.emissive.getHexString()]);
  }
  return out;
}, base);
check('recolor: 6 parts in 2 colours → one vertex-coloured mesh holding both colours; textured parts merge by material; emissive and keep stay', r.recolor.vcVerts === 6 * 24 && r.recolor.colours.length === 2 && r.recolor.keptStays && r.recolor.glowStays && r.recolor.texMerged === 1 && r.recolor.meshes === 4, r.recolor);
check('cell: a 60 m group merged per 20 m cell → 3 meshes', r.cell === 3, r.cell);
check('Kit: flat colours → 1 mesh, painted colours → 1 mesh, the glow keeps its own (3 meshes)', r.kit.length === 3 && r.kit.filter((x) => x[0]).length === 2, r.kit);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails || errs.length ? 1 : 0);
