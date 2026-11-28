# LBA3 0.43.3 (build 292): findings from the Test Lab on the target laptop

Measured 31.10.2026 by the local session on the user's laptop: Ryzen 5 3500U, Radeon Vega 8, 1366×768, 60 Hz, fullscreen.
The game is the portable release zip (desktop build 292), unmodified, run in a separate test profile.

- **Power:** battery for all runs below except the first quick check (plugged in, noted where used).
- **Quality:** Auto chose **Medium** on battery and **High** on the charger.
- **Confidence:** *confirmed* = the outcome itself was observed; *likely* = the stalled frame itself recorded the work
  that ran in it; *open* = not known yet. Nothing below is inferred from timing alone.

Runs, all under `tools/testlab/examples/`:
- `full-2026-10-31/`: the full suite.
- `rerun-2026-10-31/`: the six tests fixed in the tool, run again.
- `reproduce-house-entry/`: the house stall with the CPU profiler on.
- `visual-2026-10-31/`: contact sheets.

To reproduce, from `lba3/tools/testlab` (README.md):
`node engine/cli.mjs reproduce examples/<run>/scenarios/<test>.json --game "<path to LBA3 The Awakening.exe>"`

## Fix first

### 1. Visible freeze of 0.6–1.2 s when the house first appears after New Game (high; likely cause)
- **Where:** test `title-to-play`, evidence `full-2026-10-31/evidence/title-to-play-stall-*.json`.
- **Observed:** one frame of **1217 ms on battery** (600 ms plugged in), **not** behind black. The player sees the
  game stop as he first gets control.
- **What the frame itself recorded:** work 661 ms. Draw batches built 372 ms, shadow batches built 104 ms, shadow
  cache rebuilt (dropped: casters changed), +40 geometries uploaded.
- **What the profiler showed in the reproduction run:** `drawbatch.js` `planesOf` (≈144 ms over the run) and
  `Area` (90 ms), `shadowcull.js` `build` (93 ms), and `audio.js` `init` (446 ms over the window).
- **Not explained:** in the largest stall (533 ms) only about 6 % of the time was JavaScript. The rest of the wait was
  outside JS: likely the merged geometries' upload or driver work, not proven.
- **Why it happens:** `DrawBatch` (src/engine/drawbatch.js) merges an area's static pieces **in one synchronous pass
  the first time that area is drawn**. It goes per triangle: cell bucketing, then coplanarity keys in `planesOf`.
  The same frame then builds the shadow batches and uploads the merged buffers.
- **Suggested direction (keeps the look):** the originals stay in the scene, out of layer 0, until their batch exists.
  So:
  - build the batches **incrementally under a per-frame time budget**, and draw the originals of a cell until that
    cell's batch is ready;
  - or build the house's batches while the title screen is idle;
  - and move `audio.init` out of the first playable frame.
- **Not acceptable:** moving the same work behind a black hold. The Test Lab counts that as a stall too.
- **Acceptance:** `title-to-play` has no visible frame over 100 ms in "New Game until playable". Run baseline →
  candidate → baseline, 3 runs each, on battery (`node engine/cli.mjs compare …`).

### 2. The street on battery: 45–47 fps, GPU-bound (high; likely: the timer query's own numbers)
- **Where:** tests `street-traversal` and `memory-long-walk` (3 min, steady 46.1 fps).
- **Setup:** Auto Medium, pixel ratio 1, real arrow-key walk on the player's follow camera.
- **Observed:** GPU p50 **17.4 ms**, against the game's CPU work p50 12.9–13.6 ms. Frame p95 is 33.4 ms: the frames
  that miss go to 33 ms (vsync).
- **On the charger (Auto High):** 60 fps, GPU 11.6 ms.
- **By design, not a bug (AUTO-2, the user 30.10):** on battery Auto is Medium at full resolution, with no automatic
  resolution. That was chosen over a lower look, aiming at about 50–55 fps. Measured: **46 fps**, below that aim.
- **GPU by pass** (game.perf.gpuTimer, battery, street): **scene 16.4 ms** · shadow map 0.9 ms · output pass not
  timed separately. Almost all of the GPU's time is the main scene pass: shading and overdraw of the street's
  materials, not shadows.
- **Known levers** (from earlier laptop runs, results/laptop-0.40.1-full-chrome-battery.txt): edge smoothing about
  −2.5 ms, lamps −1.4 ms. The direction that keeps the chosen look is cheaper scene shading (terrain and paving
  shaders, overdraw of foliage and props), not resolution or shadows.
