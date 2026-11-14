# TECH-ART-1: the Zeelich landing, one view improved and one runtime waste removed

Cloud technical artist, 13.11.2026 (stopped mid-way to save tokens, kept as a patch series), finished 14.11.2026.
Every runtime result here is **Automated runtime only**: headless Chromium on SwiftShader, a software renderer. There
are no frame-rate claims, only counts. The frame-time measurement on real hardware is handed to the local performance agent
(`tools/testlab/CLOUD_ORDERS.md` order 42, on the Vega 8 laptop).

## Base

- Started 13.11 on `a469743ed25ddd010e368bb7273f99a5ea01c86c` (branch `ccr-c1c2c4b9-dep6ed`).
- Re-applied 14.11 (the seven patches of `tools/testlab/wip-2026-11-13/tech-art-1/`, no conflict) on
  `b38d29e4` ("Desktop requests applied: HOSTEL-CUT, HOSTEL-STEP, PERF-OWP-SPRITES"), the tip of
  `ccr-c1c2c4b9-dep6ed` that day. Every 14.11 number below is measured against `b38d29e4` itself.
- Commits, in order: `8cbba4f8` doc, `c8d7376d` harness and baseline, `548e0947` art, `20be3177` harness counts the
  marks and carried props, `b73fcca7` waste fix, `8018ea41` captures, `81b7d147` waste fix refined (copy by hand), then
  the 14.11 finishing commits (counters, suites, captures pruned, the Vega 8 order).

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

## The art change (commit `548e0947`; `src/game/zeelich.js` only)

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

### Measured on the same route, 13.11 (Automated runtime only)

The 14.11 re-run on the new base, with the material counts, is under "Final counters" below; it agrees with this table.

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

Pictures (team only, chapter 3): see "Captures" below.

## The waste fix (commits `b73fcca7` and `81b7d147`; `src/game/walkers.js`)

**What was wasted.**
- The town's residents pick things up on their rounds: a basket, a crate, a can, a case, a sack (`walkers.js` CARRY).
- Every pick-up ran the kind's builder, which created new `CylinderGeometry`, `TorusGeometry`, `BoxGeometry` and
  `SphereGeometry` objects.
- The old prop was only removed from the hand, never disposed. Each pick-up was a fresh set of GPU buffers that stayed
  allocated for the session.
- The materials were already cached (`rig.js` `mat()`), so only the geometry was wasted.

**The fix.**
- Each kind's group is built once, as a module-owned template (`CARRY_T`).
- A carrier gets a copy made by `share()`: a new Mesh or Group per node that points at the template's geometry and
  (cached) material, with the node's transform, shadow flags and visibility. The carrier owns only its copy's
  transforms.
- First version (`b73fcca7`) used `template.clone()`. That shares geometry and materials too, but three's
  `Mesh.clone` runs `new Mesh()` first, which makes a default `BufferGeometry` and `MeshBasicMaterial` per mesh only to
  replace them: a throwaway pair per part on every pick-up. `81b7d147` copies by hand instead, and the harness counts
  materials made from `walkers.js` code as well.
- Nothing disposes a template, and nothing edits one. `placeCarry` moves the clone only.
- This is the smallest fix: two lines of logic, and no new pipeline.

**Measured counters (Automated runtime only; `tests/techart-zeelich.mjs`, the same run as above).**

| Counter | base | final |
|---|---|---|
| Carried-prop geometries created over the whole run (boot, chapter 3, six views, the walk, three visits, 120 s on the street) | **26** | **3** (the first build of one kind) |
| The same, during 120 s of street life by the plaza | **10** | **0** |
| `renderer.info.memory.geometries` growth over those 120 s | **+3** | **0** |
| Live geometries after the resident view | 1363 | 1357 |
| Ad hoc probe (13.11, not committed), 180 s on the Zeelich street: geometries created / live growth | 20 / +20 | 0 / 0 |
| The same probe, 180 s on Citadel's square (new game): carried-prop geometries | 7 | 3 (the can's template, once) |

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
  carried-prop geometries in 180 s on the base, 3 on the candidate (the can, built once). `walkers`, `residents` and
  `cast-rounds` are in the suite list below; `townlife`, `interior-life` and `desert-life` were not run (left).
