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
