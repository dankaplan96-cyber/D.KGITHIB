# TECH-ART-1: the Zeelich landing, one view improved and one runtime waste removed

Cloud technical artist, 13.11.2026. Every runtime result here is **Automated runtime only**: headless Chromium on
SwiftShader, a software renderer. There are no frame-rate claims, only counts.

## Base

- Base revision: `a469743ed25ddd010e368bb7273f99a5ea01c86c` (branch `ccr-c1c2c4b9-dep6ed`).
- Work branch: the worktree branch `worktree-agent-af3b7280f3bf21fcc`.

## Where "the Chapter 3 Zeelich landing" really is

- Chapter 3 begins on Zeelich. `story.nextChapter()` sets him down on the **Zeelich Spaceport** deck (`travel.js` ZPORT,
  `Z.spaceport.landing`, world (2396, 6, 36.8), facing north). He does not land at the ferry pier `R.dock` (2342.4, 1.3).
  The objective reads "Find Baldino's workshop".
- His route: deck → footbridge (local x −4, z 33→26) → the gravel path between the Cistern Rise and the south mill →
  the street. The workshop is the house at local (−12, 12.2) with `ry` π. Its door is on the **north** face, toward the
  street, at world (2389.5, 8.35).
- Capture conditions (`tests/techart-zeelich.mjs`):
  - Chapter 3, set by its flags as `zeelich-doors.mjs` does.
  - Quality Medium, chosen by hand (Auto off). Camera Follow at Medium distance. Visual setting 2026, MSAA.
  - Pixel ratio 1, 1366×768.
  - Renderer: ANGLE on SwiftShader (Vulkan 1.3.0, SwiftShader Device (Subzero)).
  - Each view: the hero placed on a fixed spot, the camera snapped, then 60 settled frames.
- Pictures: `captures/tech-art-1/base/x-*.jpg`. These are chapter-3 spoilers, for the team only.

## The two most visible faults (evidence)

