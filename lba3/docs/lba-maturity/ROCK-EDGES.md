# ROCK-EDGES (LAWN-EDGES-2's "still open", the user's go-ahead 26.11: the same method for the rock and the paving)

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**, on a shared machine under heavy load (load average 6–18). Nobody played it; nothing was checked on a real
GPU. **Behind `?rockedge=new`, off by default.**

## The fault
Two splits on the terrain were still re-cut per pixel from the per-vertex shares, so their edges followed the grid's
triangles (saw-tooth, or a soft notched fringe):
- **rock** against grass, soil, sand or snow: `rk = smoothstep(0.38, 0.52, share + wobble)`. Citadel's wild ground
  (WA-12's bare-rock patches), the cliff rims, the isles' bare patches (WA-11, Knartas #17b), the desert's outcrops, the
  Hamalayi's rock band.
- **paving** outside the Citadel streets that LAWN-EDGES already cuts: `pk = smoothstep(0.4, 0.6, sp2 / ns + wobble)`.
  The isles' landing pads and paved squares (`paved()`), Under Celebration's yard, the Platform's yard, the desert's
  posts and stone patches, the Hamalayi's monastery and lighthouse.

Many of these sources are sharper than a cell: on Knartas and on Citadel's wild ground the rock share goes from 0 to
~1 between two neighbouring grid points (measured, below). The old split then drew each feature as the grid's diamond.

## The fix (`src/engine/terrain.js`; one source fix in `src/game/hamalayi-finish.js`)
LAWN-EDGES-2's tracer, generalised to channels: `Terrain._edgeChannels` (was `_lawnEdges`).
- **One pass, three channels**, sharing the fine splat samples:
  - lawn: as before. The `lawn` attribute is **byte-identical** with the switch off or on (digests below).
  - rock: the rock's share of all.
  - paving: the paving's share of the ground that is not rock (the ratio the shader splits on).
- **Per channel**, as LAWN-EDGES-2:
  1. Find the cells whose corners lie on both sides of the threshold.
  2. Sample them with the terrain's own `splatFn` on a fine grid.
  3. Trace the line (marching squares).
  4. Give each grid point within 2.6 m its signed distance to the line (− inside: rock / paving), ±4 m beyond.
  5. The lawn only: smooth once (1-2-1), never across a point's own side. **Not the rock or the paving**: measured
     against their splat functions (below), the smoothing doubled the area drawn on the wrong side.
  6. Store a strength: the strongest share ≥ the threshold among the point and its 8 neighbours.
- **The rock's threshold per terrain** keeps the edge where the old split put it on average. The old `rk` is 0.5 where
  share + (tile brightness − 0.5) × 0.3 = 0.45. So the threshold is 0.45 − (mean − 0.5) × 0.3, from the flat read's
  mean linear brightness (`rockTop × rockTopK`, read once per tile from its canvas):
  - 0.521 on the cliff tile and the quiet granite (Citadel, the desert, the Hamalayi, the quiet isles);
  - 0.46 on Otringal's and Knartas's granite.
  - It follows QUIET-ROCK's tint if that changes (`quietrock.js` not touched).
- **Fine samples**:
  - rock: at most ~0.5 m apart. On the grids of 1 m or less (Citadel 0.93 m, the desert, the Hamalayi) every second
    one, 2 × 2 a cell. At 4 × 4 the rock tripled Citadel's build time (743 ms against 223 ms in one run). On the isles'
    1.7 m grid all 4 × 4, to keep the spacing at ~0.43 m (2 × 2 would be 0.86 m; on Knartas's captures the two looked
    nearly alike).
  - paving: 4 × 4 everywhere. Its sources are often a step (`paved()`, the posts), and its cells are few.
- **The `rockedge` attribute**: int16 × 4, normalised: [rock distance, rock strength, paving distance, paving strength].
  - Every splat terrain has it when the switch is on, so there is still one program per switch set.
  - The key gets `-re`.
- **The shader** (`ROCK_SPLIT`, `PAVE_SPLIT`):
  - rock: `rk = cut(dist + (brightness − uRockMid) × 0.1 m) × smoothstep(0.38, 0.52, strength + (brightness − 0.5) × 0.3)`.
    - `cut` is anti-aliased over about a pixel (`fwidth`, taken before any branch).
    - Strong rock is whole up to the line; weak rock keeps its old faint look inside it.
    - The rock tile is read where the cut can give rock (`dist < 0.35 m`), not where the interpolated share is over
      0.229: the traced line is not the interpolated share's line.
    - Where the rest's share is ~0 (a triangle all rock: WA-12's patches, the outcrops, Otringal's turf) the rock stays
      whole (`max(rk, 1 − rest × 50)`), so the shares never sum under 1.
    - The wobble was 0.25 m first: the granite's dark specks then drew a dotted fringe outside the line (desert). Now
      0.1 m, as the lawn's.
  - paving: `pk = cut(dist + grass wobble × 0.1 m) × smoothstep(0.4, 0.6, strength + wobble × 0.25)`, wherever there
    is paving or the cut can give some.
  - Where LAWN-EDGES' own paving line runs (Citadel's streets, `vEdge` < 3.95 m), its cut still decides, as before.
  - Where paving meets bare rock (Otringal's square on its granite turf, parts of Knartas's and the Platform's), the
    paving's share of the ground that is not rock has no value on the rock side, so there is no paving line there: the
    rock channel draws that edge (Otringal: 20 paving cells, no line).
- **The Hamalayi's rock** (`hamalayi-finish.js` `gridCapture` `G.rock`): a share per vertex, read at the nearest vertex.
  Between vertices the tracer then saw the grid's squares. With the switch on it now interpolates between the vertices
  (bilinear); with it off, the nearest vertex's as before. At a vertex it returns the vertex's own value either way,
  so the splat, the colours and the scatter are unchanged (digests below). Only the build reads it (`GRID` is cleared
  after the terrain is made).
- **Switch off** (the default): no attribute, no CPU work. The shader text is **identical** to the previous build's for
  all 18 generated variants: the 16 SHADE-COST combinations plus the `grass` and `unlit` diagnostics. Checked with
  `?lawnedge=old` too.

Unchanged, by construction and checked (below): the splat functions, the heights, the scatter, the colliders, the
vertex colours, the lawn attribute. The holomap (`mapdraw.js`) and `tests/lib/pathends.js` still read the old splits.

## Sweep: every splat terrain (`new Terrain(` has four callers: world.js, desert.js, hamalayi.js, zislands.js)
Edge cells = grid cells whose corners lie on both sides of the threshold (where the old split could draw teeth).

| Terrain | Grid | Rock cells | Paving cells | In the sheet |
|---|---|---:|---:|---|
| Citadel (wild ground, cliff rims; streets: LAWN-EDGES) | 0.93 m | 7410 | 927 (most under LAWN-EDGES' cut) | rows 1, 2 |
| Desert Island | 1 m | 5889 | 511 | row 3 |
| Hamalayi | 1 m | 3478 | 135 | row 4 |
| Otringal (granite turf; the square's edge is the rock channel's) | 1.71 m | 1486 | 20 (no line: all-rock neighbours) | row 5 |
| Knartas | 1.71 m | 942 | 85 | row 6 |
| Mosquibee | 1.71 m | 737 | 22 | row 7 |
| Celebration | 1.71 m | 235 | 49 | row 8 |
| Under Celebration | 1.71 m | 1152 | 207 | row 9 |
| The Platform | 1.71 m | 1333 | 333 | row 10 |
| Old Watch, Orchard | 1.71 m | 239, 214 | 20, 24 | rows 11, 12: the island's rim (their rock is on slopes; the spot finder needed looser filters) |
| Lift Dock | 1.71 m | 22 | 0 | not pictured (decks) |
| Zeelich (main island), Ballastra | — | — | — | not applicable: no splat terrain |

## Measured: the sources are sharper than the grid
A grass grid point between two rock points on Knartas, the rock share along x at 1/8-cell steps (0.21 m), from
`tests`-style probes (`T.splatFn` in the page):
`1.00 1.00 1.00 1.00 1.00 1.00 1.00 0.28 0.00 0.00 0.00 0.00 0.00 0.00 0.00 0.34 0.94` (grid: 1.00 | 0.00 | 0.94).
The grass runs from −0.15 to +0.85 of a cell around the point, not the symmetric diamond the old split drew. Citadel's
WA-12 patch at (−60, −40): grid shares 0 or ≥ 0.9 side by side throughout.

**Fidelity** (one page load, every terrain, CPU only): over each terrain's edge cells, an 8 × 8 sub-grid per cell.
Each sample is classed three ways:
- truth: the splat function's own value ≥ the threshold;
- old: the triangle-interpolated grid value ≥ the threshold;
- new: the interpolated traced distance < 0.

Wrong = the share of the edge cells' area on the wrong side. Inner = rock (or paving) area, truth / old / new.

| Terrain | Rock wrong, old → new | Rock inner, truth / old / new | Paving wrong, old → new |
|---|---|---|---|
| Citadel | 16.1 → 7.8 % | 52.4 / 48.4 / 50.5 % | 24.9 → 8.6 % |
| Desert | 12.2 → 6.0 % | 46.0 / 45.6 / 45.0 % | 24.1 → 6.2 % |
| Otringal | 18.3 → 10.0 % | 59.0 / 58.3 / 61.9 % | (no line) |
| Knartas | 25.9 → 9.7 % | 60.0 / 48.1 / 60.1 % | 18.8 → 12.3 % |
| Mosquibee | 20.7 → 7.7 % | 62.1 / 52.4 / 63.4 % | 21.7 → 4.3 % |
| Celebration | 25.8 → 9.7 % | 68.5 / 52.1 / 69.5 % | 14.3 → 5.3 % |
| Under Celebration | 20.1 → 10.1 % | 61.4 / 55.6 / 64.2 % | 17.1 → 6.2 % |
| The Platform | 22.4 → 9.1 % | 60.0 / 48.3 / 60.3 % | 15.8 → 9.1 % |
| Orchard, Old Watch | 35.7, 24.9 → 4.6, 3.8 % | 60.4, 58.7 / 28.9, 37.8 / 56.6, 56.8 % | 17.1, 14.7 → 3.2, 6.1 % |

- With the 1-2-1 smoothing (LAWN-EDGES-2's) the rock was wrong on 12.4 % (Citadel), 11.4 % (the desert) and
  13–15 % (the isles), with the rock area eroded on Citadel and the desert by ~4 points. So the rock and the paving
  are not smoothed.
- On Knartas the old split under-drew the rock (48 % against the function's 60 %). The new edges draw what the function
  says (60 %), so the "growth" of rock in row 6 is the function's true extent, not erosion.
- The Hamalayi cannot be measured this way: its rock reads the build-time grid (`GRID`), which is cleared after the
  build. The source fix above makes its rock continuous between vertices.

## Visible changes with the switch on (for the user's pick)
- **Knartas (row 6) first: its approved palette (#17b) loses most of its small orange earth patches in the rock.**
  The splat function puts rock there (Knartas's rock area: function 60 %, old 48 %, new 60 % of the edge cells), so
  the edge is right by that measure. But the vertex colour (`zislands.js` colorFn's per-vertex earth lerp) still tints
  the rock faintly orange where the patches were. If the user wants the patches kept, the source (the earth patches'
  shares in `zislands.js`) needs a change, not the tracer.
- Rock edges are smooth lines and curves on Citadel's wild ground, the cliff rims, the desert's outcrops, the
  Hamalayi's rock band and every isle's bare patches; the saw-tooth and the soft notched halo are gone.
- Paving edges are smooth on the isles' pads and squares, Under Celebration's and the Platform's yards.
- **Shapes move by up to about a cell** where the splat is sharper than the grid: the edge now follows the splat
  function (what the scatter and the map read), not the grid's diamonds. The biggest shifts are on the Orchard and the
  Old Watch (rock 29 % and 38 % of the edge cells before, 57 % after, function 60 % and 59 %).
- Weak rock (share under the threshold everywhere around) that showed as a faint mottle is gone, as with LAWN-EDGES-2's
  weak soil.
- Citadel's streets: unchanged. At the user's spot (−60, 2), facing west, 0.3 % of pixels differ: the rock patches behind
  the bank, the cliffs at the far left and the hero's idle pose. None are on the street.

## Cost
All automated runtime, SwiftShader, on a machine shared with another agent's tests (load average 6–18). JS timings,
not a player's PC. **No frame-time claim.**
- **`renderer.info`** (one frame, play camera, Far, 1280 × 720): calls, triangles, programs, geometries and textures
  **identical** before and after at all 11 spots in one pair of runs, and at the Orchard and the Old Watch. In the final pair, 10 of 11; at Citadel's bank rim
  the after run drew 1 call and 436 triangles fewer, which the earlier pair did not show (run noise: something moving).
  Examples: Citadel by the well 318 calls / 1,264,370 triangles; the
  user's street spot 234 / 918,795; the desert 36 / 77,884; Knartas 84 / 645,659. No new mesh, light, texture or pass.
- **Shader** (switch on), per terrain pixel:
  - one more varying `vec4`, one more `fwidth` (of a `vec2`);
  - rock: two `smoothstep`s and a `max` in place of one `smoothstep`;
  - paving: two `smoothstep`s in place of one;
  - no texture read added. The rock's three reads move from where `share > 0.229` to where `dist < 0.35 m` (a similar
    band; the pixel count was not measured);
  - fragment text 5547 → 6255 characters, vertex 373 → 571.
- **Load** (build time, once per terrain, `performance.now()` in `_edgeChannels`; the lawn's own share included):
  - The driver is the number of splat samples (deterministic):

    | | Citadel | Desert | Hamalayi | Otringal | Knartas | Other isles |
    |---|---:|---:|---:|---:|---:|---:|
    | lawn only | 44.6k | 0.8k | 0 | 0 | 4.7k | 0–1.2k |
    | lawn + rock + paving | 84.2k | 31.8k | 16.3k | 25.6k | 18.3k | 0.4k–23.8k |

  - Timings, switch off → on, in the least loaded runs: Citadel 205–324 → 316 ms; the desert 33–48 → 143 ms; the
    Hamalayi 8–32 → 65 ms. Otringal 14–17 → 151 ms (final, 4 × 4, a loaded run; 60 ms at 2 × 2). Each other isle
    1–62 → 1–64 ms.
  - Under the heaviest load the same build took Citadel 1034 ms and the desert 434 ms. Citadel is built at start-up;
    the others when first entered.
  - Not done: cheaper samples (the time is almost all in the splat functions).
- **Memory**: 8 bytes a vertex on every splat terrain:
  - Citadel 632 KB, the desert 725 KB, the Hamalayi 427 KB, the isles 30–125 KB each; 2.35 MB in all.
  - The batched terrains (the desert, the Hamalayi, the isles) keep a second copy in the batch: about 1.7 MB more on
    the GPU side.
  - The fine samples are a temporary map during the build.
- **Switch off**: no attribute, no CPU work, the same shader text: zero cost.

## Pictures
`captures/rock-edges/sheet.png`: before (default) | after (`?rockedge=new`).
- Setup: the play camera (Follow, Far), 1280 × 720 scaled to half. Same build, same spot, same order of visits, two page
  loads; the HUD is hidden in both.
- The spots were chosen from the tracer's own edge points (strong rock or paving, flat ground, nearest the spawn), and
  Twinsen was put 7 m from the edge on open ground, facing it.
- Rows: 1 Citadel's wild ground by the well, 2 Citadel's bank rim, 3 the desert, 4 the Hamalayi, 5 Otringal, 6 Knartas,
  7 Mosquibee, 8 Celebration, 9 Under Celebration, 10 the Platform, 11 the Orchard, 12 the Old Watch; then rows 1 and
  3 at full resolution. Rows 11 and 12 were shot in a later pair of runs (the Orchard first, then the Old Watch).
- Pixels changed (difference > 8 of 255), rows 1–12: 2.3, 2.1, 4.5, 1.2, 2.8, 7.7, 4.4, 7.9, 6.1, 4.2, 1.1, 2.6 %. These
  include the hero's idle pose and the isles' moving cloud sea.
- Nothing from chapters 15–16. Every shot is a new game's state, and every pictured place is reached long before:
  - Citadel from the prologue;
  - the Zeelich isles from chapters 3–5 (Under Celebration's seam is wave 5's, 'steam'; `tests/camisles.mjs` walks
    Otringal, Knartas and the Platform at chapter 5);
  - the desert from 'dig' (`story/dig.js` enters it), the Hamalayi from 'pass' (`story/pass.js`).
  - This is inspected from the story files and the tests, not traced through every chapter's gating.

## Checks
- **Scatter, heights, splat, colours, lawn: unchanged.** Every area was built (Citadel, the nine isles, the desert, the
  Hamalayi) with the switch off and on:
  - all 12 terrains: the same digests of every attribute but `rockedge` (position, normal, colour, splat, splat2, edge,
    lawn);
  - all 89 instanced meshes: same counts, placement and colour digests;
  - colliders: 10,078 both ways, the same digest.
- **Shader text, switch off**: identical for all 18 variants, with and without `?lawnedge=old`.
- **Every variant compiles with the switch on**: the 16 SHADE-COST combinations × the 4 `diag` values (null,
  `implicit`, `grass`, `unlit`) rendered in the page, with `?lawnedge=new` and `?lawnedge=old`. No console error.
- **No weight hole**: looked at, not measured. The all-rock interiors at full resolution (the last two rows) show no dark
  speckle. The unlit A/B the plan named was not run.

## Tests (automated runtime only, SwiftShader, SERVE=1, once each, both with `QUERY=rockedge=new`)
- `tests/walkers.mjs`: **PASS**, 37/37.
- `tests/worldfit.mjs`: **PASS**, functional 1/1, visual 8/8.
  - The first run did not finish: the page was killed by the shared machine's memory limit. The kernel's OOM log names
    a page renderer at 3 GB, with two other agents' browsers running. It was run again when they were lighter.
  - The scan reads geometry, which this change does not touch. LAWN-EDGES-2's Knartas hut-floor z-fight (fixed since,
    `f07e693f`) did not recur.
- Both suites ran on `7b86e428`. After them, two changes to what the attribute holds, not the shader: no smoothing for
  the rock and the paving, and the Hamalayi's interpolated rock (switch-gated). The switch-on shader text is identical to the tested
  one (generated and compared); the digests were re-taken. The suites were not run again.
- Neither suite ran with the switch off. The default rests on three things: the shader text is identical with the switch
  off, there is no attribute and no work, and the digests above match.
- Not run: `tests/path-ends.mjs` (it reads the old splits, which are unchanged).
- No test pictures were overwritten (`git status` clean after both).

## Unresolved / for the user
- Make `?rockedge=new` the default? Then the switch and the old splits can go.
- The isles' **vertex tint** (`zislands.js` colorFn: the paving colour copied per vertex, the rock lerp by slope, the
  bare patches' colours) still follows the grid, softly, under the new edges. Seen on Knartas (row 6: the orange cast
  where the earth patches were); elsewhere I could not tell it from the shading. Not measured. `zislands.js` is
  another worker's; left alone.
- Boolean sources (`paved()`, Citadel's `flatClear` rock cut-out) trace as a quarter-cell staircase. A straight edge
  may show it as a faint wave. Not seen on the captures; not checked systematically.
- The Hamalayi's rock band shows a few kinks along the river (row 4) where its per-vertex rock field bends.
- The holomap and `tests/lib/pathends.js` still read the old splits.
- Build time: Citadel's start-up gains ~0.1 s (least loaded run), the desert and the Hamalayi ~0.1 s at first entry
  (SwiftShader timings).
- The scatter is not changed, as asked. A tuft or rock near an edge may stand where the old grid diamond put the edge.

Nobody played it; nothing was checked on a real GPU.
