# PERF-ARRIVAL — shader compiles in play, the High arrival route, startup

Task (2026-10-25/26): the user's laptop (AMD Vega 8, Direct3D 11 through ANGLE, Electron, 1366×768; results
`results/laptop-build150.txt`, `laptop-build145.txt`) is fine on Medium (58–60 fps everywhere); High is weak on the
arrival route (49.4 fps, GPU p95 20 ms, draw calls p50 394 / p95 625) and the street (56.5 fps); startup took 13.6 s
to build plus 5.9 s of shader preparation (build 145, plugged in). `tests/perfbudget.mjs` failed "no shader compiles
on the routes" (Low street 27, Medium street 35, High street 5 new programs).

Labels as in PERFORMANCE_AUDIT.md: **MEASURED** (a probe here produced it), **SOURCE-CONFIRMED** (read in the code
or three.js r180 as vendored), **INFERRED**, **NOT VERIFIED** (needs the laptop).

## 0. Conditions

- Code: base `b9de5a7` (ccr-adf00ea7-37ebl3 with ARTHUR-12), candidate = this branch. Three.js r180 (vendor/three).
- Machine: 4-core Linux container, **SwiftShader only** (software GL; no `KHR_parallel_shader_compile`, so every
  program compiles synchronously on the CPU), headless Chromium, 1366×768, devicePixelRatio 1. Other agents ran
  tests at the same time (load average 10–14 on 4 cores): **times here are noisy CPU proxies; counts are exact.**
  No frame rate or GPU time from here is the laptop's.
- Base served from an export of `b9de5a7` (port 8178), candidate from this worktree (port 8177).
- Probes (all in `docs/lba3-performance/PERF-ARRIVAL/`): `realplay.mjs` (the benchmark's routes played the way the
  game plays them: the page's frame loop parked, `Game.advance(1/30)` per frame, the real warm-ups — a scene change's
  warm-up behind the black fade, a preset change's recompile — running, and every program created while a route plays
  attributed to its object, pass and cache-key difference), `areawho.mjs` (one frame's draw calls by area part),
  `whynot.mjs` (why an area's pieces are not in a draw batch), `look.mjs` (same-frame captures; compare with
  `../lba3-visual/evidence/RENDER-INV/lookdiff.py`), `firstopen.mjs` (programs on first use of menus, bonuses, the
  ball, preset changes), `boottime.mjs` (startup), `bootprofile.mjs` (a CPU profile of startup). Machine-readable
  results: `results/perf-arrival.json`.

## 1. Shader programs compiled during play (goal 1)

### What compiled late, and why (MEASURED with `realplay.mjs`; causes SOURCE-CONFIRMED in three r180)

The in-game benchmark's order (start on Medium, then Low → Medium → High, each preset's five routes), base:

| Preset / route | Programs made while the route played | Which |
|---|---|---|
| Low street | 1 | the FXAA pass (first Low frame) |
| Medium arrival | 1 | a shadow depth program (Zeelich, instanced caster with instance colours) |
| High street | 13 | 8 bloom-pass programs (first High frame) + 5 shadow depth programs |
| High transition | 1 | a depth program for a shadow batch |
| High arrival | 3 | depth programs (Zeelich) |
| every other route | 0 | |

Five causes:

1. **Post-processing passes** (bloom on High, FXAA on Low or with Edges: Fast). `Renderer.precompile()` compiles the
   scene only; a pass's program depends on whether it draws to the screen and on the shadow filter type (three puts
   `shadowMapType` in every non-raw program's key), so it changed with the preset and compiled on the preset's
   first frame.
2. **Shadow casters the culling had switched off.** The old warm-up made one depth program per kind of caster
   *casting at that moment*; shadowcull.js turns casters off outside the view and merges static ones into depth-only
   batches (their own `castShadow` off), so whole kinds were never prepared.
3. **Kinds that differ by instance colours** (`instancingColor` is in the depth program's key; the old kind key did
   not have it).
