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

The user's priority (2026-10-24): **Medium holds a steady 60 everywhere** on his laptop (street GPU p50 under ~15 ms
with margin); High is improved only where it is cheap and invisible.

## 1b. The laptop's own numbers (MEASURED by the user: docs/lba3-performance/results/laptop-build120.txt, -122.txt)

| Build | Window | Medium street frame / GPU | Medium interior | High street | Notes |
|---|---|---|---|---|---|
| 120 (= base 9faa1a8) | 1366×768 | 66.6 ms / — (no timer) | 49.8 ms | 100.6 ms | sim CPU 4 / 8 / 12 ms at Low / Medium / High; power state unknown |
| 122 (base + F1/F2 + timer) | 1366×697 | 16.8 ms / 18.6 ms GPU (43 fps) | 16.7 ms / 14.0 GPU (58 fps) | 33.5 ms / 36.0 GPU (25 fps) | plugged in; GPU timer works |
| 127 (+ F8 with folding, F9, per-pass timer; **no F10**) | 1366×768 | GPU 18.75 ms [scene 17.9, shadow map 0.8] | GPU 14.2 | GPU 35.4 [scene 33.1, shadow 2.3] | plugged in |

**Build 127's Medium breakdown (GPU p50, street / interior):** as is 19.2 / 14.1 · no shadows 16.0 / 13.2 · no lamps 18.0 /
13.6 · res ×0.6 15.8 / 12.4 · shadow map kept 17.6 / 14.0 · **no MSAA 9.3 / 8.8** · draw batches off 17.9 / 14.3.
**MSAA 2× is ~10 ms of the street's 19 ms and ~5 ms indoors** — more than everything else together; the shadow map's
drawing 0.1–1.6 ms; the lamps ~0.5–1 ms; the draw batches made no measurable GPU difference (17.9 off vs 19.2 on is
within run noise; their gain is CPU). Resolution ×0.6 removes only ~3.4 ms, while MSAA removes ~10: most of MSAA's cost
does not shrink with the drawn area — it is fixed per frame on the full-size target (clears and resolves). Build 127
still resolved depth and stencil on every frame (F10 came after it): Direct3D 11 has no depth/stencil resolve, so
ANGLE emulates it — INFERRED to be a large part of those ~10 ms; the next benchmark's `depth resolve on` line (the old
behaviour) against `as is` measures it.

- **The laptop is GPU-bound** at Medium and High (build 122: CPU 7.5–20 ms a frame against 25–36 ms of GPU at High;
  Medium street 18.6 ms GPU). Low runs at 59–60 fps everywhere (GPU 8–9 ms).
