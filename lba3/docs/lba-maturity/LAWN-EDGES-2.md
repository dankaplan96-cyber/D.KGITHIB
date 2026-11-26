# LAWN-EDGES-2 (P135 follow-up, the user's pick 26.11: "yes, smooth lawn edges in the whole game")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it, and nothing here was checked on a real GPU. **Behind `?lawnedge=new`, off by default.**

## The fault
The grass/soil split on the terrain was a per-vertex share (splat `w[3]` soil against `w[0]` grass), re-split in the
shader at 0.5 on a short ramp. On Citadel the grid is 0.93 m, on the isles 1.71 m; the share's ramps are narrower than
a cell, so the 0.5 line followed the triangles: saw-tooth lawn edges (the user's photo, Citadel at about (−60, 2)).
PATHS-135 tried widening the ramp; it kept the teeth and moved the scatter. Dropped.

## The fix (engine only: `src/engine/terrain.js`)
LAWN-EDGES' method (a per-vertex signed distance, cut per pixel at 0) applied to the grass/soil edge:
- **`Terrain._lawnEdges`** (only with `?lawnedge=new`), once per terrain at build:
  1. Every cell whose corners lie on both sides of the soil share's 0.5 line is sampled on a 4 × 4 fine grid with the
     terrain's own `splatFn` (height from the same triangles, slope interpolated). The fine grid's corners are the
     grid points themselves, so both agree on the sides.
  2. The 0.5 line is traced in those cells (marching squares): straight pieces of ~0.23 m (Citadel), or ~0.43 m (isles).
  3. Every grid point within 2.6 m (at least 2 cells) takes its distance to the nearest piece, signed by its own side
     (+ grass, − soil), ±4 m beyond.
  4. The distances are smoothed once (1-2-1). A distance is linear across a straight edge, so the smoothing keeps
     straight edges where they are. It rounds the steps where the splat is itself stepped by the grid (the isles'
     routes are read at the nearest data point). It never moves a point to the other side, so a route one point wide
     stays.
  5. A point with no grass or soil (paving, sand, snow, rock: under 1 % of the two) takes the side of the nearest
     piece, or with none near, the side of its neighbours that have some. Without this, a green fringe would appear
     between a trodden way and the snow or sand beside it.
  6. The soil's **strength** per point: the strongest soil share (0.5 or more) among the point and its 8 neighbours,
     else its own share. It does not fall across the edge. A first version took the point's own share on the soil
     side; just past the line that share is ~0.5, and the camp's edges went soft again. Fixed and reshot.
- **The `lawn` attribute**: int16 × 2, normalized: [distance over ±4 m, strength 0..1]. Every splat terrain has it when
  the switch is on, so there is still one program.
- **The shader** (`LAWN_SPLIT`): `lk = (1 − smoothstep(−a, a, dist + wobble)) × smoothstep(0.42, 0.58, strength + wobble')`.
  - The first factor is the cut: `a` is about a pixel (`fwidth`); the wobble is a few cm from the grass tile's
    brightness, so the edge is painted, not ruled.
  - The second factor is the old split, applied to the strength instead of the share. Strong soil (Citadel's town
    soil, its paths, the wild patches, the Hamalayi's trails: share ~1) is full soil up to the cut. Weak soil keeps
    its old faint, mottled look inside the cut: the isles' trodden routes (share ~0.5–0.55).
  - Without the second factor (the first version), every route on the isles became a solid brown path: the Orchard
    and Mosquibee pictures changed 9 % and 2 % of their pixels. With it, 0.2 % and 0.1 %.
  - Beside a LAWN-EDGES paving line, a point painted paving now lends its share to grass or soil by `lk` (before:
    always to soil, one source of PATHS-135's extra teeth).
- **Switch off** (the default): no attribute, no CPU work, and the shader text is **identical** to before for all
  16 switch combinations (checked by generating the text from both versions). The program key gets `-le` only when on.

Unchanged, by construction and checked (below): the splat functions, the heights, the scatter (it reads the splat
functions on the CPU, not the shader), colliders. The holomap and `tests/lib/pathends.js` still read the old split.

## Per region
Edge cells = grid cells whose corners lie on both sides of the 0.5 line (where the old split could draw teeth).

| Area | Grid | Edge cells | What changes (`?lawnedge=new`) |
|---|---|---|---|
| Citadel (town soil, LAWN-EDGES plots, paths, WA-12 wild patches, the camp) | 0.93 m | 2482 | the grass/soil edges are smooth lines and curves; the mottled, notched fringes and a few one-cell grass specks are gone (row 5) |
| Zeelich isles: Knartas | 1.71 m | 263 | the bare-patch and route edges are smooth (row 7) |
| Mosquibee, Orchard | 1.71 m | 21, 49 | the routes keep their old faint look inside a smooth edge (rows 8, 9) |
| Old Watch, Platform, Celebration | 1.71 m | 71, 5, 4 | edge cells exist, but there was no visible grass/soil edge at the spots tried (my automatic edge search failed there, for a reason I did not find). Not pictured |
| Otringal, Undergas, Lift Dock | 1.71 m | 0 | none: no grass/soil edge (Otringal's turf is granite) |
| Desert Island | 1 m | 45 | where Kesh's earth meets the oasis grass: a small change (row 6). The rest is sand against earth or paving, a soft blend with no saw-tooth. Unchanged. |
| Hamalayi | 1 m | 0 | none: snow is the sand channel, the trails are earth; no grass. Row 10: the terrain's pixels are identical (only the idling hero differs) |
| Zeelich (main island), Ballastra | — | — | none: no splat terrain. The grass, gravel tracks and paving are separate polygon meshes (`zeelich.js buildPaths`, `ballastra/gardens.js`) whose outlines are already smooth |


## Cost
All automated runtime (SwiftShader, headless Chromium, on a shared, loaded machine). The times are JS timings, not a
player's PC. **No frame-time claim.**
- **Draw calls, triangles, programs, geometries and textures (`renderer.info`, one frame, play camera)**: identical
  before and after at all 10 spots (e.g. the user's spot 247 calls / 1,115,413 triangles / 92 programs both ways;
  Knartas 140 / 591,682 / 99; the Hamalayi 175 / 379,156 / 102). No new mesh, light, texture or pass.
- **Shader (switch on)**: one more varying `vec2`, and one `fwidth`. The split is two `smoothstep`s in place of one,
  with no branch, plus a few multiply-adds. No texture read; the grass tile is already read wherever the split matters.
  The fragment text grows from 5404 to 5655 characters.
- **Load (build time, once per terrain)**, measured with `performance.now()` in `_lawnEdges` on two runs:
  - Citadel: 148 and 206 ms, for 49,687 splat samples and 9,444 pieces (it is built at start-up).
  - Knartas: 37–46 ms.
  - The other isles: 1–31 ms.
  - Desert: 8.5–9 ms. Hamalayi: 2–4 ms.

  Citadel's time is almost all spent in the splat function at the fine samples. A 3 × 3 sample would cut it to ~5/9.
  Not done.
- **Memory**: 4 bytes a vertex.
  - Citadel: 316 KB (79k vertices; its tiles share one buffer).
  - Desert: 362 KB. Hamalayi: 213 KB. Each isle: 15–62 KB.
  - The terrains drawn in batched squares (desert, Hamalayi, isles) keep a second copy in the batch.
  - The fine samples are a temporary map during the build.
- **Switch off**: no attribute, no CPU work, the same shader text, so the cost is zero.

## Pictures
`captures/lawn-edges-2/sheet.png`: before (default) | after (`?lawnedge=new`), the play camera (Follow, Far),
1280 × 720 scaled to half. Same build, same spot, same frame; only the switch differs. Row 1 is the user's spot.
- The rows:
  1. The user's spot: Citadel (−60, 2), facing about west. The street's foot, the bed with the cypress, the bin at
     the flight, the sea wall.
  2. Its middle at full resolution.
  3. Citadel's town lawns, by the spaceport sign.
  4. Citadel's camp and wild patches.
  5. Its right half at full resolution.
  6. Desert Island: Kesh's edge by the oasis.
  7. Knartas.
  8. Mosquibee.
  9. Orchard.
  10. The Hamalayi (no change expected).
- Pixels changed (difference > 8 of 255), rows 1, 3, 4, 6, 7, 8, 9, 10: 3.1 %, 1.7 %, 3.7 %, 0.4 %, 0.6 %, 0.1 %, 0.2 %,
  0.1 %.
  - Row 1 includes a tutorial hint ("Take your magic ball…") that fades in at its own time in one frame only.
  - Row 10 is the hero's idle pose only; the terrain is identical.
- Spots 04 (the oasis from the south) and 05 (Knartas, the other way) were also shot. They show little, so they are
  not on the sheet.

## Checks
- **Scatter, heights, splat: unchanged.** Every area was built (Citadel, the nine isles, Desert Island and the
  Hamalayi), with the switch off and on. The results:
  - All 75 instanced meshes: same count, same placement and colour digests. This covers the tulip beds, the flowers,
    the small plants, the trees, the rocks and the kerbs.
  - All 12 terrains: same height and splat digests.
  - Colliders: 5812 both ways. One entry, the statue's box at (−43.2, −10.4), differs by 1 mm in its top. The collider
    digest also differs between two runs with the switch off, so this is run-to-run noise, not this change.
- **Shader text with the switch off**: identical to the previous build's for all 16 combinations of the SHADE-COST
  switches (both texts generated and compared).
- **Thin soil kept**: the smoothing is never allowed to flip a point's side. It held 549 points on Citadel and 84 on
  Knartas. In the first run, without that rule, Mosquibee's route by the arrival point (one grid point wide) was gone.
  With the rule it is back.
- **No fringe beside snow or sand**: in the Hamalayi picture the trail's edge is identical. A trail's or Kesh's earth
  with no grass beside it keeps its old blend.

## Tests (automated runtime only, SwiftShader, SERVE=1, once each)
Both suites ran **with the switch on** (`QUERY=lawnedge=new`, which `tests/lib/boot.mjs` adds to every page it opens):
- `tests/walkers.mjs`: **PASS**, 37/37.
- `tests/worldfit.mjs`: functional 1/1, visual 7/8.
  - The one FAIL is (3) z-fighting on **isle_knartas**: the huts' floors, stone against plaster at y 3.06, 12 judged
    clusters.
  - `PATHS-135.md` records the same failure on the base. I did not rerun it on the base here.
  - The scan reads geometry, which this change does not touch. Handed to the coordinator.
- Neither suite ran with the switch off. The default rests on these:
  - the shader text is identical with the switch off;
  - with the switch off there is no attribute and no work;
  - the switch-off pictures and digests above.
- Not run: `tests/path-ends.mjs`. It reads the paving, which is unchanged, and the old lawn split.
- No test pictures were overwritten (`git status` clean after both).

## Unresolved / for the user
Visible changes with the switch on, for the user's pick:
- Grass/soil edges are smooth lines and curves across Citadel, Knartas and the isles' routes, and at Kesh's edge.
- Grass specks one cell across, where the soil's share dipped under 0.5 at a single point, are gone (row 5, by the
  cairn).
- Ground whose soil share is just under 0.5 used to show a little mottled earth (the old split's wobble reached it).
  It is grass now: the cut is at 0.5.
- **The scatter is not changed**, as asked. Its filters read the splat functions, not the shader. A tuft near an edge
  may therefore now stand a few cm over the new line where it used to stand on a tooth. I saw none in the pictures,
  and did not check this systematically.

Not fixed (other channels, the same cause):
- The **rock/grass** split (the bare-rock patches on Citadel's wild ground and the isles) and the **paving** split
  outside Citadel's LAWN-EDGES streets (the isles' squares and patches) still follow the triangles. Both are visible
  in row 5: the rock patch's ragged rim. Each would need its own distance channel, built the same way.
- The isles' **vertex tint** (`zislands.js` colorFn: the path and earth colours lerped per vertex) still follows the
  grid, softly, under the new edge. `zislands.js` is being changed by another worker; left alone.
- The holomap (`mapdraw.js`) and the path scan (`tests/lib/pathends.js`) still read the old split.
- Citadel's build time grows by 150–200 ms (SwiftShader timing). A 3 × 3 fine sample would trim it.

Questions:
1. Make `?lawnedge=new` the default? Then the switch and the old split can go.
2. Extend the same channel to the rock/grass edge (the ragged rock patches)?

Nobody played it; nothing was checked on a real GPU.
