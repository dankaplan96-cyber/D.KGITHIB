# PATHS-135 (P135, the user, 26.11: "make sure all the paths are complete and not cut off in the middle like here")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it, and nothing here was checked on a real GPU.

## The user's spot
The photo was taken in Citadel, at the west street's foot, about (−60, 3), with the camera looking west-north-west.
- The "blue-grey brick fort wall" is the promenade's sea wall (P103). The "big stone stair" is its 20-step flight.
- The paved strip with the wooden bin is the street down to the flight (`town.js` STREETS[1] and `GRID_STREETS`' x −64 piece).
- The west street and its foot (`world.js` GRID_STREETS) stopped at z 1.4. That left 4 m of dirt between them and that
  street: the paving under Twinsen "ends at bare dirt".
- Picture: `captures/paths-135/sheet.png`, rows 1–2.

## The scan: `tests/path-ends.mjs` (+ `tests/lib/pathends.js`, `tools/path-ends-plan.py`)
Run with `SERVE=1 node tests/path-ends.mjs`. It covers Citadel, Zeelich, Desert Island with Kesh, the Hamalayi, the
nine Zeelich isles, and Ballastra's Float Harbor (its cobbled masses).

**Not scanned:** Ballastra's Arch District and Water Gardens. They are stone-flagged masses over water, built with the
`stone` texture, which walls share, so the scan cannot pick their paving out. Their edges are drops and parapets, not
open ground. They were not inspected for this task.

How it reads the paving:
- **Terrain paving.** It reads what the shader draws: the LAWN-EDGES edge distance where the terrain has one, else the
  splat's paving share at 0.5.
- **Mesh paving.** It adds up-facing faces of meshes with the town cobble texture, or with Zeelich's flags and borders.
  The `zpave`/`zkerb` textures are now named so the scan can find them. This is the only change to game code made for
  the scan.
- Everything goes onto a 0.25 m raster, which is thinned to its middle lines.

What it reports:
- **END**: a paved strip up to 7 m wide whose end reaches nothing within 2 m. A destination is any of these:
  - a door trigger
  - a solid at least 1.5 m across and 0.3 m tall: a wall, house, stair, parapet, fence or bench
  - a step in the ground of at least 0.3 m
  - the sea
  - more paving within 3 m

  A bin, lamp, post or tree counts only as a prop, not as a destination.
- **GAP**: a paving edge that faces other paving straight across 0.75–5 m of level bare ground, with nothing solid
  between. The edge must be at least 1.5 m long. This was the user's case.
- **Not counted**: the isles' terrain paving, which is landing pads, round squares and WA-11's noise patches, not
  paths. These are listed separately.
- **Deliberate cases**: kept in `tests/fixtures/paths-135-known.json`, each with its reason.

Outputs: plans (`plan-<area>.json` → `tools/path-ends-plan.py` → PNG) and a play-camera picture of each finding.

| Run (same scan version) | Strip ends | Found on paths | Not accepted | Accepted as deliberate | Isle patches |
|---|---|---|---|---|---|
| before (`338d0171`'s world) | 187 | 14 | **6** (3 END, 3 GAP): FAIL | 8 | 124 |
| after (this branch) | 184 | 8 | **0**: PASS | 8 | 86 |

Files: `captures/paths-135/found-{before,after}.json` and `plan-citadel-{before,after}.png`.

## The list, and what was done at each
| # | Area, at | Kind | Before | Done (visible world change: for the user's pick) |
|---|---|---|---|---|
| 1 | Citadel (−57.4, −3.2) | GAP 4.8 m | the user's spot: the west street and its foot stopped 4 m short of the street to the promenade flight | The west street runs on north and ends flush in that street (`GRID_STREETS[0]` z0 2.9 → −4.16). Its kerbs follow automatically. |
| 1b | Citadel (−55.5, −1) | (new pocket) | #1 left a 4 × 4 m bare bed with kerbs, enclosed by paving, between the street, its foot, the street to the flight and the block's west street (x −52) | Paved with one rect (`[-55.4, -4.16, -55.4, 2.9, 4.0]`). The kerbs inside it are gone. |
| 2 | Citadel (−28.7, 31.1) | END | the cross street stopped square, 7 m short of the spaceport footbridge, on dirt | It ends at x −31. A 3 m link runs south along the bridge's foot (x −34…−31, z 31.3…42), flush with the bridge's west end; the bridge's bollards and sign post now stand on it. |
| 3 | Citadel (−64.7, 31.5) | END | the cross street stopped square, 11 m short of the harbour yard, on the old harbour path's dirt | **Separate commit (`0d5a80d3`), its own pick.** The cross street runs on to the yard's east face (x −75.5). This changes P112's "square end with a kerb across it", which the user picked on 23.11. |
| 4 | Hamalayi, Lhar's square (4297, 8) / (4295, 10) | END + GAP | trodden earth (the area's PATHS) broke the paving: a ring round the shrine, open on the east | Inside the square, the paving wins over the trodden ways (`hamalayi.js` splat: `w[3] *= 1 − k`). The square is now whole; the trodden ways start at its edge. |
| 5 | Hamalayi, the monastery yard (4335, −38) | GAP | the yard's flags stopped 3 m short of its gate, where a trodden way ran in | Same rule: the flags now reach the gate. |
| — | Citadel (−46.9, −14.4) | GAP | a planted bed (tree, bushes) between the square's ring and the P42 north street, enclosed by paving | deliberate (known list) |
| — | Citadel (−36, −14.4), (−33.9, −11.9), (−35.7, −10.9) | GAP | a planted bed (a tree) between the climb's ramp, the north street and the block's east street | deliberate |
| — | Citadel (−36.4, 5.7) | GAP | the fork of the south lane and the east street (both go on) | deliberate |
| — | Desert (3337.4, −75.4) / (3337.4, −70) | GAP | the School's two walks on either side of the rill, crossed by its plank bridge | deliberate |
| — | Zeelich (2372.3, −8.6) | GAP 1.4 m | a house's arcade floor behind its piers, with 1.4 m of the street's ground before the round plaza | a porch, not a way: **noted, not changed** (a question below) |

Not changed:
- **The harbour.**
- **Walkers' routes.** Paving is ground texture only: no height, collider or route changed. `walknav` uses `town.js`
  streetDist and PATHS, neither of which changed.
- **Colliders.** A collider dump before and after #1–#2 shows one difference: a rock within 1.1 × its size of the new
  link was hidden. That is the existing filter, applied after the scatter, so no random draw moved.
- **Kerbs.** Grid kerbs went from 582 to 614. Six of the old street kerbs, the ones along the stub that now has
  paving beyond it, were dropped by C66's existing rule.
- **The promenade.** It is now found by its line, not by its index in `GRID_STREETS`, so new streets can be listed
  before it.

## Saw-tooth grass edges (point 3)
- **Same family: yes.** The town's lawn and soil split is a per-vertex weight (`world.js townSoil`; the shader's crisp
  re-split at 0.5, between 0.42 and 0.58). Its ramp is narrower than the 0.93 m grid, so the edge follows the triangles.
  Near paving, a vertex inside the paving also passes its share to the earth, which adds teeth.