Comparison points come from `docs/LBA2_VISUAL_NOTES.md` (Zeelich: lavender-grey paving with lighter borders, teal
railings, blue-tile walls) and `resemblance-zeelich.md` (the terminal island's street scored 69, with "every house a box
with a cap"). I invent no other reference detail.

**F1. From the arrival route, the workshop looks like it has a door where it has none.**
- The route meets the workshop's back (south) face, never its front.
- The largest feature on that face is Baldino's ribbed patch (ZSTYLE-2), 3.4 × 2.05 m. It renders near-black: mean
  linear luminance **0.007**, against **0.067** for the plaster beside it (`x-route.jpg`, hero at local (−4, 17)). The
  cause is its half-metal material (metalness 0.45) in a scene with no environment reflections.
- A dark rectangle that size reads as an open doorway.
- The real door is round the corner, on the street face. Nothing on the faces the route sees says "workshop": the gear
  sign and the brass round window are both on the street face.
- At the footbridge's island end (`x-bridge.jpg`), the south mill's drum and the Cistern Rise fill the view.

**F2. The door's outline dissolves into the wall.**
- The arch's frame ring is the same glass-block material as the foot band that runs along the whole wall. Measured in
  `x-door.jpg`: luminance **0.090** for the frame against **0.094** for the band, so below the springing the frame
  cannot be told from the band.
- The opening's reveal is the pale plaster of the wall panel. There is no lintel or head to mark the top.
- At street distance, each door is a dark blob with no edge.
- The same builder (`esmerHouse` in `zeelich.js`) makes all five street doors.

Not chosen: the character. Twinsen and the residents read at Follow distance. That is the character artist's area, and
the custom head shader (the 18–21 "own shader code" draws per view) is theirs as well.

## The art change (commit `1ca971f0`; `src/game/zeelich.js` only)

One complete view: the workshop as the way from the spaceport meets it, and its entrance.

1. **The doors on Zeelich's street.** All five houses share `esmerHouse`, and each door gets three changes:
   - **A dark reveal.** `revealGeo` is a U band lining the jambs and the arch soffit, from the leaf out to the ring, in
     shadow-dark stone (`#463c36`).
   - **A keystone over the crown.** It uses the plinth's stone.
   - **On Baldino's door, a stone lintel as the alfiz's head.** It stands 0.2 m proud of the wall and puts a shadow
     line over the arch.

   Everything uses the plinth's stone map, so drawbatch folds it into the stone draw that is already there.
2. **The workshop's arch ring is brass.** Brass is the material of Baldino's round window and his observatory dome, so
   the door ties to the owner's other marks. Its olive leaf already matches his smock (`#67734b`). The other four houses
   keep LBA2's glass-block ring (ZSTYLE-1), now edged by the dark reveal.
3. **His ribbed patch is now a painted galvanised grey:** metalness 0.45 → 0.12, roughness 0.48 → 0.62, colour
   `#b8c0bc` → `#c4ccc8`. It no longer draws as a black hole: luminance 0.007 → 0.020 on the shaded back face, and its
   ribs read.
4. **His board on the east wall,** square to the gravel path that the spaceport's way comes up:
   - The cog-and-spanner of his hanging sign (the same face material), on brass.
   - Under it, a gold arrow pointing north, round the corner to the street door.
   - It sits flat on the wall, between the window and the back corner's pier, inside his collider. Nothing new to bump
     into, and no collider changes.
   - No text, so there is nothing to translate.

No position, collider, door trigger, prompt, wall cutaway or camera shape changed. PLACE-2's places are kept.
`R.workshopMarks` is new: the world spots of the hanging sign and the east board, read by
`tests/techart-zeelich.mjs` only.

### Measured on the same route (Automated runtime only)

Conditions: `tests/techart-zeelich.mjs`, 1366×768, Medium by hand, Follow at Medium, chapter 3 by flags, a fixed hero
spot per view, the camera snapped, 60 settled frames. Run on the base (`/dev/shm/t930base`), on the art-only commit,
and on the final candidate.

| | base | art only | final |
|---|---|---|---|
| Workshop mark first seen on the walk from the landing (raycast from the Follow lens) | door and hanging sign at **17.2 s**, after he turned to the door 2.1 m from it | **east board at 2.7 s**, 24.1 m from the door, 25 m from the lens; door and sign at 17.2 s | the same as art only |
| Walk by input from the landing to the door | 16.1 s, arrived | 16.1 s, arrived | 16.1 s, arrived |
| Three visits in and out of the workshop | in, out, 2.47 m from the door | the same | the same |
| Door view: arch ring against the foot band (luminance) | 0.090 against 0.094 (no edge) | brass 0.026 against 0.094 | the same |
| Draws per view (main + shadow): dock / bridge / street / door / back / resident | 132 / 165 / 188 / 145 / 114 / 152 | 132 / 166 / 191 / 146 / 114 / 152 | 132 / 166 / 189 / 146 / 114 / 152 |
| Main-pass triangles per view: door / street | 260,381 / 378,212 | 261,907 / 379,818 | 261,907 / 379,738 |
| Textures, shader programs | 414, 169 | 414, 169 | 414, 169 |

Cost of the art: about +1 draw in views that hold the workshop (the board's face) and about +1.5k triangles in each
view (reveal bands, keystones, lintel, board, arrow). No new texture or program.

Pictures (team only, chapter 3):
- `captures/tech-art-1/base/`, `art-only/` and `final/`, all `x-*.jpg`.
- Side by side: `x-door-compare.jpg`, `x-route-compare.jpg`, `x-resident-compare.jpg`, `x-street-compare.jpg`.

## The waste fix (commit `d91a3b80`; `src/game/walkers.js`)

**What was wasted.**
- The town's residents pick things up on their rounds: a basket, a crate, a can, a case, a sack (`walkers.js` CARRY).
- Every pick-up ran the kind's builder, which created new `CylinderGeometry`, `TorusGeometry`, `BoxGeometry` and
  `SphereGeometry` objects.
- The old prop was only removed from the hand, never disposed. Each pick-up was a fresh set of GPU buffers that stayed
  allocated for the session.
- The materials were already cached (`rig.js` `mat()`), so only the geometry was wasted.

**The fix.**
- Each kind's group is built once, as a module-owned template (`CARRY_T`).
- A carrier gets `template.clone()`. Object3D.clone shares the geometry and the materials; the carrier owns only its
  clone's transform.
- Nothing disposes a template, and nothing edits one. `placeCarry` moves the clone only.
- This is the smallest fix: two lines of logic, and no new pipeline.

**Measured counters (Automated runtime only; `tests/techart-zeelich.mjs`, the same run as above).**

| Counter | base | final |
|---|---|---|
| Carried-prop geometries created over the whole run (boot, chapter 3, six views, the walk, three visits, 120 s on the street) | **26** | **3** (the first build of one kind) |
| The same, during 120 s of street life by the plaza | **10** | **0** |
| `renderer.info.memory.geometries` growth over those 120 s | **+3** | **0** |
| Live geometries after the resident view | 1363 | 1357 |
| Probe `leak.mjs`, 180 s on the Zeelich street: geometries created / live growth | 20 / +20 | 0 (see the note under "Risks") |
| Probe `leak.mjs`, 180 s on Citadel's square (new game): carried-prop geometries | 7 | 3 (the can's template, once) |

**Estimates derived from the source, not measured.**
- A pick-up made 2–5 geometries of 24–343 vertices (about 1–15 KB each with normals and UVs), so about 3 GPU buffers
  each.
- At the measured Zeelich rate, about 6.7 geometries a minute, an hour of town life would have left about 400
  geometries and about 1,200 buffers behind.
- The fix makes this zero after the first pick-up of each kind.
- This counts allocations and buffers. It is not a frame-time claim.

**Hypotheses examined and dropped.**
- **Duplicate materials keeping the batcher from grouping props.** `zeelich.js` and `kit.js` keep two caches, so the
  same brass exists twice. But drawbatch folds plain and texture-only materials by their map, so both copies already
  draw together. No draw to save.
- **Workshop re-entry rebuilding batches.** The first visit builds its drawbatch and shadowcull cells (31 geometries,
  20 materials). Visits two and three build none.
- **Per-frame allocation on the street.** None, standing or walking.
- **The three dogs' identical part geometries** (about 400 KB of duplicate vertex data). Real but bounded, built once
  at region build. Left as a follow-up.

## Where else it applies

- **The waste fix** is in the shared resident system (`Walkers`), so it holds wherever residents carry things: Citadel,
  Desert Island, the Hamalayi, Zeelich's isles and the interiors with rounds. Spot-checked on Citadel's square: 7
  carried-prop geometries in 180 s on the base, 3 on the candidate (the can, built once). `townlife`, `walkers`,
  `interior-life` and `cast-rounds` are in the suite list below.
- **The art change** covers all five doors of Zeelich's street, which share the builder. It does not extend to
  `props-esmer.js` `esmerBuilding` (Zeelich's isles and the terminal's pavilion). Those doors have no glass-block foot
  band, so F2's cause is absent there, and a bulk change across the isles would need its own captures.

## Notes as I go (crash log)

- 13.11: reset to base, doc started.
- Baseline captures and counts were taken. Census and allocation probes:
  - Zeelich group: 751 meshes, 643 unique geometries (69 MB of vertex data: 39 MB drawBatch, 20 MB batched originals,
    10 MB drawn), 290 materials.
  - Standing or walking on the street: 0 allocations per frame.
  - First workshop visit: drawbatch and shadowcull build their cells (31 geometries, 20 materials). Later visits build
    nothing.
  - **Walkers' carried props allocate new geometry on every pick-up and never free it.** On the Zeelich street, 180 s
    added 20 geometries and grew `renderer.info.memory.geometries` by +20. In the three-visit route, each exit added
    +3 (`walkers.js` CARRY).
- Art commit `1ca971f0` (`zeelich.js` only). Waste fix written in `walkers.js` (`carryOf`) but not yet committed.
- Base snapshot at `/dev/shm/t930base` (port 8931); candidate at `/dev/shm/t930` (port 8930).
- Added to the harness: the first time a workshop mark is seen on the walk (raycast) and the carried-prop geometry
  counter.
