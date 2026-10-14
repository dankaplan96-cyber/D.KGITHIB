// page-side measures of a rendered frame (WebGL canvas read back at 192×108, no DOM overlay such as the fade):
//  heroPx  — pixels that change when Twinsen is hidden (how much of him the player sees; 0 = covered)
//  veil    — % of the frame the see-through (faded) house meshes colour (the tinted "ghost")
//  ownHouse — % of the frame Twinsen's own house colours (opaque or faded)
// (both measured by switching the meshes' colour and depth writes off for one render, so their shadows stay: a
// house's shadow on the ground is not counted as the house)
export const MEAS = `window.__meas = () => {
  const R = game.renderer, c = R.renderer.domElement, Wd = 192, Hd = 108;
  const snap = () => { R.render(); const o = document.createElement('canvas'); o.width = Wd; o.height = Hd; const x = o.getContext('2d'); x.drawImage(c, 0, 0, Wd, Hd); return x.getImageData(0, 0, Wd, Hd).data; };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n; };
  if (game.room) return { room: game.room.id };
  const without = (list) => { const mats = new Set(); list.forEach((o) => [].concat(o.material).forEach((m) => mats.add(m))); const keep = [...mats].map((m) => [m, m.colorWrite, m.depthWrite]); mats.forEach((m) => { m.colorWrite = false; m.depthWrite = false; }); const out = snap(); keep.forEach(([m, c, d]) => { m.colorWrite = c; m.depthWrite = d; }); return out; };
  const A = snap();
  const hr = game.hero.rig.root, hv = hr.visible; hr.visible = false; const B = snap(); hr.visible = hv;
  const faded = [];
  game.world.root.traverse((o) => { if (o.isMesh && o.visible) { const ms = [].concat(o.material); if (ms.some((m) => m.transparent && m.opacity < 0.98 && m.depthWrite === false && !m.userData.alwaysTransparent)) faded.push(o); } });
  const C = without(faded);
  // Twinsen's house: the meshes whose bounds sit inside its footprint
  const h0 = game.world.houses[0], own = [];
  const box = new (game.camera.position.constructor)();
  game.world.root.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); box.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld); const dx = box.x - h0.x, dz = box.z - h0.z, l = Math.hypot(dx, dz); if (l < Math.max(h0.w, h0.d) * 0.6 && box.y > h0.g + 0.3 && o.geometry.boundingSphere.radius < Math.max(h0.w, h0.d) * 1.2) own.push(o); });
  const D = without(own);
  R.render();
  const N = Wd * Hd;
  return { heroPx: diff(A, B), veil: +(100 * diff(A, C) / N).toFixed(1), ownHouse: +(100 * diff(A, D) / N).toFixed(1), nFaded: faded.length };
};`;
