# BACKLOG (production contract tasks)

Status: TODO · IN_PROGRESS · REVIEW · DONE · BLOCKED. The long-range roadmap stays in ../../TASKS.md; this file
tracks the contract's work units with acceptance criteria and evidence. Only reviewed tasks with satisfied criteria
are DONE.

| ID | Depends | Scope | Player outcome | Acceptance criteria | Status | Changed paths | Evidence |
|---|---|---|---|---|---|---|---|
| ST-1 | — | Stabilization: inventory, every system, defects fixed with regression tests | The current build starts, saves, moves, fights and progresses without blockers | Each defect reproduced, root-caused, fixed and retested; regression tests pass; checklist in QA.md | REVIEW | src/engine/physics.js, src/main.js, src/game/actors.js, src/game/desert.js, src/game/story/{chapter1,chapter3,evacuation,index}.js, src/engine/music.js, css/style.css, tools/game-files.mjs, tests/ | QA.md (D1–D17), tests/stability.mjs, tests/zoe-resume.mjs, tests/menus.mjs, tests/crosssystem.mjs, tests/display.mjs, tests/audio.mjs, tests/longsession.mjs, tests/resume.mjs, tests/shipfiles.mjs |
| ST-2 | ST-1 | Player-input playthrough of the main story, prologue → epilogue → Keep Exploring | The whole main path is reachable with normal inputs | tests/playthrough/01–14 pass in sequence from a new game, each continuing from the previous segment's save (Save & quit → Continue) | REVIEW | tests/lib/player.js, tests/lib/seg.mjs, tests/playthrough/ | QA.md "Story and progression": new game → The End → Keep Exploring by input; logged ISO assists for fights |
| ST-3 | ST-1 | Packaged desktop app runs the current build | The installer build starts and reaches the game | desktop/test-desktop.mjs passes on the Linux build here; Windows/Mac from the CI workflow | REVIEW (Linux PASS; Windows/Mac: CI) | tools/game-files.mjs | QA.md "Packaged app" |
| ST-4 | — | GPU performance at 60 FPS on declared hardware | Smooth play on a supported PC | In-game benchmark (pause → Benchmark) report from real hardware | BLOCKED (no GPU here; needs the user's PC) | — | Software counts only, QA.md "Performance" |
| ST-5 | — | Audio by ear, gamepad and touch feel | Mix, music and controls feel right | Human check | BLOCKED (human) | — | tests/audio.mjs checks state only |
| QS-1 | ST-1, ST-2 | Quality-standard route (contract milestone 2) | One complete route at the target look and feel | Contract milestone 2 criteria with runtime captures | TODO | — | — |
