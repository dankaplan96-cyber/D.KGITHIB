# #17b Knartas's palette (the user's pick, 26.11) — pale grey rock and orange-brown earth

Status: **Implemented, automated runtime only** (SwiftShader, headless Chromium). It is behind the URL switch
**`?knartaspal=new`**, which is off by default. Without the switch the island's ground is exactly as before: the code
path is unchanged, and the draw calls, triangles, geometries, textures and programs are the same at every capture spot.
No one has looked at it on a real GPU or played it.

Why: the resemblance review (resemblance-zeelich.md §C, world.md §5, KNARTAS-17.md "Unresolved gaps") scored Knartas's
palette at 6–7/15. It describes LBA2's Knartas as "pale grey-white rock with green moss, an orange-brown earth square,
sand rims". Ours had dark violet-grey rock, bright green turf and dark grey tiles.

## What changed (with `?knartaspal=new`; Knartas only)

Everything is done with the terrain's vertex colours (`zislands.js` `KNA_PAL`, used where `PAL` is set in
`buildIsland0`). The terrain still reads its existing tiles: cliff, grass, dirt and sand. Nothing new is added: no
texture, material, shader variant or draw.

- **Rock.** The cliff tile is grey-violet (mean ~#8e8796). The rock's vertex colour is now a multiplier in linear light
  of (1.42, 1.5, 1.07), where before it was pink #d8b4c4. This takes the violet out and gives a pale warm grey (~#a6a29a
  before light). That covers the cliffs, the bare-rock patches on the flat (a little darker, (1.2, 1.27, 0.92), since
  they face the sun) and the brink's skirt under the clouds.
  - Measured on the captures, in boxes of sunlit rock: the mean pixel goes from (89, 82, 79) to (134, 130, 122) at the
    dig slope, and from (77, 70, 76) to (136, 132, 127) in the south lanes. Red is at or above blue in both.
  - No pixel in those boxes reaches 250.
- **Turf.** A greyer moss green (#d4dab0 and #c6cea0, where before it was #e8f0b0 and #dce8a4).
- **Earth.** The bare patches that used to be dark paving tiles are now orange-brown earth (the dirt tile, warmed to
  ~#a86c44).
  - The worn paths are the same earth, at 0.8 instead of 0.5.
  - The village square is earth too: the open ground between the huts round (23, 26), with a noise-wobbled edge and on
    flat ground only.
  - The earth is darker than the huts' walls (#c9a074) and redder and lighter than their domes. The huts stay
    separate from the ground.
- **No earth tint on slopes.** Earth tint is only put where the terrain draws earth, on gentle slopes. A first try
  tinted steep rock orange, and it read pink.
- **Rock ramp.** The turf-to-rock colour change is sharper (smoothstep 0.8–1.1 instead of 0.7–1.4). The turf beside a
  cliff takes less of the rock's lift.
- **The scattered rocks** (`rockGeometry` instances) take a pale grey instance colour instead of the turf's bluish tint.
- **The quay's paving and the sand rim:** #f2ece2 and #f0e0c0.
  - The harbour hardly changes. The quay reads a shade greyer: its mean goes from (129, 118, 105) to (122, 113, 101).

Not changed:
- the sky: Knartas has no sky of its own and keeps Zeelich's pale overcast;
- the huts and the zeppelin;
- the stone material of walls, quay kerbs and hut frames;
- the bare-patch shares (`BARE`), so the area of rock the shader reads is the same;
- every other island: their branches do not read `PAL`.

## Cost (automated runtime only: SwiftShader, 1280×720, default quality, play camera Far)

renderer.info for one frame, main and shadow passes. "Before" is the build with the switch off; "after" has it on.
Both runs used the same order of spots.

| Spot (island-local) | calls | triangles | geometries | textures | programs |
|---|---:|---:|---:|---:|---:|
| village square (22.6, 31.2) | 85 → 85 | 662,478 → 662,478 | 1403 → 1403 | 471 → 471 | 95 → 95 |
| dig slope / gold dome (20.5, 9.5) | 50 → 50 | 387,365 → 387,365 | 1405 → 1405 | 471 → 471 | 96 → 96 |
| south lanes (22.3, −16.2) | 58 → 58 | 546,335 → 546,335 | 1408 → 1408 | 471 → 471 | 96 → 96 |
| harbour (−12.0, −26.1) | 71 → 72* | 492,518 → 492,520* | 1409 → 1409 | 471 → 471 | 96 → 96 |

\* A 2-triangle draw that comes and goes from run to run. A first run with the switch on gave 71 / 492,518 at the same
spot.

The island's group, measured when it is built: 148 meshes, 65 materials, 236,926 triangles, 16.04 MB of vertex and
index buffers, 610 colliders. All are the same with and without the switch.

Build time of `isle_knartas`, alternating fresh pages in one browser: off 11.4 s and 11.3 s, on 10.3 s and 11.6 s.
This is noise. Two earlier single runs on a busier machine gave 14.8 s off and 23.5 s on; the alternating run shows
that gap was load. The colour work per vertex is a little arithmetic and one 2-octave noise call, once at build time.

Nothing runs per frame, and nothing is added to the GPU. The fragment cost is the same shader on the same splat
weights, but renderer.info cannot measure fragment cost, and frame time on a real GPU is unmeasured.

## Tests (each run once, with the switch on: `QUERY=knartaspal=new`, SERVE=1)

- `tests/island-doors.mjs` with `REGIONS=isle_knartas`: **PASS 24/24, no errors**. All 20 Knartas doors were walked to
  on foot and entered; the keepers' check and the save-inside / Continue check also passed.
- Not run: the other island suites. Nothing but terrain colours and the rocks' instance colours changes, so no
  collider, door, route or save is touched.

## Captures

`captures/knartas-pal/sheet.png` has before (switch off) and after (`?knartaspal=new`) pairs from the play camera (Far)
at four spots, plus one overview from a free camera. They are automated runtime only (SwiftShader).
- Spots: the village square, the dig slope by the gold dome, the south lanes and the harbour quay.
- Capture script: `<session scratchpad>/knartaspal/cap.mjs` (not committed).

## Unresolved gaps toward 85 (estimates, not re-scored)

- **The rock's pattern.** The cliff tile's light facets and dark cracks were drawn for Citadel's darker cliffs. Lifted
  to a pale grey, they read busy on the flat bare patches, like crazy paving. A paler, quieter rock would need either
  of these:
  - the existing `isle-granite` tile (Otringal's pale rock, 512², shared with Otringal once that is built);
  - a lower-contrast variant of the cliff tile.
  Either is a texture choice, so it is not made here.
- **A lit lip.** Where turf meets a cliff, the vertex colour blends over one grid cell (1.7 m), so the turf's edge takes
  a little of the rock's lift. It shows at the dig slope as a slightly yellower band, which was there before too.
- **The square's place.** The LBA2 top-down reference (R-TOP) is not in this checkout, so the square is placed on the
  open ground between the huts rather than on the original's footprint.
- **Moss on the rock.** LBA2's moss lies in patches on the rock. Ours is still turf in the old layout's places.
- **Twisted dead branches** and the refinery (KNARTAS-17.md) are still open.

## Questions for the user

1. Keep the new palette? These are the values to tune:
   - the rock's lightness (now ~#a6a29a before light);
   - the earth's colour (~#a86c44);
   - how green the moss is.
2. Should the rock be a quieter, paler tile (Otringal's granite, already in the game) at the cost of one shared
   texture?
3. Should the village square be bigger, or move to where you remember it?
