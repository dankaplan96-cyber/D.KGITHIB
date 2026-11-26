# #17b Knartas's palette (the user's pick, 26.11) — pale grey rock and orange-brown earth

Status: **Implemented, on by default** (the user approved it 26.11). **`?knartaspal=old`** gives the previous ground
(the old colours on the cliff tile). Automated runtime only (SwiftShader, headless Chromium). No one has looked at it on a
real GPU or played it.

Why: the resemblance review (resemblance-zeelich.md §C, world.md §5, KNARTAS-17.md "Unresolved gaps") scored Knartas's
palette at 6–7/15. It describes LBA2's Knartas as "pale grey-white rock with green moss, an orange-brown earth square,
sand rims". Ours had dark violet-grey rock, bright green turf and dark grey tiles.

## A quieter rock (the user's request, 26.11: the approved palette's rock read busy)

The cliff tile's light facets and dark cracks were drawn for Citadel's darker cliffs. Lifted to a pale grey they read
busy, like crazy paving, most of all on the flat bare patches.

- **The rock is Otringal's pale granite tile** (`graniteTex`, `isle-granite`: already in the game). It is a speckled
  neutral grey with soft lighter and darker blotches and fine cracks. Knartas only: every other island keeps its tile.
  - `KNA_PAL.granite`; the terrain reads `graniteTex()` for its rock where `S.turfRock || PAL?.granite`.
  - With `?knartaspal=old`, `PAL` is null, so the old ground on the cliff tile comes back by construction.
- **The same lit grey as before.** The granite is paler than the cliff tile. Measured in the page, the mean in linear
  light is (0.494, 0.476, 0.430) against (0.291, 0.263, 0.329). So the vertex-colour multipliers now darken it instead
  of lifting it:
  - rock: (0.76, 0.76, 0.75), where before it was (1.42, 1.5, 1.07);
  - the bare patches on the flat: (0.72, 0.72, 0.73), where before it was (1.2, 1.27, 0.92).
  - No rock multiplier is over 1 any more. The earth (1.3, …) and the scattered rocks' instance colour (1.45, …) still
    are.
