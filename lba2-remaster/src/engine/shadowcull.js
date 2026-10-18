// Shadow-caster culling (PERF-IGPU). three draws every caster inside the sun's shadow camera (±36–48 m around
// Twinsen) into the shadow map, also those behind the view camera or off to the side, whose shadow can't fall
// anywhere on screen: at the Citadel square that was more than half of the shadow pass's draw calls.
// Each frame a static caster (a mesh under the current area's root, not skinned, instanced or batched) casts only
// while its bounding sphere, grown by the length of the shadow it can throw (its size / tan(sun elevation)) and
// moved half that way down-sun, touches the view frustum. Nothing on screen changes: a shadow that reaches the
// view keeps its caster. Small props (under 2 m across) keep the old rule on top: no shadow beyond SMALL_FAR[preset]
// from the focus (High 24 m as before, Medium 18 m, a few texels wide there).
import * as THREE from 'three';

export const SMALL_FAR = { high: 24, medium: 18, low: 18 };
const SMALL_R = 2;
const _f = new THREE.Frustum(), _m = new THREE.Matrix4(), _s = new THREE.Sphere(), _c = new THREE.Vector3();

export class ShadowCull {
  constructor(sunDir) { this.sunDir = sunDir; this.root = null; this.list = []; this.quality = 'high'; this.enabled = true; }
  // the casters of an area root (gathered once per root; their transforms are read live)
  gather(root) {
    this.restore();
    this.root = root; this.list = [];
    if (!root) return;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh || !o.castShadow) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere || !Number.isFinite(g.boundingSphere.radius)) return;
      this.list.push({ o, c: g.boundingSphere.center, r: g.boundingSphere.radius, on: true });
    });
  }
  restore() { for (const C of this.list) C.o.castShadow = true; }
  update(root, camera, focus) {
    if (!this.enabled) { if (this.list.length) { this.restore(); this.list = []; this.root = null; } return; }
    if (root !== this.root) this.gather(root);
    if (!this.list.length) return;
    camera.updateMatrixWorld();
    _f.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse.copy(camera.matrixWorld).invert()));
    const d = this.sunDir, horiz = Math.hypot(d.x, d.z), slope = d.y > 0.05 ? horiz / d.y : 4; // shadow length per metre of height
    const far = SMALL_FAR[this.quality] ?? 24;
    for (const C of this.list) {
      const o = C.o;
      _c.copy(C.c).applyMatrix4(o.matrixWorld);
      const r = C.r * o.matrixWorld.getMaxScaleOnAxis();
      // the shadow runs down-sun (away from the sun): up to (2r) * slope beyond the caster
      const len = 2 * r * slope;
      _s.center.set(_c.x - d.x / (horiz || 1) * len * 0.5, _c.y, _c.z - d.z / (horiz || 1) * len * 0.5);
      _s.radius = r + len * 0.5 + 0.5;
      let on = _f.intersectsSphere(_s);
      if (on && r < SMALL_R && focus) {
        const dist = Math.hypot(focus.x - _c.x, focus.z - _c.z);
        on = C.on ? dist < far + 2 : dist < far - 2; // (hysteresis)
      }
      C.on = on;
      o.castShadow = on;
    }
  }
}
