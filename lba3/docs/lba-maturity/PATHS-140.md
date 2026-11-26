# PATHS-140 (P140, the user, 26.11, on P136's own after picture: "עדיין לא שלם!!!", "still not complete!!!")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it; nothing was checked on a real GPU.

**Result: Citadel is clean (0 faults, from 17). The isles are not: 47 faults are left, all on Otringal, the Platform,
Under Celebration, Celebration, Knartas, plus one on the desert's shore (table below). `path-ends` still FAILs.**

## The user's spot (`captures/paths-140/user-report.jpg`)
- Bottom half of the crop: P136's `top-ne` after picture, Citadel north-east of the square's ring (camera over (−40, −12)).
  - **The ragged corner** at (−32, −16.5). The north street (`world.js` GRID_STREETS, z −15.8) and the block's east
    street (x −32.5) both ended at the same point. Each end was cut flush on the other's middle line, so the corner's
    outer 1.5 × 1.5 m quadrant was never paved, and the cut drew it as a notched diagonal. The same at (−52, −15.8).
  - **The open dirt lot** east of the east street's kerb (x −31…−24, z −19…−2): `townSoil`'s noise (bare soil with
    lawn blobs, within 36 m of the square) beyond the kerb's 2 m band of earth.
- Top half: P136's `top-sign` after picture, bottom right. **The kerbed bare rectangle** south of the cross street,
  between the street down the fields' path (x −45.6) and the link to the footbridge (x −32.5), z 32.8…40. It was WA-12's
  wild soil (`wildGround`, from 40 m off the square) inside the town grid.

## The rule (`tests/path-ends.mjs` + `tests/lib/pathedges.mjs`; P136's END and GAP kept as they were)
- **Read what the shader draws.**
  - Citadel's streets: LAWN-EDGES' edge distance.
  - Everywhere else: ROCK-EDGES' traced paving and rock lines. A point is paved where the rock's line leaves it and the
    paving's line takes it.
  - ROCK-EDGES is not the default yet. The user decided it on 26.11, and another worker flips it (with Knartas's earth
    patches). So the suite runs with `Q=rockedge=new`.
  - **Under today's default**, the isles', the desert's and the Hamalayi's paving edges still follow the terrain grid
    (the old per-vertex split) until that flip lands. Looked at from above with no query: the new patches' paving
    zig-zagged on the 1.7 m grid while their kerbs followed the smooth line, standing off it. So **the new patches and
    their kerbs are built only when ROCK-EDGES is on** (`zislands.js` `OLD_PATCHES = !ROCK_EDGE || …`). Until the flip,
    the default game shows the isles as before; `?rockedge=new` shows this work. Everything measured or pictured here
    for the isles is in that mode. Citadel's 0 is also measured in that mode only (its streets' line is the same in
    both: LAWN-EDGES).
  - A guard prints, per area, the paved m² as read and by the splat's own share. They agree within 10 %. A first version
    of the traced read lost the middle of every paving; the guard would have shown it.
- **The bare earth** (new in `pathends.js`): the lawn's traced soil side (LAWN-EDGES-2) and Citadel's 2 m band of earth
  along the kerb. Sand (the desert) and snow (the Hamalayi) are not earth.