4. **The light count of the frame before.** three draws the shadow map *before* it takes in the frame's lights
   (`WebGLRenderer.render`: `shadowMap.render`, then `setupLights`), so a warm-up frame right after the light pool grew
   from 4 to 8 lamps (Medium → High) made every depth program for 4 lamps; the real frames then made them again for 8.
5. **Order-dependent depth programs.** three draws every caster with one shared depth material and sets its side and
   map per caster without marking it changed; it re-picks the program only when the caster's kind changes (instanced,
   batched, skinned…). Which side × map programs exist therefore depends on the order of the casters: Zeelich's "plain
   mesh, textured, front side" program was made only when such a caster followed an instanced one in the list.

The test's figures (Low street 27/28, Medium street 35) were mostly the test itself: `perfbudget.mjs` switches presets
inside one page under the tests' fixed stepping, where the game skipped the preset change's warm-up altogether
(`warmGraphics` returned under `testFreeze`), so every Low and Medium variant compiled on the first route.

### Changes

- `src/engine/warmup.js` (new):
  - `warmShadowPrograms`: candidates are every mesh that casts or may cast (shadowcull's members and solo pieces,
    every instanced and batched mesh), the kind key has instance and batch colours, the plain variant of each
    instanced/batched kind (kit.js shadow stand-ins), and every side × shadowSide of the shadow batches. The warm-up
    frame is drawn twice, first with only the lights in it (cause 4); each copy marks the depth material changed just
    before it is drawn, so its own program is made whatever the order (cause 5).
  - `warmPassPrograms`: compiles each enabled pass's materials for the target it will draw into (the screen for the
    last pass), with no drawing.
- `src/main.js` (renderer/prepare sections only): `warmShadows` calls the above with shadowcull's casters;
  `warmMenus` compiles the behaviour menu's portraits (own scene, own lights, drawn to the screen: 2 programs on the
  first Ctrl in play); `warmGraphics` (a preset change) also warms the passes and the menu, and runs under the tests'
  fixed stepping too, without the hold, so a test sees the programs a player gets; `prepare` warms the menu and
  records its parts (below).
- `src/engine/renderer.js`: `setAA` (Settings → Edges) warms the FXAA pass.
- Scene-change warm-ups (`warmScene`) are unchanged.

### Result (MEASURED)

