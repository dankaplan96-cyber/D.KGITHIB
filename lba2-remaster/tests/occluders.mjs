// VP-10: Citadel's houses and Twinsen, from the default play camera (src/engine/occlude.js, src/engine/camera.js).
//  (a) a house he stands next to or in front of never vanishes: at every house's door, facing out (the camera over
//      the house) and facing in (the camera in front), none of that house's meshes is drawn see-through or as
//      nothing (no fader is left; the check guards against one coming back)
//  (b) a house between the camera and him never leaves him covered: behind six houses, from a fresh shot (the
//      camera rises over the house, as LBA2's SearchCameraPos) and while he walks round behind a house in a still
//      shot (every 0.3 s), his head, chest and feet are each either in view (no opaque mesh on the ray from the camera) or drawn
//      by the silhouette pass (the frame with the silhouette differs from the frame without it at that pixel)
// SHOTS=<dir> keeps a screenshot of each kind of case. GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const { check, done } = checker();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
const SHOTS = process.env.SHOTS;
const snap = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.jpg'), type: 'jpeg', quality: 78 }); };

await ev(async () => {
  const THREE = await import('three');
  const G = game, W = G.world;
  const isHero = (o) => { for (let a = o; a; a = a.parent) if (a === G.hero.rig.root) return true; return false; };
  const shown = (m) => m.visible !== false && m.colorWrite !== false && !(m.transparent && (m.opacity ?? 1) < 0.98);
  // the meshes of a house: their bounds' centres inside its footprint, above its ground
  window.__houseMeshes = (h) => { const out = [], c = new THREE.Vector3();
    W.root.traverse((o) => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      c.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld); const dx = c.x - h.x, dz = c.z - h.z;
      const lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
      if (Math.abs(lx) < h.w / 2 + 0.6 && Math.abs(lz) < h.d / 2 + 0.6 && c.y > h.g + 0.5 && o.geometry.boundingSphere.radius < Math.max(h.w, h.d)) out.push(o); });
    return out; };
  window.__houseState = (h) => { const ms = window.__houseMeshes(h); let hidden = 0, faded = 0;
    for (const o of ms) { if (o.userData.shadowProxy) continue; const mats = [o.material].flat();   // (shadowcull.js's shadow casters stand in for shown meshes)
      if (!o.visible || mats.every((m) => m.colorWrite === false || m.visible === false)) hidden++; else if (mats.some((m) => m.transparent && m.opacity < 0.98 && !m.userData.alwaysTransparent)) faded++; }
    return { meshes: ms.length, hidden, faded }; };
  // head, chest, feet: in view, or drawn by the silhouette pass
  const ray = new THREE.Raycaster(); ray.camera = G.camera;
  const read = () => { G.renderer.render(); const c = G.renderer.renderer.domElement, o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.drawImage(c, 0, 0); return { d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; };
  window.__points = () => {
    const h = G.hero, cam = G.camera, sil = h.rig.silhouette; cam.updateMatrixWorld();
    const A = read(); sil.visible = false; const B = read(); sil.visible = true;
    const out = [];
    for (const [name, hy] of [['head', 1.6], ['chest', 1.0], ['feet', 0.15]]) {
      const p = new THREE.Vector3(h.pos.x, h.pos.y + hy, h.pos.z), dir = p.clone().sub(cam.position), L = dir.length(); dir.normalize();
      ray.set(cam.position, dir); ray.far = L - 0.12;
      let hit = ray.intersectObjects(W.root.children.filter((o) => o !== W.terrain.mesh), true).find((r) => r.object.visible && !r.object.isSprite && !r.object.isPoints && !isHero(r.object) && [r.object.material].flat().some(shown));
      if (!hit) for (let k = 1; k < 40; k++) { const q = cam.position.clone().lerp(p, k / 40); if (W.terrain.heightAt(q.x, q.z) > q.y + 0.05) { hit = { object: { name: 'terrain' }, point: q }; break; } }
      const s = p.clone().project(cam), px = Math.round((s.x + 1) / 2 * A.w), py = Math.round((1 - s.y) / 2 * A.h);
      let diff = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= A.w || y >= A.h) continue; const i = (y * A.w + x) * 4; diff = Math.max(diff, Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2])); }
      const onScreen = Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1 && s.z < 1;
      out.push({ name, onScreen, inView: !hit, by: hit ? (hit.object.name || hit.object.parent?.name || '?') + '@' + hit.point.y.toFixed(1) : null, sil: diff > 24, ok: onScreen && (!hit || diff > 24) });
    }
    return out;
  };
  window.__place = (s) => { G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); G.step(0.5); G.hero.angle = s.a; G.camRig.lba.init = false; G.step(1.2); };
});