- **The rock's edge, partly held in place.** The terrain shader moves the rock/turf edge by the tile's own brightness
  (`terrain.js`: `dot(rock, 1/3) − 0.5`, times 0.3). The paler granite moved the edge out by about 0.052 of splat
  weight (estimated from the tiles' means), and on screen it took about 9 % of the turf. On Knartas the rock's splat
  weight is now × 0.81 (in `splatFn`, before normalisation), sized to cancel that shift. On screen it recovers about a
  third of the loss at the south lanes and the dig slope, and none in the square.
  - Turf-green pixels per frame, approved → granite without the fix → final:
    - south lanes 24.98 → 22.78 → 23.38 %;
    - dig slope 17.15 → 15.56 → 16.08 %;
    - square 16.59 → 15.30 → 15.32 %;
    - harbour 7.51 → 7.48 → 7.50 %.
  - A looser test (G over R and B by 4) gives the same picture: 26.46 → 25.26 %, 21.31 → 19.99 %, 18.60 → 17.67 %.
  - Inspected on crops, the edges look to be in about the same places. The cause of the remaining 1–1.3 points is not
    established. Two candidates:
    - the one-cell vertex-colour blend beside the rock now leans to a neutral grey (0.76), where it used to be lifted;
    - the granite's flatter tone smooths the edge's wobble.
  - Not retuned further: the brief asks for a quieter rock, not a fixed edge.

**Measured on the captures** (1280×720, play camera Far, the same spots and settings, before = the approved palette at
its final revision, after = this change). The boxes are sunlit rock. "Fine" is the standard deviation of luminance after
a 6 px Gaussian high-pass, which is how busy the pattern reads.

| Box | mean RGB before → after | luminance SD | fine SD | pixels ≥ 250 |
|---|---|---:|---:|---:|
| south lanes, flat bare patch (850–1250, 560–700) | (138, 134, 129) → (139, 136, 131) | 36.9 → 17.2 | 26.7 → 11.5 | 0 → 0 |
| south lanes, rock mound (80–260, 90–200) | (95, 92, 89) → (95, 92, 88) | 28.9 → 25.2 | 16.7 → 8.8 | 0 → 0 |
| dig slope (800–1200, 420–620) | (131, 128, 120) → (135, 133, 123) | 30.1 → 13.9 | 19.4 → 7.8 | 0 → 0 |
| village square, rock beside the jars (975–1140, 560–700) | (139, 134, 128) → (137, 133, 127) | 37.6 → 16.4 | 27.0 → 10.9 | 0 → 0 |

The rock keeps its value (within 5 levels per channel) and loses about half its contrast. The fine pattern drops to 40–53 %.

**Cost.** renderer.info at the four spots below: calls, triangles, geometries and programs are the same; **textures
are 471 → 472**. That is the granite tile: one 512² canvas texture with mipmaps, about 1.4 MB of GPU memory (an
estimate: 512 × 512 × 4 bytes × 4/3). It is shared with Otringal (the same `ctex` key), so once Otringal is built it costs
nothing more. Nothing runs per frame, and the shader program is the same. The texture is drawn once, on the first
build of Knartas or Otringal. For build time, see the A/B in "Cost" below.

**Captures:** `captures/knartas-pal/rock-sheet.png` has before (the approved palette, the cliff tile) and after (the
granite) pairs from the play camera (Far) at the south lanes, the dig slope and the village square. Automated runtime
only (SwiftShader).

What the granite does not do:
- On the steep faces it reads flatter than the cliff tile. The cliff tile's lit facets and strata gave the faces a carved
  look. The granite's blotches stretch into soft vertical streaks under the triplanar projection (as on Otringal). The
  cliffs still read as cliffs by their light and their edge.
- The granite's fine flecks (1–3 px dots on the tile) show as a light speckle at the play camera. This is the granite's
  own look; it is much quieter than the facets were.

## What changed (Knartas only; `?knartaspal=old` gives the old ground)

Everything is done with the terrain's vertex colours (`zislands.js` `KNA_PAL`, used where `PAL` is set in
`buildIsland0`). The terrain reads the game's existing tiles: grass, dirt, sand and, since the quieter-rock change above,
Otringal's granite instead of the cliff tile. No material, shader variant or draw is added. The rock values in the
first bullet below are those of the approved version on the cliff tile. The section above gives the granite's values.

- **Rock.** The cliff tile is grey-violet (mean ~#8e8796). The rock's vertex colour is now a multiplier in linear light
  of (1.42, 1.5, 1.07), where before it was pink #d8b4c4. This takes the violet out and gives a pale warm grey (~#a6a29a
  before light). That covers the cliffs, the bare-rock patches on the flat (a little darker, (1.2, 1.27, 0.92), since
  they face the sun) and the brink's skirt under the clouds.
  - Measured on the captures, in boxes of sunlit rock: the mean pixel goes from (89, 82, 79) to (134, 130, 122) at the
    dig slope, and from (77, 70, 76) to (136, 132, 127) in the south lanes. Red is at or above blue in both.
  - Counted: 0 of 96,000 and 0 of 84,000 pixels in those boxes reach 250.
