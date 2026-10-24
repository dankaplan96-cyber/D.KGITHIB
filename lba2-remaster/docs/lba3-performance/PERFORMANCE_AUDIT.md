# Performance and rendering audit (RENDER-INV, block 7a)

The user (HP 255 G7, Ryzen 5 3500U, Radeon Vega 8, 1366×768, Windows desktop build, Medium) finds the game "still
very laggy" and says the frame rate bothers him most. His hypothesis: the game renders the whole world at once.
This file is the audit of both RENDER-INV (lba3-rendering-investigator) and the lba3-performance-engineer brief;
RENDERING_AUDIT.md points here.

Labels: **MEASURED** (a probe in this repo produced it), **SOURCE-CONFIRMED** (read in the code or an official
document), **INFERRED** (follows from measurements, not measured directly), **NOT VERIFIED** (needs the laptop or a
human).

## 0. Conditions

- Code: base `9faa1a8` (ccr-adf00ea7-37ebl3 at block 7a), candidate = this branch. Three.js r180 (vendor/three).
- Machine: 4-core Linux container, **SwiftShader only (software rendering, no GPU)**, headless Chromium 141,
  1366×768, devicePixelRatio 1, Medium unless stated, automatic resolution off while measuring.
- What SwiftShader can show: exact counts (draw calls per pass, triangles, objects, programs, geometries) and the
  game's **JavaScript CPU time** (simulation and render submission), with the GPU queue drained before each timed
  frame (readPixels) so SwiftShader's raster is not charged to the frame. It cannot show the laptop's GPU time or
  its real frame rate: no FPS figure from here is the laptop's.
- Load: the first audit (§3) ran while other agents worked (load average 5–15 on 4 cores); the A/B runs and the
  breakdown ran with the machine to myself (load 2–4), base and candidate interleaved (`ab.sh`).
- Probes and raw results: `docs/lba3-visual/evidence/RENDER-INV/` (`*.mjs`, `results/*.json|txt`).

## 1. Performance contract (targets, not promises)

| Profile | Steady play (street, harbour, house, combat, regions) | Stutters | Transitions | Memory |
|---|---|---|---|---|
| Preferred | 60 FPS: frame p50 ≤ 16.7 ms, p95 ≤ 20 ms | no frame > 100 ms in view; ≤ 1 % of frames > 33 ms | long frames only behind the black fade; fade-in never skipped | plateaus over repeated doors and travel |
| Low-end fallback | stable 30 FPS: p95 ≤ 33.3 ms (Settings → Frame rate limit 30 gives even pacing) | as above, > 50 ms ≤ 1 % | as above | as above |

Loading-screen time is reported separately (startup: build + shader preparation). Average FPS alone never passes a
profile. **Hardware acceptance: NOT VERIFIED** (no GPU here); the user's benchmark (§9) is the judge.

## 2. Architecture as built (SOURCE-CONFIRMED unless marked)

- **Startup** (main.js `Game` constructor): Citadel (`buildWorld` + spaceport, town life, city dressing) and then
  **every other area**: all interiors, Zeelich, underground, Desert Island, condenser, temple, wizards, LBA1 places,
  the Hamalayi, observatory, upper rooms, valve room, the developer arena and the 11 Zeelich islands — all in one
  scene, each area a `THREE.Group` hidden with `visible = false` until entered. Then every actor of the story is
  created, and `prepare()` compiles the shader programs of the whole scene, uploads every texture and Citadel's
  geometry behind the loading screen. Other areas' geometry is uploaded at their first entry (FRAME-1).
- **Main loop**: `requestAnimationFrame` → `advance(real)`: the displayed interval split into fixed steps of at most
  1/30 s, at most 4 per displayed frame (MAX_STEP/MAX_SUB); a longer gap is dropped, not caught up; a tab coming back
  resets the clock (visibilitychange). The last step renders. Optional frame-rate limit (FRAME-1).
- **Render**: `Renderer.render` → `pre` (FarCull: actors > fog end / 250 m and sub-pixel actor parts out of the
  frame; BlobBatch: all blob shadows in one instanced draw) → world matrices of **shown subtrees only**
  (drawcull.js, PERF-2) → EffectComposer: scene pass (shadow map + main pass into a 2× MSAA half-float target at
  Medium), output pass (tone mapping), FXAA (Low), bloom (High).