// (a) at every house's door
const houses = await ev(() => game.world.houses.map((h) => h.id));
for (const id of houses) {
  for (const facing of ['out', 'in']) {
    const r = await ev(([id, facing]) => { const h = game.world.houses.find((q) => q.id === id); const a = Math.atan2(h.door.x - h.x, h.door.z - h.z);
      const s = { x: h.door.x + Math.sin(a) * 0.5, z: h.door.z + Math.cos(a) * 0.5, a: facing === 'out' ? a : a + Math.PI };
      window.__place(s); return { st: window.__houseState(h) }; }, [id, facing]);
    check(`(a) at the ${id} house's door facing ${facing}: the house stays drawn whole (${r.st.meshes} meshes)`, r.st.meshes > 0 && r.st.hidden === 0 && r.st.faded === 0, r);
    if (id === 'twinsen' && facing === 'out') await snap('test-a-door-twinsen-out');
  }
}

// (b1) behind six houses, a fresh shot behind him (the camera over the house)
for (const id of ['bug', 'stone', 'south', 'pink', 'shop', 'twinsen']) {
  const r = await ev((id) => { const h = game.world.houses.find((q) => q.id === id); const a = h.ry + Math.PI; const rr = h.d / 2 + 1.6;
    window.__place({ x: h.x + Math.sin(a) * rr, z: h.z + Math.cos(a) * rr, a }); const c = game.camera.position, p = game.hero.pos;
    return { pitch: +(Math.atan2(c.y - p.y, Math.hypot(c.x - p.x, c.z - p.z)) * 57.3).toFixed(1), st: window.__houseState(h), pts: window.__points() }; }, id);
  check(`(b) behind the ${id} house, a fresh shot: head, chest and feet in view or under the silhouette; the house drawn whole`, r.pts.every((p) => p.ok) && r.st.hidden === 0 && r.st.faded === 0, r);
  if (id === 'south') await snap('test-b-behind-south-fresh-shot');
}

// (b2) walking round behind a house in a still shot (from in front of it to 2.2 m behind it), checked every 0.3 s
await ev(`window.__drive = (tx, tz, tol = 0.6) => { const p = P.plan(tx, tz, { tol: 0.4 }); window.__D = { pts: p.pts, wi: 1, tx, tz, tol }; return p.ok; };
window.__driveStep = (dt = 1 / 15) => { const D = window.__D, h = game.hero, k = game.input.keys, norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  k.delete('ArrowLeft'); k.delete('ArrowRight'); k.delete('ArrowUp');
  if (D && Math.hypot(h.pos.x - D.tx, h.pos.z - D.tz) > D.tol) {
    while (D.wi < D.pts.length - 1 && Math.hypot(D.pts[D.wi].x - h.pos.x, D.pts[D.wi].z - h.pos.z) < 0.45) D.wi++;
    const w = D.pts[Math.min(D.wi, D.pts.length - 1)]; const diff = norm(Math.atan2(w.x - h.pos.x, w.z - h.pos.z) - h.angle);
    if (diff > 0.1) k.add('ArrowLeft'); else if (diff < -0.1) k.add('ArrowRight');
    if (Math.abs(diff) < 0.32) k.add('ArrowUp');
  }
  game.step(dt); };`);
