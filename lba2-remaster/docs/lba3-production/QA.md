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

## Feature checklist (build 0.22.0 + this pass's fixes)

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
| Voices (gibberish babble) timed to text | voices.mjs | PASS |
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