| | base | candidate |
|---|---|---|
| `perfbudget` "no shader compiles on the routes" (Low/Medium/High, 4 routes each, one page) | **FAIL**: Low 28/3/0/2, Medium 35/1/0/3, High 5/0/0/0 | **PASS**: all 0 |
| `realplay.mjs`, benchmark order, 5 routes × 3 presets | 19 programs on 5 of the 15 routes (table above) | **0 on all 15 routes** |
| `firstopen.mjs`: behaviour menu first opened | 2 | 0 |
| `firstopen.mjs`: preset change, programs in the frames after it | High 45, Low 26, Medium 5 | 0, 0, 0 (made by the change's own warm-up: 98, 74, 1) |
| programs ready at the title (Medium / High) | 86 / 94 | 93 / 101 (the extra depth and menu programs) |

Tradeoff: 7 more programs prepared at startup (small depth programs and the menu's; NOT VERIFIED how long they take
on the laptop's driver); a preset change compiles a little more behind its hold. Nothing changes on screen.

## 2. Arrival on High (goal 2)

### Finding (MEASURED, `realplay.mjs` every frame drawn, High)

There is no spike after arriving. Per drawn frame the arrival route's draw calls are flat within each area from the
first faded-in frame: Citadel 317–319, **Zeelich 633–652**, Desert Island 392–394, the Hamalayi 158–160 (the black
frame of each swap draws nothing; the fade-in frames draw the new area at its full count at once). The benchmark's
6 s window spans the end of Zeelich, all of the desert and the start of the Hamalayi, so its p95 (here 651, the
laptop's 625) is simply **Zeelich's view at High**, and p50 (394) the desert's. The laptop's GPU p95 of 20 ms on
that route is INFERRED to be the Zeelich frames as well (742k triangles, many large see-through cloud puffs at 4×
MSAA); NOT VERIFIED.

What Zeelich's arrival view submits at High (`areawho.mjs`): 152 calls are **cloud-puff sprites** (one draw call
per THREE.Sprite, ≈190 around the cliffs, one material), 266 are static pieces each alone in its 48 m cell with its
own material (eligible for a draw batch but with no partner: every Zeelich house builds its own textured materials),
65 are the three dogs' parts, 36 draw batches, 25 see-through pieces, 23 instanced, 49 shadow-pass calls.

### Change

`src/engine/spritebatch.js` (new): many sprites of one material in one draw call — an InstancedMesh with three's
own sprite shader, changed only where it reads the sprite's position and size (from the instance's matrix), so
billboarding, size, map, colour, opacity and fog are the same; the puffs are sorted back to front each frame like
three's sprites. Used for Zeelich's puffs (`zeelich.js` buildClouds) and the Zeelich islands' puffs (`zislands.js`).

### Result (MEASURED)

| Draw calls (main + shadow) | base | candidate |
|---|---|---|
| Zeelich arrival view, High (`areawho.mjs`) | 649 | **498** |
| Otringal arrival view, High | — | 82 (its puffs: 1 call) |
| Arrival route, High, p50 / p95 (`realplay.mjs`, every 8th frame) | 394 / 652 | 394 / 501 |
| Arrival route, Medium, p50 / p95 | 344 / 539 | 344 / 388 |
| Arrival route, Low, p50 / p95 | 321 / 475 | 321 / 322 |
| Street, interior, combat, transition (all presets) | unchanged | unchanged |

Look (`look.mjs`, High, the people hidden because their idle poses differ from run to run even base against base;
`lookdiff.py`): Zeelich ×3 views, Otringal ×2, Knartas: 0.000–0.105 % of the pixels differ at all, ≤ 1 level, except
one view (zeelich-c) where 0.008 % differ by more than 8 levels: a 15×8 px corner of one puff seen through a gap of a
see-through fence (the batch sits before the area's other see-through things in the draw order, renderOrder −0.5,
where each sprite used to be sorted on its own). Accepted as the same look.

Not changed: Zeelich's 266 single static pieces (folding their materials into shared ones is drawbatch.js's `fold`,
off because it moves a few pixels; RENDER-INV F8), the dogs' 21 parts each, High's distance detail (Medium hides
pieces under 4 px, High none). The laptop's High arrival figure after this change is NOT VERIFIED.

## 3. Startup (goal 3)

### Findings (MEASURED, `bootprofile.mjs`, SwiftShader under load)

- **Material cache keys PNG-encoded textures.** The builders' `pm(color, rough, { map })` (kit.js, zeelich.js,
  island.js; also `tm`, architecture.js, town.js, props-esmer.js `cm`) keyed their material cache with
  `JSON.stringify(extra)`; for a THREE.Texture that calls `Texture.toJSON`, which encodes the whole image as a PNG data
  URL (`canvas.toDataURL`) **on every call**: 20.7 s of the profile (`getDataURL`), most of Zeelich's build
  (esmerHouse, zeelife) and of Citadel's (the harbour nets, the station's gauges, the pipeline meters). This is CPU
  work on the laptop too.
- The rest of the build is spread thinly (mergeGeos 1.4 s, sculpt 1.4 s, the islands' layout 1.2 s of self time).
- "Shader preparation" here is mostly waiting for SwiftShader's synchronous compiles (the first synchronous GL call,
  `getMaxAnisotropy` during the texture uploads, waits for the whole queue). The laptop's driver compiles in parallel
  when `KHR_parallel_shader_compile` is offered (three uses it by itself: `compileAsync` polls it); whether ANGLE/D3D11
  offers it in the user's Electron is NOT VERIFIED — the benchmark now prints it.
- **507 programs** on the laptop is the count *after* the benchmark: every preset and every breakdown variant (no
  shadows, no lamps, basic shadow filter…) has its own set. At the title the game holds 86–101 (§1). Not a duplicate
  problem; no variants were merged.

