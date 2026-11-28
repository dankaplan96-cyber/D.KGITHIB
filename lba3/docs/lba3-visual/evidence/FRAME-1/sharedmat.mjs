// FRAME-1: materials shared between kinds of mesh (instanced / batched / skinned / plain). three.js keeps one program
// per material, so a material drawn by both an InstancedMesh and a plain Mesh switches program on every draw that
// alternates (getParameters + a program-key string each time, then the uniforms re-sent).
//   GAME_URL=http://localhost:8171/ node sharedmat.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
const r = await page.evaluate(() => {
  const by = new Map();
  game.scene.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (!by.has(m)) by.set(m, []); by.get(m).push(o); } });
  const kind = (o) => (o.isBatchedMesh ? 'batched' : o.isInstancedMesh ? 'instanced' : o.isSkinnedMesh ? 'skinned' : 'plain');
  const path = (o) => { const p = []; for (let x = o; x && x !== game.scene; x = x.parent) p.push(x.name || x.type); return p.slice(0, 5).join(' < '); };
  const src = (o) => { for (let x = o; x; x = x.parent) if (x.userData.src) return x.userData.src; return '?'; };
  const out = [];
  for (const [m, list] of by) {
    const kinds = new Set(list.map(kind));
    if (kinds.size > 1) out.push({ id: m.id, type: m.type, color: m.color?.getHexString(), kinds: [...kinds], meshes: list.length, examples: list.slice(0, 5).map((o) => `${kind(o)} ${path(o)} (built by ${src(o)})`) });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
