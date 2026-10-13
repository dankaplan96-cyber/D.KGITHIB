# STATE (production checkpoint)

Update before a handoff or a session limit. Do not mark a task done twice after resuming: check BACKLOG.md first.

## Build
- Game version 0.22.0 (desktop/package.json) + the stabilization pass's fixes on branch `ccr-adf00ea7-37ebl3`
  (D1–D9, see QA.md). No version bump yet: the pass changes no content.
- Milestone (PRODUCTION.md): 1 — Stabilize.

## Completed and tested (this pass)
- D1–D9 fixed with regression tests (QA.md "Defects"): house floor seam (blocker), refused-exit loop, waterline
  slide trap, death timer in game time, Zoé's save resume (blocker), cliff-brink death loop, menus at 640×360,
  unbounded music log, LBA1 room layouts missing from the desktop/published build.
- Automated: tests/menus, stability, zoe-resume, crosssystem, longsession, display, audio, transitions,
  shipfiles; opening; chapter LOGIC tests 2–10 (see QA.md for the last results and dates).
- Packaged app: Linux unpacked build from desktop/ (`node copy-game.mjs && npx electron-builder --linux dir`),
  `xvfb-run -a node desktop/test-desktop.mjs release/linux-unpacked/lba3-the-awakening` ALL PASSED (window,
  app://, bundled font, new game + opening + save, relaunch → Continue, Quit) after D9; no 404s.
- Player-input playthrough (tests/playthrough/, tests/lib/seg.mjs): prologue (01–02), chapter 2 (03–05) and
  chapter 3 (06, to chapter 4) pass by input, each segment continuing from the previous one's real save.
  One exception, logged: the Zeelich depot fight (2 drones, an armour-2 Grobo guard, a dog, entered with 6/10 HP)
  — the bot can't win it; below 3 HP it stops and an ISO assist beats the rest (QA.md).

## Unfinished
- Playthrough chapters 4–12 + epilogue (07–14): running/next (see QA.md "Story and progression").
- Final run of the whole automated suite on the final state; QA.md results table refresh.
- PROGRESS.md / TASKS.md / NEXT_ACTION.md entries for the pass.

## Blockers (need the user or hardware)
- GPU frame rate / 60 FPS gate: no GPU here (software rendering only). Needs the in-game benchmark from the
  user's PC (pause → Benchmark).
- Audio by ear, gamepad and touch feel: human checks.
- Combat balance of the Zeelich depot fight at low HP: a human playtest (the bot's combat is weaker than a
  player's; not changed).
- Windows/Mac installers: built by the GitHub Actions workflow on push; not run here.

## Tools
- `python3 -m http.server 8123` in lba2-remaster (run detached: `setsid nohup ... &`).
- Playwright + SwiftShader from /opt/node-tools; xvfb-run + electron for the desktop test.
- tests/lib/player.js (input harness), tests/lib/seg.mjs (segment runner; LOAD/KEEP/NORETRY/SHOT env),
  tests/lib/try.mjs (scratch page scripts).

## Next exact task
Finish the playthrough chain from the chapter-4 save (07-dig … 14-shell); fix any defect found (reproduce,
root-cause, fix, regression test); then the full suite, docs, commit, report.

## Resume
Saves made through the game's own Save & quit live in the session scratchpad (not in the repo; regenerate by
running the segments in order from a new game: 01 → 14, each with KEEP=<file> and the next with LOAD=<file>).
