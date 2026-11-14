// The sword's slash trail (TOWN-POLISH, ISSUES I-28: "a thin grey blade against the grey paving; at the player's camera
// distance a slash reads as an empty-handed swing"). One short ribbon, the blade's own sweep:
//  - while a sword move is in its swing (a moment before the active frames to just after them) the blade's world points
//    (a third of the way up the blade, and the tip) are sampled once a frame into a small fixed ring;
//  - the ribbon is SPAN seconds of that sweep, read back at even times and bent round the shoulder between two samples, so
//    30 and 60 fps draw the same curved fan; it is brightest at its newest edge and along the tip, and drains away within
//    SPAN once the swing is over;
//  - one mesh made once (on the first swing), its buffer written in place: no allocation per frame, one draw while it is
//    shown and nothing at all otherwise; the ball trail's texture and material kind (basic, additive, no depth write): no
//    new shader program. Additive and thin, it never hides an enemy or Twinsen.
// A swing interrupted by a talk, a door, a death or a pause leaves nothing behind: hide() (the sword sheathed), or, if
// nothing has updated it for a moment (a state where Twinsen does not update), it draws nothing.
import * as THREE from 'three';

const N = 12, SPAN = 0.13, RING = 16;
// the sword's own points (actors.js buildSword: the blade runs from y −0.1 to −0.82 in the sword's group)
const INNER = new THREE.Vector3(0, -0.36, 0), TIP = new THREE.Vector3(0, -0.84, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _piv = new THREE.Vector3();

export class SlashTrail {
  constructor(game, tex) {
    this.game = game;
    this.ring = new Float32Array(RING * 7);   // inner xyz, tip xyz, time
    this.n = 0; this.head = 0; this.clock = 0; this.stamp = -9;
    this.pos = new Float32Array(N * 2 * 3);
    const uv = new Float32Array(N * 2 * 2), idx = [];
    // u: age along the trail (0 the newest); v: from the inner edge (0) to the tip (0.5, the texture's brightest line)
    for (let i = 0; i < N; i++) { uv.set([i / (N - 1), 0, i / (N - 1), 0.5], i * 4); if (i < N - 1) { const k = 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ map: tex, color: '#dcefff', opacity: 0.85, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = 'slash-trail';
    this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 4;
    // (stale: nothing updated it this last moment, so it is not part of what is going on: draw nothing)
    this.mesh.onBeforeRender = () => { geo.setDrawRange(0, this.game.time - this.stamp > 0.15 ? 0 : Infinity); };
    game.scene.add(this.mesh);
  }
  hide() { this.n = 0; this.mesh.visible = false; }
  // each frame Twinsen updates, once the trail exists: sword (his sword's group), swinging (a sword move in its swing),
  // pivot (his shoulder, world)
  update(dt, sword, swinging, pivot) {
    if (swinging && !this.was) this.n = 0;   // (a new swing starts its own trail, never joined to the last one's)
    this.was = swinging;
    if (!swinging && !this.n) return;
    this.clock += dt; this.stamp = this.game.time;
    const R = this.ring;
    if (swinging && sword?.visible) {
      sword.updateWorldMatrix(true, false);
      _a.copy(INNER).applyMatrix4(sword.matrixWorld); _b.copy(TIP).applyMatrix4(sword.matrixWorld);
      const o = this.head * 7;
      R[o] = _a.x; R[o + 1] = _a.y; R[o + 2] = _a.z; R[o + 3] = _b.x; R[o + 4] = _b.y; R[o + 5] = _b.z; R[o + 6] = this.clock;
      this.head = (this.head + 1) % RING; this.n = Math.min(RING, this.n + 1);
    }
    const at = (k) => ((this.head - 1 - k + RING * 2) % RING) * 7;   // k = 0: the newest sample
    const newest = this.n ? R[at(0) + 6] : -9;
    if (this.n < 2 || this.clock - newest > SPAN) { this.mesh.visible = false; if (!swinging) this.n = 0; return; }
    this.mesh.visible = true;
    _piv.copy(pivot);
    let k = 0;
    for (let i = 0; i < N; i++) {
      const tt = this.clock - (i / (N - 1)) * SPAN;
      while (k < this.n - 1 && R[at(k + 1) + 6] > tt) k++;
      const A = at(k);
      if (tt >= R[A + 6] || k >= this.n - 1) { this.put(i, 0, R[A], R[A + 1], R[A + 2]); this.put(i, 1, R[A + 3], R[A + 4], R[A + 5]); continue; }
      const B = at(k + 1), f = (tt - R[B + 6]) / Math.max(1e-6, R[A + 6] - R[B + 6]);
      for (let e = 0; e < 2; e++) {
        // round the shoulder: the directions blended and the distance from it blended (an arc, not a chord)
        _a.set(R[B + e * 3] - _piv.x, R[B + e * 3 + 1] - _piv.y, R[B + e * 3 + 2] - _piv.z);
        _b.set(R[A + e * 3] - _piv.x, R[A + e * 3 + 1] - _piv.y, R[A + e * 3 + 2] - _piv.z);
        const la = _a.length(), lb = _b.length();
        _c.copy(_a).multiplyScalar(1 / Math.max(la, 1e-6)).lerp(_b.multiplyScalar(1 / Math.max(lb, 1e-6)), f);
        _c.multiplyScalar((la + (lb - la) * f) / Math.max(_c.length(), 1e-6)).add(_piv);
        this.put(i, e, _c.x, _c.y, _c.z);
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  put(i, e, x, y, z) { const o = i * 6 + e * 3; this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z; }
}
