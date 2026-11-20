// RELEASE-AUDIT-v96: segment 11 with ONE harness change, labelled. After "Zoé: Hedda and Tobin" Zoé stands 0.37 m from
// the neighbours' front door (-29.5, 75.0); the next step's walk to the landing starts through that door and she ends
// inside the neighbours' house, where the handover never comes (the chain's seg-11 log, trace-11 [446.9]). Here, if a
// walk ends indoors, she walks back out through the room's exit and on to the landing (all by input). Every other step
// is the segment's own.
import { steps as S } from '../playthrough/11-evacuation.mjs';
export const steps = S.map((s) => (s[0] === 'Zoé: to the landing → Twinsen' ? ['Zoé: to the landing → Twinsen (audit: out again if a door took her in)', () => {
  const G = game, f = G.flags, L = G.world.laneGate, rooms = [];
  if (!f.ev_v) return { skip: 'no thread' };
  for (let k = 0; k < 3; k++) {
    if (G.room) { rooms.push(G.room.id); const e = G.room.exits.find((x) => !x.room) || G.room.exits[0]; P.through(e.x, e.z); P.settle(); }
    P.go(L.landing.x + 1.6, L.landing.z + 0.4, { tol: 1.2, run: true, maxT: 120 });
    for (let i = 0; i < 60 && G.trans; i++) G.step(0.1); P.settle();
    if (!G.room) break;
  }
  let t = 0; while (!(f.c8_zoeDone && G.hero.body === 'twinsen' && G.state === 'play' && !G.trans) && t < 60) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); }
  P.settle();
  return { rooms, done: !!f.c8_zoeDone, body: G.hero.body, waited: +t.toFixed(1), fail: f.c8_zoeDone && G.hero.body === 'twinsen' ? null : 'handover' };
}] : s));
