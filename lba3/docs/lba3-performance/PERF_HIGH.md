# PERF-HIGH: High's CPU gap, characters out of view, the ~56.5 fps plateau, a benchmark that says what it measured

Input: `results/laptop-build220.txt` (0.32.0), `laptop-build228-plugged.txt` and `laptop-build228-battery.txt`
(0.33.0), `laptop-build241-plugged.txt` (0.34.0), the user's Vega 8 laptop at 1366×768. Target (the user's rule): a
steady 60 at every preset, High plugged in, Medium on battery.

**Everything here was measured on SwiftShader (software rendering) in this container.** Draw calls, shadow calls,
triangles, programs and which objects are drawn are exact; CPU milliseconds are a loaded, shared machine's (used only
side by side, same run conditions); **no GPU time, frame pacing or laptop frame rate is measured here.** Hardware
acceptance is pending the user's in-game benchmark (pause menu → Benchmark) on the Vega 8.

Probes: `PERF-HIGH/probes/` (run from that folder with the game served, e.g.
`GAME_URL=http://localhost:8204/ Q=high ROUTES=street,arrival node measure.mjs`). `measure.mjs` draws every 8th
step of the benchmark's routes at 30 fps steps (as `tests/perfbudget.mjs`) and splits the draws by pass and kind;
`CAM=follow` uses the Follow camera at Far instead of the benchmark's orbit, `BATTERY=1` the battery profile.
Builds compared: 220 = `6a478bb`, 228 = `a743c0a`, 241 = `d4ee4f2` (= `a53cfe5` for rendering), candidate = this commit.

## 1. High plugged in: what grew between 220 and 228? Nothing drawn

| High, benchmark route (orbit) | calls | shadow calls | GPU draws | triangles |
|---|---:|---:|---:|---:|
| street, build 220 | 267 | 73 | 400 | 978k |
| street, build 228 | 239 | 73 | 369 | 804k |
| street, build 241 | 261 | 75 | 398 | 853k |
| street, candidate | 230 | 56 | 368 | 889k |
| arrival, build 220 | 340 | 31 | 340 | 615k |
| arrival, build 228 | 340 | 31 | 340 | 635k |
| arrival, build 241 | 354 | 31 | 354 | 635k |
| arrival, candidate | 338 | 21 | 338 | 652k |

