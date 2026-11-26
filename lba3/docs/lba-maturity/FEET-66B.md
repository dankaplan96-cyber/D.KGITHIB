# FEET-66B (26–27.11): #66 part 2, the places FEET-66 handed on (work in progress)

Branch: worktree of `ccr-c1c2c4b9-dep6ed` at `c3357e49`. Every result here is **automated runtime only (SwiftShader,
headless Chromium)**. Suite: `tests/feet-on-surface.mjs` (FEET-66.md has the rules).

## Checklist (from the discovery on `c3357e49`, `DISCOVER=1`, all areas, 194 s)

Citadel (source lines found by a probe that records the builder of every collider and batch part):
- [ ] the square's ring steps (`island.js buildFlatTown`): no colliders, the incline under them; feet up to 28 cm under a tread
- [ ] tulip beds' rims (`island.js tulipBed`): collider 9 cm over the drawn rim (5 beds)
- [ ] harbour lips (`island.js buildHarbour lip`): collider 20 cm over the drawn top (2)
- [ ] harbour quay floors (`island.js buildHarbour` 704/712): drawn paving 7 cm over the floor collider (5)
- [ ] the station yard (`island.js buildStation`): plates 5 cm over the ground, a plate 25 cm over the platform, the pump pad
- [ ] the old cellar hatch (`island.js cellarHatch`), the passage N mouth's floor (`tunnelMouth`, 23 cm float)
- [ ] the water main's clamps (`island.js drawPipe`), the pipeline's plate (`buildPipeline`)
- [ ] the town's door steps (`town.js`), the sewer hatches (street, terrace), the lane gate's sill
- [ ] the asylum front (`asylumhostel.js`), the asylum climb's parapet foot (`lba1places.js`)
- [ ] the dressing's crate (`island.js buildDressing`), the spaceport pad's edge (`spaceport.js`)
- [ ] rocks: cliff rocks, plateau stones, the scattered stones (no collider) and boulders (class C)
- [ ] unreachable tops (house roofs at 8.3 m, the tank and tech building roofs): exceptions, not floors

Zeelich, the Desert, the Hamalayi, Ballastra: to list. The isles (`zislands.js`): listed only (PATHS-140B).
