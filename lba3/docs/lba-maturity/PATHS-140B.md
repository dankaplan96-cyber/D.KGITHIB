# PATHS-140B (P140 on the isles, "keep it and continue fixing"; P141; the known list's five questions)

Branch `ccr-c1c2c4b9-dep6ed` (base `3d260be0`) + this worktree's commits. Evidence: **automated runtime only
(SwiftShader, headless Chromium)**. Nobody played it; nothing was checked on a real GPU. The rock edge is the default
(no `?rockedge=new` anywhere below).

**Result: `tests/path-ends.mjs` PASSES over every area (0 faults; it failed with 47). No known-list entry was added.
P141: the rock's cross-edge tint is down 60–95 % on every splat terrain.**

**The cost, first: the user approved P140's patches, and they changed.**
- The Platform's patch paving is about halved (561 → 295 m²).
- Patch pieces kept: 71 → 39; kerb stones 4019 → 2318.
- Otringal keeps 96 % of its patch area.
- Details under "Visible changes".

**Was it the scan or the game?** The scan's read changed too (item 7 below). With the new read, the base build has
**60** faults on the same six areas (END 7, EDGE 16, ISLAND 7, HOLE 3, PATCH 27): the new read is stricter, not looser.
The only fault the read alone cleared is Knartas's quay (2207, 1780). Every other fix is in the game's source.

## Pictures
`captures/paths-140b/sheet-1.png` and `sheet-2.png` (1290 × 3604 each): before | after, most visible first.
- Sheet 1: the isles' patches (Otringal ×2, Under Celebration, the Platform), P141 (Under Celebration, Mosquibee,
  the Platform), the desert's pier road, Celebration's plaza.
- Sheet 2: Under Celebration's yard, an Otringal hole, P141 on Citadel's wild ground, Knartas, then the five known-list
  places (after only: play camera | from above).
- Befores: the base build `3d260be0`. Fault rows: `path-ends`' own P140 pictures (before run and final run, the same
  places). P141 and known-list rows: one script, the same frames, HUD hidden. All 39 places' pictures, both runs, are in
  the session's scratchpad (`p140b/before`, `p140b/final3`, `p140b/ba-*`), not committed.

## Counts (`path-ends`, the default build)
| Area | Before (base) | After |
|---|---|---|
| Otringal | 23 (EDGE 6, ISLAND 3, HOLE 1, PATCH 13) | 0 |
| The Platform | 10 (END 1, EDGE 5, PATCH 4) | 0 |
| Under Celebration | 11 (END 2, EDGE 4, ISLAND 1, PATCH 4) | 0 |
| Celebration | 1 (HOLE) | 0 |
| Desert (3309, 1.6) | 1 EDGE | 0 |
| Knartas (2207, 1780) | 1 EDGE | 0 |
| Every other area | 0 | 0 |

- WA-11 patch outline samples (every 1 m): before kerb 1365, wall 314, face 97, **none 174**; after kerb 1015, wall 227,
  face 1, none 2 (runs of 2 m with none are faults; there are none).
- Paving as drawn, m²: Otringal 4134 → 4115, the Platform 1011 → 823, Under Celebration 838 → 790, Celebration 331 → 327,
  Knartas 621 → 634, desert 2011 → 2014. Citadel and the rest unchanged.

## What was wrong, and the fixes (each for every case of its kind)
Found with a probe that draws, per 0.25 m, the paving as the shader cuts it (its formula), the scan's read and the kerbs.

1. **Patch shapes finer than the terrain's grid** (most EDGE, ISLAND, HOLE, END faults). The shader draws a paving edge
   from one distance per terrain point (1.7 m apart). A neck, notch, tip, speck or hole smaller than that cannot be
   drawn as it is: it came out jagged, cut off, or bridged.
   - Fix, `zislands.js` `patchGrid` (every patch isle: Otringal, the Platform, Under Celebration, Celebration):
     - the pieces' inside (the three fields' signed distance) is blurred on a 0.5 m lattice (`PATCH_BLUR` 0.9 m) and
       opened (necks, strips and tips under ~1.8 m go);
     - pieces keep 1 m off steep creases (where the splat's own slope rock would cut them in two);
     - the bare rock gives way inside a piece (a rock speck was a hole);
     - a piece under 25 m² within 2.5 m of a bigger one goes (the grid drew a thin link between them);
     - the noise level is lowered by `PATCH_GROW` 0.1 so the pieces keep most of their share.
2. **Kerbs off the drawn edge** (most PATCH faults). The kerbs followed the source fields; the shader draws the traced
   line. Fix: `Terrain.drawn(x, z)` (`terrain.js`, new) gives the ground as the shader cuts it. The kerbs are traced on
   it. They are left out only as the scan reads an edge: a path's earth 0.5 m out, a step (a wall's foot, a quay, a
   cliff), paving going on, or a wall on the line. On a bank's top the kerb now runs on.
