// Citadel Island's layout, after the original LBA2 map: coarse outlines (metres, x east, z south) of the
// coast and of the four terrace levels above the town. Traced at ~1.5 m tolerance as a layout guide; the
// terrain itself (terraces, cliffs, coves, noise) is our own (world.js). See docs/LBA2_MEASUREMENTS.md.
// Each polygon is a flat list x0, z0, x1, z1, ...
// CITADEL-TERRACES: the four shelves above the town's ground (3.76 / 7.31 / 11.08 / 13.58 m: the medians of the
// original's traced bands, tools/worldscore/ref/citadel.json), and the top of the rock stack on the rim (the town's
// ground 2.3 m + the top shelf + 2.9 m)
export const SHELVES = [3.76, 7.31, 11.08, 13.58];
export const TOWN_Y = 2.3;
export const CLIFFS_TOP = TOWN_Y + SHELVES[3] + 2.9;
export const COAST = [
  [39.5, 109, 48, 100.5, 51.5, 101.5, 53.5, 99.5, 51, 93.5, 52.5, 90, 51, 65, 53.5, 59, 51, 17, 53.5, 14.5, 53.5, 7, 48.5, -4.5, 51, -7.5, 52, -31, 54.5, -33.5, 54.5, -55, 63.5, -57, 76.5, -67, 74, -71, 77.5, -75.5, 79, -85, 78, -87, 68.5, -86, 58, -98, 44.5, -106.5, 34, -106.5, 28.5, -101.5, 23, -104, 13.5, -102.5, 7, -106.5, 1.5, -101, 0.5, -92.5, -3.5, -92, -4.5, -99.5, -14.5, -109, -24, -109, -27, -105.5, -27.5, -99, -32.5, -103, -37.5, -103, -48, -95.5, -53.5, -80.5, -49, -78.5, -44.5, -82.5, -40.5, -81.5, -51, -72, -51, -67, -46, -63, -38.5, -63, -35, -66.5, -31, -64, -16, -64, -10.5, -60, -9.5, -55, -5, -57, 0.5, -55.5, 0.5, 3.5, -30, 4, -30.5, 21.5, -43.5, 22, -44, 34, -38.5, 34.5, -37.5, 28.5, -16.5, 28.5, -15.5, 35.5, -1.5, 35.5, -1.5, 44.5, -4.5, 49, -4, 55.5, 5, 58.5, 5.5, 62.5, 11.5, 67, 2.5, 73, -6, 74, -17, 70, -22.5, 64.5, -34, 64.5, -46, 78, -37.5, 84.5, -16.5, 80.5, -24, 86, -33.5, 87, -34.5, 92.5, -31.5, 94.5, -27.5, 94.5, -21.5, 87.5, -14.5, 88.5, -7, 84.5, 0, 85, 5, 80, 8, 85.5, 2, 92.5, 4.5, 99.5, 10.5, 96.5, 15.5, 99, 21.5, 88.5, 30, 86, 34.5, 97.5, 31, 106, 34, 109],
  [-81.5, -3, -63, -22.5, -64.5, -25, -62, -31.5, -64.5, -41, -67.5, -44, -72, -46.5, -75.5, -44, -81.5, -48.5, -98.5, -42.5, -104, -26.5, -98, -13, -88, -4],
  [81.5, -86, 91, -92.5, 88.5, -97.5, 92, -102.5, 89, -109, 82, -106, 76, -105, 66.5, -95, 67.5, -92, 73.5, -92],
];
export const LEVELS = [
  [
    [37.5, 107.5, 48.5, 91.5, 46, 75.5, 42, 70.5, 34, 70, 28.5, 73, 24, 71.5, 19.5, 76.5, 16.5, 71.5, 9.5, 82, 6.5, 79.5, 9, 85, 12.5, 85, 6.5, 91.5, 6.5, 94, 9, 94, 4, 98.5, 5, 99.5, 11, 96.5, 13.5, 91.5, 24, 84.5, 30, 76.5, 34, 76, 39, 85, 38, 100, 34.5, 102.5],
    [-29, 81, -22, 78, -22, 72, -31.5, 68, -37, 73, -37, 76, -32.5, 81],
    [10.5, 4, 10.5, -1.5, 6, -2, 5.5, -7, 10.5, -7.5, 10.5, -9.5, 5.5, -10.5, 5.5, -17, 10.5, -18, 10.5, -32.5, 15, -33.5, 15.5, -38, 32.5, -38, 33.5, -33, 40, -33, 41, -42.5, 54, -42.5, 54.5, -55, 63.5, -57, 76.5, -67, 72.5, -70, 77.5, -76, 78.5, -85, 68.5, -86, 58, -98, 44.5, -106.5, 35, -106.5, 28.5, -101.5, 23, -104, 13.5, -102.5, 7.5, -106.5, 2, -102, 2, -99.5, 0.5, -92.5, -3.5, -92, -4.5, -99.5, -14.5, -109, -23, -109, -27, -105.5, -27.5, -99, -32.5, -103, -37.5, -103, -48, -95.5, -52.5, -81.5, -51.5, -79, -45.5, -83.5, -40, -81.5, -51, -72, -51, -67, -46, -63, -39.5, -64, -34, -68, -31, -64.5, -25, -65.5, -24, -64, -17, -66.5, -10, -61, -9.5, -55, -5, -57, 0.5, -55.5, 0.5, 3.5],
    [-81.5, -3, -64, -21.5, -65.5, -24, -62, -31.5, -67.5, -43, -72, -46, -75.5, -44, -81.5, -48.5, -96.5, -43, -104, -26.5, -98, -13, -88, -4],
    [81.5, -86, 91, -92.5, 88.5, -97.5, 92, -102.5, 89, -109, 82, -106, 76, -105, 66.5, -95, 67.5, -92, 73.5, -92],
  ],
  [
    [40, 97, 44, 88, 43, 79, 34, 71.5, 28.5, 74, 24.5, 73, 25, 80, 31.5, 75, 37, 77, 40, 84],
    [-85, -4.5, -79, -7.5, -74, -13, -65.5, -29, -65.5, -33.5, -72, -41.5, -78, -40.5, -81.5, -44, -95, -40.5, -100.5, -27.5, -100.5, -23, -93.5, -10.5],
    [54, -43, 54.5, -55.5, 65, -58.5, 76, -67, 72.5, -72, 77.5, -79.5, 77, -85, 73.5, -83.5, 71, -86, 69.5, -84.5, 65, -86, 61.5, -92, 52, -98.5, 50.5, -102.5, 43.5, -105.5, 34, -105, 26.5, -99.5, 19.5, -104, 13.5, -100.5, 7.5, -105.5, 2, -101, 1, -91, -5.5, -91.5, -7.5, -101, -13, -100.5, -12.5, -105.5, -15.5, -108.5, -24, -107.5, -26, -105.5, -25, -101.5, -28.5, -97, -32.5, -102.5, -37, -102.5, -48.5, -93.5, -52, -81.5, -50.5, -80, -46, -84.5, -42, -84.5, -39, -81.5, -50, -71, -50, -67.5, -46, -64, -40, -64, -34, -70, -31.5, -66.5, -16.5, -68, -7.5, -60, -8.5, -56, -5, -58, 1.5, -56.5, 1.5, -48, 3.5, -46.5, 11, -47.5, 13.5, -51, 16.5, -46],
    [81.5, -87, 89.5, -90.5, 88.5, -99.5, 91, -103.5, 89, -109, 81.5, -105.5, 67, -95, 69.5, -92, 74.5, -93, 76, -88.5],
  ],
  [
    [-82, -6.5, -73, -20.5, -70.5, -31, -74.5, -37, -85, -39.5, -93, -37, -97, -25, -89.5, -14.5, -88.5, -7.5],
    [53, -52.5, 55, -57, 61, -57, 68.5, -64, 74, -65, 70.5, -73, 75, -74.5, 77.5, -80.5, 76, -85, 73.5, -83.5, 64, -85, 51.5, -99, 49.5, -98, 46, -101.5, 40, -103, 25.5, -95.5, 21.5, -100.5, 13.5, -100.5, 11, -103, 6.5, -99.5, 1.5, -87, -5.5, -87.5, -4.5, -90.5, -8, -100, -9.5, -101.5, -13.5, -99, -15, -100, -12.5, -103.5, -19, -109, -25.5, -105.5, -23.5, -99.5, -27.5, -95.5, -32.5, -101.5, -36, -101.5, -43, -96.5, -50, -90, -52, -83, -50.5, -80, -46, -84.5, -42, -84.5, -39, -81.5, -49, -71, -48.5, -67, -43.5, -64, -39.5, -64.5, -34, -71.5, -30, -68, -14.5, -70, -6.5, -62.5, -8.5, -57, -3.5, -58.5, 1, -58, 1.5, -54.5, 7.5, -57, 14.5, -53.5, 15.5, -55, 5.5, -61.5, 5.5, -67.5, 7.5, -70, 15.5, -70, 17.5, -67, 15.5, -64.5, 11, -65.5, 9, -62.5, 14.5, -58, 20.5, -58, 21.5, -53.5, 25.5, -54, 25.5, -58.5, 28.5, -56, 44.5, -58, 47.5, -56.5, 48, -53.5],
    [81.5, -87, 89.5, -92.5, 88.5, -101, 90.5, -102.5, 89, -109, 82, -105, 68, -95, 74.5, -93, 76, -88.5],
  ],
  [
    [55.5, -56, 65.5, -61, 60.5, -63.5, 61, -67.5, 71, -76, 73, -74, 77.5, -80.5, 76, -85, 73.5, -83.5, 65, -84.5, 51.5, -99, 49.5, -97, 43.5, -101.5, 37.5, -101.5, 25.5, -93.5, 22, -96, 20.5, -100.5, 13.5, -99.5, 11, -103, 6.5, -99.5, 2, -87.5, -5, -87, -8, -100, -15, -99.5, -12.5, -103.5, -16.5, -108.5, -19.5, -109, -25.5, -105.5, -23.5, -99.5, -27.5, -95.5, -31.5, -99.5, -36, -101.5, -50, -89, -50.5, -80, -46, -84.5, -42, -84.5, -39, -81.5, -46.5, -71, -46, -67.5, -42, -65.5, -34, -71.5, -21.5, -69, -19.5, -71.5, -14.5, -71.5, -6.5, -64, -5, -59.5, 1, -58, 3, -65, 5.5, -66, 4, -67.5, 7.5, -71.5, 12, -71.5, 15.5, -70.5, 19.5, -64.5, 22, -66, 21, -69.5, 24, -70, 28.5, -58, 30.5, -58, 28, -61, 29, -65.5, 30, -63, 41, -64.5, 46, -62.5, 47.5, -58, 45.5, -57],
    [60.5, -75.5, 57.5, -76, 55.5, -80, 51.5, -79, 43.5, -87, 38.5, -86, 36.5, -88, 37.5, -90.5, 43, -91, 51.5, -87, 56.5, -87, 64, -79.5],
    [81.5, -87, 88.5, -92.5, 88.5, -97.5, 85, -105, 80, -99.5, 71, -97, 68, -94, 74.5, -93],
  ],
];

