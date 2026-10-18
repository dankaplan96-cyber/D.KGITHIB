// shared page-side probes for VP-10 (installed with ev(PROBE)):
//  __seen()  — Twinsen's pixels actually seen (his silhouette switched off for the measure): pixels that change when
//              his body is hidden, on a 192×108 read-back of the WebGL canvas; and the same with nothing else drawn
//              (his full size on screen at this camera), so seen/full is the share of him in view
//  __who()   — what hides him: rays from the camera to 9 points on his body, the first mesh hit on each (its name,
//              the nearest named ancestor, its world box) — no hit = that point is in view
//  __cam()   — the camera's pitch (deg), distance to Twinsen, height, yaw
export const PROBE = `(async () => {
  const THREE = await import('three'); game.__Ray = THREE.Raycaster; game.__Box3 = THREE.Box3;
  const T = game.camera.position.constructor;
  const snap = (Wd = 192, Hd = 108) => { const R = game.renderer, c = R.renderer.domElement; R.render(); const o = document.createElement('canvas'); o.width = Wd; o.height = Hd; const x = o.getContext('2d'); x.drawImage(c, 0, 0, Wd, Hd); return x.getImageData(0, 0, Wd, Hd).data; };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n; };
  window.__seen = () => {
    if (game.room) return { room: game.room.id };
    const rig = game.hero.rig, sil = rig.silhouette, sv = sil?.visible; if (sil) sil.visible = false;
    const hr = rig.root, hv = hr.visible;
    const A = snap(); hr.visible = false; const B = snap(); hr.visible = hv;
    // his full size: draw only him (everything else in the world root switched off)
    const off = []; game.world.root.children.forEach((o) => { if (o.visible && o !== hr && !o.isLight) { off.push(o); o.visible = false; } });
    const sc = game.scene; const off2 = []; if (sc) sc.children.forEach((o) => { if (o.visible && o !== hr && o !== game.world.root && !o.isLight && !o.isCamera) { let h = false; o.traverse((q) => { if (q === hr) h = true; }); if (!h) { off2.push(o); o.visible = false; } } });
    const C = snap(); hr.visible = false; const D = snap(); hr.visible = hv;
    off.forEach((o) => { o.visible = true; }); off2.forEach((o) => { o.visible = true; });
    if (sil) sil.visible = sv;
    game.renderer.render();
    const seen = diff(A, B), full = diff(C, D);
    return { seen, full, pct: full ? Math.round(100 * seen / full) : null };
  };
  window.__who = () => {
    const h = game.hero, cam = game.camera, out = {};
    const ray = new game.__Ray(); ray.camera = cam;
    const right = new T().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    let blocked = 0, n = 0;
    for (const hy of [0.3, 1.0, 1.6]) for (const s of [-0.25, 0, 0.25]) {
      const p = new T(h.pos.x + right.x * s, h.pos.y + hy, h.pos.z + right.z * s); n++;
      const dir = p.clone().sub(cam.position); const L = dir.length(); dir.normalize();
      ray.set(cam.position, dir); ray.far = L - 0.35;
      const r = ray.intersectObject(game.world.root, true).find((x) => x.object.visible && !x.object.isSprite && x.object.material && [].concat(x.object.material).some((m) => m.visible !== false && m.colorWrite !== false && (m.opacity ?? 1) > 0.05) && !isHero(x.object));
      if (r) { blocked++; const o = r.object; let a = o, nm = ''; while (a && !nm) { nm = a.name; a = a.parent; } const key = (o.name || '?') + '<' + nm + '>'; const b = new (game.__Box3)().setFromObject(o); out[key] = { at: [r.point.x, r.point.y, r.point.z].map((v) => +v.toFixed(1)), box: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(1)), mat: [].concat(o.material).map((m) => m.color ? '#' + m.color.getHexString() : m.type).join(',') }; }
    }
    return { blocked, n, by: out };
  };
  const isHero = (o) => { let a = o; while (a) { if (a === game.hero.rig.root) return true; a = a.parent; } return false; };
  window.__cam = () => { const c = game.camera.position, h = game.hero.pos, R = game.camRig; const dx = c.x - h.x, dz = c.z - h.z, dy = c.y - h.y; return { pitch: +(Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI).toFixed(1), rigPitch: +((R.pitch || 0) * 180 / Math.PI).toFixed(1), dist: +Math.hypot(dx, dy, dz).toFixed(2), y: +c.y.toFixed(2), yaw: +(R.yaw || 0).toFixed(2) }; };
})();`;
