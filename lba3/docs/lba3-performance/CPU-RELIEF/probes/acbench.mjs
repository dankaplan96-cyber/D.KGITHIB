// CPU-RELIEF: ARM-CLEAR's solve (rig.js acSolve / acDepth, copied from the source) on synthetic data in node, its time per
// solve and the heap it leaves per call: does the depth loop allocate (boxed numbers) and does a variant help?
//   node acbench.mjs [orig|sqrt] [N]
import * as THREE from '../../../../vendor/three/build/three.module.min.js';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../../../src/engine/rig.js', import.meta.url), 'utf8');
const a = src.indexOf('function acDepth('), b = src.indexOf('\n// the least turn out', a), c = src.indexOf('function acSolve('), d = src.indexOf('\n}\n', c) + 3;
let code = src.slice(a, b) + '\n' + src.slice(c, d);
const variant = process.argv[2] || 'orig';
if (variant === 'sqrt') code = code.replace('const r = Math.hypot(x, z);', 'const r = Math.sqrt(x * x + z * z);');
if (variant === 'patch') {
  const H = Math.hypot;
  Math.hypot = function hypot(a, b, c) {
    const n = arguments.length;
    if (n === 2) { const r = Math.sqrt(a * a + b * b); if (r > 1e-140 && r < 1e140) return r; }
    else if (n === 3) { const r = Math.sqrt(a * a + b * b + c * c); if (r > 1e-140 && r < 1e140) return r; }
    return H.apply(Math, arguments);
  };
}
const mk = new Function('THREE', `const AC_GAP = 0.014, AC_DY = 0.02, AC_NS = 32, AC_MAX = 1.1;
const _acE = new THREE.Euler(0, 0, 0, 'XZY'), _acQ = new THREE.Quaternion(), _acS = new THREE.Matrix4(), _acA = new THREE.Matrix4(), _acB = new THREE.Matrix4();
${code}
return { acDepth, acSolve };`);
const { acSolve } = mk(THREE);
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ny = 60, T = new Float32Array(ny * 32).map(() => 0.12 + rnd() * 0.05), H = new Float32Array(ny * 32).map(() => 0.14 + rnd() * 0.05);
const rm = (R) => { const M = new Float32Array(ny); for (let y = 0; y < ny; y++) for (let k = 0; k < 32; k++) if (R[y * 32 + k] > M[y]) M[y] = R[y * 32 + k]; return M; };
const pts = () => new Float32Array(Array.from({ length: 36 * 3 }, () => (rnd() - 0.5) * 0.3));
const D = { prof: { y0: 0.5, ny, T, H, TM: rm(T), HM: rm(H) }, pts: { L: { el: pts(), hand: pts() }, R: { el: pts(), hand: pts() } }, TB: new THREE.Matrix4(), HB: new THREE.Matrix4(), dir: [1, 0], k: { L: [0, 1, 0], R: [0, 1, 0] } };
const sh = new THREE.Object3D(); sh.position.set(0.2, 1.3, 0);
const Mel = new THREE.Matrix4().makeTranslation(0, -0.3, 0), Mhand = new THREE.Matrix4().makeTranslation(0, -0.55, 0), Mt = new THREE.Matrix4().makeTranslation(0, 1.0, 0);
let s = 0; const N = +(process.argv[3] || 20000);
for (let i = 0; i < 3000; i++) { D.k.L[0] = 0; s += acSolve(D, 'L', sh, 1, Mel, Mhand, Mt); }
const h0 = process.memoryUsage().heapUsed, t0 = performance.now();
for (let i = 0; i < N; i++) { D.k.L[0] = 0; sh.rotation.z = (i % 7) * 0.01; s += acSolve(D, 'L', sh, 1, Mel, Mhand, Mt); }
const t1 = performance.now();
console.log(variant, 'µs per solve', ((t1 - t0) * 1000 / N).toFixed(2), '· heap growth MB', ((process.memoryUsage().heapUsed - h0) / 1048576).toFixed(1), '· checksum', s.toFixed(3));
