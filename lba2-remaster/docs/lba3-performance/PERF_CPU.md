# PERF-CPU: the game's own processor work per frame, Auto's profiles, the cold first-visit stalls, the combat pacing

Input: the user's battery runs on the Vega 8 laptop (Ryzen 5 3500U, 1366×768, 60 Hz): `results/laptop-build251-auto-battery.txt`
(Auto as played: street 51.8, combat 53.5, arrival 48.7 fps at Low, Auto's CPU ladder exhausted; CPU work p50 14.7 ms,
p95 21 ms) and `results/laptop-build255-battery-full.txt` (full benchmark: game CPU work 16–22 ms at battery clocks, a
3.5 s first-entry stall, "callback late" 6–13 ms, combat 13–14 % of frames at 33 ms with light work). Plugged in, build
251 already met 55–60 on most routes. The user (29.10): battery is the reference.

**Everything here was measured on SwiftShader (a software renderer) in this container, which was shared with other
agents' test runs (load average 8–19 on 4 cores).** Draw calls, triangles, uploads, allocations, matrices and which
objects are drawn are exact. Milliseconds are this machine's main-thread JavaScript (SwiftShader's GL work runs in its
GPU process and is drained before each timed frame) and are only compared side by side, A/B in the same browser (frames
alternated, or 16-frame blocks), never across runs. **No laptop frame rate, GPU time or battery figure is claimed.**

Probes: `PERF-CPU/probes/` (run from that folder with the game served; `isoserve.py` serves it cross-origin isolated so
`performance.now()` resolves 5 µs instead of 100 µs):

| probe | what it measures |
|---|---|
| `cpu.mjs` | per-frame CPU by section (simulation, people, camera, culling, matrices, batches, three's render), calls, uploads; `AB_A`/`AB_B`(/`AB_BLOCK`) interleave two states in one browser |
| `ab-all.sh` | every runtime switch of PERF-CPU off vs on, three views |
| `mwcheck.mjs` | every shown object's world matrix (and a skinned body's bind inverse) against three's formula from scratch, each drawn frame |
| `ddcheck.mjs` | the distance detail's decisions against the rule, each drawn frame |
| `alloc.mjs` | bytes allocated per frame by function (V8's sampling heap profiler, minor-GC garbage included) |
| `lateprog.mjs` | what happens after a scene change's black: programs compiled, shadow-cache full rebuilds (and why: which casters left or joined), batch builds |
| `sizes.mjs`, `why.mjs`, `unbatched.mjs`, `firstentry.mjs` | counts behind the numbers |
| `shot.mjs` + `diff.py` | the same view with a change on and off, pixels compared |

## 1. Results (before → after, this machine)

(filled in §8)

## 2. Engine-side per-frame CPU

### 2.1 World matrices: only what changed (`drawcull.js` shownTree)

three recomposes every shown object's matrix from position / rotation / scale and multiplies it into its parent's world
matrix every frame; the scene's own matrixAutoUpdate forces the whole tree. On the Low street view ~2 200 objects are
shown and ~150 change in a frame (people's limbs, the ball, the mill). The game moves objects only through position,
rotation (quaternion) and scale — no code of ours writes `.matrix` or `.matrixWorld` (grep: only the batches, created
with matrixAutoUpdate off). So an object whose ten numbers, parent and parent's world are unchanged keeps its world
matrix. Changed ones are recomposed exactly as three does; their subtree is forced as three forces it. A matrix
recomposed meanwhile by three's `updateWorldMatrix` (every `getWorldPosition` flags each parent up to the scene) is
recomputed and compared: only a different value forces the subtree. A skinned body's bind-matrix inverse follows its
world matrix (three's SkinnedMesh step, done here so its bones take the cached path); cameras and audio keep their own
update. Hidden subtrees are skipped as before; shown again, recomputed in full. `MW.cached = false` is three's own path.

- Exactness: `mwcheck.mjs`, street, combat, interior, transition, 30 drawn frames each: **84 633 world matrices and
  every attached skinned body's inverse compared, 0 different** (the same check on three's own path: 0 — the check is
  valid).
- The FarCull's post-render update of people left out of the view (PERF-HIGH) takes the same cached path.

### 2.2 Draw-batch checks (`drawbatch.js` watch)

Each frame every batched piece (~350–1 500) is checked for anything that would make its batch wrong. With this frame's
matrices from 2.1, a piece's parent chain is shown when the update reached the parent through shown objects
(`__visF`), its world matrix is compared in full only when the update recomputed it since it was last found equal
(`__mwF`), and a folded material's look is a version number per material (worked out once a frame, no string). The same
releases. The old path (`drawBatch.fast = false`) is kept for the A/B.

### 2.3 Shadow culling (`shadowcull.js`)

- Without the shadow pass (Low, Low-lite, the battery's no-shadow states) the caster work — pieces leaving their batches,
  the batches' and solo casters' view tests — is skipped; the first update with shadows checks every piece at once.
- The distance detail (Medium/Low: a static piece under 4/7 px is left out) is decided per piece only when the camera's
  and the focus's travel since its last decision could have flipped it (an odometer per area against each piece's
  margin to its nearest threshold), or its world matrix was recomputed. `ddcheck.mjs`: street and house, every drawn
  frame, **53 855 piece-frames, 0 wrong**.

### 2.4 People nobody sees are posed less often (`rig.js`, `drawcull.js` FarCull.anim)

A person outside the view is posed every 4th frame (beyond the fog every 8th) with the time of the frames between
(the joints' easing is exponential, so it arrives where it would have); the body still moves every frame. Never the
hero, an enemy, anyone during dialogue, a story scene or a door's fade; a person in view within 25 m always every frame.
In Auto's Medium-lite and Low-lite, a person in view beyond 25 m is posed every other frame.

### 2.5 Garbage per frame

V8's sampling heap profiler (`alloc.mjs`), Low street on battery, 100 drawn frames: **~1 020–1 120 KB allocated a frame**
before (≈ 60 MB/s at 60 fps: a minor collection every few dozen frames, each one or a few ms on a battery-clocked
processor). The largest: the Follow camera's clearance tests (175 KB + 35 KB in iterators: destructuring loops over
its sample ring and corners, a new empty array per empty physics cell), the occlusion grid's string keys, the walk
planner's heap swaps, physics and terrain loops. After: those loops indexed, numeric grid keys, one shared empty list
(see §8 for the numbers). The map built after an arrival allocates its 15 MB of arrays once (not churn).

### 2.6 The HUD and the minimap

The stats panel wrote its texts every frame, even unchanged — a DOM mutation that makes the browser recompute the HUD's
style and layout every frame. It now writes only what changed. The modern HUD's minimap (a 2D canvas, drawn by the
GPU process) was redrawn every frame; now when he moved or turned, the map turned, or at most 4× a second.

### 2.7 SOLID-NPC's contact checks

Merged from `ccr-adf00ea7-37ebl3` (Hero.keepApart: circle checks within 3 m; residents' giveWay/moveClear/separate).
Measured in `cpu.mjs` as `sim.hero.keepApart` (§8).

## 3. Auto: five profiles, evaluate then hold

See `AUTO_QUALITY.md` §3–§5. In short: five named profiles (High · Medium · Medium-lite · Low · Low-lite), one step at a
time; the first minute or so of play across two scenes is the evaluation; then the profile is held and cached per
machine and power source; a change is applied only at a scene change or in a menu; never up during a session.

## 4. The combat route on battery

(§8)

## 5. Cold first-visit stalls

(§8)

## 6. Draw calls for the battery

(§8)

## 7. Tests

(§8)

## 8. Numbers

(in progress)
