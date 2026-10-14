// REV-TY-3: dump Citadel's scattered vegetation (instanced meshes) and the physics colliders, to compare 0.25.0
// (f0cc0a7) with 0.25.1 (41363db). GAME_URL selects the build; OUT=<file.json>.
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
const d = await page.evaluate(() => {
  const G = game, inst = [];
  const m = new (G.scene.matrixWorld.constructor)();
  G.world.root?.updateMatrixWorld?.(true);
  G.scene.updateMatrixWorld(true);
  let id = 0;
  G.scene.traverse((o) => {
    if (!o.isInstancedMesh) return;
    // only the island's outdoor scatter (rooms are far away: |x| > 600)
    const key = (o.material?.name || '') + '|' + (o.material?.color?.getHexString?.() || '') + '|' + o.geometry.attributes.position.count;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m); m.premultiply(o.matrixWorld);
      const e = m.elements, s = Math.hypot(e[0], e[1], e[2]);
      const x = e[12], z = e[14];
      if (Math.abs(x) > 600 || Math.abs(z) > 600) continue;
      inst.push([key, +x.toFixed(2), +z.toFixed(2), +s.toFixed(4)]);
    }
    id++;
  });
  const cols = G.physics.colliders.map((c) => [c.type, +(c.x ?? 0).toFixed(2), +(c.z ?? 0).toFixed(2), +(c.r ?? c.hw ?? 0).toFixed(2), +(c.hd ?? 0).toFixed(2), +(c.top ?? 0).toFixed(2), c.room ? 1 : 0]).filter((c) => Math.abs(c[1]) < 600 && Math.abs(c[2]) < 600);
  const L = G.world.life;
  return { version: G.constructor?.VERSION, flowerBeds: G.world.flowerBeds, inst, cols, life: { pump: [L.pump.x, L.pump.z], shop: L.shop?.bench, beds: L.beds, garden: L.pond } };
});
fs.writeFileSync(process.env.OUT, JSON.stringify(d));
console.log('instances', d.inst.length, 'colliders', d.cols.length, 'flowerBeds', JSON.stringify(d.flowerBeds), errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