- **The art change** covers all five doors of Zeelich's street, which share the builder. It does not extend to
  `props-esmer.js` `esmerBuilding` (Zeelich's isles and the terminal's pavilion). Those doors have no glass-block foot
  band, so F2's cause is absent there, and a bulk change across the isles would need its own captures.

## Final counters, 14.11 (Automated runtime only)

**Conditions.**
- Both sides were measured on the same machine, back to back, with the same harness (`tests/techart-zeelich.mjs` as
  committed, copied into the base's snapshot).
- Base: `b38d29e4`, served from `/dev/shm/t960base`. Final: this branch's tip, served from `/dev/shm/t960`.
- 1366×768, pixel ratio 1, Quality Medium chosen by hand (Auto off), Follow at Medium, Visual 2026, MSAA. Chapter 3 by
  its flags. Fixed hero spot per view, the camera snapped, 60 settled frames, then one counted frame.
- Renderer: ANGLE on SwiftShader (Vulkan 1.3.0, SwiftShader Device (Subzero)). This is a software renderer: these are
  counts, with no frame-time claim. Another worker shared the 4-core machine. That changes times, not counts.
- Counters:
  - Draws and triangles come from `renderBufferDirect` over one rendered frame.
  - Geometries, textures and programs come from three's `renderer.info`: live on the GPU, cumulative over the run.
  - Materials: three keeps no count. "Scene" is the unique materials on every mesh in the scene graph. "Drawn" is
    those the main pass used in the counted frame.

| View | Draws (main + shadow), base → final | Main-pass triangles, base → final | Live geometries, base → final | Materials, scene / drawn, base → final | Textures | Programs |
|---|---|---|---|---|---|---|
| dock (the spaceport deck) | 132 (113 + 19) → 132 (113 + 19) | 350,119 → 351,643 | 1236 → 1236 | 1245 / 52 → 1246 / 52 | 402 → 402 | 168 → 168 |
| bridge (its island end) | 165 (136 + 29) → 166 (137 + 29) | 325,710 → 327,236 | 1309 → 1310 | 1245 / 68 → 1246 / 68 | 409 → 409 | 169 → 169 |
| street (by the workshop) | 190 (163 + 27) → 190 (163 + 27) | 378,292 → 379,802 | 1332 → 1329 | 1245 / 74 → 1246 / 74 | 410 → 410 | 169 → 169 |
| door (3 m from the workshop's) | 145 (119 + 26) → 146 (120 + 26) | 260,381 → 261,907 | 1361 → 1355 | 1245 / 56 → 1246 / 56 | 414 → 414 | 169 → 169 |
| back (the street's south side) | 114 (85 + 29) → 114 (85 + 29) | 239,846 → 241,370 | 1362 → 1356 | 1245 / 46 → 1246 / 46 | 414 → 414 | 169 → 169 |
| resident (beside ztri2) | 152 (129 + 23) → 152 (129 + 23) | 358,992 → 360,516 | 1363 → 1357 | 1245 / 57 → 1246 / 57 | 414 → 414 | 169 → 169 |

| Whole run (boot, chapter 3, six views, the walk, three visits, 120 s of street life) | base | final |
|---|---|---|
| Carried-prop geometries created | **26** (of 3023 geometries created in all) | **3** (of 3013): the first build of each kind |
| Materials created from `walkers.js` code | 4 | 2 |
| 120 s of street life by the plaza: geometries created / carried-prop ones / growth of live geometries | 10 / 10 / **+3** | 0 / 0 / **0** |
| Workshop mark first seen on the walk from the landing | door and hanging sign at 17.2 s, 2.1 m from the door | **east board at 2.7 s**, 24.1 m from the door; door and sign at 17.2 s |
| Walk from the landing to the door; three visits in and out | 16.1 s, arrived; in, out, 2.47 m from the door ×3 | the same |

**Reading.**
- **The art costs +1,510 to +1,526 main-pass triangles per view** (reveal bands, keystones, lintel, board, arrow). It
  costs **+1 draw** in the views that hold the workshop's east board or door (bridge, door), and **+1 material** in
  the scene graph; the materials the main pass draws per view are unchanged. No new texture or shader program.
- **Live geometries are lower on the final from the street view on** (−3 to −6), although the art adds geometry. This
  is the carried props no longer piling up.
- **The 13.11 run** gave street 188 → 189 draws. This run gives 190 → 190. The street view's count moves by ±2 with
  where the residents happen to stand when the frame is counted. It is not a change.

## Captures

Team only (chapter 3). All from `tests/techart-zeelich.mjs` (`SHOTS=dir`) under the conditions above, except the
route pair (13.11, the same conditions, hero at local (−4, 17) on the gravel path, facing the workshop's back).

| | base (`captures/tech-art-1/base/`) | final (`captures/tech-art-1/final/`) | side by side (13.11) |
|---|---|---|---|
| The workshop door at 3 m | `x-door.jpg` | `x-door.jpg` | `x-door-compare.jpg` |
| The route from the spaceport, the workshop's back and east wall | `x-route.jpg` | `x-route.jpg` | `x-route-compare.jpg` |
| The street at the workshop, from the west | `x-street.jpg` | `x-street.jpg` | `x-street-compare.jpg` |
| Twinsen beside a resident | `x-resident.jpg` | `x-resident.jpg` | `x-resident-compare.jpg` |

To keep the folder under 2 MB, the other views (dock, bridge, back, overview, route-east) and the art-only set were
taken out of the tree on 14.11. They are still in commit `8018ea41`.

## Verified, 14.11 (Automated runtime only)

All on the snapshot `/dev/shm/t960` (this branch), one suite at a time, `BOOT_TIMEOUT=900000`, SwiftShader. Another
worker shared the machine.

| Suite | Result on this branch | Time | Note |
|---|---|---|---|
| `techart-zeelich` (the harness) | PASS, 3 + 1 checks | about 11 min | Run three times: the counters, captures, and a LIVE smoke run with the `HELD` check |
| `place-scan` | PASS, 3 / 3 | 155 s | |
| `zeelich-life` | PASS, 40 / 40 | 1380 s | |
| `zeelich-doors` | PASS, 22 / 22 | 523 s | |
| `zislands` | **PASS, 13 / 13** | 695 s | See below |
| `island-doors` | PASS, 89 / 89 | 661 s | |
| `walkers` | PASS, 37 / 37 | 171 s | |
| `chapter1` | PASS, 32 / 32 | 343 s | |
| `residents` | **no verdict** ×5: the harness timed out (30 s) taking a screenshot. **PASS, 182 / 182** with only that timeout raised | 117–486 s | The base fails the same way under the same load. See below |
| `cast-rounds` | PASS, 221 / 221 | 481 s | |
| `world-consistency` | PASS, 37 / 37 | 191 s | |
| `containers` | **PASS, 41 / 41**, twice | 420–540 s | The first try hung; see below |

**Carried props in the hand.** The harness now checks, after the street life, that every carrier holds a drawable
prop in its hand (`HELD` line). `walkers` covers carrying in play.

**Not changed:** colliders, door triggers, prompts, interaction ranges, camera shapes, save positions, quest objects.
No player text was added (the board has no words). No LBA1 or LBA2 asset was added.

## zislands and containers (the earlier run's failures)

An earlier run of this work (13.11) reported **zislands FAIL** (no verdict printed, one FAIL captured) and
**containers timed out** (exit 124 at 3600 s). Its logs were not kept. On 14.11 they were run again on this branch and,
where needed, on the base `b38d29e4`, on the same machine.

**zislands: not reproduced; no fault found in these patches.**
- On this branch it passes 13 / 13 at the first try (695 s), with every island, the shuttles, the edges, the trap
  audit, the new places, and save and Continue on Celebration.
- The suite touches the patches in one place only: Zeelich's residents walk past the shuttle pad. The test already
  waits for one who takes the prompt.
- The 13.11 failure had no verdict line, which is how a crashed or killed browser looks, not a failed check. It cannot
  be pinned on these patches.

**containers: an intermittent hang, not caused by these patches as far as the evidence goes.**
- **First try on this branch:** checks 1–32 passed. Then no check for more than 30 minutes, in the region-change step:
  `G.enterRoom('zeelich')`, then `G.exitRoom` back to Citadel, then six presses at the bin. The page's renderer
  process sat at about 94 % CPU throughout. I stopped it at 45 minutes. This matches the 13.11 timeout.
- **Three more runs with step timings,** using a copy of the suite (`containers-dbg.mjs`, not committed). It takes
  stack samples by pausing the debugger every 2.5 minutes while that step runs. It is otherwise unchanged:
  - this branch: PASS 41 / 41 twice, the step taking 13 s and 14 s;
  - the base: PASS 41 / 41 once, the step taking 20 s.
  - None of the three hung, so no stack sample was taken.
- **The carried props are the only patched code that runs in that step,** when Zeelich's residents pick things up.
  `carryOf` builds one template per kind and copies it. `share()` recurses over a finite template, and nothing in it
  waits or loops.
- **Verdict.** The hang is intermittent: one in four runs, on a heavily loaded machine (load average 10–14 on 4
  cores). It was not reproduced on either side, and nothing in the patches can loop.
- **For whoever meets it next:** take the same samples.
  1. Open a CDP session on the page: `page.context().newCDPSession(page)`.
  2. Send `Debugger.enable`.
  3. While the step runs, send `Debugger.pause` every couple of minutes.
  4. Print the `Debugger.paused` event's `callFrames` (function name, URL, line), then send `Debugger.resume`.

  The first sample during a hang names the function it is stuck in.

**residents (not in the earlier report, met on 14.11): the harness's screenshot timeout under load, the same on the
base.**
- On this branch, `residents` stopped with `page.screenshot: Timeout 30000ms exceeded` in `shot()`, after the first
  area or after Lhar. No check had failed: 18 to 112 checks passed before the stop.
- **The same suite on the base,** run alternately with this branch:
  - at load 8–10: PASS 182 / 182 once;
  - at load 13–15: the same timeout at the same spot, twice;
  - this branch, at the same load: the same, twice.
- The timeout is the harness's: Playwright's 30 s screenshot default, while SwiftShader renders a 960×540 frame on a
  machine shared with another worker. It is not a game fault, and not these patches.
- **With only that timeout raised** to 600 s (a snapshot copy, `residents-slowshot.mjs`, not committed), this branch
  passes **182 / 182**, the same count as the base's clean run, at load 10–13.

## What is left

- **Frame times on the Vega 8:** `tools/testlab/CLOUD_ORDERS.md` order 42 gives the exact A/B steps. The harness's
  `LIVE=secs` option draws real frames at each view and prints `game.perf.stats()`: frame-time percentiles, CPU
  simulation and render submission apart, and the GPU timer where the browser has one. It is meant for a real GPU.
  On SwiftShader its times mean nothing.
- `townlife`, `interior-life` and `desert-life` (other places where residents carry things) were not run in this pass.
- The three dogs' duplicate part geometries (about 400 KB, built once). Bounded; left as a follow-up.
- The isles' `esmerBuilding` doors were not changed (see "Where else it applies").

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
- Art commit `1ca971f0` on the 13.11 base (now `548e0947`), `zeelich.js` only. Waste fix written in `walkers.js`
  (`carryOf`) but not yet committed.
- Base snapshot at `/dev/shm/t930base` (port 8931); candidate at `/dev/shm/t930` (port 8930).
- Added to the harness: the first time a workshop mark is seen on the walk (raycast) and the carried-prop geometry
  counter.
- 13.11: stopped here to save tokens; kept as `tools/testlab/wip-2026-11-13/tech-art-1/`.
- 14.11: the seven patches re-applied on `b38d29e4` with `git am` (clean). Snapshots `/dev/shm/t960` (this branch,
  port 8960) and `/dev/shm/t960base` (`b38d29e4` plus the harness, port 8961). Counters re-run on both, with materials
  added to the harness. Fresh door, street and resident captures; the other pictures were taken out of the tree.
- 14.11: suites one at a time on `/dev/shm/t960`. containers hung once and passed on the retry; residents hit the
  screenshot timeout, the same on the base. Comparison runs are listed above. The harness gained `LIVE=secs` (checked
  on SwiftShader only for its mechanics: frames 3–4 of about 5 s each in a 20 s window) and the `HELD` check (7 and
  9 carriers of four kinds in two runs, all holding a drawable prop; the carriers of one kind share one geometry). The Vega 8 order is `CLOUD_ORDERS.md` 42. Snapshots and servers
  removed at the end.
