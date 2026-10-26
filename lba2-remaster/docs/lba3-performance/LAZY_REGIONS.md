# LAZY-REGIONS + AUTO-FIT — areas built on first entry; quality that fits the machine

Task (2026-10-26): the user's second computer (Intel UHD, Ice Lake G1 class, Direct3D 11, window 1042×695,
devicePixelRatio 1.475; `results/pc2-intel-uhd-build167.txt`): "it loads very slowly and gets stuck; the game itself
is stuck too". Startup about 110 s (build 81.4 s, shader preparation 29.4 s), the bar near 70 % at "Building the
island…" for over a minute; Medium street 37 fps (GPU-bound), High 12.9 fps (pixel ratio 1.475, MSAA 4×).

Labels as in PERFORMANCE_AUDIT.md: **MEASURED** (a probe here produced it), **SOURCE-CONFIRMED** (read in the code),
**INFERRED**, **NOT VERIFIED** (needs the user's computers).

## 0. Conditions

- Code: base `f09ce7e` (ccr-adf00ea7-37ebl3, build 167's source), candidate = this branch. Three.js r180.
- Machine: 4-core Linux container, **SwiftShader only** (software GL, no parallel shader compile: every program
  compiles synchronously on the CPU), headless Chromium, 1366×768, devicePixelRatio 1, quiet (no other agent; load
  2–4 from the browser itself). Times are CPU proxies; counts are exact. No frame rate here is the user's.
- Base served from an export of `f09ce7e` (port 8185), candidate from this worktree (port 8184); boots interleaved
  base / candidate, two of each per round.
- Probes: `docs/lba3-performance/LAZY-REGIONS/` — `boot.mjs` (startup: loadTimes, steps, heap after GC, GPU
  resource counts; `THROTTLE=6` for a CPU-throttled boot), `arrive.mjs` (first and second entry into areas in real
  time: build, card, programs, heap), `afterboot.mjs` (simulation CPU per step on the street right after startup),
  `boots.sh`, `runtests.sh`. Machine-readable results: `results/lazy-regions.json`.

## 1. What was built at startup, and why it was slow (MEASURED / SOURCE-CONFIRMED)

Before: `new Game()` built, in one synchronous call, Citadel and 32 other areas — all eight interiors, Zeelich, the
underground, Desert Island, the condenser, the temple, the wizards' rooms, the LBA1 rooms, the Hamalayi, the
observatory, the council rooms, the valve room, the arena and the eleven Zeelich islands — before the title. The bar
was one compositor animation from 25 % to 70 % over the last start's build time (12 s on a first start), so on the
Intel UHD it reached 70 % and stood there for the remaining ~70 s. Shader preparation then uploaded every texture of
every area. The areas are drawn only while the player is in them (PERFORMANCE_AUDIT.md §12): the cost was building
them and holding them, not drawing them.

Found on the way (MEASURED): the sculpted-model bake (`assets/bake.bin`) was stale since WORLD-FIX (24 Oct) changed
the foliage colours, so the 24 tree and bush models (and 6 newer props) were re-sculpted on every start: ~1–1.6 s of
Citadel's build here, INFERRED ~6–10 s on the Intel UHD. Re-baked (`tools/bake.mjs`, which now builds every area
first: `?allregions`). The bake stores the same sculpt, quantised as every other baked model is; 3 dead Dino-Fly
entries (no longer sculpted) dropped.

## 2. Part 1, LAZY-REGIONS: what changed

**The registry** (`src/game/regions.js`, new). Every area outside Citadel is a group with its rooms and its builder:
each interior on its own (house, well, office, project office, control room, workshop, lighthouse top, cellar), Zeelich,
the underground (its five rooms together), Desert Island (with the School of Magic's face), the condenser (two halls),
the temple, the wizards' tent and school rooms (one each), the asylum, the temple's maze and halls, the Hamalayi, the
observatory, the council rooms, the valve room, the arena, and each of the eleven islands. Lifecycle per group:
unloaded → loading → ready → active (on screen) → cached (left, kept); a build that throws is `failed`. Nothing is
released (§5: the heap stays small).

- `game.rooms` is the registry's view: reading a room builds its group if needed (`why: 'access'`, recorded with
  where it was read and printed by the tests with `REGIONS_LOG=1`). Every old caller stays correct by construction;
  the planned paths below build ahead, under a card.
- `regions.has(id)` — "is this room in the game" without building it (the doors' and the holomap's checks).
- `regions.built(id)` — the room if built, never builds it (the side stories' per-frame code, doors).
- `regions.peek(fn)` / `probe(fn)` — code run with unbuilt rooms reading as missing (startup's story and cast set-up;
  the cast placement and the exits, which also learn which unbuilt areas they asked for).
- `regions.whenBuilt(id, fn)` — state for an area applied now if built, else right after its build (a load's flags).
- `regions.centreOf(id)` / `sceneOf(x, z)` — where every room stands, built or not (data-only; the test harness).

**Startup** (`main.js boot`, was the constructor): Citadel in 21 steps (`world.js buildWorldSteps`, a generator: each
`yield` is a point where the screen paints; the statements and their order — so every random draw — are those of the
one-piece build), the town's dressing, then the house and the well (a new game's opening), then the room the newest
save stands in and its chapter's areas (`CHAPTER_AREAS`), then the story and the cast. Each step moves the bar by its
share, animated over its estimated time at this computer's pace (measured on the steps so far; the last start's pace
before that), with a real label: "Building Citadel…", "Building Twinsen's house…", "Building Zeelich…" (a save there),
"Preparing the story…", "Preparing graphics…" (the bar creeps on while the driver compiles), "Preparing Citadel…"
(the geometry upload, now in six parts with a paint between), "Almost there…". `?allregions` builds every area at
startup (A/B timing, the bake tool).

**First entry** (`startTransition(mid, need)`): a door, a room's exit, travel (ferry, glider, shuttle, spaceship), the
start of a chapter (`story.nextAreas()`), a load from a slot and the benchmark name the areas they go to. Any not built
are built while the screen is black, under a loading card: the loading screen itself ("Arriving at Zeelich…" /
"Entering the workshop…", its pictures and bar), shown after a 0.25 s delay so a quick build is only black. Then the
scene change's warm-up as before, plus the new area's textures and its shadow casters' depth programs; the hold for its
shaders lasts up to 20 s for a freshly built area (4 s otherwise). A build that fails says so on the card and the screen
clears on the old scene (the player stays, the door cools down 3 s). Under the tests' fixed stepping: built at once.

**What read other areas before their build, and now** (each found by reading the code and by the on-access log):

| Reader | Before | Now |
|---|---|---|
| NPC definitions (Zeelich's folk, Desert Island, the Hamalayi, the council, the observatory, the wizards' rooms) | spots read from every area at startup | a placeholder marked `pending`, the NPC hidden; placed at his spot when the area is built (`Game.addActors`) |
| Enemy definitions (depots, the underground, the asylum, the halls, the network's posts) | every area | made when their area is built; one killed before is put down at once |
| The story's things in areas (Arthur's conch, Nara's case, the cellar nook, the gallery niche, the hop-pack peg, the test step, the Wannie mine, the network's gliders and relays, the Hamalayi rope) | every area at startup | made once each, when its area is there (`once(key)`), then shown as the flags have them (`regionBuilt`) |
| Travel (`travel.js`) | every stop read from its built area | every stop exists from the start, in the same order; positions known without the area are filled in (ferry and glider stops, Zeelich's spaceport); Zeelich's shuttle pad and the islands' pads are read from the built area (reading them builds it); `travelRegion` dresses a region when it is built |
| Region containers | every area | per area, at its build |
| The crystals | the mill's read from Zeelich | the count is six without Zeelich; the mill's crystal appears when Zeelich is built (not if taken) |
| Containers' refill keys | every area's givers | a key of an area not built yet is kept until the area is built, then dropped if refillable (the same outcome: he has not been there since the load) |
| Cast placement (`refreshCast`) | every reached chapter's place() read its areas | probed: an NPC whose spot is in an area not built waits hidden and is placed after the build; a chapter reads its area only for its own cast |
| A load's flags (`applyFlags`) | every reached chapter's areas set up at once | flags set at once; what they change in an area goes on it when it is built (chapters 2–7 and 10, Kesh, Zeelich's street, the workshop) |
| Per-frame story code (the workshop, Kesh, Zeelich's street; the current chapter's update and things-to-use list: chapter 2, the dig, the steam, the pass, the observatory) | read their areas | read them once built, never build them (found by the on-access log in `spaceport`, which jumps to chapter 4 by flags; in play the chapter's start builds its area first) |
| Doors, exits (`doors()`, `exitTo()`) | read every chapter's area | a door's area is read once built; an exit reads its area only for its own exit; an exit whose landing is in an area not built yet builds it behind the black first |
| The benchmark | — | builds the house, the arena, Zeelich, Desert Island and the Hamalayi under the loading screen before its first route (`bench.prepareAreas`; `tests/perfbudget.mjs` calls it) |
| The holomap, the minimap, `regionOf` | — | unchanged: the current area (built) and static positions |
| The test harness `P.sceneOf` | built rooms' centres | the registry's positions (built or not) |
| Tests listing every room (stability D11, containers, zislands) | — | `game.regions.ensureAll('test')` first (the same build path) |

## 3. Startup, before and after (MEASURED, SwiftShader, interleaved boots)

| Boot (Medium, 1366×768) | base 1 | base 2 | candidate 1 | candidate 2 |
|---|---|---|---|---|
| page load → title (s) | 48.4 | 46.5 | **24.0** | **24.7** |
| build (s) | 10.9 | 10.7 | **4.0** | **4.0** |
| of which Citadel (world + town; s) | 3.9 | 3.6 | 3.4 | 3.3 |
| other areas built at startup (s) | 6.6 (32 areas) | 6.7 | 0.34 (house, well) | 0.38 |
| shader preparation (s) | 35.8 | 34.3 | **18.6** | **19.1** |
| shader programs ready at the title | 93 | 93 | 74 | 74 |
| GPU: geometries / textures at the title | 1237 / 457 | 1237 / 457 | 911 / 170 | 911 / 170 |
| JS heap after GC (CDP) / `performance.memory` used (MB) | 128 / 712 | 128 / 712 | **61 / 215** | **60 / 215** |

The first round (before the re-bake, same machine) gave candidate build 5.1–5.3 s against base 11.5–11.7 s: of the
6.7 s saved here, ~5.7 s is the lazy areas and ~1 s the re-bake (the base still re-sculpts its trees).

Steps (candidate 1, ms): Citadel — textures 87, heights 538, ground 136, cliffs 32, town 272, statue 59, tree spots 4,
tree models 14 (baked), trees/bushes 24, plants 63, island 320, landmarks 2, rest 24; spaceport 240, townlife 69,
containers 30, dressing 173; house 291, well 53; story and cast 109 (actors 95). Preparation: programs 56, textures
5769 (SwiftShader waiting for its compile queue), geometry 1393 in 6 parts (~230 each), batches 190, shadow programs
1065, first frame 9949, paints 208.

A CPU-throttled boot (`THROTTLE=6`; the throttle slowed this build only ×2.4, to 9.9 s for Citadel): 37 labelled steps;
the longest build step 2.6 s (a Citadel step); the longest gaps are the preparation's SwiftShader GPU waits
(textures 12.4 s, first frame 12.1 s), where the bar creeps (programs) or animates over the last start's time.

**The Intel UHD (INFERRED, NOT VERIFIED):** its build ran ~6–7× this machine's (Citadel 24.9 s against ~3.9 s here).
Build ~81 s → ~22–27 s (Citadel without the stale tree sculpting, house, well, story); preparation ~29 s → INFERRED
~18–22 s (74 programs instead of ~93, 170 textures instead of 457; Citadel's geometry upload unchanged, now in six
parts). Startup ~110 s → INFERRED ~45 s. The largest single build step there is INFERRED ~3.5 s (the height grid),
with the bar animated across it at the measured pace.

## 4. First entry into each area (MEASURED, `arrive.mjs`, real frame loop, Medium)

| Area (first entry by a door) | build (ms) | programs compiled behind the black | second entry: builds / programs |
|---|---|---|---|
| Zeelich | 806 | 9 | 0 / 0 |
| Desert Island | 852 | 3 | 0 / 0 |
| the Hamalayi | 927 | 1 | 0 / 0 |
| Otringal (an island) | 873 | 0 | 0 / 0 |
| Baldino's workshop | 379 | 2 | 0 / 0 |
| the council rooms (3) | 663 | 0 | 0 / 0 |
| the underground (5 rooms) | 588 | 7 | 0 / 0 |
| the water office | 208 | 0 | 0 / 0 |

Every other group, built at startup with `?allregions` (ms): house 471, well 81, office 94, project office 107, control
83, workshop 180, lighthouse top 133, cellar 70, Zeelich 581, underground 380, Desert Island 481, condenser 22, temple 20,
tent 13, school 20, asylum 142, maze + halls 165, Hamalayi 545, observatory 10, council rooms 337, valves 17, arena 5;
islands: Otringal 587, Knartas 287, Mosquibee 258, Celebration 151, Under Celebration 311, CX islet 72, the Platform
172, the Lift Dock 117, Tralu 288, the Orchard 230, the Old Watch 86. (A first build in a page also makes shared
textures and materials, so the first area built costs a little more.) The loading card showed on every first entry
(after its 0.25 s delay) and on none of the second ones. INFERRED on the Intel UHD: ×6–7, so ~1.5–6 s per first entry
behind the card; a revisit costs nothing extra.

## 5. Memory (MEASURED)

JS heap after GC: 60 MB at the title; 70 MB after Zeelich; 98 MB after the eight areas of §4; 122 MB with every area
built (tests/lazyregions.mjs) — against 128 MB at the base's title, where everything was built. Areas are kept once
built (no rebuild on a revisit; no release: R2 in PERFORMANCE_AUDIT.md stays open, nothing calls for it at these sizes).

## 6. Part 2, AUTO-FIT

- **Pixel ratio per preset by the device** (`renderer.js basePixelRatio`; `perf.js integratedGpu`): with an integrated
  GPU (Intel, AMD APUs, phone GPUs, software renderers; not Apple) on a screen with devicePixelRatio > 1: Low 0.85,
  **Medium 1.0** (was 1.25; at 1.0 the existing rule gives it MSAA 2×, as on the Vega laptop), **High 1.25** (was the
  screen's, 1.475 on the user's window) with MSAA 2× (was 4×). Discrete GPUs keep the old ratios. On the Intel UHD
  window: Medium draws 0.72 Mpx instead of 1.13 (−36 %; plus a 2× resolve), High 1.13 Mpx with 2× instead of 1.58 Mpx
  with 4×. INFERRED from the user's own breakdown (resolution ×0.6 → 60 fps on
  Medium): Medium near 50–60 fps there. NOT VERIFIED.
- **Automatic resolution**: on by default for new players and players who never touched it (it always was:
  `res: 'auto'`; no code writes `full`). The user's benchmark said "off": that is a choice made in Settings → Resolution
  (SOURCE-CONFIRMED), kept.
- **The one-time suggestion** (`src/engine/autofit.js`, new): in play only (no menus, scene changes, cinematics,
  benchmark, tests, hidden window), after 15 s of uninterrupted play, 10 s windows: a window is slow when its frame rate
  is under 5/6 of the frame budget's (50 fps at 60; 25 with a 30 fps limit) while the automatic resolution is already
  at its lowest (or off). Two slow windows in a row: a toast for 7 s — "The game runs below 50 fps here. Try the Medium
  graphics preset in Settings." (Medium → Low; on Low with Resolution: Full, "Try Resolution: Auto"). Once per preset
  (`settings.fitTold`). The preset is never changed by the game.
- **The first-start pick**: Low for the Intel UHD (perf.js `gpuQuality`, unchanged) and stored at once; a preset the
  player chose (`qPicked`) and their resolution choice stay across restarts (tests/autofit.mjs). The user plays on
  Medium by choice: kept, and with the cap above Medium is the lighter one.
- **The Low street that was CPU-bound right after startup** (sim 16 ms, submit 17 ms, 28.4 fps): what runs after
  startup here (`afterboot.mjs`, Low, the street route, 5 s windows): simulation per step 2.3–4.2 ms, no work left over
  from loading except garbage collection — the heap fell 88 → 62 MB over the first ~15 s. INFERRED for the user's
  machine: (1) at 28 fps every frame is over 33.3 ms, so it runs **two** simulation steps (MAX_STEP 1/30, main.js
  advance), which doubles "sim" against Medium's one step at 37 fps (16 ms ≈ 2 × the ~5–8 ms street step) — a frame
  rate just under 30 pays twice for the simulation; (2) the base's 712 MB startup heap was being collected during
  that first route. LAZY-REGIONS cuts that heap to ~215 MB (`performance.memory`). Not changed: the timestep (it
  protects movement and collisions). NOT VERIFIED on the machine.

## 7. Verification

Tests, one at a time (R7 verdict policy, `GAME_URL=http://localhost:8184/`, `TMPDIR=/dev/shm`, quiet machine): see
QA.md "LAZY-REGIONS + AUTO-FIT" for the verdict table. New: `tests/lazyregions.mjs` (startup set, data-only lookups,
first entry by a door in real time with the card, the cast placed, a revisit, a save elsewhere built at startup,
Load Game from a slot in an unbuilt area under the loading screen, nothing built on access in play, every area still
buildable), `tests/autofit.mjs` (the caps at devicePixelRatio 1.475, the suggestion, the picks kept).

Result: every listed test and the playthrough chain 01–06 PASS (06 with its declared ISO assist, as before). First-run
FAILs, each fixed or a known flake, then PASS on rerun: prologue (the known well-mite step), chapter4 (the cold-disc
check, flaky on the base too, now relative), chapter8 (Zoé waited for Zeelich), timing (expected per-area load times),
lazyregions (the card counted by a poll). The on-access log (`REGIONS_LOG=1`) shows only the tests' own teleports and
reads, except the current chapter's per-frame code, things-to-use list and action handler reading their area (found in
`spaceport`, which sets chapter 4 by flags): fixed, spaceport then 0.

**Same look** (MEASURED; `look.mjs` with no actors, Medium, base f09ce7e on port 8185 vs this build, `lookdiff.py`):
pixels that differ at all / by more than 8 levels / largest difference: desert 0 % / 0 % / 0; Zeelich 0.003 % / 0 % / 2;
harbour 0.73 % / 0 % / 3; house 0.69 % / 0.11 % / 59; square 2.5 % / 0.016 % / 116; the Hamalayi 4.0 % / 0.001 % / 136;
lane 5.5 % / 0.05 % / 248; Otringal 8.6 % / 0.001 % / 57. Looked at side by side with the difference picture: the
large counts are 1–3 level shading noise (trees and shadows; the re-baked tree data, §1, and run-to-run variation);
the few strong pixels are the objective label's text in the corner (house) and one pickup's sparkle (lane). No
object, colour or layout change seen.

## 8. What needs the user's two computers

1. Intel UHD: startup time and the bar (build, preparation, "never stuck"); the benchmark's startup line now lists
   the areas built at startup and since; first entry into Zeelich / Desert Island / the Hamalayi (the card, how long);
   Medium street and arrival fps with the 1.0 cap; whether the suggestion appears on High and reads clearly.
2. Vega laptop: startup (was 13.6 s build + 5.9 s preparation); Medium/High unchanged there (devicePixelRatio 1: no cap
   applies); the benchmark's "compiled while measured" still 0 on every route, the arrival route included.
