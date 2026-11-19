# CAVE-LOOK (P69): Tralu's cave reads as a cave

The user, playing (P69), about Tralu's cave on Citadel (the room behind the plateau's door): "inside, everything is
weird and not right". CAVE-STAIR fixed the defects inside it and left the look: "a rectangular box of one dark rubble
texture on floor, walls and terrace face, closer to a cellar than LBA2's cave".

Status: **Automated runtime only** (headless Chromium, SwiftShader; Twinsen placed in the room, the room's own play
camera; pictures looked at). Not played by a person; no frame times on real hardware.

## What was wrong (build 71132280, `before-*.jpg`)

- Floor, walls, terrace face, rims and the section all wore one cobble texture (`TEX.rubble`), self-lit (emissive 0.34)
  so the far walls, which face away from the room's sun, did not go black. Every surface read as a flat sheet of
  cobbles; the walls were straight boxes with a timber-style cap, a rail and a skirting: a cellar.
- The paved patches were rectangles of one repeated 3 × 3 tile texture: a checkerboard laid on the floor.
- The doorway was a timber door frame in a flat wall.

## What changed (src/game/tralucave.js; src/game/underground.js only exports its rock kit)

- **Walls**: `B.shell` replaced by the same bounds, floor collider and wall colliders, drawn as rock: a flat backing,
  and over it a faceted rock face (`rockFace`: a grid pushed out of the wall by layered noise and strata, each inner
  point jittered so every facet turns its own way), leaning out toward the top (the start of a vault) with an uneven
  crest, plus rock masses bedded in rough courses (the underground's `rockGeo`, as its `rockWallRun`). The crest's top
  surface is drawn with the floor's rock (the strata texture laid flat read as wood grain).
- **Terrace**: its front and east faces are a rough rock ledge, flush under the railing.
- **Shape**: rock masses in the far corners (a column up the terrace's back corner, the alcove behind the stair, where
  the terrace meets the left wall) and two buttresses (off the left wall between the terrace and the door, off the back
  wall beside the stair's head): the room's straight lines and box corners are gone. Stones and pebbles on the floor
  off the paths. The near rims are low rock with stones.
- **Doorway**: a short rock passage with a worn sill, dark at its end, rough stones for jambs and lintel (same spot,
  same exit and spawn).
- **Floor**: the underground's natural rock floor texture (the shaft's, shared), on a 0.75 m grid. The paved patches
  are flagstones: each its own 3.5 cm slab and tone, on a dark bed (joints), ragged where flags are gone.
- **Light**: `R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.6, hemi: 0.85 }` (ASYLUM-4's per-room key light): from
  the camera's side, high, so the facets of the far walls read; daylight fill dimmed. Baked into the vertex colours of
  the rock and the floor (multiplied into the texture): darker toward the far walls' foot and up toward the vault,
  broad tone patches on the floor, cyan pools round the five globe posts, the pool's glow on the floor round it, warm
  pools round the guard house's candles and lantern, the day's light at the door. The four room lamps are unchanged;
  on Low (two lamps, no shadows) the baked pools still show (`after-low-*`).
- The guard house's blocks and caps: less self-lit (emissive 0.30 → 0.14, 0.22 → 0.12), lit by the key light now.
- Unchanged: every existing collider, the door, exit, spawn, stair, railings, pool, guard house, props, lamps,
  `R.view`/`R.follow`, bounds. Added: 12 bricks (`noStand`), each a little inside the new rock: 0.3 m strips along the
  faces' feet, the corner masses, the buttresses.

## Cost (`node tests/cave-look.mjs`, Medium, 1280 × 720, SwiftShader; before = 71132280, after = 0f01ba73)

| | before | after |
|---|---|---|
| room meshes (after merging) | 26 | 24 |
| room triangles (static) | 45 168 | 54 792 (+9 624) |
| room colliders | 63 | 75 (+12 bricks) |
| room lamps (dynamic) | 4 | 4 |
| main-pass draw calls per frame, 7 spots | 17–19 | 17–19 |
| main-pass triangles per frame | 54 977–55 147 | 61 415–64 887 |
| shadow-pass draw calls (when redrawn) | 2–7 | 5–6 |
| shadow-pass triangles (when redrawn) | 13 265–63 205 | 53 343–59 578 |
| shader programs after entering | 161 | 162 (+1: the faceted rock's program, the one the underground rooms use) |
| room build, first entry (this machine) | 39–48 ms | 101–106 ms |
| textures | rubble 512², tiles 512² | + underground rock 256² and shaft floor 512² (shared with the underground), − the paving tiles 512²; net ≈ +0.26 MB before mips |
| shipped files | 508 | 508 |

The rock, the floor, the flags, the pebbles and the masses are one material each (2 draw calls, the flags in the
floor's). The bake runs once at build (~25–40 ms of the build here). The build is SwiftShader on a shared CPU: real
machines are faster; it happens once per session, on the first entry. No frame-time claim: GPU time on the GTX 1050
was not measured.

## Pictures (`captures/cave-look/`)

Pairs at the same spots, same camera, Medium: `before-*` / `after-*` for `arrive` (the spawn by the door),
`floor-mid`, `terrace`, `pool`, `stair-foot`, `guardhouse-door`, `front-left`; `after-low-*`: the same spots on Low.

## Tests

- `tests/cave-stair.mjs`: **21 passed**, VERDICT PASS (on 0f01ba73's colliders).
- `tests/cave-look.mjs`: PASS; walks (P.go, held keys) from the door to the stair's foot, along the left wall past the
  buttress, the alcove behind the stair, inside the guard house, before the pool, the front right corner: all arrived.

## What remains

- Not played by a person; the look is judged from automated pictures only.
- The floor's texture is the underground's (dark blotches, slab seams): it reads as rock, a little busy and dark.
- The guard house's blocks read olive-grey under the new key light.
- No ceiling or hanging rock: the cut-away leaves the top open (stalactites on the overhang were tried and read as
  white specks from the camera; removed).
- The key light is the room's "sun": a storm or the night cycle dims it as for every room (unchanged behaviour).
- tests/overlaps.mjs (z-fighting) was not run over the room; the faces are offset from the backing by construction
  (the face at ≥ 4 cm, the crest's lip 1 cm over the terrace floor).