- **Visibility**: three r180 skips an invisible object and its whole subtree in both the main pass and the shadow
  pass (`projectObject`: `if (object.visible === false) return;`, read in vendor/three/build/three.module.min.js),
  plus per-object frustum culling. shadowcull.js merges an area's static casters into depth-only batches per 24 m
  cell, tests each caster's shadow volume against the view, drops small props' shadows beyond 18–24 m, and hides
  static pieces under 4 px (Medium) / 7 px (Low) except within 16 m of Twinsen. No occlusion culling.
- **Simulation**: every *present* NPC and enemy is updated every step wherever it is (track movement, physics,
  skeletal animation); Citadel's 23 world updaters run every step even indoors; the current room's updaters run.
- **Lights**: one sun with a shadow map (1024 at Medium), a hemisphere light, and a pool of 4 point lights (Medium)
  fed from ~170 lamp markers placed by all areas (LightPool picks the nearest shown ones each frame).
- **Maps** (MAP-1): each outdoor area's map is drawn from the built world in the background in the first seconds
  after arriving (`hud.mapTick` → mapdraw.js generator, asked for 2.5 ms a step), cached for 6 areas.
- **Desktop**: Electron with `ignore-gpu-blocklist` and `force_high_performance_gpu`; ANGLE/D3D11 on Windows;
  software GL only with LBA3_SOFTWARE_GL. perf.js picks Low for Vega 3–11 / Intel HD-UHD and for a software
  renderer (High only under automated tests).

## 3. Is the whole world rendered? (MEASURED, `audit.mjs`, `results/audit-base.json`, Medium)

Each draw call was attributed to the area its object belongs to (main pass / shadow pass separately).

| Situation | Draw calls (shadow) | Triangles main + shadow | Areas drawn | Shown objects visited / in scene | Present NPCs updated (of them far away) | Sim / render CPU ms |
|---|---|---|---|---|---|---|
| Title screen (orbit 110 m over Citadel) | 586 (62) | 1.67 M | Citadel + its 51 people | 3 947 / 9 119 | 51 (32) | 5.0 / 24.8 |
| Opening, 8 s (Citadel wide shot) | 498 (39) | 1.29 M | Citadel | 1 780 / 9 183 | 18 (16) | 3.4 / 19.9 |
| Opening, 30 s / 60 s (in the house) | 102 / 57 | 0.43 M / 0.42 M | house | 958 / 9 186 | 18 (16) | 2.0 / 7.0 |
| Twinsen's house | 99 (3) | 0.44 M | **house only** | 900 / 9 127 | 18 (17) | 2.8 / 5.0 |
| Town street (bench route, free camera) | 288 (59) | 1.08 M | Citadel | 1 752 / 9 122 | 18 (4) | 6.5 / 10.2 |
| Harbour, looking along the coast | 321 (35) | 1.20 M | Citadel | 1 735 / 9 122 | 18 (4) | 6.8 / 13.8 |
| House door, looking over the town | 167 (33) | 0.85 M | Citadel | 1 762 / 9 122 | 18 (4) | 3.9 / 7.6 |
| Combat (arena, 7 enemies, throws) | 186 (70) | 0.23 M | arena + its enemies | 1 019 / 9 346 | 18 (18) | 3.5 / 5.7 |
| Zeelich | 130 (27) | 0.40 M | **Zeelich only** | 1 885 / 9 368 | 18 (18) | 6.8 / 3.5 |
| Desert Island | 29 (7) | 0.06 M | **Desert only** | 1 474 / 9 394 | 18 (18) | 8.9 / 2.6 |
| House again (revisit) | 99 (3) | 0.44 M | house only | 1 116 / 9 394 | 18 (17) | 2.9 / 5.8 |

(Sim/render times: CPU proxy at load 5, see §0. The desert's and Zeelich's 7–9 ms of simulation were the map
being drawn in the background: §6 F1.)

