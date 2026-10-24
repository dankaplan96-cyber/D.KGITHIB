# QA — stabilization and regression checklist

Living document (PRODUCTION.md: "QA.md for feature coverage and reproduction steps"). It records what was
tested on which build, how, and with what result. **Evidence types**: `INPUT` = played through the game's input
(keys held/tapped in the game's input set, time advanced by the game's own step; no teleport, no flags);
`UI` = real page clicks / keyboard events; `ISO` = isolated with a debug shortcut (teleport or flag) to
reproduce or check a defect — never counted as proof that normal progression works; `LOGIC` = an existing
scripted test that teleports between story steps (exercises the story logic, not the route); `CODE` = read
only, not run. Results: PASS / FAIL / BLOCKED / NOT TESTED; fixed defects show FAIL → FIXED (retest).

Environment for every run here: headless Chromium 1.x with SwiftShader (software WebGL) on a 4-core Linux
container, served by `python3 -m http.server 8123`. Software rendering: no frame-rate figure from here is
representative of a GPU.

## How to run

```bash
cd lba2-remaster && python3 -m http.server 8123 &      # the game at http://localhost:8123
node tests/menus.mjs            # menus, pause, settings, focus, dialogue input, inventory, holomap, rebinding
node tests/stability.mjs        # the defects fixed in the stabilization pass (regression)
node tests/shipfiles.mjs        # every file the game requests is in the shipped list (desktop/publish)
node tests/transitions.mjs      # door walk-through, black hold while shaders compile
node tests/lib/seg.mjs tests/playthrough/NN-*.mjs   # player-input playthrough, one segment (LOAD=/KEEP= saves; see below)
node tests/chapterN.mjs en-US   # LOGIC chapter scripts (print their values: read them, exit 0 alone is no pass)
```
`tests/lib/player.js` is the input harness (A* over the game's own collision, Classic tank steering, E to use,
F to throw, Space to jump/crouch, threat-aware fighting, stealth past a watcher). `tests/lib/try.mjs <script>`
runs a page-side script; `LOAD=`/`KEEP=` continue from / keep a real save made through Esc → Save & quit.

## Defects found in this pass

