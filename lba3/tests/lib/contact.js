// Contact measures for the "nothing done in the air" checks (tests/no-air.mjs, tests/opening.mjs), loaded into the page
// (page.addScriptTag): window.CT.
//   CT.hand(rig, side)                 the hand's probe points in the world: wrist (the hand bone), palm, fingertips
//   CT.tool(rig, side)                 points of what the hand holds (the vertices of rigid meshes under the hand bone)
//   CT.near(points, roots, opts)       the least distance from any of the points to the surface of a visible rigid mesh
//                                      under the roots (triangles, exact), with the mesh's name; opts.skip(mesh) leaves
//                                      meshes out (the actor's own body), opts.max the search radius
//   CT.handGap(actor, side, roots)     near() for a hand: its points and what it holds, against everything but its own body
//   CT.feet(actor, physics)            each sole's height over the ground under it (the rig's ankle height taken off)
// Distances are metres. The surfaces are the drawn ones (what a player sees the hand on); colliders are not used.
(() => {
  const V3 = window.game.hero.pos.constructor;
  const CT = (window.CT = {});
  const PALM = [0.008, -0.062, 0.012], TIP = [0, -0.12, 0];
  CT.hand = (rig, side) => {
    const h = rig.j['arm' + side].hand; h.updateWorldMatrix(true, false);
    const sx = side === 'L' ? -1 : 1;
    return [new V3(0, 0, 0), new V3(PALM[0] * sx, PALM[1], PALM[2]), new V3(TIP[0], TIP[1], TIP[2])].map((p) => p.applyMatrix4(h.matrixWorld));
  };
  CT.tool = (rig, side, cap = 16) => {
    const h = rig.j['arm' + side].hand, out = [];
    h.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position) return;
      for (let p = o; p && p !== h; p = p.parent) if (!p.visible) return;
      o.updateWorldMatrix(true, false);
      const pos = o.geometry.attributes.position, st = Math.max(1, Math.floor(pos.count / cap));
      for (let i = 0; i < pos.count; i += st) out.push(new V3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    });
    return out;
  };
  const shown = (o, root) => { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === root) break; } return true; };
  const under = (o, anc) => { for (let p = o; p; p = p.parent) if (p === anc) return true; return false; };
  // a surface a hand can rest on: a rigid, drawn mesh (not a sprite, a line, a blob shadow, a glow or a light shaft)
  const solid = (o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position) return false;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.visible === false) return false;
    if (m.transparent && m.depthWrite === false && (m.opacity ?? 1) < 0.9) return false;
    if (m.blending && m.blending !== 1) return false;
    return true;
  };
  const _a = new V3(), _b = new V3(), _c = new V3(), _ab = new V3(), _ac = new V3(), _ap = new V3(), _bp = new V3(), _cp = new V3(), _q = new V3();
  // squared distance from p to the triangle abc (Ericson, Real-Time Collision Detection 5.1.5)
  const triD2 = (p, a, b, c) => {
    _ab.subVectors(b, a); _ac.subVectors(c, a); _ap.subVectors(p, a);
    const d1 = _ab.dot(_ap), d2 = _ac.dot(_ap);
    if (d1 <= 0 && d2 <= 0) return _ap.lengthSq();
    _bp.subVectors(p, b); const d3 = _ab.dot(_bp), d4 = _ac.dot(_bp);
    if (d3 >= 0 && d4 <= d3) return _bp.lengthSq();
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return _q.copy(a).addScaledVector(_ab, v).distanceToSquared(p); }
    _cp.subVectors(p, c); const d5 = _ab.dot(_cp), d6 = _ac.dot(_cp);
    if (d6 >= 0 && d5 <= d6) return _cp.lengthSq();
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return _q.copy(a).addScaledVector(_ac, w).distanceToSquared(p); }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return _q.copy(b).addScaledVector(_ap.subVectors(c, b), w).distanceToSquared(p); }
    const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
    return _q.copy(a).addScaledVector(_ab, v).addScaledVector(_ac, w).distanceToSquared(p);
  };
  const inv = new (window.game.camera.matrixWorld.constructor)(), mi = new (window.game.camera.matrixWorld.constructor)(), mw = new (window.game.camera.matrixWorld.constructor)();
  const _l = new V3(), _s = new V3(), _lo = new V3(), _hi = new V3();
  // the points against one mesh's triangles under the world matrix M; best = { d2, name } is tightened in place
  const _pl = [];
  const meshNear = (pts, o, M, best, label) => {
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    inv.copy(M).invert();
    _s.setFromMatrixScale(M); const smin = Math.max(1e-6, Math.min(_s.x, _s.y, _s.z));
    const bb = g.boundingBox, pos = g.attributes.position, ix = g.index ? g.index.array : null;
    const il = pos.isInterleavedBufferAttribute, stride = il ? pos.data.stride : 3, off = il ? pos.offset : 0, src = il ? pos.data.array : pos.array;
    const dr = g.drawRange || { start: 0, count: Infinity };
    const n = ix ? g.index.count : pos.count, i0 = Math.max(0, dr.start || 0), i1 = Math.min(n, i0 + (dr.count ?? Infinity));
    // the points in the mesh's space, and their box grown by the search radius: one pass over the triangles against it
    let r = Math.sqrt(best.d2) / smin, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < pts.length; k++) {
      const l = (_pl[k] ||= new V3()).copy(pts[k]).applyMatrix4(inv);
      if (l.x < x0) x0 = l.x; if (l.x > x1) x1 = l.x; if (l.y < y0) y0 = l.y; if (l.y > y1) y1 = l.y; if (l.z < z0) z0 = l.z; if (l.z > z1) z1 = l.z;
    }
    if (bb.min.x - x1 > r || x0 - bb.max.x > r || bb.min.y - y1 > r || y0 - bb.max.y > r || bb.min.z - z1 > r || z0 - bb.max.z > r) return;
    for (let i = i0; i + 2 < i1; i += 3) {
      const ia = (ix ? ix[i] : i) * stride + off, ib = (ix ? ix[i + 1] : i + 1) * stride + off, ic = (ix ? ix[i + 2] : i + 2) * stride + off;
      const ax = src[ia], bx = src[ib], cx = src[ic];
      if ((ax > x1 + r && bx > x1 + r && cx > x1 + r) || (ax < x0 - r && bx < x0 - r && cx < x0 - r)) continue;
      const ay = src[ia + 1], by = src[ib + 1], cy = src[ic + 1];
      if ((ay > y1 + r && by > y1 + r && cy > y1 + r) || (ay < y0 - r && by < y0 - r && cy < y0 - r)) continue;
      const az = src[ia + 2], bz = src[ib + 2], cz = src[ic + 2];
      if ((az > z1 + r && bz > z1 + r && cz > z1 + r) || (az < z0 - r && bz < z0 - r && cz < z0 - r)) continue;
      _a.set(ax, ay, az).applyMatrix4(M); _b.set(bx, by, bz).applyMatrix4(M); _c.set(cx, cy, cz).applyMatrix4(M);
      for (let k = 0; k < pts.length; k++) {
        const d2 = triD2(pts[k], _a, _b, _c);
        if (d2 < best.d2) { best.d2 = d2; best.name = label; r = Math.sqrt(d2) / smin; }
      }
    }
  };
  const nameOf = (o) => { for (let p = o; p; p = p.parent) if (p.name) return p.name; return o.type; };
  CT.near = (pts, roots, { skip = null, max = 0.6 } = {}) => {
    const best = { d2: max * max, name: null };
    if (!pts.length) return { d: null, name: null };
    _lo.set(Infinity, Infinity, Infinity); _hi.set(-Infinity, -Infinity, -Infinity);
    for (const p of pts) { _lo.min(p); _hi.max(p); }
    for (const root of Array.isArray(roots) ? roots : [roots]) {
      if (!root || !shown(root, null)) continue;
      root.updateWorldMatrix(true, false);
      const walk = (o) => {
        if (!o.visible) return;
        if (solid(o) && !(skip && skip(o))) {
          if (o.isInstancedMesh) {
            for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mi); mw.multiplyMatrices(o.matrixWorld, mi); meshNear(pts, o, mw, best, nameOf(o)); }
          } else meshNear(pts, o, o.matrixWorld, best, nameOf(o));
        }
        for (const c of o.children) walk(c);
      };
      walk(root);
    }
    return { d: best.name == null ? null : +Math.sqrt(best.d2).toFixed(4), name: best.name };
  };
  // everything drawn where the game is now: the room's group indoors, the scene outdoors
  CT.roots = () => [window.game.scene];
  CT.handGap = (actor, side, roots = CT.roots(), max = 0.6) => {
    const rig = actor.rig, own = rig.root;
    const r = CT.near([...CT.hand(rig, side), ...CT.tool(rig, side)], roots, { skip: (o) => under(o, own), max });
    return r;
  };
  // a single object's own surface (a lever, a crate, a hull) from a hand
  CT.handTo = (actor, side, obj, { tool = true, max = 1.5 } = {}) => CT.near([...CT.hand(actor.rig, side), ...(tool ? CT.tool(actor.rig, side) : [])], [obj], { max }).d;
  // deepest a hand point lies inside a box given in an object's own space ({ min: [x,y,z], max: [x,y,z] }): > 0 = through it
  CT.inBox = (pts, obj, box) => {
    obj.updateWorldMatrix(true, false); inv.copy(obj.matrixWorld).invert();
    let deep = 0;
    for (const p of pts) {
      _l.copy(p).applyMatrix4(inv);
      const d = Math.min(_l.x - box.min[0], box.max[0] - _l.x, _l.y - box.min[1], box.max[1] - _l.y, _l.z - box.min[2], box.max[2] - _l.z);
      if (d > deep) deep = d;
    }
    return +deep.toFixed(4);
  };
  CT.feet = (actor, physics = window.game.physics) => {
    const rig = actor.rig, j = rig.j, sc = rig.root.scale.y || 1;
    const ank = (rig.hipsRest + j.legL.hip.position.y + j.legL.knee.position.y + j.legL.foot.position.y) * sc;
    return ['legL', 'legR'].map((s) => {
      j[s].foot.updateWorldMatrix(true, false);
      const p = j[s].foot.getWorldPosition(new V3());
      return +(p.y - ank - physics.groundAt(p.x, p.z, p.y + 0.3)).toFixed(4);
    });
  };
})();
