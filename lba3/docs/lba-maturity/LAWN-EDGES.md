# LAWN-EDGES (P112, the user's pick b, 23.11)

Our lawn sits inside LBA2's ~2 m earth band, with straight kerbed paving edges on every street edge of every town plot.
Base: branch `ccr-c1c2c4b9-dep6ed` at 7af6f13f. Evidence: **Automated runtime** (SwiftShader, headless Chromium). Nobody
played it.

## Cause of the zig-zag
The paving was a splat weight per terrain grid point (0.93 m on Citadel). Its ramp (0.55 m, plus ±0.2 m of noise) was
narrower than a cell, so the shader's crisp re-split at 0.5 followed the triangles.

## The fix (engine, all terrains)
- `src/engine/terrain.js`: a terrain may take `edgeFn(x, z, h, e)`. It stores, per grid point, the signed distance to the
  paving's edge and the earth band's width (an `edge` int16×2 attribute; every splat terrain has it, so there is still
  one shader program). The fragment shader cuts the paving at distance 0 per pixel, anti-aliased over about a pixel. A
  distance is linear across a triangle, so a straight edge stays straight. The band's earth takes the grass's share up
  to its width. There are no new triangles and no new texture reads; the extra cost is one vec2 varying and a few ALU ops
  near an edge.
- `src/game/world.js`:
  - `townPaveParts` / `townPaveDist`: one noise-free distance to all of Citadel's paving: the grid streets (as
    rectangles; an end on another street is flush, an end by other paving keeps its round cap, a free end is square),
    the harbour yard and platform, the quay, the square, the old streets and Bug Street's foot, the climb, the fort and
    its forecourt.
  - The splat keeps a step copy of the paving for the map, the probes and the scatter filters.
  - `townBandW`: 2.0 m in the plots (x −76…−20, z −17…62) at the street's level, 1.6 m on LBA2's fenced lawn strip, and
    none along the promenade.
  - `TOWN_BLOCKS`' noisy CPU band (`townBlockEarth`) is gone, because the shader cuts the band now.
- Kerbs (`world.js gridKerbs`, `town.js kerbMesh`): the town's existing stones and material (0.2 × 0.16 m, 0.12 m off the
  edge).
  - Where they run: along both sides of every grid street (the promenade excepted), the square street ends, and the
    harbour yard's and platform's faces, wherever a plot at the same level lies beyond.
  - Where they stop: at colliders (houses, masonry, benches, lamps, bins, bushes, trees), the lawns' and promenade's
    masonry, the sewer hatches, level changes, and paving beyond.
  - Each valid run is filled with stones stretched to fit, and corners close.
  - They are laid once the dressing stands (end of `citydress.js`), in the existing kerb InstancedMesh (54 street stones
    plus 582 new ones), so there is no new draw call. There is no collider (as before): a 10 cm step.
- Scatter, filtered after the draws (the streams are unchanged):
  - no grass tufts or wild flowers on the band, or within 0.3 m of any paving edge;
  - 7 bushes on the band hidden (bushes stand in the lawn inside it);
  - trees kept.
  - Props and NPC paths: no height changed, so nothing needed re-seating.
- `src/game/mapdraw.js`: the holomap paints the band from the edge attribute.

## Per region
| Region | Finding | Change |
|---|---|---|
| Citadel, the P112 plot (x −74…−60, z 18…30) | zig-zag lawn edge, no band, the cross street stopping round | straight kerbed edges, 2 m band, lawn inside; the cross street's west end is square, with a kerb across it |
| Citadel, the museum yard (x −75…−60, z 33…50) | zig-zag lawn edge | band + kerbs on the west street, the cross street and the harbour yard's east face |
| Citadel, the east yards (shop's, Fosse's; x −33…−20) | zig-zag earth edge | band + kerbs; the cross street's east end (toward the footbridge) is square, with a kerb |
| Citadel, the middle block | band existed but zig-zagged | straight band + kerbs; the south lane's old kerbs kept |
| Citadel, FLAT-TOWN raised lawns | masonry edges; earth strip zig-zagged against the paving | straight paving edge + kerb along the west and north strips; the east and south bed walls stand at the street edge (no kerb); levels unchanged |
| Citadel, the south lawn strip (fence) | zig-zag | 1.6 m band + kerb |
| Citadel, the square's block (P42 ring streets), the quay, the climb, the fort | noisy edges | straight edges; kerbs only where a plot lies beyond |
| Zeelich, Otringal | paving is a grid-aligned rectangle bounded by rails and rock; no plots | none (no zig-zag) |
| Zeelich, Celebration / Under Celebration | paved tops bounded by the rock rim (the slope rule) | none (not a street edge against a plot) |
| Desert Island, Kesh village | soft round core and soft street on sand; no plots | none (no zig-zag) |
| Desert, the compound | grid-aligned on the 1 m grid, fenced | none |

## Draw calls (play camera, Follow, Far; same spots, before → after)
p112-user-spot 433 → 424, museum-yard 388 → 381, east-yards 418 → 407, middle-block 425 → 419, raised-lawns 323 → 317,
top-town 443 → 431. The kerbs add no call. The small drop is most likely the small-plant pools drawing fewer squares
(the tufts and 7 bushes off the band); it was not traced further.
Load: `gridKerbs` measured 35 ms (SwiftShader). The terrain's distance per grid point is cached between the splat and the
edge (only inside the town's box).

## Pictures
`captures/lawn-edges/<spot>-before.jpg` | `-after.jpg`: p112-user-spot, museum-yard, east-yards, middle-block,
raised-lawns (play camera, Follow, Far), top-town (from above). Made with a scratchpad script (the default camera, the
hero placed and turned).

## Tests (Automated runtime, SwiftShader)
- overlap-sweep (default, every area) **FAILED on its first run**: (c) 8 new kerb runs shorter than 2.5 m sat 6 cm in
  the ground (the street stones' seat). Every other category and area had no open findings. Fix: a grid stone is 0.14 m
  tall and 4 cm in the ground, so its top is still 0.10 m. The Citadel area was rerun (`ONLY=citadel`) and **PASSED**:
  a 0/2, b 0/0, c 0/19, d 0/242, e 0/9 (open/known).
- citadel-structures: **PASS** (7 checks).
- The pictures were made before the 2 cm re-seat. The stones' tops are at the same height, so the pictures still match
  the build.

## Uncertainty / next
- Nobody played it. The kerbs have no collider: residents' and Twinsen's feet pass through 10 cm of stone at a crossing,
  as with the old street kerbs.
- Lawn edges inside the plots against the town's natural soil patches (`townSoil`) still follow the grid (they are not
  street edges).
- Other terrains carry the attribute "off" (4 bytes a vertex); none of them needed it.
