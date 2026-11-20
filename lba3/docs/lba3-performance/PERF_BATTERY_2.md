# PERF-BATTERY-2: "as played" in the benchmark, lamps on battery, the submit path, Low's street, the Hamalayi

Input: `results/laptop-build220.txt` (build 0.32.0 on the user's Vega 8, 1366×768, 60 Hz), the target "a steady 60 at
every preset; Medium on battery, High plugged in". Plugged in, every preset was already at 60. On battery at Medium,
with the automatic resolution OFF (the benchmark's rule): street 40.1 fps (GPU 21.2 ms; CPU sim 4.0 + submit 12.8),
interior 57.3, combat 60, transition 50.8, arrival 44.8; Low's street 49.1 (GPU 16.2 ms, 536k triangles).

**Everything here was measured on SwiftShader (software rendering, no GPU) in this container.** Counts (draw calls,
triangles, lamps lit, lamp-pixel pairs, shaded fragments, pixels, shader programs) are exact. CPU times are a software
renderer's CPU under a shared, loaded machine: only ratios from matched A/B runs are used. **No GPU time and no laptop
frame rate is measured here;** the GPU effects below are estimates from the user's own breakdown and must be confirmed
by the next benchmark (§8).

Base = `4868b02` (build 0.32.0 + HAMALAYI-POLISH), candidate = this commit. Probes: `PERF-BATTERY-2/probes/`
(`run.mjs` boots a preset with the battery profile on/off, `DESKTOP_BATTERY=1` starts as the desktop app on battery;
`node run.mjs q_x.js` runs a page script). Before/after counts come from both builds run side by side
(`q_counts.js`: every 12th frame of the benchmark's routes at 30 fps steps, as PERF-BATTERY's `attrib.mjs`).

## 1. The benchmark says what play feels like

- **"As played" runs** (`src/engine/bench.js`): after each preset's fixed runs, the same routes again with the automatic
  resolution ON, as the game runs it in play. The factor starts at ×1 on the preset's first route and carries over
  from route to route (as in play). Each played route warms up until the factor has held for 180 frames (two of the
  automatic resolution's 90-frame windows; at least 4 s, at most 25 s — then the line says "NOT settled"), then is
  measured for 6 s like the others. Each line gives fps, frame p50/p95/p99, frames over 33 ms, **the factor it settled
  at, its range and changes while measured**, the render pixel ratio, GPU time, sim and submit CPU, lamps, calls,
  triangles. The fixed-resolution runs are unchanged, for comparison between machines and builds.
- **A summary table** at the end: per route and preset, `fps at full resolution / fps as played (×factor)`, marked
  ON BATTERY when it is. That table answers "is it 60 in play" directly.
- **A Hamalayi route** (the region's arrival point, a small loop, the camera turning): since HAMALAYI-POLISH it has
  more triangles, and the arrival route only passed through it.
- The breakdown (street and interior at Medium, one cost removed at a time) is unchanged; note that its
  `shadow filter 5 reads` and `battery profile on` lines now include the battery lamps (§2).
- Cost: the benchmark takes longer (+6 routes per preset: roughly 1–2.5 min per preset, depending on how long the
  factor takes to settle).
- Checked here: `q_bench.js` runs the cut-down benchmark (the report's format); `q_benchsim.js` replaces drawing with a
  busy wait proportional to the factor² (a stand-in for pixel-bound GPU time, 30 ms at ×1) so the loop runs at
  30–60 fps: the fixed runs read 29.3 / 30.3 fps, the played runs settled at ×0.7 and read 55.8 / 59.3 fps (street:
  one step up to ×0.8 tried and backed off while measured, reported as "×0.7–0.8, 2 changes"). That checks the
  plumbing, not any machine.

## 2. Lamps on battery

The lamps were the largest single cost on battery (street −3.3 ms, house −5.1 ms without them). Two changes, both only
in the battery profile (Medium/High on battery; plugged in and Low unchanged):

1. **The 2 lamps nearest the hero** (`src/engine/lightpool.js`): the pool has 2 lights instead of 4 (Medium) / 8
   (High), and they follow the lamps nearest the hero by distance as a share of the lamp's reach (the light strongest
   where he stands). A light keeps its lamp until another is 15 % nearer, fades it out over 0.45 s (0.225 s when another
   lamp — the lantern — is waiting), stays dark one frame and fades the new one in over 0.45 s (smoothstep). A lamp
   switched off or hidden by its own builder goes at once (as before); scene changes and warm-ups take the final state
   at once (behind the black). `q_lampfade.js` on the house walk (380 frames at 60 fps): 3 lamp changes, 0 jumps of a
   lit light, largest change 11 % of the lamp's intensity in a frame.
2. **Diffuse-only lamp light** (`src/engine/renderer.js`): in the battery profile a lamp adds three's diffuse term only
   (Lambert), not the GGX specular highlight (most of the lighting model's work per lamp and pixel). The battery
   profile is the only state using three's Basic shadow type, so its programs carry the switch: no new program. The sun
   and spot lights keep the full model.

The light count is part of every lit program: the battery profile's programs (made anyway on a power switch, for its
shadow filter) are made with 2 lights. Measured (`q_progs.js`, started on battery as the desktop app): 89 programs at
the title; **0 compiled on any route** (street, interior, combat, transition, arrival, Hamalayi) at Medium, High and
Low; a switch to mains prepares 84 (as before: the previous pass measured ~85–91), back to battery 0.

| Medium on battery | lamps lit (of pool) before → after | lamp-pixel pairs before → after |
|---|---|---|
| street | 2 of 4 → 2 of 2 | 1.24M → 1.24M (the same 2 lamps; now diffuse only, 2 empty slots fewer) |
| interior (the house) | 3.47 of 4 → 1.67 of 2 | 1.20M → 0.75M |
| combat | 1 of 4 → 1 of 2 | 0.53M → 0.53M |
| transition | 2.4 of 4 → 1.47 of 2 | 0.61M → 0.27M |
| arrival, Hamalayi | 0 → 0 | 0 |

(Lamp-pixel pairs: over the frame's visible surface, the pixels × lamps whose light reaches them, i.e. where the lighting
model runs; `q_counts.js`. Scene pass 1.05M pixels.)

Look (`look2.mjs` + `diff.mjs`, the same frame from both builds; the noise floor between two runs of the *same* build
is 3.6 % of pixels on the street, 0.5 % in the house, all on animated characters):

| view (Medium) | pixels differing | > 16 levels | where |
|---|---|---|---|
| street, on battery | 25.1 % | 1.42 % | a faint loss of lamp sheen on walls (≤ a few levels) + the characters' noise |
| house, on battery | 42.6 % | 3.99 % | the bedside lamp's and the kitchen lamp's pools of light (far from Twinsen) are gone; near him unchanged |
| Hamalayi, on battery | 0.28 % | 0.10 % | characters only (no lamps there) |
| street, plugged in | 3.70 % | 1.44 % | characters only: the same as the noise floor |
| house, plugged in | 0.55 % | 0.26 % | characters only |

Views: `PERF-BATTERY-2/before-med-bat-*.jpg` / `after-med-bat-*.jpg`, difference maps `diff-med-bat-street.png`,
`diff-med-bat-interior.png` (×4 grey), `before-/after-med-ac-street.jpg` with `diff-med-ac-street.png` (plugged in).

## 3. CPU on battery: the submit path

Profiled at Medium with the battery profile on the street (`q_cpu.js`, `q_micro.js`, `q_shadow.js`; every frame drawn,
the GPU queue drained before each; ms of SwiftShader's CPU, per frame, base):

| part | ms | note |
|---|---|---|
| main pass: three's draws (224 calls) | 2.1 | 9.4 µs a call (setProgram, uniforms, the draw) |
| main pass: projectObject + sort + lights (no draw) | 0.88 | 1 733 visible objects walked |
| shadow map, live pass (cache blit + 21 moving casters) | 1.23 | 0.46 traversal/blit + 0.77 for 21 draws: **37 µs a shadow draw** (depth-material program switches) |
| shadow cache slices (the next cache, a third a frame) | 0.11–0.25 | |
| world matrices of shown objects (drawcull.js) | 0.67 | 1 596 objects with automatic matrices |
| draw batches' watch (drawbatch.js) | 0.20 | |
| shadowcull update (sim side) | 0.20–0.6 | |
| farCull + blob batch, occluders, light pool | < 0.03 each | |
| sim: NPC updates 0.5, camera 0.4, hero 0.3, world 0.5 (p50) | | the map's background build after an arrival: up to 21 ms in single frames (MAP-1, unchanged) |

What changed (no change to simulation, timing, input or gameplay):

1. **Box culling** (`src/engine/drawcull.js` BoxCull, called from `Renderer.mid`/`post`): three culls each object by
   its bounding sphere; the draw batches (48 m cells whose pieces reach beyond the cell), terrain tiles (65 m) and
   instanced tiles (36 m, a metre or two high) have spheres far larger than what they cover. On the street at Medium
   three drew 54 of 136 draw batches (305k triangles, 45k of them in the view); tested by their world boxes, 31 batches
   and 156k. Objects wholly outside the view are hidden for that frame's render only and shown again right after it
   (warm-ups, uploads and the shader preparation see everything). Casters are left alone while shadows are on (a caster
   out of view may throw its shadow into it). Same pixels (`diff-med-ac-street.png`; shaded fragments 1.48M → 1.48M on
   the street, 1.03M → 1.03M in the house).
2. **Still instanced casters in the static shadow cache** (`src/engine/shadowcache.js`): of the ~21 draws of the live
   shadow pass on the street, 6–7 were instanced meshes that never move (the island's original props, the depot's
   crates). They join the cached static casters; each is watched (matrix, instances, count, geometry, material,
   casting, showing) and leaves the cache for good at its first change (one rebuild). The vegetation tiles that switch
   detail with distance are never taken in (their switches would rebuild the cache again and again).
3. **The draw batches' per-frame watch**: a folded material's look and a parent's visibility are worked out once a
   frame instead of once per piece (~1 500 pieces, a few dozen materials); the same checks.
4. On battery, 2 point lights instead of 4 (Medium): fewer light uniforms with every program switch (not measured
   apart: changing it recompiles).

**Matched A/B** (`q_ab.js`: the same page, blocks of 14 frames alternating 1+2 off/on, Medium on battery, street;
medians), three runs at different machine loads:

| run (load average) | frame CPU off → on | render submit off → on | draw calls (shadow) |
|---|---|---|---|
| 12 blocks (5) | 12.8 → 11.8 ms (−8 %) | 8.5 → 7.1 ms (−16 %) | 199 (23) → 170 (18) |
| 12 blocks (27) | 16.7 → 15.9 ms (−5 %) | 10.1 → 10.3 ms (+2 %) | 199 (23) → 170 (18) |
| 20 blocks (10) | 12.3 → 11.3 ms (−8 %) | 7.9 → 7.5 ms (−5 %) | 199 (23) → 174 (18) |

So: −13 to −15 % draw calls and −5 to −8 % of the frame's CPU, consistently; the submission's own share is noisy on a
shared software renderer (0 to −16 %). Items 3 and 4 are not in this A/B (both builds' difference is larger by them,
not measured apart). **Honest reading: this is a modest CPU gain.** The large CPU costs that remain are per draw
(~200 a frame) and the shadow pass's per-draw program switches; cutting those further means merging the characters'
small parts or the grass tiles into batches (rig and vegetation work, not done here).

Not changed, with reasons: the NPCs' eyes (2 tiny draws per NPC within 30 m, ~10 calls) are rig parts (rig.js is shared
and not this task's); the town's 13 textured merged meshes are each alone in their cell for their texture (merging them
needs an atlas); grass/flower tiles as BatchedMesh would mean a new shader variant of the sway material.

## 4. Low's street

Low (`src/game/kit.js` LOD_PRESETS.low): detailed trees to 18 m (was 26), grass and flowers to 26 m (was 36) and half
of them (was 60 %); plus the box culling of §3, which on Low (no shadow pass) also culls casters. Medium and High's
distances are unchanged.

| Low (battery or not: Low has no battery profile) | calls before → after | triangles before → after |
|---|---|---|
| street | 170 → 129 | 522k → 322k (−38 %) |
| interior | 63 → 63 | 178k → 178k |
| combat | 96 → 96 | 122k → 122k |
| transition | 94 → 89 | 297k → 274k |
| arrival | 235 → 233 | 403k → 386k |
| Hamalayi | 83 → 73 | 335k → 246k (−27 %) |

What is left on Low's street (attribution, candidate): draw batches 160k (31.8 calls), terrain 54k, characters 32k,
the sea 22k, the island's original props 17k, trees/bushes/rocks 16k (was 31k), grass 6k (was 20k). Smaller draw-batch
cells were tried for Low (24 m: street 269k but 148 calls, arrival 287 calls; 32 m: 309k, arrival 259) and left out:
the arrival's calls rise more than the street's triangles fall. Views: `before-low-street.jpg` / `after-low-street.jpg`,
`diff-low-street.png` (the tree swapped to its coarse sculpt beyond 18 m, fewer grass tufts at the edge of the range,
characters' noise).

## 5. The Hamalayi

Medium on battery, the region's arrival point with the camera turning (`q_counts.js`, the same route on both builds):
76 calls (shadow 4), 328k triangles, no lamps, 1.43M shaded fragments; the street: 188 calls (shadow 42), 561k
triangles, 2 lamps over 1.24M lamp-pixel pairs, 1.48M shaded fragments. The same pixels and overdraw with less of
everything else: **not the worst region on battery** by every count we have. It got the street's treatment anyway
(box culling: 86 → 76 calls, 380k → 328k triangles at Medium; Low 335k → 246k). The benchmark now measures it (§1).

## 6. Before / after (exact counts, SwiftShader, 1366×768, DPR 1; calls (shadow) / triangles)

Medium **on battery** (`q_counts.js`, base and candidate side by side):

| route | before | after |
|---|---|---|
| street | 215 (44) / 720k | 188 (42) / 561k |
| interior | 63 (1) / 231k | 63 (1) / 231k |
| combat | 149 (54) / 228k | 149 (54) / 228k |
| transition | 117 (16) / 423k | 113 (14) / 410k |
| arrival | 257 (15) / 487k | 254 (13) / 465k |
| Hamalayi | 86 (4) / 380k | 76 (4) / 328k |

Medium **plugged in** (lamps: identical counts and lamp-pixel pairs before and after — nothing changes there but the
culling): street 215 (44) / 720k → 183 (36) / 531k · interior 63 (1) / 231k → same · arrival 259 (17) / 499k →
256 (15) / 483k · Hamalayi 86 (4) / 380k → 76 (4) / 328k.

High **plugged in**:

| route | before | after |
|---|---|---|
| street | 263 (71) / 933k | 233 (70) / 774k |
| interior | 79 (4) / 353k | 79 (4) / 353k |
| combat | 167 (59) / 230k | 167 (59) / 230k |
| transition | 142 (26) / 545k | 140 (26) / 541k |
| arrival | 314 (38) / 586k | 313 (38) / 581k |
| Hamalayi | 117 (22) / 496k | 107 (22) / 444k |

`tests/perfbudget.mjs` (plugged in, its own sampling: every 8th frame; base run with `PERF_BUDGET=0`):

| preset / route | before | after |
|---|---|---|
| Low street | 172 / 540k | 133 / 328k |
| Low transition | 114 / 372k | 105 / 328k |
| Low interior, combat | 69 / 200k, 98 / 123k | the same |
| Medium street | 207 (39) / 636k | 183 (35) / 482k |
| Medium transition | 148 (20) / 495k | 139 (15) / 463k |
| Medium interior, combat | 69 (1) / 214k, 151 (54) / 229k | the same |
| High street | 266 (73) / 978k | 238 (73) / 804k |
| High transition | 188 (45) / 658k | 184 (45) / 652k |
| High interior, combat | 87 (5) / 402k, 168 (60) / 231k | the same |

New shader programs on the routes: 0 at every preset, both builds.

(The street's counts vary by up to ~10 % between runs — NPCs and the shadow cache's slices follow real time — so both
builds were always run side by side; in one earlier pair the street read 210 (39) / 694k → 178 (35) / 500k.)

## 7. Expected effect on the user's battery numbers (estimates, to be confirmed)

GPU, Medium on battery, from build 220's breakdown:

| change | basis | street | house |
|---|---|---|---|
| lamps: 2 nearest, diffuse only | street "no lamps" −3.25 ms; house −5.10 ms. A rough ALU count per shaded fragment (an empty lamp slot ~15 operations, the full model ~50, diffuse ~15): street ~120 → ~48, house ~117 → ~43 | −1.3 to −2.3 | −2.5 to −3.8 |
| box culling | −160k to −194k triangles a frame, all outside the view (vertex work only) | −0.3 to −1.0 | 0 |
| still casters cached | −23k shadow triangles, −5 shadow draws | −0.1 to −0.3 | 0 |
| **at full resolution** | from 20.8 / 13.9 ms | **~17.2–19.1 ms** | **~10.1–11.4 ms** |

So at ×1 the street on battery is expected at ~52–58 fps (was 40) and the house at 60 (was 57). **As played** (the
automatic resolution, floor ×0.5 on battery): the street needs to lose 0.5–2.4 ms more, which build 220's
"res ×0.6 = −5.9 ms" says a factor of about ×0.8–0.95 gives: **60 expected in play, at ~×0.8–0.95**, if the CPU keeps
up. CPU: the matched A/Bs gave −5 to −8 % of the frame's CPU (submission 0 to −16 %); applied to the user's
4.0 + 12.8 ms → **CPU ~15.5–16 ms a frame** (was 16.8): just under the 16.7 ms budget, with little margin. **The CPU
is the likelier limit on battery now**: if the street as played still reads below 60 with the resolution at its floor,
that is the CPU (the report's "limited by" and submit lines will say so), and the next step is fewer draws (§3). Transition (50.8) and arrival (44.8) on battery are mostly
stalls (scene changes, the map's background build): this pass expects them to improve only through the lighter frames;
the played runs will show how they feel.

Low's street on battery (16.2 ms, 49 fps): triangles −38 %, calls −24 %. If a third of Low's GPU frame is vertex work
(no shadow map, 0.76M pixels), −1.5 to −2.5 ms: **~14–15 ms, 60 expected at ×1**; Low's automatic resolution floor
(a 0.7 pixel ratio) adds margin.

High plugged in: unchanged look; box culling and the cached casters lower its calls and triangles (§6); expected to
stay at 60. High on battery (not a target): 8 → 2 lamps, diffuse only.

## 8. What the next benchmark must confirm

Run it on battery (and plugged in), Medium selected, Resolution: Auto (the default):
- the new **summary table**: Medium's street, interior, transition, arrival and Hamalayi **as played** — 60 fps, at
  which factor, and "NOT settled" nowhere;
- the street's GPU p50 at ×1 on battery (expected ~17–19 ms, was 21.2), and the `no lamps` breakdown line against
  `as is` (expected a gap of ~1–2 ms, was 3.25);
- the house at ×1 on battery (expected ~10–11.5 ms, was 13.9);
- sim + render submit CPU on the street on battery (expected ~15.5–16 ms together, was 4.0 + 12.8): the likelier limit now;
- Low's street on battery at ×1 (expected ~14–15 ms GPU, was 16.2);
- the Hamalayi route at every preset (expected lighter than the street);
- plugged in: High's street and arrival still at 60.

## 9. Tests

On the candidate (SwiftShader, GAME_URL a local server): `tests/perfbudget.mjs` PASS · `tests/drawcalls.mjs` PASS ·
`tests/dynres.mjs` PASS · `tests/autofit.mjs` PASS · `tests/occluders.mjs` PASS · `tests/worldfit.mjs` PASS.
(Settings were not touched, so `tests/menus.mjs` was not run.) The base's perfbudget run above was a counting run
(`PERF_BUDGET=0`); its one FAIL is a music file requested after its server had been stopped, not a game result.
