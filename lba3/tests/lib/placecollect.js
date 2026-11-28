// PLACE-1, page side: what tests/lib/placerec.js recorded while the areas were built, in world space, per area.
// PLACE.collect(ids) → { [area]: { c, bounds, exits, spawn, cols, frames: [...], loose: [...] } }
//   frame: { i, p (parent frame or -1), src, n, lb (box in its own frame), pos [x, y, z], fwd [x, z] (its local +z),
//            right [x, z], parts: [[hull 2D, y0, y1], ...] (its own parts, not its children's), g (the ground under its
//            middle: physics.groundAt, people's floor, furniture colliders not stood on) }
//   loose: the area's parts drawn outside any piece (walls, floors, partitions), and its plain BoxGeometry meshes
(() => {
const G = game;
const PLACE = window.PLACE = {};
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
const r3 = (v) => Math.round(v * 1000) / 1000;
function worldPart(W, part) {
  // W: the Kit group's world matrix; part: [matrix in the group, box]
  const M = W.clone().multiply(part[0]), e = M.elements, pts = []; let y0 = 1e9, y1 = -1e9;
  for (let c = 0; c < 8; c++) {
    const x = c & 1 ? part[4] : part[1], y = c & 2 ? part[5] : part[2], z = c & 4 ? part[6] : part[3];
    const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
    pts.push([r3(X), r3(Z)]); if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  return [hull(pts), r3(y0), r3(y1)];
}
PLACE.collect = (ids) => {
  G.scene.updateMatrixWorld(true);
  const owner = new Map();
  for (const id of ids) { const R = G.rooms[id]; if (R?.group) owner.set(R.group, id); }
  // (outdoors: Citadel is the world's root; the regions are rooms with an outdoor flag)
  if (ids.includes('citadel') && G.world?.root) owner.set(G.world.root, 'citadel');
  const roomOf = (o) => { for (let p = o; p; p = p.parent) if (owner.has(p)) return owner.get(p); return null; };
  const REC = globalThis.__PLACE_REC, out = {};
  for (const id of ids) {
    const R = id === 'citadel' ? { center: { x: 0, z: 0 } } : G.rooms[id]; if (!R) continue;
    out[id] = { outdoor: id === 'citadel' || !!G.regions.centreOf(id)?.outdoor, c: [R.center?.x ?? 0, R.center?.z ?? 0], bounds: R.bounds || null, spawn: R.spawn ? [R.spawn.x, R.spawn.z] : null,
      exits: (R.exits || []).map((e) => ({ x: r3(e.x), z: r3(e.z), r: e.r, to: e.to || e.room || '' })),
      cols: (R.colliders || []).filter((c) => c.enabled !== false).map((c) => ({ t: c.type, x: r3(c.x), z: r3(c.z), hw: c.hw, hd: c.hd, r: c.r, rot: c.rot || 0, top: c.top, bottom: c.bottom ?? 0, st: !!c.seeThrough, ns: !!c.noStand })),
      frames: [], loose: [] };
  }
  for (const f of REC.frames) {
    if (!f.n) continue;
    const id = roomOf(f.kit.group); if (!id) continue;
    const W0 = f.kit.group.matrixWorld, W = W0.clone().multiply(f.M), e = W.elements;
    const pos = [r3(e[12]), r3(e[13]), r3(e[14])];
    const fl = Math.hypot(e[8], e[10]) || 1, rl = Math.hypot(e[0], e[2]) || 1;
    const lb = f.box.map(r3);
    // the middle of its drawn box, in the world: the ground there
    const mx = (lb[0] + lb[3]) / 2, mz = (lb[2] + lb[5]) / 2;
    const cx = e[0] * mx + e[8] * mz + e[12], cz = e[2] * mx + e[10] * mz + e[14];
    const g = G.physics.groundAt(cx, cz, pos[1] + lb[1] + 0.4);
    // (an island home's planned pieces are drawn by one arrow for every kind: ihomes.js's IH[room].placed names them)
    let src = f.src;
    if (/^put:\(kk\) => p\.draw/.test(src) && window.__IH?.[id]?.placed) { const q = window.__IH[id].placed.find((q) => Math.hypot(q.x - pos[0], q.z - pos[2]) < 0.05); if (q) src = 'put:' + q.name + ' (ihomes.js P.' + q.name + ')'; }
    out[id].frames.push({ i: f.i, p: f.parent ? f.parent.i : -1, src, n: f.n, lb, pos, fwd: [r3(e[8] / fl), r3(e[10] / fl)], right: [r3(e[0] / rl), r3(e[2] / rl)], mid: [r3(cx), r3(cz)], g: Number.isFinite(g) ? r3(g) : null,
      parts: f.parts.map((p) => worldPart(W0, p)) });
  }
  for (const [kit, part] of REC.loose) { const id = roomOf(kit.group); if (id) out[id].loose.push(worldPart(kit.group.matrixWorld, part)); }
  for (const id of ids) {
    const R = G.rooms[id]; if (!R?.group || out[id].outdoor) continue;
    R.group.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry' && !REC.geos.has(o.geometry) && !o.isInstancedMesh && !o.isSkinnedMesh) { const mm = [].concat(o.material)[0]; if (mm && (mm.visible === false || mm.colorWrite === false || (mm.transparent && mm.opacity < 0.05))) return; const b = o.geometry.parameters; const g = o.parent.matrixWorld.clone().multiply(o.matrix); out[id].loose.push(worldPart(new o.matrix.constructor(), [g, -b.width / 2, -b.height / 2, -b.depth / 2, b.width / 2, b.height / 2, b.depth / 2])); } });
  }
  return out;
};

// Pictures. PLACE.stage(id, focus [x, z]): into the room, Twinsen put on free floor 1.2–2.6 m from focus (the side
// nearest the room camera first), the room camera settled on him: the game's own view. Returns where he stands.
// PLACE.close(focus, outlines): a nearer look from the room camera's side at focus, each outline ({hull, y0, y1, color})
// drawn as a box of lines; returns a JPEG data URL. PLACE.clear() takes the outlines away.
let THREE = null, lines = [];
PLACE.init = async () => { THREE = await import('three'); };
PLACE.stage = (id, focus, at = null) => {
  const PH = G.physics, h = G.hero;
  if (at) {   // (a given spot: the same picture before and after a change)
    if (id === 'citadel') { if (G.room) { G.exitRoom({ x: at[0], z: at[1], a: 0 }, true, true); G.step(0.1); } }
    else if (G.room?.id !== id) { G.enterRoom(id, null, true, true); G.step(0.1); }
    const y = PH.groundAt(at[0], at[1], h.pos.y + 3);
    h.pos.set(at[0], y, at[1]); h.vy = 0; h.onGround = true; h.angle = Math.atan2(focus[0] - at[0], focus[1] - at[1]);
    G.camRig.snap(); G.room?.resetCut?.(); G.doorCool = 9;
    for (let i = 0; i < 6; i++) G.frame(1 / 60, false);
    G.renderer.render();
    return at;
  }
  if (id === 'citadel') { if (G.room) { G.exitRoom({ x: focus[0] + 2, z: focus[1] + 2, a: 0 }, true, true); G.step(0.1); } }
  else if (G.room?.id !== id) { G.enterRoom(id, null, true, true); G.step(0.1); }
  G.camRig.snap(); G.camRig.update(1 / 60, h.pos, h.angle, false, null);
  const cam = G.camera.position, base = Math.atan2(cam.x - focus[0], cam.z - focus[1]);
  const y0 = PH.groundAt(focus[0], focus[1], h.pos.y + 4);
  for (const d of [1.6, 2.2, 1.2, 2.6]) for (let k = 0; k < 16; k++) {
    // (beside it as the camera sees it first, so he does not stand in front of it)
    const a = base + Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = focus[0] + Math.sin(a) * d, z = focus[1] + Math.cos(a) * d;
    const y = PH.groundAt(x, z, (Number.isFinite(y0) ? y0 : h.pos.y) + 1.5);
    if (!Number.isFinite(y) || (Number.isFinite(y0) && Math.abs(y - y0) > 1.2) || PH.blockedAt(x, z, y + 0.3, 0.35)) continue;
    if (G.room?.bounds?.length && !G.room.bounds.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1)) continue;
    h.pos.set(x, y, z); h.vy = 0; h.onGround = true; h.angle = Math.atan2(focus[0] - x, focus[1] - z);
    G.camRig.snap(); G.room?.resetCut?.(); G.doorCool = 9;
    for (let i = 0; i < 6; i++) G.frame(1 / 60, false);
    G.renderer.render();
    return [+x.toFixed(2), +z.toFixed(2)];
  }
  return null;
};
PLACE.clear = () => { for (const l of lines) { l.parent?.remove(l); l.geometry.dispose(); } lines = []; };
PLACE.close = (focus, outlines = [], span = 3.4, dir = null) => {
  PLACE.clear();
  for (const o of outlines) {
    const v = [];
    const n = o.hull.length;
    for (let i = 0; i < n; i++) { const a = o.hull[i], b = o.hull[(i + 1) % n];
      for (const y of [o.y0, o.y1]) v.push(a[0], y, a[1], b[0], y, b[1]);
      v.push(a[0], o.y0, a[1], a[0], o.y1, a[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: o.color || 0xff2020, depthTest: false }));
    l.renderOrder = 999; G.scene.add(l); lines.push(l);
  }
  const cam = G.camera, gp = cam.position.clone(), gq = cam.quaternion.clone();
  const dist = span / 2 / Math.tan((cam.fov || 40) * Math.PI / 360);
  const fy = outlines.length ? (outlines[0].y0 + outlines[0].y1) / 2 : G.hero.pos.y + 0.6;
  const d = dir ? new THREE.Vector3(dir[0], 0, dir[1]) : new THREE.Vector3(gp.x - focus[0], 0, gp.z - focus[1]); if (d.lengthSq() < 1e-6) d.set(1, 0, 1); d.normalize();
  cam.position.set(focus[0] + d.x * dist, fy + dist * 0.75, focus[1] + d.z * dist); cam.lookAt(focus[0], fy, focus[1]); cam.updateMatrixWorld();
  const hv = G.hero.rig?.root?.visible; if (G.hero.rig?.root) G.hero.rig.root.visible = false;
  G.renderer.render();
  const url = G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.8);
  if (G.hero.rig?.root) G.hero.rig.root.visible = hv;
  cam.position.copy(gp); cam.quaternion.copy(gq); cam.updateMatrixWorld(); PLACE.clear();
  return url;
};
})();
