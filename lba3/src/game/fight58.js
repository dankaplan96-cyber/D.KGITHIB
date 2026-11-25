// #58 (ORDER-71, the local agent's play of v168: "the first fights are still hard"): the candidates for the first two
// fights, behind the URL switch ?fight58=a|b|c (several: ?fight58=a,c). Without it the game is exactly as it was.
// docs/lba-maturity/FIGHTS58.md has the diagnosis and the numbers.
//  a  the drones' bolt: a tell that reads (a thicker aim line that ends bright, every drone and every guard: the line was
//     1–2 px at the play camera) and, in the first two fights only (the Citadel depot, the Zeelich depot), a longer tell
//     and a longer rest between shots. Later fights keep their timing, so the curve still rises
//  b  cover and a heart: in each depot yard a stack of crates tall enough to break a drone's line, near what he came for,
//     and the Citadel depot's barrels on the public path give a heart when searched (LBA2's giver; the Zeelich yard's
//     barrels already do)
//  c  the Zeelich depot's Grobo guard: a longer pause after his baton strike (hit or miss), long enough for a charged
//     throw back; the baton's hit stays 2 (the user's pick, v162)
const q = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('fight58') || ''; } catch { return ''; } })();
export const FIGHT58 = new Set(q.toLowerCase().split(/[,|\s]+/).filter((k) => /^[abc]$/.test(k)));
export const f58 = (k) => FIGHT58.has(k);
// (a) the first two fights' drones: tell (s, × the difficulty's wind-up) and rest after a shot (s, × its cool), against
// enemies.js DRONE_TUNE's 0.75 and 1.6
export const DRONE_EARLY = { tell: 1.1, cool: 2.6 };
// (a) every aim line (drones, guards): its width × LINE_K, and how bright it ends (opacity), against 1 and 0.75
export const LINE_K = 3, LINE_END = 1.0;
// (c) the Zeelich depot's Grobo guard: after a strike he holds the baton down this long (s) before he comes on, and
// waits this long more before the next wind-up (s), against guards.js GUARD_TUNE's 0.9 and 1.2
export const ZGUARD_PAUSE = { recover: 1.7, strikeCool: 2.2 };
// (b) the cover pieces, in each yard's own design metres ([x, z, crates high]): two stacks of two crates side by side,
// 2 m tall (a stack under 1.6 m lets a drone see over it: island.js crateStack), clear of every round by 1 m or more.
// The Citadel depot: between the drones' loop (its east leg at x 13) and where he stands to turn the valve (17, 52.5);
// the Zeelich depot: between the drones' beat (the east half, x 17.8–20) and the guard's way from the gate to the locker
export const COVER58 = { citadel: [[14.6, 51.9, 2], [14.6, 52.9, 2]], zeelich: [[16.0, 16.6, 2], [16.0, 17.6, 2]] };