3. **All-rock triangles** (Otringal's granite turf, rock patches against grass). The shader keeps a triangle whole rock
   when its three points are all rock (`1 − rest × 50`), so a paving tip that ran into one was cut on the grid. Fix
   (`terrain.js` `_restFloor`, every splat terrain): an all-rock point next to other ground takes a 3 % trace of that
   ground (not paving, where there is other ground). The traced rock line then decides. Nothing shows inside the rock.
4. **The paving's line on a rock strip** (the desert's School rim). A rock point between paving and sand took the
   paving's side whole, so a sliver of paving was drawn past the rock. Fix (`terrain.js` tracer, every terrain): the
   paving's distance is 0 at such a point.
5. **Squares** (Celebration's plaza hole, Under Celebration's yard tongue). A single bump cut a hole; the yard ran down
   its bank in a tongue.
   - Fix: a square's paving lies where the lower of the point's slope and the 1.5 m averaged slope is under
     `SQUARE_LEVEL` 0.6 (Celebration: its own `paveSlope` 0.3).
   - A fragment left apart by a bank, under 30 m², goes.
   - The bare rock keeps 1–2 m off a square or the pad.
   - Not Otringal's terraced square (`paveFlat`).
6. **The desert's pier road** (3309, 1.6). The shore's rock cut a notch into the corner. Fix (`desert.js`, traced edge
   only): no slope rock on the paving by the water, nor within 1 m of Kesh's street there.
7. **The scan's read** (`tests/lib/pathends.js`, `tests/path-ends.mjs`).
   - The rock's and the paving's lines and strengths are now interpolated apart, then combined, as the shader cuts them.
     Taking the larger per point first read the paving up to ~0.7 m short of the drawn edge where the two lines run close
     (kerbs on the drawn edge read as missing). This alone cleared Knartas's quay fault: no change there in the game.
   - A wall standing on the edge itself now meets it (Otringal: a piece runs on under a house; the wall is the edge).
   - `paveKind` says 'patch' only on and within 1.5 m of a piece. Before, every unpaved point was 'patch', so Otringal's
     square's west edge (x 1871.25, 11 m) was judged as a patch's. Pictured from above (scratchpad
     `p140b/p141-after/p141-otringal-square-top.png`): a straight edge where the raised square steps down to the
     granite. The tally above shows the samples left.

## P141: the tint follows the traced rock edge (`terrain.js` `_rockTint`, every splat terrain, traced edge only)
- **The cause.** The vertex colour was interpolated across each triangle the rock line crosses, so the rock beside the
  line took the colour of the point on the other side: the isles' sand-coloured shore tint and turf, the desert's sand,
  Citadel's grass.
- **The fix.** As Knartas's patches do, the tint fades to 0 at the line: a point on the open side within one cell of a
  strong rock line takes its rock neighbours' colour there, its own colour whole one cell out.
