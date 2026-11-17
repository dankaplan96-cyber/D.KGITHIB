# HOSTEL-CUT-2 · the hostel cuts only what hides Twinsen

Status: **Automated runtime only** (SwiftShader, headless Chromium, 960 × 540; base dee0dcab; no play on the user's machine).

The user, 17.11 (P50), with a picture of the Workers' Hostel from the LBA camera: "It still disappears, and that's not good."
History: HOSTEL-CUT (14.11, `tools/testlab/WORLD_ART_REQUESTS.md`) fixed cleared beams cutting cell A and left open the
large zone that cut every camera-side wall along its whole length.

## Cause (measured)

Only the asylum uses lids (`lba1places.js` is the one caller of `buildLba1Room` with `gridZones`/`lids`/`overhead`; the
Bu maze has `noCut`). Two parts of `lba1room.js` cut far from him:

1. **LBA1's type-3 zone 1** (`[8.5, 5, 2.5, 36.5, 12, 18.5]`, 28 × 16 cells) holds two separate halls under the upper
   floor: the dormitory (x 9–21) and the east hall (x 23–35), with a full wall at x 22 and no door between them. Stepping
   into either cut the whole zone: both halls' ceilings, the upper floor over both (the loft's edge, the windowed wall
   at x 13, the upper walk and its things) and every camera-side wall, up to 18 m from him.
2. **The leftover ceilings and beams** ("overhead") were grouped in 16 × 16-cell squares and a square was cut whole when
   any of its cells stood on his sight line. At the user's picture spot (the upper walk by the laundry line, cell 4, 15,
   18) square 8 went: the walk's steps, railings and blocks over the store, 9.8 % of the screen, 8.6 % farther than
   0.3 of the screen height from him.
3. The cells and Vesk's office (`sight` lids) were also cut whole when their beams crossed his sight line (stop 07: Vesk's
   office opened while he stood in the room beside it).

Also measured: where a lid that is not his room stood between him and the camera, nothing was cut and he was drawn as a
silhouette — behind the loft's windowed wall (silhouette 1.0 and 0.58 of his body), in the kitchen under the next room's
grate roof (0.46).

## Fix

`src/game/lba1room.js`, `src/game/asylumhostel.js`, `src/game/lba1places.js` (one option).

- **Rooms of a zone** (room membership): a lid's floor is split into rooms — floor columns with 4 cells of headroom,
  joined side by side, apart where a wall stands; pieces under 12 columns join the nearest room. Each room gets its own
  camera-side walls (reached from its floor toward +x/+z, up to `near` beyond it, or beyond the zone's box where no other
  room of the zone lies further on). Zone 1 → dorm (178 columns) and hall (152); the other lids stay one room each.
  Stepping in cuts the room he stands in (picked from his column, hysteresis on borders, 0.3-cell slack to leave), with
  the 0.25 s fade as before.
- **No draw call more**: the meshes stay merged by lid signature. Each vertex carries its rooms as bits (`aCutRoom`);
  `cutPatch` adds to the lid materials a shader cut: a cell goes when any of its rooms is cut (`uCutRooms[24]`).
- **The sight hole**: every drawn lid cell is registered on the sight lines (the 9 rays from his body, as before). A lid
  on a ray is cut only round the line from his chest to the camera, by cell (bricks, as LBA1): cells within 2.0 m of the
  line (fading out by 3.0 m), on the camera's side of him, above his feet. The floor he stands on never goes; the walk
  square under him is never cut (as before).
- The overhead beams and slabs are one piece now (`overChunk: 64`; walk floors stay in 16-cell squares): the hole keeps
  the cut local, and fewer pieces mean fewer draw calls.
- The upper walk's things (`asylum:upper`) are cut as the slab under them: with the hall's room, and in the hole (their
  own materials, cloned and patched, cut by a screen-door dither, never transparent). Before they vanished with the whole
  zone, also while he was in the dorm.
- **Collisions unchanged**: the cut is render-only (colliders built from the layout as before; `room-cutaway` checks the
  same colliders while cut).
