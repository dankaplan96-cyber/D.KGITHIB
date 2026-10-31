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