### Change

`src/engine/textures.js` `keyJSON(o)`: the same JSON with each texture replaced by its identity and settings
(Texture.toJSON's own fields, the source's uuid instead of its pixels). `Texture.toJSON` already put the texture's own
uuid in the key, so equal keys mean exactly what they meant before; no material is shared that wasn't.

### Result (MEASURED, interleaved base/candidate boots, Medium, load 11–13; noisy)

| | base (2 boots) | candidate (2 boots) |
|---|---|---|
| build (loadTimes.total) | 43.9 s, 31.7 s | 18.2 s, 20.3 s |
| of which Zeelich | 14.0 s, 10.4 s | 0.7 s, 0.8 s |
| shader preparation | 75.0 s, 68.0 s | 62.6 s, 68.9 s |
| page load → title | 122 s, 103 s | 83 s, 93 s |

Part of the base's Zeelich time is the wait for the GPU queue moving into the preparation (§ above), so the
preparation is not comparable piece by piece; the PNG encoding (≈ 20 s of CPU here) is gone. Laptop: NOT VERIFIED;
expected to take a few seconds off the 13.6 s build (INFERRED: the encoding is pure CPU).

Not done (judged not cheap or not safe here): building far regions on their first visit (R1 in the audit: story,
travel, crystals and maps read them at startup; it would move seconds of building to a doorway), merging program
variants.

## 4. The benchmark (for the next laptop run)

`src/engine/bench.js`:
- each route's line ends with **"shader programs compiled while measured N (in the warm-up M)"**;
- the startup line adds the preparation's parts (paint, programs, textures, geometry, batches, shadowPrograms,
  firstFrame, in s) and how many programs were ready at the title;
- the memory line says that every preset and breakdown variant run has its own programs, and whether
  `KHR_parallel_shader_compile` is offered.

## 5. Verification

Tests, one at a time (R7 verdict policy, GAME_URL=http://localhost:8177/, load 10–14): perfbudget, drawcalls, stability,
transitions, doorcull, occluders, dynres, display, timing, menus, prologue, chapter1, audit, longsession, shipfiles: all
VERDICT PASS (no error, no missing file). A 30-minute session: NOT TESTED. QA.md "PERF-ARRIVAL" has the
verdicts. `perfbudget`: PASS (was FAIL on base).

## 6. Needs the user's laptop

1. Benchmark at Low / Medium / High: every route's "shader programs compiled while measured" should read 0.
2. High arrival (was 49.4 fps, draw calls p95 625; Zeelich should now be ≈ 150 calls lighter) and High street.
3. Startup (plugged in, cold): build (was 13.6 s) and the preparation's parts; whether parallel shader compile is "yes".
4. First Ctrl (behaviour menu) and a preset change in Settings: no hitch after the change has applied.

## ARRIVAL-2 (P87, 21.11) — the open stalls behind the arrival black

**Automated runtime only (SwiftShader)**: headless Chromium, ANGLE on SwiftShader, 4-core shared container, Medium,
960×540 (arrival-steps) / 1366×768 (the Citadel probe). No GTX 1050 or UHD 620 number here. Base = `a4e1fb45` (served
from an export, port 8191), candidate = this branch (port 8195), run one browser of mine at a time; other agents' test
browsers ran on the machine at times (each result file says for how long: `probes/quiet.sh` waits for them, then logs
it). Probes and raw results: `ARRIVAL-2/probes/`, `ARRIVAL-2/results/` (summary: `ARRIVAL-2/results/summary.json`).

### Units found (MEASURED; the prepLog's `u` and `probes/units.mjs`, every staged unit ≥ 6 ms with the label it began
after and the one it ended on)

