# PERF-CPU: the game's own processor work per frame, Auto's profiles, the cold first-visit stalls, the combat pacing

Input: the user's battery runs on the Vega 8 laptop (Ryzen 5 3500U, 1366×768, 60 Hz): `results/laptop-build251-auto-battery.txt`
(Auto as played: street 51.8, combat 53.5, arrival 48.7 fps at Low, Auto's CPU ladder exhausted; CPU work p50 14.7 ms,
p95 21 ms) and `results/laptop-build255-battery-full.txt` (full benchmark: game CPU work 16–22 ms at battery clocks, a
3.5 s first-entry stall, "callback late" 6–13 ms, combat 13–14 % of frames at 33 ms with light work, street 129–177 and
arrival 214–379 draw calls). Plugged in, build 251 already met 55–60 on most routes. The user (29.10): battery is the
reference; Auto should choose among a few named profiles, settle, and hold.

**Everything here was measured on SwiftShader (a software renderer) in this container, shared with other agents' test
runs (load average 8–31 on 4 cores).** Draw calls, triangles, uploads, allocations, matrices and which objects are drawn
are exact. Milliseconds are this machine's main-thread JavaScript (SwiftShader's GL work runs in its GPU process and is
drained before each timed frame) and are only compared side by side, A/B in the same browser (16-frame blocks alternated
along the same route), never across runs. **No laptop frame rate, GPU time or battery figure is claimed.** Hardware
acceptance is the user's next battery benchmark (§9).

## 1. Results at a glance (before → after, this machine)

