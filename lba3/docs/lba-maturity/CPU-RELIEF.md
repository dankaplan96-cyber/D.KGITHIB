# CPU-RELIEF (P137b, 26.11): relieve the processor, keep the shadows

The user (26.11), after FPS60-AUTO on the laptop (Intel UHD 620, 59.9 Hz, dPR 1.25): the Citadel street is
**CPU-bound** there. The user's own report (19.11, `docs/lba3-performance/HARDWARE/2026-11-19-intel-uhd620-mains`) measured
the game's CPU work at **p50 16.4 / p95 22.3 ms** a frame on the street at Medium. Of the p95, render submission was
8.7 ms (main pass 5.8, culls and world matrices 2.9); the people took 1.7 ms and the rest of the simulation 2.3 ms. The
user picked:

1. **Relieve the CPU** ("להקל על המעבד"): cut main-thread time per frame there without a visible loss.
2. **Keep the shadows**: Auto must not turn the shadows off for CPU pressure.
3. Keep the fast-screen pacing (`pace.js` untouched).

**Everything measured here is automated runtime only (SwiftShader, headless Chromium, this shared 4-core container at
load 9–18).** The JavaScript side's milliseconds are meaningful only as a *relative* measure, side by side in one machine
state. **No number below is a UHD 620, i5, GTX 1050 or any real GPU/CPU figure, and nothing here promises 60 fps on the
laptop.** §6 says what the laptop should measure.

Base: `ccr-c1c2c4b9-dep6ed` at ebbc5578. Commits: b76d8ff9 (hypot, ARM-CLEAR, probes) and f9febf08 (CPU-eco), plus this
doc and the sheet.

## 0. In short

**For the user to decide: CPU-eco itself.** It buys about 0.3 ms a frame (~2 %, follow camera, this machine) by
animating far people at a half or third rate. Their feet are also not planted from 15 m (sheet: §4). On mains, by the
model, Auto settles on it and keeps it.

- AUTO-2 records the user dropping Medium-eco for "~1 fps, and it looked worse".
- The alternative is to remove the rung. The CPU side would then end at Medium-lean (shadows kept as well): a
  one-line change (CPU-eco's entry in PROFILES).

| what | where | effect (this machine, relative) | visible? |
|---|---|---|---|
| ARM-CLEAR's depth test out of a V8 deopt loop | `src/engine/rig.js` acDepth | its garbage **534 KB → 0 a frame**; the people's animation section **−28 to −54 %** (block medians) | no |
| Math.hypot the optimiser can inline, game-wide | `src/engine/fastmath.js` | a solve **2.0–2.7× faster** (node bench); the `hypot` builtin's boxing gone | no (≤ 1 ulp) |
| Auto's CPU rung keeps the shadows: **CPU-eco** replaces Low-eco | `autoquality.js`, `autoapply.js`, `drawcull.js` | far people at a lower rate: **−0.3 ms animation (≈ 2 % of the frame)**, follow camera | **yes**: far people's animation rate (§4) |

- On the street the frame's total did not move outside this machine's noise. The per-frame garbage fell **1 592 → 1 292
  KB** (sampled, −19 %). The animation section fell about 0.5–1.9 ms (medians).
- **Nothing here closes the gap to 60 on a CPU-bound laptop street.** Half of the frame is render submission:
  draws, culls and matrices that previous passes already cut hard (PERF-CPU, CPU-WALK, PERF-SUBMIT). §3.3 lists what is
  left.
- **CPU pressure no longer takes the shadows**, at any rung. The price: on the CPU-bound street Auto has one less
  lever. By the decision model the UHD 620 on mains settles on CPU-eco at ~45.9 fps, with its shadows. P137's Low-eco
  gave ~47.4 fps without them (§5).

## 1. How it was measured

`docs/lba3-performance/CPU-RELIEF/probes/sections.mjs` (new) boots the game, builds the benchmark's areas, applies an
Auto profile exactly as Auto does, and runs a route with the clock stepped by hand. For each drawn frame:

- SwiftShader's GL work is first drained (a 1-pixel `readPixels`, untimed). The frame's time is then the renderer
  process's JavaScript plus GL command encoding only.
- Every subsystem's entry points are timed **exclusively**: a section nested in another counts only in the inner one.
  Physics inside a person's update counts as physics, three's per-draw call inside its render counts as the draw, and
  the shadow pass inside the scene pass counts as the shadow pass. Call counts are recorded too.
- The arm profiles' background job (`warmArms`, spare-time work excluded from Auto's counted frame) is finished before
  timing.