| Arrival | unit (from > to) | what it is | base, quiet | base, loaded |
|---|---|---|---|---|
| Zeelich, tavern | `assign>array`, `array>array` | a texture array made: the 10–13 MB copy of its data (`slice`) and its upload (texSubImage3D; the second array's waits for SwiftShader's GPU process still on the first) | 17–35 (one 78) | 34–45 |
| Zeelich | `place>place` | overlapRuns placing 32 parts | ≤ 11 | **50, 95, 113** (3 frames in a row) |
| Zeelich, tavern | `cell part>cell part`, `cell part>cell` | a cell's merge (its arrays allocated, a piece's attributes) | 15–28 | 35–54 |
| Zeelich | `order>fixed draws` | overlapRuns' walk of the area, every draw's box, one unit | 4–13 | 43 |
| tavern | `fixed draws>parts` | a cut piece's vertices into world space, one unit | 34 | — |
| Citadel return | first frame drawn | 12 station / pipeline / harbour pieces leave their batches, cells rebuilt in it | 91 ms frame | — |

FULL-TEST's 154 ms Zeelich unit was not logged with its label. The same kinds of unit reached 113 ms (placing) and 62 ms
(a cell merge) here with another browser on the machine, so 154 is INFERRED to be one of these, enlarged by load. A trace
(`results/gc-overlap-*.txt`) shows how load enlarges them: with CPU taken by other processes, the V8 GC's main-thread
parts land inside the units. In one case a 28 ms cell merge held a 25 ms scavenge that was mostly waiting for a safepoint.
A 43 ms walk held 33 ms of incremental marking. MajorGC finalisation and the external-memory GC prologue (8–10 ms, set
off by the merges' large typed arrays) were inside 16–26 ms tavern merges.

The Citadel return: the 12 pieces left because of their **texture source's version** (3 → 5; `lookVer` reads it, the
settle's string check does not). The bump came from `merge.js twinOf`. Arriving in Zeelich, warmLayers → recipe made a
new twin, and `t0.clone()` (three's `copy()` sets needsUpdate) plus the explicit `map.needsUpdate` each counted as a
repaint of the shared canvas. three then sent the canvas again: 5.7 MB of uploads in that frame against 0.5 MB.

### Changes

- `src/engine/drawbatch.js` `UNIT` (set by `runFor` for each unit; Infinity outside, so a one-step build is unchanged):
  the staged build's long loops also end their unit once it has run 4 ms. This covers the pieces, order and assign loops;
  overlapRuns' fixed draws (now a list, then the same boxes in the same order), parts (also inside a cut piece's
  vertices and triangles) and placing; and a cell merge (at piece boundaries, between its array allocations, and
  between the attributes of a piece of ≥ 1 024 vertices, which now gets its own matrices). The same work runs in the same
  order: test A gives identical staged and one-step batches.
- `src/engine/texarray.js`: the array texture is made from a `subarray` view of its data, not a copy. layerOf only writes
  past the texture's layers, and a growth makes a new buffer, so the texels are the same.
- `src/engine/merge.js` `twinOf`: the clone keeps its source's version. The pixels did not change, and the twin's own
  version still makes three set it up. The cache key is the same, so the twin uses the same GPU texture.
- `tests/arrival-steps.mjs`: prints each kind's longest unit and its label (`[label ms]`), and the label of a slice
  over the limit.
- No visual change: the same batches (test A), the same programs, and the same texels. No new shipped file
  (`tools/game-files.mjs`: 509). Nothing in gameplay timing or saves was touched.

### Before / after (Automated runtime only, SwiftShader)

Longest draw-batch unit (ms, label) per arrival, `tests/arrival-steps.mjs` and `probes/units.mjs`:

| Run (conditions) | Zeelich | tavern | verdict |
|---|---|---|---|
| base, quiet (`before-1`) | 33 array | 35 (cell part 27) | FAIL: desert warm-up step 157 (a 146 ms compile unit, no program) |
| base, other browser 90 s beside (`q-base-1`) | 26 array | 36 cell part | PASS |
| base, load 5–7 from another agent's browser (`ab-base-1`) | **62 cell part** | **48 array, 45 cell** | FAIL ×2 (FULL-TEST's kind) |
| base, 3 busy loops beside (`units-before-load3`) | **113 place** | 41 cell part | (probe) |
| cand at 57c3787a, quiet (`after-1`) | **20 array** | **29 array** | **PASS 12/12** |
| cand, final code, other browser 96 s beside (`q-cand-2`) | **28 array** (slice 37) | **24 array** | **PASS 12/12** |
| cand at 57c3787a, load 5–7 (`ab-cand-1`) | 31 cell part | 53 cell | FAIL: tavern 53, desert 46 |
| cand, final code, load 5 → 8 (`ab-cand-2`) | 75 parts | 59 cell part | FAIL ×3 |
| cand, final code, other browser 256 s beside, load → 8.8 (`q-cand-1`) | 24 array | 107 cell part | FAIL ×2 |