- **EDGE.** Every paving edge is a clean line.
  - The outline is traced at 0.25 m and smoothed over ±0.5 m. Along every 3 m, the wiggle (Σ|turn| − |Σ turn|) must
    stay under 60°.
  - Calibration: a straight edge, a corner, an arc, a rounded cap and the Hamalayi's wavy square measure 0–32°. A notch
    measures 162°. Splat noise and a grid's saw-tooth measure more.
  - A wiggly stretch is clean if 70 % of it has a kerb stone on it, or meets a wall, a face (≥ 0.3 m), the sea or a floor
    within 0.8 m (a house standing on the paving's edge hides it).
  - Stretches under 1.5 m are listed, not counted: a convex corner's bevel on Citadel's 0.93 m grid measures 0.25–1.25 m.
    The user's notch measured 2.75–3 m.
  - Also faults:
    - **ISLAND**: a speck of terrain paving (< 3 m²) within 1.5 m of a paving.
    - **HOLE**: a bare speck (< 3 m²) inside a paving with nothing standing over it.
- **LOT.** Bare earth at least 3 m across that either:
  - touches paving on two sides or more (≥ 1.5 m each, ≥ 6 m²), or
  - is ≥ 12 m² and touches paving along ≥ 6 m.

  "3 m across" means its opening by a 1.5 m disc, so a trodden way, or the 2 m band with the lawn behind it, never
  counts. A plot so narrow that the band fills it does count.
- **PATCH** (the user's answer to P136). The isles' WA-11 paving patches are judged now (P136 left them out).
  - Their outline is sampled every 1 m. Each sample must have one of these beyond it: a kerb stone, a wall, a face, the
    sea, a floor, or a worn path.
  - 2 m or more in a row with none of these is a fault.
  - A kerb also closes a patch's END or GAP. It never closes a street's (P136).
- **Known list** `tests/fixtures/paths-140-known.json`: designed bare earth, each with its reason (below).
- **Pictures**: one play-camera and one top picture per place (faults within 12 m joined). `SPOTS=` pictures a before
  run's places again after.

## Counts (the same scan; before = the base build `ddb4f16b`, after = this branch)
| Run | END/GAP (P136) | EDGE | ISLAND | HOLE | PATCH | LOT | Verdict |
|---|---|---|---|---|---|---|---|
| before | 101 (80 ends, 21 gaps) | 67 | 11 | 4 | 232 | 15 | **FAIL**, 4 of 4 checks |
| after | 3 (3 ends) | 17 | 4 | 2 | 21 | 0 (5 known) | **FAIL**, 3 of 4 checks (LOT passes) |

By area, before → after (faults):

| Area | Before | After |
|---|---|---|
| Citadel | 17 (EDGE 1, HOLE 1, LOT 15; END/GAP 0) + 1 LOT known | **0** |
| Desert Island with Kesh | 1 EDGE (+ 2 LOTs known) | 1 EDGE (the same) |
| Zeelich, the Hamalayi, Ballastra | 0 (Zeelich's 3 mesh edges meet walls) | 0 |
| Otringal | 232 (END/GAP 50, EDGE 35, ISLAND 7, HOLE 2, PATCH 138) | 23 (EDGE 6, ISLAND 3, HOLE 1, PATCH 13) |
| The Platform | 114 (END/GAP 26, EDGE 22, ISLAND 3, PATCH 63) | 10 (END 1, EDGE 5, PATCH 4) |
| Under Celebration | 60 (END/GAP 25, EDGE 6, ISLAND 1, PATCH 28) | 11 (END 2, EDGE 4, ISLAND 1, PATCH 4) |
| Celebration | 5 (EDGE 1, HOLE 1, PATCH 3) | 1 (the same HOLE) |
| Knartas | 1 EDGE | 1 EDGE (the same) |
| Mosquibee, Orchard, Old Watch, Lift Dock | 0 (+ 1 LOT known on Old Watch) | 0 |

## Found and done
| # | Area, at | Kind | Before | Done (visible changes, for the user's pick) |
|---|---|---|---|---|
| 1 | Citadel (−32.5, −15.8) and (−52, −15.8) | EDGE | **the user's ragged corner**: two streets ending at one point left the corner's quadrant bare | **Rule** (`world.js` GRID_RECTS `corner()`): two grid streets that end at the same point both end square, so the corner is closed. The kerb now runs round it. |
| 2 | Citadel, every block between streets: (−27, −17), (−28, −5), (−28, 7), (−29, 21), (−28, 42), (−50, 12), (−55, 36), (−55, 49), (−63, −8), (−68, 3), (−74, 26), (−72, 44), (−38, 28), (−41, 60) | LOT ×14 | **the user's open lot**: bare soil with lawn blobs boxed in by the streets | **Rule** (`world.js` `townLawn`, `islandSplat`): the town's plots at the street's level, and the ground within 4 m of any town paving (easing out by 7 m), are lawn behind the kerb's 2 m band of earth (LBA2's blocks, the user's pick b in P112). The splat only: the scatter reads `townSoil`/`wildGround` as before. |
| 3 | Citadel (−37.2, 38.6) | LOT | **the user's kerbed bare rectangle** (WA-12 wild soil inside the town grid) | Lawn behind its band, by #2. |
| 4 | Citadel, the north street's north side | (band) | no band and no kerb north of z −17; the east side's band ended in a diagonal at z −17 | `PLOT_ZONE.z0` −17 → −20: the band and kerb run on round the corner where the ground is level. |
| 5 | Citadel (−55.8, −16) | (bay) | the north street ended at the block's west street; a 4.7 × 2.8 m bay of dirt was left against the house's east wall | The north street runs on to that wall (x −58.2). |
| 6 | Citadel (−34.5, 3.7) | EDGE | the east street's rounded head stopped short of the ring's curve: a bite of dirt by the corner house | The street starts inside the ring (z 0), square, its corners under the ring's paving. |
| 7 | Citadel (−40.7, −13.8) | HOLE | a bare fleck between the two north pockets, 2 m apart under the climb's paving | Both pockets run to x −40. |
| 8 | Citadel (−44, 13), (−74, 35) | LOT | trodden ways (`world.js` PATHS[7], PATHS[6]: NPC routes) left the streets as 4 m of earth, reading as lots | Through the town's lawns a trodden way is drawn 2.4 m wide (splat only; the routes are untouched). (−44, 13) is gone. 13 m² remain at (−74, 35), on the known list. |
| 9 | Otringal, the Platform, Under Celebration, Celebration | PATCH, EDGE, END, GAP | **the user's WA-11 answer**: the paving patches were patch noise faded again by each point's own slope, so the edges were ragged along every bump and stopped in the rock or turf with nothing | **`zislands.js` `patchGrid`, kerbs after the pad.** A patch is the patch noise's smooth line, the bare rock's, and a smooth level line (the slope averaged over 1.5 m on the data grid's heights, bilinear, land only; `PATCH_LEVEL` 0.35, the old fade's middle). Pieces under 6 m² go. **Kerb stones** (the island's stone colour, 18 % lighter; no collider, as Citadel's) run round each piece, except where a worn path joins, the square's or the pad's paving goes on, a wall or a house stands (≥ 1.5 m, not a lamp or a bush), or the ground drops 0.3 m. Kept pieces run on to the pad's paving (they join it). Stones: Otringal 2656, the Platform 937, Under Celebration 389, Celebration 35 (4017 in all). **Paving as drawn, m²: Otringal 4705 → 4134 (−12 %), the Platform 1282 → 1011 (−21 %), Under Celebration 896 → 838, Celebration 337 → 331**: the pieces on slopes by the cliffs and those under 6 m² are gone (the sheet's Otringal rows show it). On the Platform's dark ground the kerbs read as pale lines. |

## The known list: five questions for you (LOT passes only because of these)
Each is bare earth the scan joined to paving. The point is the earth's deepest spot; the nearest paving to it is given.
1. **Citadel (−81, −73)**, nearest paving 36 m away: the camp's fenced work yard on the northern plateau (`POI.camp`, a
   designed box of earth with the depot's crates and fences). The scan reached paving through the trodden ways from it.
   Keep it bare?
2. **Citadel (−74, 35)**, paving 2 m away: the trodden way to the harbour (an NPC route) where it leaves the cross
   street. 13 m² of earth at the junction, after the narrowing (#8). Keep it?
3. **Desert (3353, −18)**, paving 7 m away: the oasis's damp ring round the pond and the track beside it. P136 #7 keeps
   both off Kesh's paving. Keep it?
4. **Desert (3402, 10)**, paving 31 m away: the sand tracks where they cross in the dunes. The scan joined them to paving
   through the tracks. Keep it?
5. **Old Watch (5188, 1801)**, paving 2 m away: the island's worn paths where they reach the pad's paving from three
   sides. The top picture of that place shows the tower, not this ground; it was judged from the scan's plan only.
   Keep it?

## Not fixed (open; pictures on the sheet and in the session's scratchpad)
- **Otringal 23, the Platform 10, Under Celebration 11, Celebration 1:**
  - **EDGE 15**: stretches of a patch's outline where the kerb is interrupted (a wall, a path, a drop) and the line
    itself wiggles.
  - **PATCH 21**: stretches of 2–4 m with no kerb (Otringal (1871, 1790) is 10 m). Why the builder left them out
    (a path, a drop, a wall the scan does not count) was not counted.
  - **ISLAND 4, HOLE 2**: specks under 2.2 m².
  - **END 3**: narrow patch tips that end in turf.
- **Desert (3309, 1.6)**: 2.75 m of the pier's shore paving, half against the shore's face. Not looked at closer.
- **Knartas (2207, 1780)**: 3 m by the quay, half against a wall or deck. Left for the worker on Knartas's ground.
- **Celebration's plaza edge**: the slope test (`paveSlope` 0.3) still cuts the plaza point by point. A smoothed test was
  tried and taken back, because it was made while the scan misread the isles.
- These are why `path-ends` still FAILs.

## Build time (single runs, SwiftShader, machine load 10–13; not a frame-rate measure)
| Isle | `?rockedge=new&isles140=old` | `?rockedge=new` (this work) |
|---|---|---|
| Otringal | 1563 ms | 1929 ms |
| The Platform | 26312 ms | 29464 ms |
| Under Celebration | 891 ms | 1170 ms |

The Platform's build is slow with or without this work (it was 22.7 s with no query too). The kerb tracing reads the
level line only inside the patch noise.

## Not covered
- **Interiors**: not checked (not outdoor paving).
- **Zeelich and Ballastra**: built from meshes, no terrain splat. LOT cannot be read there (no earth channel). Their
  mesh paving edges were scanned: Zeelich's three meet walls. Ballastra's speck is a mesh piece of the paving's texture
  (not splat noise; what it is was not looked at).
- **The expansion's other districts**: not built by this scan.
- **Today's default shader** (ROCK-EDGES off): not judged. See the rule.

## Revert handles
| Change | Where | To revert |
|---|---|---|
| #1 corners | `world.js` GRID_RECTS: `corner()` and its use in `end()` | delete `corner()`, `end()` as before |
| #2–#3 lawns | `world.js` `townLawn()`, and its two uses in `islandSplat` (`* (1 - lawn)`) | delete both factors |
| #4 band north | `world.js` `PLOT_ZONE.z0` | −20 → −17 |
| #5 north street | `world.js` GRID_STREETS `[-58.2, -15.8, …, { ea: 'flush' }]` | back to `[-52.0, -15.8, -32.5, -15.8, 3.0]` |
| #6 east street | `world.js` GRID_STREETS `[-35.0, 0.0, …, { ea: 'flush' }]` | back to `[-35.0, 3.6, -35.0, 31.3, 3.0]` |
| #7 pockets | `world.js` the two pockets' x −40 | back to −41 and −39 |
| #8 narrow ways | `world.js` `islandSplat`: `pw` | `pw = 0` |
| #9 isle patches and kerbs | `zislands.js`: built only with ROCK-EDGES on; `?isles140=old` shows the old patches with no kerbs | `OLD_PATCHES` true, or delete `patchGrid` and the kerb block |

Commits (this worktree): `5caa4a30` (the rule), `5ef38879` (Citadel), `07a8e154` (isles, the scan's traced read),
`a0864eed` (the scan's sign fix, kerbs count as clean, the kerb builder aligned, narrow ways), and the last commit with
this file and the sheet.

## Tests (automated runtime only, SwiftShader, `SERVE=1`)
- `tests/path-ends.mjs` with `Q=rockedge=new SHOTS136=0`:
  - before (base src): **FAIL** 4/4. Counts as above.
  - after (all areas, with pictures): **FAIL** 3/4, LOT passes.
  - The kerb tracing was then made cheaper (the level line read only inside the patch noise), and the four patch isles
    were scanned again (`ONLY=…`, no pictures): **FAIL** 3/4, the isle counts above (Otringal one PATCH more, Under
    Celebration one EDGE more, the rest the same as the full run). The other areas do not use that code.
  - Tuning runs of the same suite (isles only, no pictures) were made in between; the first four of them read the isles
    wrongly (see the guard).
- `tests/walkers.mjs`: **PASS 37/37**.
- `tests/worldfit.mjs`: **PASS**, functional 1/1, visual 8/8.
  - (3) z-fighting: 0 visible; 112 small ones are listed, unjudged (the same count as P136's run).

## What else changed (dumps of every collider and instanced placement, base vs this branch, all areas built)
- Colliders 7113 → 7111. Two bushes north of the north street, at (−41.8, −19.2) and (−47, −18.9), now stand on the
  plots' earth band (#4). The existing "no bush on the band" filter takes them off.
- Citadel's kerb stones 616 → 647 (31 moved, 62 new: round the closed corners, the north side, the new street ends).
- New: the isles' kerb stones (4017, one instanced mesh per isle, no collider).
- Nothing else moved: the scatter reads `townSoil`, `wildGround` and `pathDist` as before.
- Not touched: the harbour, Twinsen's hair, NPC routes (`town.js` STREETS, `world.js` PATHS), terrain heights. Old
  saves are unaffected: nothing saved refers to the ground's texture or to the kerbs.

## Pictures
- `captures/paths-140/sheet.png` (1286 px wide): before / after. Your spot first (from above, from the play camera, in
  P136's own frames), then Citadel, then the isles' patches from above. Isle befores from above are the same build with
  `?isles140=old` (the old patches, no kerbs); every other before is the base build. The isle rows are `?rockedge=new`.
- Every place's play-camera and top picture, before and after, is in the session's scratchpad (`paths140/before`,
  `paths140/final`). They are not committed.
