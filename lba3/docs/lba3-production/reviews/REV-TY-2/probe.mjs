// REV-TY-2 probe (read-only, ISO: no progression claims): is the "no line of sight" rule visible in the geometry?
// Rays from relay A's lamp to relay B's lamp with the hoist down and up; what is in the way. Then the workshop at
// 1920x1080 and 960x540 from the door (normal camera) for readability. LOAD = a save in the workshop.
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
const DIR = path.dirname(new URL(import.meta.url).pathname);
for (const [w, h] of [[1920, 1080], [960, 540]]) {
  const { browser, page } = await launch({ storageState: process.env.LOAD, width: w, height: h });
  await open(page, '?nocine'); await menu(page, 'continue');
  const r = await page.evaluate(async () => {
    P.settle();
    const THREE = await import('three');
    const R = game.rooms.workshop; const out = {};
    const meshes = []; const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    game.scene.traverse((o) => { if (o.isMesh && shown(o)) meshes.push(o); });
    const rc = new THREE.Raycaster(); rc.camera = game.camera;
    const A = new THREE.Vector3(1500 - 2.83, 1.41, 3.13);
    for (const [n, y] of [['low', 0.32 + 0.02 + 0.55], ['high', 1.32 + 0.02 + 0.55]]) {
      const B = new THREE.Vector3(1500 + 3.17 - 0.11, y, 0.6), d = B.clone().sub(A), L = d.length(); d.normalize();
      rc.set(A.clone().addScaledVector(d, 0.25), d); rc.far = L - 0.5;
      const hits = rc.intersectObjects(meshes, false).filter((x) => !x.object.material?.transparent);
      out[n] = hits.slice(0, 4).map((x) => [x.object.geometry?.type, ...[x.point.x - 1500, x.point.y, x.point.z].map((v) => +v.toFixed(2))]);
    }
    return { room: game.room?.id, lift: R.life.lift, out };
  });
  console.log(w + 'x' + h, JSON.stringify(r));
  await page.evaluate(() => { game.step(1 / 30); game.renderer.render(); });
  await page.screenshot({ path: path.join(DIR, 'shots', `probe-${w}.png`) });
  await browser.close();
}
