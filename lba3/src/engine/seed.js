// Test Lab (NEEDS_FROM_GAME 1): gameplay randomness from a seed, so two runs of the same input timeline play the same
// game. Off unless asked: ?seed=N in the URL (from the first module on), or game.seed(n) (e.g. before New Game).
// Math.random is replaced by a small seeded generator (mulberry32); game.seed(null) puts the browser's back.
const native = Math.random;
let seeded = null;
export function seedRandom(n) {
  if (n === null || n === undefined || !Number.isFinite(+n)) { Math.random = native; seeded = null; return null; }
  let s = (+n >>> 0) || 1;
  Math.random = function seededRandom() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  seeded = +n >>> 0;
  return seeded;
}
export const randomSeed = () => seeded;
if (typeof location !== 'undefined') {
  const q = new URLSearchParams(location.search);
  if (q.has('seed')) seedRandom(q.get('seed'));
}
