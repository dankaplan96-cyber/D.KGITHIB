// FLAT-TOWN (the user, 22.11, with LBA2's Citadel beside ours: "Everything on the floor is crooked ... where hills are
// needed, have them; where not, then not"; and of the sea edge by the water office: "In the original game it was really
// built like a wall"). LBA2's town is one flat plateau: the square, the streets and the plots at one level, the hills
// only in the natural ground, and where the town meets the sea or a lower level a straight built wall. Ours followed
// the terrain's rolling grid under the paving. The shapes here are shared by world.js (the ground) and island.js (the
// masonry and its colliders); no imports, so both can read them.
//
// - TOWN_FLAT: the town's level ground (the island's own TOWN_Y). In the zones below every bump the old ground had under
//   1.1 m goes (the town's noise, the old "rise" by Bug Street, the plots' slopes); a natural feature over 2.8 m (a
//   shelf's face, the sea cliff) keeps its shape; on the paving (streets, square, yards) the ground is the level even
//   where a shelf's foot ran into it (up to 1.6 m). world.js flatTown.
// - PROM: the sea wall's promenade on the first shelf (LBA2's raised walk along the west shore, its lanterns and rails
//   in a row on it), one level strip from its north end to the knoll by the water office, straight-faced: its sea face
//   a built wall down to the water, its inland face a wall where the ground behind it is low (behind the water office).
//   The faces stand on the terrain's grid lines (world.js buildHeightGrid: X0 −206, 0.928571 m), so the top is level to
//   the face; the grid row out from it is the low ground, and the bank between is inside the wall (HARBOUR-BRINK's way).
// - PROM_STAIR: the way up to it from the town (PATHS[5]'s line, z −4.5): a straight flight of steps from the street's
//   level to the promenade's, where the old path's ramp ran up the shelf's face in a twisted bank.
export const TOWN_FLAT = 2.3;
// The user, 22.11, later: "Don't make Citadel one single flat plane! Check what was in LBA2!" LBA2's own heights
// (tools/worldscore/ref/citadel.json, its island's height grid, in our frame; m over its streets): the streets and
// most plots 0; the square a raised plaza, its platform +0.21/+0.42 in two steps all round (+0.63 at its middle); the
// harbour's platform +0.83; the promenade on the west shore +3.76 (our first shelf, PROM_H); the terraces' foot ramps
// (to the stepping stones' shelf, up to the fort) from the street's level. PLAZA: our square (the kerb ring round the
// well, town.js) at LBA2's platform height, two stone steps round it.
export const PLAZA = { x: -42, z: -4, r: 8.85, step: 0.21, n: 2, tread: 0.5 };   // (its top inside r; each step `tread` wide outward)
export const PROM_H = 2.3 + 3.76;   // (level(1): TOWN_Y + SHELVES[0], citadel-layout.js)
const GX = (i) => -206 + i * (260 / 280), GZ = (j) => -114 + j * (260 / 280);
export const PROM = {
  xo: GX(140),   // −76.000: the sea face's foot row (the low side)
  x0: GX(141),   // −75.071: the strip's first row (level)
  x1: GX(144),   // −72.286: its last row inland (level)
  xi: GX(145),   // −71.357: the first row inland (the low ground behind the water office)
  z0: -29.4, z1: GZ(143) + 0.3,   // its north end (the shelf rises on to the second level there); its south end, the
                                   // last level row 18.79 (the knoll's rail, z 18.7, on it), the low row 19.71 past it
};
// the walls: boxes [x0, x1] × [z0, z1] in world metres, top at PROM_H, foot below the low side's ground; each face 0.05 m
// past its low row (so that row's ground meets the face), each back 0.08 m inside the last level row
export const PROM_WALLS = [
  { id: 'sea', x0: PROM.xo - 0.05, x1: PROM.x0 + 0.08, z0: PROM.z0, z1: GZ(144) + 0.05, foot: -3.4 },
  { id: 'south', x0: PROM.xo - 0.05, x1: PROM.x1 + 0.08, z0: GZ(143) - 0.08, z1: GZ(144) + 0.05, foot: TOWN_FLAT - 0.4 },
  { id: 'inland', x0: PROM.x1 - 0.08, x1: PROM.xi + 0.05, z0: GZ(120) - 0.05, z1: 16.4, foot: TOWN_FLAT - 0.4 },
];
// the flight: along x from its foot (xa, the town's level) to its top (xb, the strip's inland row), between zN and zS;
// its south face 0.05 m past the grid row −2.57 (the town's level there: the ground under the steps falls to it inside
// the flight's block); its north side against the shelf's face. n steps.
export const PROM_STAIR = { xa: GX(151), xb: PROM.x1, zN: -5.8, zS: GZ(120) + 0.05, n: 20 };   // (xa −65.786: its foot on a grid column, the street's level)
// what the scatter's leftovers must keep out of (world.js filters them after the scatter, so no random draw moves)
export function flatClear(x, z, pad = 0) {
  for (const W of PROM_WALLS) if (x > W.x0 - pad && x < W.x1 + pad && z > W.z0 - pad && z < W.z1 + pad) return true;
  const S = PROM_STAIR;
  return x > S.xb - pad && x < S.xa + 0.4 + pad && z > S.zN - 0.3 - pad && z < S.zS + 0.3 + pad;
}
// and the way onto the flight: its foot, 2.4 m before the first step, the flight's width (a placed prop keeps off it)
export function flatKeep(x, z, pad = 0) {
  const S = PROM_STAIR;
  return flatClear(x, z, pad) || (x > S.xa - pad && x < S.xa + 2.4 + pad && z > S.zN - pad && z < S.zS + pad);
}
