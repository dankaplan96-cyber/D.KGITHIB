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
node tests/transitions.mjs      # door walk-through, black hold while shaders compile
node tests/playthrough.mjs      # player-input playthrough (segments; see below)
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

## Feature checklist

(Filled in as the pass proceeds; see the sections below.)