Extra tools in the same folder:

- **A census per frame:** draws by owner and pass, rig updates by distance band and view, and each world updater's
  time.
- **A/B in one browser:** `AB_A` / `AB_B`, alternating blocks of 32 frames.
- **CPU profiles:** `CPUPROFILE`, read with `prof.py`, `under.py` and `callers.py`.
- **A V8 deopt census:** `deopt.mjs` and `deoptsum.py`.
- **A microbenchmark of ARM-CLEAR's solve:** `acbench.mjs`.
- **Garbage per frame:** PERF-CPU's `alloc.mjs`, a sampling heap profiler.

The garbage per frame comes from V8's sampling heap profiler. It does not scale with the load the way milliseconds do,
but which functions V8 has optimised at a given moment changes it from run to run (§4).

Conditions: 1280×720, dPR 1, Medium and Medium-lean. The routes are the benchmark's Citadel **street**: Twinsen walks
the square, seen from the benchmark's free orbit (as the laptop's benchmark ran it) and from the player's follow camera
at Far (as it is played). 240 frames of warm-up, then 256 measured.

**The machine was shared and loaded** (load average 9–18 on 4 cores). A frame's total varied 2–3× from block to block.
Each figure is therefore the **min / median of 32-frame block means**. Comparisons across two boots (before / after) are
indicative; within one boot (A/B) they are better. The firm evidence is two load-independent results: the deopt trace,
and `acDepth`'s garbage (534 KB → 0 a frame).

## 2. What costs what (before, the street at Medium)

Exclusive sections, ms a frame (p50 of frames, the free-orbit street, one boot; `base2.txt`). The frame was 19.9 ms here.

| section | ms | what it is |
|---|---:|---|
| three's per-draw work (`renderBufferDirect`, ~160 draws) | 4.9 | program and uniform updates, GL calls; `uniformMatrix3fv` (normal matrices) alone ~1 ms |
| the people's animation (`Rig.update`, ~25 calls) | 2.5 | of which ARM-CLEAR's depth test (P111) ~0.8 (CPU profile) |
| three's render (cull, sort, state), 2 passes | 1.9 | |
| world matrices (the shown-world update) | 1.3 | ~500 objects visited, ~1 770 in frozen subtrees (CPU-WALK) |
| shadow culling (`ShadowCull.update`) | 0.6 | |
| the people's simulation (199 updates, most return early) | 0.6 | |
| physics (~530 calls) | 0.4 | |
| box culling, the shadow pass's own culling, post | 0.4 each | |
| interaction lookup, world updaters (27), camera | 0.2–0.4 each | |

- **Garbage: 1.59 MB a frame.** One third of it, 534 KB, came from a single function, ARM-CLEAR's `acDepth` (§3.1).
  The next largest sources were 40–50 KB each: the walk planner, the follow camera's clearance, shadow culling and
  `Rig.update`.
- **Draws (census, ~160 a frame):**
  - 39 main + 22 shadow draws of plain meshes not in a draw batch, chiefly:
    - the poodle on the square: 7 parts, each drawn in both passes;
    - the asylum's front and climb, built into the scene and not into Citadel's root: their shadows are drawn live
      every frame;
    - the pipeline;
    - town pieces merged by their builders.
  - 16–18 draw batches, 12.5 instanced tiles, 13–16 for the people's bodies and parts, 4 for Twinsen, 4–5 terrain
    tiles.