- **Acceptance:** `street-traversal` ≥ 55 fps on battery, without lowering resolution globally or removing scenery.

### 3. The opening cinematic plays at about 31 fps on battery (medium; likely: measured)
- **Where:** test `opening-cinematic` (`rerun-2026-10-31`).
- **Observed:** 12 s of playback at 31.2 fps, most frames 33 ms.
  - GPU p50 **26.7 ms** (p95 30.4).
  - CPU work p50 19.9 ms, of which 15.3 ms is render submission for 292 draw calls and 1.1 M triangles a frame.
  - Render scale 1 → 1: the resolution did not adapt during the cinematic.
  - One 333 ms frame with a 27 MB garbage collection.
- **Suggested direction:** the cinematic's shots are known in advance, so their scene can be culled or batched
  per shot. Let the automatic resolution (or Auto's floor) apply during cinematics. Find the 27 MB of garbage
  (allocation per frame in the cinematic path).
- **Acceptance:** `opening-cinematic` ≥ 50 fps on battery, no frame over 100 ms, no visual change in the shots.

### 4. First visit to a region: 2.5–4 s behind black, in pieces (medium; likely)
- **Where:** test `region-entry`, via `enterRoom` with its fade, nothing preloaded.
- **Observed on the first visit, Zeelich:** about 4 s of black split into four parts:
  1. 0.9 s in a `setTimeout` task: the region's build;
  2. 2.1 s: draw batches built **1031 ms**, 11 shader programs compiled, +105 geometries, +49 textures;
  3. 0.9 s: shadow cache rebuilt, +45 geometries;
  4. 0.2 s more of shadow cache.
- **Desert and Hamalayi** follow the same pattern: 1.5 + 1.25 s, and 1.6 + 1.1 s.
- **Second visits:** the worst frame was 166 ms. The cost is the first build only.
- **All of it was behind black,** so it is no visible freeze, but it is a long dark wait. It is the same
  `DrawBatch` first-build cost as finding 1, plus shader compiles and shadow-cache rebuilds.
- **Suggested direction:** the same incremental batching. Precompile the region's shader variants during the trip
  (ship, card). Rebuild the shadow cache once per arrival, not twice.
- **Acceptance:** `region-entry` first visits under 1.5 s of black in total each, and no visible frame over 100 ms.

## Where the street's CPU and GPU time goes (diagnose-2026-10-31, battery, Auto Medium, the follow camera)

All numbers come from the game's own instruments. `node engine/cli.mjs diagnose` runs them again.

**GPU: 15.9 ms a frame on the street, 51 fps.** Source: `game.bench.run` breakdown, one cost removed at a time
(evidence/gpu-breakdown.txt). The biggest cost is **material shading**, not shadows or vegetation:

| Removed (diagnostic) | GPU ms | Saved |
|---|---|---|
| all materials flat | 9.1 | **−6.8** |
| terrain material flat | 12.3 | **−3.6** (the ground and paving shader) |
| no static scenery | 13.0 | −3.0 |
| scenery material flat | 13.6 | −2.3 |
| no edge smoothing (output pass) | 14.0 | −1.9 |
| no lamps | 14.3 | −1.6 |
| no characters | 14.5 | −1.4 |
| no shadows | 15.1 | −0.8 |
| no grass/flowers, no trees/rocks | 15.7–15.8 | −0.1 to −0.2 |
| battery profile off | 34.6 | +18.7 (the battery cuts are essential) |

- **Direction:** a cheaper terrain and paving shader, and cheaper scenery materials, are worth up to 3.6 + 2.3 ms
  without removing anything. Edge smoothing, lamps and characters come after.
- **Not the cause:** vegetation and shadows.

**CPU: 14.1 ms of game work a frame.** Source: `game.bench.visits`, CPU by section, exclusive times
(evidence/cpu-sections.txt).
- **Render submission is about 9 ms:** submit main 5.2 · submit other 2.8 · shadow 0.9 · post 0.1.
- **Simulation is about 4.5 ms:** other sim 1.7 · people 1.2 (74 calls) · camera 0.6 · physics 0.5 (347 calls a
  frame) · hero 0.4.

The V8 profiler on a real 15 s walk (evidence/js-hotspots.txt) names the heaviest functions:
- **`drawcull.js shownTree` (line 56): about 2 ms a frame.** Every frame it walks the whole shown scene, about 1,300
  objects on the street, compares each one's position, rotation and scale with a cache, and recomposes matrices.
  Most of the street is static.
- **`drawbatch.js watch` (line 496): about 0.6 ms a frame.** Every frame it re-checks about 1,500 batched pieces for
  changes.
- Three.js's own projection and matrix code: about 1–1.5 ms. `shadowcull.update` and `rig.update`: about 0.3 ms each.
- **Direction:** freeze the static scenery's matrices once it is placed and skip those subtrees in the walk. Make
  `watch` event-driven (a piece that can change marks itself) instead of polling all 1,500. Expected: around
  2–2.5 ms less CPU a frame on the street. It changes nothing on screen.

## Residents: does what they do look right? (npcs-2026-10-31)

Every resident of the Citadel was checked at every activity stop of its round:
- **Gap:** a ray at hand height, plus a slanting one for ground work, measures the gap to the real surface it faces.
- **Picture:** a side-view close-up, with Twinsen hidden.

Sheet: `npcs-2026-10-31/contact-sheet.jpg`; all stops: `evidence/npcs/index.html` and `survey.json`.

1. **The gardener with the sun hat (resident `garrick`) waters air** (likely). Stop `gar_water`, src/game/walkrounds.js:91,
   at (−39.3, 7.1), looking at (−39.3, 8.7).
   - In the picture the gardener stands on the grass **beside** the flower bed, facing along it, not into it. The
     measured gap is 1.81 m.
   - At `gar_tend` (line 87) the gardener kneels at the bed's corner, which looks right. Both stops look at the same
     point (−39.3, 8.7), which does not seem to be the bed's middle.
   - **Fix:** put `gar_water`'s position and look point at the bed's long side, within about 0.7 m, facing it.
     Check `gar_rest` (line 92, same look point) too.
2. **A second resident, the green one, stands within arm's reach of the gardener at the same bed** while watering,
   and they overlap. Worth a look: give one of them another spot or a different time.
3. **`dot_warm` (line 107, the stall's heat post): the stop is inside an object** (likely). A surface sits 0.25 m above
   the feet, so the resident stands in the stall or its post. That stop belongs to a later stage of the town, so it
   was not photographed. **Fix:** move it about 0.4 m out from the post.
4. **Knocking at doors (`oda_home`, `maro_home`, `tilde_home`): not judged.** A resident placed at the stop goes
   inside at once, so nothing could be photographed. The ray found no door leaf within 2.5 m at knocking height:
   look whether a door is drawn there at all.
5. **Fine:** the gardener kneeling at the bed and at the water tap; dot at the well; oda at the stall; brix and marda
   warming or resting; tobb setting a crate down on the ground or by the stall.

## Works (asserted, not only "no crash")

- Cold launch to title in 17.9 s, empty profile.
- New Game to control in about 2.2 s, and Twinsen moves on the arrow keys.
- The cupboard gives the ball once; the objective advances once; a second search changes nothing.
- The house door, walked through with real keys, leads to the Citadel, and the fade clears.
- The magic ball, quick and charged throws: fly → return → back in the hand.
- R swaps weapons; K plays slash1 → slash2 → slash3.
- The arena fight: enemies take damage, Twinsen survives, about 59 fps.
- Esc pauses and resumes.
- Losing focus switches to background drawing and back. Play goes on, by design.
- Leaving and re-entering fullscreen resizes the view correctly.
- Save → quit the game → start again → Continue: same place (within 2 m), coins, ball and chapter kept.
- Death without clovers → game over → Retry → back in play with life.
- The opening plays, the hold-to-skip works, and control returns in the house.
- 3 minutes of street walking: GPU geometries, textures and JS heap stable.
- The benchmark's repeated visits: geometries +7, textures 0, programs 0, heap −22 MB (no growth).

## Needs a person's eye (visual)

Contact sheets are in `visual-2026-10-31/evidence/visual/*.html`: a close-up around Twinsen every 220 ms, then the
full frame.

- Animations play as expected: idle, walk, turnR, jump (Athletic), throwQuick with the ball released at the throw,
  slash1–3, hurt. All 24 bones are finite every frame. No numeric problem was found.
- **The sword is hard to see during slashes:** a thin grey blade against the grey paving. At the player's camera
  distance it reads as an empty-handed swing. Worth a look: blade contrast or a short slash trail.
- On the player's own camera Twinsen is about 60 px tall on the street, so animation detail is judged in the
  close-ups, not at play size.

## The tool, honestly

- These findings come from one laptop on one day. Comparisons need baseline → candidate → baseline, which
  `compare` does.
- `Math.random` is not seeded, so two runs of the same input timeline are not the same game.
  `NEEDS_FROM_GAME.md` lists that and what else would make the tests exact.

## The whole game: 42 rooms and regions × 3 story points (sweep-2026-10-31)

- **How:** `node engine/cli.mjs sweep`. Every room and region was entered through the game's own door (enterRoom
  with its fade), at the start of the story, chapter 7 (observatory) and chapter 12 (core). The story was moved on
  with `story.nextChapter()`.
- **Runs:** on battery until the run was stopped by hand (start and middle complete), then plugged in (all three).
- **Per area:** entry stalls, 8 s looking around (the free camera turning), a second entry, every character's checks
  and close-up, one overview.
- **Data:** `areas.csv` (battery against plugged, per area) and `start|mid|end/areas-*.json`.
- **Pictures:** `overviews.jpg` and `flagged-characters.jpg` (developer evidence; the user plays only chapters 1–2).

**Speed:** every interior runs at 60 fps on battery (GPU 7–13 ms). Seven outdoor areas fall below 58 fps on battery.
All are GPU-bound, and all reach 60 plugged in except the Citadel.

| area | battery fps · GPU ms | plugged fps · GPU ms |
|---|---|---|
| citadel | **44.5** · 18.1 | 55.5 · 11.8 (plugged, Auto is High) |
| isle_otringal | **46.5** · 17.6 | 60 · 9.6 |
| hamalayi | 51.5 · 16.1 | 60 · 9.4 |
| isle_knartas | 53.8 · 15.6 | 60 · 9.5 |
| zeelich | 54.3 · 14.0 | 60 · 9.4 |
| desert | 55.7 · 12.3 | 60 · 9.8 |
| isle_platform | 56.0 · 15.0 | 60 · 9.6 |

The street diagnosis above (material shading, the terrain shader) is the lever for all of them. Otringal is the
second heaviest after the Citadel.

**Entry, battery / plugged:**
- The first entry is mostly behind the fade, but long: zeelich 1.8 / 2.0 s, isle_otringal 1.8 / 1.3 s, desert
  1.8 / 1.0 s, hamalayi 1.3 / 1.1 s, c3shaft 1.3 / 1.7 s, isle_knartas 1.0 / 0.6 s, workshop 1.0 / 0.7 s.
- A second entry still costs about 0.15–0.27 s in the rooms and regions (a shadow-cache rebuild each time), and
  about 0.02–0.03 s on the islands.
- **Direction:** the same as finding 4. Don't rebuild the shadow cache on every re-entry of an area already built.

**Characters (154 checks over the three story points), from the measurements and the pictures:**
- **Real, out of reach (the gardener pattern):**
  - citadel `garrick` (gar_water 1.8 m, gar_draw 1.9 m, gar_tend 1.2 m);
  - zeelich `kira` (tend and water 1.14 m, draw 2.54 m);
  - zeelich `ilo` (browse 2.99 m, dip 2.06 m).
  These stops sit about 1.1–3 m from what they work on. The fix is the same in src/game/walkrounds.js: put the stop
  at about 0.7 m, facing the object.
- **To check by eye:**
  - desert `tamu` walks 0.4–0.8 m below the physics ground (through a sand mound?);
  - lighttop `arthur` (chapter 12) stands where a surface is 0.6 m above the feet (the console?);
  - citadel `dot` warm 1.2 m from the heat post.
- **False alarms of the tool** (seated characters are recognised by their animation name, which is missed on these):
  oda and maro on benches, the three council members on their chairs, citadel `tilde` (end); desert `safi` dip at the
  oasis (the ray must go down to the water).

**The look, for the World Art pass** (`overviews.jpg`): the Citadel, the house, the office, the workshop and the
lighthouse top are warm and detailed. About a dozen interiors share one look: dark blue-grey walls, a grey floor,
sparse props, little separation between floor and walls. They are archive, asylum, buhalls, bumaze, school, valves,
wtent, condA/B, control, projoffice and butemple.
