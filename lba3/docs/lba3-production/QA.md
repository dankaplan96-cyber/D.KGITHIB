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
cd lba3 && python3 -m http.server 8123 &      # the game at http://localhost:8123
node tests/menus.mjs            # menus, pause, settings, focus, dialogue input, inventory, holomap, rebinding
node tests/stability.mjs        # the defects fixed in the stabilization pass (regression)
node tests/shipfiles.mjs        # every file the game requests is in the shipped list (desktop/publish)
node tests/transitions.mjs      # door walk-through, black hold while shaders compile
node tests/lib/seg.mjs tests/playthrough/NN-*.mjs   # player-input playthrough, one segment (LOAD=/KEEP= saves; see below)
node tests/chapterN.mjs en-US   # LOGIC chapter scripts: each step's end state judged PASS/FAIL (R7-VERDICTS)
node tests/verdicts.mjs         # the result policy's self-test (tests/README.md "Reading a verdict")
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
| Playlists in the long-stay places, silences outdoors only, phrase starts, bar-line crossfades, ducking to 0.5 (MUSIC-2) | music.mjs | PASS |
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

DIFFICULTY (the bore fight and the galleries; POLISH-AUDIT row 9). Bot (ASSIST=1, Retry on, 12 HP max), logs in the
session scratchpad `difficulty/`. Before, segment 13 x3: the bore step ended at 1, 2, 1 HP with five enemies finished by an
ISO assist each time (the first full log had one death); bore-only x3: the sentry at the gate took the bot from 10 to 2 HP
before the relay, then an ISO assist beat all six. After, segment 13 x3: wave 1 (drones) ends at 10 HP each time; the bore
step ends at 8, 11, 4 HP, 0 deaths, ISO assists for 1-2 enemies (the sentry's shield, once the guard too) instead of 5-6;
bore-only x4 on the final numbers: 0 deaths, 1-2 assisted. (A first version with a 5-HP armour-2 clone killed the bot after
two Retries in 2 of 4 runs: the clone is now 4 HP, armour 1.) Galleries (segment 14 to Sendell's door) x3 before: 8, 8, 2 HP;
after: 12, 9, 10 HP (and 12, 7, 9 chained from the new segment 13 save), 0 deaths; the full segment 14 passes (0 deaths, 0
assists). What changed: two waves with a checkpoint save, a heart and a flask between (and a second heart when the clone falls
at 6 HP or less); the sentry is wave 2, not a fight on the way in; the galleries' mites sleep further from the way in and wake
one after the other (Mite def.wake); nothing bites across a drop (mite, Grobo baton, sentry); two supply crates (givers) on
the shelves. The bot rummages them only below 9 HP. The i-frames (Hero.damage, 1.1 s) are checked in tests/combat.mjs.
Balance by a human is still untested.

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

### CHAR-2: Twinsen's neck and Zoé in the opening (block 8; evidence docs/lba3-production/reviews/CHAR-2/)
Captures: headless Chromium, SwiftShader, our renders only. "Before" = the same tree with the previous
assets/poly/{twinsen,zoe}.json swapped in (the code is identical); lookdev = char-lookdev.html (CHAR-OPEN's, plus
`ty`, `at=handR`, the play camera from behind and a high ¾-back view, and head extremes nod/lookUp/lookAside), the
opening on the game's own 1/30 s clock (opening-shots.mjs), the play camera (ingame-shots.mjs for Twinsen,
zoe-ingame-shots.mjs for Zoé as the player). character-review §18 has the detail and the animator handoff.

| Item | Before | Cause | Fix | Evidence | Result |
|---|---|---|---|---|---|
| NECK-TW Twinsen's neck | From behind a thin stick "cut off" by a flat cape top, a crease down the nape, a notched collar edge, the head a ball on a stick with background between (the user's photos; opening 52.1 over his shoulder) | ring() puts a section's sides at z = 0: for the neck (front +0.08, back +0.02 H) and the cape's top rings the back point lay forward of the sides; the cape top flat (0.765 → 0.772 H) | twinsen_poly.py: oring() round sections; LBA2's thin neck (±0.031 H) with a wider base, a nape leaning into the skull, closed base; the cape's shoulders sloping into a rolled collar (top 0.78 H) with a dark inside; head turn blended over 0.785 → 0.855 H | neck-tw-views-before-after.jpg (idle/nod/lookUp/lookAside/shrug × front/¾/side/back/¾-back/high/play-back), neck-tw-body-before-after.jpg, neck-tw-hop-pack.jpg, neck-tw-opening.jpg, neck-tw-opening-52s.jpg, neck-tw-play-camera.jpg | FIXED (a neck with a collar and nape in every view and head pose captured; one-shell cape and silhouette kept) |
| ZOE-OPEN Zoé in the opening | Angular wedge face (one ridge chin → forehead), lips a crescent across the jaw, dark slit eyes (closed), triangle earrings, a 10-sided rod forearm ending in a flat paddle (the user's photo; BUILD109 §4) | The head lofted from the measured cuts (each a forward wedge); the measured lip crescent and eye slits; the SRC-1 mitten | zoe_poly.py: designed head sections at the measured size (brow, cheekbones, rounded chin), a nose loft, a smaller smiling mouth + mouth line, white almond eyes with iris/pupil, lid lines, brows, teardrop hoops; 12-sided arms with elbow, forearm swell, flatter wrist; build_hand (palm, curled mitten, thumb) | zoe-open-head-, -face-, -hands-, -arms-grey-, -deform-grey-, -body-before-after.jpg, zoe-open-opening.jpg (41, 46, 52.1, 58.6), zoe-open-opening-58s-profile.jpg, zoe-open-opening-61s-hand.jpg, zoe-open-play-camera.jpg | FIXED (profile, eyes, mouth, hoops, wrist and hand read at the opening's cameras; deformation as before) |

Counts (one LbaMaterial with vertex colours per character, no textures; unindexed triangles): Twinsen 2372 → 2724
(+14.8 %: collar rings, round 16-sided neck, its inside), Zoé 4646 → 5382 (+15.8 %: head rings, nose, eyes, hoops,
12-sided arms, hands); Zoé's skinned colours 6 → 7, eye colours 1 → 3. Skeletons, bone names, hierarchy, bind
transforms, sockets, armSpread and opening.js unchanged.

Regressions on 8ba8a0e (own server :8178, one browser at a time, 2026-10-24): opening ALL PASSED (24), prologue to its
end (rc 0, saved, "Tell Zoé what happened in the well"; no page errors), house ALL PASSED, stability ALL PASSED (16),
deaths ALL PASSED (160), zoe-resume ALL PASSED (5; Zoé as the player on the new mesh), jetpack ALL PASSED (48; the pack
over the new collar), combat ALL PASSED (59); reviews/CHAR-2/tests.log. After merging origin e2ba54f (CLAR-2 +
HINTS-LESS: hud, text, story, main.js) the same eight again on da2bd15: all ALL PASSED with the same counts, the
prologue to its end ("Go home and tell Zoé"), no page errors.

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
After merging origin f30d36d (the loading screen): menus 26/26, stability 16/16, opening 24/24, clarity 10/10.

