// CPU-RELIEF: does a typed-array read at Math.round(x) deoptimise when x rounds to -0 (x in (-0.5, 0])? Run with
// node --trace-deopt minus0.mjs [round|floor] and count the deopts; prints the time per pass.
const RM = new Float32Array(64).fill(1), mode = process.argv[2] || 'round';
function f(xs) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    const yb = mode === 'round' ? Math.round(xs[i]) : Math.floor(xs[i] + 0.5);
    if (yb < 0 || yb >= 64) continue;
    const r = RM[yb];
    if (!r) continue;
    s += r * xs[i];
  }
  return s;
}
const xs = new Float32Array(4096).map((_, i) => (i % 97 === 0 ? -0.2 : (i % 600) / 10));
let s = 0;
for (let k = 0; k < 300; k++) s += f(xs);
const t0 = performance.now();
for (let k = 0; k < 3000; k++) s += f(xs);
console.log(mode, 'µs per pass', ((performance.now() - t0) * 1000 / 3000).toFixed(2), s.toFixed(1));