**Answer: no — not for drawing.** In every play situation only the current area (plus actors near the camera and a
few scene-level objects: sky, water, particles, the blob batch) is submitted, in the main pass and in the shadow pass
(MEASURED; SOURCE-CONFIRMED by three's `projectObject`). The two views that do show the whole of Citadel are the title
orbit and the opening's first wide shot, by design; they are the heaviest frames in the game (586 / 498 calls).

**When Twinsen is inside his house, what do Citadel, Zeelich, the desert and the rest still cost?**

| Cost | What still happens | Size (MEASURED) |
|---|---|---|
| A. Memory | every area is built and kept: geometry arrays, textures, materials; GPU copies of every area already visited (never released) | renderer process 0.95 GB RSS and GPU process 0.94 GB at the title; 1.13 GB / 1.14 GB after visiting 4 regions (`memory.mjs`; SwiftShader keeps "GPU" memory in RAM, as an integrated GPU's shared memory does). 3 724 geometries, ~460 textures, 85 programs |
| B. Scene objects | 9 127 objects in the scene, of which 4 605 under other rooms/regions and 1 357 under Citadel | counted |
| C. Traversal | hidden subtrees are skipped by the matrix update and the render (PERF-2); still walked: the shown-subtree walk itself, the light pool's ~170 lamp markers, FarCull's actor list, BlobBatch's blob list | ~0.1 ms each |
| D. Main-pass draws | none from other areas | 0 |
| E. Shadow / other passes | none from other areas | 0 |
| F. Simulation | Citadel's 23 world updaters (water, dogs, shuttles, town life), its 17 present people (track walking, physics, skeletal animation: 29 rig updates a frame incl. enemies), present enemies elsewhere | world.update 0.2–0.3 ms, people 0.5–0.7 ms, enemies 0.3–0.4 ms, rigs 0.5 ms (CPU proxy) |

So the user's hypothesis is **right about memory and startup** (everything is built and kept from the start) and
**wrong about per-frame drawing** (hidden areas cost no draw calls, no shadow draws and no matrix updates; their
simulation costs ~1 ms of CPU here).

## 4. Where a frame's time goes (MEASURED, `breakdown.mjs`, quiet machine, load 3–4, medians of 40 frames)

| Situation | Calls (shadow) | CPU total | render submit | of which shadow pass | world matrices | simulation | largest simulation parts |
|---|---|---|---|---|---|---|---|
| Street | 200 (43) | 9.9 ms | 6.7 | 1.2 | 0.9 | 2.9 | people 0.5, shadowcull 0.5, enemies 0.3 |
| Harbour | 320 (35) | 11.1 ms | 8.2 | 1.2 | 0.9 | 3.2 | Citadel updaters 0.6, people 0.5 |
| House | 99 (3) | 5.1 ms | 3.0 | 0.2 | 0.4 | 2.0 | people 0.5, enemies 0.3 |
| Combat | 191 (70) | 6.4 ms | 3.2 | 0.6 | 0.5 | 2.7 | enemies 0.7, people 0.5 |
| Zeelich | 131 (27) | 6.7 ms | 3.9 | 0.7 | 0.6 | 3.0 | enemies 0.6, people 0.5 |

Steady play here costs 5–11 ms of game CPU per frame, of which **render submission (≈ 27–33 µs per draw call in
three's JavaScript) is 60–75 %**. On the laptop PERF-2 measured ~48 µs per call (26 ms at 542 calls), i.e. its CPU
runs this code ~1.5× slower (INFERRED): about 15–17 ms on the street and harbour at Medium — at the 60 FPS budget
before any GPU time. What the Vega 8 spends per frame (MSAA 2× resolve on a half-float target, PCF shadows, four
point lights per lit pixel, overdraw) cannot be measured here: **NOT VERIFIED**. The benchmark now reports the GPU's
own time (§9) so the laptop's run tells which side limits it.

## 5. Symptoms, separated

| Symptom | Finding | Status |
|---|---|---|
| Slow startup | Every area is built before the title: build 10–15 s, shader preparation 35–44 s here (SwiftShader compiles on the CPU; the laptop's driver time is unknown). Largest builders: Citadel 2–3.3 s, the 11 islands 2.9–4.1 s, interiors 1.2–2 s, Zeelich 1.2–1.6 s, desert 0.6–0.8 s | MEASURED here; laptop NOT VERIFIED. Not changed (§7 R1) |
| Persistently low FPS (Citadel) | CPU: draw submission (200–320 calls) dominates; GPU unknown | MEASURED (CPU), GPU NOT VERIFIED |
| Short stutters after arriving anywhere | The map's background build: slices of up to 100–165 ms (asked 2.5 ms), +5–11 ms per frame on average for 2–6 s after each arrival, a new game or Continue, and again on a revisit once 6 other maps were cached; each catch-up step drew another slice | MEASURED; **fixed** (F1, F2) |
| Long freezes | None in view on any measured route. Behind the black fade: first entry to an area builds its shadow batches (27–390 ms, Otringal the largest) and walks the scene for shaders (~100 ms); first entries upload the area's geometry | MEASURED (CPU parts); behind black by design (FRAME-1) |
| First use of weapons/effects | Ball, blowgun, laser, lightning, penguin, protection, conch, lantern, hop-pack: **0 new shader programs** on first use; a few new geometries (1–14) | MEASURED (`firstuse.mjs`) |
| Save / load | Save 0.6 ms max (630 bytes); applying a save 3.5 ms | MEASURED |
| Input latency | Input is read once per simulation step; no change made. Frame-time is the main lever | NOT VERIFIED (needs a human) |
| Memory growth | 20 house door cycles + 5 Zeelich round trips: geometries, textures, programs, scene objects unchanged (1 419 / 475 / 87 / 9 394); 30-minute session: §8 | MEASURED |

## 6. Findings (ranked by measured impact × risk)

**F1 — the map's background build ran far past its budget (stutter after every arrival).**
Symptom: frames of 30–165 ms and +5–11 ms average CPU per frame for 70–180 frames after arriving in an area, after a
new game / Continue, and on a revisit once the 6-map cache had moved on. Evidence: CPU profile in the desert
(`profile.mjs`): mapdraw.js `build` + `B.step` = 9.1 ms of the frame; `mapcost.mjs`: slices up to 100 ms (Citadel),
58–80 ms (regions) when 2.5 ms were asked. Cause: the generator yielded every 16 384 terrain vertices / 8 rows /
40 000 brick pixels and never in the classify pass, so one `next()` ran for up to 25–100 ms; `step(ms)` only checks the
clock between yields. Change: yields every 2 048 vertices, every row, every 4 000 brick pixels, every 256 bricks /
65 536 pixels in classify, and before the vector pass (src/game/mapdraw.js; same computation and output). Result
(`mapchunks.mjs`, quiet round): ~200 chunks → 970–2 450 per map; chunk p95 7–10 ms → 0.4–1.1 ms; chunks over 10 ms
5–9 → 0–2 per map. Tradeoff: the map finishes a little later after an arrival (same total work). Status: MEASURED.

**F2 — picture-only work repeated on catch-up steps.** Symptom: on a slow machine a displayed frame runs 2–4
simulation steps, and each step drew another map slice and recomputed LOD tiles and the light pool. That makes a
slow frame slower. Evidence: SOURCE-CONFIRMED (main.js `advance` → `frame` per step → `updatePlay` → `hud.mapTick`;
`frame` → `updateLod` / `updateKitLod` / `lightPool.update`). Change: `Game._inner` marks the catch-up steps; the map
tick, LOD and light pool run on the drawn step only (main.js). Simulation, input, physics, animation and timers still
run every step (unchanged timing). `game.step()` (tests) is unaffected. Result (F1+F2, `arrival.mjs`, 2 steps per
displayed frame, CPU per frame in the first 5 s after arriving): §10. Status: MEASURED.

**F3 — everything is built at startup and kept (memory, startup time).** §3 A/B, §5. Not changed: deferring an
area's construction touches story and travel code (story/arsenal.js decorates `isle_undergas` at startup, travel.js
reads every island's pad at startup, mapdraw.js iterates all rooms, crystal spots read Zeelich's mill, wizards.js
needs the desert) — SOURCE-CONFIRMED. Recommended plan: R1 (§11). Status: MEASURED cost, NOT CHANGED.

**F4 — the title and the opening's first shot draw the whole of Citadel** (586 / 498 calls, all 51 people present at
the title). By design of those shots; not changed (a visual decision). Status: MEASURED.

**F5 — Citadel's draw submission is the steady-state CPU cost** (200–320 calls, §4). What is left after PERF-2 and
VP-10 is one draw per distinct texture, instanced kind and character part (PERF-2's analysis); more merging belongs to
the graphics agent's town/architecture files (block 7b). Status: MEASURED, NOT CHANGED (ownership).

**F6 — simulation of far areas** (Citadel's people and updaters while indoors: ~1 ms here). Distance-reduced
animation was considered (Unity's Animator culling modes do this) and **not implemented**: ~0.3 ms of rig updates
measured, below the risk of cinematics and story actors showing stale poses after a cut. Status: MEASURED, NOT
CHANGED (not justified).

**F7 — shader warm-up walk behind the black fade** (~100 ms on first entries; once seen on a revisit). Behind black,
does not reach the screen. Status: MEASURED, NOT CHANGED.

## 7. Research (brief; what applies here)

Read for this audit (official pages, via search extracts): Unreal World Partition, three.js disposal, Godot
occlusion culling, Unity AnimatorCullingMode, MDN requestAnimationFrame. The other links are the performance
brief's references. The three.js behaviour quoted is read in the vendored r180 build itself.


| Technique | Problem it solves / when it helps | Limits | Here | Smallest useful application | Source |
|---|---|---|---|---|---|
| Frustum culling | skip objects outside the view | needs bounds; skinned meshes need correct bounds | three's per-object test (r180) | in place | three.js r180 source (vendor), SOURCE-CONFIRMED |
| Region activation / partitioning | only the active area is drawn and simulated | memory stays unless released | drawing: yes (hidden groups); simulation: no | keep as is; story actors must keep simulating | Unreal World Partition (distance-based cell streaming): https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine |
| Streaming / prewarming neighbours, explicit lifecycle (unloaded → loading → ready → active → cached → released) | startup time and memory | construction must be budgeted or it becomes a doorway hitch; dependencies between areas | not present (all at startup) | R1 (§11) | Unreal level streaming: https://dev.epicgames.com/documentation/unreal-engine/level-streaming-in-unreal-engine |
| Resource disposal | free GPU/CPU memory of areas not in use | shared geometry/material/texture must not be disposed while used; re-upload costs on revisit | never released | R2 (§11) | three.js manual: https://threejs.org/manual/en/how-to-dispose-of-objects.html |
| Batching / instancing in spatial groups | draw-call CPU | one multi-draw still issues every sub-draw on ANGLE/D3D11; merging everything defeats culling | PERF-IGPU/PERF-2: cells, BatchedMesh, instanced blobs | more town merging (graphics agent) | three.js manual "optimize lots of objects": https://threejs.org/manual/pages/optimize-lots-of-objects.html |
| Shadow-caster culling, distance, update rate | shadow-pass calls | static-only cached maps need a second map | shadowcull.js (cells, view test, small-prop distance) | in place; actors use blob shadows | (project code) |
| Distance-based animation updates | CPU for off-screen/far characters | stale poses after a camera cut | not used | not justified (F6) | Unity AnimatorCullingMode: https://docs.unity3d.com/ScriptReference/AnimatorCullingMode.html |
| Occlusion culling | hidden geometry behind walls in closed spaces | costs CPU; little benefit in open scenes | none | not justified: interiors are separate hidden groups, outdoors is open | Godot occlusion culling: https://docs.godotengine.org/en/4.3/tutorials/3d/occlusion_culling.html |
| Light budget | per-pixel cost of lights | fewer lamps look flatter | light pool: 8/4/2 by preset | in place | (project code) |
| Post-processing, render resolution | GPU fill | not a CPU cure | MSAA 2×, half-float target, dynamic resolution with hysteresis/back-off (PERF-IGPU) | judge by the laptop's GPU time (§9) | three.js WebGLRenderer docs: https://threejs.org/docs/pages/WebGLRenderer.html |
| Time-slicing background work | keep frames inside budget | a slice can't be shorter than the work between yields | the map builder | F1 | MDN requestAnimationFrame (frame scheduling, paused in background tabs): https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| Profiling discipline | measure frame time, not FPS; budget per frame | — | Perf, bench, probes | — | Unity profiling guide: https://unity.com/how-to/best-practices-for-profiling-game-performance |

## 8. Repeated transitions and a long session (MEASURED)

- 20 house door cycles and 5 Zeelich round trips (`audit.mjs` cycles): geometries 1 419 → 1 419, textures 475 → 475,
  programs 87 → 87, scene objects 9 394 → 9 394, shadow areas 5 → 5.
- 30-minute session (`session30.mjs`): SESSION30_RESULT

## 9. Benchmark on the laptop (the judge)

1. Install the new build; start the game, Settings → Graphics **Medium** (as played), Frame rate limit **Off**.
2. Start or continue a game; wait until Twinsen stands in Citadel.
3. Esc → **Benchmark**. Don't touch anything until the results appear (a few minutes: Low, Medium, High, then the
   Medium breakdown). Keep other programs closed; the laptop on mains power.
4. **Copy**, and send the whole text.
5. If time allows: Settings → Frame rate limit **30**, play a minute on the street and say whether it feels steadier.

What to read in it: per route `frame p50/p95/p99`, `>33ms` / `>100ms` counts and the longest frames; `sim CPU` and
`render submit CPU` (the game's CPU); **`GPU time`** (new: the GPU's own time per frame, when the browser offers a
timer query — the `memory:` line says "GPU timer: yes/not offered"); `limited by (estimate)` compares them; the
`arrival` route (new) measures the first seconds after arriving in Zeelich, Desert Island, the Hamalayi and Citadel
(map drawn afresh); `startup:` now lists Citadel's build time and the largest other areas.

## 10. Before / after (MEASURED, SwiftShader CPU proxy, matched conditions)

ARRIVAL_TABLE

Steady state (street, harbour, house, combat, Zeelich, maps finished): STEADY_RESULT

## 11. Remaining limits and recommendations

- **R1 — build areas on demand (startup, memory).** Keep Citadel + the interiors of the current area at startup;
  build Zeelich, the islands, the desert, the Hamalayi and the underground on first need, behind a loading card,
  in budgeted slices with an explicit lifecycle (unloaded → loading → ready → active → cached → released), a timeout
  and a fallback (never a permanent black screen). Needs: story/arsenal.js decoration moved to the area's
  build, travel.js points read lazily, mapdraw.js iterating built areas only, crystal spots and wizards.js
  dependencies resolved. Expected: startup build −60–75 % (the non-Citadel builders are 70–75 % of build time
  here), renderer memory down by the unbuilt areas. Owner: a future block with the story owner.
- **R2 — release GPU copies of areas left long ago** (dispose geometries of areas not visited for N transitions,
  keep the CPU arrays; re-upload behind the black frame on return). Only if the laptop shows memory pressure.
- **R3 — fewer Citadel draw calls** (town/architecture merging): graphics agent, block 7b.
- GPU time, real frame rate, real stutters, input feel and the desktop installer on the laptop: **NOT VERIFIED**.

## 12. The seven answers

1. **Was the entire world being rendered?** No (MEASURED, SOURCE-CONFIRMED): only the current area is drawn, in
   the main and shadow passes. Everything is **built and kept in memory** from startup (MEASURED), and the title and
   the opening's first shot draw the whole of Citadel by design.
2. **What was the main cost?** Steady play: draw-call submission on Citadel (60–75 % of the game's CPU, MEASURED);
   GPU time unknown (NOT VERIFIED). Stutters: the map's background build after every arrival (MEASURED, fixed).
   Startup and memory: building every area up front (MEASURED, not changed).
3. **What was already optimised?** Hidden-area skipping (three), shown-only world matrices, far-actor and sub-pixel
   culling, instanced blob shadows, merged towns and textured materials, static shadow batches per cell with view
   tests, small-prop culling, vegetation BatchedMesh LOD, a fixed light pool, shader precompile at load, geometry
   upload behind black, dynamic resolution with hysteresis, frame-rate limit (PERF-IGPU, PERF-2, FRAME-1).
4. **Which techniques were relevant?** Time-slicing background work (applied), region activation (already in place
   for drawing), streaming with an explicit lifecycle and resource release (recommended, R1/R2), batching (graphics
   agent); occlusion culling and distance-reduced animation were not justified by the numbers (§7).
5. **What changed?** F1 (map build slices), F2 (picture-only work once per displayed frame), the benchmark (GPU time,
   arrival route, >100 ms counts, startup per area, memory line, FRAME-1's "limited by"). Files: §13.
6. **What improved, by how much, under which conditions?** §10: stutter after arrivals (CPU per frame p95 and
   frames over 16.7/33 ms in the first 5 s, 2 steps per frame, SwiftShader CPU proxy, Medium 1366×768). Steady-state
   frames unchanged. Laptop: NOT VERIFIED.
7. **What remains unverified?** The laptop's GPU time and frame rate, whether the laptop is CPU- or GPU-bound at
   Medium, real stutter sizes, input feel, the packaged installer; startup time on the laptop.

## 13. Files changed

- src/game/mapdraw.js — generator yields only (F1). (MAP-1's file; no owner in block 7a.)
- src/main.js — `advance`/`frame`/`updatePlay`: `_inner` (F2).
- src/engine/perf.js — `GpuTimer` (EXT_disjoint_timer_query_webgl2), `gpuMs` in stats.
- src/engine/renderer.js — the timer around the composer while benchmarking.
- src/engine/bench.js — arrival route, GPU time, >100 ms, startup per area, memory line, FRAME-1's estimate.
- Region construction: not changed.
