
// ---- tests/zfight.mjs TRACE (appended to three.core.min.js by the test's route, never served to players):
// who added each object to the scene graph, so a finding names its builder (the stack of the add() call)
import * as __ZF_THREE from './three.core.min.js';
{
  const P = __ZF_THREE.Object3D.prototype, add = P.add, M = (globalThis.__zfSrc = new WeakMap());
  P.add = function (...a) { for (const o of a) if (o && !M.has(o)) M.set(o, new Error('add')); return add.apply(this, a); };
}