- **Rig updates (census).** With the free orbit, most people a frame poses are near and in view (5.4 within 12 m)
  or already posed at a quarter rate out of view. With the **follow camera**: 7.6 a frame in view at 12–25 m, 4.3 in
  view beyond 50 m, 3 within 12 m.
- **Zeelich and Desert Island (Kesh), in a new game, are not CPU-heavy.** Their people are placed by chapter; later
  chapters were not measured.
  - The busiest spot found within 600 m of each arrival had 3 people within 15 m (Zeelich, by n_ilo) and none
    (Desert).
  - Their frames were 10 and 5.5 ms here.
  - At Zeelich, physics took 1.3 ms (~4 500 calls a frame). Almost all of it is the region map being drawn after the
    arrival (a background job, `mapdraw.js`), plus Citadel's dogs and the ferry.
  - The isles' squares were not visited.

## 3. What changed

### 3.1 ARM-CLEAR's depth test was stuck in V8's first optimising tier (`rig.js` acDepth)

V8's trace (`deopt.mjs`, `--trace-deopt`) showed `acDepth` deoptimising **dozens of times a minute** on the street, every
time at the same check ("not int32"). After each deopt it was recompiled by Maglev and failed again. It never reached
TurboFan, and its unoptimised fallback boxed every intermediate number: the 534 KB a frame.

The cause was the body row `Math.round((y - y0) / AC_DY)`: for an arm point up to 1 cm under the lowest row, `Math.round`
gives **−0**, which is not an int32. The row is now `Math.floor(x + 0.5)`. That is the same row for every point (+0 and
−0 are one row; the range test still drops it) and never −0.

After the change, the trace shows **no** deopt of `acDepth` in 600 street frames. The heap profiler shows **0 KB** a
frame from it (534 before).

### 3.2 Math.hypot, game-wide (`src/engine/fastmath.js`, imported first in `main.js`)

The source calls Math.hypot ~1 160 times, many in per-frame loops (the arms, the walkers' planner, the camera, physics).
V8's builtin takes any number of arguments, so optimised code cannot inline it. Each call boxes its arguments and its
result and runs the builtin's general path.

It is replaced once at startup by a plain function. For 2 or 3 finite, ordinary-sized arguments it returns `Math.sqrt`
of the sum of squares, within an ulp of the builtin (1 000 000 random pairs: max relative difference 4.4e-16). Every
other case goes to the builtin itself, so it answers exactly as before: other counts, NaN, infinities, results under
1e-140 or over 1e140. All zeros give 0. `?slowhypot` keeps the builtin, as an A/B switch.

ARM-CLEAR's solve (node, `acbench.mjs`, the same answers to the last digit):

| variant | µs per solve |
|---|---:|
| builtin hypot | 34.7–38.8 |
| the patched Math.hypot | 17.1 |
| hand-written `Math.sqrt` | 13.6–14.2 |

In node's default tiers, scavenges for 23 000 solves fell from 679 to 25. In the browser, an in-boot A/B on the street
(builtin vs patch, Medium, orbit) gave an animation p50 of 3.0 → 2.5 ms and a frame p50 of 19.3 → 15.7 ms. That
comparison is indicative only, because physics call counts differed between the sides.

### 3.3 Not changed (looked at, left)

- **Draw count.** It is the largest block. The remaining unbatched draws are the poodle's 7 parts (14 draws: moving
  parts), the asylum's scene-level casters (their shadows drawn live) and the pipeline. Merging or caching them is a
  scoped change for a later pass (ShadowCache's static set covers only the area root). Not done here, for lack of
  time to verify the shadows pixel by pixel.
- **`uniformMatrix3fv` ~1 ms a frame** is three's per-object normal matrix. That is inside three.js; left.
- **`shownTreeF`** (the shown-world update) deoptimises ~24 times in 600 frames. These are lazy deopts as field types
  generalise; it is re-optimised each time. Its garbage moved between runs (20–110 KB a frame). It is a candidate for a
  next pass.
- **ARM-CLEAR's rate for far people.** Lowering it would be a pose change under P111 (a Grobo's arms inside his body).
  Not done.
