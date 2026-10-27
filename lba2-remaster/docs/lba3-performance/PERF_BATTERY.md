# PERF-BATTERY: Medium at 60 on battery, High at 60 plugged in (Vega 8, 1366×768)

The user's target (2026-10-27): a steady 60 fps (p95 under ~20 ms) at every preset on the Vega 8 laptop with its 60 Hz
screen; Medium must hold it on battery, High plugged in. Build 206 on battery: Medium street 24 fps, GPU 37.6 ms
(`results/laptop-build206-battery.txt`); the CPU frame on battery was 17.9 ms (sim 6 + submit ~12).

**Everything below was measured on SwiftShader (no GPU) in this container.** Counts (draw calls, triangles, shadow
casters, pixels, shaded fragments) are exact; no GPU time and no laptop frame rate is measured here. The GPU savings
are estimates from the user's own breakdown ratios and must be confirmed by the next benchmark (§6).

Probes (`PERF-BATTERY/probes/`, run with GAME_URL set; `node dbg.mjs q_x.js` evaluates a page script): `attrib.mjs`
(calls and triangles per category and pass; EVERY=1 draws every frame), `q_frag.js` (fragments that pass the depth
test in three's draw order: an overdraw count), `q_shadowcmp.js` and `look.mjs` (pixel diffs, the views),
`q_arrival.js` (CPU per frame phase on the arrival route), `q_batprog.js` (programs on a power switch), `q_bg.js`
(frames while blurred). Base = `25353c0`; candidate = this commit.

## 1. Where Medium's street went (base, mean of the route's frames)

| What | Triangles | Calls |
|---|---|---|
| shadow pass: static shadow batches (whole merged quarters, up to 74 m across, drawn whenever any part reached the ±36 m box) | 352k | 17 |
| main: draw batches (static pieces merged per 48 m cell) | 163k | 30 |
| main: the sea (one 1400 m plane of 220×220 squares, never culled) | 97k | 1 |
| main: terrain tiles | 63k | 6 |
| shadow + main: trees/bushes/rocks (BatchedMesh) | 56k + 44k | 2 + 2 |
| main: island / city dressing / town pieces not batched (big single meshes) | 52k + 45k + 33k | 19 + 4 + 29 |
| main: grass and flowers (to 46 m) | 33k | 13 |
| main: characters | 32k | 17 |
| the street poodle (25 parts, one draw each, casting) | 1k | 25 + 8 |

Of the 487k triangles of plain meshes drawn in the main pass, 84k were in the view frustum (per-triangle test); of
the shadow batches' 273k (after the split below), 130k were in the shadow box and 58k could cast into the view.
Grass and trees were not the problem; whole merged meshes drawn for a corner in view were.

## 2. What changed

1. **Shadow batches cut by triangle** (shadowcull.js): a piece larger than half a cell goes to the cells its
   triangles are in; cells 24 → 16 m; a batch casts only when its box is in the shadow camera's box and the box swept
   away from the sun touches the view (exact convex tests; the old sphere test let in everything within a cell's size).
   Same triangles wherever they can reach the map.
2. **Static shadow cache** (new shadowcache.js): the static casters (shadow batches, tree batches) are drawn into a
   cache (the box + 64 texels each side, on the same texel lattice) only when needed; each frame the sun's map is a
   blit of the cache's window plus the casters that may move (people, dogs, doors, pieces that left their batch) drawn
   over it with the depth test. The next cache is drawn a third of the casters a frame and swapped in; a full draw
   only on the first frame in an area or after a change. Medium/Low maps (≤ 2048); High's 4096 map is left as it was
   (a copy would cost ~140 MB). 12–46 of 1.05M pixels differ, none by more than 8 levels (150 frames, street).
3. **Draw batches**: a piece of ≥ 3000 triangles larger than half a 48 m cell is cut by triangle (the city dressing's
   34k-triangle quarter is now culled in parts); **folding on** (one-colour pieces of different colours share a batch:
   the regions' main call source). Folding changes ~0.003–0.3 % of pixels where two surfaces coincide (RENDER-INV F8);
   the before/after views below differ in 45–53 of 1.05M pixels (3 by more than 16 levels).
4. **The sea**: the same 6.36 m squares on the same lattice, ±51 squares around the camera, then one ring of long quads
   to ±1000 m (fully fogged there): 96.8k → 21.6k triangles, same waves where anything is visible.
5. **Terrain drawn after the other opaque things** (renderOrder 1): the ground under houses and people fails the depth
   test before its splat shader runs. 22–72 of 1.05M pixels differ.
6. **The poodle's parts merged per pivot** (dogs.js): 33 → 8 calls, same triangles and colours.
7. **Battery profile** (power.js, renderer.js, desktop main/preload): §4.
8. **Arrival**: the first frame drawn after a scene change's shader hold stays fully black (it is the area's first
   real frame: geometry, the shadow cache, pieces that start moving leaving their batches); shadowcull checks every
   piece on an area's first 60 updates, so movers leave their batch while the screen is still black.
9. **Background**: blurred, hidden or minimised window → drawn at 8 fps (game time and music go on as before; no
   automatic-resolution or AUTO-FIT reaction to those frames); full rate on the next focused frame.
10. **Benchmark report**: a `power:` line (on battery / plugged in / unknown, and its source), whether the battery
    profile was applied, the static shadow cache's counters, per preset the shadow filter, battery profile and
    resolution floor; breakdown lines `shadow cache off` and `battery profile on` (plugged in) / `battery profile off`
    (on battery); `shadow filter basic` is now `shadow filter 5 reads`.

## 3. Before / after (exact counts, SwiftShader, 1366×768, DPR 1)

**Steady state, every frame drawn (Medium street, 66 frames):** draw calls 255 (shadow 58) → **195 (shadow 25)**;
triangles 1107k → **603k**. With the battery profile: 195 (24), 602k, MSAA 0.

**The benchmark's routes, sampled as tests/perfbudget.mjs and the in-game routes (calls (shadow) / triangles):**

| Route | Medium before | Medium after | High before | High after |
|---|---|---|---|---|
| street (perfbudget) | 258 (60) / 1086k | 207 (39) / 646k | 293 (73) / 1220k | 266 (74) / 988k |
| interior | 97 (3) / 400k | 70 (1) / 213k | 110 (3) / 400k | 88 (5) / 400k |
| combat | 181 (70) / 231k | 151 (54) / 229k | 192 (70) / 231k | 168 (60) / 231k |
| transition | 168 (37) / 987k | 148 (20) / 495k | 191 (43) / 1030k | 188 (45) / 658k |
| street (bench route, every 12th frame) | 250 (56) / 1076k | 216 (44) / 729k | 288 (73) / 1199k | 265 (72) / 951k |
| arrival (bench route, every 12th frame) | 321 (21) / 572k | 247 (15) / 464k | 388 (31) / 588k | 306 (40) / 552k |

(Sampled every 8th/12th frame, the Medium shadow counts include the next cache's slices, which at 60 fps take 3
consecutive frames per ~2 m walked; the steady-state line above is the per-frame figure.)

**Pixels and shaded fragments (Medium street, one frame):** scene pass 1366×768 = 1.05M pixels × MSAA 2. Fragments
passing the depth test: 1.70M → **1.42M** (terrain 1.08M → 0.72M; draw batches 0.20M → 0.40M because they now hold
the folded pieces; everything else unchanged). Battery profile: MSAA 0, and the automatic resolution may go to ×0.5
(0.26M pixels) instead of ×0.6 (0.38M).

**Startup / first entry** (behind the loading screen or the black; CPU here, rough: different machine load): Citadel's
batches 0.47 → 0.68–1.0 s (perfbudget's startup step 'batches'; folding writes more vertices; triangle cuts); first entry, draw + shadow batches: the desert
0.06 + 0.05 → 0.11 + 0.19 s, the Hamalayi 0.04 + 0.11 → 0.17 + 0.12 s, Zeelich 0.16 + 0.19 → ~0.2–1.0 + 0.14–0.36 s.
On the laptop roughly ×1.5, more on battery: longer black on a first visit, never in view.

Views (`PERF-BATTERY/`): `medium-street-before.jpg` / `-after.jpg` (this build's changes off/on, same frame),
`medium-street-battery-x1.jpg` / `-battery-x0.6.jpg` (battery profile at full and at the lowest usual resolution),
and the same at High.

## 4. The battery profile

- Source: Electron's `powerMonitor` (synchronously at start, so the first shaders are compiled for the right profile;
  then `on-battery`/`on-ac`), else `navigator.getBattery()`, else unknown (= plugged in). A change applies after 2.5 s
  stable, with the shader variants prepared as for a preset change (the last frame stays up meanwhile).
- Within the player's preset (Medium stays Medium; Low unchanged): the shadow filter reads the map 5 times a pixel
  instead of PCF's 17 (three's Basic type, its one-read branch patched at load: one read was hard and dark, see the
  views); no MSAA (no FXAA either: FXAA measured +4 ms on battery, more than it saves); the automatic resolution may go
  down to ×0.5 (×0.6 plugged in). Shadows, lamps, grass, trees and distances are as in the preset.
- Settings shows "On battery: power-saving rendering." under Graphics while it is applied.
- Cost of a switch in play: ~85–91 shader programs are prepared (measured here; the same work as a preset change),
  with the last frame held up to 4 s while the driver compiles them (the laptop took 6.4 s for all programs at startup
  on battery): one visible pause per plug or unplug, then 0 programs compiled on the street, interior and arrival
  routes at Medium and High either way (measured). In the desktop app the state at startup is known before the first
  compile, so starting on battery costs nothing extra.

## 5. Expected effect on the user's numbers (estimates, to be confirmed)

Medium street on battery, GPU p50, from build 206's breakdown (37.07 ms as is):

| Change | Basis | Estimate |
|---|---|---|
| static shadow cache | "shadow map kept" −4.9 ms; a 1024² blit + ~20 dynamic calls remain | −3.5 to −4.5 |
| 5-read filter | "shadow filter basic" (1 read) −4.4 ms; 12 of 16 reads saved | −2.5 to −3.5 |
| no MSAA | "no MSAA" −5.3 ms | −5.3 |
| terrain last (−16 % shaded fragments) | ~19 ms of the frame scaled with pixels ("res x0.6") | −1.5 to −3 |
| triangles 1.1M → 0.6M, sea 97k → 22k | not separable in the breakdown | −0.5 to −2 |
| **at full resolution** | | **~18–24 ms** |
| automatic resolution | floor ×0.5 | 60 fps expected at ×0.65–0.9 |

So Medium at 60 on battery is expected **only with the automatic resolution working** (Settings → Resolution: Auto,
the default) and is not certain: if the estimate's high end holds, the resolution sits near ×0.65. CPU on battery:
calls 255 → 195 a frame (−24 %), but submission does not scale with calls alone: a matched A/B here (street, every
frame drawn, the cache and folding off/on in alternating blocks, load average 9) gave render-submit CPU 10.4 → 9.7 ms
(−7 %) for 229 → 185 calls. Applied to the user's ~12 ms: ~11 ms, CPU frame ~17 ms (from 17.9): **the CPU stays at
the 16.7 ms limit on battery** and is the next bottleneck (simulation 6 ms + submission), not addressed further here. High plugged in (street GPU 14.7 ms, 57 fps): triangles −25 %, fragments −16 %, no
cache (4096 map): expected 12–14 ms, i.e. 60; arrival 52.9 fps was not GPU-bound (GPU 12.5 ms): calls 388 → 306 and the
black first frame address it, unmeasured.

## 6. What the next benchmark must confirm

Run it twice, on battery and plugged in, Medium selected (it reports `power:` and the profile itself):
- street GPU p50 on battery (target ≤ ~16 ms with Resolution: Auto, or the resolution it settles at in play);
- the `shadow cache off` line against `as is` (what the cache saves on the Vega), `battery profile on/off`;
- `render submit CPU` on the street on battery (target ≤ ~9 ms);
- arrival: `>100ms` count and `(behind black)`; High street and arrival plugged in.

## 7. Arrival stalls, background, and the user's other suggestions

- Arrival (CPU per frame, SwiftShader, the route at Medium): the stalls in view were (a) the first frame after the
  shader hold, drawn at 90 % fade (base 236 ms here: render with the area's first uploads 231), now fully black;
  (b) shadow batches rebuilt when pieces that start moving on arrival leave them (base 26–74 ms at 50–90 % fade;
  candidate 29–38 ms, now mostly in the black thanks to the full check on the first updates); (c) the map's background
  build (MAP-1), whose chunks measured up to 66–69 ms on rows of 768 px here under heavy machine load — not reproduced
  quietly, not changed. First-entry builds (shadow + draw batches) stay behind the black and the loading card.
- Background (`q_bg.js`, drawing stubbed so the loop's own decisions show): blurred 8 frames/s (longest interval
  133 ms), game time going on (2.9 s in 3 s); focused again 60/s at once, the first interval 117 ms (no catch-up). The
  GPU load behind another window on the laptop is not measured here (expected ~8/60 of a frame's work).
- A default 60 fps cap: not added. The user's screen is 60 Hz and the game is vsync-locked (requestAnimationFrame), so
  'auto' already gives 60; a cap on a 120/144 Hz screen skips refreshes unevenly (judder). Settings → Frame rate
  limit 60 stays available.
- An automatic "Balanced" preset for weak GPUs: not added. The battery profile is that mode where it is needed; the
  first-start preset for a Vega 8 is already Low (perf.js), and the user picks Medium himself.
- A sharpening pass: not added (it would be a new program and a full-screen pass costing what the resolution saves).