### CAM-2: the play camera "moves a lot" (block 7a; evidence docs/lba3-production/reviews/CAM-2/)
Recorded by tests/camsteady.mjs + tests/lib/camrec.js: 10 repeatable routes walked by input on Citadel (street and
square, along house walls, a door in and out, out of Twinsen's door, the pier, the bay below the cliffs, standing /
turning on the spot / short corrections, a fight with four mites, the street with Modern controls), both cameras, every
frame. "Before" = the same routes against ccr-adf00ea7 at 9faa1a8 (block 7a's start) served from a copy. SwiftShader,
the game's own deterministic clock: motion is measured, not how smooth it looks on a GPU. A shake's frames are left out
of both (feedback, not the camera's rules).

| What made it restless (before) | Numbers before | Fix (src/engine/camera.js) | After |
|---|---|---|---|
| The rise over houses (VP-10) went as high as needed every frame and came back at 50°/s: beside a house with the view on its far side, 80° — straight down on him — then down again a few steps on | along the walls max 80.1°, 4.7 s over 50°, tilt 158°/min; door in/out 80.2°, 6.6 s, 269°/min | Rise held at its highest need for 2 s, comes down at 22°/s, stops at 48°; needing more for 0.5 s, the view turns (15° steps, up to 105°, eased ≤ 60°/s) to the least heading that sees him at ≤ 40°; cooldown 4 s; Enter's swing behind him is kept 6 s | max 48°, 0 s over 50°; tilt 83 and 94°/min; the turns add 114 and 68°/min of heading (once or twice per house passed) |
| Out of a door (BUILD109 §6): the fresh shot is behind him, i.e. over the house he just left | first view out 66.8°, over 45° for 5.9 s | A new scene starts from the least turn of behind-him that needs ≤ 40° | first view 26.4°, never over 45° |
| The look-ahead (3.3 m) swung round with every change of direction, by time: a step back, a shuffle or a turn on the spot moved the whole view | standing/turning/corrections: camera moved 3.23 m while he stood | The look-ahead moves only after he keeps to a way for 1.5 m (within 34°), and then by the ground he covers | 1.41 m (the ease-out after his steps), 0° turned |
| Height followed every bump of the ground | height reversals 9.9 (walls), 10.3 (cliffs) /min | 0.35 m dead band on the ground height | 3.8, 4.5 /min |
| The least-margin floor (BUG-WALL) dropped back in one frame when it let go | — (seen as 1 m steps in the free orbit) | What it lifts becomes the eased lift's, let down gently | free orbit's worst step 0.98 → 0.39 m |
| Shake: a new random offset every frame (white noise, different at 30/60 fps) | LBA view in the mite fight, shake counted: heading 33, tilt 26, height 55 reversals/min | Smooth noise tremor, same at any frame rate | (shake frames excluded from the table) |
| Free orbit: auto-turn behind him under camera-relative (Modern) controls — the two chase each other | Modern street: 993°/min of heading, 88 reversals/min, 710 jolts/min | No auto-turn under Modern; under Classic only after 0.6 s of a steady way, eased (≤ 24°/s), never within 2 s of the player's own camera input | 0°/min, 0 reversals, 0.9 jolts/min |
| Free orbit: pulled in instantly behind every post/corner and let out at a fixed rate (pumping); the keep-out pulled it out of tall walls with jumps; terrain lift at once | jolts 47–451/min on every route, accMax 8 600–27 000 m/s² | Thin things ignored for the pull-in (the silhouette shows him); blocked 0.2 s before it draws in, eased (≤ 8 m/s in, 2.5 out after 0.7 s clear); tall walls beside its way taken early; lift eased with look-ahead; a new scene starts behind him | 0–13 jolts/min, accMax 15–41 m/s² except by house eaves (1 433) |
| Mouse/finger drags piled up while no orbit used them, then swung the free orbit all at once | — (code reading) | Drained when the free orbit is not in use; keys/stick turn per second, not per frame | — |

Before → after per route (all numbers: reviews/CAM-2/before-after.txt; LBA follow):
| Route | max tilt | s over 50° | tilt °/min | heading °/min | reversals/min (heading/tilt/height) | jolts | still: moved m / turned ° |
|---|---|---|---|---|---|---|---|
| street and square | 26.4 → 26.4 | 0 → 0 | 0 → 0 | 0 → 0 | 0/0/3.7 → 0/0/0.8 | 0 → 0 | 10.4/0 → 9.4/0 (the bot stuck 40 s at its first waypoint, both builds: the follow's ease-out after each try) |
| along house walls | 80.1 → 48 | 4.7 → 0 | 158 → 83 | 0 → 114 | 0/3.7/9.9 → 1.3/3.8/3.8 | 1.2 → 0 | 4.2/10.2 → 4.6/9.1 (a turn finishing as he stops) |
| door in and out | 80.2 → 48 | 6.6 → 0 | 269 → 94 | 0 → 68 | 0/6.6/6.6 → 4.5/6.8/6.8 | 0 → 0 | 6.7/15.2 → 2.4/1.2 |
| out of the house door | 63.8 → 33.2 | 3.6 → 0 | 179 → 0 | 0 → 0 | 0/9.3/9.3 → 5/5/5 | 0 → 0 | 2.5/8.3 → 1.1/0 |
| pier | 26.4 → 26.4 | 0 | 0 | 0 | 0/0/5.7 → 0/0/0 | 0 | 1.5/0 → 1.9/0 |
| bay below the cliffs | 34.8 → 36 | 0 | 25 → 29 | 0 | 0/1.5/10.3 → 0/1.5/4.5 | 0 | 1.0/0 → 1.2/0 |
| standing, turning, corrections | 26.4 | 0 | 0 | 0 | 0 | 0 | 3.2/0 → 1.4/0 |
| combat, four mites | 26.4 | 0 | 0 | 0 | 0 | 0 | 0.02/0 → 0.1/0 |
| street, Modern controls | 26.4 | 0 | 0 | 0 | 0/0/2.8 → 0/0/0.9 | 0 | — |
Free orbit, jolts/min before → after: street 52 → 0, walls 129 → 13, door 224 → 2, out of the door 451 → 0, pier 49 → 0,
cliffs 47 → 0, standing 41 → 0, combat 22 → 0, Modern 710 → 0.9; heading °/min: 705 → 98, 552 → 408, 936 → 263,
1443 → 55, 620 → 113, 747 → 202, 483 → 0, 99 → 0, 993 → 0.

| Check | Result |
|---|---|
| tests/camsteady.mjs (60 fps, both cameras, budgets) | after: ALL PASSED; before: 25 budget failures (reviews/CAM-2/camsteady-*.log) |
| camsteady RATES=30,jank (30 fps; 60 fps with a 0.1 s frame every 15th) on the house routes and the cliffs | ALL PASSED (32 checks; same budgets) |
| Cost | camRig.update 0.32 ms/frame by a house (SwiftShader machine, CPU); the heading search 0.6–3 ms, at most once per 4 s and at a scene start |
| Regressions (after merging origin f30d36d: RENDER-INV, CLAR-2, the loading screen; own server :8174, one browser at a time) | camsteady 50/50, camclear 44/44, occluders 32/32 (the rise over the south house 26.4° → 48°, acc max 25.1, turn ≤ 43.5°/s), controls 69/69, transitions 6/6, stability 16/16, townlife 36/36, opening 24/24, combat 59/59, chapter1 end to end (no errors) |
| After merging origin e65f548 (CHAR-2: characters.js and models) | occluders 32/32, opening 24/24, camsteady 50/50 (reviews/CAM-2/regressions.log) |
| controls' camera route (CTRL-1 budgets), before → after | lead 0.60 → 0.28 m, worst behind −2.04 → −2.41 m (≤ 2.5), drift after a stop 0.16 → 0.36 m (< 0.6), acc max 15.9 → 15.4, the turn on the spot 0.01 → 0.01 m: CTRL-1's dead zone kept; the look-ahead now waits for 1 m on a steady way (a larger dead zone, the WIP's 1.8 × 1.3 m, trailed by 0.6 m: not kept) |
Evidence: reviews/CAM-2/walls-side-by-side.mp4/.jpg (before | after, walking round the south house: 72–78° down → 46–48°
and a turn), door-side-by-side.mp4/.jpg (out of Twinsen's door: 67° → 26°), before-after.txt, routes-*.json.
Not verified: the feel on a real GPU and display (SwiftShader; motion measured, not judged by eye in real time), a pad's
right stick on the free orbit, touch drags. Left open: the free orbit drawn in to a house wall meets the least margins
over the eaves at once (13 jolts/min there, worst 1 433 m/s²) and can look down 60–70° by houses; the 1997 look's cuts
are unchanged (LBA2's own rise, up to 80°); under Modern controls a steep-view turn (≤ 60°/s) turns his stick
directions with it, as the hidden-behind-a-wall swing already did.

### ANIM-COMBAT: Twinsen's combat animation (block 9; evidence docs/lba3-production/reviews/ANIM-COMBAT/)
The user: "in combat Twinsen's movements feel unnatural and weird." Every move was played by input in the developer
arena and recorded step by step (reviews/ANIM-COMBAT/cap.mjs: joint angles, hand / feet / ball positions, the combat
clocks; side-view crops) before (the base, served from a copy) and after, at 60 fps (30/120 in tests/anim-combat.mjs).
metrics.mjs reads the numbers; strip.py / mkclip.py make the strips and the side-by-side clips. LBA2's own anims were
read for timing and poses (ANIM.HQR 6, 82, 87-89, 42, 7-9; numbers only, nothing copied). SwiftShader, the game's own
clock: motion measured, not how it looks on a GPU.

| What read wrong (before) | Measured before | After |
|---|---|---|
| The throw's wind-up turned the throwing shoulder toward the target (torsoY sign inverted) and raised the arm in front of the face | the hand 0.80 m in front at 1.24 m in the "coil" | the arm out to the side and cocked behind the head, the chest turned away, the free arm on the target |
| The release snapped into a held bow; the ball left from where the hand no longer was | shoulder 51, elbow 46, chest 37 rad/s in one step at the release; on the first flight frame the hand 0.87 m up, the ball 1.22 m (35 cm apart) | a whip over the top; the ball leaves 0.08 m from the hand, 0.56 m in front at 1.82 m; the release clock 0.167 at 60 fps as before |
| Standing throw: the feet scissored under a still pelvis | back foot 77 cm of travel while planted, front 47 cm | back foot 0 cm (planted), front foot lifts and lands (its own step) |
| Throw on the move: a push from the chest | the hand at 1.24-1.55 m, 0.55 m out in front at chest height | the arm cocked and whipped over the walk; leaves over the head (1.85-1.9 m, 0.05-0.14 m in front) |
| Charge: the hold before the charge was an arm held forward, then a pop up into the charge; the charge's arm straight up | arm 52 rad/s into the charge | the hold is the throw's loaded pose and the charge keeps it; release whips from it |
| Sword: one straight arm swung by the chest; the overhead raised a vertical arm | feet 82 / 22 cm of glide over the combo | backhand cocked over the left shoulder, forehand back, two-handed overhead into a bow; feet 15 / 6 cm (their steps) |
| Fists: the right jab turned its shoulder back; the kick stayed out through its whole recovery, then blended | feet 90 / 83 cm | the shoulder drives into the jab; the kick chambers, snaps out, returns, is put down; feet 46 / 26 cm (the strikes' forward steps) |
| Hit reaction: one recoil pose held for 0.4 s while knock-back slid him | 0.4 s still, feet 93 / 50 cm | snap away from the blow (0.05 s), sag, rebound into the stance by 0.42; the feet stumble back |
| No combat stance; idle fidgets mid-fight | — | a stance per weapon while engaged (no fidgets), out of it 2.5 s after; head and chest on a locked target |

- Timing kept: no number in COMBAT / MOVES changed. First hits in the same step as before: slash1 at 0.15 s, jab at 0.083 s
  (60 fps). The throw frees the controls at 0.36 s on its clock as before. tests/anim-combat.mjs: the release clock
  0.16-0.17, from the hand, at 30/60/120 fps; slash1's hit in its active frames at 30/60/120 with the blade sweeping
  from his left to his right through them; the jab's fist furthest out in its active frames.
- Interruptions (tests/anim-combat.mjs): a hit in the coil (no throw, no whip played on, ball home, reaction then stance);
  death in a charge; pause in the coil (frozen, called off on resume as before); dialogue in a strike; a weapon swap in
  a strike; every button in one frame; a scene change in a charge — no stuck pose, no ball left in the hand.
- Cost (reviews/ANIM-COMBAT/perf.js → perf.txt, headless CPU): the hero rig's update 0.02 ms a frame median with foot
  planting (0.005-0.01 without), p95 0.03-0.035 ms; one matrix update of his skeleton and two two-bone solves a frame;
  no new meshes, materials or draw calls.
- Regressions (reviews/ANIM-COMBAT/tests.log, merged with origin after CAM-2): anim-combat, combat, controls, deaths,
  arsenal, stability, opening, camsteady, jetpack ALL PASSED; chapter1 to its end (Zeelich), no errors; zoe-resume failed
  once (Zoé caught while sneaking out under load, the flake STATE records under SRC-2) and passed on the rerun.
- The moving throw's release point is higher (1.85 m vs 1.24-1.55 m before), so a targeted ball's flight starts higher;
  its rules (MagicBall.plan from the hand) are unchanged and the landing distances are LBA2's (controls.mjs passes).
- Not verified: the look on a real GPU and by hand with a pad; the walk's own stride (CTRL-1's keys) was not changed;
  the planted-foot rule stands on flat ground only (on slopes and stairs the feet keep the body's ground height).

### R5-OPENING: the opening's acting and framing (block 9; evidence docs/lba3-production/reviews/R5-OPENING/)
Real-time scene (opening.js on cinematic.js); every change re-captured from the game. "Before" = origin e87209b (after
ANIM-COMBAT), "after" = this branch with origin merged; headless Chromium, SwiftShader, DPR 1. Captures on the game's
own 1/30 s clock (capture.mjs: a per-frame log of hands, soles, gaze, faces in the frame, the ceiling's share; probe.mjs:
test cameras), and on the wall clock (realtime.mjs). before-after.mp4: the whole opening, 10 frames per second of scene
time played at 10 fps = normal speed, no sound. Shot checklist: SHOTS.md.

| Item | Before | Fix | Evidence | Result |
|---|---|---|---|---|
| 1 Zoé at the tap | Her hand beside the cross handle or with the fingers through its stem (CHAR-2's hand reaches 12 cm past the wrist; the offsets were tuned to the old 7.5 cm hand); the twist a forearm wobble; the arm swung up from her side in 0.35 s with no look first; let go in a frame; in the stream her hand went down to 0.99 m, into the watering can (handle 1.02); the gaze straight ahead throughout | `grip()`: the arm solved for the palm every frame: palm down on the cross, fingers over it, turning with the handle (0.7 of its turn); palm up under the spout, the stream ending on her palm. Eyes to the tap as she sets off, a reach as the last step settles, glances at the knocking pipe, the water, the spout; off, a breath (sigh), the hand lifts away, the head leads the turn. One grip per turn (the second try's turn 2.2 → 1.6 rad) | 01-tap-hand.jpg (side, top, the stream, the scene's close-up); tests/opening.mjs "hand on the handle every frame it turns" / "fingers in the stream" | FIXED (on the handle every frame it turns, 4 turns; in the stream 59 of 62 frames, lowest point 1.056 m) |
| 2 Kitchen framing | Side-on from the east: dark ceiling 19.5 % of the frame (35–41) and 12.4 % (41–48), her profile, a near-identical cut at 41.0, a third of the frame the plate rack | One shot from the kitchen's west end a little over her eye level, ¾ front, slow push in (Twinsen at his table behind her), pitched so the top stays near the far ceiling; a cut on her turn to her face from his side of the room for her line | 02-kitchen-framing.jpg; analyze.py `ceil` | FIXED: 11.2 % (35–45.3; about 7 % is ceiling, the rest a near shelf's underside) and 1.3 % (her line); the second try 9.1 → 10.2 % on the new angle (her face instead of her profile). Her bun touches the top edge at 41–44 s |
| 3 Feet | Planted feet skated round with the body in every turn (the gameplay turnL/turnR shuffle, and plain `turn()`s): contact-patch travel Zoé 160/144 cm (44.6–45.5), 136/159 (57.6–58.4), 67/82 (70.0–70.5), Twinsen 133/111 and 152/142, the worker 92–104; a 95° one-frame snap at the end of her walk to the sink (40.93) | Foot planting in the scene's pose layer (every actor, not walking or kneeling): the hip holds a planted foot in place and direction, the sole kept level; past 10 cm / 0.4 rad it steps (lifted ~4 cm, 0.28 s), one foot at a time. Pivots step round with the head leading; walks speed up / settle and turn to their end facing in the last steps | 03-feet.jpg (69.8–71.2 and 44.5–45.3 at 10 fps); analyze.py `feet`; tests/opening.mjs "standing feet don't jump" | FIXED: Zoé 7/22, 8/0, 0/10 cm; Twinsen 7/13, 27/6; the worker ≤ 18; the snap gone. Walking: the stance foot still slides ~3.7 cm/frame (the rig's LBA2 walk keys against the speed: rig-owned, not changed) |
| 4 Subtitles in real time | — (deterministic stepping hides the CSS fades and the voice's pacing) | Measured on the wall clock (realtime.mjs, Low, 480×270): every line shows within one drawn frame of its time and goes at its end; the 0.25 s CSS fade reaches full opacity in 2–3 frames; back-to-back lines swap without a gap; the voice's first syllable within a frame of the text, its last 0.9–1.4 s before the line goes (≈8 syllables/s). Fix: the speaker's talk gesture now ends with the voice (+0.35 s) instead of with the subtitle; gestures chosen per line | 04-subtitles-realtime.jpg, realtime/after-low-480.mp4 + realtime/*.json, rt_analyze.py | MEASURED, not at normal speed: SwiftShader drew 5–7 fps here, below the 7.5 fps the game keeps real time to, so the scene ran slower than its clock and the cue ran ahead. Not listened to |
| 5 Faces after CHAR-2 | Shot 7 (48–50.8, "I fixed that yesterday.") showed the back of Twinsen's head (his face turned to her, away from the west camera) | Shot 7 from her side of the room: his face, the screwdriver's hand toward the tap, Arthur behind him | 05-faces.jpg (9 moments); analyze.py `faces` (no crown cut by the frame in any house shot) | FIXED (shot 7); the rest checked: Zoé's new face, eyes and hoops read in 6b, 7 (over his shoulder), 11; Twinsen's neck at 52.0 |
| 6 Keep | — | The dips' fade-ups moved onto the scene clock: as wall-clock timers they never ran inside the test's stepped frames, so its per-frame checks (solids, people in people, vanishing) saw a black screen from 28.6 s and only ever covered the harbour; now they cover the whole scene (a cut or camera move is not a vanishing). Hand bones reset by finish, played or skipped | tests/opening.mjs | Skip at 3/21/50/64/77/85 s → the same end state; pause/resume, focus loss, Continue, a second new game, the first objective; no solid crossed, nobody in anybody over the whole scene |

Real-time pause (realtime/after-low-pause51.json, paused at 51.69 mid-line for 2.1 s): the scene clock held, the audio
context suspended, the subtitle stayed up, the line ended at its time after resume.

Regressions on this branch (after merging origin e87209b; :8181, one at a time, 2026-10-25): opening ALL PASSED (27),
prologue to its end (rc 0, chapter 1, "Go home and tell Zoé"), house ALL PASSED, stability ALL PASSED (16), transitions
ALL PASSED (6).
After merging origin 843e3a5 (VOICE-LEN: voice.js queues the syllables the typing gets ahead by; the scene runner now
pumps them while a line is up, as the dialogue box does): opening ALL PASSED (27), voices ALL PASSED (24), and the
real-time run again (5.1 fps): the same syllable counts and timing per line (none queued in the opening's lines).

Not verified: the sound by ear (voices, effects, the cue against the picture); a real GPU and display; normal-speed
real-time playback (5–7 fps here); an independent visual review. Known: the stance foot's slide while walking (rig
walk cycle); her bun at the top edge 41–44 s; a contact patch moving under Twinsen's cape as he sets the screwdriver down
(66.8–67.1, hidden by the table and the cape).

### WORLD-FIX + R6 + DINOFLY-POS + STATUE (block 9; evidence docs/lba3-production/reviews/WORLD-FIX/)
The user (2026-10-20): "in the open world there are places where the world swallows the houses, and elements like
windows and doors lie on top of each other." Scan kept as tests/worldfit.mjs; the builders register each building
(src/game/worldfit.js: footprint, turn, plinth, floor, steps, wall lengths, eaves line, every opening with its frame,
shutters, sill, lamp, sign, pipe; walls built into a rise marked banked). The test checks (1) footprint against the ground
(ground over the plinth, a gap under it, the door sill under the ground, a door hanging beyond its steps, a window at the
ground), (2) openings on top of each other, duplicated, into a corner or the eaves, and buildings cutting into each other,
(3) z-fighting over every drawn static triangle of Citadel, Zeelich and the eleven isles (exactly coplanar, same
facing, overlapping, different look, seen from the sky side the play camera looks from; ≥ 0.15 m² fails, smaller listed).

Before (origin 48992d3, same test) → after (this branch, merged with origin):
| Area | Fit findings | Visible z-fighting ≥ 0.15 m² (smaller) |
|---|---|---|
| Citadel | 19 → 0 | 11 (68) → 0 (listed only) |
| Zeelich | 8 → 0 | 15 (33) → 0 |
| Islands | 385 → 0 | 502 (823; Mosquibee 473, Knartas 15, Lift Dock 14) → 0 |
| Total | 412 → 0 | 528 (924) → 0 (180) |

Findings fixed (at the builder, coordinates world x, y, z):
- Citadel, bug house: door sill 0.75 m under the street and the ground 0.82 m over the front plinth at (-54.66, 3.57,
  -13.68); the back floating 0.24 m at (-55.32, 2.35, -20.74); a window at the ground (-52.93, 3.63, -17.62). Stone
  house: in the plateau ramp, 2.28 m of terrace up its back wall (-33.45, 5.13, -27.52), a window 1.36 m under the
  ground (-36.07, 4.72, -24.99), its door 1.14 m over a window (-29.87, 3.81, -21.99) — moved to (-28.6, -23.4), 6.4 × 5.0 m,
  openings re-laid. Shop back 0.56 m swallowed (-26.9, 3.08, 4), baggage 0.41 (-82.7, 3.08, 20.7), museum 0.53 and a
  window into the corner (-67, 4.09, 39.12), Twinsen's house 0.22 (-51.9, 2.89, 84.8), wing2 0.19; pink house door over a
  window (-28.5, 3.63, 27.1), south house (-46.1, 3.63, 26.4); Doran's harbour shed door into the eaves (-113.8, 3.08,
  49.6); the project office's sign on a window (-26.72, 15.77, -57.5). Fix: every house stands on its own level floor
  (world.js houseFlats over town.js HOUSE_FLATS: footprint + 1.15 m at the ground before its door, easing back over
  2.6 m), openings moved apart, shed walls 2.65 m.
- Zeelich: the four house doors' frames ran 0.05–0.45 m into the frieze and their lamps sat on the alfiz (houses 1, 3,
  4 and Baldino's workshop, e.g. (2389, 7.87, -8.1)) — door 2.35 m, frieze above it, alfiz and lamp only where they fit;
  two house roofs (23 m² each at (2387.0, 9.97, 13.0) and (2375.6, 10.27, -14.0)) and the bakery's cornice/roof deck
  (10 m² at (2411.6, 10.0, -12.1)) z-fought — roof slab 8 cm lower, cornice 1 cm lower; the platform step, pier planks
  and the footbridge (travel.js) moved off the deck and grass planes.
- Islands (zislands.js, from the original's object lists): duplicated houses inside each other (Mosquibee (2585.8, 5.6,
  1815.3); Celebration three in one at (-8.5, 2.1/4.1/6.4) local) merged or cut; doors 0.4–2.1 m under the ground (Otringal
  house (-42.2, -0.4) local: 2.13 m) or 0.7–1.7 m over it with no steps; plinths floating up to 8 m over the cliff edge;
  windows at the ground. Each Esmer building now gets a door on a free face (not toward the sea or another building), a
  plinth buried from the lowest ground round it, blind walls where it is set into a rise (13 such walls), a gatehouse
  parapet and fort walls off the shared planes; the Mosquibee terraces' 473 z-fights (stacked decks, piers and crates at
  one height) now sit 0–21 mm apart in 3 mm steps (by body and position). Citadel's cliff blocks no longer share flat tops (each tilts into the hill).
- Listed, under 0.15 m² (not fixed): e.g. the pipeline 0.12 m² (-32.97, 17.3, -49.89), harbour and glider benches about
  0.1 m² (-112.11, 3.56, 39.63) and (-103.08, 15.73, -60.59), Zeelich's paired brass members 0.11 m² (2338.4, 7, 1.7 and
  8.4), spaceport trims 0.05 m². Large colliders not yet registered (castle, lighthouse, the desert and Hamalayi
  buildings, the Lift Dock blocks) are listed by the test, not checked.
- Vegetation layout: levelling the ground round the houses and moving the stone house change the terrain the scatter
  samples, so trees, rocks and tufts in Citadel lie differently from before (same density and rules). The re-roll put
  a bush and a rock across the way out of Twinsen's door ((-37.6, 76.2), (-35.8, 76.4)): camsteady's "out of the house
  door" bot walked 34 m round them and the view rose to 48° for 6.4 s (3 budget failures). Now no tree, bush or rock
  stands in a 4 m lane straight out of any house door for 11 m (filtered after the scatter, no random draw moved): the
  route is back to the baseline's (14.3 m, 26.4°, 0 s steep).

R6, outdoor readability (BUILD109_REVIEW §6): grass texture without the white/yellow/pink speckle and with softer strokes;
tufts nearer the ground tone (root #527d31, tip #98b65a) with a narrower brightness spread; no tufts within 2.2 m or wild
flowers within 3 m of a path line (by a street 0.9 and 1.7 m; filtered after the scatter so no random draw moves); path pebbles
less bright; foliage deeper and cooler (leaf #3f8c3c, dark #2f6e3c, needle #2a6038). No fog, blur or bloom change. Low
and High at the same five positions: reviews/WORLD-FIX/r6-low-*.jpg, r6-high-*.jpg (each before | after).

DINOFLY-POS: the user's LBA2 files (read only, numbers only): SCENE.HQR scenes 49 (the game's start after the storm) and
195 put actor File3D 109 / body 167 (the hurt Dino-Fly) at section (8, 10), (18.03, 79.27) in the layout's reference
frame, y 3.34, beta 1200/4096 → our (-57.97, 95.27), 1.84 rad: south-west of Twinsen's house, one terrace up. Moved
from (-50.5, 68.5). Other placements of File3D 109 (scenes 44, 46, 48: our (-132, 15.6), (-102.9, 101.5), (-33.1, -1.2))
are later chapters' flights, not his nap. Evidence dino-old-spot.jpg, dino-new-spot.jpg.

STATUE: CITADEL.OBL body 24 (312 points, 483 polygons, the island's most detailed object: a young man and a woman with
her hair up on a plinth, 1.6 × 2.4 × 3.7 m) stands in the middle of the town square, our (-41.6, -4.4), y 1.05 — where
our well stands. Ours (src/game/statue.js) stands 5 m north at (-43.2, -10.4), facing the well: the game's own Twinsen
and Zoé (createCharacter, 1.12 ×) posed (his arm raised with the ball, hers out), baked to one static bronze mesh with
verdigris in the creases, on a stepped stone plinth with moss and a plaque TWINSEN & ZOE / WHO SAVED TWINSUN streaked
green (twelve years on). One collider (2.9 × 2.3 m, camera skips it) and two camera occluder boxes. Evidence
statue-from-well.jpg, statue-side.jpg.

Performance (tests/perfbudget.mjs, 1366×768, SwiftShader on this container, same warm-up and routes; baseline = origin
48992d3 served from a copy, candidate = this branch; counts are exact, "submit" is the CPU submission proxy, not GPU time):
| Route (median frame) | Low calls / tris | Medium calls / GPU draws / tris | High calls / tris | Medium submit ms |
|---|---|---|---|---|
| street | 186 → 191 / 586k → 588k | 246 → 250 / 351 → 338 / 1030k → 1036k | 277 → 282 / 1165k → 1167k | 11.9 → 10.3 |
| interior | 95 → 95 / 206k → 206k | 97 → 97 / 97 → 97 / 423k → 423k | 110 → 110 / 423k → 423k | 5.5 → 4.7 |
| combat | 121 → 121 / 126k → 126k | 191 → 191 / 191 → 191 / 234k → 234k | 195 → 195 / 233k → 233k | 5.9 → 5.5 |
| transition (Twinsen's door) | 114 → 119 / 497k → 542k | 157 → 164 / 301 → 329 / 860k → 927k | 179 → 187 / 901k → 970k | 6.3 → 6.3 |
(Counts: the final merged tree. Submit: the baseline and the candidate run back to back on a quiet container, before the
door lane; later runs shared the machine with other agents' browsers, so their times are not comparable.)
Where the extra draws come from (per-source count on the same frames, scratch probe): the street, the statue (4 draws in view:
the two figures as one mesh, the plaque, the plinth's stone and moss as one 48 m cell batch each; it was 6 before the
figures were merged and the plinth given one stone material) and one more vegetation draw; the
transition, an original-layout tulip row of 171 tulips at (-36.7, 69.7) that the furniture fitter (island.js
buildOriginalProps) now accepts on the levelled ground by Twinsen's house (2 instanced draws, ~29k triangles) and the
Dino-Fly now in that view. Draw budgets pass (street Medium 250 ≤ 300, High 282 ≤ 450, Low 191 ≤ 260; interiors
≤ 150); the 48 m cell draw batches work (frame pacing check passes, no rebuilds). The check "no shader compiles on the
routes" fails on both builds alike (27/35 programs on the first street route of Low/Medium when all three presets run in
one browser; baseline the same), not caused here. GPU time on the laptop: not measured (no GPU here).

| Check (merged with origin e87209b incl. ANIM-COMBAT; own server :8179, one test at a time) | Result |
|---|---|
| worldfit (new) | ALL PASSED: 0 fit findings, 0 z-fights ≥ 0.15 m² (180 smaller listed); baseline: 412 fit findings, 528 z-fights |
| camsteady (after the door lane) | ALL PASSED (before the door lane: 3 failures on the door routes, see the vegetation note) |
| occluders, camclear, townlife, stability, opening, anim-combat, arsenal (the Dino-Fly), travel | ALL PASSED |
| prologue, chapter1 (logic, end to end) | through to the chapter's end, no errors |
| perfbudget | draw-call budgets PASS (street Low 191 ≤ 260, Medium 250 ≤ 300, High 282 ≤ 450; interiors ≤ 150), frame pacing PASS; "no shader compiles on the routes" FAILS on the baseline alike (above) |
| zislands | ALL PASSED |
| doorcull | ALL PASSED (16 doors, 192 checks) |
| After merging origin 3dca29c (R5-OPENING: opening, cinematic, voice, hud) | opening, stability, worldfit ALL PASSED; prologue and chapter1 to the end, no errors |

Not verified: the look on a real GPU and display (SwiftShader captures), the GPU frame time (perfbudget's times are
CPU/software proxies on a loaded shared machine), an independent visual review; the islands' long views beyond the
scan's spots; the unregistered buildings (castle, lighthouse, desert, Hamalayi, Lift Dock) are listed, not checked.

### CONTAINERS + R10: bonuses from bins, barrels, crates and suitcases (evidence docs/lba3-production/reviews/CONTAINERS/)
What LBA2 does (the user's files, numbers only, and the GPL engine source, behaviour only): a zone giver (SCENE.HQR zone
type 4) gives one bonus per Normal-mode action (any behaviour with the W key), the kind WhichBonus finds most needed;
it pops toward Twinsen, cannot be taken in flight, and every bonus but a key times out after 20 s (blinking the last
3). A heart is taken only while life < max, a flask only with magic < level × 20: otherwise it is left and hops off
(EXTRA.CPP). The giver's flag resets whenever its scene loads (it gives again on a later visit). Outdoor givers:
Citadel 9 (by its baskets), Desert ~60, Otringal 20, Knartas 12, the Platform 4, the CX islet 2.

Ours (the user's rules): a container gives once ever; its bonus lands and stays until taken (no timeout), kept in the
save as `loot` (absent in older saves = none; no format bump), shown only in its own area; a heart/flask at a full bar
stays (it hops aside when walked into); coins, keys and clovers always taken; the ball doesn't fetch what he can't take.
Enemy bonuses keep LBA2's 20 s. The interact key searches a container in any behaviour (LBA2's W); a "Search" verb
prompt in reach of an unsearched one; a small glint every few seconds on the nearest unsearched ones (none once
searched). Outdoor containers (src/game/containers.js): Citadel 9 — at the original's 8 outdoor giver spots (the
ninth is Twinsen's house, which has its barrels): two where the harbour path leaves the lane, three along the harbour
path, two west of the square, one on the lighthouse headland — plus a luggage trolley (suitcases) on the quay; built
with props.js's bin/barrel/crate/trolley before the dressing, so citydress keeps clear and the draw/shadow batches take
them; fitted off paths, door lanes (WORLD-FIX's 4 m lanes), signs, NPC spots and brinks (≤ 1.5 m from the original's
spot, the headland crate moved inland off the cliff). Zeelich 3 (the pier's crates — a new barrel beside them —, the
drill yard's barrels). Zeelich's islands 9 at the original's spots: on the island's own piece where zislands rebuilt
one there (jars), else a new Esmer barrel/crate; not by the shuttle board/pad (the key would answer the board).

| Test | Result |
|---|---|
| containers (new, 29 checks; log reviews/CONTAINERS/containers-test.log) | ALL PASSED: placements; pop/land outside the container/stay 40 s; walk-over collect (+n kashes); full life heart stays 25 s, hurt takes it; full magic flask stays; coins always; mashing Space/E → 1 bonus 1 record; E in Athletic; save → quit → Continue (page reload) same bonuses same place, saved, no second gift, taken and forgotten by the save; Zeelich and back (hidden away, there on return; Zeelich's not seen on Citadel); a door / a dialogue / a save in mid-flight; death → Retry; quest reward (owed coins) unaffected; glint only on unsearched |

| Found and fixed on the way | a bonus out of a container started inside the container's own collider, so the wall test stopped its drift and it dropped back inside the barrel (seen in the close-up, 04): it now ignores the container it came out of (`from`); a placement on the lighthouse headland's brink (Twinsen slid into the sea standing by it): no drop > 0.7 m within 1.3 m; island containers kept 4.5 m from the shuttle board/pad (the key answers the board there) |
| After merging origin 923ba48 (SETTINGS-UI, VOICE-MIX audio test) | containers, givers, crosssystem, menus, stability ALL PASSED |
| Harness note | the test logs a Space press that searched nothing while a container was in reach and presses again: once per run, on Otringal, with 0.05 s of the previous action still running (a press during an action is ignored, as LBA2's ALL_THEN) |
| Regressions (after the change, before the merge) | givers ALL PASSED (a container's bonus stays; others still go after 20 s), stability ALL PASSED, prologue to its end, chapter1 to Zeelich, townlife ALL PASSED, combat ALL PASSED, zislands ALL PASSED, holomap ALL PASSED, worldfit ALL PASSED, crosssystem ALL PASSED, workshop ALL PASSED, save-migration all cases, no errors |

Not verified: a real GPU (SwiftShader captures), an independent review, the feel of the glint and the hop-aside by
hand; Desert Island has no new containers (its ~60 original spots don't map onto our remapped desert).
### CONTAINERS-2: containers refill on every visit; about twice as many outdoors (evidence docs/lba3-production/reviews/CONTAINERS-2/)
The user (2026-10-25): "We need more containers, and yes, they should refill every time." LBA2 resets a giver's taken
flag whenever its scene loads (QA "CONTAINERS + R10" above), so a bin gives again on each visit.

Ours: a giver (outdoor container or interior giver) gives once per visit. Its key `giver:<area>:<id>` stays in
`searched` while Twinsen is in the area; enterRoom/exitRoom (a door, a region change, a shuttle, a story move) drop
every other area's keys (main.js refillGivers), so on his return it is full again: the glint and the "Search" prompt
come back. Standing by it, waiting or pressing again does nothing within the visit. A save keeps the current area's
keys, so a load continues the visit; an older save's keys for other areas (CONTAINERS' once-ever records) are dropped
when it loads; no format change. A giver that may give a clover or a key (the stump, two LBA1 rooms) still gives once
ever. Bonuses lying on the ground are kept as before; a refilled container's next bonus gets the loot key `…#2`; one
with three of its bonuses still lying stays shut until one is taken (nothing times out here, so full-life hearts would
otherwise pile up visit after visit).

Placements (src/game/containers.js), outdoor containers 21 → 52:
- Citadel 9 → 19: behind the fruit stall on the square, the south lane's bend, by the Bug Street house, the pink house,
  behind the south lane's stone house, behind the museum, suitcases outside the baggage claim, by the harbour wing, the
  quay's end, by the neighbour's house at Twinsen's end of town. Ours: the original has only its 9 outdoor givers here.
  House spots are given in the house's frame; each is moved up to 3 m off paths, door lanes, signs, NPC places,
  townlife places, crystals, dogs' yards and drops (none needed more than 1 m).
- Zeelich 3 → 7: four on the Esmer street by the houses' corners (not the street's middle), off zeelife's places.
- Its islands 9 → 18: more of the original's own spots (SCENE.HQR type-4 zones read from the user's files as numbers,
  island-centred: Otringal 3 → 9, Knartas 3 → 5, the CX islet 1 → 2; the Platform's other two are within 3 m of its
  two); kashes capped at 3.
- Desert Island 0 → 8 (our layout): by Kesh's houses (3), Ilka's tent (a trunk and a crate), the last bend of the track
  to the dig, the dig's rim (2). Kept off the coast, the sand tracks, the yacht's routes and stops, Kesh's poles and
  screens, the research post and its drones' round, the pump, the oasis, the dig's pit and gate, NPC places. Drawn in
  the materials desert.js already uses (kit.js caches them), so they share the island's batches.
- Kinds: bins, barrels, crates, suitcases, a trolley, a trunk; bonuses mostly kashes (1–3), some money/life/magic (the
  most needed), a few life or life/magic; no keys.
- tools: reviews/CONTAINERS-2/clearance.mjs (nearest NPC, patrol, story door, exit, zone for every container: the only
  "tight" ones are three of CONTAINERS' original spots, 2.6–2.7 m from a door beside its lane, unchanged).

Draw calls (reviews/CONTAINERS-2/calls.mjs: Medium, 1366×768, one frame per view, SwiftShader; counts, not timing),
before (6d7bc38) → after: Citadel square 237 → 238, harbour path 237 → 236, quay 258 → 259, south lane 220 → 221,
Zeelich pier 442 → 442 (one of three runs read 449: the view has moving actors), Desert village 163 → 166, camp
36 → 39, dig 57 → 62 (one call per material a cell did not have yet, main and shadow, not per container: Citadel's
containers are one mesh per material for the whole island; the desert's use the island's own materials).
tests/drawcalls.mjs street Medium: 237 → 238 calls (containers' own 3 → 3), shader programs 121 → 121. No GPU time
measured (software renderer); Medium at 60 fps on the user's laptop is not verified here.

| Test (2026-10-25, worktree, GAME_URL :8173, one at a time) | Result |
|---|---|
| containers (41 checks; log reviews/CONTAINERS-2/containers-test.log) | ALL PASSED: the 29 earlier checks (the glint check now searches the bin in the same visit first; the Zeelich heart from the life/magic yard barrels) + placements (Citadel ≥ 18 with all kinds, Zeelich ≥ 6, islands ≥ 16, desert ≥ 8, none skipped), every outdoor container reachable and searched by the action with nothing else answering the key (52), within one visit nothing more (90 s, 10 presses, no prompt, no glint), away the Citadel records are gone, back the glint and "Search" return and one more bonus pops (#2) beside the first, through a door and back full again, the house's givers refill, the stump's record survives, a save mid-visit keeps the visit, an older save's other-area keys dropped (story searches kept), three lying bonuses keep a container shut until one is taken |
| worldfit | ALL PASSED (no finding near a new container; desert z-fight listing unchanged in kind: the post gate, the village houses) |
| drawcalls (street, Medium) | 238 calls, no errors (above) |
| stability | ALL PASSED |
| chapter1 | to Zeelich, every step true, no errors |
| chapter2 (Zeelich) | to chapter 4's start, no errors |
| chapter4 (Desert Island) | ALL PASSED (54) |
| chapter5 (Desert Island) | to the Hamalayi board, every step true, no errors |
| givers, zislands, workshop | ALL PASSED |
| save-migration | all cases, no errors |

Notes: the door round trip in the test walks in through Twinsen's front door; walking out of the house's exit did not
trigger within 9 s there, so the test leaves with exitRoom (the same call the exit makes) and says so in its log.
Not verified: a real GPU or the user's laptop (frame time, the look of the new pieces), an independent review, the
feel of refilling by hand, every chapter's NPC routes (clearance.mjs checks NPC places at the start of a new game,
enemy patrols and story doors of all chapters).

### SETTINGS-UI: a calm settings screen after LBA2's options menu (WORKLIST #28; evidence docs/lba3-production/reviews/SETTINGS-UI/)
The user (2026-10-25): "The settings screen is very busy. I want something faithful to the original (LBA2), but more
2026." Before: 18 rows of segmented buttons on one panel, scrolling at 1366×768 (1013 px of 768) and at 640×360
(1498 px of 360, the title out of view); the arrow keys and a pad reached only Back (the rows were mouse/touch only).

Reference (read-only, the user's files): LBA2's GAMEMENU.CPP / TEXT.HQR. Its options menu is one short column of wide
framed bars (DrawCadre with corner angles, a shaded box behind), centred text, the selected bar burning (DrawFireBar);
volumes are a sub-menu of fire-filled sliders that play a sound while they move; toggles change their label in place;
"Return to previous menu" first, Esc leaves.

After: four pages, a tab bar (Game · Controls · Display · Sound) over one framed column of rows, a label left and the
choices right as equal chips (the chosen one filled: shape and lightness, not colour alone); the selection burns as
in LBA2, with corner marks; sliders are fire-filled bars with the level in numbers; a one-line hint only under
Movement, Camera, Resolution, Edges and Minimap (what the choice does, or what it depends on).

| Page | Shown | Advanced |
|---|---|---|
| Game | Difficulty, Text Speed, Subtitle Size, Camera Shake | — |
| Controls | Movement (Classic first, the default), Camera, Keys → the controls screen | Aim Assist, Focus Button |
| Display | Graphics, Look, HUD | Resolution, Edges, Frame Rate Limit, Minimap |
| Sound | Music, Sound Effects, Voices | — |

- Every stored key and value is as before (data-setting / data-range; applySettings and R1-MIGRATE untouched); the
  language stays hidden; pause → Benchmark untouched. Hints follow the state: Edges on Low says Low always uses Fast;
  Minimap says it shows with HUD Always on; the free camera's hint names the turn keys in use.
- Navigation: ↑/↓ (d-pad, stick) move between the tab bar, the rows, the Advanced fold and Back; ←/→ change the
  selected row (a slider steps 5 % and repeats when held); Enter/E/Space/A on a row picks the next value; on the tab
  bar ←/→ or Enter turn the page, Tab / Shift+Tab and the pad's LB/RB anywhere; the pad's B goes back from Settings
  and Controls. Esc is unchanged (in the pause's settings it resumes play). The mouse selects the row under it (one
  highlight); touch taps chips and tabs and drags sliders. A clicked menu entry becomes the selected one, and Back
  returns the selection to the entry that opened the child (pause → Settings → Back: Settings selected; Settings →
  Keys → Back: Keys selected). Clicked buttons and sliders keep no DOM focus (Enter can't press twice; Esc and the
  arrows reach the game after a slider drag).
- Controls screen: the key buttons are reachable by keys and pad and scroll into view; one rebinding awaited at a
  time (a second click replaces the first; before, both bound to the next key); leaving the screen cancels a
  pending rebinding (it used to bind the next key pressed anywhere); a held Enter doesn't become the new key.
- Inventory: the controls line and the gadget's "use" follow the bindings (CLAR-2's open item): Classic "↑←↓→: select ·
  Shift / Esc: close", Modern "WASD: …", rebound keys by name, the pad "D-pad … Menu".
- Fit (tests/display.mjs, each page with Advanced closed and open): 1920×1080, 1366×768, 1280×720, 1024×768, 800×600
  and 640×360 — everything inside the window with Back, no text cut, no scrolling with Advanced closed; at 640×360 only
  Display's open Advanced list scrolls (77 px, inside the panel; the title is dropped below 440 px of height).
- Reduced motion (the system setting): the fire bars of the menus, the settings and the key buttons hold still.

| Test | Result |
|---|---|
| menus | ALL PASSED (38; new: same keys, ≤ 4 rows per page, keys/arrows/Enter on tabs, rows, the fold and a slider, mouse hover, focus return from Settings and Keys, pad B, Esc unchanged, rebinding wait/cancel, the inventory line in Classic and with a rebound key) |
| display | ALL PASSED (31; settings fit at 6 sizes, Esc from the settings, reduced motion) |
| controls, stability, opening, crosssystem (Graphics clicked on the Display page), holomap (the minimap setting) | ALL PASSED (69, 16, 27, 10, 30) |
| audio | 4/5: "sliders set the buses" fails on the voice bus, 0.44 for the slider's 0.2 — VOICE-MIX's ×2.2 voice boost (fea86ca), which the test predates; the setting itself is 0.2. Not from this change; the test needs VOICE_BOOST in its expectation (audio.mjs is not this task's file) |

Not verified: a real gamepad and a touch screen by hand (simulated pad buttons only), a screen reader (roles and
aria-selected/expanded/pressed are set, not audited), the look on a real display; the controls screen's key table is
still long (left as it was: only its navigation changed).

### R7-VERDICTS: one result policy for every test (BUILD109_REVIEW §7; evidence below)

**Before** (read from the source and the baseline runs of 2026-10-25 on 923ba48): `done(errs)` in tests/lib/boot.mjs
printed captured errors and still said ALL PASSED (only failed checks counted); givers, voices, merge, chapter4 and
anim-combat counted every captured error; audit, combat, house, lba1rooms, transitions and wizards printed ALL PASSED
or N FAILED but always exited 0; the story tests (prologue, chapter1–3, 5–10) printed values with no verdict at all
(chapter10 its own DONE/ASSISTED/NOT DONE with exit 0/2/1), drawcalls and save-migration no verdict; several tests
listened to page errors only (no console errors), none to failed requests.

**Policy** (tests/lib/boot.mjs; how to read it: tests/README.md "Reading a verdict"): a failed check, a page error,
a console error, a crashed page, a failed request for one of the game's own files (any 404) or for an outside URL
not declared optional → FAIL. Declared optional resources → OPTIONAL, listed with their reason (none today: the game
asks for nothing outside its folder since R8). Errors a test provokes on purpose → EXPECTED, listed (save-migration's
corrupt save: `save load failed`). Requests cancelled by a navigation (`net::ERR_ABORTED`, e.g. a test's own reload)
→ NOTE, listed. Summary lines: functional / errors / resources / visual (`checkVisual` measurements and every
screenshot as a capture for review); one VERDICT line; exit code non-zero on any FAIL, also a FAIL captured after
the verdict (`LATE FAIL`) or with no verdict printed. Every test, plus tests/lib/seg.mjs, try.mjs and shots.mjs, now
uses it; the story tests judge each step (chapter reached, flags set, objective shown, save → Continue kept).

**Self-test** `node tests/verdicts.mjs`: ALL PASSED (27): clean → PASS exit 0; injected page error → FAIL exit 1;
console.error → FAIL; Doran's model answered 404 (the game falls back to its sculpt silently) → FAIL (resource);
a missing texture → FAIL (resource); the Google Fonts Rubik stylesheet offline, declared optional → OPTIONAL listed,
PASS exit 0; the same undeclared → FAIL (resource); a failed check → FAIL (functional); a page error after the verdict
→ LATE FAIL, exit 1.

**Every test once under the policy** (one at a time, `GAME_URL=http://localhost:8184/`, SwiftShader, 4 shared cores,
2026-10-25, on 923ba48 + this change; logs in the session scratchpad, not kept in the repo):

| Result | Tests (functional checks passed; visual checks / captures where any) |
|---|---|
| PASS | prologue 20, chapter1 19, chapter2 18, chapter3 25, chapter4 54, chapter5 20, chapter6 17, chapter7 9, chapter8 13, chapter9 16, chapter10 21, save-migration 3 (+1 EXPECTED), audit 7, drawcalls 1, combat 59, anim-combat 35, arsenal 34, audio 5, camclear 14 (+30 visual), camsteady 50, clarity 10, crosssystem 10, deaths 160, desert-life 30, display 31, doorcull (2 visual), dynres 8, givers 15, holomap 30, house 2, jetpack 48, lba1rooms 7, longsession 5, menus 38, merge 3, occluders 1 (+31 visual), opening 27, resume 2, spaceport 7, stability 16, timing 29, townlife 36, transitions 6, travel 17, voices 24, wizards 6, workshop 32, worldfit 1 (+8 visual), zeelich-life 38, zislands 13, zoe-resume 5, controls 69 (second run) |
| FAIL → fixed | shipfiles: `assets/fonts/rubik.css` and `rubik-latin.woff2` are requested but not in tools/game-files.mjs since R8 linked the local font (the published page would 404 its font; the desktop copy adds the fonts itself). One line in tools/game-files.mjs (fonts + OFL.txt); rerun below |
| FAIL (real, open) | perfbudget: "no shader compiles on the routes after loading" — Low street 27, Medium street 35, High street 5 new programs, interiors 0–3, transitions 0–3. Known and logged by FRAME-1/RENDER-INV (their suite logs fail alike); a renderer owner's task, not changed here |
| FAIL once (flaky check) | controls "classic ball: the same landing at 30 fps (±0.3 m)": Normal 7.66 vs 8.01 m (0.35) on the first run; 7.77 vs 8.05 (0.28) on the second, which passed; SETTINGS-UI's run 7.76 vs 8.04. The 30 fps throw lands ~0.3 m further, right at the tolerance; left as is (a frame-rate dependence to look at, not a reason to widen it) |
| FAIL → test fixed | prologue (baseline: crashed, rc 1): the mite fight iterated every chapter's enemies (66) and teleported Twinsen to them, out of the well; now the well's own mites (4/4). chapter10 (first run): my expectation of the mill after its relay was wrong (network.js: it turns again once the relay is set) |

No test captured a page error, a console error or a missing local file under the policy; no OPTIONAL resource was
seen. NOTEs (requests cut by a test's own reload/navigation): audio 15, menus 14, resume 15, chapter2 1, zoe-resume 1.

After merging origin (CONTAINERS, CONTAINERS-2, the splash sting; e4eb048), rerun of what the merge and the fix touch,
one at a time: shipfiles 2 (now PASS), containers 41, givers 16, menus 38, stability 16, prologue 20, chapter1 19,
save-migration 3 (+1 EXPECTED), resume 2, zoe-resume 5, desert-life 30, zislands 13, townlife 36, verdicts 27: all
PASS, no error or missing file. tests/containers.mjs already used launch()/done(): the policy applies to it unchanged
(both of its browsers are watched).

Not run under the policy: the player-input playthrough segments 03–14 (tests/playthrough, through seg.mjs; hours of
software rendering). 01 → 02 through tests/lib/seg.mjs (01 kept its save via Esc → Save & quit, 02 continued from it),
after the merge: both VERDICT PASS (the segment ran every step), 0 deaths, 0 ISO assists, no error or missing file.

### ARTHUR-12: Arthur looks twelve (WORKLIST #30; evidence docs/lba3-production/reviews/ARTHUR-12/)

**Before** (ccr-adf00ea7-37ebl3 at 699cc60, measured in lookdev and in the game): Arthur's eyes at 1.26 m against
Twinsen's 1.88 m (0.67), Zoé's 1.81 m (0.69); the small-child template (legs 0.74, arms 0.78, head 1.3×) scaled by
0.795. **After:** eyes 1.57 m (0.835 of Twinsen, 0.87 of Zoé), top of the hair 1.74 m (0.83 / 0.86), standing in the
house's family room in the game: eyes 1.573 against 1.886 and 1.812. Kneeling at his boat his eyes are at 1.2 m (were
0.85–1.0). Details, counts and the animator handoff: docs/character-review.md §19.

| Check | How | Result |
|---|---|---|
| Height and proportions read as a preteen beside his parents | lookdev line-up front / ¾ / side and the game camera, same light, before over after (01, 03); the house in the play camera (04, 06) | DONE (captures; SwiftShader) |
| Face in front, ¾ and side; hair has no gap to the skull | 02; the hair shell's skin hole above the temple (first build) closed (thicker shell, crown point forward) | DONE |
| The opening's Arthur shots | the same six frames before/after (07–12): his close-ups at 32.3 and 56.5 s had his head cut at the top with the new height → both shots 0.28 m higher, same angle; over his shoulder at 34.2 s 0.15 m higher | FIXED |
| Twinsen and Zoé look at his eyes, not his chest | opening.js `eyesOf` (his head bone + 0.18 m) at 31.6 and 54.8 s | FIXED |
| Kneeling (kneelWork/Show/Look), idle, walk, run, talk | 13 (colour), 14 (grey: walk, the arm raised, knees at 2.3 rad) | DONE: the knee gap of the old and the first new build closed by knee balls; the bare forearm reached the ball hand. Open: the thighs come out under the tunic's front when kneeling (the skirt bones' follow, rig.js) |
| Mast in his hand vs fitted | the prop's size no longer jumps (his root scale is 1) | DONE |
| Other looks unchanged | skeletons.json differs only in his entry; only assets/poly/arthur.json rebuilt | DONE |

**Tests** (one at a time, R7 policy, `GAME_URL=http://localhost:8176/`, SwiftShader on a shared machine, 2026-10-25, on
ab461f3): prologue 20, house 2, zoe-resume 5, chapter1 19, chapter7 9, chapter8 13, chapter10 21, arsenal 34, townlife
36, controls 69, stability 16, audit 7: all VERDICT PASS, no error, no missing file. opening: no verdict, twice: its first 24 checks PASS (the whole scene frame by frame:
the cast is the poly cast, nobody vanishes or jumps, nobody walks through a solid or anybody else, Zoé's hand on the
tap and in the stream, feet, subtitles, voices; played through and skipped at 3/21/50/64/77/85 s to the same end
state with Arthur at his boat; pause/resume/focus; Continue), then part 5, "a second new game from the title, with a
save present", waits for the scene that never starts: since 7fcaade (New Game asks before replacing a save) the
title opens the `confirmnew` dialog and the test does not press Yes (`newyes`). Not ARTHUR-12's; the test needs that
press (owner of tests/opening.mjs).
A first pass of the same list hit `net::ERR_INSUFFICIENT_RESOURCES` on the game's own files (zoe-resume 15, chapter1 30,
chapter7 3, chapter8 1, arsenal 22 resource FAILs, the opening's and arsenal's boot timing out, the opening's first
boot with a three.js page error "reading 'isReady'" after a failed load; all functional checks
that ran passed): the machine's root disk was full (236 MB free) and Chromium could not cache. Rerun with
`TMPDIR=/dev/shm/…` (the browsers' profiles on tmpfs): the results above. The first pass's one prologue check that
failed ("the well's mites beaten with the ball", 3/4) is the known wandering-mite flake (38a92e7); it passed on the
rerun (4/4).
### CAM-FOLLOW: the Follow camera stands at his back (evidence docs/lba3-production/reviews/CAM-FOLLOW/)
The user on build 169: "neither the original nor the new one really follows behind Twinsen — let the new one really
stand at his back". Follow (Settings → Camera, "עוקבת") is now a chase camera (src/engine/camera.js `_chase`); LBA2's
view stays the default and is untouched (camsteady's lba routes: the same numbers, VERDICT PASS).

- Behind his back: 7 m back, 1.4 m over the ground under him at 19° down (a 50° lens), looking 1.2 m ahead of him. The
  heading follows his facing through a critically damped spring (11 1/s): after a 90° turn on the spot it is within 15°
  in 0.03 s (it turns with him, at most 17° behind while he turns) and within 3° in 0.23 s, no overshoot; never more
  than 1.7° a frame at 60 fps for LBA2's 100°/s turn, 5.6° at 30 fps for Athletic's 169°/s. Standing: still. Walking
  backwards (Classic, Down): 0° turned over 4.4 m. Modern controls: Down runs him at the camera with its heading held
  (the view does not spin), Up then brings it round behind him; Up goes where the view looks (0° off) with no feedback
  loop; a held side arrow keeps his way (1.4° drift) while the view comes round behind him (actors.js inputYaw: a held
  direction keeps the heading it was pressed under; a new one, > 20° off, reads the view as it is).
- Walls (a spring arm): the longest arm whose camera keeps 0.4 m from every collider, scenery volume and the terrain and
  sees him; drawn in at up to 25 m/s (eased, 200 m/s²), out only after 0.6 s clear at ≤ 2.5 m/s; checked 0.2 and 0.45
  s ahead down a swing or his walk and at the heading the spring is turning to, so a turn beside a house starts coming
  in before the wall is between them. A tight spot (under eaves, his back near a wall) uses the least margins without
  rising over the roof; his back against a wall under the eaves, it stands 2.4 m up over his shoulder looking down (the
  least of 45..83° that sees him); pressed into a corner, closer along its line (to 0.7 m) rather than lifted. Backing
  up to a house wall by input: the arm 7 → 1.6 m, never inside anything, he is seen every frame; walking away it lets
  out at ≤ 2.5 m/s; a full turn on the spot by the wall: seen every frame, ≤ 1.7° a frame.
- Lock-on: behind his shoulder on the line from the target (12° off the line), the look point part of the way to it:
  Twinsen and a mite both on screen on every one of 132 locked frames while he closes and side-steps; let go, back
  behind his back within 1.5 s.
- Comfort: height through a 0.25 m dead band and its own spring; the camera-shake setting respected (Off: 0 m tremor).
  Indoors the iso rooms are unchanged. Scene changes (every Citadel door) start the shot behind the fade.
- camsteady's budgets for Follow are its own (tests/camsteady.mjs BUDGET, with the reasons): a chase camera turns with
  him by design, so LBA2's "never turns, ≤ 40 m/s²" measures the design, not discomfort. Measured instead: no view
  turn > 10° a frame, no camera step > 1.5 m (its arm cut in past a corner), tilt ≤ 72° and ≤ 2 s over 50°, heading
  reversals ≤ his own facing's, no tilt/height reversal within 0.5 s of the last (3 on the route that hugs a house
  wall), still once he has stood a second (≤ 3° with a lock on a moving mite, ≤ 1 m of the arm letting out). The LBA2
  and free budgets are unchanged. tests/lib/camrec.js gained revHero, jitterPitch/jitterY, idleTurnDeg/idleMove.
- CPU: CameraRig.update under Follow 0.20 ms a frame mean, 2.3 max (LBA2's view 0.27 / 7.7) on a 4-core Xeon 2.1 GHz
  under SwiftShader (JS time only, not a GPU number).
- Results (GAME_URL=http://localhost:8187/, TMPDIR=/dev/shm, one at a time, R7 verdicts, SwiftShader, on this commit):
  camfollow 28, camsteady 100 (lba 23, free 27, follow 50), camclear 14 + 30 visual (LBA2; Follow on two doors),
  camclear CAM=follow 14 + 30 visual (every target event, 522 cliff placements, the plateau walk), controls 79, combat
  61, jumpreach 4, menus 38, stability 16, chapter1 19, zeelich-life 38: all VERDICT PASS, no error, no missing file.
  controls' "camera stairs" first FAILed on 705d354's harness: with LAZY-REGIONS an area not entered is not among
  `Object.keys(game.rooms)` (the regions Proxy has no ownKeys trap), so the test found no isle; it now reads the ids
  from `game.regions.of` (a read builds the area) — a test fix, the camera unchanged.
- Captures: run-strip (a 5 m/s run, 0.6 s apart), turn-strip (a turn on the spot, 0.3 s apart), wall-strip (backing up
  to a house wall, 0.7 s apart), lock-strip (a lock-on, side-stepping round the mite, 0.6 s apart).
- CAM-FOLLOW-2 (on the merged tree with WORLD-80's Bug Street pair): camsteady's two town routes failed for Follow
  only (an arm cut-in of 2.2 m in a frame, a 12.5° view jump, 2.9 s over 50°, tilt/height jitter) where the routes run
  along the pair's eaves. The camera: a camera grazing an eave's rim by inches is not "over the roof" (_overRoof had
  taken every point off a volume's footprint for one over it), a tight arm 1.5 m longer beats the comfortable short
  one, a cut-in of > 0.3 m must hold 0.06 s (one-frame flickers of the search), the in-along-line guard acts only in
  contact (0.05 m; the search keeps 0.15), the view's downward look is capped at 46° (or just enough to keep his chest
  in frame), eased, along its own heading, the overhead tilt engages after 0.3 s (at once if he is out of sight), and
  the ground lift looks ahead 0.5 s, not 2.25 (swinging round him a straight line reads ground it never reaches).
- Camera distance (the user: "works well but feels too close and too low"): Settings → Camera distance, Near / Medium /
  Far, saved like the other settings; EN + HE ("מרחק מצלמה": קרוב / בינוני / רחוק). Near 7 m at 19.5° (as before),
  Medium 8.75 m at 24° (the default), Far 10.75 m at 28.6°; on open ground the camera stands 6.6 / 8.0 / 9.4 m back and
  3.7 / 5.0 / 6.6 m up, looking 21 / 24 / 28° down. The spring arm, the wall pull-in and the lock-on framing are the
  same at every distance (camfollow checks Far at a house wall). camsteady's Follow jitter budget now scales with the
  route (at least 3, one per 30 s): the longer arm passes more eaves on the town routes (3 pairs in 91 s and in 26 s).
- Not verified: the feel by hand (keyboard, pad, touch) — the user's call; any frame rate on a GPU; the playthrough
  segments were not rerun (they run under LBA2's view, which is unchanged).

### CONTROL-FEEL: the jump, the dodge, a Follow camera (WORKLIST #31; evidence docs/lba3-production/reviews/CONTROL-FEEL/)
The user: "the jump is too high", "the dodge takes him very far", "when I turn round he runs toward me" (chose a third
camera, Follow; LBA2's stays the default). Measured in the user's ANIM.HQR (docs/LBA2_MEASUREMENTS.md "Jump and
dodges"): the jump (anim 71) rises 0.577 H and carries 1.55 H (1.0 s off the ground after a 0.52 s crouch); anim 26 is
not a jump (no step up). Dodges: aside 1.17 H (78/79), back 0.98 H (53), ahead 0.70 H (52).

| | Before (699cc60) | After |
|---|---|---|
| Jump apex (60 fps, measured) | 1.69 m (1.77 by the numbers) | 1.14 m (1.19 by the numbers = 0.577 H); 1.08 m at 30 fps |
| Air time | 0.73 s | 0.72 s (its own gravity 18.4 m/s² until back at take-off height; everything else 26) |
| Running jump length (60 fps) | 3.49 m | 3.12 m (3.2 = 1.55 H; take-off trimmed to 4.44 m/s) |
| Highest ledge a jump takes | ~2.0 m | ~1.38 m (60 fps), 1.33 m (30 fps) |
| Dodge | 3.3 m every way | aside 2.44, back / backstep 2.06, ahead 1.47 m (60 and 30 fps alike) |

- Geometry adjusted so every jump place stays crossable (tests/jumpreach.mjs, by input at 30 fps, one attempt each):
  the Whispering Cliffs (the first stone stood 2.0 m over the street side's ground: now 1 m over the lowest ground by
  it; 13 stones of 0.98 m), Zeelich's old mill (7 stair-stones of 1.09 m, was 6 of 1.25; its gallery's planks now
  start just past the last stone, was a 0.6 m gap), the galleries' stepping stones (unchanged; a hop from the brink).
  Still out of reach: the test step's deck (2.35 m), the depot fence (2.4 m). The hop-pack still climbs the mill in 4
  hops (tests/jetpack.mjs). Before the cliffs fix the new jump could not get onto the first stone from the street.
- Follow (src/engine/camera.js `_follow`): swings behind him after 1.2 s one way, ≤ 45°/s; not for standing, turns,
  short corrections, runs under 1.2 s, a lock-on or a fight, indoors; only to headings that need no rise over the
  scenery (so in the town it mostly stays as LBA2's). Modern controls keep the stick's heading during the swing.
- Results (GAME_URL=http://localhost:8175/, one at a time, R7 verdicts, SwiftShader; commits 951c014 → 5d92bd9; logs in
  the session scratchpad): controls 79, combat 61, anim-combat 35, camsteady 80 (lba, free and follow routes), camclear
  14, timing 29, jetpack 48, menus 38, jumpreach 4, camfollow 16, worldfit 1, deaths 160, stability 16, chapter1 19,
  chapter2 18, chapter3 25, chapter4 54, chapter5 20, chapter6 17, chapter7 9, chapter8 13, chapter9 16, chapter10 21:
  all VERDICT PASS. prologue: 2 FAIL and 1 PASS (20/20) on the current build — the well's mites step (1/4, 1/4 kills;
  magic runs out when throws miss a wandering mite); the pre-change build passed it 3 of 3, the bisect pointed at the
  cliffs' stones (world.js), which cannot reach the well room (x 1100); a step-by-step rerun killed 4/4. Recorded as
  the known flaky step (38a92e7), not proven unrelated.
- Captures: jump-apex-before.png / jump-apex-after.png (the town square, the same frame of the jump's top; old build
  served from `git archive 699cc60`), follow-0..3 (a walk across the view, 1.4 s apart: the view comes round behind
  him).
- Not verified: the feel by hand (keyboard, pad, touch), a human crossing the galleries' stones and the mill, any frame
  rate on a GPU. The playthrough segments (tests/playthrough 04, 06, 13, 14 use the jumps) were not rerun.

### PERF-ARRIVAL: no shader compiles in play; Zeelich's cloud puffs in one call; faster build (docs/lba3-performance/PERF_ARRIVAL.md)

SwiftShader counts (`results/perf-arrival.json`, probes in docs/lba3-performance/PERF-ARRIVAL/); base `b9de5a7`.

| Check | How | Result |
|---|---|---|
| No shader program compiles on the routes, any preset | tests/perfbudget.mjs (unchanged) | PASS (was FAIL: Low street 28, Medium street 35, High street 5) |
| The same in real play, benchmark order Medium → Low → Medium → High, 5 routes each, the game's own warm-ups | realplay.mjs | 0 programs on all 15 routes (was 19 on 5 routes: FXAA, 8 bloom, 10 shadow depth) |
| First behaviour menu, bonus, ball, inventory; frames after a preset change | firstopen.mjs | 0 (was 2 for the behaviour menu; 45 / 26 / 5 after a change to High / Low / Medium) |
| High arrival route draw calls p50 / p95 | realplay.mjs | 394 / 501 (was 394 / 652); Zeelich's view 649 → 498 (152 puff sprites → 1 call); Medium p95 539 → 388 |
| Same look | look.mjs + lookdiff.py, 6 views of Zeelich and its islands at High | 0.00–0.11 % of pixels differ by ≤ 1 level; one 15×8 px puff corner behind a see-through fence (0.008 %) |
| Build time | boottime.mjs, interleaved | 31.7–43.9 s → 18.2–20.3 s here (Zeelich 10–14 s → 0.7 s: material cache keys no longer PNG-encode textures) |
| Benchmark report | benchrun.mjs (real time, Medium) | prints per route "shader programs compiled while measured N (in the warm-up M)", the preparation's parts, programs ready at the title, parallel shader compile yes/no |

**Tests** (one at a time, R7 policy, `GAME_URL=http://localhost:8177/`, SwiftShader on a shared machine, load 10–14,
2026-10-26): perfbudget, drawcalls, stability, transitions, doorcull, occluders, dynres, display, timing, menus,
prologue, chapter1, audit, longsession, shipfiles (15 tests): all VERDICT PASS, no error, no missing file. A
30-minute session: NOT TESTED in this block (longsession is the suite's own shorter loop). On the laptop: NOT VERIFIED
(PERF_ARRIVAL.md §6).
### SAVE-SLOTS: save slots like LBA2 (WORKLIST #29; evidence docs/lba3-production/reviews/SAVE-SLOTS/)
The user (Hebrew, paraphrased): "there are no saves, only New Game and Continue". Approved plan: several slots as in
LBA2, Save in the pause menu, Load on the title, the autosave in a slot of its own.

- Storage (localStorage; the desktop app keeps it in the user's app-data folder): the Autosave keeps `lba3_save_v1`
  (an old single save shows as the Autosave and loads through migrateSave as before); manual slots `lba3_slot_1` …
  `lba3_slot_6`. Each is the same snapshot() (format 4, no version bump) plus `at` (ms since 1970), `played` (seconds,
  only for games started with this build; older games show no time) and, in a manual slot, `thumb` (a 160x90 JPEG
  data URL, about 4 KB here, capped at 15 000 characters). Backups follow the key: `<key>_backup_vN`,
  `<key>_unreadable`; New Game still keeps `lba3_save_v1_before_new`.
- Save Game (pause menu, under Resume): the six slots; an empty one saves at once ("Saved in Slot 3."), an occupied one
  asks "Overwrite Slot 3?" with Back selected. Refused with one line in the pause menu during a story scene
  (a cinematic or a scripted scene), a fight (an enemy within 15 m chasing, winding up, striking …, an attack token
  held, the boss bar up) or while he is down. Save & Quit is unchanged (the autosave).
- Load Game (title, under Continue): the Autosave then slots 1–6 in slot order; the newest is marked LATEST and
  selected; empty slots disabled; a Delete beside each saved manual slot, asking "Delete Slot 3?" first. Continue
  loads the newest readable save (the Autosave on a tie). Loading uses startContinue(key): the same migration and
  recovery; an unreadable manual slot is set aside and the Load list says so (nothing else changes).
- Each slot: picture (or its number / A), Slot n or Autosave, "Chapter n · title", then place · play time · date.
- New Game asks only when there is an autosave: "The autosave will be replaced. Your save slots are kept." The slots
  are not touched (checked byte for byte).
- Navigation as the other menus: ↑/↓ (and the d-pad) move, Enter / A press; on the Load list → / ← go between a slot
  and its Delete and ↑/↓ skip the Delete buttons; Esc or a pad's B goes back one screen (the Save list returns to the
  pause menu, not to the game; Esc in Settings still resumes, as before). The mouse selects the row under it (one
  burning bar).
- Full storage: a manual save that doesn't fit is retried without its picture; if it still doesn't fit the slot keeps
  its old save and the list says "Not enough storage space. Save over an old slot, or delete slots from Load Game on
  the title screen." A failing autosave shows one toast per session; Save & Quit with a failing autosave stays in the
  pause menu and says so, a second press quits.
- The picture: taken as the pause menu opens, from the frame just drawn. The main thread only copies the frame
  (createImageBitmap) and hands it to a small worker that reads it back and encodes it; reading it back on the main
  thread (toDataURL, then toBlob) blocked until the GPU had finished the queued frames: 8–10 s under SwiftShader
  (render-queue bound, not a hardware number). Now the main thread's part measured 0.2–8.5 ms here; over 50 ms the
  picture is dropped and pictures stay off for the session. A save made before the picture is ready has none.

Tests (SwiftShader, 960x540, one at a time, R7 verdict policy; served from this worktree on port 8188 because 8178 was
already serving another tree):

| Test | Verdict |
|---|---|
| saveslots (new, 25 checks) | PASS (main-thread picture step 8.5 ms in this run; three earlier runs failed on the picture and on two wrong checks, fixed before this run) |
| save-migration | PASS |
| resume | PASS |
| zoe-resume | FAIL once (Zoé's sneak out of the office ended in a dialogue: caught), PASS on the rerun |
| menus | PASS |
| opening | first run: 27/27 checks passed, 3 resource FAILs because this agent's server stopped at its time limit mid-run; rerun PASS |
| prologue | 3 PASS of 5 runs; the 2 FAILs both at "the well's mites beaten with the ball" (the known flaky step). The base build 503b383 (git archive, served on port 8189) failed the same step in 1 of 2 runs |
| chapter1 | PASS |
| deaths | PASS |
| longsession | PASS |
| stability | PASS |
| controls | PASS |

- Captures: save-screen.png (the Save list after saving slot 3), load-screen.png (the Load list on the title), both
  960x540 from tests/saveslots.mjs; load-screen-640x360.png and load-screen-1366x768.png (saves put in storage: the
  list fits both windows without scrolling; at 640x360 a slot takes two lines). Logs: logs/saveslots.log,
  logs/suite-summary.txt (every run above, and the base build's). display.mjs (not in the list, run because the
  pause menu gained a row): PASS, the pause menu and settings fit at all six sizes.
- Known: on the title at 640x360 the menu (now one row longer) still fits (bottom at 347 of 360) but the disclaimer
  under it now needs a 43 px scroll; 800x600 and up: no scroll.
- Not verified: a real GPU (the picture's cost and look there; the main-thread step is measured here only under
  SwiftShader), the desktop app (the worker is made from a blob: URL; if the app refuses it, slots simply have no
  picture), a pad and touch by hand (the pad's B was simulated), Hebrew layout (the language is fixed to English),
  a real full disk (the quota error was simulated by replacing Storage.setItem), an independent review.

### MUSIC-2: playlists, silences outdoors, three new pieces (WORKLIST #20; docs/MUSIC.md "MUSIC-2")

Measured, not listened to. Evidence: tests/music.mjs, `tools/music/check.py` (MP3-only mode), excerpts in
docs/lba3-production/reviews/MUSIC-2/.

| Check | How | Result |
|---|---|---|
| Where the repetition came from | music.js + manifest before the change | one looping track per place, repeating every 126–133 s outdoors, always from bar 1 of the intro, no silence |
| Loop seams of the shipped MP3s | `check.py` (masters git-ignored: MP3-only seam test) | seam error −26…−50 dB re. signal, click ratio 0.10–0.63 (< 1): no seam fix needed |
| Playlist rotates (town: village → Market Day → village) | music.mjs, real audio clock, silences shortened to 8 s | PASS |
| Outdoors: a silence after a piece, the next piece from its first bar | music.mjs | PASS |
| A fight during a silence brings the combat music; after it the silence goes on | music.mjs (setCombat held at 1, then 0) | PASS |
| Indoors (a Zeelich interior on the playlist): no silence, the next piece follows | music.mjs | PASS |
| Arrival at a phrase start (bar 1 or the first bar of an 8-bar phrase), different between visits | music.mjs (8 draws: ≥ 3 different) | PASS |
| End of a piece scheduled at its own end | music.mjs (endsIn = end − position) | PASS |
| A change of place: equal-power crossfade, started on the old track's bar line (≤ 3.2 s wait) | music.mjs (gains sampled every 100 ms; sum of squares 0.95–1.14; old track 0.001 s from a bar line) | PASS |
| Dialogue ducks the music to 0.5 and back to 1; music bus = slider; voice bus = slider × 2.2 | music.mjs | PASS (was 0.55: `AudioEngine.duck` was defined twice, the later one won) |
| Every manifest track is a shipped file; every playlist piece is in the manifest | music.mjs, shipfiles.mjs | PASS |
| New pieces: loudness / true peak / LRA | check.py | Market Day −17.4 LUFS, −2.6 dBTP, 11.0 LU; Sea Wind −17.9, −5.4, 6.4; Cloud Gardens −17.9, −4.4, 7.3 |
| How it sounds (tunes, balance, the HQ soundfont next to older renders, silence length in play) | — | NOT TESTED (needs ears) |

**Tests** (one at a time, R7 policy, `GAME_URL=http://localhost:8180/`, SwiftShader on a shared machine, load ~15,
2026-10-26, on commit a36fa83): audio, music, voices, menus, opening, stability, shipfiles, longsession — all VERDICT
PASS, no error, no missing file (logs and check.py before/after: docs/lba3-production/reviews/MUSIC-2/logs/).
### VALVE-STUCK: segment 04 stuck outside the depot fence (evidence docs/lba3-production/reviews/VALVE-STUCK/)
- Repro (base 6ad111c, also b9de5a7): chain 01 → 03, then 04. After the orchard valve Twinsen stands at (−71.8, 13.9,
  −56.7), just north of the depot's north chain-link fence (z −62). drone1 and gdog1 chase him from inside and stop
  against the fence at (−73.0, −62.6), 6 m away. Their bolts and lunges never reach him (10/10 HP throughout).
- Cause (the test harness, not the game): the fence collider is `seeThrough`, so the aim's line of sight passes and
  the aim assist picks the dog, but `solidAt` stops the ball, so every throw hits the fence. `P.fight` only counted a
  wasted throw when the game aimed at the enemy the bot was facing. Facing drone1 with the throw aimed at gdog1
  counted nothing, so the fight ran to its 40 s limit eight times and `go` never took a step (probe1.log).
- Player: not stuck. Nothing blocks his movement, and the walk round to the east gate (x −65) plans fine. A player
  stops throwing and walks to the gate.
- Fix (tests/lib/player.js `P.fight`): a throw that hits nothing, neither the faced enemy nor the one the game aimed
  at, counts as a miss for both. After six, both are left for 25 s, as before. The bot now walks to the east gate
  and fights the guard, both drones and the dog inside. It uses the valve with a clover spent (probe2.log, 04.log).
  No check changed.
- Results (one chain from a new game, port 8197): segments 01–06 PASS (06: its declared ISO assist in the Zeelich
  depot fight, as before). combat 61/61, containers 41/41, chapter2 18/18, chapter3 25/25, stability 16/16,
  worldfit 1/1 + 8/8 visual: all VERDICT PASS.
- Seen, not changed: `P.use`'s "step closer" loop treats a story prompt with no position (a valve, a console) as
  the wrong target. It walks into the thing's collider until the stuck-replan gives up, three times: about 85 s
  extra at the depot valve, the Whispering Cliffs valve and the platform shield in 06. Slow, not failing.
- Game note (not a blocker): the aim marker can sit on an enemy behind a chain-link fence that the ball cannot pass.

### LAZY-REGIONS + AUTO-FIT: areas built on first entry; resolution that fits the machine (docs/lba3-performance/LAZY_REGIONS.md)

Base f09ce7e (served from a git archive on port 8185 for A/B); candidate this branch on port 8184; SwiftShader,
quiet machine, tests one at a time. `REGIONS_LOG=1` prints every area built "on access" (read by code, not built by
a planned path) with where it was read; the count per test is in the table.

| Check | How | Result |
|---|---|---|
| Startup, page load → title | boot.mjs, 2 interleaved boots each | 46.5–48.4 s → 24.0–24.7 s; build 10.7–10.9 → 4.0 s (Citadel 3.35 s); shader preparation 34.3–35.8 → 18.6–19.1 s; programs at the title 93 → 74 |
| The bar never still for long | boot.mjs timeline; ×6 CPU throttle | longest build step 2.6 s under throttle (SwiftShader's GPU waits in the preparation run longer here: the bar creeps through them) |
| First entry per area (build ms behind the black / programs compiled) | arrive.mjs, real frame loop, Medium | Zeelich 806 / 9, Desert Island 852 / 3, the Hamalayi 927 / 1, Otringal 873 / 0, workshop 379 / 2, upper Zeelich 663 / 0, underground 588 / 7, office 208 / 0; a second entry 0 / 0 everywhere |
| JS heap after GC | lazyregions.mjs (CDP) | 128 MB → 60 MB at the title; 70 after Zeelich, 98 after 8 areas, 122 with every area built |
| No program compiled while measured | perfbudget.mjs | PASS (0 on every route, every preset) |
| Same look | look.mjs + lookdiff.py, 8 views, Medium | no object, colour or layout change; ≤ 3-level shading noise over 0–8.6 % of pixels (re-baked trees, run variation), strong pixels only in the objective label and one pickup's sparkle |
| Auto-fit caps and suggestion | autofit.mjs (devicePixelRatio 1.475, integrated GPU reported) | PASS: Medium 1.0, High 1.25, Low ≤ 0.85; automatic resolution on by default, an explicit choice kept; one suggestion after sustained slow windows, preset unchanged; the first-start pick (Low) stays applied |

| Test | Verdict | On access |
|---|---|---|
| lazyregions (new) | FAIL once (the card counted by a 50 ms poll missed it; now a MutationObserver), PASS on the rerun | 2 (the test's own instant room changes) |
| autofit (new) | PASS | 0 |
| perfbudget, drawcalls | PASS, PASS | 0, 0 |
| stability, transitions | PASS, PASS | 1, 1 (test teleports) |
| travel, zislands, spaceport, holomap | PASS, PASS, PASS, PASS | 3, 0, 1, 5 (test teleports and the test reading island landings; spaceport's was the dig's per-frame code: fixed, below) |
| desert-life, zeelich-life, townlife, containers | PASS ×4 | 0, 0, 0, 3 (test teleports) |
| saveslots, save-migration, resume, menus | PASS ×4 | 0, 0, 1, 0 |
| opening | PASS | 0 |
| prologue | FAIL once at the well's mites (the known flaky step, see SAVE-SLOTS), PASS on the rerun | 0 |
| chapter1–3, 5–7, 9, 10 | PASS | 0 |
| chapter4 | FAIL in 4 of 5 runs at "a cold disc: a thud, and every open disc grinds shut"; the base failed it in 1 of 4 (a stray cold hit during the warm-disc throw). The check now compares cold hits before and after the throw (the speech the first time, the "Cold disc" toast after); PASS on the rerun | 0 |
| chapter8 | FAIL (Zoé waited for Zeelich: chapter 2's placement read Zeelich before her case) → FIXED, PASS | 0 |
| display, dynres, longsession, shipfiles | PASS ×4 | 0 |
| timing | FAIL (expected per-area load times at startup) → test updated, PASS | 1 |
| playthrough 01–06, one KEEP/LOAD chain from a new game, port 8184 | 01 PASS, 02 PASS, 03 PASS, 04 PASS, 05 PASS, 06 PASS (its declared ISO assist in the Zeelich depot fight, as before; Zeelich built by the planned path) | 0 in every segment |

Found by the on-access log after the full run: chapters 4–7's per-frame code read their area every frame (in play the
chapter's start builds it first; `spaceport` sets the chapter by flags). Now read only once built.
The same for the current chapter's things-to-use list and its action handler (chapter 2, the dig, the steam, the pass).
After both fixes: spaceport PASS with 0 on access (was 1), chapter2, chapter4, chapter5, chapter6 PASS (0 on access);
chapter7 and chapter8 PASS after the first of the two.

### HOUSE-FIX: Twinsen's house furnished the right way round (evidence docs/lba3-production/reviews/HOUSE-FIX/)
The user on build 169 (Hebrew, paraphrased): "In Twinsen's house there are things like a wardrobe blocking a window,
an upside-down bed, etc." Every room of the house and the cellar (the same furniture kit) was audited from the play
camera at ten hero spots, overhead and from wall elevations (tools/shots.mjs), with a collider/navigation audit
(tools/audit.mjs) and walking probes. Findings, all fixed (src/game/interiors.js; src/game/props.js `dresser({ rack: false })`):

| # | Room | Finding | Fix | Sheet |
|---|---|---|---|---|
| 1 | reading room | three tall bookcases in a row across the west window (the "wardrobe blocking a window") | two bookcases flank the window; the bookcase giver moves with the south one | 01 |
| 2 | reading room | the reading chair faced the shelves from a metre away, its back to the room | under the window facing the room, lamp and side table beside it, the rug before it; its giver moves with it | 01 |
| 3 | family room | the bed the wrong way round: footboard against the divider, headboard and pillows out in the room (the "upside-down bed") | turned: headboard to the divider, by the nightstand | 02 |
| 4 | Arthur's room | the same for Arthur's bed | turned | 03 |
| 5 | family room | the sea window's left curtain hung through the dresser's plate rack | windows 0.3 → 0.6 and 2.6 → 2.8 m, dresser 5 cm west | 04 |
| 6 | family room | the Dino-Fly painting behind the stove shelf's jars | over the sink, between the shelf and the dresser | 04 |
| 7 | family room | the island picture half behind a curtain | between the two windows, a little smaller | 04 |
| 8 | family room | the coat stand in front of the family portrait | by the front door in the hall | 06 |
| 9 | hall | a tall dresser backed onto the cut-away east wall (its back to the camera), the portrait hanging in the air behind it | a low sideboard; the family photo stands on it with a candle | 06 |
| 10 | family room | the plush Dino-Fly in the air in front of the toy chest (0.47 m up) | sitting on the floor against the chest | 07 |
| 11 | Arthur's room | his desk half under the window's curtain, the lamp through it | 0.65 m east, clear of the curtain | 05 |
| 12 | reading room / hall | the doorway in the divider (z 9.6) opened onto the stairwell: walked through, Twinsen dropped 0.65 m onto the stairs against the railing | doorway moved to the divider's south end, between the railing and the front wall | 13 |
| 13 | cellar | the radio stood inside the dresser's plate rack, 10 cm above the top | a rack-less sideboard; the radio on its top | 08 |
| 14 | cellar | the Dino-Fly poster in the air over the cut-away east wall | on the west wall over the chair | 08 |

Checked and left as they were: Zoé's corner (desk, chair, board), Arthur's bench and his boat spot, the trunk, the mend
box and the heat meter, the stove with the firewood giver and the cupboard (the wardrobe against the low divider:
the magic ball's search, not in front of a window), the table and its chairs (all facing it), the hall's armchairs,
the rugs (none through furniture), the tap and the sink (sheet 11).

Collision and navigation (tools/audit.mjs, audit-before.log / audit-after.log): every story spot (spawn, the cellar
entry and exit, the front door, Zoé's, Arthur's and Twinsen's spots, the opening's marks and Zoé's walk out, Zoé's desk,
the bench, the trunk, the mend box, the meter, the cupboard) is free and reachable on foot from the spawn, unchanged;
every giver is reached within its radius, as before; reachable floor 188 → 189.5 m². A walk by held keys (tools/
quality.mjs) from the front door through the new doorway, the reading room, Arthur's room, the hall, the family room
and back reaches all 14 waypoints; the house re-entered 3× (same meshes and colliders), quality Low → Medium → High →
Low and a resize to 800×450 with 0 errors (sheet 14).

Draw calls and triangles (tools/counts.mjs, 1280×720, game camera, same spots, counts only): house family 106 → 106
calls, 423k → 399k triangles; reading room 92 → 92, 441k → 410k; door 111 → 112, 443k → 412k; cellar 60 → 57,
103k → 95k; textures 182 / 185 unchanged; house colliders 60 → 59. No frame-time claim: SwiftShader only.

Opening (sheet 12, the ARTHUR-12 capture tool): the six stepped shots frame the same; the background shows the turned
bed, the clear window and the plush on the floor.

| Test (2026-10-26, port 8186, one at a time; final code) | Verdict |
|---|---|
| house, opening, givers, containers, zoe-resume | PASS ×5 |
| prologue | PASS (a first rerun stopped at the title's New Game click after 30 s with the machine at load 7: a boot timeout, no check reached; PASS alone) |
| chapter1, camclear, stability, perfbudget | PASS ×4 |
| worldfit | FAIL "every area has registered buildings" {"citadel":14}: the base (705d354) fails the same; Zeelich isn't built at startup since LAZY-REGIONS. Not this task |
### WORLD-80 step 2: the Citadel batch (evidence docs/lba3-production/reviews/WORLD-80/citadel/)
The plan's first batch (docs/WORLD_SIMILARITY.md): Citadel 77.5 → 84.9 (coast 90.9 =, height 75.2 → 76.6, landmarks
75.7 → 98.9, objects 62.3 → 63.4), same scorer and references, run on the merged tree (after LAZY-REGIONS). What was
built and where: WORLD_SIMILARITY.md "Citadel Island: 77.5 → 84.9".

- Collision and interaction: every new piece has a collider of its gameplay kind (the dome and the tunnel vaults solid
  and camSkip with an occluder volume of their own; the figure solid; the tunnels' landings stood on; the cellar hatch
  flush with the yard, no collider: nothing to trip over in the yard's fights). The four shut doors are reached and
  answer "Locked." from their own level only (W.shutDoors; prologue.js baseInteractables). The Bug Street barrel
  (c-bug-barrel) moved to the pair's north house's north side; every Citadel container still places (containers.mjs).
  The stepping stones' first step is the same metre for metre (jumpreach: 13 stones, rises ≤ 0.98 m); the trap filler's
  count is unchanged (1760).
- Nothing else moved: the collider and tree lists of the scorer's dumps before and after differ only inside the six
  changed places (scratchpad cmp on before.json / after.json: 0 removed, 0 added outside them).
- Performance (SwiftShader counts, not GPU time): street route at Medium 256 → 259 draw calls (p95 268 → 276), High
  289 → 294, Low 195 → 197; triangles +1.2 %; interior, combat and transition routes unchanged; 0 shader programs
  compiled on any route at any preset (the new pieces are plain tm/pm materials of island.js already in the warm-up).
  tests/drawcalls.mjs street/medium 249 → 239 (merged tree; the shadow pass 45 → 38). Not measured: GPU time, the
  user's laptop (its benchmark is the judge).

Tests on the merged tree (SwiftShader, one at a time, TMPDIR=/dev/shm, port 8181, R7 verdict policy; logs under
/dev/shm/w80tests-m2 at the time, not kept):

| Test | Verdict |
|---|---|
| worldfit (now opened with ?allregions, so it scans Zeelich and the islands as before LAZY-REGIONS) | PASS (first run before the fix: the porch `stoneup` floated 0.07 m and its door ran into the eaves; moved 0.25 m west, its floor margin 0.8 m, its walls 2.75 m) |
| occluders (b: now behind seven houses, Bug Street's pair both) | PASS |
| doorcull (now the four shut doors too at 2 and 6 m: 22 doors) | PASS (22 doors, 248 checks, nothing culled) |
| drawcalls | PASS |
| perfbudget | PASS (0 compiles, budgets kept) |
| containers | PASS |
| prologue | PASS |
| chapter1 | PASS |
| stability | PASS |
| camclear | PASS |
| camsteady (its two town routes follow the west street's new line) | PASS before the merge |
| transitions, givers, townlife, chapter2, chapter3, chapter10, opening, jumpreach, jetpack | PASS before the merge |

- Screenshots (1280x720, the play camera and one overview each): before/ and after/ islet-overview, islet-play,
  bug-overview, bug-play, bug-back, door-s2-overview, door-s2-play, door-s51n-overview, door-s51n-play,
  door-s51s-play, door-s17u-overview, door-s17u-play; citadel-overlay-after.png.
- Not verified: a real GPU (frame time, the look of the blue dome and the stone figure on the user's screen), an
  independent visual review, the optional coast pull (#6, +1.6) and the terraces (#7).

### WORLD-80 step 3: the Desert batches (evidence docs/lba3-production/reviews/WORLD-80/desert/)
The plan's Desert batches A (the ground and the beach) and B (the missing buildings and figures), with batch C's
School, body 49, the islet and the gateway (docs/WORLD_SIMILARITY.md): Desert Island 39.4 → 85.0 (coast 90.0 →
97.7, height 0.0 → 78.2, landmarks 15.9 → 88.1, objects 38.0 → 68.3), same scorer and references.
The scorer now boots with `?allregions` (since LAZY-REGIONS it had measured the unbuilt desert as sea: NaN). What was
built and where: WORLD_SIMILARITY.md "Desert Island: 39.4 → 85.0".

- Collision and interaction: every new piece has a collider of its gameplay kind (houses, the hall, the mask and its
  rock wall solid, camSkip on the big ones; the forecourt, the bridge's deck and steps, the plaza stair and the hall's
  threshold stood on; fences, parapets, garden walls, troughs and the signpost noStand + seeThrough; jars and
  crates stop him; sacks and small rocks are stepped over). The nine shut doors (the hall, S40, S28, body 49, the
  compound's three, S113, the islet) answer "Locked." from their own level (R.shutDoors; prologue.js
  baseInteractables, now for an outdoor room too). The School's door spot (WIZ.school.door) stands on the forecourt
  before the mask's chin; `school-out` puts him on the bridge, facing east (tests/wizards.mjs).
- Nothing of the story moved: Kesh's houses, the plaza, the oasis, the pump and its targets, the camp, the post and
  its gate, the dig and its gate, the condenser hall's door, the yacht and its four lines, Hesk's poles and board, the
  ferry and glider stops keep their places; the eight containers place with none skipped (containers.mjs); the new
  track to the School crosses no yacht line and passes the oasis's rim and S40's wall gap. The ground under our
  places is flat at their levels (the smoke numbers: village 5.0, oasis basin 3.54, pump 4.83, camp 3.0, dig bottom
  0.2, post 1.6, glider 1.8, pier end 1.91).
- Performance (SwiftShader counts, not GPU time; 1366×768, Medium, the benchmark's own camera): the arrival
  route's Desert Island frame 284 → 309 draw calls (+8.8 %; main pass 268 → 289, shadow pass 17 → 21), 0 programs compiled after the
  warm-up on every route (perfbudget; the scratch count's 3 programs on the arrival frame are the same 3 before and
  after: the area entered fresh inside that measurement); the dock view 338 → 363, the plaza 92 → 113, the compound 252 → 280;
  triangles at the arrival frame 353k → 449k (+27 %) (the new pieces join the island's one batch per material, which is
  always drawn; the old places' rocks go through the LOD-instanced rock tiles, small parts carry no bevel). Not
  measured: GPU time, the user's laptop (its benchmark is the judge).

Tests (SwiftShader, one at a time, TMPDIR=/dev/shm, port 8188, R7 verdict policy; logs in the session scratchpad,
not kept). Under the user's new rule (26.10: only the tests that touch the change; the full suite runs at night after
several merges) these four ran; desert-life was not needed (no NPC place moved); containers, travel, chapter5,
stability, transitions, holomap, drawcalls and the rest are left to the nightly run:

| Test | Verdict |
|---|---|
| worldfit (?allregions) | PASS (124 s; the desert is listed, not judged: 16 registered buildings, z-fight scan 26 visible candidates; listed gaps under a plinth of 0.15–0.33 m on the post's three cabins and Kesh's south-east house — existing geometry, seen now that they are registered — and at the mask's front edge by the water channel) |
| wizards (the School's door moved: in through the mask's chin, the rector, Ker'aooc, out onto the bridge) | PASS (44 s) |
| chapter4 (the pump, the post's storm, the dig's gate and discs, the temple, Continue) | PASS (575 s, 54 checks) |
| perfbudget (four routes × three presets) | PASS (470 s; new programs 0 on every route at every preset; street Medium 259 calls, as after step 2) |

- Screenshots (1280×720, the play camera and an overhead each): before/ and after/ village-play, village-over,
  school-play, school-play2 (after only: the hall from the rim), school-over, compound-play, compound-over, beach-play,
  beach-over, s40-play, s40-over, s28-play, yard-play (after), yard-over, camp-play, dig-track-play, figures-over,
  islet-over, island-over (after, without fog; the before one is in the fog), sign-close and mask-close (after);
  desert-overlay-before/after.png from the numbers.
- Not verified: a real GPU (frame time, the look on the user's screen: the mask's grey in the shade of its east face,
  the pool's water), an independent visual review; Kesh's village was not moved (said so in WORLD_SIMILARITY.md).

### HEADING-LOAD: the Follow camera's heavy street headings (docs/lba3-performance/STABILIZATION.md "HEADING-LOAD")

Base df26b4d served from a git archive on port 8844; the candidate is this branch on port 8843. SwiftShader, 1366×768,
Auto at Medium, battery profile, Follow camera at Far, the street route. Probes are in
docs/lba3-performance/HEADING-LOAD/probes. They give exact counts and pixels only, never GPU time.

| Check | How | Result |
|---|---|---|
| Per-heading main pass (calls / triangles) | q_hl.js, 8 headings | 225° 213/921k → 189/854k; 180° 192/810k → 166/675k; 270° 162/865k → 156/815k; 135° 117/584k → 103/430k; 0° 136/601k → 132/464k |
| View culls are image-preserving while turning | q_turn.js, 32 frames of a 360° turn; each game frame vs the same frame unculled | 0 px differ in every frame; mean 590.6k → 482.8k triangles, 141.3 → 139.5 calls |
| Build changes (props merged, lift, folds) | q_hl.js, base vs candidate, people and particles left out of both frames | 180° 8 px, 225° 1 px, 270° 58 px (42 over 2 levels); at 45° and 135° the statue and the flower dots, which also differ between two base runs |
| No program compiled in play | perfbudget.mjs | PASS (new programs 0 on every route) |
| Trade-offs, priced and not applied | q_hl.js with benchgpu variants, 135/180/225° | grass and flowers half beyond 28 m: −2/−5/−16k triangles, ≤ 933 px; to 30 m: −1/−6/−31k, ≤ 940 px; trees detailed to 22 m: −8/−11/−11k, ≤ 1953 px |

| Test | Verdict |
|---|---|
| drawcalls, perfbudget, display, chapter1, transitions | PASS ×5 |
| camfollow, worldfit, well-town, solidnpc, opening | PASS ×5 |

Not verified: the laptop's GPU ms for each change. Run `electron-bench.mjs full … battery follow` for the benchgpu
lines and `sweep … battery follow` to compare per heading with 0.43.0. Also not verified: the trade-offs' look on the
user's screen.

### HEADING-LOAD-2: the other outdoor areas (docs/lba3-performance/STABILIZATION.md "HEADING-LOAD-2")

The base is 63b7e84 (0.43.2 plus the GPU groups' names), served from a git archive on port 8932. The candidate is this
branch on port 8931. SwiftShader, 1366×768, Auto held at Medium, battery profile, Follow camera at Far. Each area is
entered at its arrival point and Twinsen is turned to 8 headings. Probes: docs/lba3-performance/HEADING-LOAD-2/probes.
They give exact counts and pixels only, never GPU time.

| Check | How | Result |
|---|---|---|
| Which islands are heaviest | q_rank.js, every Zeelich island, 4 headings | Otringal 1222k, Knartas 471k mean triangles; then the Platform 347k, Mosquibee 236k. After: 495k, 289k, 219k, 189k (results/rank-islands-before-after.txt) |
| Per-heading main pass, mean over 8 headings | q_area.js, base vs candidate | Otringal 1201.5k → 480.1k; Knartas 466.1k → 283.0k; desert 213.6k → 142.6k; Zeelich 310.5k → 247.9k; Hamalayi 234.5k → 200.6k; calls never higher on the mean (results/per-heading-before-after.txt) |
| Batches are image-preserving | q_repr.js: the same frame with the island-wide InstancedMeshes rebuilt in place of the batches | 0 px at every heading: Zeelich, Otringal, Knartas, desert |
| Terrain squares are image-preserving | q_repr.js W_TERRAIN=1: the same frame with the old tiles in place of the squares | 0 px at every heading: desert, Hamalayi, Otringal, Knartas |
| Culls are image-preserving while turning | q_aturn.js, 32 frames of a turn, each vs the same frame unculled | 0 px in every frame, all five areas |
| Build A/B | q_area.js, base (two runs) vs candidate, people and particles left out | desert and Hamalayi 0 px; Zeelich ≤ 250 px and Knartas ≤ 35 px, inside two base runs' own difference (≤ 2122 / ≤ 44 px); Otringal ≤ 27 px at 1 level, the base's shadow-cache state (results/cache-timing-otringal.txt) |
| Trade-offs, priced and not applied | q_area.js with benchgpu variants, 8 headings | islands' trees coarse beyond 34 m: Otringal −59k mean, ≤ 6.7k px (≤ 22k px with coarse shadows); Knartas −19k, ≤ 759 px (≤ 5.7k); Hamalayi pines to 22 m: −30k, ≤ 18k px (results/tradeoffs.txt) |

| Test | Verdict |
|---|---|
| drawcalls, perfbudget, display, chapter1, transitions, camfollow, worldfit | PASS ×7 |
| travel, zislands, desert-life, solidnpc, opening | PASS ×5 |
| zeelich-life | FAIL (2 functional): Pelleck's lines in chapters 4–8 and 9. The base fails the same 2 checks (results/tests-summary.txt), so not this round's |

Not verified: the laptop's GPU ms for any change (run `electron-bench.mjs full … battery follow` for the arrival
route and the hamalayi route against 0.43.2). Also not verified: the trade-offs' look on the user's screen.

### Not tested / blocked
- HOUSE-FIX on a real GPU and by the user's eye: NOT DONE (SwiftShader captures; self-reviewed, no independent review).
- LAZY-REGIONS + AUTO-FIT on the user's two computers (Intel UHD startup, the bar, first entries, Medium/High with the caps, the suggestion; the Vega laptop unchanged): NOT VERIFIED (LAZY_REGIONS.md §8).
- PERF-ARRIVAL on the user's laptop (High arrival and street fps, startup, compiles per route = 0): NOT VERIFIED.
- Arthur at twelve (ARTHUR-12) on a real GPU and by the user's eye: NOT DONE (SwiftShader captures only); no
  independent visual review yet.
- Frame rate on a real GPU (60 FPS gate): BLOCKED — software rendering here; the in-game benchmark on the user's PC.
- Listening (music mix, effects, voices), gamepad and touch feel: BLOCKED — human.
- Fullscreen: NOT TESTED (headless).
- CHAR-OPEN's models on a real GPU and display, and an independent visual review: NOT DONE (SwiftShader captures only).
- Optional content beyond what the main path walks past (all wizard rooms' extras, every giver, crystals beyond those
  picked up on the way, the LBA1 rooms' full routes): covered by their LOGIC tests (wizards, lba1rooms, givers), not by
  an input playthrough.