- **`matrixAutoUpdate`.** The shown-world update already freezes static subtrees: ~1 770 of ~2 300 shown objects
  (CPU-WALK).
- **Interaction lookup, audio, HUD.** 0.1–0.4 ms each; gameplay-sensitive (prompt choice). Left.

### 3.4 Auto: CPU-eco replaces Low-eco (the shadows kept)

- **CPU-eco** keeps the id `loweco`, so a laptop that settled on Low-eco comes back to CPU-eco. It is **Medium-lean's
  picture exactly**: shadows (map 1024, plain edges, Low's small casters), 100 % resolution, no MSAA (output-pass
  edges), 2 lamps, Low's grass.
- It has one more knob, the only visible trade the user allowed: **far people animated at a lower rate**, `anim: 'deep'`
  in `FarCull`. In view, people from 15 m are posed every other frame and people beyond 25 m every third. Out of view
  they are posed every fourth frame, as before.
- It sits **above Low** (index 3; Low is 4). Its GPU cost is Medium-lean's, and Low's is lower. Its CPU cost is
  Medium-lean's × 0.97, and Low's is lower still. The list therefore stays ordered on both sides.
- **The CPU side ends at CPU-eco**:
  - CPU pressure: Medium → Medium-lean → CPU-eco (on battery, where Medium-lean is skipped: Medium → CPU-eco).
  - No rung below it is a CPU rung, so **no CPU step turns the shadows off**.
  - GPU pressure goes as before: Medium-lean → Low → Low 75 % → Low 65 %, stepping over CPU-eco.
  - Up from Low is Medium-lean.
  - A power change to mains steps to the rung above on the same side (`Governor.above`). The old index step would
    now have gone from Low into CPU-eco.
- **What it buys.** In the A/B (Medium-lean vs CPU-eco, follow camera, the street, same boot), the animation section fell
  **1.23 → 0.94 ms** (block medians), about 2 % of the frame. The frame total was within noise. With the free orbit it
  buys about nothing: few people are far and in view.
- **What Auto then does.**
  - P95's revisit judges a step only when play comes back to a scene measured at the profile above. Then CPU-eco,
    buying under 7 %, gives Medium-lean back and no further CPU step is taken.
  - Without such a revisit during the evaluation, CPU-eco is held. By the model, the UHD 620 on mains settles on it;
    on battery it tried CPU-eco and went back (§5).
  - Either way the shadows stay.
- **Text.** Settings shows "Auto (CPU-eco)", in Hebrew `חסכונית במעבד`. `q_prof_loweco` changed in English and Hebrew;
  `he-bundle` was run; `dialogue-check` PASS (6640 / 6640).

## 4. Before / after (this machine, relative)

