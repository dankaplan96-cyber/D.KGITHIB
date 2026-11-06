// Upper bound of finer culling: of the triangles drawn in the main pass (plain meshes) and the shadow pass (shadow
// batches), how many are themselves in the view frustum (main) / could cast into it (shadow, per-triangle swept test).
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const r = await ev(async () => {
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer, cam = G.camera;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const fr = new THREE.Frustum(), M = new THREE.Matrix4(), v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), s = new THREE.Sphere();
  const sun = G.env.sunDir, horiz = Math.hypot(sun.x, sun.z), slope = horiz / sun.y;
  const res = { main: { drawn: 0, inView: 0, byCell: {} }, shadow: { drawn: 0, inBox: 0, reach: 0 } };
  let rec = false; const rbd = R.renderBufferDirect;
  const shadowFr = new THREE.Frustum();
  R.renderBufferDirect = function (camera, scene, g, mat, o, grp) {
    if (rec && !o.isInstancedMesh && !o.isBatchedMesh && !o.isSkinnedMesh && g.attributes.position) {
      const P = g.attributes.position, I = g.index, n = Math.floor((I ? I.count : P.count) / 3);
      const W = o.matrixWorld;
      let inn = 0, box = 0;
      for (let t = 0; t < n; t++) {
        a.fromBufferAttribute(P, I ? I.getX(3 * t) : 3 * t).applyMatrix4(W); b.fromBufferAttribute(P, I ? I.getX(3 * t + 1) : 3 * t + 1).applyMatrix4(W); c.fromBufferAttribute(P, I ? I.getX(3 * t + 2) : 3 * t + 2).applyMatrix4(W);
        s.center.copy(a).add(b).add(c).multiplyScalar(1 / 3); s.radius = Math.sqrt(Math.max(s.center.distanceToSquared(a), s.center.distanceToSquared(b), s.center.distanceToSquared(c)));
        if (scene !== null) { if (fr.intersectsSphere(s)) inn++; }
        else {
          if (shadowFr.intersectsSphere(s)) box++;
          // swept down-sun by the height above ground (+2 m)
          const gy = G.physics.groundAt?.(s.center.x, s.center.z, s.center.y + 1) ?? 0;
          const h = Math.max(0, s.center.y + s.radius - gy) + 2, len = h * slope;
          const sw = new THREE.Sphere(new THREE.Vector3(s.center.x - (sun.x / horiz) * len * 0.5, s.center.y - h * 0.5, s.center.z - (sun.z / horiz) * len * 0.5), s.radius + Math.hypot(len, h) * 0.5);
          if (shadowFr.intersectsSphere(s) && fr.intersectsSphere(sw)) inn++;
        }
      }
      if (scene !== null) { res.main.drawn += n; res.main.inView += inn; }
      else if (o.name === 'shadowBatch') { res.shadow.drawn += n; res.shadow.inBox += box; res.shadow.reach += inn; }
    }
    return rbd.call(this, camera, scene, g, mat, o, grp);
  };
  let frames = 0;
  for (let i = 0; i < 225; i++) {
    const dt = 1 / 30; route.drive((i + 1) * dt, dt);
    const draw = i * dt >= 1.5 && i % 12 === 0;
    if (draw) {
      cam.updateMatrixWorld(); fr.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const sc = G.env.sun.shadow.camera; G.env.sun.shadow.updateMatrices(G.env.sun); sc.updateMatrixWorld();
      shadowFr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse));
      rec = true; G.frame(dt, true); rec = false; frames++;
    } else G.frame(dt, false);
  }
  R.renderBufferDirect = rbd;
  for (const k of ['drawn', 'inView']) res.main[k] = Math.round(res.main[k] / frames);
  for (const k of ['drawn', 'inBox', 'reach']) res.shadow[k] = Math.round(res.shadow[k] / frames);
  return res;
});
console.log(JSON.stringify(r));
await browser.close();