- **State restore**: `R.resetCut()` also clears the holes and the rooms; a new visit starts from the room's own state.
  Materials are clones per lid signature (no material shared with other buildings is touched; the room's own and the
  hostel's shared materials are unchanged).

Other interiors (`interiors.js`, `roomlife`): built cut away, with no runtime lid; not changed (the same fault does not
exist there).

## Draw calls (main + shadow pass, one frame per stop, LBA camera, Medium)

| stop (cell x, y, z) | before | after |
|---|---|---|
| 01 side way in (10.5, 5, 39.8) | 80 + 42 | 81 + 41 |
| 02 long hall (20, 5, 35) | 108 + 57 | 101 + 49 |
| 03 east corridor (56.5, 5, 47.5) | 89 + 42 | 86 + 35 |
| 04 cell A (55, 3, 41) | 87 + 41 | 84 + 34 |
| 05 cell B (55, 3, 54) | 70 + 30 | 71 + 26 |
| 06 kitchen (24, 5, 24) | 119 + 60 | 120 + 55 |
| 07 room 3 (32, 5, 24) | 103 + 54 | 115 + 49 |
| 08 Vesk's office (40, 5, 25) | 121 + 57 | 120 + 51 |
| 09 dorm (14, 5, 10) | 79 + 42 | 101 + 44 |
| 10 hall (30, 5, 10) | 90 + 46 | 109 + 43 |
| 11 hall's corner (34, 5, 16) | 106 + 44 | 129 + 49 |
| 12 dorm's corner (11, 5, 5) | 62 + 32 | 85 + 37 |
| 13 foreman's office (55, 10, 24) | 118 + 57 | 117 + 53 |
| 14 loft (5, 15, 10) | 80 + 41 | 76 + 37 |
| 15 upper corridor (18, 14, 3) | 82 + 38 | 86 + 33 |
| 16 upper walk (28, 14, 11) | 115 + 56 | 119 + 45 |
| 17 the front (35.5, 14, 11.5) | 113 + 58 | 111 + 48 |
| **peak / sum** | **179 (Follow setting: 186) / 2419** | **178 / 2440** |

In the zone the count rises (the other hall now stays drawn, as it should), and stays under the walk's old peak.
Options measured: shader cut with the old 16-cell overhead squares: peak 191 (135 + 56 at stop 11) — dropped; shader cut
with one overhead piece: 178 (kept). HOSTEL-CUT's 8-cell split of the zone: +38 to +154 (its note). A mesh per room: not
measured (it adds meshes everywhere to save some inside the zone).

## Pictures

`captures/hostel-cut-2/` (chapter 1–2 place), before | after per stop, 960 × 288 jpg:
`00-users-view-laundry.jpg` (the user's picture spot, Near distance), `00-behind-loft-wall.jpg`, and `NN-<stop>-lba.jpg`
/ `NN-<stop>-follow.jpg` for the 17 stops. Inside the hostel the room's fixed camera is used whichever camera is set
(`camera.js`: `iso`), so the Follow pictures equal the LBA ones (measured: same numbers per stop).
Looked at: the user's view (the walk's steps and blocks stand again, he is shown), the dorm and the hall (each opens
alone, the other's ceiling and the upper walk's things stand), the hall's corner (Vesk's office no longer opens; a hole
in its roof shows him), behind the loft's wall (a hole round him in the windowed wall). The hole's edge is stepped by
cells and half-faded over 1 m; looking through a hole into a thick slab its inner faces are not drawn (a thin dark rim).

## Tests

- `tests/asylum.mjs` — updated: in the dorm, zone 1's dorm is cut and the hall beside it stands (ceiling and camera-side
  wall); new HOSTEL-CUT-2 checks: in the hall the dorm stands; at six stops where a lid hides him no cell is cut farther
  than 3.6 m from his sight line (counted from the CPU mirror `R.cutAt`); no silhouette behind the loft's wall, in the
  kitchen, at the hall's corner; quick crossings of the hall's doorway then the kitchen: the hall stands again; out and
  back in: no hole or room cut left. 18/18 PASS.
- Regression set: see the final report of the task (lba1rooms, room-cutaway, occluders, camera-doors, interior-life,
  chapter1, perfbudget).

Not covered: a play on the user's GPU (WebGL2 shader compiled on SwiftShader only); fast orbiting is not possible in the
hostel (fixed room camera); hidden enemies under the other hall's ceiling stay hidden (the LBA way: another room).

Probe scripts (not shipped): the walk probe and the pictures were made with a page-side probe (place, settle 2 s, count
draws by `renderBufferDirect`, diff against every lid shown, silhouette share).