- **Knartas.** Its approved earth patches are left out (`tintKeep`). Their 200 points' colours are identical (checked).
  The earth as drawn (the shader's formula, every 0.25 m) is 500 m² and the rock 2012 m² on both the base and the
  branch, the earth's sample digest identical: `_restFloor` did not move the patches.
- **Second part, the rock's own colour** (`zislands.js` colorFn, commit `cb7cb15c`; every isle but Knartas and
  Otringal's granite turf; traced edge only):
  - the colour's rock ramp (slope 0.7–1.4) was far softer than the rock's cut (~0.92), so rock at the rims and on banks
    kept the turf's or the shore's sand tint;
  - a point drawn as rock (its slope's rock share over a half) now takes the rock's colour.
  - Not measured apart. ROCK-EDGES' "R − G over the deep rock" cannot show it on the pink-rock isles: their rock is itself
    redder than the turf or the sand.
  - Pictured at the two named P141 spots (from above, base | after: scratchpad `p140b/cmp-p141-pl.png`,
    `cmp-p141-mo.png`). The change there is slight: an olive cast round Mosquibee's grass ridge is gone. The Platform
    spot shows almost none.
  - The Hamalayi's colour has the same soft rock ramp (snow on rock). Not changed: listed under Open.
- **Cost.** No shader change, no draw, no memory.
- **Switch.** `?tintramp=0` turns it off (that is the "off" column below).

Rock pixels coloured by a point across the line (> 0.06 in a channel), m², 4 × 4 samples a cell, off → on:

| Citadel | Desert | Hamalayi | Otringal | Knartas | Mosquibee | Celebration | Under Cel. | Platform | Old Watch | Orchard | Lift Dock |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 203 → 54 | 1093 → 183 | 592 → 37 | 468 → 108 | 801 → 161 | 628 → 119 | 267 → 92 | 765 → 291 | 378 → 89 | 145 → 10 | 154 → 14 | 0 → 0 |

- **What remains.** A point further than a cell from the line can still sit in a crossed triangle.
- **The open side.** It takes the rock's colour over one cell. Mean colour of that band, off → on:
  - Mosquibee (0.83, 0.75, 0.40) → (0.72, 0.62, 0.42);
  - Under Celebration (0.52, 0.50, 0.39) → (0.43, 0.39, 0.35);
  - Citadel (0.80, 0.80, 0.78) → (0.79, 0.79, 0.77).
- **Seen.** In the pictures it shows as a slightly darker or pinker rim on the turf, sand or paving next to the rock (sheet
  1 rows 5–7). The two-colour alternative (a second vertex colour for the rock, chosen per pixel) would avoid it. It was
  not done: it is a shader change.
- **ROCK-EDGES' own P141 numbers** (141 / 96 / 57 / 12 m²) could not be reproduced: its script is not in the repository.
  The table above is this worker's measure.

## Visible changes (for the user's pick)
- **Isle patches: fewer and rounder, kerbed on the drawn edge.**
  - Pieces kept: Otringal 39 → 24, the Platform 20 → 9, Under Celebration 10 → 5, Celebration 2 → 1.
  - Pieces' area (m²): Otringal 2313 → 2226, the Platform 561 → 295, Under Celebration 132 → 89, Celebration 16 → 9.
  - Kerb stones: 4019 → 2318.
  - The Platform loses about half its patch paving: its pieces lay in the narrow gaps between its rock patches.
- **Squares.**
  - Under Celebration's yard ends on the level with a turf band round it (it ran down its bank).
  - The bare rock keeps 1–2 m off every isle square and pad (turf there now; sheet 1 row 5, sheet 2 row 11).
  - Celebration's plaza: the hole is paved.
- **P141.** The rock reads in its own colour up to its edge on every terrain, Citadel's wild ground and cliff rims included
  (Citadel was approved as it was: sheet 2 row 13). The open side darkens slightly within a cell.
- **Desert.** The pier road's corners are clean. A small rock fragment remains on the sand by its north-west corner (sheet 1
  row 8).
- **Scatter.** It reads the splat functions, so it follows the new pieces a little. One more small prop (643 → 644
  instances), and the shadow blobs' placements differ. Where exactly was not traced.
- **Unchanged:**
  - colliders (7111 both). One box at Citadel (−43.2, −10.4) read 1 cm lower in one run; an earlier branch run matched
    base exactly, so it is run noise;
  - heights, buildings, NPC routes, the harbour, saves;
  - `?rockedge=old`: every change here is gated on the traced edge. This is from the source only; no run was made with
    the switch.
- `?isles140=old` shows the patches as they were before P140, not P140's approved ones. No switch brings those back; only
  reverting this branch's `zislands.js` changes does.

## The known list: five answers (pictures: sheet 2, Q1–Q5)
1. **Citadel camp yard (−81, −73): keep.** A fenced project yard of beaten earth with crates, pipes and a guard ("staff
   only"); a designed work yard, not a lot.
2. **Citadel harbour way (−74, 35): keep.** It is the street's 2 m earth band (P112) widening where the trodden way to
   the harbour leaves it, lawn beyond. From above it reads close to a small plot (13 m²). Narrowing it further would
   change Citadel, which the user approved; left for the user.
3. **Desert oasis (3353, −18): keep.** The pond's damp ring and its track: natural wet ground by the water, kept off Kesh's
   paving by P136 #7.
4. **Desert tracks (3402, 10): keep.** Trodden sand tracks crossing in the open dunes, 31 m from any paving.
5. **Old Watch pad (5188, 1801): keep.** Turf with two worn paths, each about 1 m wide, reaching the pad's paving.
   - Drawn earth within 7 m of the spot, by the shader's formula: 16 m², the two paths only, one from the north and one
     from the east, meeting at the pad's edge.
   - The scan reports 38 m² there. What else it counts was not traced: it reads the lawn's earth side, not the drawn
     result.
   - From both cameras no bare plot shows.
   - So the entry is a true designed junction, with the scan over-reading it.

## Tests (automated runtime only, SwiftShader, `SERVE=1`, once each unless said)
- `tests/path-ends.mjs` (all areas, default build):
  - before, on `3d260be0` (six areas): FAIL, 47 faults;
  - the base again with the new read (six areas, no pictures): FAIL, 60 (see the top);
  - final, on `75f3d579`: **PASS** (4 of 4 checks; 0 faults; 5 known, the same five). The last commit, `cb7cb15c`, changes
    vertex colours only, which the scan does not read.
  - Tuning runs of the same suite on the patch isles (`ONLY=…`, `SHOTS=0`) were made in between. Two full runs before the
    last square commits also PASSED.
- On the final HEAD `cb7cb15c` (the kerbs moved with the square commits, so these were run again):
  - `tests/walkers.mjs`: **PASS 37/37**;
  - `tests/worldfit.mjs`: **PASS** (functional 1/1, visual 8/8; z-fighting 0 visible, 112 small listed, as before).
  - Both also passed once on `7b9e24c9`.
- No test picture was overwritten.

## Build time (single runs, SwiftShader, machine load 7–10; not a frame-rate measure)
| | base | after |
|---|---|---|
| Otringal | 1305 ms | 1144 ms |
| The Platform | 896 ms | 564 ms |
| Under Celebration | 1455 ms | 1154 ms |
| Celebration | 199 ms | 306 ms |
| Knartas | 557 ms | 611 ms |
| Desert | 1522 ms | 1770 ms |
| Citadel's edge tracer | 396 ms | 424 ms |

Run to run these vary by more than the differences. The new work is a 0.5 m lattice per patch isle (two blurs and
the level line in a band), `Terrain.drawn` along the kerbs, and two passes over each terrain's points.

## Revert handles
| Change | Where | To revert |
|---|---|---|
| P141 tint | `terrain.js` `_rockTint` | `?tintramp=0`, or remove its call |
| All-rock points | `terrain.js` `_restFloor` | remove its call |
| Paving line on a rock strip | `terrain.js` `_edgeChannels`, `name === 'pave' … cls = 0` | delete that line |
| Patch smoothing, kerbs | `zislands.js` `patchGrid`, the kerb block | revert this branch's `zislands.js` (`?isles140=old` shows the pre-P140 patches) |
| The rock's own colour (P141) | `zislands.js` colorFn, the `rkS` line | delete that line |
| Squares | `zislands.js` splatFn `SQUARE_LEVEL`, `sqKeepAt`, `sqNear` in `bare()` | the old `slope < (S.paveSlope ?? 9)` |
| Desert shore | `desert.js` `rockAt`, `keshPave(…, 1)` | `return old` |
| Scan read | `tests/lib/pathends.js` `fr/fp/rs/ps`; `path-ends.mjs` `fs_` | `fAtOf(G)` |

Probe hooks left in: `terrain.probe140(x, z)` (island-local; the probes only), `globalThis.__kerb140` (records why a kerb was left out).

## Commits
`815d0293` (the fixes, P141, the scan), `fc64cde9` (patch tuning), `7b9e24c9` (desert gate), `5ac222e0`, `75f3d579`
(squares), `cb7cb15c` (P141: the rock's own colour), and this file with the sheets.

## Open
- The small rock fragment by the desert pier road's north-west corner (not a paving fault; keeping the land rock 1 m off
  Kesh's paving there made a new EDGE on the road's south side, so it was taken back).
- Short kerb runs where a patch piece touches a square's rim (Under Celebration's yard).
- The open side's darker rim (P141), if the user wants the rock and the turf apart per pixel: a shader change.
- The Platform's patch paving is about half what it was.
- The Hamalayi's vertex colour ramps to rock (slope 0.75–1.4) more softly than its rock is cut (0.7–1.25), so its rock
  edges carry some snow tint. Not changed (the same fix as the isles' colorFn would apply); not measured.
- One more small prop and moved shadow blobs (the scatter): where, not traced.