- **The cheap fix did not work.** I tried widening the lawn ramp, with one A/B. It does not remove the teeth. It also
  changes the scatter: `townSoil` feeds two scatter filters, and a tulip bed changed colour. **Dropped.**
- **The real fix** is LAWN-EDGES' method applied to the lawn edge: a per-vertex distance cut per pixel in the shader.
  That needs a second edge channel, and the lawn shape must be kept apart from the scatter's copy. Not done; this is a
  proposal.

## Tests (automated runtime only, SwiftShader, SERVE=1, once each)
- `tests/path-ends.mjs`:
  - before: FAIL, 6 open.
  - after: **PASS** (0 open, 8 deliberate).
  - Pictures were looked at for each finding.
- `tests/walkers.mjs`: **PASS 37/37**.
- `tests/worldfit.mjs`: functional 1/1, visual 7/8.
  - The one FAIL is (3) z-fighting on **isle_knartas**: the huts' floors, stone against plaster at y 3.06. This comes
    from #17's new Knartas default, not from this work.
  - Citadel's z-fight count is 25 visible, unjudged, as at v141.
  - Handed to the coordinator.

## Questions for the user
1. Should the cross street run on to the harbour yard (#3, commit `0d5a80d3`)? It undoes P112's square end there.
2. Zeelich's porch north of the plaza (1.4 m of ground between its floor and the plaza): leave it, or pave across?
3. The lawn's saw-tooth edges: worth a shader edge channel? Not done here.