Block means, min / median ms, 8 blocks of 32 frames. Before: `rig.js` of ebbc5578 routed in, `?slowhypot`. After: this
branch (A side of its A/B: CPU-eco's knob off). The two are separate boots, so the frame totals mostly show the load.

| view | section | before | after |
|---|---|---:|---:|
| street, Medium, orbit | **people's animation** | 2.06 / **3.68** | 1.63 / **2.10** |
| | frame (all) | 13.58 / 18.43 | 12.91 / 23.42 (heavier load: untouched sections rose too) |
| street, Medium, follow | **people's animation** | 1.82 / **3.57** | 0.84 / **1.63** |
| | frame (all) | 13.18 / 21.02 | 14.35 / 20.82 |
| street, Medium-lean, follow | **people's animation** | 1.09 / **1.71** | 0.83 / **1.23** |
| | frame (all) | 9.32 / 10.99 | 12.12 / 13.47 |
| street, CPU-eco, follow (same boot as the row above) | people's animation | | 0.78 / 0.94 |
| | frame (all) | | 9.55 / 14.21 |

The other sections, block medians, before → after (the same three views). None of them was changed. Their moves are the
load: the after boot ran heavier, and its untouched sections mostly rose.

| section | Medium, orbit | Medium, follow | Medium-lean, follow |
|---|---|---|---|
| three's per-draw work | 4.01 → 4.86 | 4.74 → 4.21 | 2.80 → 3.67 |
| three's render (cull, sort, state) | 1.63 → 2.94 | 1.71 → 2.28 | 1.22 → 1.48 |
| world matrices | 1.19 → 1.18 | 1.32 → 1.71 | 1.08 → 1.15 |
| shadow culling | 0.77 → 1.00 | 0.81 → 0.71 | 0.55 → 0.70 |
| the shadow pass's culling | 0.42 → 0.52 | 0.49 → 0.63 | 0.28 → 0.52 |
| the people's simulation | 0.77 → 0.76 | 0.88 → 0.76 | 0.40 → 0.45 |
| physics | 0.42 → 1.21 | 0.38 → 0.87 | 0.32 → 0.52 |
| **the people's animation** | **3.68 → 2.10** | **3.57 → 1.63** | **1.71 → 1.23** |

Normalised by the same boot's submission (animation ÷ (per-draw work + render)), a ratio the load moves less: Medium
orbit **0.65 → 0.27**, Medium follow **0.55 → 0.25**, Medium-lean follow **0.43 → 0.24**.

- Garbage on the street at Medium (`alloc.mjs`, 120 frames, sampled, one run each):
  - before: 1 592 KB a frame;
  - the hypot patch alone: 1 347;
  - both changes: 1 292.
- The firm part is **`acDepth`: 534 → 483 → 0 KB**.
- About 140 KB of the "hypot alone" drop is the arm profiles' background job (`acRun`, 190 → 52 KB). `alloc.mjs` does
  not finish that job before measuring, so it is not this change.
- `poll` and `shownTreeF` (the shown-world update) rose in the last run (25 → 173 KB and 20 → 110 KB). In the run
  before they were 9 KB each.
  - Unexplained: no deopt trace was taken in the runs where they were low.
  - The street trace after the change shows `shownTreeF` re-optimised after ~24 lazy deopts in 600 frames.
  - A candidate for a next pass.
- A minor collection costs a few ms on a battery-clocked laptop CPU (PERF-CPU §2.5). Less garbage means fewer of them,
  not a lower p50.

**The visible change: far people's animation rate at CPU-eco.** Sheet: `captures/cpu-relief/sheet.png` (§7).

- A walking resident 16–23 m off, ten frames 1/60 s apart.
- Medium-lean poses them every frame. CPU-eco poses them every other frame; their body still moves every frame.
- The hip's swing per frame shows the held poses as steps.
- Their feet are not planted while posed at a lower rate. Medium-lean already did this beyond 25 m.

## 5. Auto's decisions, by the model (`tests/autoquality.mjs`, synthetic)

UHD 620 rows of the machine table. The P137 column is FPS60-AUTO §4. The truths assumed for CPU-eco: Medium-lean's GPU
share; its CPU share × 0.97, about what §3.4 measured.

| machine | power | limit | P137 (Low-eco) | P137b (CPU-eco) |
|---|---|---|---|---|
| UHD 620 (dPR 2) | mains | 60 | Low-eco, 47.4 fps, **no shadows** | **CPU-eco, 45.9 fps, shadows** |
| UHD 620 (dPR 2) | battery | 60 | Low-eco, 37.7 fps, no shadows | Medium, 32.2 fps (CPU-eco tried, went back), shadows |
| UHD 620 (dPR 2) | battery | 30 (by hand) | Low-eco, late 0.40 | Medium, late 0.53 (CPU-eco tried, went back) |
| UHD 620 light CPU (GPU-bound) | mains / battery | 60 | Medium-lean / Low, 60 | the same |

On the CPU-bound street, keeping the shadows costs ~1.5 fps by the model on mains and ~5 fps on battery. That is the
user's trade. Neither is near 60.

## 6. For the laptop (order 76, and 79 when the coordinator writes it)

Please measure on the UHD 620 laptop, Chrome, with this branch's build:

1. **Note the settings found** before changing anything:
   - Frame Rate: if it is 30, that was picked by hand; set **Unlimited**.
   - Quality: **Auto**.
   - Mains or battery.
2. **Benchmark, fixed Medium.** Pause → Benchmark at **Medium**. Paste the whole report, and in it the street row:
   - fps and frame p50 / p95 / p99;
   - CPU work p50 / p95;
   - the per-section line "medium street: people … submit main … submit post".

   Compare with 19.11 (CPU work 16.4 / 22.3; submit main 5.8, submit other 2.9, people 1.7, other sim 2.3 at p95).
   **The people's section is where this pass should show.**
3. **The same benchmark at Low.** If `submit main` falls with Low's 85 % resolution and no shadows, part of it is the
   main thread waiting in GL calls for a busy GPU. That part is not JavaScript this pass can remove. If it stays (as
   on the i5 UHD in 0.48.0: Low 5.4 vs Medium 5.1), the street's submission is CPU.
4. **Optional A/B of the hypot change in the same build.** Repeat (2) with `?slowhypot` added to the game's address,
   if the build takes URL switches.
5. **Auto, as played, 10 minutes.** The Citadel square and harbour, the chapter 2 depot fight, Zeelich; cross a door or
   open the pause menu now and then (changes wait for those). Then paste `game.autoQ.report()` and `game.autoQ.log`:
   - which profile it settled on;
   - whether it tried **CPU-eco** and kept it or went back (a "back" line);
   - that the shadows stayed on: Settings shows "Auto (Medium-lean)" or "Auto (CPU-eco)", never "Low" for CPU pressure.
6. **The sheet's change in motion.** At CPU-eco, look at people walking 15–30 m away on the street: is their walk visibly
   choppier than nearer people? A yes or no is enough.

## 7. Files

- `src/engine/fastmath.js` (new), `src/main.js` (one import)
- `src/engine/rig.js` (acDepth's row)
- `src/engine/drawcull.js` (FarCull.anim.deep)
- `src/engine/autoquality.js` (PROFILES, WORD, comments)
- `src/engine/autoapply.js` (the deep knob; the mains step by side)
- `src/game/text/common.js`, `he/common.js`, `he-text.js` (the profile's name)
- `tests/autoquality.mjs`, `tests/fps60-auto.mjs`, `tests/autoquality-game.mjs` (the new ladder)
- `docs/lba-maturity/FPS60-AUTO.md` (a P137b note)
- `docs/lba3-performance/CPU-RELIEF/probes/` (the tools)
- `tools/cpu-relief-sheet.py` and `captures/cpu-relief/sheet.png` (≤ 1300 px)

## 8. Tests (once each, automated runtime only)

See the report's list; filled in below as run.

## 9. Untested / uncertain

- No real hardware. Whether the laptop's street CPU work moves at all, and by how much, is the laptop's to answer
  (§6).
- The frame totals here are within this shared machine's noise. Only the animation section, the garbage and the
  deopt trace are firm.
- CPU-eco's value is small (≈ 2 % of a frame with the follow camera, ~0 with the orbit).
  - Where Auto revisits the scene, P95 takes it back; there Medium-lean is the CPU floor.
  - Where it does not (the model's UHD 620 on mains), it stays, with its visible far-animation trade.
- The truths in `tests/autoquality.mjs` for CPU-eco on machines other than this one are assumptions.
- Old saves: the settings format is unchanged (qv 4). A cached Auto entry with id `loweco` now means CPU-eco, with
  shadows. A cached `low` is read by id (index 4 now).
- The isles' squares were not profiled. Zeelich's and Desert's busiest spots had few people.
