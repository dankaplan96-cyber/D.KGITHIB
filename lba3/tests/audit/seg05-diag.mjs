// RELEASE-AUDIT-v96: segment 05 stopped at "behind the pier: the bypass" (ct_seen never set). This runs segment 05's
// own steps up to that point (imported, unchanged), then reads why: the pump room's alcove line against where he stands,
// the story line's state, then walks on east by input to see whether the flag comes at all. Use with tests/lib/seg.mjs
// and LOAD=<the chain's save after segment 04>.
import { steps as S } from '../playthrough/05-project-b.mjs';
const upto = S.findIndex((s) => s[0].startsWith('behind the pier'));
export const steps = [
  ...S.slice(0, upto),
  ['diag: where he stands against the alcove line', () => {
    const U = game.room.pump, h = game.hero, L = game.story.lines?.find?.((l) => l.R === game.room) || null;
    return { hx: +h.pos.x.toFixed(2), hz: +h.pos.z.toFixed(2), alcoveX: U.alcoveX, need: U.alcoveX + 0.2, upperFront: U.cocks.upper.front, lowerFront: U.cocks.lower.front, pier: U.pier,
      state: game.state, c1_water: !!game.flags.c1_water, ct_felt: !!game.flags.ct_felt, ct_bypass: !!game.flags.ct_bypass, ct_seen: !!game.flags.ct_seen };
  }],
  S[upto],
  ['diag: east along the wall by input (Right / Up), 6 tries', () => {
    const U = game.room.pump, h = game.hero, tr = [];
    for (let k = 0; k < 6 && !game.flags.ct_seen; k++) { P.go(U.alcoveX + 0.6 + k * 0.1, U.cocks.lower.front.z, { tol: 0.25, maxT: 6 }); game.step(0.5); P.settle(); tr.push([+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)]); }
    return { tr, seen: !!game.flags.ct_seen, need: U.alcoveX + 0.2, fail: game.flags.ct_seen ? null : 'still not seen' };
  }],
];
