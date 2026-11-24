# ROCKS-MASONRY — P121's masonry rule for every area (the 19 rocks left in built parts)

Task (the coordinator, 24.11): P121 left 19 rocks inside built parts (c3gallery 9, c3shaft 6, c3core 2, isle_undergas 2).
Fix the cause so P121's rule covers these places too, game-wide; keep the user's P121 choices (one outcrop, settled
rocks everywhere, `?rocks=old`); move, settle or remove rocks, never leave them floating or sunk; keep paths, doors,
puzzle spots and pickups free; before/after pictures; run P121's check once.

Base: `origin/ccr-c1c2c4b9-dep6ed` at 93a99d19. Commits a3f9b81d (the pass), b77e50e4 (the bore cluster), and the
pictures, the picture tool and this report.
Evidence: **Automated runtime only** (SwiftShader, headless Chromium, served by `python3 -m http.server` from the
worktree, a shared machine at load 6–13). Nobody played it; no real GPU.

## What the 19 were (probe: which builder line made each part; `tests/overlap-sweep.mjs` ONLY run before the fix)

| Area | Rock (where it comes from) | Cut by | Kind |
|---|---|---|---|
| c3shaft | the boulder at the east rim (underground.js "the rock: outcrops", 1.0 × 1.3 m) | the crate stack beside it (`crateStack`), 0.8 m in | a body cuts it (2 findings) |
| c3shaft | the boulder at the near rim, west (1.3 m) | the cable drum (`drum`), 0.6 m in | a body |
| c3shaft | the dark rock under the bore's west crystal cluster | the bore's teal base (lathe), 0.4 m in | a body |
| c3shaft | two pebbles (`pebbles`) | a cargo crate; a laid steel plate | a body |
| c3gallery | two cliff boulders of the east chasm edge (`cliff`) | the fallen bridge's deck and rails, its iron anchor plate, the shelf floor | a body (4 findings) |
| c3gallery | a cliff boulder behind the survey mirror | the mirror's iron bar and brass panel (CAMPAIGN-9's bank shot) | a body |
| c3gallery | cliff boulders on both chasm edges, the back wall's boulders over the east shelf | the shelf's floor: their tops pushed 6–35 cm up through it | through a floor from below (3) |
| c3gallery | the niche rock of the arsenal's nook (story/arsenal.js) | the nook's stone sill, 8 cm | **by design**: a sill set in a niche cut in the rock |
| c3core | the near rim's last boulder by the old arch to Sendell's chamber | the arch's ashlar slab, 1.0 m in | a body |
| c3core | a boulder of the far heap | the low cable duct's hazard cap | a body |
| isle_undergas | two rocks of the old Wannie mine's mound (story/arsenal.js) | the mouth's dark inside (a black box) | **by design**: the mine's darkness inside its rocks |

The cause: the caves' rock runs and scatters (`caveShell`'s rims, `rockWallRun`, `cliff`, `pebbles`, the outcrops) are
laid first and the machines, crates, decks, the bridge, the mirror and the arch after them; nothing checked one against
the other. P121's own masonry pass (`world.js rocksOutOfMasonry`) only covers Citadel's cliff rocks, against box
colliders; its room pass (`settleRockRanges`) only looks at rock against rock.

## The fix (game-wide)

