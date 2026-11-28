// CPU-RELIEF (P137b, the user 26.11: "relieve the processor"): Math.hypot, game-wide.
//
// The game calls Math.hypot ~1 160 times in its source, many in per-frame loops: ARM-CLEAR's depth test (rig.js acDepth,
// ~150 points per arm, several looks a frame per person), the walkers' planner, the camera's clearance, physics. In V8
// Math.hypot is a builtin taking any number of arguments: an optimised loop cannot inline it, so every call boxes its
// arguments and its result as heap numbers and goes through the builtin's general path. On the Citadel street (Medium)
// acDepth alone left ~530 KB of garbage per drawn frame (PERF-CPU probes/alloc.mjs), and a solve ran 2-2.7x slower
// than with an inlined square root (CPU-RELIEF probes/acbench.mjs, same answers).
//
// Here Math.hypot is replaced, once, at startup, by a plain function the optimiser can inline: for 2 or 3 finite,
// ordinary-sized arguments it returns Math.sqrt of the sum of squares (within an ulp of the builtin's answer); everything
// else — any other count of arguments, NaN, an infinity, a result under 1e-140 or over 1e140, where the builtin's
// scaling matters — goes to the builtin itself (all zeros answer 0, as the builtin does), so those cases answer exactly as before. Nothing else changes.
// `?slowhypot` (or FASTMATH.uninstall()) keeps the builtin: the A/B switch.
const BUILTIN = Math.hypot;
function hypot(a, b, c) {
  const n = arguments.length;
  if (n === 2) { const r = Math.sqrt(a * a + b * b); if (r > 1e-140 && r < 1e140) return r; if (a === 0 && b === 0) return 0; }
  else if (n === 3) { const r = Math.sqrt(a * a + b * b + c * c); if (r > 1e-140 && r < 1e140) return r; if (a === 0 && b === 0 && c === 0) return 0; }
  return BUILTIN.apply(Math, arguments);
}
export const FASTMATH = {
  builtin: BUILTIN, hypot,
  get on() { return Math.hypot === hypot; },
  install() { Math.hypot = hypot; },
  uninstall() { Math.hypot = BUILTIN; },
};
if (!(typeof location !== 'undefined' && /[?&]slowhypot\b/.test(location.search))) FASTMATH.install();
if (typeof window !== 'undefined') window.__fastmath = FASTMATH;