Units probe, all draw-batch units, the same quiet window (`u-base-1` / `u-cand-1`, another browser 64 s beside each):

| | Zeelich: units > 10 ms; longest | tavern: units > 10 ms; longest |
|---|---|---|
| base | 3; 22.7 array, 15.1 array, 10.5 place | 3; 28.7 array, 15.5 cell part, 11.5 array |
| cand | 2; 24.5 array, 20.4 cell end | **1; 19.7 array**, next 7.1 |

Citadel return after Zeelich (`probes/q_look.js` via the ARRIVAL-STEPS runner, Medium, canvases flushed before each visit,
`c-base-1` / `c-cand-1`):

| | base | cand |
|---|---|---|
| pieces leaving their batches on the first frame drawn (still black) | 12 (all "texture source version 3→5") | **0** |
| that frame: ms / uploads / "submit other" | 91 ms / 94 (5 666 KB) / 58 ms | **48 ms / 65 (536 KB) / 21 ms** |
| longest black frame | 91 | 48 |
| longest preparation step | draw batches back 32 | geometry 36 |

The remaining 48 ms is the first frame's own draw and the shadow cache's full build on SwiftShader, not a preparation
unit.

### Reading

- On a quiet machine, every draw-batch unit of the three arrivals is now ≤ ~8 ms, except the texture-array upload
  (one GL call, 20–25 ms here, most of it waiting for SwiftShader's GPU process). The tavern's next unit is 7.1 ms.
  Splitting that upload by layers would cost an extra full mipmap pass per array (three makes mipmaps after every
  upload), so it was not done.
- With other browsers or busy processes on this 4-core machine, units of 45–107 ms still occur in **both** base and
  candidate, inside loops that now yield every 4 ms. That is the process being descheduled or GC pauses, not one long
  unit of work. `arrival-steps`' 40 ms check is not a reliable verdict under such load. Run it alone.
- The Citadel return's first-frame rebuild is gone (MEASURED) in two cases. In the benchmark's case (areas built
  beforehand), 12 pieces left on base and 0 on the candidate. In play's case, Zeelich was built on its first visit
  (`NOPREP=1`, `results/c-cand-lazy1.txt`): 0 pieces left and the uploads were 536 KB. That run's 1.5 s first frame is
  "submit main", SwiftShader's canvas raster stall: the flush before Citadel read 0 ms there. **NOT VERIFIED**: the
  interiors' and other builders' clones (interiors.js `tex()`, architecture.js `texMat`, props-esmer.js), built on a
  first visit to a room. They can move a shared source's version in the same way, and a return from a newly built room
  to Citadel was not probed.
- Hardware: NOT VERIFIED. The user's GTX 1050 "Citadel return 250 ms" in FULL-TEST §4 is PERFORMANCE_REPORT §3's
  SwiftShader figure (the first drawn frame, 53 → 250 ms there). It was never measured on the GTX 1050.

### Verification (final code, GAME_URL=http://localhost:8195/, one browser of mine at a time)

- `tests/arrival-steps.mjs`: **PASS 12/12** on a quiet machine (`q-cand-2`, the final code; `after-1` at 57c3787a too).
  Under load from other browsers it FAILs, in base and candidate alike (table above).
- `tests/travel.mjs` (Citadel ⇄ Zeelich and every route, arriving in play): PASS 27/27.
- `tests/lazyregions.mjs` (a door into an interior not built yet, in real time; a second visit builds nothing): PASS 13/13.
- `tests/merge.mjs` (twinOf / mergeStatic): PASS.
- `tools/game-files.mjs`: 509 files (unchanged).
- NOT TESTED: a 30-minute session; a probed return to Citadel from a room built on its first visit; any hardware.

## P87b (21.11) — the other builders' texture clones (follow-up to ARRIVAL-2)

**Automated runtime only (SwiftShader)**: headless Chromium, ANGLE on SwiftShader, 4-core shared container, Medium,
1366×768, areas left unbuilt as in play (`NOPREP=1`). Base = `8e0706bd` (an export, port 8211), candidate = this branch
(port 8212). One browser of mine at a time, and no other agent's browser at the start of any run (each result file logs
that count and the load). No GTX 1050 or UHD 620 number here. Probes: `P87b/probes/`; raw results: `P87b/results/`.

