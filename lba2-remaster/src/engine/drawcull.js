// Per-frame work the renderer can skip without changing what is drawn (PERF-2, measured on the street route with
// the free camera; the user's laptop spends ~48 µs of CPU per draw call and the frame is bound by submission).
//
// 1. World matrices of shown objects only. three.js recomputes every object's world matrix every frame, shown or
//    not: of the ~9 500 objects in the scene ~7 000 sit under hidden groups (the rooms and regions not being played,
//    absent actors), and that update was the largest single CPU cost of a frame. updateShownWorld() runs the same
//    update with each hidden subtree's children set aside, so they are not visited; a subtree shown again is
//    recomputed in full on its first frame (it is flagged), before it is drawn. Anything that reads a hidden
//    object's position goes through getWorldPosition / updateWorldMatrix (which update it themselves).
// 2. Actors of other areas. The actors live under the scene, not under their room or region, so the people and
//    mites of rooms 1 km away and of regions 5–7 km away were drawn from Citadel whenever the camera faced them
//    (their skinned bodies are never frustum-culled): up to 60 calls on the street. An actor further from the
//    camera than the fog's end (where it is drawn in the fog's colour only) and 250 m is left out of that frame's
//    render, its own `visible` flag restored right after. Its simulation is untouched.
//    (FarCull)
// 3. Blob shadows. Every actor, the magic ball and a few enemies lay a soft round shadow on the ground: one
//    transparent draw each, all with the same geometry and material. BlobBatch draws the shown ones in a single
//    instanced call for the frame (same matrices, same material, same render order: blobs are black, so their
//    overlaps blend the same in any order), the originals hidden for the frame and shown again right after.
import * as THREE from 'three';
const NONE = Object.freeze([]);

export function updateShownWorld(scene, state) {
  const hidden = state.hidden, prev = state.prev, stamp = ++state.frame;
  hidden.length = 0;
  const walk = (o) => {
    const c = o.children;
    for (let i = 0; i < c.length; i++) {
      const k = c[i];
      if (k.visible) { if (k.children.length) walk(k); }
      else if (k.children.length) { hidden.push(k); k.__hidAt = stamp; }
    }
  };
  walk(scene);
  // shown again since the last frame: recompute it and everything under it
  for (const o of prev) if (o.__hidAt !== stamp) o.matrixWorldNeedsUpdate = true;
  for (const o of hidden) { o.__kids = o.children; o.children = NONE; }
  try { scene.updateMatrixWorld(); } finally { for (const o of hidden) { o.children = o.__kids; o.__kids = null; } }
  state.prev = hidden; state.hidden = prev;
}

// An actor's small rigid parts (eyes, buttons, a brooch: one draw each) are also left out of a frame while they are
// under SUB_PX pixels in radius on screen (an eye 3 cm across beyond ~30 m): the same specks either way.
const SUB_PX = 0.75, PART_R = 0.2;
const _pv = new THREE.Vector3();
export class FarCull {
  // actors(): lists of the actors that may be drawn; fog: the scene's THREE.Fog
  constructor(actors, camera, fog) { this.actors = actors; this.camera = camera; this.fog = fog; this.off = []; this.enabled = true; this.n = 0; this.parts = new WeakMap(); }
  partsOf(root) {
    let L = this.parts.get(root);
    if (!L) {
      L = [];
      root.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.geometry) return;
        const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        if (g.boundingSphere && g.boundingSphere.radius < PART_R) L.push(o);
      });
      this.parts.set(root, L);
    }
    return L;
  }
  hide() {
    this.n = 0;
    if (!this.enabled) return;
    const far = Math.max(this.fog?.far ?? 0, 250) + 10, cam = this.camera, p = cam.position;
    const pxK = (typeof innerHeight === 'number' ? innerHeight : 720) / (2 * Math.tan(((cam.fov || 55) * Math.PI) / 360));
    for (const list of this.actors()) for (const a of list || NONE) {
      const r = a?.rig?.root; if (!r || !r.visible || !a.pos) continue;
      const dx = a.pos.x - p.x, dy = a.pos.y - p.y, dz = a.pos.z - p.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= far * far) {
        r.visible = false; this.off.push(r);
        if (a.shadow?.visible) { a.shadow.visible = false; this.off.push(a.shadow); }
        continue;
      }
      // (within 30 m of the camera every part stays: an eye there is still about a pixel)
      if (d2 < 900) continue;
      for (const o of this.partsOf(r)) {
        if (!o.visible) continue;
        _pv.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
        const px = (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, _pv.distanceTo(p));
        if (px < SUB_PX) { o.visible = false; this.off.push(o); }
      }
    }
    this.n = this.off.length;
  }
  restore() { for (const o of this.off) o.visible = true; this.off.length = 0; }
}

export class BlobBatch {
  constructor(scene, blobs) { this.scene = scene; this.blobs = blobs; this.im = null; this.off = []; this.enabled = true; this.n = 0; }
  _make(proto, cap) {
    if (this.im) { this.scene.remove(this.im); this.im.dispose(); }
    const im = (this.im = new THREE.InstancedMesh(proto.geometry, proto.material, cap));
    im.renderOrder = proto.renderOrder; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
    im.name = 'blobBatch'; im.count = 0; im.matrixAutoUpdate = false;
    this.scene.add(im);
  }
  hide() {
    this.n = 0;
    const B = this.blobs;
    if (!this.enabled || !B.length) { if (this.im) this.im.count = 0; return; }
    let n = 0;
    for (const m of B) {
      if (!m.visible || !m.parent) continue;
      let shown = true; for (let p = m.parent; p; p = p.parent) if (!p.visible) { shown = false; break; }
      if (!shown) continue;
      if (!this.im || n >= this.im.instanceMatrix.count) this._make(m, Math.max(64, (this.im?.instanceMatrix.count || 0) * 2));
      m.updateWorldMatrix(true, false);
      this.im.setMatrixAt(n++, m.matrixWorld);
      m.visible = false; this.off.push(m);
    }
    if (this.im) { this.im.count = n; this.im.instanceMatrix.needsUpdate = n > 0; this.im.visible = n > 0; }
    this.n = n;
  }
  restore() { for (const m of this.off) m.visible = true; this.off.length = 0; }
}
