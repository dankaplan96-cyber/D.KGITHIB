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

Tests, one at a time (R7 verdict policy, GAME_URL=http://localhost:8177/): see QA.md "PERF-ARRIVAL" for the
verdicts. `perfbudget`: PASS (was FAIL on base).

## 6. Needs the user's laptop

1. Benchmark at Low / Medium / High: every route's "shader programs compiled while measured" should read 0.
2. High arrival (was 49.4 fps, draw calls p95 625; Zeelich should now be ≈ 150 calls lighter) and High street.
3. Startup (plugged in, cold): build (was 13.6 s) and the preparation's parts; whether parallel shader compile is "yes".
4. First Ctrl (behaviour menu) and a preset change in Settings: no hitch after the change has applied.