### What was probed

- **Census** (`probes/q_census.js`, `DEEP=1`): Citadel's street batched as in play, then the house and the well batched,
  then every one of the 126 groups not built at startup built in turn (`regions.buildGroup`, its hooks included) and
  its rooms batched straight after (`drawBatch.prepare`, as if visited). After each build: the batched pieces, in every
  area batched so far, whose map's texture source version moved, and every texture source already used in the scene
  whose version moved. Each version move is traced to its call site through a hook on three's `Source.needsUpdate`.
- **Play's path** (`probes/q_return.js`): the game's own scene changes, each area built on its first visit:
  Zeelich > Citadel > Desert Island > Zeelich > sewers > Zeelich > Knartas > Zeelich > the shaft > Citadel > the maze >
  Citadel. Each visit runs from the scene change until 1 s after the fade clears. Recorded per visit: pieces that left
  draw batches, uploads (KB), and canvases sent to the GPU a second time. A first run took Citadel's interiors instead:
  house > Citadel > tavern > Citadel > Bazoo > Citadel > pharmacy > Citadel > office > Citadel > Zeelich > Citadel >
  Desert Island > Zeelich > sewers > Zeelich > Citadel > house (`results/return-base-1.txt`).

### Findings (MEASURED, base)

- The three builders named in ARRIVAL-2 are not the cause. `interiors.js tex()` (exported as `texMat`) is not called
  anywhere. `architecture.js texMat` runs only in Citadel's startup build (`town.js`, `island.js`), and no first-visit
  build calls it. `props-esmer.js harbourTex` (an island's harbour) clones a canvas that nothing else uses yet; it was
  changed with the rest anyway (below). **Citadel and the interiors:
  no first-visit build moved a source that one of their batched pieces uses** (0 in the census). In play, 0 pieces left
  Citadel's, the house's or Zeelich's batches on any return.
- The same clone pattern is in thirteen places in builders that run on a first visit. Seven of them moved a texture
  source that something already built was using:

| Build (first visit) | call site | source | effect in play (base) |
|---|---|---|---|
| Desert Island | `desert.js` 566 | the sea | sent again: 1 canvas, 256 KB (mip 0) |
| sewers | `sewers.js` 75 | the sea | sent again: 1 canvas, 256 KB |
| each Zeelich island | `zislands.js` 2276 | the cloud-sea layers | sent again: 2 canvases, 2 048 KB (Knartas) |
| Ballastra ×3 | `ballastra/sea.js` 150 | the sea | census only (not on the route) |
| underground, maze, Zeelich | `underground.js` 959, `lba1room.js` 652, `zeelich.js` 1860 | hazard stripes (85 KB), the maze's stone (1.7 MB), chain (21 KB) | census only (version moved; not sent again on the route's frames) |

  In the census, five builds (Desert Island, the sewers, and Ballastra's three areas) also moved the sea under 2 of
  Zeelich's batched water pieces: 10 piece moves in all. That did not happen in play: on the play route 0 pieces left
  on the returns to Zeelich. INFERRED: in play those water pieces leave on Zeelich's first visit (68 pieces leave
  there, in its settle), while the census's `prepare` skips that frame's check. Take the census figure as an upper
  bound.