// The original's street furniture, from its object list (positions in our frame, LAYOUT applied; facing in
// quarter turns, 0 = toward +z; y = the original's ground level, used to skip spots where our ground is lower,
// e.g. the quay basin under the original's upper promenade). island.js fits each one to our island.
export const PROPS = {
  // street lamps: the first four stand around the square (town.js), the others by the plaza and the harbour
  lamps: [[-37, -8.4], [-37, -0.7], [-46.5, -0.7], [-46.5, -8.4], [-44, 52.2], [-56.6, 52.2], [-56.6, 34.6], [-44, 34.6], [-63.6, 26.2]],
  // low lanterns (0.9 m) in pairs along the promenade and around the harbour wing [x, z, y]
  lanterns: [[-74.3, 8.5, 4.2], [-74.3, 7, 4.2], [-74.3, -0.9, 4.2], [-74.3, -2.4, 4.2], [-74.3, -10.3, 4.2], [-74.3, -11.8, 4.2],
    [-74.3, -19.7, 4.2], [-74.3, -21.2, 4.2], [-74.3, -29.2, 4.2], [-74.3, -30.7, 4.2], [-90.7, 30.4, 1.3], [-86.5, 30.4, 1.3],
    [-118.1, 39.9, 1.3], [-104.4, 39.9, 1.3], [-118.1, 49, 1.3], [-77.3, 30.6, 1.3], [-74.6, 16.6, 4.2], [-74.6, 17.9, 4.2]],
  // benches [x, z, facing]
  benches: [[-94.4, 30.3, 0], [-67.9, 28.4, 1], [-53.3, 34.4, 2], [-47.3, 34.4, 2], [-117.3, 93, 3], [-49.4, 75.1, 2]],
  // bollard runs, 4.4 m: two posts and a rail [x, z, facing, y]
  // (the harbour platform's south quay: the runs stand at the brink, z 43.0, where its level top ends and the bank drops to the
  //  water; at 42.6 they left a strip of quay outside the rail with no footing below it: slidetraps (−91.67, 44.22))
  bollards: [[-92.8, 43.0, 2, 1.3], [-97.9, 43.0, 2, 1.3], [-108, 42.6, 2, 1.3], [-113.1, 42.6, 2, 1.3], [-76.9, 33.1, 1, 1.3],
    [-76.9, 38.3, 1, 1.3], [-76.9, 43.4, 1, 1.3], [-68.2, 18.7, 2, 4.3], [-72.8, 18.7, 2, 4.3]],
  // railings, 6 m [x, z, facing, y]
  rails: [[-74.7, -25.1, 3, 4.2], [-74.7, -15.7, 3, 4.2], [-74.7, -6.3, 3, 4.2], [-74.7, 3.2, 3, 4.2], [-74.7, 12.6, 3, 4.2],
    [-31.5, -28.1, 2, 7.5], [-25.4, -28.1, 2, 7.5], [-22.5, -32, 1, 7.5], [-38.9, -28.1, 2, 7.5], [-50.7, 60.1, 2, 0.4], [-56.8, 60.1, 2, 0.4], [-44.6, 60.1, 2, 0.4]],
  // picket fence pieces, 1.7 m [x, z, facing]
  pickets: [[-93.8, 21.6, 0], [-95.5, 21.6, 0], [-97.2, 21.6, 0], [-33.4, 70.9, 0], [-35.1, 70.9, 0], [-36.7, 70.9, 0], [-38.4, 70.9, 0],
    [-40.1, 70.9, 0], [-41.7, 70.9, 0], [-41.8, 72.6, 1], [-41.8, 74.2, 1], [-41.8, 75.9, 1], [-41.8, 77.6, 1], [-40.2, 77.7, 2], [-38.5, 77.7, 2]],
  // tulip rows (plants 0.7 m apart, 1.1 m deep) [first x, last x, z]
  // (FLAT-TOWN-2: the south block's rows on its raised bed: the first 0.25 m north, clear of the bed's south wall; the
  //  second, LBA2's x −49..−47.3 by the bed's south edge, would stand in our narrower block's east wall: on the bed,
  //  between its two trees)
  tulips: [[-46.5, -43.9, 8.7], [-40.5, -37.9, 8.7], [-95.3, -93.5, 32.7], [-53.3, -51.6, 49.55], [-51.3, -49.6, 44.6], [-41.5, -31.1, 70.1]],
  // trees [x, z, kind]: 0 a round crown (2.7 m wide, 3.7 m tall), 1 a tall one (2.2, 4.6), 4 a palm (3.1 m)
  trees: [[-90.8, -75, 0], [-85.3, -61.5, 0], [-89.1, -69.4, 1], [-93.5, -63.2, 1], [-79, -58.9, 1], [-115, -80.3, 4], [-123.5, -70.9, 4],
    [-26.8, -59.2, 0], [-30.2, -53.8, 0], [-33.6, -55.5, 0], [-37.9, -61.5, 0], [-33.6, -64.9, 0], [-64.3, -46.6, 0], [-60.2, -43.7, 1],
    [-37, -56.4, 1], [-31.9, -59.8, 1], [-25.9, -52.1, 1], [-39.6, -65.8, 1], [-49.9, -61.5, 0], [5.8, -80.3, 4], [8.3, -78.6, 0], [4.9, -74.3, 4],
    [-18.2, -53.8, 1], [-12.2, -49.5, 0], [-61.9, 9.6, 4], [-47.3, 13.2, 0], [-24.2, -19.5, 1], [-81.6, 39.5, 1], [-95.3, 25.6, 0],
    [-53.3, 42.2, 0], [-48.2, 42, 0], [-50.7, 46.7, 0], [-41.2, 21.8, 0], [-55.5, 20.9, 0], [-36.2, 19.4, 0], [-25.3, 65.2, 4], [-69.6, 56.7, 4],
    [-106.4, 106.3, 4], [-103.8, 107.2, 4], [-67.9, 108, 0], [-29.3, 106.3, 4], [-37, 83.2, 1], [-39.6, 120.9, 4], [-65.3, 75.5, 4], [-39.8, 75.3, 0]],
};

