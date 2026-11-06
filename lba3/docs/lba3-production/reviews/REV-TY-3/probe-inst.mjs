// REV-TY-3: what instanced object stands at (-42.9, 65.5), 0.5 m from where Twinsen works the pump's handle?
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
console.log(JSON.stringify(await page.evaluate(() => { const out = []; game.scene.updateMatrixWorld(true);
  game.scene.traverse((o) => { if (!o.isInstancedMesh) return; const m = new o.matrixWorld.constructor(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); const e = m.elements; if (Math.hypot(e[12] + 42.9, e[14] - 65.5) < 0.3) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; out.push({ name: o.name, parent: o.parent?.name, verts: o.geometry.attributes.position.count, y: +e[13].toFixed(2), s: +Math.hypot(e[0], e[1], e[2]).toFixed(2), bbox: [b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2))], mat: o.material?.type, color: o.material?.color?.getHexString(), visible: o.visible }); } } });
  return { out, ground: game.physics.terrain.heightAt(-42.9, 65.5) }; }), null, 1));
await browser.close();