Battery profile, Low preset, Citadel street with the Follow camera at Far (the user's way of playing), p50 per drawn
frame, every runtime switch of PERF-CPU off vs on in one browser (`ab-all.sh`; the changes without a switch — less
garbage, the HUD, the grid keys — are in both columns):

| section (ms, p50) | off | on |
|---|---:|---:|
| **the frame's whole main-thread work** | **16.6** | **14.6** |
| world matrices (2.1) | 1.50 | 1.23 |
| draw-batch checks (2.2) | 0.47 | 0.22 |
| shadow culling (2.3) | 1.05 | 0.31 |
| people's animation (2.4: rig.update) | 0.85 | 0.61 |
| people's update in all (sim.npcs) | 1.09 | 0.86 |
| SOLID-NPC's contact checks (Hero.keepApart, 2.7) | 0.07 | 0.07 |

The same, Medium preset, Follow camera: matrices 1.66 → 1.26, batch checks 0.48 → 0.25, shadow culling 0.93 → 0.64,
animation 0.85 → 0.58, people 1.17 → 0.80 (the whole frame: 19.1 → 18.9, within this machine's noise). Combat route,
Low, battery: the whole frame 8.2 → 6.9, people 0.62 → 0.28, animation 0.68 → 0.38.

Draw calls (exact; p50 over the route's drawn frames), the texture arrays off vs on (2.6), same browser, 16-frame
blocks (`ab-arr.sh`; "unordered": the first version, which changed coincident surfaces, not shipped):

| view | calls: off → **on** (unordered) | triangles: off → on |
|---|---:|---:|
| street, Low, battery, Follow | 133 → **110** (103) | 316k → 350k |
| street, Medium, Follow | 170 → **146** (137) | 417k → 449k |
| arrival route, Low, battery | 323 → **292** (254) | 383k → 385k |

Low-lite (Auto's lowest profile) also leaves people's small parts out beyond 12 m: street, Low, Follow, 133 → 124 on
its own (measured before the arrays; the two add up, by different objects).

Garbage per drawn frame (`alloc.mjs`, Low, battery; V8's sampling heap profiler, minor-collection garbage included):
street 1 170 → 943 KB (of which the map built after an arrival: 151–155 KB, one-time arrays), combat 509 → 434 KB.

## 2. Engine-side per-frame CPU

### 2.1 World matrices: only what changed (`drawcull.js` shownTree)

three recomposes every shown object's matrix from position / rotation / scale and multiplies it into its parent's world
matrix every frame; the scene's own matrixAutoUpdate forces the whole tree. On the Low street ~2 200 objects are shown
and ~150 change in a frame (people's limbs and bodies, the ball, the mill). The game moves objects only through
position, rotation (quaternion) and scale — no code writes `.matrix` or `.matrixWorld` (searched: only the batches,
made with matrixAutoUpdate off). So an object whose ten numbers, parent and parent's world are unchanged keeps its
world matrix. A changed one is recomposed exactly as three does and its subtree forced as three forces it. A matrix
recomposed meanwhile by three's `updateWorldMatrix` (each `getWorldPosition` flags every parent up to the scene — that
alone forced the whole tree every frame) is recomputed and compared: only a different value forces the subtree. A
skinned body's bind-matrix inverse follows its world matrix (three's SkinnedMesh step, done here, so its bones take the
cached path); cameras and audio keep their own update. Hidden subtrees are skipped as before; shown again, recomputed in
full. `MW.cached = false` gives three's own path (the A/B switch).

**Exactness** (`mwcheck.mjs`): in every drawn frame, right after the update, each shown object's world matrix (and each
attached skinned body's inverse) against three's formula from scratch: street, combat, interior, transition and arrival,
30 drawn frames each, **113 962 matrices, 0 different** (three's own path through the same check: 0 — the check is valid).
FarCull's post-render update of the people left out of the view takes the same cached path.

### 2.2 Draw-batch checks (`drawbatch.js` watch)

Each frame every batched piece (350–1 500) is checked for anything that would make its batch wrong. With this frame's
matrices from 2.1: a parent chain is shown when the update reached the parent through shown objects; a world matrix is
compared in full only when the update recomputed it since it was last found equal; a folded material's look is a version
number kept on the material, worked out once a frame (no string built each frame, as before). The same releases.

### 2.3 Shadow culling (`shadowcull.js`)

- Without the shadow pass (Low, Low-lite, Auto's no-shadow profiles) the caster work — pieces leaving their batches, the
  batches' and solo casters' view tests — is skipped; the first update with shadows again checks every piece at once.
- The distance detail (Medium / Low: a static piece under 4 / 7 px is left out) is decided per piece only when the camera's
  and the focus's travel since its last decision could have flipped it (an odometer per area against each piece's margin
  to its nearest threshold, with the hysteresis), when its world matrix was recomputed, or when the threshold changes.
  **Exactness** (`ddcheck.mjs`): every drawn frame, every judged piece against the rule (§8).

### 2.4 People nobody sees are posed less often (`rig.js` update, `drawcull.js` FarCull.anim)

A person outside the view is posed every 4th frame (beyond the fog every 8th) with the time of the frames between (the
joints' easing is exponential, so the pose arrives where it would have been); the body still moves every frame. Never the
hero, an enemy, anyone during dialogue, a story scene or a door's fade; anyone in view within 25 m always every frame.
In Auto's Medium-lite and Low-lite a person in view beyond 25 m is posed every other frame (a visible-in-principle
choice, named in the profile).

### 2.5 Garbage per frame

60 MB/s of garbage at 60 fps (street, before) means a minor collection every few dozen frames, each one to a few ms on
a battery-clocked processor: a regular miss when the frame is already tight. The largest sources fixed: the Follow
camera's clearance tests (162 KB + 42 KB in iterators a frame: destructuring loops over its sample ring and corners, a new
empty array per empty physics cell) → 47 KB; the draw batches' per-frame look strings (24 KB) → 0; the occlusion grid's
string keys (numeric now); terrain heights and the walk planner's heap swaps (indexed loops, no destructuring); one
shared empty list for empty physics cells. Left (not ours or not worth the risk): three's own internals, the walk
planner's open-list entries, physics `_inside` (now called more by SOLID-NPC's contact checks: 17 → 47 KB a frame on the
street; `Math.hypot` there allocates in some tiers — a squared-distance comparison would not), the per-call pose object
in `Rig.update`.

### 2.6 The world's textures as texture arrays: one draw per cell (`texarray.js`, `drawbatch.js`)

The draw batches merge an area's static pieces per 48 m cell and material; folded pieces (a colour, roughness,
metalness and the map's transform in the vertices) shared a twin per texture — so a cell drew once per texture used in
it. Citadel had 112 batches, 67 of them one texture's pieces in one cell. Now every repeat-wrapped canvas texture is a
layer of a texture array (one array per canvas size and anisotropy: 64², 128², 256², 512² on Citadel), and a plain
colour is a white layer: a cell draws once per array — as far as the draw order allows (below). Draws in §1.

Same texels: the layer is the canvas read back (opaque painted canvases), rows flipped as the canvas upload flips them;
the same format (sRGB 8-bit), wrapping, filters, mipmaps (the driver's, per layer) and anisotropy; the twin samples
`texture(mapArr, vec3(uv, layer))` where it sampled `texture2D(map, uv)`. A canvas updated later (its version or its
source's moves) makes its pieces leave their batches. Builders' own merged pieces (merge.js twins with per-vertex
roughness) and glowing pieces (an emissive colour × intensity in the vertices) join too. Arrays grow when an area brings
new textures (built in its batch build, behind the scene change's black) and are sent to the GPU then.

**The draw order.** The first version put every foldable piece of a cell into its array's batch. On the Medium
interior 0.5 % of the pixels changed — whole patches: the stove's backsplash tiles became a wicker panel, a wall's
tiles became stone (`ray.mjs`: two pieces' faces coincide exactly; three draws opaque materials in id order and with
LessEqual depth the later one shows; a piece moved into a batch drawn at another point of that order loses or wins).
Now each piece keeps its place: `ord` is the id of the material it was drawn with before (its texture's twin when it was
in a folded batch, its own when it was drawn alone or in a batch of its own material); the ids of every material the
area still draws with cut that order into gaps, and a batch takes only pieces of one gap and one array run (a piece of
another texture size between them starts a new batch). The batch is drawn at its pieces' place (`__sortId`: a custom
opaque sort in renderer.js — three's own, with that id in place of the material's), its triangles in `ord` order.
The cost: fewer pieces share a draw than in the first version (§1). Pixels (`shots-var.sh`, `&notexarray` vs
default, one frame after the same route steps, `diff.py` + `patches.py`):

| view | pixels differing (> 8 levels) | inside a changed surface (3×3 block) |
|---|---:|---:|
| Medium interior (first version, every piece) | 5 177 (2 119) | 516+ (the tiles, the stone) |
| Medium interior (now) | 3 933 (1 225) | **0** (352: the "Talk" prompt fading in at another moment — the HUD, not the world) |
| Medium street | 6 (3) | 0 |
| Low street, Follow camera | 76 (12) | 0 |
| Medium arrival (Zeelich) | 1 (0) | 0 |
| High street | 354 (3) | 0 |

The remaining one-pixel lines are edges rasterized a hair differently: a piece drawn alone before is now transformed
on the processor into the batch (float32 positions), as every batched piece already was. The same check with the same
build twice: 0 pixels. The cost of the arrays: more triangles drawn (a cell's batch is bigger, its box less often wholly
outside the view), a texture fetch on surfaces that had none (the white layer), and the arrays' memory next to the
original textures (Citadel: 5 arrays). Tried and left off (`?loose`): lone pieces gathered per 144 m — the same
coincident-face changes (0.36 % of the interior's pixels).

### 2.7 SOLID-NPC's contact checks

Merged from `ccr-adf00ea7-37ebl3` (no conflict): Hero.keepApart (circle checks within 3 m) measured 0.05–0.075 ms a frame
(p50; street and combat); the residents' giveWay / moveClear / separate are inside their updates (sim.npcs, §1). Physics
`_inside` allocates more since (2.5).

### 2.8 Smaller things

- The HUD's stats panel wrote its texts every frame, even unchanged — a DOM mutation that makes the browser recompute the
  HUD's style and layout every frame. It writes only what changed. The modern HUD's minimap (a 2D canvas, drawn in the
  GPU process) is redrawn only when he moved or turned, the map turned, or 4× a second.
- A procedural body (`createHumanoid`: Sentinels, people dressed by look) merges each joint's plain-colour parts into one
  mesh in the joint's space (an eye still blinks, a ponytail segment swings). No route here shows one (every person on
  them is a polygon model); combat's enemies are other rigs (enemies.js), whose parts move on their own: left as they are.
- The benchmark reports per route "callback late" p50 / p95 and buffer / texture uploads per frame (calls and KB).

## 3. Auto: five profiles, evaluate then hold

`AUTO_QUALITY.md` §3–§5 (rewritten). Five named profiles, best first: **High · Medium · Medium-lite · Low · Low-lite**;
High, Medium and Low are the presets exactly; one profile at a time. The first minute or so of play across two scenes is
the evaluation (pressure 3 windows in a row → one down; room in every window over 30 s and two scenes → one up, once);
then the profile is **held** and cached per machine and power source. Afterwards only a power change or a sustained
problem (≥ 80 % of the windows under pressure and > 10 % missed refreshes over 30 s, in two scenes, or 60 s in one) moves
it — one step down; never up in a session (a session with lots of room marks the cache: the next start tries one
higher, evaluated, and does not retry for 3 starts if it fails). **Every change is applied only at a scene change or in
a menu.** Display-paced windows never count as pressure.

The CPU knobs for Auto, in the order the profiles add them (least visible first): Medium's small casters and grass
(Medium) → no MSAA, 2 lamps, Low's grass and small casters, 90 % resolution, **far people posed at half rate** (Medium-lite)
→ no shadows (Low) → **75 %, far people's small parts dropped** (Low-lite). Out-of-view people at a quarter rate and every
§2 saving apply to every profile and preset.

The governor's "step back up before a heavier area" (build 251's battery run: shadows raised on light combat and house
windows, the arrival then suffered) cannot happen any more: no step up after the evaluation, and the evaluation's single
step up needs room in every window across two scenes, by the model, at the profile above.

## 4. The combat route on battery (12–14 % of frames at 33 ms with light work)

What this machine shows on the combat route (Low, battery profile): **101–104 draw calls** (the arena's 7 meshes, the
enemies' rigs — Mites, Drones, Sentry, Crawler, Guards, a dog: 3–15 meshes each, enemies.js — sprites, blobs,
particles), **9 buffer / texture uploads a frame (52 KB)**, game CPU work 6.9 ms p50 here, **434 KB of garbage a frame**
(was 509), no shader compiled, no batch built, no cache rebuilt in play. Nothing in the game runs on a period that would
cost a frame: no timer, no readback (`readPixels`, `getError`, `finish` appear nowhere in play code; the GPU timer reads
results without waiting: `QUERY_RESULT_AVAILABLE` and the disjoint flag are answered on the browser's side).

The user's numbers say the same: CPU 6.6–8 ms, GPU 5.9–7.9 ms, "nothing drawn" 16.7 ms (the display is not slow) — and
on battery the frame callback starts 6–13 ms late. A frame of ~7 ms of work that starts 10 ms late misses the refresh: the
late start is the browser's GPU process (and the compositor) still busy with the previous frame at battery clocks —
translating that frame's draw calls and uploads for Direct3D 11 — which the GPU timer does not see. **So the misses are
outside the game's own work; what the game controls is how much it hands that process per frame**: draw calls (§1: the
arrays cut street and arrival by 17–20 %; combat's enemies are separate rigs: their parts would have to be merged by
enemies.js, which moves them on their own), uploads, and garbage (a minor collection on the main thread lands inside a
tight frame). The next battery report shows "callback late" and uploads per route to confirm or refute it.

## 5. Cold first-visit stalls

1. **Street, ~1.3 s after arriving (plugged: a 1 333 ms frame, "shadow cache rebuilt + 1 shader compiled")**:
   reproduced here (`lateprog.mjs`, Auto Medium): at 0.97–1.27 s the static shadow cache was rebuilt in full because the
   poodle — a dog that stood still through the area's first frames — had been merged into a static shadow batch; when
   it walked, its parts left the batch, the batch was rebuilt and every static caster redrawn into the cache. **Dogs
   (`dogs.js`: `userData.keep` on the rig) and every builder's moving part (`userData.keep`: boats, the cargo lift,
   crates) now cast on their own and never go into static shadow batches** (`shadowcull.js`, as drawbatch.js already
   did). After: §8.
2. **Arrival, 133 ms in view after the black**: on a first visit the area's shadow batches are built at its first
   update, and pieces that toggle on the area's first frames (84 on Zeelich, 104 on the desert, `lateprog.mjs`) leave them
   at once — the batches and the cache are rebuilt again in the next frames. The settle frames now keep the screen black
   while the last frame still rebuilt the cache, built batches, compiled a program or let pieces out of their shadow
   batches (at most 6 frames in all; before: up to 3, only while the last interval was over 50 ms).
3. **The full benchmark's first route (3 484 ms + 1 667 ms frames at 3.5 / 5.2 s into Low street)**: not reproduced
   here — on SwiftShader every frame of that run takes seconds. What runs then: the switch from Auto to the Low preset
   changes the shadow cells (32 → 16 m) and rebuilds the shadow and draw batches of the benchmark's areas (prepared at
   the switch for the shadow batches), right after `prepareAreas()` built five regions (a heap of several hundred MB:
   a major collection is as likely). The report names it next time (every frame over 33 ms lists its jobs and a GC);
   in normal play an area's builds are behind its black.

## 6. Draw calls for the battery

The coordinator's target for a battery-reference lowest profile: street ≲ 90 calls, arrival ≲ 120. Here (Low, battery,
`cpu.mjs`, p50 over the route's drawn frames, 16-frame A/B blocks): **street, Follow camera 133 → 110** (the first,
unordered version of the arrays: 103), Low-lite's small parts a further ~9; **arrival route 323 → 292** (unordered: 260).
**The street is close; the arrival is not.** What one drawn frame of each holds (`calls.mjs`, main pass; Low has no
shadow pass):

| Low, battery | street (Follow) | arrival (Zeelich) | combat (arena) |
|---|---:|---:|---:|
| the area's batches | 16 | 59 | 1 |
| the area's pieces left out: alone in their cell (or their place in the order) | 15 | 50 | 5 |
| … casting their own shadow (solo casters, kept out of batches) | 16 | 6 | — |
| … clamped textures, own shaders, moving parts | 13 | 8 | — |
| instanced meshes (grass, props) | 18 | 24 | 1 |
| transparent pieces | 3 | 20 | 6 |
| people (rigs), the hero | 16 | 8 | 8 |
| enemies, the dog, effects (other) | 17 | 12 | 79 |
| **in all** | **114** | **187** | **100** |

The arrival's levers, none taken here (each needs its own pixel check): solo casters could join the batches while the
profile has no shadow pass (Low, Low-lite: the batches rebuilt when a profile with shadows is committed — behind a
scene change's black); the order could be kept per cell instead of per area (a batch is split only by draws that can
overlap it: on Zeelich the order costs 73 − 39 = 34 batches); Zeelich's lone pieces are mostly single props of their
own texture size. Tried and dropped: a shorter view (the fog at 60 % and nothing drawn beyond it): −0 to −1 call on the
street (Citadel's views end before the fog), a visible change for nothing; lone pieces gathered per 144 m (§2.6).

## 7. Tests

Run one at a time on this container's SwiftShader (`probes/runtests.sh`, `GAME_URL` on this worktree), after the last
code change and the merge of `origin/ccr-adf00ea7-37ebl3` (0.37.0):

| test | verdict | time |
|---|---|---:|
| `autoquality.mjs` (the governor, synthetic 15-minute noisy sessions) | PASS 39/39 | 5 s |
| `autoquality-game.mjs` (profiles in the game, commit points, cache, calibration, evaluation, benchmark lines) | PASS | 3 102 s |
| `drawcalls.mjs` | PASS (street Medium: 159 main + 93 shadow) | 204 s |
| `perfbudget.mjs ROUTES=street` Low / Medium / High | PASS / PASS / PASS (calls 128 / 174 / 217 p50; 0 new programs) | 269 / 126 / 207 s |
| `timing.mjs` | PASS | 86 s |
| `walkers.mjs`, `solidnpc.mjs` | PASS, PASS | 101, 89 s |
| `well-town.mjs` (merged with 0.37.0) | PASS | 561 s |
| `transitions.mjs`, `lazyregions.mjs`, `menus.mjs` | PASS, PASS, PASS | 103, 416, 353 s |
| `merge.mjs`, `holomap.mjs`, `opening.mjs` | PASS, PASS, PASS | 4, 405, 968 s |
| `occluders.mjs` | FAIL (1 functional, not PERF-CPU: below) | 1 358 s |

`occluders.mjs` fails one functional check — "(b) the rise over a house is eased" — **identically on the base this branch
merged** (`b1eedc4`, SOLID-NPC, served unchanged on its own port: the same 930 frames, pitch 26.4° → 26.4°: the hero
never reaches the spot behind the south house, so the camera never rises; every other check passes). It is not a
PERF-CPU regression; the owner of SOLID-NPC / the occluder test should look at the test's walk.

## 8. Numbers and verdicts

- **World matrices** (`mwcheck.mjs`): 5 routes × 30 drawn frames, **113 962 matrices, 0 different** from three's formula.
- **Shadow distance detail** (`ddcheck.mjs`): street 33 785, interior 3 960, arrival 10 547 piece-frames judged, **0 wrong**.
- **Texture arrays** (§2.6): no changed surface on the Medium interior, street, arrival, the Low Follow street or the High
  street; one-pixel edge lines only (0.001–0.03 %; the interior's 0.37 % are one-pixel lines plus the HUD prompt).
- **The street's cold stall** (§5.1): after the fix the static shadow cache is rebuilt in full once, at the area's first
  drawn frame (behind the scene change's black), and not again in 150 frames (`lateprog.mjs`, Auto Medium).
- **Main-thread work** (§1): Low battery street, Follow 16.6 → 14.6 ms p50 (−12 %), combat 8.2 → 6.9 ms (−16 %); the
  sections each PERF-CPU switch touches −18 to −70 %. SwiftShader's main thread, relative only.
- **SOLID-NPC's contact checks**: 0.05–0.075 ms a frame (Hero.keepApart, street and combat p50).

## 9. What the user's next battery benchmark should show

Run on battery: **Benchmark: Auto as played** first (a fresh start: no cache), then the full Benchmark, then the same
Auto run plugged in. Compared with build 255 / 0.36.1:

1. **CPU work lower**: game CPU work on the street and arrival ~10–15 % lower at the same profile (build 255: 16–22 ms
   at battery clocks; the target ≤ ~8 ms is not reached by these changes alone — Auto's lower profiles take the rest:
   Medium-lite and Low-lite halve the far people's posing and drop small parts). Fewer collections: garbage per frame
   −20 % street, −15 % combat.
2. **Draw calls**: Low street ~110 (was 129–177 across presets), arrival ~290 (was 214–379): §6. The street with
   Low-lite should come near 100; the arrival stays well over the 120 target.
3. **Combat**: if the misses were the browser's GPU process at battery clocks (§4), "callback late" should now be on
   each route's line; a combat route with ≥ 10 % frames at 33 ms and callback late p95 ≥ 8 ms confirms it; the fix then
   lies in fewer draws and uploads per frame (enemies' parts), not in the game's CPU work.
4. **First entry**: no full shadow-cache rebuild ~1 s after the street appears (build 255's 1 333 ms frame, plugged);
   any frame over 33 ms names its jobs. The 3 484 + 1 667 ms frames at the full benchmark's start (§5.3) are expected to
   remain there (preset switch right after `prepareAreas()`); they are not in normal play.
5. **Auto**: build 255's report showed no title calibration; where it does not run, the first ~1–2 minutes of play are
   the evaluation (from the power source's guess); decisions only at route changes; then "settled" and nothing more in the run; the next
   start goes straight to the settled profile (AUTO_QUALITY.md §8).
6. If a battery route still misses 55 at the settled profile: the line's GPU and CPU p95 and "callback late" say which
   side; send that report.