- **Turf.** A greyer moss green (#d4dab0 and #c6cea0, where before it was #e8f0b0 and #dce8a4).
- **Earth.** The bare patches that used to be dark paving tiles are now orange-brown earth (the dirt tile, warmed to a
  brown ~#9c6843).
  - On screen, lit, it measures about (126, 87, 60) in the square. The terracotta jars beside it measure (128, 72, 55),
    so the jars are redder.
  - A first, redder earth (~#a86c44, (135, 90, 63) on screen) sat too close to the jars, which are searchable
    containers. Citadel's soil was also toned down twice for reading orange (textures.js).
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
  - Knartas draws only one. Its instance colour is (1.42, 1.42, 1.32) in the buffer, so it is not clamped.
  - It is not in any capture.
- **The quay's paving and the sand rim:** #f2ece2 and #f0e0c0.
  - The harbour hardly changes. The quay reads a shade greyer: its mean goes from (129, 118, 105) to (122, 113, 101).

Not changed:
- the sky: Knartas has no sky of its own and keeps Zeelich's pale overcast;
- the huts and the zeppelin;
- the stone material of walls, quay kerbs and hut frames;
- the bare-patch shares (`BARE`). The rock's area was the same on the cliff tile; with the granite its edge moved a
  little (see "A quieter rock");
- every other island: their branches do not read `PAL`.

## Cost (automated runtime only: SwiftShader, 1280×720, default quality, play camera Far)

### The quieter rock (26.11): the approved palette → the granite

renderer.info for one frame, main and shadow passes, at the same four spots in the same order.

| Spot (island-local) | calls | triangles | geometries | textures | programs |
|---|---:|---:|---:|---:|---:|
| village square (22.6, 31.2) | 85 → 85 | 662,478 → 662,478 | 1403 → 1403 | 471 → **472** | 95 → 95 |
| dig slope / gold dome (20.5, 9.5) | 50 → 50 | 387,365 → 387,365 | 1405 → 1405 | 471 → **472** | 96 → 96 |
| south lanes (22.3, −16.2) | 58 → 58 | 546,335 → 546,335 | 1408 → 1408 | 471 → **472** | 96 → 96 |
| harbour (−12.0, −26.1) | 71 → 71 | 492,518 → 492,518 | 1409 → 1409 | 471 → **472** | 96 → 96 |

- One intermediate run gave 72 / 492,520 at the harbour: the same 2-triangle draw that comes and goes (below).
- The island's group is unchanged: 148 meshes, 65 materials, 236,926 triangles, 16.04 MB of vertex and index buffers,
  610 colliders.
- Build time of `isle_knartas`, alternating fresh pages in one browser: `?knartaspal=old` (the cliff tile) 10.4 s and
  12.7 s; the default (the granite) 10.9 s and 8.7 s. This is noise: the machine was shared. The granite is drawn once
  on a 512² canvas (160 blobs, 50 cracks, 2,600 flecks), a small part of that.

### The palette itself (with and without the old `?knartaspal=new` switch)

renderer.info for one frame, main and shadow passes. "Before" was the build with the switch off; "after" had it on.
Both runs used the same order of spots.

| Spot (island-local) | calls | triangles | geometries | textures | programs |
|---|---:|---:|---:|---:|---:|
| village square (22.6, 31.2) | 85 → 85 | 662,478 → 662,478 | 1403 → 1403 | 471 → 471 | 95 → 95 |
| dig slope / gold dome (20.5, 9.5) | 50 → 50 | 387,365 → 387,365 | 1405 → 1405 | 471 → 471 | 96 → 96 |
| south lanes (22.3, −16.2) | 58 → 58 | 546,335 → 546,335 | 1408 → 1408 | 471 → 471 | 96 → 96 |
| harbour (−12.0, −26.1) | 71 → 71* | 492,518 → 492,518* | 1409 → 1409 | 471 → 471 | 96 → 96 |

\* This is the final run. One earlier run with the switch on gave 72 / 492,520 at this spot: a 2-triangle draw that
comes and goes from run to run.

The island's group, measured when it is built: 148 meshes, 65 materials, 236,926 triangles, 16.04 MB of vertex and
index buffers, 610 colliders. All are the same with and without the switch.

Build time of `isle_knartas`, alternating fresh pages in one browser: off 11.4 s and 11.3 s, on 10.3 s and 11.6 s.
This is noise. Two earlier single runs on a busier machine gave 14.8 s off and 23.5 s on; the alternating run shows
that gap was load. The colour work per vertex is a little arithmetic and one 2-octave noise call, once at build time.

Nothing runs per frame, and nothing is added to the GPU: the same shader program, textures and geometry. The splat
weights do change in places:
- where tiles became earth, the shader reads the dirt tile instead of the paving tile;
- in the village square, a dirt read is added where there was grass;
- the rock area was the same (`BARE` unchanged). The granite moved its edge a little (see "A quieter rock").

renderer.info cannot see fragment cost, so the GPU cost of those reads is unmeasured, as is frame time on a real GPU.

**Switch off = as before** (then the default; now `?knartaspal=old`). Captures from before the change and from the final code with the switch off (same spots)
were compared pixel by pixel. They differ only in a box round Twinsen (his idle pose) and the "Search" prompt. The rock
boxes' means are identical: (89.4, 82.2, 78.9) and (77.2, 69.6, 75.8).

## Tests (each run once, SERVE=1)

- The quieter rock, at the default URL (the palette is now on by default): `tests/island-doors.mjs` with
  `REGIONS=isle_knartas`: **PASS 24/24, no errors** (all 20 Knartas doors walked to on foot and entered, the
  keepers' check, and save inside / Continue).
- Earlier, for the palette (with `QUERY=knartaspal=new`): **PASS 24/24, no errors**. All 20 Knartas doors were walked to
  on foot and entered; the keepers' check and the save-inside / Continue check also passed.
- Not run: the other island suites. Only Knartas's terrain colours, splat weights, rock tile and the rocks' instance
  colours change, so no collider, door, route or save is touched. Otringal reads the same `graniteTex()` as before.
- Untested:
  - `?knartaspal=old` only checked in the build A/B: it builds, and its terrain reads the cliff tile. It was not
    captured since this change;
  - `?knartas=old` together with the palette (the palette does not read the huts' switch);
  - the in-game map (mapdraw.js reads the terrain's vertex colours and splat weights). The palette now reaches every
    player by default;
  - chapter or lighting states other than the new game's;
  - any real GPU, and frame time.

## Captures

- `captures/knartas-pal/rock-sheet.png`: the quieter rock. It has before (the approved palette on the cliff tile) and
  after (the granite) pairs from the play camera (Far) at the south lanes, the dig slope and the village square.
- `captures/knartas-pal/sheet.png`: the palette itself. It has before (the old ground) and after (the palette) pairs
  from the play camera (Far) at four spots, plus one overview from a free camera.
- Both are automated runtime only (SwiftShader).
- Scripts, not committed: `<session scratchpad>/knartasrock/cap.mjs` (captures and renderer.info), `meas.py` (box
  statistics), `turf.py` (turf share), `texmean.mjs` (the tiles' linear means), `abbuild.mjs` (build-time A/B).

## Unresolved gaps toward 85 (estimates, not re-scored)

- **The rock's pattern** (done 26.11: Otringal's granite, above). Left open:
  - the steep faces read flatter than the cliff tile's carved facets did;
  - the granite's fine flecks show as a light speckle.
  If the faces want more carving, a lower-contrast variant of the cliff tile for the faces only is the next step. That
  would be a second texture read or a second tile, so it is not done here.
- **A lit lip.** Where turf meets a cliff, the vertex colour blends over one grid cell (1.7 m), so the turf's edge takes
  a little of the rock's colour. With the granite this is a neutral grey (0.76), no longer a lift. The yellower band at
  the dig slope is the grass tile's own dry patch, which was there before too.
- **The square's place.** The LBA2 top-down reference (R-TOP) is not in this checkout, so the square is placed on the
  open ground between the huts rather than on the original's footprint.
- **Moss on the rock.** LBA2's moss lies in patches on the rock. Ours is still turf in the old layout's places.
- **Twisted dead branches** and the refinery (KNARTAS-17.md) are still open.

## Questions for the user

1. The rock's lightness (~#a6a29a before light, kept from the approved palette), the earth's colour (~#9c6843) and how
   green the moss is: tune any of them?
2. Is the granite quiet enough, or should the steep faces keep more of a carved look (see the gaps above)?
3. Should the village square be bigger, or move to where you remember it?