// ---- FLAT-TOWN (P103, 22.11; was src/game/flattown.js, folded in here to keep the artifact under its file limit) ----
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
// (FLAT-TOWN-2: the lawns' masonry has its own, lawnClear: its plants keep off by their size)
export function flatClear(x, z, pad = 0) {
  for (const W of PROM_WALLS) if (x > W.x0 - pad && x < W.x1 + pad && z > W.z0 - pad && z < W.z1 + pad) return true;
  const S = PROM_STAIR;
  return x > S.xb - pad && x < S.xa + 0.4 + pad && z > S.zN - 0.3 - pad && z < S.zS + 0.3 + pad;
}
// and the way onto the flight: its foot, 2.4 m before the first step, the flight's width (a placed prop keeps off it);
// FLAT-TOWN-2: the lawns' masonry and the way onto their steps
export function flatKeep(x, z, pad = 0) {
  const S = PROM_STAIR, L = LAWN.steps;
  return flatClear(x, z, pad) || lawnClear(x, z, pad) || (x > L.x0 - pad && x < L.x1 + pad && z > LAWN.box[1] - 1.6 - pad && z < LAWN.box[1] + pad)
    || (x > S.xa - pad && x < S.xa + 2.4 + pad && z > S.zN - pad && z < S.zS + pad);
}

