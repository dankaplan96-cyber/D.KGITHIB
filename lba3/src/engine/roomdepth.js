// FLICKER-142 (the user, 26.11: flicker on the kitchen wall behind Zoé, "and apply it to the whole game"): the depth
// range fitted to the room for each render.
//
// A room is seen by its fixed camera from ~90 m (camera.js _iso: a long lens), while the camera's near plane stays at
// 0.1 m. With a 24-bit depth buffer one depth step there is d² / (near · 2²⁴) ≈ 5 mm: two faces closer than that —
// a panel on a wall, a decal, a belt on a dress — fought for the pixel and flickered as the view moved. The near
// plane only sets how depth is shared out; nothing of a room lies between the lens and the room. So for each render,
// while an interior room is on screen, the near plane goes to half the lens's distance from the room's box (never
// under the camera's own), and back after the render: the camera code, and every shot that moves the camera itself
// (cinematics, a talk's close-up inside the room: the lens in the box, distance 0), see their own near plane.
// At 90 m that is ~40 m: one depth step ≈ 0.01 mm. Nothing else changes: the picture's framing, fog, culling.
import * as THREE from 'three';

// (on: false — the camera's own near plane in rooms too, as before FLICKER-142: the tests' A/B)
export const ROOM_DEPTH = { on: true };
const _b = new THREE.Box3();
let saved = null;

// the room's box: its group as built (walls, props, window views), measured once
function boxOf(R) {
  if (!R._depthBox) { R.group.updateMatrixWorld(true); R._depthBox = new THREE.Box3().setFromObject(R.group); }
  return R._depthBox;
}

// before a render: R the room on screen (null or outdoor: nothing done)
export function fitRoomDepth(R, cam) {
  saved = null;
  if (!ROOM_DEPTH.on || !R || R.outdoor || !R.group || !cam?.isPerspectiveCamera) return;
  const b = boxOf(R);
  if (b.isEmpty()) return;
  const d = _b.copy(b).distanceToPoint(cam.position);
  const n = Math.max(cam.near, d * 0.5);
  if (n <= cam.near * 1.5) return;
  saved = cam.near;
  cam.near = n; cam.updateProjectionMatrix();
}

// after it: the camera's own near plane again
export function restoreRoomDepth(cam) {
  if (saved == null) return;
  cam.near = saved; cam.updateProjectionMatrix(); saved = null;
}

