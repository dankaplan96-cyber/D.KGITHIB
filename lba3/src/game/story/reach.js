// NO-AIR (the user, 10.11.2026: "no actions in the air"): Twinsen's hand on a real thing. Each one-shot clip of the rig
// puts his right hand at a known place from where he stands and faces — measured on the hero's rig, 11.11.2026
// (forward m, to his right m, up m, the time into the clip the hand is there):
//   pickup 0.59 · 0.44 · 0.49 · 0.5 s      setDown 0.61 · 0.42 · 1.05 · 0.6 s     tinker 0.55 · 0.38 · 1.17–1.26 (working)
//   touchWater 0.59 · 0.43 · 1.36 · 0.6 s  reach 0.60 · 0.42 · 1.48 · 0.5 s (held)
// So a thing he handles is built at one of those heights, the clip is the one for its height, and he is stood where the
// hand meets it: standFor(). A touch point is { x, z, a, clip } (world metres; a: the way he faces it).
const HAND = {
  pickup: { f: 0.59, r: 0.44, t: 0.5, dur: 1.0 },
  setDown: { f: 0.61, r: 0.42, t: 0.6, dur: 1.2 },
  tinker: { f: 0.55, r: 0.38, t: 0.5, dur: 1.3 },
  touchWater: { f: 0.59, r: 0.43, t: 0.65, dur: 1.3 },
  reach: { f: 0.6, r: 0.42, t: 0.5, dur: 1.2 },
};
// where he stands, facing `a`, for the clip's hand to be at (x, z)
export function standFor(clip, x, z, a) {
  const H = HAND[clip] || HAND.reach;
  return { x: x - Math.sin(a) * H.f + Math.cos(a) * H.r, z: z - Math.cos(a) * H.f - Math.sin(a) * H.r };
}
// a touch point with the spot he stands on worked out (`front`, as the tests and the walk use it)
export const touch = (x, z, a, clip, extra = {}) => ({ x, z, a, clip, front: standFor(clip, x, z, a), ...extra });
// he steps to the spot (story/life.js leaves a marked walk alone), turns to face the thing, and the clip plays; fn runs
// as the hand meets it. dur: the clip's length when the work takes longer (the hand is there from its contact time on)
export function handTo(h, p, fn, dur = null) {
  const H = HAND[p.clip] || HAND.reach, d = dur ?? H.dur;
  const go = () => { h.angle = p.a; h.act(p.clip, d, fn, Math.max(0, d - H.t)); };
  h.walkTo([p.front || standFor(p.clip, p.x, p.z, p.a)], { a: p.a, speed: 1.6, then: go, fail: go });
  if (h.steer) h.steer.indoor = true;
}
