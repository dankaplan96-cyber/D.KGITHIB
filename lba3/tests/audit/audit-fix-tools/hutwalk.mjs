// P57: walks round the station's huts (Follow, the tests' setup), every frame the camera's sight test and a ray from the
// camera to his head and chest against the drawn scene; a picture at the first frame each walk hides him for 0.5 s
// node hutwalk.mjs <out-prefix>
import { launch, open, menu, done } from '/dev/shm/t983/tests/lib/boot.mjs';
const out = process.argv[2];
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: '/dev/shm/t983/tests/lib/camwalk.js' });
await page.evaluate(async () => {
  CW.setup();
  const THREE = await import('three');
  const ray = new THREE.Raycaster(); ray.camera = game.camera;
  window.__hid = () => {
    const G = game, h = G.hero, cam = G.camera; G.scene.updateMatrixWorld(true);
    const people = [h.rig.root, ...G.npcs.map((n) => n.rig?.root).filter(Boolean)];
    const inRig = (o) => people.some((q) => { for (let a = o; a; a = a.parent) if (a === q) return true; return false; });
    const shown = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return false; return true; };
    const hit = (hy) => { const p = new THREE.Vector3(h.pos.x, h.pos.y + hy, h.pos.z), d = p.clone().sub(cam.position), L = d.length(); ray.set(cam.position, d.normalize()); ray.near = 0.05; ray.far = L - 0.3;
      for (const r of ray.intersectObjects(G.scene.children, true)) { const o = r.object; if (!o.isMesh || o.isSkinnedMesh || !shown(o) || inRig(o) || /grass|flower|sky|water|sea|shadow|tulip/i.test(o.name || '')) continue; const m = [o.material].flat()[0]; if (m && m.transparent && (m.opacity ?? 1) < 0.98) continue; return r.point.toArray().map((v) => +v.toFixed(1)); } return null; };
    const a = hit(1.5), b = hit(1.0);
    return a && b ? a : null;
  };
});
const ROUTES = {
  alleyN: [[-28.95, -53.8], [-28.95, -62]],
  frontsW: [[-19.6, -63.5], [-38.5, -59.5]],
  frontsE: [[-38.5, -59.5], [-19.6, -63.5]],
  eastS: [[-22.0, -62], [-22.0, -54], [-22.5, -52.5]],
  westS: [[-37.0, -62], [-37.0, -54], [-36.5, -52.5]],
  boreToOffice: [[-24.5, -66.0], [-32.8, -58.9]],
};
for (const [name, pts] of Object.entries(ROUTES)) {
  const r = await page.evaluate(async ({ pts }) => {
    const G = game; CW.place({ x: pts[0][0], z: pts[0][1], a: Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) }); G.step(1.5);
    let hidT = 0, worst = null, frames = 0, hidFrames = 0, camHid = 0;
    for (const [x, z] of pts.slice(1)) {
      P.go(x, z, { tol: 0.6, maxT: 40, stopWhen: () => { frames++; const cs = G.camRig._sees(G.camera.position, G.hero.pos); const hd = !cs; if (!cs) camHid++; if (hd) { hidFrames++; hidT += 1 / 30; if (hidT > 0.5 && !worst) { const c = G.camera.position; worst = { at: [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(2)), cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), hit: hd, camSees: cs }; return true; } } else hidT = 0; return false; } });
      if (worst) break;
    }
    if (!worst) { for (let i = 0; i < 90; i++) { G.step(1 / 30); const hd = !G.camRig._sees(G.camera.position, G.hero.pos); if (hd) { hidT += 1 / 30; if (hidT > 0.5) { const c = G.camera.position; worst = { standing: true, at: [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(2)), cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), hit: hd }; break; } } else hidT = 0; } }
    G.renderer.render();
    return { frames, hidFrames, camHid, worst };
  }, { pts });
  console.log(name, JSON.stringify(r));
  if (r.worst) await page.screenshot({ path: `${out}-${name}.png`, timeout: 180000 });
}
done();
await browser.close();
