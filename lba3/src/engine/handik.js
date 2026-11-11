// A hand on a thing (NO-AIR: nobody's hands work on nothing). The rig's actions pose the arms by joint angles; where a
// hand must land on something real (a lever's knob, a table's top, a hull) the arm is solved for the palm on top of the
// action's pose: the shoulder (x, y, z) and the elbow (x) by damped least squares from the action's own arm, so the
// elbow keeps the action's shape, and the hand turned to the grip's orientation when one is given.
//
// The solve is a layer: every joint it changes is first remembered in `store` (keepJoint) and put back by
// restoreJoints(store) before the rig's next update, so the rig's own damping never sees it and nothing is left over
// when the contact ends. (R5 wrote it for the opening's tap, src/game/story/opening.js; it is shared from here with the
// residents' work, src/game/workhands.js.)
import * as THREE from 'three';

export const PALM = new THREE.Vector3(0.008, -0.062, 0.012);   // the palm's middle in the hand bone's space (CHAR-2's hand)
export const keepJoint = (store, obj) => store.push([obj, obj.rotation.x, obj.rotation.y, obj.rotation.z]);
export const restoreJoints = (store) => { for (let i = store.length - 1; i >= 0; i--) store[i][0].rotation.set(store[i][1], store[i][2], store[i][3]); store.length = 0; };

const _w2 = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _wrist = new THREE.Vector3(), _e = new THREE.Vector3(), _p0 = new THREE.Vector3(), _A = new THREE.Matrix3(), _yv = new THREE.Vector3();
const _J = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

// solveHand(arm, side, T, w, store, palm): arm = rig.j.armR / armL ({ sh, el, hand }); T = { palm: where the palm goes
// (world), fingers?: the way the fingers point, normal?: the way the palm faces }; without fingers / normal the hand
// keeps the turn the action gives it and only the arm moves. w 0..1 is the weight (ease it in and out). Returns how far
// the palm is left from its place (m, at full weight): more than a few cm means the thing is out of the arm's reach.
export function solveHand(arm, side, T, w, store, palm = PALM, iters = 6) {
  if (!(w > 0) || !T) return 0;
  const sh = arm.sh, el = arm.el, hand = arm.hand, turn = !!(T.fingers && T.normal);
  if (turn) {
    // the hand's orientation in the world: fingers along the hand's -y, the palm's normal its +x (right) / -x (left)
    _y.copy(T.fingers).normalize().negate();
    _x.copy(T.normal).normalize(); if (side === 'L') _x.negate();
    _x.addScaledVector(_y, -_x.dot(_y)).normalize(); _z.crossVectors(_x, _y);
    _q2.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  } else { sh.updateMatrixWorld(true); hand.getWorldQuaternion(_q2); }
  _wrist.copy(palm).applyQuaternion(_q2).negate().add(T.palm);
  keepJoint(store, sh); keepJoint(store, el); if (turn) keepJoint(store, hand);
  const P = [[sh, 'x'], [sh, 'y'], [sh, 'z'], [el, 'x']], s0 = [sh.rotation.x, sh.rotation.y, sh.rotation.z, el.rotation.x];
  const at = (v) => { sh.updateMatrixWorld(true); return hand.getWorldPosition(v); };
  let left = 0;
  for (let it = 0; it < iters; it++) {
    at(_p0); _e.copy(_wrist).sub(_p0); left = _e.length();
    if (left < 0.002) break;
    for (let i = 0; i < 4; i++) { const [o, ax] = P[i]; o.rotation[ax] += 1e-3; at(_w2); _J[i].copy(_w2).sub(_p0).multiplyScalar(1000); o.rotation[ax] -= 1e-3; }
    // Δθ = Jᵀ (J Jᵀ + λ² I)⁻¹ e
    const jj = (r, c) => { let s = r === c ? 0.0025 : 0; for (let i = 0; i < 4; i++) s += _J[i].getComponent(r) * _J[i].getComponent(c); return s; };
    _A.set(jj(0, 0), jj(0, 1), jj(0, 2), jj(1, 0), jj(1, 1), jj(1, 2), jj(2, 0), jj(2, 1), jj(2, 2));
    _yv.copy(_e).applyMatrix3(_A.invert());
    for (let i = 0; i < 4; i++) { const [o, ax] = P[i]; o.rotation[ax] += _J[i].dot(_yv); }
    el.rotation.x = Math.min(0, Math.max(-2.4, el.rotation.x));
  }
  if (left >= 0.002) { at(_p0); left = _p0.distanceTo(_wrist); }
  for (let i = 0; i < 4; i++) { const [o, ax] = P[i]; o.rotation[ax] = s0[i] + (o.rotation[ax] - s0[i]) * w; }
  sh.updateMatrixWorld(true);
  if (turn) {
    hand.getWorldQuaternion(_q1).slerp(_q2, w);
    hand.parent.getWorldQuaternion(_q2);
    hand.quaternion.copy(_q2.invert().multiply(_q1));
    hand.updateMatrixWorld(true);
  }
  return left;
}