// ---- FLAT-TOWN-2 (P106, 22.11): the south block's raised lawns ----
// LBA2's island grid (tools/worldscore/ref/citadel.json, in our frame) has the block south of the cross street (ours
// between the west street, the fields' path and the two cross streets: world.js TOWN_BLOCK) raised: a ring one cell
// wide at +0.21 over the street round beds at +0.63, a strip of the street's level along its north side (the benches
// and their lamps) and its west side. Ours is 2.8 m narrower than LBA2's (the fields' path runs where LBA2's block's
// east part is), so: on the west and north a kerb (the ring, +0.21) and the bed's retaining wall (+0.63) above it, each
// on one cell of the terrain's grid as the promenade's walls (the bank between a low row and a level row is inside the
// masonry, its top a walkable collider); on the east (by the fields' path) and the south the bed's wall straight from
// the street. The bed: the lawn with its trees, the hopscotch and Maro and Tilde's meeting place. Steps where people go
// on and off it: the north side's middle, from the benches (the kerb, then two steps cut into the bed's wall).
// Grid rows (indices): the bed level at i 163..170, j 163..177; the ring's level rows i 162 (west), j 162 (north);
// the low rows i 161, j 161 (west, north), i 171, j 178 (east, south).
const LG = { i0: 163, i1: 170, j0: 163, j1: 177 };
export const LAWN = {
  ring: TOWN_FLAT + 0.21, bed: TOWN_FLAT + 0.63,
  // the level regions (world.js lawns: grid points inside are at that level)
  bedBox: [GX(LG.i0), GZ(LG.j0), GX(LG.i1), GZ(LG.j1)],
  ringBox: [GX(LG.i0 - 1), GZ(LG.j0 - 1), GX(LG.i1), GZ(LG.j1)],
  // the masonry [x0, x1, z0, z1, top]: the north and west kerbs, the bed's four walls (the north one in two, either
  // side of the steps); each face 0.05 m past its low row, each back 0.08 m inside its level row, and where two meet
  // one ends where the other begins (no two tops overlapping)
  steps: { x0: -52.4, x1: -50.6, z0: GZ(LG.j0 - 1) - 0.05, zm: GZ(LG.j0 - 1) + 0.40, z1: GZ(LG.j0) + 0.08 },
};
{
  const L = LAWN, r = L.ring + 0.02, b = L.bed + 0.02, xw = GX(LG.i0 - 2) - 0.05, xr = GX(LG.i0 - 1) - 0.05, xb = GX(LG.i0) + 0.08,
    xe = GX(LG.i1) - 0.08, xE = GX(LG.i1 + 1) + 0.05, zn = GZ(LG.j0 - 2) - 0.05, zr = GZ(LG.j0 - 1) - 0.05, zb = GZ(LG.j0) + 0.08,
    zs = GZ(LG.j1) - 0.08, zS = GZ(LG.j1 + 1) + 0.05;
  // (out: the sides whose coping overhangs 3 cm: the faces toward lower ground and the free ends)
  L.walls = [
    { id: 'kerbN', x0: xw, x1: xE, z0: zn, z1: zr, top: r, out: 'nwe' },
    { id: 'kerbW', x0: xw, x1: xr, z0: zr, z1: zs, top: r, out: 'w' },
    { id: 'bedNW', x0: xr, x1: L.steps.x0, z0: zr, z1: zb, top: b, out: 'nw' },
    { id: 'bedNE', x0: L.steps.x1, x1: xE, z0: zr, z1: zb, top: b, out: 'ne' },
    { id: 'bedW', x0: xr, x1: xb, z0: zb, z1: zs, top: b, out: 'w' },
    { id: 'bedE', x0: xe, x1: xE, z0: zb, z1: zs, top: b, out: 'e' },
    { id: 'bedS', x0: xw, x1: xE, z0: zs, z1: zS, top: b, out: 'swe' },
  ];
  L.box = [xw, zn, xE, zS];
}
// the lawns' masonry and steps (a plant keeps out by its size; a placed prop keeps off)
export function lawnClear(x, z, pad = 0) {
  const [x0, z0, x1, z1] = LAWN.box;
  if (x < x0 - pad || x > x1 + pad || z < z0 - pad || z > z1 + pad) return false;
  if (x < x0 + 2 * GS + 0.13 + pad || x > x1 - GS - 0.13 - pad || z < z0 + 2 * GS + 0.13 + pad || z > z1 - GS - 0.13 - pad) return true;
  return false;
}
// (FLAT-TOWN-2's east shore wall, EAST_WALL, is reverted (the user, 22.11): the shore is its natural drop round its
//  three coves again. V143_EAST: the ground v143 had changed there (the wall's top, the filled coves, the sunk ledge),
//  for an older save's spot only: world.js shoreSpot)
export const V143_EAST = { x0: -29.0, x1: -18.75, z0: GZ(95) - 0.05, z1: GZ(203) + 0.05 };
const GS = 260 / 280;
