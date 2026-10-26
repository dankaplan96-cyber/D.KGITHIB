// Many sprites of one material in one draw call (PERF-ARRIVAL).
//
// three.js draws every THREE.Sprite with its own draw call. Zeelich's cloud puffs (≈190 sprites around the cliffs,
// one material) were 152 of the 651 draw calls of the arrival view at High, and the Zeelich islands have dozens each:
// each call costs the game's CPU ~30–50 µs before the GPU sees it, the cost the user's laptop pays most for.
//
// A SpriteBatch draws them as one InstancedMesh with three's own sprite shader, changed only where the sprite reads
// its position and size from the object's matrix (they come from the instance's matrix here): the same quad, the same
// billboard maths (camera-facing, size in world units: sizeAttenuation), the same map, colour, opacity and fog, so
// every puff looks as it did. Like three's sprites they are drawn back to front: the instances are sorted by their
// distance along the view each frame (with the camera of the frame before: a turn of a few degrees, between puffs
// that are all the same colour). As one object the batch sits after the area's cloud layers (renderOrder -1) and
// before its other see-through things; every puff is drawn, also those off screen (four vertices each).
import * as THREE from 'three';

// three's sprite geometry (r180 Sprite: one quad, interleaved position + uv, two triangles)
let QUAD = null;
function quad() {
  if (QUAD) return QUAD;
  const g = new THREE.BufferGeometry();
  const ib = new THREE.InterleavedBuffer(new Float32Array([-0.5, -0.5, 0, 0, 0, 0.5, -0.5, 0, 1, 0, 0.5, 0.5, 0, 1, 1, -0.5, 0.5, 0, 0, 1]), 5);
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0, false));
  g.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 3, false));
  return (QUAD = g);
}
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

export class SpriteBatch {
  // material: a THREE.SpriteMaterial (used as it is: its colour, opacity, map and fog; rotation must be 0)
  constructor(parent, material, max) {
    material.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('vec4 mvPosition = modelViewMatrix[ 3 ];', 'mat4 sbM = modelMatrix * instanceMatrix;\n\tvec4 mvPosition = viewMatrix * sbM[ 3 ];')
        .replace('vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );', 'vec2 scale = vec2( length( sbM[ 0 ].xyz ), length( sbM[ 1 ].xyz ) );');
    };
    material.customProgramCacheKey = () => 'spritebatch';
    const mesh = (this.mesh = new THREE.InstancedMesh(quad(), material, max));
    mesh.count = 0; mesh.center = new THREE.Vector2(0.5, 0.5);   // (three sets the sprite shader's `center` from the object)
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = -0.5; mesh.frustumCulled = false;
    mesh.name = 'spriteBatch'; mesh.userData.noMerge = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.items = []; this.order = []; this.cam = null;
    mesh.onBeforeRender = (r, s, camera) => { this.cam = camera; };
    parent.add(mesh);
  }
  // a sprite at (x, y, z) local to the parent, sx × sy world units; returns it (move it with .y and the others)
  add(x, y, z, sx, sy) {
    const it = { x, y, z, sx, sy };
    if (this.items.length >= this.mesh.instanceMatrix.count) { console.warn('SpriteBatch full'); return it; }
    this.items.push(it); this.order.push(it); this.mesh.count = this.items.length;
    return it;
  }
  // after the items moved: sort back to front for the last frame's camera, write the instances
  update() {
    const mesh = this.mesh, C = this.cam, P = this.order;
    if (C && mesh.parent) {
      mesh.updateWorldMatrix(true, false);
      _m.multiplyMatrices(C.matrixWorldInverse, mesh.matrixWorld);
      for (const it of P) it.d = _v.set(it.x, it.y, it.z).applyMatrix4(_m).z;   // (view-space z: more negative is farther)
      P.sort((a, b) => a.d - b.d);
    }
    for (let i = 0; i < P.length; i++) { const it = P[i]; _m.compose(_v.set(it.x, it.y, it.z), _q, _s.set(it.sx, it.sy, 1)); mesh.setMatrixAt(i, _m); }
    mesh.instanceMatrix.needsUpdate = true;
  }
}