Build 228 draws **less** than 220 on High's street (PERF-BATTERY-2's box culling), the same shadow pass, and the same
arrival. WORLD-LIFE (the residents) is not in 228 (it merged after 0.33.0); it and CAST-POLISH's talking mouths are in
241 (+22 calls on the street, +14 on the arrival). The user's own counts agree (228: 238 calls, 79 shadow; 241: 260, 84).
So the 60 → 50.7 fps drop between the 220 and 228 benchmarks is not more work. The 228 run took 14.9 ms to submit 238
calls (≈ 63 µs a call; Medium's street in the same run 45 µs) and, with as-played runs added, its High routes ran several
minutes later in the benchmark than 220's: a slower processor (heat, power plan) is consistent with it but not proven.
The benchmark now times a fixed piece of JavaScript before each route (§4, "CPU probe") so the next report shows
whether the processor slows down over the run.

## 2. What the candidate changes

1. **Characters outside the view are not drawn** (`engine/drawcull.js` FarCull). A character's skinned body is never
   frustum-culled by three (`sculpt.js` assemble: its bind-pose bounds don't follow the animation), so everyone within
   250 m was drawn wherever the camera looked. An actor whose bounds (its rig's box at first sight, ×1.25 + 0.5 m) are
   outside the camera's frustum is now left out of that frame's render, like a far one. Rigs that cast a sun shadow (a
   dog) are left to three. Their world matrices are still brought up to date after the render (the game reads hands and
   heads), so only the draws go. Medium on battery, Follow camera at Far, street: **187 → 167 calls, 468k → 410k
   triangles** (17 actors out of view in a typical frame). Every preset gains; this is most of what WORLD-LIFE and the
   talking mouths added (228: 161 calls in that view).
2. **High's shadow batches in 32 m cells** (`engine/shadowcull.js` cellFor; 16 m elsewhere). High's 4096 map is drawn
   live every frame (the static cache takes maps up to 2048). Street: **38 → 19 shadow-batch calls (shadow pass 75 → 56)
   for +77k depth-only triangles**; arrival 31 → 21. Same casters into the same map: the High street frame is
   pixel-identical (`PERF-HIGH/before-high-street.jpg` / `after-high-street.jpg`, 0 pixels differ). A change to or from
   High rebuilds the shadow batches: about 0.2–0.3 s on this machine, inside the preset change's shader hold for the
   area on show, behind the next arrival's black for other areas (the benchmark rebuilds its routes' areas at once).
3. **The map built after an arrival takes only spare time** (`game/hud.js` mapTick, `Game.spareMs`). A region's base map
   (200–660 ms of work, `probes/mapcost.mjs`) was built 2.5 ms per frame for 1–4 s after each first arrival (5.5 ms with
   the minimap's own slice on top), paid in full by a processor-bound frame. Its slice is now what the last frame's own
   work left of ¾ of the frame interval, 0.5–2.5 ms; on a busy frame the map takes longer to finish.

Not changed: what High looks like (4096 PCF soft, 8 lamps, bloom, MSAA 4×), Medium, Low, the battery profile.

## 3. The ~56.5 fps plateau

The frame loop is a single `requestAnimationFrame` callback with no limiter while the benchmark runs (`main.js`
loop: `cap = this.benching ? 0 : …`); nothing in the game sleeps, busy-waits, or rounds a frame time. The desktop app
sets no vsync or frame-rate switches, and `backgroundThrottling: false` only keeps the music going. Frame intervals of
17.4–17.7 ms with the game's work at 3–6 ms and GPU at ~9 ms, never 33 ms, are not a missed 60 Hz refresh either: the
frame clock itself ran at ~56.5 Hz in those runs (and build 228's battery run saw an 11 ms interval on a 60 Hz panel).
That points at the display path (refresh rate, a variable-refresh or power mode, the browser's frame scheduling), not
the game, but it can't be told apart from here. In build 241's run the plateau barely appeared. So the benchmark now
says which it is (§4): after every route, 40 refreshes with nothing simulated or drawn ("nothing drawn"). If those
come at 17.7 ms too, the display set the pace; if they come at 16.7 ms while the game's frames sit at 17.7, the frames
wait on something past the game's own work and GPU time (the browser's GPU process), and the "GPU timer off" line shows
whether the benchmark's own timer queries are part of it.

## 4. The benchmark (`engine/bench.js`, `engine/perf.js`, `desktop/`)

- **Display and GPU status** (desktop app): the refresh rate the OS gives the window's display, fullscreen or not,
  and Chromium's GPU feature status (WebGL, compositing, rasterisation: hardware or a fallback).
- **Per route, "pacing":** the share of frames on the refresh (≤ 17.2 ms), a little slower (17.2–20) and longer; the
  game's CPU work per frame (p50); how late the frame callback ran; the "nothing drawn" refresh; the CPU probe; a
  frame-rate limit, background frames, power-source changes or GPU-timer disjoints if any occurred.
- **"limited by"** comes from the frames that missed a refresh (over 20 ms), not the median: a 45 fps run with a
  16.7 ms median no longer reads "keeps up". CPU vs GPU is judged at p95.
- **Every frame over 33 ms** is listed with its length and time into the window, behind black or not.
- **As played**: once the automatic resolution has settled, the route starts again from its beginning and is warmed
  and measured exactly like the fixed run (same path, camera and window). It used to be measured from wherever the
  warm-up had got to. Each line gives the factor of every measured frame as shares; the summary shows the mean factor
  (and the end one when different) instead of only the end.
- **The interior route stays in the house**: its walk crossed the cellar hatch ~7 s in, so the fixed run's last half
  second, and nearly all of an as-played run, measured the cellar (the user's Low "85 calls fixed / 18 as played":
  two different rooms, not a culling bug). Interior numbers are not comparable with earlier reports.
- **A breakdown at High** (street, 4 s each, compare the ms): as is · shadow map 2048 (coarser; it then goes into the
  static cache) · no shadows · MSAA 2× · no bloom · Medium's vegetation distances · res ×0.6 · no lamps. Medium's
  breakdown is unchanged plus "GPU timer off". These are candidates for a balanced High, not settings.
- GPU pass readings of 0 print as `n/r` (not resolved), not as free.
- "Shortest frame interval seen" no longer claims a refresh rate.

## 5. What is left (ranked by measured size)

1. **High arrival** (45 fps, submit 15 ms, 354 calls; 175 plain meshes in Zeelich/desert/Hamalayi views): those
   regions' builders merge less than Citadel; their draw batches and the arrival's first-visit builds (Citadel's shadow
   batches ~160–290 ms and draw batches ~215–315 ms here, built at the first frame in an area, behind its black) are
   the next CPU target, and the Low arrival's 450–550 ms stalls are that first-visit build (the benchmark's Low runs come
   first). Next step: build an area's shadow and draw batches with the area (under its loading card), not at its first
   frame.
2. **The street's long tail, Far Follow view at Medium on battery** (`probes/drawlist.mjs`, heaviest frame 316 draws):
   draw batches 59, characters' skinned bodies 26 and face parts 31, grass/flower tiles 25 (many with 1–7 instances),
   the harbour ~50 at 97–116 m (the cargo lift alone is 51 unmerged meshes; the boats merge per material only), the
   poodle 7+7. The battery target (≤ ~10 ms CPU a frame) needs several of these, not one.
3. **Per-frame JS outside three** (`probes/profile.mjs`, street, this machine): world matrices of shown objects
   ~1.8–2.0 ms, draw-batch and shadow-batch checks ~1.4 ms, the follow camera's clearance tests ~0.9 ms.
4. Whether the plateau is the display: the next benchmark's "nothing drawn" column.

## 6. Candidate counts and tests

Same probe, same machine, build 241 (`a53cfe5`) → candidate (calls / shadow calls / triangles a frame):

| route | 241 | candidate |
|---|---|---|
| High street (orbit) | 261 / 75 / 853k | 230 / 56 / 889k |
| High arrival | 354 / 31 / 635k | 338 / 21 / 652k |
| Medium street, battery profile, Follow camera at Far | 187 / 34 / 468k | 167 / 34 / 410k |
| Low street (orbit) | 163 / 0 / 374k | 150 / 0 / 331k |

`tests/perfbudget.mjs` (QUALITIES one at a time, ROUTES=street), 241 → candidate: High 260 calls (p95 290, shadow
75), 853k → **228 (p95 254, shadow 56), 889k**; Medium 204 (p95 230), 484k → **190 (p95 216), 444k**; no shader
compiles on the route, no per-frame rebuilds: **VERDICT: PASS** both. Also `tests/holomap.mjs` (the map's slices),
`tests/walkers.mjs` (residents, culled out of view while drawn only), `tests/occluders.mjs` (the hero's silhouette and
scenery in front): **VERDICT: PASS**. The submit milliseconds of these runs are a loaded software renderer's and are not
quoted as gains.

Checks of the changes themselves (`probes/`): High street before/after pixel-identical (`shot.mjs`); view culling on
vs off pixel-identical at Medium, Follow at Far (`viewcull-on/off-medium-follow.jpg`); the actors' positions and
facings after 150 drawn frames identical with and without it (`logic.mjs`); only the poodle's wander differed, because
the shared `Math.random` stream was shifted — most likely by three.js making bone textures (whose ids draw from it) for
bodies drawn later, not by any game logic reading what was drawn; a preset round trip Medium → High → Low →
High returns to the same calls and draw batches (`switch.mjs`); the benchmark's new lines run (`benchtest.mjs`, a cut
plan; its milliseconds are SwiftShader's).

What the user's next benchmark should show: High street calls ~230 (shadow ~56) instead of ~260/84 and the High arrival's
shadow ~21 instead of 31; the display's refresh rate; a "nothing drawn" column that says whether the ~56.5 plateau is the
display; the CPU probe over the run; the High breakdown in milliseconds; the house measured in the house. Whether High
street reaches 60 is not known from here (it was 54.5 with a CPU estimate of 3.4 + 14.1 ms; the cut is ~13 % of its calls).