- Medium street breakdown (GPU p50): as is 18.1 · no shadows 15.9 · no lamps 16.7 · resolution ×0.6 14.5 ms. Interior:
  14.5 · 11.4 · 12.6 · 11.3 ms. Only ~3.6 ms of the street's 18 ms scales with the pixel count; shadows (~2.2 ms) and
  lamps (~1.4 ms) are the two separable costs; the rest (~10 ms) is neither pixels nor those two (geometry, draws,
  fixed full-screen work: unresolved, see §9's new per-pass times).
- **Build 120 → 122 is confounded** (window 9 % smaller; build 120's power state unknown, 122 plugged in). The
  interior's GPU work (50 ms frames → 14 ms GPU) cannot have been changed by code: between those builds only F1/F2
  (CPU), the benchmark and its timer changed (git diff 9faa1a8..0c4a30d, SOURCE-CONFIRMED). F1/F2 are credited only
  with what the matched A/B shows (§10). INFERRED: power/clock state explains most of that jump. NOT VERIFIED.
- **Build 120's "sim CPU grows with quality"** (4.2 / 7.8 / 11.5 ms in the interior) is not a GPU sync stall: a 50 ms
  frame runs 2 simulation steps and an 84 ms one 3 (`advance`: steps of at most 1/30 s), so the same ~4 ms step is
  counted 2–3 times (SOURCE-CONFIRMED by the loop; the numbers match). In build 122 every frame is one step again.
- Vsync quantisation: every frame time is a multiple of 16.7 ms; a GPU at 18 ms shows as 33 ms frames half the time,
  so getting the street's GPU time under ~15 ms is what turns 43 fps into a steady 60.

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

**F5 — Citadel's draw submission is the steady-state CPU cost** (200–320 calls, §4): addressed by F8 for every area.
On the laptop the frame turned out to be GPU-bound (§1b), so F8's CPU saving matters less there than its effect on the
GPU's per-draw work (NOT VERIFIED). Status: MEASURED, see F8.

**F6 — simulation of far areas** (Citadel's people and updaters while indoors: ~1 ms here). Distance-reduced
animation was considered (Unity's Animator culling modes do this) and **not implemented**: ~0.3 ms of rig updates
measured, below the risk of cinematics and story actors showing stale poses after a cut. Status: MEASURED, NOT
CHANGED (not justified).

**F8 — static pieces of one area drawn one call per builder and colour (every area).** Symptom: Citadel's street
submitted ~325 calls at Medium, 400 at High; the laptop pays CPU submission and (INFERRED) GPU-side driver time per
draw. Evidence (`who.mjs`, `whynot.mjs`): most static draws are pieces of different builders (town, harbour, props,
city dressing, the island's own) sharing a material or a plain colour inside one 48 m cell; each builder had merged
only within its own group. Change: `src/engine/drawbatch.js` — one mechanism for every area (Citadel, every room,
every region and island), built when the area is first drawn (Citadel behind the loading screen, others in their
black frame before the geometry upload): static, non-casting pieces merged per 48 m cell and material; plain-colour
and texture-only materials folded first by merge.js's own rules (colour, roughness/metalness, map transform into the
vertices); the originals left in place, out of the main pass through layer 0; every piece checked every frame after
the matrices (moved, hidden, removed, another material or geometry, geometry edited, casting, its folded material's
colour/roughness/metalness/visibility/map transform) and released at once, its cell rebuilt in the same frame.
Excluded: anything transparent, non-depth-writing, with its own shader edits or ShaderMaterial, skinned/instanced/
batched, `userData.keep`, not frustum-culled. Result: §10 (per region, Medium and High). Look: **folding is off** in the build — with it, batches
changed 0.003–0.3 % of the pixels (where two surfaces of different materials coincide the draw order decides which
shows; the workshop, the house, the Hamalayi); without it the batches are **pixel-exact** (one page, one frozen
frame, batches on vs off: 0 differing pixels in the workshop, `batchdiff.mjs FOLD=0`). Folding would save another
20–40 calls on Citadel (street 298 → 264, harbour 297 → 258, house 96 → 74; `who.mjs FOLD=0/1`): kept in the code,
switchable (`DrawBatch.fold`), for a decision with a visual review.
Tradeoff: tens of MB of merged geometry on Citadel (the originals are kept for the release path); a cell is rebuilt
(a few ms) the first time one of its pieces moves (a door opening). Status: MEASURED (counts, CPU); on the laptop
(build 127, with folding) no measurable GPU change — the batches are a CPU saving.

**F9 — lamps paid for on every lit pixel, also where they give no light (every area).** Symptom: the laptop's "no
lamps" saves 1.4 ms of GPU on the street and 1.9 ms in the interior at Medium (8 lamps at High). Evidence
(SOURCE-CONFIRMED, three r180 `lights_fragment_begin`): every point/spot light runs the full lighting model
(`RE_Direct`: GGX specular + diffuse) on every fragment of every lit material, also where its attenuated colour is
exactly zero (beyond its range: three's distance falloff is 0 there; the light pool's unused slots: intensity 0);
three already computes `directLight.visible` for it. Change (src/engine/renderer.js, at load, before any shader is
compiled): `if ( directLight.visible ) RE_Direct(...)` for point and spot lights (toon materials keep the plain loop;
the game has none; no texture is sampled inside the branch, so no derivative issue on ANGLE/D3D11). Result: pixel-exact
(within one page, one frame, patched vs three's chunk: 0 differing pixels on the Citadel views); SwiftShader's raster
time (a CPU proxy for GPU work): §10. Status: MEASURED (identity, proxy); laptop GPU saving NOT VERIFIED.

**F10 — the multisampled scene target resolved depth and stencil every frame, unused.** Symptom: on the laptop ~10 ms
of Medium's GPU time scales neither with the pixel count (resolution ×0.6 only saves 3.6 ms, and the target stays full
size) nor with shadows or lamps, and Low (no MSAA, so no resolve) runs at 8–9 ms. Evidence (SOURCE-CONFIRMED in three
r180's WebGLRenderer: `resolveDepthBuffer` / `resolveStencilBuffer` default to true, so every MSAA resolve blits colour
+ depth + stencil); nothing reads the resolved depth/stencil (the output and bloom passes sample colour; the hero's
stencil silhouette is drawn inside the scene pass). INFERRED: Direct3D 11 cannot resolve depth/stencil in hardware, so
ANGLE emulates the blit — possibly a large part of that fixed cost, NOT VERIFIED. Change (renderer.js): both targets
resolve colour only; three then discards the multisampled depth/stencil. Same pixels by construction (checked in one
page: §10). Result: SwiftShader −1 to −4 % (it resolves depth natively); the laptop's real saving is in the new
breakdown line "depth resolve on" (the old behaviour) vs "as is". Status: change MEASURED as identical; GPU saving
NOT VERIFIED.

Not done (considered): skipping the sun's shadow lookup on surfaces facing away from the sun would also be exact, but
it puts a shadow-texture lookup in per-pixel divergent control flow, which ANGLE's D3D11 translation may reject or
mis-sample — not worth a black screen. Lower MSAA, a smaller shadow map, fewer lamps, a lower resolution or an 8-bit
target would each save GPU time but change the look: not done; the benchmark now measures each (§9) so the choice can
be made with the user.

**F11 — antialiasing: Settings → Edges.** Symptom: MSAA 2× is ~10 ms of Medium's GPU time on the laptop (build 127).
Change: F10 (colour-only resolve) is the exact part; in case it is not enough, Settings → Edges offers **Smooth**
(MSAA, the default, unchanged) or **Fast** (FXAA, the single cheap full-screen pass Low already uses, at the preset's
resolution; renderer.js `setAA`, index.html one row, text/common.js three words). Look (same frame, Medium,
`aalook.mjs`, evidence `RENDER-INV/aa/`): FXAA keeps edges smooth but softens fine texture detail (the cobbles'
grout lines); 3–8 % of the pixels differ by more than 8 levels. Not made the default: the user decides after the
next benchmark (its `FXAA instead of MSAA` line prices it). SMAA (three's SMAAPass) is not vendored and was not added
in this block. Status: MEASURED (look); GPU saving: build 127's `no MSAA` (−10 ms street) bounds it, FXAA's own pass
NOT VERIFIED on the laptop.

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
- 30-minute session: NOT TESTED in this block (the probe `session30.mjs` is ready; the time went to the GPU work the
  laptop showed). The 20 + 5 transition cycles and longsession.mjs (30 cycles, earlier) show no growth.

## 9. Benchmark on the laptop (the judge)

1. Install the new build; laptop **plugged in**; other programs closed. Start the game, Settings → Graphics
   **Medium**, Frame rate limit **Off**.
2. Start or continue a game; wait until Twinsen stands in Citadel.
3. Esc → **Benchmark**. Don't touch anything until the results appear (a few minutes: Low, Medium, High, then the
   Medium breakdown on the street and in the house).
4. **Copy**, and send the whole text (and say whether it was plugged in).
5. Then, to see the choice: Settings → **Edges: Fast**, walk the street a minute, and say whether the picture is still
   good enough (edges, cobbles, text) and whether it feels smoother. Put it back to Smooth if not.

What to read in it:
- per route: frame p50/p95/p99, `>33ms` / `>100ms` counts, the longest frames; `sim CPU` and `render submit CPU` (the
  game's CPU); **`GPU time`** with its passes in brackets (`scene` — the main view, `shadow map`, `output`, `bloom` at
  High, `fxaa` at Low): the GPU's own time; `lamps lit`; `limited by (estimate)` compares GPU and CPU.
- the `arrival` route: the first seconds after arriving in Zeelich, Desert Island, the Hamalayi and Citadel.
- the Medium breakdown (one change at a time, street and house): `no shadows`, `no lamps`, `res x0.6` (as before);
  new: `shadow map kept` (the shadow map not redrawn: what drawing it costs), `no MSAA`, `8-bit target` (what the
  half-float colour buffer costs), `depth resolve on` (the old resolve, F10: its difference to `as is` is what F10
  saved), `draw batches off` (F8: what the batches save). Diagnostics only; none is a setting.
- `startup:` (Citadel's build and the largest other areas) and `memory:` (GPU timer yes/no).

## 10. Before / after (MEASURED, SwiftShader CPU proxy, matched conditions)

**Arrivals (F1 + F2; `arrival.mjs`, two interleaved rounds per side, CPU per displayed frame in the first 150
frames after arriving with the area's map not drawn yet, 2 simulation steps per frame as on a slow machine, Medium,
1366×768, GPU queue drained; round 1 / round 2):**

| Area | p50 ms before → after | p95 | max | frames > 16.7 ms | frames > 33 ms |
|---|---|---|---|---|---|
| citadel | 11.8 / 11.9 → 13.7 / 13.7 | 26.9 / 25.8 → 19.7 / 19.2 | 44.9 / 49 → 36.9 / 26.9 | 40 / 45 → 22 / 30 | 4 / 2 → 2 / 0 |
| zeelich | 18.3 / 18.2 → 15.1 / 15.5 | 26.7 / 27.3 → 21.8 / 21.5 | 44.1 / 45.3 → 30.5 / 42.5 | 94 / 97 → 47 / 52 | 2 / 2 → 0 / 2 |
| desert | 7 / 6.9 → 9 / 9.4 | 15.2 / 15.9 → 12.4 / 12.9 | 27.3 / 31 → 22.1 / 30 | 2 / 4 → 3 / 2 | 0 → 0 |
| hamalayi | 6.1 / 6.9 → 8.4 / 8.9 | 15.8 / 18.3 → 11.5 / 13.2 | 20.7 / 25.5 → 19.1 / 21.7 | 4 / 8 → 3 / 4 | 0 → 0 |

p95 and the long frames go down everywhere; p50 rises 2 ms in the desert and the Hamalayi because the same map work
is now spread evenly (one 2.5 ms slice a displayed frame) instead of in bursts. Map chunks (`mapchunks.mjs`, quiet
round): ~200 → 970–2 450 per map, chunk p95 7–10 → 0.4–1.1 ms, chunks over 10 ms 5–9 → 0–2.

**Every region's steady frame (F8 draw batches, F9 lamp skip; `regions.mjs`: one page, one frozen frame each way, free
camera, 1366×768, median of 7; calls = main + shadow pass, shadow pass in brackets; submit = the game's render CPU,
GPU queue drained; raster = SwiftShader's time to draw the frame, a CPU PROXY for GPU work, not the laptop's):**

| Area / view | Medium calls (shadow) off → on | submit CPU ms off → on | raster proxy, lamp skip off → on | High calls (shadow) off → on | submit CPU ms off → on | raster proxy, lamp skip off → on |
|---|---|---|---|---|---|---|
| citadel street | 360 (31) → 293 (31) -19 % | 10 → 8.6 -14 % | 2402.3 → 2372.8 -1 % (lamps 2 of 4) | 461 (42) → 394 (42) -15 % | 11.2 → 10.2 -9 % | 3103.5 → 3186 +3 % (lamps 2 of 8) |
| citadel harbour | 244 (24) → 200 (24) -18 % | 7.2 → 8.2 +14 % | 1986.3 → 1989.2 +0 % (lamps 2 of 4) | 331 (44) → 287 (44) -13 % | 8.7 → 9 +3 % | 2545.6 → 2531.6 -1 % (lamps 2 of 8) |
| citadel house door | 448 (28) → 345 (28) -23 % | 11.1 → 10 -10 % | 3083.7 → 3091.4 +0 % (lamps 1 of 4) | 545 (38) → 442 (38) -19 % | 12.1 → 10.8 -11 % | 3848.5 → 3809.1 -1 % (lamps 1 of 8) |
| house | 99 (3) → 74 (3) -25 % | 3.6 → 3.1 -14 % | 856.8 → 844.8 -1 % (lamps 4 of 4) | 112 (3) → 87 (3) -22 % | 3.1 → 3.6 +16 % | 1294.3 → 1325.1 +2 % (lamps 8 of 8) |
| workshop | 168 (3) → 112 (3) -33 % | 4.6 → 3.6 -22 % | 644.4 → 673.8 +5 % (lamps 4 of 4) | 181 (3) → 125 (3) -31 % | 4.3 → 3.7 -14 % | 1025.9 → 1039.1 +1 % (lamps 8 of 8) |
| well | 159 (34) → 155 (34) -3 % | 2.5 → 2.7 +8 % | 777.2 → 775.2 -0 % (lamps 4 of 4) | 173 (34) → 169 (34) -2 % | 2.9 → 2.8 -3 % | 1136.5 → 1132.7 -0 % (lamps 5 of 8) |
| office | 76 (5) → 64 (5) -16 % | 2.4 → 2.4 +0 % | 560.6 → 554.2 -1 % (lamps 4 of 4) | 89 (5) → 77 (5) -13 % | 2.9 → 2.7 -7 % | 894.9 → 909.9 +2 % (lamps 5 of 8) |
| zeelich | 127 (15) → 112 (15) -12 % | 5 → 4.4 -12 % | 1101 → 1107.9 +1 % (lamps 0 of 4) | 145 (20) → 130 (20) -10 % | 3.9 → 4.3 +10 % | 1458.7 → 1462.9 +0 % (lamps 0 of 8) |
| desert | 33 (8) → 32 (8) -3 % | 2.6 → 2.9 +12 % | 1071.5 → 1115 +4 % (lamps 0 of 4) | 47 (8) → 46 (8) -2 % | 2.8 → 3 +7 % | 1408.3 → 1472.5 +5 % (lamps 0 of 8) |
| hamalayi | 47 (9) → 40 (9) -15 % | 2.8 → 3.4 +21 % | 1116.8 → 1087.2 -3 % (lamps 0 of 4) | 60 (9) → 53 (9) -12 % | 2.7 → 2.9 +7 % | 1520.4 → 1543.6 +2 % (lamps 0 of 8) |
| isle otringal | 133 (18) → 125 (18) -6 % | 3.4 → 3.6 +6 % | 2614.3 → 2609.5 -0 % (lamps 0 of 4) | 146 (18) → 138 (18) -5 % | 3.3 → 3.3 +0 % | 3230.6 → 3239.1 +0 % (lamps 0 of 8) |
| isle tralu | 66 (6) → 46 (6) -30 % | 2 → 1.9 -5 % | 1456.5 → 1460.4 +0 % (lamps 0 of 4) | 79 (6) → 59 (6) -25 % | 2.5 → 2.3 -8 % | 1951.4 → 1951.5 +0 % (lamps 0 of 8) |
| isle liftdock | 53 (2) → 36 (2) -32 % | 2.1 → 1.8 -14 % | 733.7 → 754.4 +3 % (lamps 0 of 4) | 66 (2) → 49 (2) -26 % | 2 → 2.2 +10 % | 1224.1 → 1142.2 -7 % (lamps 0 of 8) |
| underground c3deep | 103 (5) → 69 (5) -33 % | 2.8 → 2.4 -14 % | 788.7 → 747.6 -5 % (lamps 4 of 4) | 116 (5) → 82 (5) -29 % | 3 → 2.6 -13 % | 1273 → 1287.2 +1 % (lamps 8 of 8) |

Draw calls go down in every area (−2 to −33 %; Citadel's street −19 % at Medium / −15 % at High, the house −25 %,
the workshop −33 %, the underground −33 %, Zeelich's islands −6 to −32 %); render submission CPU follows where the
calls fall most (−9 to −22 %); in areas with few calls the change is within the noise of 7 frames (±10–20 %).
SwiftShader's raster time does not move with the lamp skip (±5 %): its software rasteriser gains nothing from the
skipped branch; a GPU skips the work per pixel group — NOT VERIFIED until the laptop's run. The desert has 33 calls
to start with (little to merge).

Depth/stencil resolve off (F10, `gpulab.mjs`, SwiftShader): street raster −4 %, house −1 % (Vulkan resolves depth in
hardware; Direct3D 11 does not — the laptop's "depth resolve on" breakdown line will show its real cost).

**The benchmark's routes (tests/perfbudget.mjs, base 9faa1a8 vs this build with folding off; exact counts, one page,
Low → Medium → High; `results/perfbudget-base.log`, `suite/perfbudget.log`):**

| Route | Low calls | Medium calls (GPU draws) | High calls |
|---|---|---|---|
| street | 292 → 261 (−11 %) | 340 → 304 (−11 %) (522 → 486) | 437 → 397 (−9 %) |
| interior | 102 → 95 | 104 → 97 | 117 → 110 |
| transition | 358 → 324 | 430 → 384 | 543 → 487 |
| combat | 121 → 121 | 191 → 191 | 195 → 195 |

perfbudget's budgets: street Medium ≤ 300 (304) and Low ≤ 260 (261) still just fail (were 340 / 292 on base: FAIL
there too); "no shader compiles after loading" fails identically on base (34 / 43 / 6 programs on the street: the
test switches presets inside one page with the warm-up skipped under test stepping) — not a regression.

**Regression tests** (one at a time, GAME_URL=http://localhost:8176/, `suite/`): stability, transitions, townlife,
opening, chapter1, occluders, doorcull, travel, chapter4, zislands, holomap, dynres, timing: ALL PASSED (chapter1 prints
no verdict line: rc 0, no FAIL, no errors); perfbudget: 3 FAILED, all three failing on base too (above). After the Edges
setting and the merge of origin: menus, display (the settings screen at 640×360), stability, transitions: ALL PASSED.

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
- **R3 — the remaining GPU cost on the laptop**: decide from the next benchmark's per-pass GPU times and breakdown
  lines (shadow map kept / no MSAA / 8-bit target / depth resolve on). Options that change the look slightly and need
  the user's eye: MSAA 2× → FXAA or 1.25× supersampling on Medium; a compact HDR target (R11G11B10F); shadow map
  redrawn only when something moved; grass distance on Medium.
- GPU time, real frame rate, real stutters, input feel and the desktop installer on the laptop: **NOT VERIFIED**.

## 12. The seven answers

1. **Was the entire world being rendered?** No (MEASURED, SOURCE-CONFIRMED): only the current area is drawn, in
   the main and shadow passes. Everything is **built and kept in memory** from startup (MEASURED), and the title and
   the opening's first shot draw the whole of Citadel by design.
2. **What was the main cost?** On the laptop: **GPU time** (MEASURED by the user's build-122 benchmark: Medium street
   18.6 ms of GPU, High 25–36 ms); of the GPU time only ~20 % scales with the pixel count, shadows ~2.2 ms and lamps
   ~1.4 ms, the rest is fixed per frame (INFERRED suspects: the depth/stencil resolve F10, per-draw work F8). Here on
   SwiftShader: draw-call submission is 60–75 % of the game's own CPU. Stutters: the map's background build after every arrival (MEASURED, fixed).
   Startup and memory: building every area up front (MEASURED, not changed).
3. **What was already optimised?** Hidden-area skipping (three), shown-only world matrices, far-actor and sub-pixel
   culling, instanced blob shadows, merged towns and textured materials, static shadow batches per cell with view
   tests, small-prop culling, vegetation BatchedMesh LOD, a fixed light pool, shader precompile at load, geometry
   upload behind black, dynamic resolution with hysteresis, frame-rate limit (PERF-IGPU, PERF-2, FRAME-1).
4. **Which techniques were relevant?** Time-slicing background work (applied), region activation (already in place
   for drawing), streaming with an explicit lifecycle and resource release (recommended, R1/R2), batching (graphics
   agent); occlusion culling and distance-reduced animation were not justified by the numbers (§7).
5. **What changed?** F1 (map build slices), F2 (picture-only work once per displayed frame), F8 (draw batches in every
   area, pixel-exact), F9 (lamps skip their math where they give no light, pixel-exact), F10 (colour-only MSAA resolve,
   pixel-exact), F11 (Settings → Edges: Smooth/Fast), the benchmark (GPU time per pass, arrival route, >100 ms counts,
   lamps lit, startup per area, memory line, FRAME-1's "limited by", eight new breakdown lines). Files: §13.
6. **What improved, by how much, under which conditions?** §10 (SwiftShader, Medium/High, 1366×768): arrivals'
   p95 −20 to −27 % and frames over 16.7 ms halved on Citadel/Zeelich; draw calls −2 to −33 % in every area, render
   submission CPU −9 to −22 % where calls fell most; F9/F10 pixel-identical, their GPU saving unmeasurable here. The
   laptop (build 122, plugged in): Medium 43–60 fps, High 25–34 fps, GPU-bound — before F8–F10. Whether Medium now holds
   60 on the street: NOT VERIFIED (the next benchmark).
7. **What remains unverified?** On the laptop: how much of MSAA's ~10 ms F10 removes, F9's GPU saving, FXAA's cost,
   and so whether Medium now holds 60 on the street (target GPU p50 < ~12–15 ms); real stutter sizes; input feel; the
   packaged installer. Here: the 30-minute session (not run).

## 13. Files changed

- src/game/mapdraw.js — generator yields only (F1). (MAP-1's file; no owner in block 7a.)
- src/main.js — `advance`/`frame`/`updatePlay`: `_inner` (F2); `DrawBatch` wired (Renderer.mid, prepare, warmScene)
  (F8); lamps lit recorded for the benchmark.
- src/engine/drawbatch.js (new) — the draw batches (F8).
- src/engine/merge.js — `plain`, `texOnly`, `twinOf` exported for the batches (unchanged behaviour).
- src/engine/shadowcull.js — leaves batched pieces' main-pass layer alone (F8).
- src/engine/renderer.js — lamp skip in three's lights chunk (F9), colour-only resolve (F10), `mid` hook, per-pass GPU
  marks.
- src/engine/perf.js — `GpuTimer` per pass (EXT_disjoint_timer_query_webgl2), `gpuMs`, lamps lit in stats.
- src/engine/bench.js — arrival route, GPU time per pass, >100 ms, lamps lit, startup per area, memory line, FRAME-1's
  estimate, eight breakdown diagnostics.
- index.html, src/game/text/common.js — Settings → Edges (one row, three words; the clarity editor's file, paused).
- Region construction and town/island geometry: not changed (the batches act at run time on what the builders made).
