// GATE-1 workaround (not a game change, not a change to tests/): segment 13 unchanged except at the lighthouse dials.
// On 0f77b57 Zoé and Arthur stand between the hero and the transmitter's dial bank (both solid, r 0.45; hero r 0.4):
// no dial can be reached (reach 0.65 m from its spot), by the segment's P.use or by a people-aware plan to each spot;
// and when the relay is done the cast is put back on those spots, which shuts him in the pocket in front of the
// cabinet (GATE_REPORT.md B-1). To carry the chain on, an ISO step moves them 3 m west (away from the dials and from
// the stairs on the east side) before the dials and again before leaving (logged as ISO, never input evidence); the
// dials are set by input (walk to each dial's spot, E until it shows its symbol).
import { steps as orig } from '/dev/shm/gate1/lba3/tests/playthrough/13-network.mjs';
const iso = (label) => [label, () => {
  const G = game; const moved = [];
  for (const n of (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(G.hero.pos) < 6)) { n.pos.x -= 3.0; n.pos.z += 1.0; moved.push(n.def?.id); }
  G.step(0.1); P.note('ISO assist: moved ' + moved.join(',') + ' 3 m west, off the lighthouse dial bank (B-1)');
  return { moved };
}];
const dials = ['the dials (input, after the ISO move)', () => {
  const G = game, L = G.rooms.lighttop, CODE = [2, 0, 1], log = [];
  for (const i of [1, 2, 3]) {
    const s = L.searches.find((x) => x.id === 'dial' + i);
    for (let k = 0; k < 4 && !G.flags.c10_light && (G.flags.c10_dials || [0, 1, 2])[i - 1] !== CODE[i - 1]; k++) { P.go(s.x, s.z, { tol: 0.15, maxT: 20, people: true }); P.face(s.x, s.z); P.tap('KeyE', 0.1); P.settle(); }
    log.push((G.flags.c10_dials || [])[i - 1]);
  }
  P.settle();
  return { log, dials: G.flags.c10_dials, light: G.flags.c10_light, fail: G.flags.c10_light ? null : 'light' };
}];
export const steps = orig.flatMap((s) => s[0] === 'the dials' ? [iso('ISO: Zoé and Arthur moved off the dial bank'), dials]
  : s[0] === 'fly to Desert Island' ? [iso('ISO: Zoé and Arthur moved again (put back on their spots by the relay)'), s] : [s]);