- So the problem in play is small: no piece left a batch, but 4 canvases (2.5 MB at mip 0) were sent again on the
  route's first visits, on top of the 15–110 MB that each first visit uploads anyway.

### Change

- `src/engine/textures.js` `cloneTex(t)`: the clone keeps its source's version, as `merge.js twinOf` has since ARRIVAL-2.
  The pixels and settings are the same. The copy's own version still makes three set it up: the same wrap shares the
  GPU texture already there, and a new wrap gets its own GPU texture, uploaded then.
- Used at the 13 clone sites in first-visit builders: `desert.js`, `sewers.js`, `ballastra/sea.js`,
  `ballastra/harbor.js`, `zislands.js`, `zeelich.js` (×4), `underground.js` (×2), `lba1room.js`, `props-esmer.js`.
  Startup-only clones (`architecture.js`, `town.js`, `island.js`, `statue.js`, `world.js`, `environment.js`) and the
  unused `interiors.js texMat` are unchanged. Every texture the change touches is painted once and cached, so no repaint
  depended on a clone's needsUpdate.
- No visual change was intended: the same texels, the same texture settings, and the same GPU texture or a new one with
  the same data (see the image check below). No new shipped file (`tools/game-files.mjs`: 509), and saves are untouched.

### Before / after (Automated runtime only, SwiftShader)

| | base | candidate |
|---|---|---|
| census: batched pieces whose source moved, 126 first builds | 10 (5 builds) | **0** |
| census: in-use sources moved by the builds (any material) | 259 (~268 MB at 1.33× for mips) | 234 (~243 MB): only the off-the-wall repaints below |
| play route: pieces leaving batches on revisits | 0 | 0 |
| play route: canvases sent again | 4 (2 560 KB, mip 0): Desert Island 1, sewers 1, Knartas 2 | **0** |
| play route: revisit uploads in all | 25 092 KB | 25 113 KB (same; varies run to run) |

The first visits' own uploads and long frames are about the same in both (for example Knartas 72 058 vs 70 040 KB).
The 75–235 s frames inside first visits are SwiftShader's canvas read-back stall (ARRIVAL-2's flush), present in both.

### Remaining (not changed)

- `offwall.js` `OW.score` / `OW.marks` repaint Desert Island's slate and sand canvases (2 MB together) after **every**
  area build: 117 of the 126 builds in the census. Each repaint is real canvas work, and three sends both canvases again
  the next time Desert Island is drawn. The text is usually unchanged. This is a story refresh, not a clone. A fix belongs
  with `story/offwall.js` (repaint only when the lines or marks change). INFERRED cost; not probed in play.

### Verification (candidate, GAME_URL=http://localhost:8212/)

- `tests/arrival-steps.mjs`: PASS 12/12 (load 0.9 → 4.3). An earlier run at load 2–3.8, straight after the probes,
  FAILed one check: the tavern's draw-batch unit was 49 ms (cell part 39.5), over the 40 ms limit. The tavern uses
  none of the changed builders, and ARRIVAL-2 recorded the same kind of failure under load in base and candidate alike.
- `tests/lazyregions.mjs`: PASS 13/13. `tests/merge.mjs`: PASS 3/3. `tests/travel.mjs`: PASS 27/27.
- Image, base vs candidate (`probes/q_shot.js`, `probes/shotcmp.py`): Desert Island's pier just after its first visit
  (Zeelich > Desert Island, the case where base sent the sea again), the frame read back after the route. The two
  frames look the same: the sea is drawn with its texture, and nothing is blank or stale. They are not pixel-identical.
  The candidate's visit ran 10 frames longer (133 vs 123; the route waits on the build in real time), so the sea had
  moved: 95 % of the pixels more than 8 levels apart are on the animated water, and the other 1 383 are scattered
  moving things. A pixel-identical capture at the same simulated moment was not made.
- NOT TESTED: a 30-minute session; Ballastra on the play route; any hardware.
