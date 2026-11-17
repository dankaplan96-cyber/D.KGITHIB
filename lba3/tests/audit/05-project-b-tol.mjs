// RELEASE-AUDIT-v96: segment 05 with ONE harness change, labelled. Its step "behind the pier: the bypass" walks to the
// upper cock's front with a 0.5 m tolerance and expects ct_seen, which the game sets once he is past the alcove line
// (pumproom.js alcoveX + 0.2 = 0.39 m west of that front): the bot stops 0.44 m short, 5 cm before the line
// (tests/audit/seg05-diag.mjs). Here the same walk ends within 0.2 m.
// And "Zoé: out": after sneakTo the step calls P.through(the office exit) even when her part has already ended (the
// scene puts Twinsen outdoors): the bot then walks toward the office's coordinates (x 1304) across Citadel, off the
// east cliff by the beam pad, four times (2 life each; tests/audit/05-damage-log.mjs). Here P.through only while
// still in the office. Every other step is the segment's own.
import { steps as S } from '../playthrough/05-project-b.mjs';
export const steps = S.map((s) => (s[0].startsWith('behind the pier') ? ['behind the pier: the bypass (audit: walk tol 0.2 m)', () => {
  const U = game.room.pump; P.go(U.cocks.upper.front.x, U.cocks.upper.front.z + 0.3, { tol: 0.2 }); game.step(0.6); P.settle();
  return { seen: !!game.flags.ct_seen, x: +game.hero.pos.x.toFixed(2), fail: game.flags.ct_seen ? null : 'ct_seen' };
}] : s[0] === 'Zoé: out' ? ['Zoé: out (audit: no walk to the office exit once outdoors)', () => {
  const G = game, e = G.room.exits[0];
  for (let k = 0; k < 4 && G.room?.id === 'projoffice'; k++) { P.sneakTo(e.x, e.z, G.story.cur.watcher, { tol: 0.6 }); P.settle(); if (G.room?.id === 'projoffice') P.through(e.x, e.z); P.settle(); }
  return { zoeDone: G.flags.c1_zoeDone, body: G.hero.body, fail: G.flags.c1_zoeDone ? null : 'zoe' };
}] : s));
