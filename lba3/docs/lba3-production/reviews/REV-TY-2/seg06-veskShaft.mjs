// REV-TY-2: tests/playthrough/06-zeelich.mjs's last two steps (Vesk, the shaft), unchanged, after walking out of the
// workshop (the save was made there after the test pair with Baldino away)
import { steps as all } from '../../../../tests/playthrough/06-zeelich.mjs';
export const steps = [
  ['out of the workshop to the platform', () => { if (game.room?.id === 'workshop') { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); } const g = game.rooms.zeelich.platform.gate; const r = P.go(g.x, g.z + 4, { tol: 1.5, run: true, maxT: 120 }); return { r: r.r, room: game.room?.id }; }],
  ...all.slice(11, 13),
];