| ID | Severity | Where | Reproduction (before the fix) | Root cause | Fix | Retest |
|---|---|---|---|---|---|---|
| D1 | Blocker | Twinsen's house, first minute of a new game | New Game → walk down the hallway to the front door: he stops dead at z≈7.55 (60 and 30 fps); the door can't be reached, the prologue can't start | `groundInfo` shrinks each brick by 5 cm; two floor bricks laid edge to edge leave a 10 cm seam; every room is built over the sea (terrain −6), so the seam reads as sea and `move` refuses the step | over water only, a brick within 6 cm still holds the hero (src/engine/physics.js) | INPUT: walks out at 60/30 fps; prologue played through by input |
| D2 | High | Any exit the story refuses (house without the ball, Zoé's office before the plan) | Walk into the door without the ball: the refusal line plays, then again every 1.5 s while he stands in the trigger — with Classic turning (90°/s) he can't turn away in time | the refused exit stays armed; `doorCool` only delays it | a refused exit re-arms only after he steps out of it (src/main.js `checkDoors`) | INPUT: one line, then he walks to the cupboard |
| D3 | High | Coasts with steep banks (Citadel west shore, −77.7, 52.8) | Walking along the shore he slides down a steep bank to the waterline and stays there forever: sea below (refused), too steep above, no jumping while sliding | the slide is refused at the water's edge; nothing else moves him | sliding without moving for 1 s counts as a fall (back to the last safe spot, −1 life); a slide is never recorded as a safe spot (src/game/actors.js, src/main.js) | ISO + INPUT (route no longer traps) |
| D4 | Medium | Death | Die, then pause within 2.2 s: the game-over screen pops over the pause menu; the timing was wall-clock | `setTimeout(gameOver, 2200)` | the death timer runs in game time (`deathT` in the hero's update) | tests/stability.mjs |
| D5 | Blocker (save) | Chapter 2 (The Joint Project), Zoé in the project office | Zoé finds the plan (autosave) → close the game → Continue: Twinsen is in the office with no guard, the flags are back to "Meet Zoé", the lockers count as searched. He can take the plan himself (Zoé's part skipped); with the plan's locker marked searched it can never be found again and the office won't let him out | the reset of the segment on load cleared the flags but not the room or the searched lockers | resume outside at the station gate as Twinsen; the segment's lockers become searchable again (src/game/story/chapter1.js) — as chapter 3's lighthouse segment already did | INPUT (stealth) + reload: outside, plan found again, segment completes |
| D6 | High | Cliff edges (the plateau's east cliff by the fort, −12.5, −82) | Walk along the brink: every second the brink is kept as the "safe spot"; he slides off, falls 11 m (−2), the shore below holds him in a slide, D3's recovery puts him back on the brink, he slides off again … until dead | the safe spot was any ground he stood on for a moment, however close to a slope he'd slide down | a spot is kept only with level, non-steep ground for a metre all round (`Game.stableSpot`) | ISO (tests/stability.mjs) + INPUT (the route that died now walks on) |
| D7 | Medium | Menus on a short window (a phone held sideways, 640×360) | Pause: the menu runs 24 px off the bottom; its top half can't be scrolled to (`justify-content: center` on an overflowing column) | layout | `safe center` + tighter spacing under 440 px of height (css/style.css) | tests/display.mjs at 5 sizes |
| D8 | Low | Long sessions | The music manager kept a line per track change forever (a few KB an hour) | unbounded debug log | keep the last 100–200 lines | code + tests/longsession.mjs |
| D9 | High (desktop) | The packaged desktop app (Windows/Mac/Linux installers) | Build the app (`npm run dist:linux` in desktop/) and start it: 404 for assets/lba1/asylum.json, bumaze.json, buhalls.json; the rooms rebuilt from LBA1 (the asylum under the fort, the Temple of Bù's maze and halls) are left out of the desktop game (and of a page published from the same list) | tools/game-files.mjs lists the files the build ships; it follows imports and lists the run-time fetches by hand, and LBA1's layouts (fetched since 0.19.0) were never added | list assets/lba1/*.json (tools/game-files.mjs) | tests/shipfiles.mjs (fails before, passes after); rebuilt app: no 404, desktop/test-desktop.mjs ALL PASSED |
| D10 | Blocker | Chapter 4 (The Dig), arriving on Desert Island | Come up the shaft at the end of chapter 3: Twinsen stands on Kesh's pier; walking off its landward end he stops at the last plank (3311, 2, 5.3) — the sand beyond is 2.4 m lower and under the water line, so the step is refused as sea; nothing else leads off the pier. (The chapter-4 LOGIC test teleports past it.) | desert.js `heightFn`: the beach ramp to the deck is applied before the shore blend, which pulls the ground at the pier's end down to the sea floor | after the shore blend, the sand within a few metres of the pier's landward end is raised to the deck's height (src/game/desert.js) | tests/stability.mjs D10 (fails before: stuck at 3310.9; passes after); playthrough 07 by input |
| D11 | Blocker | Chapter 5 (Steam and Sand): the condenser hall's door into the hangar; also Zoé's lighthouse segment leaving by the stairs and the Shell's room exits without a matching doorway | Route the valves, walk through the hangar door: in the hangar Twinsen's x and y are NaN (he vanishes, nothing moves, the chapter can't go on) | a story exit may return only the room (`{ room: 'condB' }`); `enterRoom` took any spawn object and set the position from its missing x | `enterRoom` uses the room's own spawn unless the given one has finite x and z (src/main.js) | tests/stability.mjs D11 (NaN before; at the spawn after; lists the room-only exits found in all chapters); playthrough 08 by input |
| D12 | Blocker | Chapter 6 (The Pass): the rope lift at the top of the cliff | Ride the lift up: at the top he can't step off the platform onto the plank ramp to the monastery terrace (refused at z≈−23.3); trying, he falls 10 m back to the cliff foot. The chapter can't be finished by walking (the LOGIC test teleports to the top) | the platform's and the ramp's colliders leave a 0.1 m seam, widened by the 5 cm shrink on each; under it the ground is the cliff foot, read as a drop | D1's rule (a brick within 6 cm holds him) now also applies where the ground under the seam is more than 1 m below him, not only over water (src/engine/physics.js `groundInfo`) | tests/stability.mjs D12 (stuck/fell before; walks onto the terrace after); playthrough 09 by input |
| D13 | Blocker | Chapter 8 (Evacuation): the fortress shelter's lever in the station yard | After Gilbert, go to the cistern lever: it stands in the middle of a station tank (cylinder r 2.4, top 19.5 m, the yard is 13.9 m): no way to reach it, the shelter can't be opened (the chapter-8 LOGIC test calls the lever by its coordinates without walking there) | the Citadel rebuild moved the station's tanks to the original layout; the chapter's lever and cistern kept their old coordinates | the lever and its cistern moved 4.2 m to the nearest free spot of the yard floor (src/game/story/evacuation.js `FORT.lever`; tests/chapter8.mjs, playthrough 11) | tests/stability.mjs D13 (reads the game's lever position: on the tank before, on the yard floor and walked to after) |
| D14 | Blocker | Chapter 8 (Evacuation): Zoé's run to the hill farms | Tell Zoé the shelters are open (at home): she steps out at a fixed point (−45, −6) — since the Citadel rebuild that is inside the closed ring of project barriers around the well (r 5.6 m, gaps of 0.23 m); she can't get out and the farms can't be reached | a pre-rebuild coordinate | she leaves by the house's front door (the same outdoor point as its exit) (src/game/story/evacuation.js `startZoe`) | tests/stability.mjs D14 (stuck 3.6 m from the well before; outside and walks to the first farm after); an audit of every coordinate literal in the Citadel story files against the rebuilt geometry found no other |
| D15 | Blocker | Chapter 8 (Evacuation), "Go to the station's control room" (also chapter 10 and the epilogue, which share the town's doors) | After a real chapter 2 (Zoé's office segment played), the control room has no door in chapter 8: the objective can't be reached. (The LOGIC test sets chapter-2 flags selectively, without `c1_zoeStart`, so it got the door.) | the later chapters take the town's doors from chapter 2's list, which offers the control room only until Zoé's segment starts | `townDoors()` always includes the station's control-room door (src/game/story/index.js) | tests/stability.mjs D15 (no door before; walks in after); playthrough 11 by input |
| D16 | Blocker (save) | Chapter 11, the core fight | Die (or quit) during the fight's second phase and Continue: in the core with no fight, no coil to break, the guardian still chasing, the objective back at "Reach the core" | the load enters the core while the title is still up; the fight's intro dialogue began then and the switch to play cut it, so its ending (start the fight) never ran | the chapter keeps an interrupted fight and restarts it once play is under way in the core (no intro again; with three pylons straight to the coil) (src/game/story/chapter3.js) | tests/resume.mjs D16 (real reload + Continue: fails before, passes after) |
| D17 | Blocker (save) | Any scene that starts as a room is entered and moves the story on at its end: Sendell's (chapter 11), the control-room screen (chapter 8) | Quit during Sendell's words and Continue: his dialogue box sits on screen, nothing advances, the way to the core never opens | same as D16: `startContinue` switched to play over the dialogue that the load had begun | Continue leaves a dialogue (or cutscene) begun during the load running (src/main.js `startContinue`) | tests/resume.mjs D17 (fails before, passes after); zoe-resume, save-migration, menus re-run |
| D18 | High (soft-lock) | Citadel, the gully at the plateau's edge below the orchard (−68.7, 8.3, −48) — reachable from the orchard plateau (chapter 2's caged valve): a dodge (X back-step) during the fight there drops him in | Found in the final run. From inside, holding Up in 16 directions for 2 s each never leaves it; a path search over the game's own movement (drops of up to 7 m allowed) reaches only ~100 m² around it. He doesn't slide there, so D3's rescue doesn't fire, and an autosave can keep the spot | the terrain's pit filler (`world.js fixTraps`) models climbing on a 4-neighbour grid at slope 0.95; the game walks an interpolated surface with a body (and refuses rises steeper than 1.1 per step), so it judged the gully escapable. A gentler filler slope (0.8, island-wide) was tried and doesn't open it | the dead-end gully is filled to the plateau's level, soft-edged, before the filler runs (`world.js PIT_FILLS`) | tests/stability.mjs D18 (stuck at 8.2 m before; at 14 m and walks to the orchard after); playthrough 04 by input |

## Independent review
A review of the game-source diff (the lba3-reviewer role, run as a separate agent; code reading, no edits) passed D1–D17
with these follow-ups, all applied and retested: the raised sand at the Desert Island pier had steep side banks down
to the water (D10: wider falloff; tests/stability.mjs now also checks there's no slide-steep cell around it); after a
Zoé-segment Continue Twinsen came back with her loadout, no ball (D5: his ball and Normal back; zoe-resume checks it);
the safe-spot check re-ran every frame where it failed (D6: retried every 0.25 s); a dead fallback to the very point
D14 fixed (removed); a fallback for browsers without `safe center` (D7); the seam rule's drop threshold now matches
the fall threshold, 0.6 m (D12).

## Feature checklist (build 0.22.1)

Columns: where the player meets it · expected · test · evidence · result. "LOGIC" chapter scripts teleport between
steps; the player-input playthrough (tests/playthrough/NN-*.mjs through tests/lib/seg.mjs) walks, talks, throws
and fights its way through with keys only.

### Startup, menus, settings
| Feature | Where | Expected | Test | Evidence | Result |
|---|---|---|---|---|---|
| First launch, loading | title | title menu only; Continue disabled without a save; defaults (Classic, LBA camera) | menus.mjs | UI | PASS |
| New Game | title | play starts in the house (?nocine) / the opening cinematic otherwise | menus.mjs, opening.mjs | UI | PASS |
| Opening cinematic: play, skip (3 points), pause, focus loss, Continue no replay, second New Game no duplicates | new game | same end state skipped or watched | opening.mjs | UI/LOGIC | PASS (after the D2 order fix) |
| Continue | title | resumes the saved scene and state | every playthrough segment (Save & quit → Continue) | INPUT+UI | PASS |
| Save & quit (pause menu) | pause | saves, back to the title | seg runner KEEP | UI | PASS |
| Pause / resume (Esc, button), 20 presses | play | world stops; held keys don't leak; no stray overlay | menus.mjs | UI | PASS |
| Settings: open/close ×5, values apply at once, kept after relaunch, shown when reopened | title/pause | — | menus.mjs | UI | PASS |
| Controls screen, rebinding, reset | title/pause | key stored, prompt label follows, reset restores | menus.mjs, controls.mjs | UI | PASS |
| Title keyboard navigation | title | arrows move the selection | menus.mjs | UI | PASS |
| Quality changed ×10 then play | pause → settings | renders, moves, no errors | crosssystem.mjs | UI | PASS |
| Exit (Quit Game) | desktop title | closes the app | desktop/test-desktop.mjs | packaged app | see Packaging |

### Input and movement
| Feature | Expected | Test | Evidence | Result |
|---|---|---|---|---|
| Classic (default) arrows: turn 90°/s, walk, back | LBA2 keyboard | combat.mjs §classic, all playthrough segments | INPUT | PASS |
| Modern scheme, mouse aim, pad, touch labels | — | combat.mjs, controls.mjs | LOGIC/INPUT | PASS |
| Behaviours F1–F4, Ctrl menu | — | menus.mjs, playthrough (Discreet overhearing, Athletic jumps) | INPUT | PASS |
| Athletic jump onto raised stones | 12 stepping stones to the Whispering Cliffs | 04-project-valves | INPUT | PASS |
| Focus lost while holding a key / charging | keys released, nothing stuck | menus.mjs, crosssystem.mjs | UI | PASS |
| Dialogue: held movement doesn't move the hero; E advances | — | menus.mjs | UI | PASS |
| Low frame rates (10–30 fps) | same distances and timings | timing.mjs | LOGIC | PASS |

### Camera and collision
| Feature | Expected | Test | Evidence | Result |
|---|---|---|---|---|
| Floor seams in rooms over the sea | walkable | stability.mjs D1 | INPUT | FAIL → FIXED (D1) |
| Steep banks at the waterline | no trap | stability.mjs D3 | ISO | FAIL → FIXED (D3) |
| Safe spot after a fall | stable ground | stability.mjs D6 | ISO+INPUT | FAIL → FIXED (D6) |
| Room camera height and framing in big rooms | follows the floor, hero inside the frame | 0.22.0 (lba1rooms.mjs, chapter3.mjs) | LOGIC | PASS |
| Pathing across Citadel, Zeelich, Desert, Hamalayi, the shell by the game's own collision | every route the story needs is walkable | playthrough segments | INPUT | see Story |

### Combat
| Feature | Test | Evidence | Result |
|---|---|---|---|
| Sword combo, heavy, active frames, one hit per swing, walls, dodge i-frames | combat.mjs (60 checks) | LOGIC/INPUT | PASS |
| Ball: tap/charge, magic bounces, recall, no tunnelling, fetch bonus, back in hand | combat.mjs | LOGIC/INPUT | PASS |
| Targeting, lock-on, aim assist off | combat.mjs | INPUT | PASS |
| Enemies: mites, drones, sentries, crawlers, Vesk's guards (armour), guard dogs, troopers | combat.mjs, playthrough fights (depots) | LOGIC/INPUT | PASS |
| Pause while charging; weapon swap while the ball flies; door with the ball in the air; death with the ball out → Retry | crosssystem.mjs | INPUT/UI | PASS |
| Death → game over (game time) → Retry | stability.mjs D4, crosssystem.mjs | ISO/UI | FAIL → FIXED (D4) |

### Interactions and items
| Feature | Test | Evidence | Result |
|---|---|---|---|
| Talk / search / use / read prompts and their target | playthrough (harness checks the prompt is the intended thing) | INPUT | PASS |
| Givers: one bonus per giver, mashing E/Space | givers.mjs, crosssystem.mjs | INPUT | PASS |
| Inventory (I), holomap (H), shop menus | menus.mjs, 11-evacuation (Pippa) | UI | PASS |
| Refused exits (no ball / no plan) | stability.mjs D2 | INPUT | FAIL → FIXED (D2) |

### Saves
| Feature | Test | Evidence | Result |
|---|---|---|---|
| Autosave + Save & quit + Continue across every segment | playthrough | INPUT+UI | PASS so far (see Story) |
| Save made during Zoé's office segment | zoe-resume.mjs | INPUT+UI | FAIL → FIXED (D5) |
| Old saves (v1), a save in a missing room, a corrupt save kept aside | save-migration.mjs | LOGIC | PASS |
| Weapons saved and restored | combat.mjs | LOGIC | PASS |

### Audio (state only: nothing here was listened to)
| Feature | Test | Result |
|---|---|---|
| Volumes from the sliders reach the buses, kept after relaunch | audio.mjs | PASS |
| Music per place; one voice playing, ≤2 alive (fading) after each door | audio.mjs, longsession.mjs | PASS |
| Voices (gibberish babble) timed to text; distinct, under a level ceiling, no clicks, silent after skip/close/pause (VOICE-1) | voices.mjs | PASS |
| Cinematic pause suspends the audio context | opening.mjs | PASS |

### Interface and display
| Feature | Test | Result |
|---|---|---|
| HUD, prompt, dialogue, pause menu inside the window at 1920×1080, 1280×720, 1024×768, 800×600, 640×360; canvas follows a resize | display.mjs | FAIL (640×360 pause menu) → FIXED (D7) |
| Fullscreen | — | NOT TESTED (headless; the desktop app is windowed) |

### Performance and long sessions (software rendering: counts only)
| Measure | Result |
|---|---|
| 30 cycles of door in/out + 3 throws + a conversation | objects 8238 → 8238, geometries 938, textures 393, programs 116, music voices 1, intervals/listeners flat, heap +0.8 MB after GC (longsession.mjs) — no leak found; music debug log bounded (D8) |
| Simulation CPU per frame (headless, no render) | house 1.0 ms, Citadel square 1.3 ms, depot with enemies 1.4 ms |
| In-game benchmark (draw calls / triangles) | street High 847 / 1.23 M, Medium 441 / 846 k; house ~211–223 / ~410 k (was 201 k at 0.11.0, before the house rebuild); combat ~220 / 253 k |
| Frame rate on a GPU | BLOCKED: no GPU here (SwiftShader). The user's own benchmark (pause → Benchmark) is the way |
| First visit to a room/region | shaders compile behind the black transition (0.22.0, transitions.mjs) |
| PERF-IGPU (2026-10-18, branch of d3a7343 + a9c1ec8): black frames from the automatic resolution | FAIL → FIXED. tests/dynres.mjs on the old renderer: every resolution step after a drawn frame left the drawing buffer black (8/8 probes), targets disposed 26×; now 8/8 PASS (15 forced steps, no blank frame, sizes and targets constant, hysteresis, preset change, window resize) |
| PERF-IGPU draw calls (tests/perfbudget.mjs, 1366×768, preset saved before loading) | street Low/Medium/High 344/630/713 → 277/325/365; interior 151/255/268 → 117/121/135; transition 224/412/483 → 161/206/230; combat 144/217/230 → 145/214/227. Budgets met: High street ≤ 450, interiors ≤ 150. Not met: Medium street ≤ 300 (needs the town.js/island.js merges, VISUAL_REMASTER "Remaining" 3) |
| PERF-IGPU shader programs | at load Low/Medium/High 107/115/123 → 69/79/87 (no second compile for the canvas); 0 new programs on any route after loading, at every preset (shadow depth programs warmed too) |
| PERF-IGPU first door after a new game (coordinator's merge check) | FAIL → FIXED. transitions.mjs "real time … fade-in runs in full" failed: the shadow warm-up at load drew the whole scene once more (a 4096 shadow map and a full frame), which queued ~10 s of software-GPU work that the first door then waited on. The warm-up now draws only its small copies (the scene's lights kept, everything else hidden). First rAF after unfreezing 11.4–13 s → 1.0–2.1 s (rt.mjs); transitions.mjs ALL PASSED ×3, dynres, stability pass; 0 new programs on the street route |
| PERF-IGPU regression (same build) | dynres 8/8, merge 3/3, stability 16/16, display 15/15, transitions 5/5, house 2/2, townlife 35/35, spaceport 7/7, opening, shipfiles, timing: see the PERF-IGPU report; no page errors |


### PERF-2: draw calls and CPU per frame on the laptop's routes (2026-10-19; evidence docs/lba3-visual/evidence/PERF-2/)
Measured here on SwiftShader (headless Chromium, 1366×768, the preset saved before loading): counts are exact, times are
CPU proxies on a loaded machine (load average 6–8 from parallel work), never GPU time. Baseline = this branch at 533d0b5
with only the benchmark's new route and counters (so both sides measure the same frames).

| Check | Result |
|---|---|
| Why the laptop's bench showed 542 calls and perfbudget ~290 | The user plays with the **free camera**. The 0.31.0 bench's street route turns only the free orbit (`camRig.yaw += …`); with the default LBA camera it measures the follow view (~260–290), with the free one the views across the square and up the town (Low 471 / Medium 521 calls here, laptop 477 / 542; triangles 690k / 1071k here, laptop 697k / 1091k). Not multi-draw emulation, not the shadow layers, not double counting: three counts one call per WebGL call; WEBGL_multi_draw is present in Chromium/Electron on D3D11 (ANGLE then issues each sub-draw itself: now reported as "GPU draws") |
| Benchmark route fixed (bench.js) | every route runs the free orbit from a fixed heading/pitch/distance, the player's camera put back after; the street starts at heading π/4 and reproduces the laptop's 0.31.0 numbers (Low 478 calls / 693k tris vs the laptop's 477 / 697k; Medium 527 / 1086k vs 542 / 1091k). The report adds the calls' p95, the shadow pass's calls, GPU draws and WEBGL_multi_draw. perfbudget.mjs samples the bench's own 1.5–7.5 s window |
| Street calls, median (p95) Low / Medium / High | 478 (640) / 527 (732) / 602 (837) → **292 (347) / 350 (444) / 438 (550)**; GPU draws 561 / 709 / 817 → 374 / 532 / 652; shadow pass (Medium) 35 → 36 |
| Interior · combat · transition calls, Low / Medium / High | interior 118 / 122 / 136 → 103 / 105 / 118; combat 147 / 216 / 229 → 121 / 190 / 203; transition 632 / 701 / 804 → 358 / 428 / 543 (the transition route's outdoor frames now use the free orbit at the house door, looking over the town: the laptop's 118–122 was mostly interior frames) |
| Triangles, street | Low 693k → 761k, Medium 1086k → 1158k (+5–7 %: town merged in 96 m cells and 70-cell terrain tiles draw some geometry just off screen) |
| CPU per frame (cpu.mjs, matched A/B, the street's three heaviest headings, GPU queue drained before each timed render, median of 30) | render submission Low 10.3–11.4 → 5.7–5.9 ms (−46 %), Medium 13.6–15.3 → 7.8–9.2 ms (−42 %) at load ≈ 3–4 on both sides (cpu-ab-lowload.txt); −33 % in the two rounds at load 7–9 (cpu-ab.txt). Simulation unchanged (2.4 / 3.1 ms). The matrix update of hidden subtrees was the largest single JS cost (profile: ~30 % of render's own time) |
| Transition stall source | Game.warmScene ran three's compileAsync over the whole scene (~6 400 meshes) at **every** door: 70–130 ms of main thread here with nothing left to compile. Now once per scene and light/graphics state: first entry 72–81 ms, every later entry 0.2–4 ms (warm.mjs) |
| Door parts and the small-prop culling (the user's "door not fully drawn") | tests/doorcull.mjs (new): 16 house doors (Citadel and Zeelich), Twinsen 2/6/12 m out, LBA + free camera, Low and Medium vs High. Before: **FAIL** — a 4 cm brass part by Twinsen's own door culled at Low and Medium with him 2.7 m away, two parts of Baldino's workshop door at Low. After: PASS 192/192 (nothing within 16 m of Twinsen is culled for size) |
| Look | same-frame captures before/after (look/*-cmp.jpg: before · after · difference ×6) at 7 Citadel views: static scenery identical; differences are the NPCs' animation phase and the water's clock |
| Shader programs | at load Low/Medium/High 70/81/89 → 74/85/93 (the folded twins); 0 new programs on any route after loading, every preset |
| Regression (this build) | merge, dynres, stability, transitions, occluders (house lookup taught the merged town), camclear, townlife, holomap, deaths, opening, doorcull: ALL PASSED; opening again after merging OPEN-3 (9750466, with its per-frame solids check): ALL PASSED |
| perfbudget budgets (unchanged) on the new, heavier route | Medium street ≤ 300: FAIL (350); High ≤ 450: PASS (438); Low ≤ 260: FAIL (292); interiors ≤ 150: PASS; no new programs: PASS. The budgets were set on the LBA-camera route; not relaxed |

### Story and progression (player-input playthrough, tests/playthrough/01–14)
Each segment continues from the previous one's real save (Esc → Save & quit → Continue). INPUT = keys only (arrows,
E, F hold/tap, Space, X, K, R, F1/F2, menu clicks). ISO assist = a fight or move the bot can't do, finished through the
game's own damage/hit rule and logged (`ISO assist:` in the segment log) — never counted as input. Deaths are
played as a player does: the game-over screen's Retry (continue from the last save).

| Chapter | Segment(s) | Result by input | ISO assists (logged) | Defects found and fixed on the way |
|---|---|---|---|---|
| 1 The Well (prologue) | 01, 02 | PASS: ball, well, key, rope, stealth, Tim, cave, crystals, Sendell | — | D1, D2 |
| 2 The Joint Project | 03, 04, 05 | PASS: Zoé, Vesk, pipe map, three valves (depot fight, caged orchard valve, cliff stones), tour, Zoé's stealth segment, confrontation, radio, ferry | — | D5 |
| 3 Zeelich | 06 | PASS: Baldino, Oku, the old mill climbed by jumps (6 stones + gallery), cog, three mills, key, Zoé's dials, shield, Vesk, shaft | the depot fight (2 drones, an armour-2 Grobo guard, a dog; entered with 6/10 HP) | — |
| 4 The Dig | 07 | PASS: Tarra, pump gears, Hesk, rope, sand-yacht, Ilka, notebook, gate, seals, temple, carving | — | D10 |
| 5 Steam and Sand | 08 | PASS: jar, oasis, shovel, hall, diagram, valves, hangar, hatch, Dallan, relief valve, vent, Hesk, glider | — | D11 |
| 6 The Pass | 09 | PASS: tree bridge, the switchback trail, Lhar, Yorna, kite, fuse, heat, rope (sword), winch, ice mites, lift, monastery | — | D12 |
| 7 The Observatory | 10 | PASS: keeper, mirrors, telescope, heavy drone, vent | — | — |
| 8 Evacuation | 11 | PASS: Zoé, Gilbert, lever, depot wheel, Mira, Pippa, Zoé's farm run, lighthouse, control room, ship | — | D13, D14, D15 |
| 9 The Council | 12 | PASS: street folk, petition, Nara, Oku (mills), clerk, hearing, the archive in a coat, BORE plans, vote | — | — |
| 10 Baldino's Network | 13 | PASS: five relays (the old mill climbed again, valve room, lighthouse dials, bore, dome), console | a sentry, the bore's five drones, the ridge crawler, two mites (the bot at 1–4 HP) | — |
| 11–12 Shell + Core | 14 | PASS: machinery (diagram, valves A/C, ladder switch, catwalk), pillars, the stepping stones (crossed by input in two of five runs), Sendell, the core, three pylons | the stepping stones in the other runs (placed on the far shelf); the overload coil's three hits (the overloaded guardian kills the bot) | D16, D17 |
| Epilogue, end screen, Keep Exploring | 14 | PASS: dinner, The End, free roam with the save kept; Continue resumes in free roam | — | — |

Human-playtest items (not judgeable by the bot; balance unchanged): the Zeelich depot fight at low HP, chapter 10's
fights when HP is low, the stepping-stone hops, the overload-coil phase of the final fight. The bot never heals at
givers and carries low HP through the late chapters; a player normally would.

### Packaged app
| Check | Result |
|---|---|
| Linux unpacked build (`node copy-game.mjs && npx electron-builder --linux dir`), `xvfb-run -a node desktop/test-desktop.mjs release/linux-unpacked/lba3-the-awakening`: window + app://, bundled font, Quit Game, new game + opening + save, relaunch → Continue resumes, Quit | PASS (after D9; before it, 3 × 404 for the LBA1 layouts) |
| Windows / Mac installers | NOT TESTED here (built by the GitHub Actions workflow on push) |

### Zeelich's islands and Citadel Spaceport (0.23.0)
| Check | Evidence | Result |
|---|---|---|
| All 7 islands build; each has a main walkable area (≥ 100 m²) with the shuttle's spawn on land | LOGIC (tests/zislands.mjs) | PASS |
| Chapter 4: E at Zeelich's shuttle → menu (spaceport, Zeelich, 7 islands) → Otringal; island → island → Zeelich | INPUT (ISO: chapter flags, start by the dock) | PASS |
| Before chapter 4: no shuttle prompt on Zeelich; the spaceport's shuttle shows the grounded note, no menu | INPUT | PASS |
| Otringal: walks to 5 far points of its main area (≥ 4 must arrive) | INPUT (A* over the game's movement) | PASS |
| Every island: running at the sea from the spawn in 8 directions stops at the waterline (≥ −0.35), no fall | INPUT | PASS |
| No traps: from every sample point (5 m grid) of each island's main area he walks away | ISO place + INPUT walk | PASS |
| Save & quit on Celebration Island → Continue: back there, in play; holomap opens/closes | UI + INPUT | PASS |
| Town square → footbridge → spaceport deck → shuttle; departures board reads; deck railings hold in 8 directions | INPUT (ISO: start outdoors in the town) | PASS |
| Spaceport → Zeelich → spaceport (beside the pad, on the deck) → Otringal | INPUT | PASS |
| Regression after the change: stability, transitions, crosssystem, menus, shipfiles, opening, house, prologue, chapters 1, 2, 8, 10 | LOGIC/INPUT | PASS (rc 0) |
| Defects found while building it (fixed before commit): coast cliff face held him at the waterline → respawn loop to death; objects on steep slopes made slide traps; paths over slopes too steep to climb; Mosquibee's shuttle on a bare plateau | — | FIXED |
| Look on a GPU, feel by hand | — | NOT TESTED (software-rendered screenshots only) |

### All of Zeelich and the travel network (ZL-ALL + CONNECT; VP-9)
Served on 127.0.0.1:8177 from the worktree; headless Chromium + SwiftShader; tests from a scratch directory.
| Check | Evidence | Result |
|---|---|---|
| The original's files identified from numbers: ASCENCE (Zeelich, scene 121 → the Lift Dock), CELEBRA2 (Celebration later: pit + 21 m figure), CITABAU (Citadel again), EMERAUDE/MOON (the Emerald Moon) | tools/lba2-islands.py header; scratch analysis | DONE (numbers) |
| All 11 Zeelich places build (7 + the Lift Dock + our 3); main walkable area ≥ 100 m², spawn on land | LOGIC (tests/zislands.mjs) | PASS |
| Every island incl. the Lift Dock's decks: running at the edge in 8 directions never below the waterline / off a deck; no trap from any sample point | INPUT | PASS |
| The Lift Dock, Tralu Rock, the Nectar Orchard, the Old Watch, Celebration: every landmark walked to from the arrival; each new place's giver gives once (Space in Normal) | INPUT (ISO: enter the region) | PASS |
| Save & quit on Celebration → Continue; holomap on an island | UI + INPUT | PASS |
| Gates: ch. 2 nothing open (spaceport grounded note); ch. 4 ferry only (Citadel → Desert); ch. 5 ferry gone; ch. 6 glider Desert ⇄ Hamalayi, Citadel's field closed | INPUT (ISO: chapter flags, start ~8 m from each point) | PASS (tests/travel.mjs) |
| After the story, by input: ferry Citadel ⇄ Desert; glider Citadel ⇄ Hamalayi, Hamalayi ⇄ Desert, Desert ⇄ Citadel (8 legs, every Twinsun region from every other) | INPUT | PASS |
| Citadel Spaceport's menu = [Zeelich Spaceport]; lands on Zeelich's spaceport deck; walk over the footbridge to the shuttle pad; its menu = spaceport island (here) + 11 islands, no Twinsun stop | INPUT | PASS |
| Every Zeelich place by shuttle, pad to pad (11 legs) and back; no Twinsun stop on any menu; Zeelich Spaceport's menu = [Twinsun: Citadel Spaceport] → Citadel's deck | INPUT | PASS |
| Holomap per planet: Citadel, Desert, Hamalayi (Twinsun), Zeelich, Tralu Rock, the Lift Dock (Zeelich): opens, his dot on the map, the planet inset | INPUT + screenshots (evidence/ZL-ALL/holomap-*.jpg) | PASS |
| Spaceport test (menus updated): grounded before ch. 4; Zeelich only; back from Zeelich Spaceport; Otringal not offered on Citadel | INPUT | PASS |
| Draw calls per place, arrival/landmark (one composed frame, 1280×720, SwiftShader, CPU-side counts; evidence/ZL-ALL/draws-final.json): Lift Dock 205/208, Tralu Rock 211/212, Nectar Orchard 147/144, Old Watch 132/130, Celebration 199/204 (before: 179/174); budget ≈ 775 | renderer.info | under budget |
| Regression: stability (16), chapter2, chapter4, chapter5 (rc 0, no errors), zeelich-life (31) | evidence/ZL-ALL/logs/ | PASS |
| Look on a GPU, feel by hand, frame rate | — | NOT TESTED |

### The story's crossings to Zeelich by spaceship (PLANET-1, 0.29.2)
Served on 127.0.0.1:8181 from the worktree; headless Chromium + SwiftShader; tests from a scratch directory, one
browser at a time. Final run on the merged tree (0f68e20: PLANET-1 + ccr-adf00ea7-37ebl3 at 2d767be). Logs:
docs/lba3-visual/evidence/PLANET-1/logs/ (summary-final-0f68e20.txt; earlier runs' summaries kept; two travel runs on
an overloaded machine hit the runner's time limit before finishing and are not counted).
| Check | Evidence | Result |
|---|---|---|
| Every travel route touching Zeelich is the spaceship (one route, Citadel ⇄ Zeelich Spaceport) or a Zeelich shuttle; ferry and glider routes are Twinsun ⇄ Twinsun | LOGIC (tests/travel.mjs, route data) | PASS |
| Chapter 2: Doran at the harbour agrees, moves to the spaceport, objective "Meet Doran at the spaceport"; no crossing from the harbour. E at the pad's project ship → chapter 3 on Zeelich Spaceport's deck, plan confiscated there, the dock's sky-ferry hidden | INPUT (ISO: chapter flags) tests/travel.mjs; tests/chapter1.mjs (LOGIC) | PASS |
| Chapter 8: no ship at the harbour quay; E at the project ship on Citadel Spaceport's pad → chapter 9 on Zeelich Spaceport's deck | INPUT (ISO: chapter flags) tests/travel.mjs; tests/chapter8.mjs | PASS |
| Chapter 10: no Hesk on Zeelich; spaceship to Citadel; Hesk's glider menu = Citadel, Desert Island, the Hamalayi (no Zeelich); the loop back to Zeelich by glider + spaceship | INPUT tests/travel.mjs; tests/chapter10.mjs travel steps | PASS (chapter10.mjs: CHAPTER 10 DONE on the merged tree) |
| Playthrough segments 05 (Doran at the harbour → the project's ship at the spaceport → Zeelich Spaceport) and 06 (from the spaceport deck to the workshop … the shaft → chapter 4), from a save made by segments 01–04 | INPUT (06: 1 ISO assist in the depot fight, as before) logs/playthrough-05.log, playthrough-06.log | PASS |
| Regression: chapter1, chapter2 (to chapter 4 via Zeelich), spaceport, zeelich-life, opening, stability, chapter8, chapter9 | logs/ | PASS (rc 0, no errors) |
| Code search: no ferry/boat/glider/beam route or line to Zeelich in src/ (English and Hebrew tables) | grep (report) | PASS |
| Feel by hand, the spaceport walk in a real browser on a GPU | — | NOT TESTED |

### Twelve years on, first set (0.24.0; docs/TWELVE_YEARS.md)
| Check | Evidence | Result |
|---|---|---|
| Bram, Officer Odile and Nell stand at their places on Citadel | LOGIC (tests/townlife.mjs) | PASS |
| The house: Zoé's board, the trunk, the mend box, the heat meter and Arthur's bench each give a short look; the board and meter read differently before the heat, after it, and after Zoé finds the plan | INPUT | PASS |
| Prologue: the pump is dry and Bram only remarks on it. (0.24.0 was not "no side story yet": the boat box gave the pliers in the prologue, REV-TY-1 D6; fixed in 0.25.1, see below) | INPUT | PASS (pump, Bram); boat box FIXED in 0.25.1 |
| The Old Pump, order A (Bram → pump → Arthur → boat box → pin → strokes) and order B (boat box → pump → Bram); water in the trough, a drink heals, Bram's clover, the journal | INPUT (ISO: chapter flags) | PASS |
| The Mislabelled Shipment: Odile → crate → Nell → bench → (left too long: trips, restart) → glow → barrel → bench → engine runs → Odile clears → Nell pays | INPUT | PASS |
| Save & quit → Continue after both stories, and with the coupler heating (comes back cold on the bench) | UI + INPUT | PASS |
| Evacuation: Bram's lines follow the dark posts | INPUT | PASS |
| Walk from the square to the pump, the garden, customs and the shop and back | INPUT | PASS |
| Regression after the change: townlife, stability, prologue, chapters 1, 2, 8, 10, opening, house, transitions, crosssystem, menus, shipfiles, resume, zoe-resume, spaceport, zislands, longsession, display, givers | LOGIC/INPUT | PASS (all 20, rc 0) |
| Player-input playthrough 01–06 (new game → chapter 2 → Zeelich), chained through real saves | INPUT | PASS. Segment 04 stopped once at the cliff stones (10 of 12; he arrived with 5 HP after a depot fight that needed an assist that time); rerun from the same save it passed (12 of 12). ISO assists as before: the depot guards in 04, the Zeelich depot in 06 |
| Render cost at the new places (software renderer, counts): harbour +56 draw calls (547 vs 491, +11%), +2% triangles; the lane +23 calls (+2%) | LOGIC | measured |
| Defects found while building it (fixed before commit): a crate prop called with the wrong arguments (NaN geometry in the house); the garden first placed on a slope; Bram standing where E picked him instead of the pump; the pump's reach shorter than its plinth | — | FIXED |

### Baldino's workshop, years on (0.25.0; TY-2; docs/TWELVE_YEARS.md)
Evidence: tests/workshop.mjs (25 checks in 0.25.0 — this file and the commit said 26 by mistake; 31 since 0.25.1; its screenshots W-00…W-04 in the working directory); captures/workshop/
(before/after at the same view, the test pair's three states, details with the camera zoomed for the capture only).
Software renderer (SwiftShader): layout and readability only, no GPU timing.

| Check | Evidence | Result |
|---|---|---|
| Twinsen walks from the Zeelich dock into the workshop | INPUT (ISO: chapter 2 done by flags, chapter 3 started by story.nextChapter, as tests/chapter2.mjs) | PASS |
| The room has the relay table, the hoist, the fan, the thunder box, the tea experiment, Ilo's perch and crate | LOGIC + captures/workshop/workshop-details.png | PASS |
| Collision: from the door to every new thing, under the hoist to the barrel and crate givers, to Baldino and back | INPUT | PASS |
| Looks: fan, thunder box (its limit), tea experiment (lid, note, boiled dry), crate (Ilo); Baldino adds a line when there | INPUT | PASS |
| Baldino: first talk is chapter 3's explanation as before; next talk brings up the test pair; then the key reminder plus one line of his years, a different one each time | INPUT | PASS |
| Failure 1: lever with the hoist down → the hanging relay can't see, blinks, no sync, Twinsen and Baldino say why | INPUT | PASS |
| Failure 2: drip shut → glow warning, trip, switched off (restartable) | INPUT | PASS |
| Crank raises the relay clear of the flying machine | INPUT | PASS |
| In sight but drip shut: the SYNC lamps start, then it trips before ten seconds | INPUT | PASS |
| Save & quit → Continue: hoist up/drip shut kept; a save with the pair running comes back off and cold; after success it still talks | UI + INPUT | PASS |
| Drip open → stays cool; ten seconds together → the pair talks; Baldino pays (a coin worth 5, picked up); labels become looks; the journal keeps the two rules | INPUT | PASS |
| Chapter 3's main path unchanged: with the parts, Baldino builds the key and the story cuts to Zoé | INPUT (ISO: c2_cog, c2_cyl by flags) | PASS |
| Chapter 10 opens in the workshop, Baldino recalls the pair's rules; the thunder box is gone once Twinsen has the pulse tool | INPUT (ISO: chapter 9 done by flags, as tests/chapter10.mjs) | PASS |
| Regression after the change: workshop, townlife, stability, resume, shipfiles, zoe-resume ALL PASSED; chapter2 end to end, its log identical to the 0.24.0 run | LOGIC/INPUT | PASS |
| chapter10 | LOGIC | PASS once on this change (log identical to the 0.24.0 run), then 3 runs where one bore drone survived the test's 40 teleport-and-throw tries (chapter ends at 4/5). The unchanged 0.24.0 build failed the same way at the same time. Enemy AI uses unseeded Math.random: a flaky test step, not caused by this change; open (see below) |
| Open: tests/chapter10.mjs's bore-drone step is nondeterministic (drones wander with Math.random; the step teleports 3.5 m west of each drone and throws up to 40 times) | — | FIXED in the test in 0.25.1 (see below) |
| Render counts in the workshop (software renderer; counts, not time): draw calls at the door 2887 → 2992 (+3.6%), mid-room 3124 → 3333 (+6.7%); room triangles 92.6k → 106.9k | LOGIC | measured |
| Defects found while building it (fixed before commit): the relay table first closed the rim walk south of the flying machine (the bot boxed itself in by the barrel; table shortened and moved left); the SYNC lamps first faced away from the camera; the fan first pinched the walk past the globe; the reward first popped five coins that could land on furniture (now one coin worth 5, tossed toward Twinsen) | — | FIXED |
| Not checked here: the look on a GPU; the feel by hand; whether a player notices the lid in the vault (it's small: the tea up the wall and the lines carry it) | — | HUMAN |

### REV-TY-1/REV-TY-2 fixes (0.25.1; TY-1-FIX)
The independent reviews of the two twelve-years-on sets (docs/lba3-production/reviews/REV-TY-1, REV-TY-2). Evidence:
tests/townlife.mjs (30 checks, was 18), tests/workshop.mjs (31 checks, was 25), captures/townlife/ (before = 0.25.0
at 926b21e, after = 0.25.1, the same input route and the normal game camera: `townlife-before-after.png`,
`townlife-house.png`). Software renderer (SwiftShader), 1280×720: layout and readability only, no GPU timing.

| Defect | Fix | Evidence | Result |
|---|---|---|---|
| TY-1 D1: Nell's shop hid Nell, the bench and the coupler's glow from the normal camera, and stood across the harbour path with its barrel on it; the garden's raised beds on the lane | The shop moved onto the grass north of the path where it meets the quay (clear of the next house's door), turned open toward the path (back wall north), its roof rising toward the open front, the sign on the roof's edge (and its name fitted to the board); the coupler sits at the bench's end, where Twinsen at the bench doesn't hide it; the engine (fan toward the path) and the barrel at its open west side. The beds moved east of the lane to the lighthouse. The island's scatter keeps out of these places without changing the rest of the island (lifeClear: shrunk to nothing, no collider) | townlife: "Nell's shop… and the raised beds are off the dirt paths (> 2.3 m)"; walks to the shop, barrel, garden; captures (shop from the path, at the bench with the coupler glowing, from the quay; the garden) | FIXED |
| TY-1 D2: Arthur's bench hidden behind the family room's wardrobe | On the west wall of his room, between the toy chest and the bed, plans pinned up beside the window | townlife: nothing tall between the bench and the house camera; townlife-house.png | FIXED |
| TY-1 D3: no colliders on the lane's pipe, the pump sign's post, the customs barrier's post; the trough standable | The pipe stops him (0.62 m, not standable: no traps, he can jump it) and dives under the ground for the pump's footpath (elbows, fresh earth), so the pump is reached across it; sign post, barrier post, valve box solid; the trough, Zoé's beds and the honey pallet can't be stood on | townlife: walking into the pipe (stopped, not lifted), across the footpath (crosses); posts/trough/valve box by physics; walk to the pump's handle | FIXED |
| TY-1 D4: Zoé's board always 8 green pins; board and meter never changed | Three boards: all red before the heat; Bug Street green and the harbour row red with it; after the plan, her chalk ring and "?" round the harbour row. The meter's needle at rest and no note before the heat; the needle up and Zoé's note after | townlife: stage 0 in the prologue, 1 in chapter 2, 2 in the evacuation | FIXED |
| TY-1 D5 / TY-2 D4: Nell's fee, Bram's clover and Baldino's coin lost if saved before pickup | A tossed reward is owed (a saved l_/w_ flag counted down as it is picked up); on loading, what is still owed and not lying there is given with a toast ("Nell's payment: 3 kashes", "Bram's clover…", "Baldino's coin: 5 kashes"). Tim's clover unchanged | townlife: clover and coins picked up by input (owed → 0); save before pickup → Continue → given; workshop: the same for the coin | FIXED |
| TY-1 D6: the boat box gave the pliers in the prologue | Before chapter 2 the box is only looked at ("His things"); the pliers stay; no journal line | townlife: prologue box check | FIXED |
| TY-1 D7: working the pump, hands ~0.5 m from the handle, standing in the tulip bed, the sign edge-on | The handle points to the lane with a crossbar grip; he steps up to it (a short step from where the prompt shows) and plays a two-handed pump stroke (new 'pump' pose, src/engine/rig.js) timed with the handle; standing on the footpath, clear of the plinth; no tulip bed there; the sign faces both ways along the lane | townlife: hands-to-grip distance logged through the stroke, < 0.15 m (townlife log: 0.009–0.082 m from 0.2 to 0.47 s into the stroke; a probe saw up to ~0.2 m in its last 0.1 s, as the hands lift off); captures from the north and the south | FIXED |
| TY-1 D8: the coupler's ownership unclear; STORY_BIBLE "Approved in that pass" | Xil ordered it for Nell (a deal): Nell knows it ("Xil was getting me one from Zeelich"), Odile clears its papers for Nell's Repairs, and Nell pays Twinsen part of what she owes Xil. STORY_BIBLE now calls these proposed developments (this sequel's inventions), as TWELVE_YEARS.md does | townlife: Nell's and Odile's lines | FIXED |
| TY-1 test weakness: the clover assertion always true | Now counts his clovers and the owed flag | townlife | FIXED |
| QA row "prologue: no side story yet" was inaccurate | Corrected above | — | FIXED |
| TY-2 D1: a press at the crank/tap/lever in the pair's last moment applied after success | Each act callback re-checks that the pair isn't done; a 0.25.0 save left contradictory is repaired on load (a finished pair is up and dripping) | workshop: crank pressed at sync ≥ 0.98 → after success the hoist is still up | FIXED |
| TY-2 D2: success with the drip shut late | They only sync while the drip is open: shut mid-sync, the sync starts over and the coupler heats and trips | workshop: tap shut at sync ~0.5 → sync 0, trip, no success | FIXED |
| TY-2 D3: chapter 10's lines contradicted the pair | c10_bal_2: the relays are the test pair grown up and put on masts; c10_bal_3: a clear line (so they stand high), local power, a friend standing by; c10_bal_pair: same first rule, no couplers out there (with nobody to keep them cool they'd trip). Text only; chapter 10's mechanics unchanged | workshop: chapter 10 recall; chapter10 ×3 | FIXED |
| TY-2 D5: he could stand inside the lowered relay's cradle | The cradle (following the hoist) and the hoist's low cross bars are solid | workshop: walking into the hoist's middle stops > 0.6 m from it | FIXED |
| TY-2 D6: from the north side E at Ilo's crate gave its look, never the bonus | Its look is offered until read, then again once its giver is spent: after reading it, E beside it hops and gives the bonus | workshop | FIXED |
| TY-2 D7: the pair could be started before Baldino's "At last!" | Before it the lever only gets a look ("I'll ask before I touch") | workshop | FIXED |
| TY-2: check count (QA.md and the commit said 26; the test had 25) | Corrected above | — | FIXED |
| tests/chapter10.mjs bore-drone step flaky (unseeded Math.random drone AI) | Each throw from a fresh side and distance, aimed again just before release, up to 120 per drone; a drone still flying after that is beaten through its own damage rule and logged as ISO; the test now prints CHAPTER 10 DONE/NOT DONE and sets its exit code | 3 runs: 3/3 done, all drones thrown (5/4/5, 5/4/5, 5/13/8 throws), no ISO assist | FIXED (test only; no game balance change) |
| Tests that hard-coded port 8123 honour GAME_URL (test-only) | — | — | DONE |
| Regression after the change (GAME_URL on a separate port): townlife, workshop, chapter2, chapter8, chapter10 ×3, stability, resume, house, opening | LOGIC/INPUT | all rc 0, no page errors | PASS |
| Not checked here: the look on a GPU; whether the pump stroke and the step to the grip feel right by hand | — | — | HUMAN |

### Desert Island twelve years on: Kesh (0.26.0; TY-3; docs/TWELVE_YEARS.md)
Evidence: tests/desert-life.mjs (24 checks; `SHOTS=1` writes its screenshots to captures/desert-ty/); captures/desert-ty/
(`desert-before-after.jpg`: six views, before = 0.25.1 at 41363db, after = 0.26.0, the same spot and the normal game
camera; `windcatcher-roof.jpg`: the story's own before/after on the roof — sand with the torn screen, then Lumi's screen
fitted). Software renderer (SwiftShader), 960×540: layout and
readability only, no GPU timing. ISO setup, logged by the test: chapters 4 and 5 reached by their flags (as
tests/chapter4.mjs/chapter5.mjs), the pump's gears and the vent by flags, a fresh k_ flag set for each order.

| Check | Evidence | Result |
|---|---|---|
| The cool room (FunFrock's blockhouse, Kesh's wind-catcher), its stair seen from the side, Lumi's loom and Hesk's flag poles are solid; Lumi works at her loom under the sail | LOGIC (physics) | PASS |
| Chapter 4 before the pump: Brosk (after his chapter line) tells of the warm jars and the turned wind-catcher; Lumi won't give her work to someone off the ferry; the door: the blockhouse dug out of the dune, two jars inside | INPUT | PASS |
| Order A: up the stair on the east wall to the roof by walking (the planner's A* over the game's collision), two quarter turns at the crank; into the wind with no screen → sand pours into the room (Brosk: "In my dates!") | INPUT | PASS |
| The roof's parapet holds him (walking at the north, west and south edges) | INPUT | PASS |
| Save & quit → Continue with sand in the room and the cowl into the wind: both kept, the journal line open | UI + INPUT | PASS |
| After the pump (ISO): five jars; Lumi hands over the screen; fitted on the roof with the mouth already into the wind → the room draws; Sani in the doorway; the screen no longer carried; toast | INPUT | PASS |
| A drink at the door restores life; Brosk pays five kashes (one coin, owed until picked up by walking to it); the journal closes; Brosk, Lumi and Sani each have an after-line | INPUT | PASS |
| Mother Tarra's lines stay chapter 4's | INPUT | PASS |
| Order B: the screen first, fitted while the mouth faces away, two turns (east → south → west) → draws, no sand | INPUT | PASS |
| Saved before Brosk's coin was picked up → Continue: five kashes given with a toast, nothing owed, the room still draws, Sani still there | UI + INPUT | PASS |
| Chapter 5: Brosk's jar (the chapter's shovel errand) comes first; then the cool room in chapter 5's words (the steam could boil the oasis); Lumi gives the screen at once | INPUT (ISO: c5_water, c5_shovel by flags) | PASS |
| After the vent (ISO): done the same way; Brosk speaks of Dallan's cold drink, Lumi of the quiet ground | INPUT | PASS |
| The yacht stop: NO FERRY chalked once the project took the ferry | LOGIC | PASS |
| Regression on 0.26.0 (GAME_URL on a separate port): chapter4, chapter5 (both logs identical to the 0.25.1 runs on the same machine), townlife (30), workshop (31), stability (16), resume (2), shipfiles (2), desert-life (24) | LOGIC/INPUT | all rc 0, no page errors |
| Render counts (software renderer, counts not time; one frame from the normal camera, 960×540, all passes incl. shadows), 0.25.1 → 0.26.0: the pier track looking east 423 → 493 calls (+17%), at the cool room's door 292 → 354 (+21%), the plaza 359 → 404 (+13%), Lumi's loom 460 → 511 (+11%), the dig route at the drift 470 → 489 (+4%); triangles +2–5%. The jars, the screens' panels, the rags (one animated mesh) and the spoil heaps were merged to get there (first build: up to +31%) | LOGIC | measured |
| Defects found while building it (fixed before commit): the cool room's floor first taken from the dune bank (the first step 0.8 m: no way up); a 0.1 m seam between treads dropped him through to the sand; the stair flagged as stairs could be walked under from the south (now overlapping solid treads, deeper than his reach); the yacht board's back faced the village approach (moved, enlarged) | — | FIXED |
| Not checked here: the look on a GPU; whether players read the wind from the pump's wheel and the flags without Sani's line; the stair and the crank by hand | — | HUMAN |

### REV-TY-3 fixes (0.26.1; TY-3-FIX)
The items REV-TY-3 (docs/lba3-production/reviews/REV-TY-3/REPORT.md) left open. Evidence: captures/townlife/
(`ty3fix-coupler-stages.jpg`, `ty3fix-coupler-far.jpg`, `ty3fix-pump-stroke.jpg`; before = 0.26.0 at 0e278f0 served on
its own port, after = 0.26.1, the same input route and the normal game camera) and captures/townlife/ty3fix/ (the probe
`probe.mjs`, its logs and JSON per run, `fit-pump.mjs`). SwiftShader 1280×720: layout and readability only, no GPU
timing. ISO: chapter 2 by flags (as tests/townlife.mjs); in the path views the coupler was put back to heating (logged).
The camera was recentred behind Twinsen (Enter, a player input) before each approach so each approach has its own
view; "far" is the second LBA view (Q).

| Item | Fix | Evidence (before → after) | Result |
|---|---|---|---|
| TY-1 D1: the coupler's glow hidden by the shop roof from the paths and by Twinsen at the bench; its heat stages alike at room scale | He sets the coupler down from his place at the bench's west end (he walks there; it sits at the east end, to his right) and the camera comes round behind him. The roof rises steeply to a tall front (the coupler is in view at the normal camera's 26°); from the far view the roof and its sign fade while they stand between the camera and the coupler, or hide him under them (as the town's houses fade). Four looks: cool (brass, dark), warming (dull red glow, a faint halo, wisps of steam), glowing (bright orange, halo, an orange light on the bench and back wall, steam puffs), about to trip (yellow-white, flickering, a column of steam, sparks and a ticking) | Raycasts to four points of the drum from the camera, 4 approaches × 4 heat stages: of 28 views (16 at the bench, 4 far at the bench, 8 from the harbour path near/far), before: Twinsen hid part of the drum in 6 (S and W approaches), the roof in 5 (far view at the bench from SE/S/W, both eastbound path points far; all four points in 3 of them); after: 0 and 0 (only the drum's own far side self-occluded). Stage look (emissive, light, halo, puffs): cool #000000/0/0/0/0, warming #b0280a/0.9/0.6/0.22/1, glowing #ff6414/2.4/2.6/0.6/4, trip #ffd890/~2.9/~3.6/~0.8/7. tests/townlife.mjs checks the work spot, the view at every stage and that the stages differ | FIXED (near and far view) |
| TY-1 D7 + N2: a ~1 m slide to the grip at ~5 m/s, hands 0.40–0.47 m off on the first frame and 0.15–0.20 m at the ends of the stroke | E at the pump (from any side, see N3) walks him round to the grip at walking pace through the game's own physics and collision (Hero.walkTo, src/game/actors.js; the stick takes over at once), turns him to the handle, he takes hold ('pumpGrip', 0.18 s), then one stroke (0.75 s): the handle is lifted, pushed down past level and let back up. The 'pump' pose is keyed by the handle's angle (fitted at runtime: fit-pump.mjs) and the handle's angle is read from his hands each frame. His "It runs" line waits for the stroke's end | before: glide 4.5–4.6 m/s, hands to grip 0.405 m on the first stroke frame, 0.20 m at the end; after: walk ≤ 2.4 m/s (a 4 cm settle on arrival), 45 stroke frames from the trough side, the lane and the north, hands to grip first 0.006, last 0.025, max 0.052 m; handle −0.42 → +0.26 rad. tests/townlife.mjs measures every stroke frame (< 0.15 m), the walk speed, nothing solid entered, the stand point | FIXED |
| N3: no pump prompt after the pin from the trough side; from the north only Bram | The pump answers within 2.3 m of it from any side once the pin is out ("Pump"), and he walks round to the handle | before: prompt only within 1.2 m of the grip (west); after: "Pump" where the pin came out and at N, NE, S, SW, NW, the trough side and the grip (probe), townlife checks 5 of them. Standing nearer Bram than the pump (1.5 m north-east of it) Bram still has the prompt, as people do | FIXED |
| N1: chapter 10's opening contradicted the stations as built and "a friend standing by" | c10_bal_2: the relays hook into each station's old machine and talk through it; c10_bal_3: local power, a minute together, a friend at each station (no masts, no "up high"); c10_bal_pair: the old machines carry the signal, no sight lines, no couplers to trip, the friend keeps the power steady. Text only; no mechanics change | tests/workshop.mjs: chapter 10's opening has "friend standing by" and "old machines carry the signal" and none of masts / up high / clear line / nobody to keep | FIXED |
| N4: chapter10.mjs printed DONE and exited 0 with ISO-killed drones | A ball target not hit by a throw (the mill's brake forced, a drone beaten through its damage rule) is logged with ISO and the run ends "CHAPTER 10 ASSISTED (not a pass …)", exit code 2. C10_MAX_THROWS=0 forces the assist to check the verdict | chapter10 with C10_MAX_THROWS=0: see the regression row | FIXED |
| Test harness: P.use waited only for the hero's one-shot action | It also waits for the steps the game asks for (walkTo), up to 5 s (tests/lib/player.js) | townlife | DONE |
| Regression on 0.26.1 (own server, :8149; logs in captures/townlife/ty3fix/regression/): townlife (35 checks, was 30), workshop (32, was 31), chapter2, stability (16), desert-life (24), chapter10 ×3 (CHAPTER 10 DONE each, the brake and all drones thrown: 4/4/3, 5/10/10, 5/4/5 throws); chapter10 with C10_MAX_THROWS=0: three ISO lines, CHAPTER 10 ASSISTED, exit 2 | LOGIC/INPUT | rc 0 (the forced run rc 2 as intended), no page errors | PASS |
| Not covered: the camera near the pump swings behind Twinsen as he walks up (its occlusion check, unchanged), so the last stroke is often seen from behind-left; GPU look; the feel by hand; gamepad; the pump from beyond the pipe's west side | — | — | HUMAN / open |
### Zeelich twelve years on: the street and The Second Bake (0.27.0; TY-4; docs/TWELVE_YEARS.md)
Evidence: tests/zeelich-life.mjs (31 checks; `SHOTS=1` writes its screenshots to captures/zeelich-ty/);
captures/zeelich-ty/ (`zeelich-before-after.jpg`: six views, before = 0.26.0 at 0e278f0, after = 0.27.0, the same spot
and the normal game camera; `second-bake-states.jpg`: the watch house cold with the crate on the flue, after the
shove, after the ball). Software renderer (SwiftShader), 960×540: layout and readability only, no GPU timing. ISO
setup, logged by the test: chapters 3, 4, 9 and 10 reached by their flags (as tests/chapter2/4/9/10.mjs), the shield
by its flag, a fresh zl_ flag set for the second way, Twinsen put on Zeelich in chapter 4 by the shuttle's room switch.

| Check | Evidence | Result |
|---|---|---|
| The watch house, its stair (solid from the side and underneath), the six heat posts and Nara's crates are solid; the burrow lid can be stood on; three posts lit, three dark with tags | LOGIC (physics) | PASS |
| Snuff at her counter, Bzizz by the stair, Old Grumm by the burrow, Mr Pelleck under his scaffold | LOGIC | PASS |
| Collision and access: walked from the street to both mills' tracks, the depot gate, the counter, the burrow, Pelleck's door and the platform gate | INPUT | PASS |
| Chapter 3: Snuff (charcoal cart sold, something on her flue), Bzizz (his stage, the depot's signature), the heat box (SAFETY CUT-OUT), the hatch (the crest chiselled off), Pelleck and Grumm, Nara's crates HELD | INPUT | PASS |
| Way A: up the guards' stair by walking (the planner's A* over the game's collision), a shove moves the crate off the flue; the heat box resets, Snuff calls out; the parapet holds him on the roof on all sides | INPUT | PASS |
| Save & quit → Continue: the crate on the stage, the oven hot, Tavo at the counter, the journal line done | UI + INPUT | PASS |
| Snuff pays five kashes (one coin, owed until picked up by walking to it); the journal closes; a roll at the hatch heals; Snuff, Tavo and Bzizz have after-lines | INPUT | PASS |
| Nara and Oku keep chapter 3's lines | INPUT | PASS |
| After the shield drops (ISO): Snuff's problem in that phase's words; way B: the magic ball from the street knocks the crate off (in the aim targets until then, not after); it breaks, "My nectar!", the heat box resets; Bzizz and Snuff's lines for the broken crate | INPUT | PASS |
| Saved before Snuff's coin was picked up → Continue: five kashes given with a toast, the crate still broken, the oven hot | UI + INPUT | PASS |
| Chapter 4 (ISO) on Zeelich: Nara's crates gone; Nara (Xil sells her flowers at Citadel), Oku (new sails), Pelleck, Grumm, Bzizz in that phase's words | INPUT | PASS |
| Chapter 9 (ISO): Baldino's petition and Nara's stamp as before; Pelleck, Snuff and Grumm argue about the council | INPUT | PASS |
| Chapter 10 (ISO): Oku's station errand as before; Snuff, Bzizz and Pelleck on the bore turned into a shield | INPUT | PASS |
| Regression on 0.27.0 (GAME_URL on a separate port): chapter2 (chapter 3 to chapter 4: the same outcomes as 0.26.0's), chapter9 (to chapter 10; street folk on the ground and talkable), workshop (31/31), zislands (11/11), spaceport (7/7), stability (16/16; a first run was cut off by the runner's 40-minute limit at D15 under a host load average of ~37, the rerun passed), resume (2/2), zeelich-life (31/31). chapter10 (being changed by another developer) runs to its end (the shaft, chapter 11), not modified here | LOGIC/INPUT | PASS (all rc 0, no page errors) |
| Render counts (software renderer, counts not time; one frame from the normal camera, 960×540, all passes incl. shadows), 0.26.0 → 0.27.0: the street looking east 740 → 775 calls (+4.7%), at the watch house 638 → 673 (+5.5%), the crossing 652 → 687 (+5.4%), the plaza's north side 840 → 855 (+1.8%), Pelleck's house 826 → 847 (+2.5%), the burrow 660 → 683 (+3.5%), the pad 688 → 711 (+3.3%); triangles +2–6%; with the oven hot +5 calls (the loaves). Merged onto shared vertex-coloured materials (one for metal, one for matte), flat things cast no shadow (first build: +37…+62 calls) | LOGIC | measured |
| Defects found while building it (fixed before commit): the stair's top tread ran into the north parapet (no way onto the roof); a 0.1 m seam between the treads and the roof made the planner refuse the stair; the ball bounced off the parapet's collider and the crate's own collider before reaching it (both now let the ball through to its target test) | — | FIXED |
| Not checked here: the look on a GPU; whether players think of the ball for a crate on a roof; the stair by hand | — | HUMAN |
### REV-TY-4 fixes (0.26.2; TY-3b-FIX)
The independent review of TY-3 (docs/lba3-production/reviews/REV-TY-4). Evidence: tests/desert-life.mjs (30 checks,
was 25); captures/desert-ty/ `fix-crank-west.jpg`, `fix-crank-south-door.jpg`, `fix-wind-door.jpg`, `fix-board.jpg`
(before = 0.26.0 at 34fd9c9 served from an export of that commit, after = 0.26.2; the same isolated REV-TY-4 saves
(save-06 chapter-4 start, save-k3 screen carried, save-07 chapter 5, save-k6b at the dig), the same input route, the
normal "lba" camera following Twinsen). The crank camera's direction depends on the route: walking up from the pier
it looks south; pressing Enter (the game's own "re-centre behind Twinsen") while he faces the crank gives the
reviewer's west-looking view. Both were captured. Software renderer (SwiftShader), 1280×720: layout and readability
only, no GPU timing.

| Defect | Fix | Evidence | Result |
|---|---|---|---|
| D1 (Medium): with sand in, the door always said the mouth was turned the wrong way, and Brosk said "do the opposite", even with the mouth into the wind | story/kesh.js `hint()`: into the wind (sand, no screen) → "The mouth takes the wind now. With no screen on it, it takes the sand too."; screen on but turned wrong → "Lumi's screen is on up there, but the mouth still faces the wrong way."; otherwise the old line. Brosk: "Sand! In my dates!" then, by state, Lumi's screens / turn it into the wind with a screen / the screen's on, turn it | desert-life (door and Brosk by input with the mouth into the wind; all five cowl states through hint(); door and Lumi after Continue with the screen fitted); probe runs: save-06 → two turns → door/Brosk; save-k3 → fit → door/Brosk | FIXED |
| D2: Hesk's pole at (−18.1, 8.1) 0.99 m from the return line; (8.2, 11.0) 1.70 m | The four route lines live in keshlife.js (`YACHT_ROUTES`, desert.js rides them). Dig-route poles moved to the north side of the way out (away from the way back); any pole closer than 2.4 m to any line is dropped (none are now) | desert-life: every pole ≥ 2.4 m from all four lines (sampled every 0.2 m); rides by input from the dig save: return ride min. yacht-to-pole 1.00 m before → 2.58 m after, out ride 2.60 m | FIXED |
| D3: the chalked NO FERRY covered CAMP · DIG · KESH; "ask Hesk" illegible | The chalk only strikes the ferry line; NO FERRY / ask Hesk in big chalk on a slate hung under the board | fix-board.jpg (beside Hesk, ch5): CAMP · DIG · KESH clear, the slate readable at 1280×720 | FIXED |
| D4: success and sand read only on the cowl's far side; the door's sand hidden from the roof | Lumi's screen shows as a striped hem over the lid and two striped tails down the cowl's back (they lift while it draws); sand streams in over the lid into a bare mouth facing the wind and blows out of the door past the awning (a second, flat tongue of sand beyond the awning); pale motes drift out of the door while it draws. One draw call (a small point system), only while active. No camera change | fix-crank-west.jpg (west-looking crank camera: hem and tails visible after; sand cloud above the cowl after); fix-crank-south-door.jpg (south-looking: sand at the mouth, sand plume and tongue at the door) | FIXED (readability judged from the captures; GPU look not checked) |
| D5: the wind not readable at the cool room without Sani | A striped windsock on the roof's north-west corner (wide mouth into the wind, tail downwind, restless) and a rag on the porch's east pole | fix-wind-door.jpg (pier approach, camera looking east: the sock's mouth faces the camera); fix-crank-south-door.jpg (side-on); fix-crank-west.jpg (end-on, cone pointing at the camera) | FIXED (end-on from the west-looking camera it reads only as a cone; human check advised) |
| N1: docs/TWELVE_YEARS.md said no line says why FunFrock built them | Corrected: nothing establishes when or why; Brosk's "to keep us out" is labelled a character's opinion | docs/TWELVE_YEARS.md | FIXED |
| N2: "Inside" lines vs jars/dates under the porch | Lines changed (the jars "on the shelf"; "inside" only for the unseen wool and air); Brosk: "Now it keeps the dates cool" | desert-life (door line "Two jars of water on the shelf") | FIXED |
| N4: nothing pointed to Lumi as the screen's maker before the pump | Brosk's first chapter-4 line: "...turned its wind-catcher round and tore Lumi's screen off it." | desert-life (chapter 4 Brosk check) | FIXED |
| Untested save state: Continue with the screen fitted, not yet turned | desert-life: fit with the mouth east → Save & quit → Continue: screen on, cowl east, nothing carried, journal ticks the screen; door hint and Lumi's line agree; two turns finish it | desert-life | PASS |
| N3 (unlimited door heal), N5 (payment held until after the shovel) | By design; unchanged | — | NOT CHANGED |
| Regression (GAME_URL on its own port) | desert-life 30/30; chapter4 and chapter5 logs identical to REV-TY-4's 0.26.0 runs; stability 16/16; resume 2/2 | LOGIC/INPUT | all rc 0, no page errors |
| Render counts (software renderer, counts not time; REV-TY-4's six fixed spots from the normal camera, 1280×720, the done state), 0.26.0 → 0.26.2 | pier track 435 → 438 calls, cool-room door 365 → 374 (+2.5%), plaza 402 → 405, Lumi's loom 512 → 515, the drift 503 → 504, the board 386 → 389; triangles +0.2–0.7% | LOGIC | measured; GPU time BLOCKED |
| Not checked here: the look on a GPU; whether players read the windsock and the lashings by themselves; gamepad/touch | — | — | HUMAN |

### Weapons and gadgets (0.28.0; WPN-1; docs/COMBAT.md "The arsenal")
`tests/arsenal.mjs` (GAME_URL on its own port; SwiftShader, 960×540). Evidence: INPUT for getting and using (walk,
talk, real clicks on the stalls' items, E, the inventory with I / arrows / E, the weapon wheel with G + arrows, K to
attack); ISO (logged) for reaching chapters by flags, kashes given for purchases, journeys between islands by the
room switch their shuttles/glider use, and enemies placed in the developer arena for the effect measurements.

| Check | How | Result |
|---|---|---|
| Pippa's stall (ch. 2): her stock, then blowgun (15, 6 darts), darts (3 for 4), meca-penguin (4), lantern (10) | talk, click | PASS (37 kashes spent, 9 darts, 2 penguins, lantern) |
| Arthur's conch at home | walk, E | PASS (Arthur's lines or his note) |
| The conch outdoors: the Dino-Fly lifts his head (> 0.2 m) and rumbles; people within 16 m turn to look | inventory E | PASS |
| The cellar's gap in the foundations: too dark without a light (journal line); the lantern lights it (a light-pool light at the lantern); the tin: 6 darts, 8 kashes | walk, E, inventory E | PASS |
| The boarded coal chute: the line; fists only thud | E, K | PASS |
| Bersimon asks for the pearl (still tops up the magic) | talk | PASS |
| Nara's case (ch. 3): the laser pistol (30, 5 shots), a crystal cell (+5), darts; no Blowtron before ch. 6 | walk, E, click | PASS |
| Rector Hougo gives the pearl; Ker'aooc teaches the ward (20 kashes, a menu) | talk, click | PASS |
| The old Wannie mine on Under Celebration, the lantern lit: the Wannie glove | walk, E | PASS |
| Bersimon with the pearl: the lightning spell; the pearl used | talk | PASS |
| Nara's case (ch. 6): the Blowtron (35) | E, click | PASS |
| The wheel's down-left slot: the glove in hand; the glove breaks the boards (a clover, 12 kashes) | G + arrows, K | PASS |
| Save & quit → Continue: owned items, counts and a_ flags identical; save format 4 | pause menu | PASS |
| Blowgun: 3 darts → 3 hits on the dummy 6 m off, 3 darts spent; a Grobo guard's armour stops a dart (1), the Blowtron's (2) goes through | wheel, K | PASS |
| Laser: a drone 9 m off loses 3 (machines); a cell shot uses one charge; with none it costs 2 magic | wheel, K | PASS |
| Lightning: the mite, then the guard and the dog close by (chain of 3); 3 magic; arcs drawn | wheel, K | PASS |
| Glove: a guard thrown back > 1.5× the fists' distance; an enemy bolt knocked back strikes the drone | K | PASS |
| Meca-penguin: set down, walks, the mite is lured to it (not Twinsen), it pops and hurts the mite; Twinsen untouched | inventory E | PASS |
| Protection: 3 magic, a 2-point blow takes 1, 2 again after 15 s | inventory E | PASS |
| Conch: a guard dog close by cowers (stunned) | inventory E | PASS |
| No darts: the blowgun doesn't fire and says so | K | PASS |
| A format-3 save (no arsenal) continues: empty arsenal, rewritten as format 4, the old one kept as backup_v3 | reload | PASS |

Draw calls where the new models stand (SwiftShader, `renderer.info` reset per frame, the same view with and without
the model; counts, not time; after the merge with the branch head): the Wannie mine 178 → 186 (6 meshes), Nara's case
1137 → 1155 (11 meshes; shadows included). Captures: captures/arsenal/normal-camera.jpg (the normal camera), captures/arsenal/close-ups.jpg (a close
camera on the held weapons, the laser shot, the lightning arc, the penguin, the shell, the lantern, the mine, the case).
After merging the branch head (SD-2 dressed Under Celebration as a gas works and moved its pad), the mine's spot is
found at load (a level, clear ring 8–18 m round the pad, facing it): captures/arsenal/wannie-mine-after-merge.jpg.

Results (2026-10-15, after merging the branch head 1f2dc97, GAME_URL on port 8175, one browser at a time): arsenal
34/34; regression: combat 59/59, stability 16/16, house 2/2, wizards 6/6, menus 25/25, zeelich-life 31/31, townlife
35/35, save-migration (v1/v2 saves continue and are rewritten as format 4 with their backups; a corrupt save set
aside), chapter1 and chapter2 LOGIC runs to their ends, no page errors anywhere. The same set also passed before the
merge.

Not checked here: how the shots feel with a pad or mouse by hand; the sounds by ear; balance for a first-time
player (prices against the kashes a player has by each chapter); the look on a GPU.

### REV-TY-5 fixes (0.28.1; TY-5-FIX)
The independent review of TY-3-FIX and TY-4 (docs/lba3-production/reviews/REV-TY-5). Evidence: tests/zeelich-life.mjs
(38 checks, was 31) and tests/chapter10.mjs, served from the worktree on port 8179, SwiftShader, one browser at a time;
before = 31deb6c served from a `git archive` export of that commit, run with the new zeelich-life.mjs.

| Check | Evidence | Before (31deb6c) | After (0.28.1) |
|---|---|---|---|
| D2: on the roof above Snuff's counter (1.55 m from her, 4 m up) no Talk prompt; E plays none of her lines; her first talk (which sends him to the stair) waits for the street. Generic: nobody offers Talk to a person more than 1.8 m below Twinsen (src/main.js TALK_ABOVE) | INPUT | FAIL (prompt "Talk", her whole first talk played) | PASS |
| D1: the ball way from the street: "The heat box on the wall clicks. Its lamp turns green." (not "Somewhere below…"); the shove keeps the roof's line | INPUT | FAIL | PASS |
| D1: ball thrown with Snuff never asked, Save & quit while the crate falls → Continue: crate broken, oven hot; Snuff "Was that your ball?…" (not "on my roof"), pays | UI + INPUT | FAIL | PASS |
| D3: asked again before the bake is done, Snuff and Bzizz give the phase's news, then the crate: chapter 3 (shield down), chapters 4–8, the council (ISO for the later phases: the zl_ flags of "asked, not done" for one talk each, then restored) | INPUT | FAIL (one line in every phase) | PASS |
| T1 (players): standing at the lighthouse's middle dial (a plain search until Zoé asks) and facing Zoé, E is hers. Generic: a room search under his feet (< 0.5 m) or less squarely in front of him gives way to a person he faces within 2.2 m (45°); a cupboard he looks straight at keeps its prompt | LOGIC (the picker) | the review's spot gave "Nothing here." | PASS ("zoe") |
| T1 (test): chapter10.mjs's talk tries the spot in front of the person, then round them, on the first free spot whose prompt is theirs (no longer hangs on Zoé's facing) | — | NOT DONE (c10_zoeAsk unset) | CHAPTER 10 DONE ×3 in a row; C10_MAX_THROWS=0: ASSISTED, exit 2 |
| Regression on the final code: townlife 35/35, workshop 32/32, stability 16/16, zeelich-life 38/38, desert-life 30/30; chapter2, chapter9, prologue (the ball from the cupboard), chapter1, chapter3 and chapter4 to their ends; no page errors | LOGIC/INPUT | — | PASS |
| N2 (the pump's camera from the south after a Continue): not changed. The LBA camera has no per-place zones or hints (src/engine/camera.js: two fixed views); adding them is a camera-system change | — | — | OPEN |

Not checked here: chapters 5–8 and 11+ tests after the talk-prompt change (it touches every conversation: a person
more than 1.8 m below Twinsen can no longer be talked to; none of the run tests needed that); the feel by hand; GPU.

### Baldino's hop-pack (0.30.0; EQ-1; src/game/jetpack.js; STORY_BIBLE.md "Baldino's hop-pack")
`tests/jetpack.mjs` (port 8188; SwiftShader, 960×540; ~35 min): 48/48 PASS, no page errors (2026-10-18). Regressions on the same build: arsenal 34/34, combat 59/59, stability 16/16, travel 12/12, chapter2 to its end (chapter 4 reached), no errors. Captures: captures/jetpack/. INPUT: F2 (Athletic), Space held, the
arrows, E, the inventory (I / arrows / E), Esc and the pause menu's buttons, the title's Continue, game-over Retry.
ISO (logged): chapter 10 reached by its flags (as chapter10.mjs); the Hamalayi, Desert Island, Citadel's pier and the
galleries reached by the room switch the glider/shuttle use; a hit, a death and a line of dialogue injected mid-flight;
a 9 m drop placed by hand; a test slab for the ceiling (the engine has no outdoor overhang with room under it: the test
counts them — 0); invalid/old saves written by hand.

| Check | Result |
|---|---|
| Not offered before chapter 10; after Baldino's ch. 10 briefing he points it out (once); E on the peg: his lines on its limits, worn at once, saved at once, toast | PASS |
| Inventory: "Hop-Pack — worn", description with the limits; E takes it off / puts it on; no second pack | PASS |
| Indoors (workshop) and underground (c3gallery): never lights; "needs open sky" toast | PASS |
| Test step (2.35 m): a running jump can't reach it; with the pack he lands on the deck; the tin: a clover + 10 kashes, once; journal lines done | PASS |
| Lift ≤ 2.4 m over the take-off (2.42 measured); 2.2 s of thrust (133 frames at 60); refill < 2 s on firm ground; never in Normal mode | PASS |
| Zeelich's edge (never over the cloud sea), a house wall 3.8 m (no roof), the depot fence 2.4 m (never inside), a ceiling (head ≤ underside), the workshop door (no entry in the air; in on landing) | PASS |
| Oku's mill (ch. 10): stones two at a time — 4 hops to the gallery instead of 7; unbraked, no relay prompt on top (the gate holds) | PASS |
| 9 m drop: without the pack hurts; Space held: no damage, one cushion | PASS |
| Mid-flight: dialogue (flame opacity 0 on the rendered frame, no thrust; a held key does not relight), pause (still; resume needs a fresh press), scene change (arrives standing, pack out), a hit (cut), Zoé (no pack, no flight) | PASS |
| Save & quit → Continue pressed in the air: on the ground at his last safe spot, pack worn and full, tin/peg stay empty, kashes kept | PASS |
| Death mid-flight: pack out at once, falls, game over; Retry: standing, pack worn and full | PASS |
| Citadel's pier end (never over the sea, back on the deck); the Hamalayi lift's cliff (≤ one storey, the lift stays the way up); 8 cliffs at the Hamalayi's edges found by scan (gain 2.36–2.59 m, all back down; the Desert scan found none within its range) | PASS |
| A save placing him over the cloud sea → the region's spawn, standing; a save without the pack fields → no pack, back on its peg | PASS |
| 30 vs 60 steps a second: the same height, both on the deck; the fence holds at both | PASS |
| Cost (renderer.info, SwiftShader, Zeelich's green, 960×540): the pack is 11 meshes / 1,100 triangles (static parts merged per material); worn +12 draw calls (848 vs 836, shadows included), lit +5 (flames, puffs); its own code 0.15 ms per lit frame; whole-frame simulation standing 2.22 / flying 1.63 ms (medians of 3×120 frames: noise larger than the pack). No GPU claim | PASS |

Not verified: feel with a gamepad and on a touch screen, the sounds by ear, real-GPU cost; Desert Island's mesa edges
(the scan from its spawn met no 6 m rise in reach — its edges are the sea, checked by the same rule as the pier).

### FIX-PUMP-N (0.31.0 + fix): the pump's prompt with Bram behind him
| Item | Reproduction (before) | Root cause | Fix | Evidence | Result |
|---|---|---|---|---|---|
| Facing the pump at arm's length gave "Talk" (Bram) | Chapter 2 with the pin out (ISO: chapter by flags, as tests/townlife.mjs): walk to the pump's north side, stop between Bram and the pump at (pump +0.25, −1.35), turn to face the pump (error 0.04 rad). The prompt is "Talk": Bram, 0.93 m straight behind him, scores 0.93 + 1.69×0.45 − 0.35 = 1.34 against the pump's 1.37. townlife's N3 check failed (round.north = p_talk) from cb07e22 (CTRL-1) on. CTRL-1 did not break the facing, and keep-apart did not move him (0.93 m > R 0.85). His new gait made P.go stop 0.25 m further north (the edge of its tolerance), which showed a ranking flaw that already existed | Game.findInteractable (src/main.js) gave people a −0.35 preference even when they stood at his back | The people preference counts only for someone in front of him or right on top of him (< 0.5 m). Someone behind can still be talked to when nothing else is in reach | Probe at the same spot, same facing: p_talk before, p_pump after. New townlife check: at that spot, facing the pump gives "Pump" and turning round to Bram gives "Talk". Regression on :8195, run one after another: townlife 36/36, controls 69/69, combat 59/59, stability 16/16, house 2/2, chapter1 (log run: every milestone true, ends in play on Zeelich), no page errors | FAIL → FIXED |

### Character voices (VOICE-1; src/engine/voice.js; evidence docs/lba3-production/reviews/VOICE-1/)
The user: "the characters' voices are too similar, and the gibberish isn't pleasant to listen to". Measured, not listened
to: nobody here can hear the result.
| Item | Before | After | Evidence |
|---|---|---|---|
| What made a voice | f0 + formant scale only; sawtooth (square for bees/drones) through 2 band-passes; random pitch per syllable | Race colour (Quetch, Grobo, Rabbibunny, Sphero, Esmer, Mosquibee, mole, elf, Zeelich tri-head, robot, Sendell, dinofly) + each named speaker's own pitch, range, formants, source roll-off, breath, nasality, rate, legato, swing, stress foot, intonation contour, vibrato and a fixed seed (56 named voices, unique seeds and settings) | voices.mjs |
| Distinct voices (features: median pitch, pitch range, spectral centroid, syllable onsets/s, voiced share; 1 unit ≈ 3 st / 3 st / 3 st / 1.5 per s / 15 %) | closest pairs Vesk–Doran 0.4–1.5 (0–2 axes), Twinsen–Zoé 1.2–2.0 (0–1 axis) over runs | all 19 rendered voices ≥ 1.93 apart; Twinsen, Zoé, Arthur, Baldino, Vesk ≥ 2 from every other voice on ≥ 2 axes | measurements.json, voices.mjs |
| Pleasant source | buzzing saw / square, instant consonant noise onsets | soft harmonic source (1/n^1.5–2.6), 3 vowel formants + breath, soft attack/release (exponential), vibrato blooming on held syllables, Esmers/Sendell on a five-note scale, bees a soft flutter instead of a square | spectrograms-before-after.jpg |
| Clicks (click crest: a sample's 2nd difference over its ±5 ms surroundings; a clicky control scores 18.3) | 8.5–19.0 on the main five in the A/B render (the consonant noise started instantly) | 0–5.0 on all 19; max sample-to-sample jump 0.046 | measurements.csv |
| Level at voice volume 1 (pre-master) | active RMS −34.8…−26.5 dBFS (bees loudest), peak to −11.1 | active RMS −34.8…−29.1, peak ≤ −15.6 dBFS; volume 0.25 → −12.0 dB; music home.mp3 in dialogue (0.55 × ducked 0.55) ≈ −31.9 dB RMS, the voice at the default 0.8 ≈ −33…−36: under it, as before | voices.mjs, measurements.json "mix" |
| Timing | a syllable per ~4 typed letters, all scheduled at once when frames bunch | same trigger (16 syllables on the test line vs 15), kept on a voice clock: never in the past, never queued > 0.22 s behind the text | voices.mjs |
| Stops cleanly | grains ran out by themselves | skip (E mid-line), close, new speaker, cinematic pause: silent within 0.25 s, sources ended; nothing resumes after a pause | voices.mjs (in game, analyser on the voice bus) |
| Cost | ~7 nodes per syllable (108 per test line) | 2 pooled filter chains built once; 4 nodes per line after the first (6 for a bee); nothing per frame | voices.mjs, measurements.json "nodesPerLine" |
Regressions (port 8196, one browser at a time) after merging origin a1ff730 (OPEN-2's voiced opening subtitles): voices 24/24,
opening 22/22 ("every spoken line babbles in its speaker's voice" included), townlife 36/36, stability 16/16, audio 5/5, no page errors. Not verified: how the voices sound to a listener (pleasantness, recognisability by ear).
### BUG-WALL: the camera inside the cliff after the target; the camera across the water out of a door
| Item | Reproduction (before) | Root cause | Fix | Evidence | Result |
|---|---|---|---|---|---|
| The view inside the rock / the stones after the Whispering Cliffs' target (the user's 0.29.1 photo) | Chapter 2 (ISO: chapter by flags), the target hit by input (segment 04's spots), stones risen. The remaster follow, fresh view + 1.3 s, Twinsen on a 2 m grid round the cliffs × 8 headings: 19 placements put the camera inside a risen stone (30 m pillars; their moss caps are the "flat green polygons"), inside the cliff rocks at the rock stack's rim (0.008–0.03 m from cliffs.js's double-sided blocks: the view from inside), or 0.09–0.2 m from the pipeline. e.g. Twinsen (−56, −28) facing NE: the camera between two stones; (−68, −32) facing the target: the camera in the rim | The remaster follow (and the 1997 cuts, scripted shots, the free orbit's end) only kept 1.5 m over the terrain straight under the camera: a steep face beside it, a collider (the stones, a tank, a pillar) or a roof was never tested. The hidden-swing skips cylinders under 1.5 m (trees), so the stones never turned the view either | camera.js `_clearance`/`_keepOut`, applied to every outdoor placement: the terrain on rings to 1.6 m (1.5 m under it as before, 0.3 m at 1.6 m), every enabled collider and VP-10's scenery volumes within 1.6 m (top + 0.5 m, weighted from full within 0.45 m to none at 1.6 m, so the view rises smoothly as it nears something); colliders more than 4 m above the camera pull it in toward the look-at point instead. In the remaster follow those margins are eased in (≤ 5 m/s, ≤ 7 m/s², looking up to 2.25 s down the camera's own way, no overshoot) over a floor held every frame: a quarter of the margins, from what lies within 0.8 m (a first version applied them at once and jolted the view over rock rims and roofs: controls' hidden-behind-a-tower swing 552 m/s², now 39.4 against 39.1 before the task). The pipeline's tube is a camera-only volume (occlude.js `camOnly`: kept out of, never risen over). VP-10's rise rule and CTRL-1's springs untouched | 2 m sweep: 19 → 4, the 4 inside the station tower's taller camSkip box but outside its drawn shape (1.3–2.1 m away; the camera reads the tower's volume, VP-10). tests/camclear.mjs (b): before FAIL (a stone, a cliff rim), after PASS; reviews/BUG-WALL/ | PASS |
| After every ball-target event of chapters 1–10 | tests/camclear.mjs (a): well node, Citadel target and orchard valve, Zeelich mill brakes (ch. 3, 9, 10), the dig's gear, the condenser hatch, the Hamalayi tree and kite, the evacuation hatch wheel; thrown by input from spots round each (the Hamalayi tree: no spot round it lands a throw, ISO hit, logged); ch. 7 has no ball target | — | — | Every frame of the event and 6 s after: camera outside colliders/volumes/terrain; Twinsen on screen and in view or drawn by the silhouette. Before and after: PASS (these placements did not hit it) | PASS |
| Out of a door, the camera "runs across the water" (the user, 0.31.0) | tests/camclear.mjs (c): every Citadel door open in chapter 2 (house, office, wtent, asylum; the control room's is shut then), in placed on the door, out by input. Before: the free orbit starts 888–1073 m away and travels up to 165 m a frame across the sea (the rooms stand ~1 km east of Citadel); the remaster follow and the 1997 cuts start at their shot in the stepped harness | Nothing told the camera a scene had changed except the remaster follow's own re-init: the free orbit's target and a scripted shot's lerp set off from where the camera was (inside the room's site) | camera.js `snap()`: setIso (every enter/exit) and any focus jump over 4 m between two frames (respawn, travel, a load) start the next frame at the new shot in every mode; normal play keeps the smoothing | (c) before FAIL (free orbit), after PASS: first frame within 20 m of Twinsen and 3 m of its place 1 s on, ≤ 0.6 m a frame | PASS (the remaster follow's glide on the laptop not reproduced here: the real-time fade hold was run through advance() and snapped too) |
| Regressions (merged with a1ff730, own server) | controls 69 PASS (camera route accMax 15.9, stairs accY 2.0, hidden-behind-a-tower 39.4 ≤ 40), occluders 32 PASS, chapter1 end to end (no errors), stability 16 PASS, transitions 5 PASS; tests/camclear.mjs 44 PASS (before the fix: 3 FAIL) | — | — | reviews/BUG-WALL/camclear-before.log, camclear-after.log | PASS |

### ADV-2: chapter 4's wind-pump and the dig's keypad (docs/lba3-team/ADVENTURE_DESIGN.md "ADV-2"; evidence docs/lba3-production/reviews/ADV-2/)
| Item | Before | After | Evidence | Result |
|---|---|---|---|---|
| The pump's fault | Told: "Three gears up the tower, all seized" + Twinsen's "(A good hit with the ball…)"; three identical hits, 0/3 | Found: Tarra points to Brosk and Sani; Brosk blames the bore's tremors; Sani hears two gears clack, one grind; at each gust (3.4 s; Listen brings one at once) the sound gears rock, the jammed one holds, shudders, spits sand, grinds | chapter4: lines without the solution; in a gust sound gears > 0.15 rad, jammed < 0.05 rad and shaking; the grind/clack cue called (not heard) | PASS (INPUT) |
| The gears could not all be struck | The 3.6 m and 5 m gears were above a thrown ball's reach (~2 m by the tower, measured); the old test fell back to a "forced" hit | A gearbox across the west face at 1.7 m, 1.35 m apart; the tank moved south-east, one palm in the line left out. Each marked gear reached within 0.01–0.08 m from 3.6–5.2 m, neighbours ≥ 1.34 m off | scratch probe (adv2/aim.mjs), chapter4 throws by input (turn until the marker is on the gear) | PASS |
| A wrong guess | — | A sound gear rings and swings back ("Not that one", then a toast); nothing resets; Sani's hint grows ("It spits sand") | chapter4 | PASS (INPUT) |
| Brosk's tremors | A line with no use | Half right: once the gear turns the water sprays from a pipe joint the tremors shook apart; push it home → the oasis fills; Brosk takes the credit, once | chapter4 | PASS (INPUT) |
| Any order | — | The pump fixed before Tarra asks → "Before anyone asked you?", her trust and Ilka | chapter4 (old save k1) | PASS (INPUT) |
| The gate code | Auto-entered with the notebook | The keypad: 1, 4, 7 worn shiny (seen before the notebook, no menu); with it, a choice of the three orders; a wrong one buzzes red ("Wrong order. Ilka's notebook has it"); 4 · 1 · 7 opens | chapter4 | PASS (INPUT) |
| Saves | — | Save → Continue while spraying (still spraying, gear freed); death → Retry later (pump runs); old format-3 saves from REV-TY-4: chapter start (jammed, completable), an older mid-pump state (old gears 0/2 freed: still jammed, completable), notebook with the gate shut (keypad, opens), Kesh before the notebook (worn keys) | chapter4 | PASS |
| Journal | The steps only | Facts heard/seen (Brosk, Sani, a sound gear, the spray, worn keys, the notebook's last page, a wrong order), never the answer; facts no longer hold back or reveal a step (the old filter hid steps after a fact line) | chapter4 | PASS |
| chapter4 (all, incl. ADV-1's discs; the cold-count checks made relative: a stray ball at a mite can strike a cold disc) | — | 54/54, no page errors | reviews/ADV-2/chapter4.log | PASS |
| Regressions (own server :8172, one browser at a time, on 25115cf) | — | chapter5 to chapter 6 (no errors); desert-life 30/30; stability 16/16; save-migration (v1 migrates, missing room → outdoors, corrupt kept aside; rc 0); travel 17/17; segment 07 from REV-TY-4's format-3 chapter-4 start save to chapter 5 (no stops, no assists); camclear "ch4 the dig: a pump gear" 3/3 | reviews/ADV-2/reg-*.log | PASS |
| After merging origin 1dea515 (CHAR-OPEN: Twinsen's, Zoé's and the guard's models, rig.js) | — | chapter4 54/54, stability 16/16, no page errors | reviews/ADV-2/postmerge-ch4.log | PASS |
Not verified: a first-time player's read (does the gust read at the play camera, does a choice of three orders feel like a keypad), the
clack/grind and the spray's sound by ear, the GPU look.

### CHAR-OPEN: OPEN-3's model leftovers (block 6; evidence docs/lba3-production/reviews/CHAR-OPEN/)
Captures: headless Chromium, SwiftShader, our renders only. "Before" = 40946f8 served from a mirror of the tree with
the old models and code; lookdev = char-lookdev.html (same light, distance and framing before/after), the opening on
the game's own 1/30 s clock (opening-shots.mjs), the knock-out in the dev arena as tests/deaths.mjs runs it
(ko-shots.mjs).

| Item | Before | Cause | Fix | Evidence | Result |
|---|---|---|---|---|---|
| #11 Zoé's bun stands off her head | In profile at the tap (41.0, 58.6) the bun floats behind the skull with bare scalp between; it swings further in a run | The measured balls only graze the crown's back and the mass rode tail0..2 (the follow-through) | zoe_poly.py: the same three balls seated on the skull, the bun on the head bone only | 11-zoe-bun-views.jpg (idle, run sway ×2, roll, run; front/¾/side/back), 11-zoe-bun-opening.jpg (41.0, 46.0, 58.6, 77.5) | FIXED (on the head at every view and pose captured) |
| #28a Twinsen's arms and shrug | His arms are lost in the bell: at 49.4 a gesture is a blue lump; the shrug at 53.0 is a blue dome from behind; windup and charge tear the cape into membranes; a hole opens at the back between belt and robe in deep bends | One cape shell out to ±0.214 H with its sides skinned to the arms | twinsen_poly.py: a tunic body (flat yoke ±0.15 H, ±0.122 H over the belt) + two wide sleeves of their own (sh/el, blended at the elbow), ball hands in the cuffs, a hips → torso waist band; drawn at armSpread 0.3 (unchanged) | 28a-twinsen-views.jpg, 28a-twinsen-close.jpg (idle, shrug peak, talk, reach), 28a-twinsen-deform-grey.jpg (run, windup, throw, charge, hands, pick-up, sit), 28a-twinsen-opening.jpg (49.4, 53.2, 53.35), 28a-twinsen-hop-pack.jpg | FIXED (arms and shrug read; no tears or holes in the poses captured) |
| #28b Zoé's arms are thin rods | 6 → 4 cm tubes, the hands 0.45 m out from her sides in the idle | Straight tubes r 3.1/2.6/2.0 cm; LOOKS.zoe armSpread 0.3 | zoe_poly.py: nine sections (shoulder cap, upper arm 9–10 cm, elbow, forearm swell, 5 cm wrist); armSpread 0.08; opening.js: her arms-in bend (45–58 s) removed and the tap/stream bends' z −0.22 (the same angles) | 28b-zoe-arms-views.jpg, -close.jpg, -deform-grey.jpg, -opening.jpg (41–77.5); opening-hands.mjs: her right wrist at the tap 1.361/1.397 m high (before 1.370/1.391) and in the stream 1.049–1.060 (before 1.054–1.059), same x/z within 1 cm | FIXED (slim, SRC-2's figure, not pregnant) |
| #4 the long-coat guard's hem lying | Knocked out on his front the coat's back stands 0.60 m up over his legs like a tent; on his back the front does (0.73 m) and the sides open round the legs | The skirt only on the four skirt bones (a stiff cone); in the KO the top panel followed the forward leg and the sides turned out (+0.2) | cast_poly.py w_skirt `coatLegs` (vguard 0.5: toward the hem half the skirt rides the thigh on its side), `hemW` 0.9; rig.js KO cloth: the top panel on the thighs' mean pressed in ±0.4, sides in ∓0.12 | 04-vguard-ko.jpg (0.6 s and at rest, side and ¾, both falls), 04-vguard-coat-views.jpg (standing, walking, running) | FIXED: the coat's top lying on his front 0.37 m (hips 0.24), on his back 0.61 m over the raised knee (0.48 m) |
| (found) KO on his back: the body 0.36 m off the floor | Lying on his back the hips are 0.36 m up, the body held on the heels (feet 0.12/0.28 m) | KO_HUMAN.back's keys (legR −0.25, kneeR 0.75: the shin points into the floor); not the coat (the lowest point is the left heel before and after) | — (the animator's keys) | ko-shots.mjs measures | OPEN (animator, see STATE.md) |

Counts (one LbaMaterial with vertex colours per character, no textures; unindexed triangles): Twinsen 2372 → 2572
(+8 %: sleeves, waist band), Zoé 4434 → 4646 (+5 %: the arms), the guard 1954 → 1954. Skeletons, bone names,
hierarchy, bind transforms and sockets unchanged.

Regressions on the final tree (own server :8173, one browser at a time): opening ALL PASSED (24), deaths ALL PASSED (160), stability ALL PASSED (16), prologue to its end into chapter 1 (no errors), house ALL PASSED, jetpack ALL PASSED (48; Twinsen with the pack on the new tunic), combat ALL PASSED (59), zoe-resume ALL PASSED (5; Zoé as the player); reviews/CHAR-OPEN/tests.log.

### RENDER-INV: what costs a frame, and the fixes (block 7a; docs/lba3-performance/PERFORMANCE_AUDIT.md)
SwiftShader here (counts exact, CPU times proxies, no GPU timing); the user's laptop benchmarks (builds 120, 122, 127)
are the GPU evidence. Evidence: docs/lba3-visual/evidence/RENDER-INV/.
| Check | Result |
|---|---|
| Is the whole world drawn? (every draw attributed to its area: title, opening, house, street, harbour, combat, Zeelich, desert, revisit) | NO for drawing: only the current area (main and shadow pass); the title orbit and the opening's first shot draw all of Citadel by design. YES for memory: every area built at startup and kept (~1 GB renderer + ~1 GB GPU process here) — not changed (audit R1) |
| Laptop (build 127, Medium) | GPU-bound: street 19 ms GPU, interior 14 ms; MSAA 2× ≈ 10 ms of it (no MSAA: 9.3 / 8.8 ms) |
| Map build after arriving (F1/F2; arrival.mjs, 2 rounds, 2 steps a frame) | CPU per frame p95: Citadel 26.9/25.8 → 19.7/19.2 ms, Zeelich 26.7/27.3 → 21.8/21.5; frames > 16.7 ms halved; chunk p95 7–10 → 0.4–1.1 ms |
| Draw batches (F8; perfbudget base → this build) | street calls Low/Medium/High 292/340/437 → 261/304/397; interiors −7 %; transitions −10 %; combat unchanged; every region −2 to −33 % (regions.mjs) |
| Look: batches (folding off), lamp skip (F9), colour-only resolve (F10) | pixel-exact in one page / one frozen frame (Citadel, house, workshop, Zeelich, desert, Hamalayi, Otringal); folding (off) would change ≤ 0.3 % of pixels |
| Settings → Edges: Fast (FXAA) vs Smooth (MSAA) | same frame: edges smooth, fine texture slightly softer (3–8 % of pixels > 8 levels); default stays Smooth |
| First use of every weapon/gadget | 0 new shader programs; save 0.6 ms, load 3.5 ms |
| Repeated transitions (20 house + 5 Zeelich) | geometries/textures/programs/objects unchanged |
| Regression | stability, transitions, townlife, opening, chapter1, occluders, doorcull, travel, chapter4, zislands, holomap, dynres, timing, menus, display: ALL PASSED; perfbudget: 3 FAILED, the same 3 fail on base (street budgets 304 > 300 / 261 > 260, were 340 / 292; in-page preset switches compile programs on base too) |
| 30-minute session | NOT TESTED |
| GPU saving of F9/F10/Edges on the laptop | NOT VERIFIED (the next benchmark) |

### CLAR-2 + HINTS-LESS: less text on screen, quests that point instead of explain (block 7a; evidence docs/lba3-production/reviews/CLAR-2/)
Measured with tests/clarity.mjs (INPUT, LBA HUD = the default), the same script on the base (9faa1a8 served from a copy)
and on this build: five routes — the opening's hand-off and the prologue's first minutes, Citadel's street, the
prologue's cave fight, chapter 4's wind-pump, chapter 11's core fight. "Put up" = every toast, objective change,
prompt label and chapter card the game raised on the route (tests/lib/textcensus.js); "on screen" = the words visible
at the route's busiest moments (jpgs `before-lba-*` / `after-lba-*`).

| Route | Put up before → after (items / chars) | Toasts before → after | Busiest moment before → after (items / chars) |
|---|---|---|---|
| Prologue (hand-off → rope) | 34 / 383 → 32 / 313 | 6 / 134 → 4 / 64 | hand-off 2 / 67 ("Check the well. Take the magic ball from the cupboard first." + "Fists") → 1 / 14 ("Check the well", fades after 5 s of play) |
| Street | 8 / 41 → 7 / 31 | 1 / 10 → 0 | harbour 1 / 6 → 0 / 0 (no prompt while he runs past) |
| Cave fight | 28 / 238 → 27 / 206 | 2 / 36 → 1 / 19 | fight 1 / 21 ("Magic Ball R: Fists") → 1 / 12 |
| Chapter 4 | 18 / 321 → 16 / 256 | 2 / 45 → 0 | (the panel's goal now shows ~5 s when it changes: arrive 1 / 6 → 2 / 47) |
| Core fight | 3 / 136 → 3 / 109 | instruction toast at once → only after 40 s stuck | fight start 2 / 113 → 2 / 42 |
| All five | 91 / 1119 → 85 / 915 (−18 % chars) | 12 / 317 → 6 / 148 (−53 %) | |

In code: 110 → 82 toast call sites; about 30 strings deleted and 56 rewritten (text/*.js, i18n.js).

| Item | Before | After | Result |
|---|---|---|---|
| Objective | LBA HUD: hidden, the first goal as a long toast; Modern: always up with all its steps | Both HUDs: the goal line only, ~5 s of play when the goal changes (dialogue/menus hold the clock); its steps ("◆ Lid key (water office)") in the pause menu, the Holomap and the journal; a count change ("2/3") doesn't bring it back | PASS (clarity: goal-only at every moment; opening: objT > 0 at hand-off, no toast repeating it) |
| Toasts that restate | "New task…", "You're playing as Zoé…", "The evacuation plan was confiscated", "The shutter opens", "Get out of the post!", "Valves marked on the holomap", "Roof hatch open", "Gear freed", the side stories' "…runs again / draws again / is hot again / is talking / cleared", "You overhear whispering…", "The stones rise!", "Found a clover leaf!" | cut: a line, the objective or the world already says it | PASS |
| System toasts | "Game saved" at every checkpoint; the place's name after every trip | silent (LBA2 saves silently; he picked the place in the menu) | PASS (clarity) |
| Key hints | "(2) … Space", fixed F/M | the player's bindings / pad buttons: "Magic ball (Alt) · Holomap (H)", "Athletic (F2), then Space to jump", sword, pulse tool | PASS (clarity: the cupboard toast names input.label) |
| Prompts | "Ferry", "Spaceship", "Shuttle", "Glider", "Take coat", "Cool it", "Console" | verbs: Board, Fly, Take, Cool, Use; no prompt while running past or in reach < 0.15 s | PASS |
| Weapon pill | "Fists" at the hand-off; "R: Fists" through a whole fight | only when the weapon changes; the swap key only then | PASS (clarity) |
| Settings | "Modern (camera-relative)", "Classic (LBA2 keys, tank)", "Free (mouse / stick)", "Auto (keeps the frame rate)", "30 (steadier on slow PCs)" | Modern, Classic (LBA2), Free, Auto, 30; RENDER-INV's Edges: Smooth / Fast kept | — (layout untouched: WORKLIST #28) |

HINTS-LESS (wording and hint frequency only; no puzzle logic changed):
| Chapter | Before | After (the nudge that stays) |
|---|---|---|
| Prologue | Twinsen: "sneak up in Discreet mode"; step "Wake the three crystals with the magic ball" | "If I sneak up quietly…" (Arthur's hint unchanged); "Wake the three dark crystals" (his cave line still names the ball) |
| 1 | Orchard: "bounce it off the wall"; steps "(behind bars: use the ball)", "(target and stones)"; the cliff zone's "Try hitting it with the magic ball" | "My hand won't fit through. The magic ball might."; steps name places ("The orchard (behind bars)", "The Whispering Cliffs (the old target)"); the zone says nothing (Mira's saying is the clue) |
| 2 | Baldino: "Brake them with your ball"; objective "…with the ball", "…at the console by the gate"; radio: "sun, wave, star" outright | Baldino: "Stop the mills" (Oku: "we stopped them with a stone. You have a ball."); the radio's riddle ("what wakes us, what the sea does, what keeps watch at night"), plain after a wrong try; Baldino asked again: "the console by the platform gate" |
| 4 | — | ADV-2 kept as is (one restating toast cut) |
| 8 | Gilbert: "a lever by the old cistern… a hatch wheel up on its frame"; the wheel: "The ball should turn it." | "opens from inside the yard, by the old cistern… a hatch up on its frame"; "Too high to reach by hand." |
| 10 | Zoé: "star, sun, wave" | "my old warning, with the star moved to the front" (Arthur's needle feedback unchanged); asked again: "Star, sun, wave" |
| 11 (core) | instructions as a toast as the fight starts, the coil's at once | Baldino's radio line; the plate/panel toast after 40 s with no pylon, the coil's after 25 s with no hit (ChapterBase.nudge, once per session) |
| Side stories | "cool it in the water barrel" / "it needs cooling" | "The coupler is glowing" (Nell's and Baldino's lines and the journal keep the cure) |

Kept on purpose: item names on pickup (Lid Key, Rope Ladder, Override Key…: the inventory changed), control bindings,
consequences ("Disguised: the archivist is slower to notice you", "A clover leaf saved you!", "Spotted!"), counts of
progress (valves, mills, seals, relays), the sandstorm warning, ADV-2's observation clues, chapter cards, every line of
dialogue (voice and humour), signs. Open (UI): inventory.js prints fixed keys ("I / J to close", "E: use").

Regressions after merging origin ad2be62 (RENDER-INV), own server :8191, one browser at a time (reviews/CLAR-2/tests.log):
opening 24/24, menus 26/26, stability 16/16, holomap 30/30, clarity 10/10, chapter4 54/54, townlife 36/36, workshop
32/32, desert-life 30/30, resume 2/2 (ALL PASSED); prologue, chapter1–3 and 5–10 (LOGIC) each reach the next chapter, no
page errors. Not verified: a first-time player's read of the riddles and of the 5-second panel; the Modern HUD route
(clarity HUD=modern) not rerun.

### Not tested / blocked
- Frame rate on a real GPU (60 FPS gate): BLOCKED — software rendering here; the in-game benchmark on the user's PC.
- Listening (music mix, effects, voices), gamepad and touch feel: BLOCKED — human.
- Fullscreen: NOT TESTED (headless).
- CHAR-OPEN's models on a real GPU and display, and an independent visual review: NOT DONE (SwiftShader captures only).
- Optional content beyond what the main path walks past (all wizard rooms' extras, every giver, crystals beyond those
  picked up on the way, the LBA1 rooms' full routes): covered by their LOGIC tests (wizards, lba1rooms, givers), not by
  an input playthrough.