- `src/game/rocksettle.js rocksOutOfBuilt(root)`, run by `regions.js finish` for **every area and room when it is
  built** (all 144 the sweep knows, and any added later):
  - Every rock of the area's merged meshes (`rockRanges`, kit.js / props.js) is measured against the area's built parts
    on vertical rays every 10 cm. Each part is one merged piece (`userData.parts` / `partVerts`, now recorded by
    kit.js `mergeGeos` and props.js `mergeEntries`: one closed piece each) or a mesh of its own.
  - A part counts when it is not rock-look (the sweep's rule: another texture, or another colour without one: a cave's
    own wall, lintel and rim never count), not slender (its corners spread less than 0.32 m across the ground: a post,
    an I-beam, a rail, a pipe, a cable — fixed into the rock, as the shaft's beams in its walls), and not marked as the
    rock's company (`material.userData.rockSet`, below).
  - A rock such a part cuts by more than 4 cm on 3 rays or more, above the lowest 35 % of the rock (a rock bedded in a
    floor is as one in the ground, P121's rule), is **lowered** under it when every cut comes from above (a floor it
    pushes up through) and half its height at most clears it without the part then covering the whole rock; otherwise
    it is **left out** (its triangles collapse, as P121's rock pairs), and its own collider (centred within 30 cm of it,
    no wider and no higher) goes with it, so no invisible obstacle stays. A neighbour's collider (the drum's, the
    crates') is kept: checked on the two boulders, see Walkability.
  - Lowered rocks are settled again with their mesh's rocks (`settleRockRanges`). `?rocks=old` turns the pass off, as
    P121's passes. No random draw changes; nothing else moves.
- `rockSet` (rock's company, not masonry) on: the underground's crystals (`crystalMat`, the pillars' bodies and hearts),
  Tralu's cave rock floor and rim caps (`caveFloor`, `capM`), and in story/arsenal.js the nook's hollow and sill and the
  mine mouth's dark inside (their own copies of the material: the shared ones are not touched). The sweep honours the
  same mark (tests/lib/sweep.js keeps it on each part; overlap-sweep.mjs (g) passes such a part over). These are the
  parts the sweep already listed as known by design (P121: Tralu's rims, the gallery's crystals, the shaft's crystal,
  looked at) plus the arsenal's three.
- One placement at its cause: the bore's west crystal cluster stands 45 cm further from the bore (underground.js), so
  its rock is no longer in the bore's base and keeps its rock (the pass had left the rock out, the crystals bare).

## What it did (the pass's own log, `R.rocksMasonry`, automated)

| Area | Rocks measured | Lowered | Left out | Colliders off | Notes |
|---|---|---|---|---|---|
| c3shaft | 134 | 0 | 7 (8 before the bore cluster moved) | 2 | the two rim boulders (crates, drum), 5 pebbles under plates and crates |
| c3gallery | 205 | 6 | 3 | 0 | lowered: 2 chasm boulders under the west shelf's lip (22 cm, 9 cm), 4 back-wall boulders under the shelves (27–35 cm); left out: 2 at the fallen bridge, 1 behind the mirror |
| c3core | 34 | 0 | 4 | 0 | the boulder in the arch; 3 of the far heap in the two cable ducts (the sweep had flagged one; the other two are cut less, under its ray count) |
| c3deep, Tralu's cave, every other area | — | 0 | 0 | 0 | areas without merged rocks return at once |

Walkability (automated, physics query at each changed rock's centre after the pass): the two rim boulders' own
cylinders are off and nothing else stands there (the drum's and the crate stack's colliders kept); at the rest only the
expected solids remain (the crystal cluster's, a crate's, the gallery's back wall, the core's ring). No path, door,
exit, puzzle spot or pickup is in or next to a changed rock: the mirror (its collider and reflection data unchanged),
the stepping stones, the pillars, the exits and the nooks' pickups are untouched.

Cost: the pass runs once per area build, inside the build's finish (after its last step). Measured here on the final
code, a shared cloud machine at load 7–8 (CPU only; SwiftShader plays no part in it): c3shaft 164 ms, c3gallery 129,
c3core 80, c3deep 61, Tralu's cave 22 (`R.rocksMasonry.ms`); 456 ms for the whole underground group. Areas without
merged rocks return at once. Not measured on a real machine. No per-frame cost. If the caves' loading is ever judged slow, this is one place to look (the parts' collection is about
half of it).

## P121's check, every region, before and after (`tests/overlap-sweep.mjs`, the one suite run)

| | f rock in rock | g rock through masonry | c floating/sunk | verdict |
|---|---|---|---|---|
| before (P121's final run, 144 areas; reproduced on the 4 areas here: 19 open, same spots) | 0 | **19 open** / 88 known | 0 open | FAIL (1 visual) |
| after (full run, 144 areas, `sweep-after`) | 0 | **0 open** / 1 known (Citadel's pipeline post) | 0 open | **PASS** (7/7 visual, 1/1 functional) |

- The known (g) count fell because the parts now marked `rockSet` are no longer counted at all: 87 of P121's known
  entries (Tralu's rims 44, the gallery's crystals 42 by part, the shaft's crystal 1) plus the arsenal's 4 overlaps
  (the gallery nook's hollow and sill, the mine mouth's 2). None of them was moved; they are the same overlaps,
  declared by design in the source instead of in the test's list.
- Categories a–e: 0 open, as before.

## Visible changes (for the user's pick, P107) — `captures/rocks-masonry/<place>-before.jpg` / `-after.jpg`

Each picture is the room camera's own angle, brought nearer to the spot (the bridge and the mirror turned 90° and 60°
to face the east cliff, which the room camera does not see), 960×540, dpr 1. Before = `?rocks=old` (the pass off);
`tools/rocks-masonry-shots.mjs before|after [names]` makes them. The bore's before picture was taken on the base,
before the cluster moved (the tool cannot show the old placement any more). Looked at by me in the pictures only.

1. **c3shaft-crate**: the boulder that stood half inside the crate stack at the east rim is gone.
2. **c3shaft-drum**: the boulder that swallowed the cable drum at the near rim is gone; the drum stands free.
3. **c3shaft-bore**: the crystal cluster at the bore's west foot stands 45 cm further from the bore, with its dark rock
   (before, the rock ran into the bore's base).
4. **c3gallery-bridge**: the two cliff boulders the fallen bridge hung through are gone (the bridge's iron anchor plate
   no longer sits on a rock top).
5. **c3gallery-mirror**: the cliff boulder whose top covered the survey mirror's foot is gone; the mirror shows whole
   (the mirror, its collider and the bank shot unchanged).
6. **c3gallery-west-lip**: two chasm boulders no longer push up through the west shelf's floor at the lip (lowered 22
   and 9 cm). Hardly visible from the room camera: the pair of pictures is near identical.
7. **c3gallery-back-wall**: four back-wall boulders no longer poke up through the shelves' floors (lowered 27–35 cm).
   Hardly visible from the room camera as well.
8. **c3core-arch**: the near rim's last boulder, which stood 1 m inside the old arch to Sendell's chamber, is gone.
9. **c3core-duct**: the far heap's boulders in the two cable ducts are gone (3); from the room camera only the duct's
   hazard cap shows clear where a rock hump was.
- Also, too small to show: 5 pebbles under plates and crates in the shaft.
- Not changed: the arsenal's gallery nook and the Under Celebration mine mouth (marked by design, no geometry change).

Recommended: keep all. Alternative per place: `?rocks=old` is the old look (it turns off this pass and P121's).

## Region coverage (automated runtime)

| Region | What ran | Result |
|---|---|---|
| Chapter 3 caves (c3shaft, c3deep, c3gallery, c3sendell, c3core) | sweep (all categories), the pass's log, walkability query, pictures | g 17 → 0 open; f, c 0 |
| Tralu's cave | sweep, the pass's log | 0 rocks changed; rims as the user kept them |
| Under Celebration and the other isles | sweep | g 2 → 0 open (by-design mark); no geometry change |
| Citadel, its interiors, sewers, Zeelich, desert, Hamalayi, Ballastra, the rooms (144 areas) | sweep | 0 open in every category; P121's Citadel passes untouched |

Not covered by the pass (stated plainly): instanced scatter rocks (Citadel's, Zeelich's, the isles', the Hamalayi's)
and rocks the story adds after an area is built (story/arsenal.js, kit2b.js). The sweep checks both and found none cut.

## Reproduce
- The check: `cd lba3 && python3 -m http.server 8177`, then `BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8177/ node
  tests/overlap-sweep.mjs` (all 144 areas; `ONLY=c3gallery,c3shaft,c3core,isle_undergas` for the four).
- What the pass did in a room: `game.regions.ensure('c3shaft'); game.rooms.c3gallery.rocksMasonry` (rocks measured,
  lowered, left out, the colliders it turned off, ms, and each action with the parts that cut the rock).
- The pictures: `node tools/rocks-masonry-shots.mjs before` and `... after` (GAME_URL as above).

## Handover / open
- The pass's cost on a real machine is unmeasured (here only on a loaded cloud machine).
- The coordinator may update status.md's P121 row ("Open: 19 rock-through-masonry findings"): 0 open after this.
- The gallery's lowered back-wall boulders sit lower behind the shelves; looked at in the pictures only.
- `?rocks=old` in rooms still runs P121's `settleRockRanges` (as before this change); only this pass and Citadel's
  passes switch off.