let silShot = false;
for (const id of ['bug', 'stone', 'south']) {
  const r = await ev((id) => { const h = game.world.houses.find((q) => q.id === id); const a = h.ry;
    window.__place({ x: h.x + Math.sin(a) * (h.d / 2 + 6), z: h.z + Math.cos(a) * (h.d / 2 + 6), a: a + Math.PI });
    window.__drive(h.x - Math.sin(a) * (h.d / 2 + 2.2), h.z - Math.cos(a) * (h.d / 2 + 2.2), 0.9);
    const bad = [], frames = []; let direct = 0, silhouette = 0, n = 0;
    for (let i = 0; i < 40; i++) { window.__driveStep(0.1); window.__driveStep(0.1); window.__driveStep(0.1);
      const pts = window.__points(); n++; const st = window.__houseState(h);
      for (const p of pts) { if (!p.ok) bad.push({ i, ...p, pos: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(1)) }); else if (p.inView) direct++; else silhouette++; }
      if (st.hidden || st.faded) bad.push({ i, house: st });
      if (pts.some((p) => !p.inView && p.sil)) frames.push(i);
      if (Math.hypot(game.hero.pos.x - window.__D.tx, game.hero.pos.z - window.__D.tz) < 0.9) break; }
    P.release();
    return { n, direct, silhouette, bad: bad.slice(0, 6), silFrames: frames.slice(0, 8), end: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(1)) }; }, id);
  check(`(b) walking round behind the ${id} house in a still shot: every 0.3 s his head, chest and feet in view or under the silhouette (${r.direct} in view, ${r.silhouette} by silhouette)`, r.bad.length === 0 && r.n > 3, r);
  if (!silShot && r.silFrames.length) {
    // replay to the first frame he was drawn by the silhouette, for the evidence
    silShot = true;
    await ev(([id, k]) => { const h = game.world.houses.find((q) => q.id === id); const a = h.ry;
      window.__place({ x: h.x + Math.sin(a) * (h.d / 2 + 6), z: h.z + Math.cos(a) * (h.d / 2 + 6), a: a + Math.PI });
      window.__drive(h.x - Math.sin(a) * (h.d / 2 + 2.2), h.z - Math.cos(a) * (h.d / 2 + 2.2), 0.9);
      for (let i = 0; i <= k; i++) { window.__driveStep(0.1); window.__driveStep(0.1); window.__driveStep(0.1); } P.release(); }, [id, r.silFrames[0]]);
    await snap(`test-b-walk-${id}-silhouette`);
    await ev(() => { game.step(1.5); });
    await snap(`test-b-walk-${id}-after-new-shot`);
  }
}
// (b3) the remaster's rise over a house (CTRL-1's follow + VP-10's pitch): eased like CTRL-1's swing behind a wall —
// recorded every 1/60 s while he walks round behind the south house: camera acceleration and view turn rate
const rise = await ev(() => {
  const G = game, h = G.world.houses.find((q) => q.id === 'south'), a = h.ry, C = G.camRig;
  window.__place({ x: h.x + Math.sin(a) * (h.d / 2 + 6), z: h.z + Math.cos(a) * (h.d / 2 + 6), a: a + Math.PI });
  window.__drive(h.x - Math.sin(a) * (h.d / 2 + 2.2), h.z - Math.cos(a) * (h.d / 2 + 2.2), 0.9);
  const Q = [], Y = [], dt = 1 / 60; let pMin = 99, pMax = 0;
  for (let i = 0; i < 60 * 14; i++) { window.__driveStep(dt); const c = G.camera.position; Q.push([c.x, c.y, c.z]); Y.push(C.yaw); pMin = Math.min(pMin, C.pitch); pMax = Math.max(pMax, C.pitch);
    if (Math.hypot(G.hero.pos.x - window.__D.tx, G.hero.pos.z - window.__D.tz) < 0.9 && i > 60) break; }
  for (let i = 0; i < 90; i++) { window.__driveStep(dt); const c = G.camera.position; Q.push([c.x, c.y, c.z]); Y.push(C.yaw); pMax = Math.max(pMax, C.pitch); }
  window.P.release();
  const acc = [], yr = [];
  for (let i = 2; i < Q.length; i++) acc.push(Math.hypot(...[0, 1, 2].map((k) => (Q[i][k] - 2 * Q[i - 1][k] + Q[i - 2][k]) / (dt * dt))));
  for (let i = 1; i < Y.length; i++) yr.push(Math.abs(Math.atan2(Math.sin(Y[i] - Y[i - 1]), Math.cos(Y[i] - Y[i - 1]))) / dt * 180 / Math.PI);
  const s = [...acc].sort((x, y) => x - y);
  return { frames: Q.length, mode: G.settings.visual, accMax: +s[s.length - 1].toFixed(1), accP95: +s[Math.floor(0.95 * (s.length - 1))].toFixed(1), yawRateMax: +Math.max(...yr).toFixed(1), pitchDeg: [+(pMin * 57.3).toFixed(1), +(pMax * 57.3).toFixed(1)] };
});
console.log('MEASURE the rise over the south house (1/60 s)', JSON.stringify(rise));
check('(b) the rise over a house is eased like the swing behind a wall: camera acceleration ≤ 40 m/s², the view turning ≤ 61°/s', rise.accMax <= 40 && rise.yawRateMax <= 61 && rise.pitchDeg[1] > rise.pitchDeg[0] + 5, rise);
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
